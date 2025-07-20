import os
import json
import requests
import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime
from utils.error_responses import ErrorResponses
from model.dataset import DatasetModel
from model.metric import MetricModel
from model.repository import RepositoryModel
from model.analysis_request import AnalysisRequestModel
from model.metric_category import MetricCategory
from clustering.cluster import get_cluster
from middleware.validation import validate_json, validate_email, validate_github_url
from dotenv import load_dotenv
from db import db
from nanoid import generate
from waitress import serve

# Flask settings
from flask import Flask, Response, request, jsonify
from flask_cors import CORS
app = Flask(__name__)
CORS(app)

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
  
  # If everything is OK, it continues the process
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


if __name__ == '__main__':
  app.run(debug=True)
  # serve(app, host='0.0.0.0', port=8000)