import os
import json
import requests
import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime, timedelta
from typing import Optional
from utils.error_responses import ErrorResponses
from model.dataset import DatasetModel
from model.metric import MetricModel
from model.repository import RepositoryModel
from model.analysis_request import AnalysisRequestModel
from model.metric_category import MetricCategory
from clustering.cluster import get_cluster
from clustering.advanced_cluster import get_enhanced_cluster
from middleware.validation import validate_json, validate_email, validate_github_url
from services.github_processor import GitHubProcessor
from dotenv import load_dotenv
from db import db
from nanoid import generate
from waitress import serve

# Flask settings
from flask import Flask, Response, request, jsonify, make_response
from flask_cors import CORS
app = Flask(__name__)

# CORS with credentials for session cookies
load_dotenv()
FRONTEND_ORIGIN = os.environ.get('FRONTEND_ORIGIN')
if FRONTEND_ORIGIN:
  CORS(app, supports_credentials=True, origins=[FRONTEND_ORIGIN])
else:
  # fallback: allow all (dev only). Consider setting FRONTEND_ORIGIN in prod
  CORS(app, supports_credentials=True)

# Load environment variables
load_dotenv()

# Configurar logging
if not os.path.exists('logs'):
    os.mkdir('logs')

file_handler = RotatingFileHandler('logs/healthyenv.log', maxBytes=10240, backupCount=10)
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
))
file_handler.setLevel(logging.INFO)

app.logger.addHandler(file_handler)
app.logger.setLevel(logging.INFO)
app.logger.info('HealthyEnv startup')

# Database settings
db_user = os.environ['DB_USER']
db_password = os.environ['DB_PASSWORD']
db_host = os.environ['DB_HOST']
db_name = os.environ['DB_NAME']
app.config['SQLALCHEMY_DATABASE_URI'] = f'mysql+pymysql://{db_user}:{db_password}@{db_host}/{db_name}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

###########################
# Simple in-memory sessions
###########################
SESSION_TTL_SECONDS = int(os.environ.get('SESSION_TTL_SECONDS', '86400'))  # 24h default

# Optional Redis-backed session store for production
try:
  import redis  # type: ignore
except Exception:
  redis = None  # type: ignore

REDIS_URL = os.environ.get('REDIS_URL')
SESSION_BACKEND = 'redis' if (redis and REDIS_URL) else 'memory'

if SESSION_BACKEND == 'redis':
  _redis: Optional["redis.Redis"] = redis.Redis.from_url(REDIS_URL)  # type: ignore
else:
  SESSIONS = {}

def _purge_expired_sessions():
  # Only needed for in-memory store
  if SESSION_BACKEND != 'memory':
    return
  now = datetime.utcnow()
  expired = []
  for sid, data in SESSIONS.items():
    if now - data['created_at'] > timedelta(seconds=SESSION_TTL_SECONDS):
      expired.append(sid)
  for sid in expired:
    SESSIONS.pop(sid, None)

def _create_session(token: str, user: dict) -> str:
  sid = generate(size=21)
  if SESSION_BACKEND == 'redis':
    payload = json.dumps({'token': token, 'user': user}).encode('utf-8')
    _redis.setex(f"he:sess:{sid}", SESSION_TTL_SECONDS, payload)  # type: ignore
  else:
    _purge_expired_sessions()
    SESSIONS[sid] = {
      'token': token,
      'user': user,
      'created_at': datetime.utcnow(),
    }
  return sid

def _get_session_from_request():
  sid = request.cookies.get('he_session')
  if not sid:
    return None
  if SESSION_BACKEND == 'redis':
    raw = _redis.get(f"he:sess:{sid}")  # type: ignore
    if not raw:
      return None
    try:
      data = json.loads(raw.decode('utf-8'))
    except Exception:
      return None
    return {'token': data.get('token'), 'user': data.get('user')}
  else:
    _purge_expired_sessions()
    return SESSIONS.get(sid)

def _delete_session(sid: Optional[str]):
  if not sid:
    return
  if SESSION_BACKEND == 'redis':
    try:
      _redis.delete(f"he:sess:{sid}")  # type: ignore
    except Exception:
      pass
  else:
    SESSIONS.pop(sid, None)


# Creates database tables after first request
@app.before_first_request
def create_db():
  with app.app_context():
    from model.dataset import DatasetModel
    from model.repository import RepositoryModel
    from model.metric import MetricModel
    from model.metric_repo import MetricRepoModel
    from model.analysis_request import AnalysisRequestModel
    from model.metric_category import MetricCategory
    db.create_all()


@app.route('/datasets/<dataset_id>/cluster/<path:repo>')
def cluters(dataset_id, repo):
  # Check if the provided dataset id matches an existent dataset
  if not DatasetModel.find_dataset(dataset_id):
    return ErrorResponses.non_existent_dataset

  # Check if the provided repository name matches an existent repo
  if not RepositoryModel.find_repository(dataset_id, repo):
    return ErrorResponses.repo_not_found

  # Check if a n value was provided
  if not request.args.get('near_n'):
    return ErrorResponses.missing_n

  near_n = request.args['near_n'] # Save n value to a variable
  repos = RepositoryModel.get_dataset_repos(dataset_id)
  repos_count = len(repos)
  
  # Check if the provided n value is valid
  if (int(near_n) > (repos_count -1)) or (int(near_n) <= 0):
    return ErrorResponses.invalid_n(repos_count)
  
  # Get clustering algorithm preference (default to enhanced)
  algorithm = request.args.get('algorithm', 'auto')
  use_enhanced = request.args.get('enhanced', 'true').lower() == 'true'
  
  # Use enhanced clustering by default
  if use_enhanced:
    try:
      results = get_enhanced_cluster(repos, dataset_id, repo, int(near_n), algorithm)
      app.logger.info(f'Enhanced clustering completed for {repo} with algorithm {algorithm}')
    except Exception as e:
      app.logger.warning(f'Enhanced clustering failed, falling back to basic: {str(e)}')
      results = get_cluster(repos, dataset_id, repo, int(near_n))
  else:
    results = get_cluster(repos, dataset_id, repo, int(near_n))

  return Response(results, status=200, mimetype='application/json')


# Route to get all repos of a dataset
@app.route('/datasets/<dataset_id>/repos')
def dataset_repos(dataset_id):
  if DatasetModel.find_dataset(dataset_id):
    return Response(
      json.dumps(RepositoryModel.get_dataset_repos_json(dataset_id), indent=2),
      status=200, mimetype='application/json')
  else:
    return ErrorResponses.non_existent_dataset


# Route to get all available datasets
@app.route('/datasets')
def datasets():
  return Response(
    json.dumps(DatasetModel.get_all_datasets_json(), indent=2),
    status=200, mimetype='application/json')


# Route to get all available metrics
@app.route('/metrics')
def metrics():
  return Response(
    json.dumps(MetricModel.get_all_metrics_json(), indent=2),
    status=200, mimetype='application/json')


# Route to create a new analysis request
@app.route('/datasets/<dataset_id>/request', methods=['POST'])
@validate_json('name', 'email', 'repo_url')
def analysis_request(dataset_id: str):
  if not DatasetModel.find_dataset(dataset_id):
    return ErrorResponses.non_existent_dataset
  
  data = request.get_json()
  
  # Validações específicas
  if not validate_email(data['email']):
    return jsonify({'error': 'Invalid email format'}), 400
  
  if not validate_github_url(data['repo_url']):
    return jsonify({'error': 'Invalid GitHub repository URL'}), 400
  
  try:
    analysis_request = AnalysisRequestModel(
      generate(size=10), 
      dataset_id, 
      data['name'], 
      data['email'], 
      data['repo_url']
    )
    analysis_request.create_request()
    
    return Response(
      json.dumps(analysis_request.json(), indent=2),
      status=200, 
      mimetype='application/json'
    )
  except Exception as e:
    return jsonify({'error': 'Failed to create analysis request'}), 500


# Route to get all requests of an user by email
@app.route('/requests/<email>')
def user_requests(email):
  return Response(
    json.dumps(AnalysisRequestModel.get_requests_by_id_json(email), indent=2),
    status=200, mimetype='application/json')


# Route to get all metric categories
@app.route('/metrics/categories')
def metric_categories():
  return Response(
    json.dumps(MetricCategory.get_all_metrics_categories_json(), indent=2),
    status=200, mimetype='application/json')

# Route to get GitHub auth token
@app.route('/auth/github_token')
def auth_github():
  if not request.args.get('code'):
    return ErrorResponses.missing_n

  code = request.args['code'] # Save the code to a variable

  r = requests.post(url = 'https://github.com/login/oauth/access_token', params = {
    'code': code,
    'client_id': os.environ['GH_CLIENT_ID'],
    'client_secret': os.environ['GH_CLIENT_SECRET']
  }, headers = {
    'Accept': 'application/json'
  })

  return Response(
    r.text,
    status=200, mimetype='application/json')


# Create server session and set HttpOnly cookie
@app.route('/auth/github_session')
def auth_github_session():
  code = request.args.get('code')
  state = request.args.get('state')  # state is validated client-side; optionally validate here if stored
  if not code:
    return jsonify({'error': 'Missing code'}), 400

  # Exchange code for token
  r = requests.post(
    url='https://github.com/login/oauth/access_token',
    params={
      'code': code,
      'client_id': os.environ['GH_CLIENT_ID'],
      'client_secret': os.environ['GH_CLIENT_SECRET']
    },
    headers={'Accept': 'application/json'}
  )
  if r.status_code != 200:
    return jsonify({'error': 'Failed to exchange code'}), 502
  token_payload = r.json()
  access_token = token_payload.get('access_token')
  if not access_token:
    return jsonify({'error': 'No access_token in response'}), 502

  # Fetch user info on the server
  gh_headers = {
    'Authorization': f'Bearer {access_token}',
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  }
  uresp = requests.get('https://api.github.com/user', headers=gh_headers)
  if uresp.status_code != 200:
    return jsonify({'error': 'Failed to fetch GitHub user'}), 502
  user = uresp.json() or {}

  # Try to get a primary email
  email = None
  try:
    eresp = requests.get('https://api.github.com/user/emails', headers=gh_headers)
    if eresp.status_code == 200:
      emails = eresp.json() or []
      primary = next((e for e in emails if e.get('primary')), None)
      email = (primary or (emails[0] if emails else {})).get('email')
  except Exception:
    pass

  public_user = {
    'login': user.get('login'),
    'name': user.get('name') or user.get('login'),
    'email': email,
    'profilePicture': user.get('avatar_url'),
    'timestamp': int(datetime.utcnow().timestamp() * 1000)
  }

  sid = _create_session(access_token, public_user)

  resp = make_response(jsonify(public_user))
  cookie_secure = os.environ.get('COOKIE_SECURE', 'false').lower() == 'true'
  resp.set_cookie(
    'he_session',
    sid,
    max_age=SESSION_TTL_SECONDS,
    httponly=True,
    samesite='Lax',
    secure=cookie_secure,
    path='/'
  )
  return resp


@app.route('/auth/me')
def auth_me():
  sess = _get_session_from_request()
  if not sess:
    return jsonify({'authenticated': False}), 200
  return jsonify({'authenticated': True, 'user': sess['user']}), 200


@app.route('/auth/logout', methods=['POST'])
def auth_logout():
  sid = request.cookies.get('he_session')
  if sid:
    SESSIONS.pop(sid, None)
  resp = make_response(jsonify({'ok': True}))
  cookie_secure = os.environ.get('COOKIE_SECURE', 'false').lower() == 'true'
  resp.set_cookie('he_session', '', expires=0, httponly=True, samesite='Lax', secure=cookie_secure, path='/')
  return resp


############################
# Auth guard and user helpers
############################
def require_auth(fn):
  from functools import wraps
  @wraps(fn)
  def _wrap(*args, **kwargs):
    sess = _get_session_from_request()
    if not sess:
      return jsonify({'error': 'unauthorized'}), 401
    request.he_user = sess['user']  # type: ignore[attr-defined]
    request.he_token = sess['token']  # type: ignore[attr-defined]
    return fn(*args, **kwargs)
  return _wrap


@app.route('/me')
@require_auth
def me():
  return jsonify({'authenticated': True, 'user': request.he_user})


@app.route('/me/repos')
@require_auth
def my_repos():
  try:
    headers = {
      'Authorization': f"Bearer {request.he_token}",
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
    # Up to 100 repos; frontend can handle client-side filtering/pagination for now
    resp = requests.get('https://api.github.com/user/repos?per_page=100&sort=updated', headers=headers)
    return Response(resp.text, status=resp.status_code, mimetype='application/json')
  except Exception as e:
    app.logger.error(f'/me/repos error: {str(e)}')
    return ErrorResponses.internal_server_error()


############################
# Dataset management
############################
@app.route('/datasets', methods=['POST'])
@require_auth
@validate_json('name', 'description')
def create_dataset():
  try:
    payload = request.get_json() or {}
    ds = DatasetModel(
      id=generate(size=10),
      name=payload['name'],
      description=payload['description'],
      repo_count=0,
      author=request.he_user.get('login')
    )
    db.session.add(ds)
    db.session.commit()
    return jsonify({
      'id': ds.id,
      'name': ds.name,
      'description': ds.description,
      'repo_count': ds.repo_count,
      'author': ds.author,
    }), 201
  except Exception as e:
    app.logger.error(f'create_dataset error: {str(e)}')
    db.session.rollback()
    return ErrorResponses.internal_server_error()


############################
# Submit and process repository
############################
@app.route('/datasets/<dataset_id>/request_and_process', methods=['POST'])
@require_auth
@validate_json('repo_url')
def request_and_process(dataset_id: str):
  # Validate dataset
  if not DatasetModel.find_dataset(dataset_id):
    return ErrorResponses.non_existent_dataset

  data = request.get_json() or {}
  repo_url = data['repo_url']

  # Optional extra validations
  if not validate_github_url(repo_url):
    return jsonify({'error': 'Invalid GitHub repository URL'}), 400

  try:
    # 1) Create analysis request as RECEIVED
    analysis_request = AnalysisRequestModel(
      generate(size=10),
      dataset_id,
      request.he_user.get('name') or request.he_user.get('login'),
      request.he_user.get('email') or f"{request.he_user.get('login')}@users.noreply.github.com",
      repo_url
    )
    db.session.add(analysis_request)
    db.session.commit()

    # 2) Mark IN PROGRESS
    from model.analysis_request import AnalysisStatusEnum
    analysis_request.status = AnalysisStatusEnum.IN_PROGRESS
    db.session.commit()

    # 3) Process repository
    processor = GitHubProcessor()
    processor.add_repository_to_dataset(
      dataset_id=dataset_id,
      repo_url=repo_url,
      submitter_name=analysis_request.name
    )

    # 4) Mark DONE
    analysis_request.status = AnalysisStatusEnum.DONE
    db.session.commit()

    return jsonify({'request': analysis_request.to_dict(), 'status': 'DONE'}), 200
  except Exception as e:
    # User asked to proceed without error-state expansion. We'll rollback and return 500.
    app.logger.error(f'request_and_process error: {str(e)}')
    db.session.rollback()
    return ErrorResponses.internal_server_error()


# Stats / CI endpoint
@app.route('/stats/bootstrap_ci', methods=['POST'])
def stats_bootstrap_ci():
  try:
    payload = request.get_json(force=True, silent=False) or {}
    values = payload.get('values') or payload.get('arr') or []
    if not isinstance(values, list) or len(values) == 0:
      return jsonify({ 'error': 'values must be a non-empty array' }), 400

    # Sanitize numeric values
    nums = []
    for v in values:
      try:
        n = float(v)
        nums.append(n)
      except Exception:
        continue
    if len(nums) == 0:
      return jsonify({ 'error': 'no valid numeric values provided' }), 400

    estimator = (payload.get('estimator') or 'median').lower()
    iterations = int(payload.get('iterations') or 1000)
    alpha = float(payload.get('alpha') or 0.05)

    if iterations <= 0:
      iterations = 1000
    if not (0 < alpha < 1):
      alpha = 0.05

    def _median(a):
      s = sorted(a)
      m = len(s) // 2
      if len(s) % 2 == 1:
        return s[m]
      return (s[m-1] + s[m]) / 2.0

    def _mean(a):
      return sum(a) / len(a) if a else float('nan')

    est_fn = _median if estimator == 'median' else _mean

    # Bootstrap
    import random
    n = len(nums)
    stats = []
    for _ in range(iterations):
      sample = [nums[random.randrange(0, n)] for __ in range(n)]
      stats.append(est_fn(sample))
    stats.sort()

    low_idx = int((alpha / 2.0) * iterations)
    high_idx = max(0, min(iterations - 1, int((1 - alpha / 2.0) * iterations) - 1))
    low = float(stats[low_idx])
    high = float(stats[high_idx])

    return jsonify({ 'low': low, 'high': high })
  except Exception as e:
    app.logger.error(f'bootstrap_ci error: {str(e)}')
    return ErrorResponses.internal_server_error()

# Admin endpoints
@app.route('/admin/requests', methods=['GET'])
def get_all_requests():
  """Get all analysis requests for admin panel"""
  try:
    requests = AnalysisRequestModel.get_all_requests()
    return Response(
      json.dumps([req.to_dict() for req in requests]),
      status=200, 
      mimetype='application/json'
    )
  except Exception as e:
    app.logger.error(f'Error getting all requests: {str(e)}')
    return ErrorResponses.internal_server_error()

@app.route('/admin/requests/<request_id>/status', methods=['PUT'])
@validate_json('status')
def update_request_status(request_id):
  """Update the status of an analysis request"""
  try:
    data = request.get_json()
    new_status = data['status']
    
    # Validate status
    valid_statuses = ['RECEIVED', 'IN PROGRESS', 'DONE']
    if new_status not in valid_statuses:
      return ErrorResponses.bad_request('Invalid status. Must be one of: ' + ', '.join(valid_statuses))
    
    # Find and update request
    analysis_request = AnalysisRequestModel.get_by_id(request_id)
    if not analysis_request:
      return ErrorResponses.not_found('Analysis request not found')
    
    analysis_request.status = new_status
    
    # If status is changed to DONE, automatically process the repository
    if new_status == 'DONE':
      try:
        processor = GitHubProcessor()
        processor.add_repository_to_dataset(
          dataset_id=analysis_request.id_target_dataset,
          repo_url=analysis_request.repo_url,
          submitter_name=analysis_request.name
        )
        app.logger.info(f'Repository {analysis_request.repo_url} successfully processed and added to dataset {analysis_request.id_target_dataset}')
      except Exception as processing_error:
        app.logger.error(f'Error processing repository {analysis_request.repo_url}: {str(processing_error)}')
        # Don't fail the status update if processing fails
        # The admin can retry later
    
    db.session.commit()
    
    app.logger.info(f'Request {request_id} status updated to {new_status}')
    return Response(
      json.dumps(analysis_request.to_dict()),
      status=200,
      mimetype='application/json'
    )
    
  except Exception as e:
    app.logger.error(f'Error updating request status: {str(e)}')
    db.session.rollback()
    return ErrorResponses.internal_server_error()

@app.route('/admin/requests/<request_id>', methods=['DELETE'])
def delete_request(request_id):
  """Delete an analysis request"""
  try:
    analysis_request = AnalysisRequestModel.get_by_id(request_id)
    if not analysis_request:
      return ErrorResponses.not_found('Analysis request not found')
    
    db.session.delete(analysis_request)
    db.session.commit()
    
    app.logger.info(f'Request {request_id} deleted')
    return Response(
      json.dumps({'message': 'Request deleted successfully'}),
      status=200,
      mimetype='application/json'
    )
    
  except Exception as e:
    app.logger.error(f'Error deleting request: {str(e)}')
    db.session.rollback()
    return ErrorResponses.internal_server_error()

@app.route('/admin/requests/<request_id>/process', methods=['POST'])
def process_request_manually(request_id):
  """Manually process a repository request"""
  try:
    analysis_request = AnalysisRequestModel.get_by_id(request_id)
    if not analysis_request:
      return ErrorResponses.not_found('Analysis request not found')
    
    processor = GitHubProcessor()
    repository = processor.add_repository_to_dataset(
      dataset_id=analysis_request.id_target_dataset,
      repo_url=analysis_request.repo_url,
      submitter_name=analysis_request.name
    )
    
    # Update status to DONE
    analysis_request.status = 'DONE'
    db.session.commit()
    
    app.logger.info(f'Request {request_id} manually processed successfully')
    return Response(
      json.dumps({
        'message': 'Repository processed and added to dataset successfully',
        'repository_id': repository.id,
        'repository_name': repository.name
      }),
      status=200,
      mimetype='application/json'
    )
    
  except Exception as e:
    app.logger.error(f'Error manually processing request: {str(e)}')
    db.session.rollback()
    return ErrorResponses.internal_server_error()
if __name__ == '__main__':
  app.run(debug=True)
  # serve(app, host='0.0.0.0', port=8000)