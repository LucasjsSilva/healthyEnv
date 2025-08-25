#!/usr/bin/env python3
"""
Fixed script to update existing repositories with advanced metrics
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask
from db import db
from model.repository import RepositoryModel
from model.metric import MetricModel
from model.metric_repo import MetricRepoModel
from model.dataset import DatasetModel
from services.github_processor import GitHubProcessor
from nanoid import generate
from dotenv import load_dotenv
import logging
import time

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Database settings
db_user = os.environ['DB_USER']
db_password = os.environ['DB_PASSWORD']
db_host = os.environ['DB_HOST']
db_name = os.environ['DB_NAME']
app.config['SQLALCHEMY_DATABASE_URI'] = f'mysql+pymysql://{db_user}:{db_password}@{db_host}/{db_name}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_advanced_metrics():
    """Get list of advanced metrics"""
    advanced_metric_names = [
        'Cyclomatic Complexity',
        'Code Duplication', 
        'Maintainability Index',
        'Comment Ratio',
        'Average Function Length',
        'Maximum Function Complexity',
        'Test Coverage',
        'Technical Debt',
        'Code Smells'
    ]
    
    metrics = {}
    for name in advanced_metric_names:
        metric = MetricModel.query.filter_by(name=name).first()
        if metric:
            metrics[name] = metric
        else:
            logger.warning(f"Advanced metric '{name}' not found in database")
    
    return metrics

def repo_has_advanced_metrics(repo_id, advanced_metrics):
    """Check if repository already has advanced metrics"""
    metric_ids = [m.id for m in advanced_metrics.values()]
    existing_count = MetricRepoModel.query.filter(
        MetricRepoModel.id_repo == repo_id,
        MetricRepoModel.id_metric.in_(metric_ids)
    ).count()
    
    return existing_count > 0

def update_single_repo(repo, github_processor, advanced_metrics):
    """Update a single repository with advanced metrics"""
    try:
        logger.info(f"Processing: {repo.name}")
        
        # Check if already has metrics
        if repo_has_advanced_metrics(repo.id, advanced_metrics):
            logger.info(f"Repository {repo.name} already has advanced metrics, skipping...")
            return True, "Already has metrics"
        
        # Extract owner and repo name
        if '/' not in repo.name:
            logger.warning(f"Invalid repo name format: {repo.name}")
            return False, "Invalid name format"
        
        owner, repo_name = repo.name.split('/', 1)
        
        # Get metrics
        try:
            metrics_data = github_processor.get_repo_metrics(owner, repo_name)
        except Exception as e:
            logger.error(f"Failed to get metrics for {repo.name}: {str(e)}")
            return False, f"Metrics error: {str(e)}"
        
        # Map metrics to database
        metric_mapping = {
            'cyclomatic_complexity': 'Cyclomatic Complexity',
            'code_duplication': 'Code Duplication',
            'maintainability_index': 'Maintainability Index', 
            'comment_ratio': 'Comment Ratio',
            'avg_function_length': 'Average Function Length',
            'max_function_complexity': 'Maximum Function Complexity',
            'test_coverage': 'Test Coverage',
            'technical_debt': 'Technical Debt',
            'code_smells': 'Code Smells'
        }
        
        # Add metrics to database
        added_count = 0
        for metric_key, metric_name in metric_mapping.items():
            if metric_key in metrics_data and metric_name in advanced_metrics:
                metric_repo = MetricRepoModel(
                    id=generate(size=10),
                    id_metric=advanced_metrics[metric_name].id,
                    id_repo=repo.id,
                    value=float(metrics_data[metric_key])
                )
                db.session.add(metric_repo)
                added_count += 1
        
        db.session.commit()
        logger.info(f"Successfully added {added_count} metrics to {repo.name}")
        return True, f"Added {added_count} metrics"
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating {repo.name}: {str(e)}")
        return False, str(e)

def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("Usage: python update_repos_fixed.py <dataset_id> [--limit N]")
        return 1
    
    dataset_id = sys.argv[1]
    limit = None
    
    if '--limit' in sys.argv:
        limit_idx = sys.argv.index('--limit')
        if limit_idx + 1 < len(sys.argv):
            limit = int(sys.argv[limit_idx + 1])
    
    with app.app_context():
        logger.info(f"Starting update for dataset: {dataset_id}")
        
        # Check dataset exists
        dataset = DatasetModel.query.filter_by(id=dataset_id).first()
        if not dataset:
            logger.error(f"Dataset {dataset_id} not found")
            return 1
        
        logger.info(f"Found dataset: {dataset.name}")
        
        # Get advanced metrics
        advanced_metrics = get_advanced_metrics()
        if not advanced_metrics:
            logger.error("No advanced metrics found. Run add_advanced_metrics.py first.")
            return 1
        
        logger.info(f"Found {len(advanced_metrics)} advanced metrics")
        
        # Get repositories
        repos = RepositoryModel.query.filter_by(dataset_id=dataset_id).all()
        if limit:
            repos = repos[:limit]
        
        logger.info(f"Processing {len(repos)} repositories")
        
        # Check GitHub token
        github_token = os.environ.get('GITHUB_TOKEN')
        if not github_token:
            logger.error("GITHUB_TOKEN not found in environment")
            return 1
        
        github_processor = GitHubProcessor()
        
        # Process repositories
        success_count = 0
        skip_count = 0
        error_count = 0
        
        for i, repo in enumerate(repos, 1):
            logger.info(f"Processing {i}/{len(repos)}: {repo.name}")
            
            success, message = update_single_repo(repo, github_processor, advanced_metrics)
            
            if success:
                if "Already has metrics" in message:
                    skip_count += 1
                else:
                    success_count += 1
            else:
                error_count += 1
            
            # Rate limiting
            time.sleep(1)
        
        logger.info(f"""
Update completed:
- Successfully updated: {success_count}
- Skipped (already had metrics): {skip_count}
- Errors: {error_count}
- Total processed: {len(repos)}
        """)
        
        return 0

if __name__ == "__main__":
    exit(main())
