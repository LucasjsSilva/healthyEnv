#!/usr/bin/env python3
"""
Script to update existing repositories in the database with new advanced metrics
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
from services.code_analysis_service import CodeAnalysisService
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
    """Get list of advanced metrics IDs"""
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
    
    metrics = []
    for name in advanced_metric_names:
        metric = MetricModel.query.filter_by(name=name).first()
        if metric:
            metrics.append(metric)
        else:
            logger.warning(f"Advanced metric '{name}' not found in database")
    
    return metrics

def repo_has_advanced_metrics(repo_id, advanced_metrics):
    """Check if repository already has advanced metrics"""
    metric_ids = [m.id for m in advanced_metrics]
    existing_count = MetricRepoModel.query.filter(
        MetricRepoModel.id_repo == repo_id,
        MetricRepoModel.id_metric.in_(metric_ids)
    ).count()
    
    return existing_count > 0

def update_repository_metrics(repo, github_processor, advanced_metrics, force_update=False):
    """Update a single repository with advanced metrics"""
    try:
        logger.info(f"Processing repository: {repo.name}")
        
        # Check if repo already has advanced metrics
        if not force_update and repo_has_advanced_metrics(repo.id, advanced_metrics):
            logger.info(f"Repository {repo.name} already has advanced metrics, skipping...")
            return True, "Already has metrics"
        
        # Extract owner and repo name from full name (e.g., "owner/repo")
        if '/' in repo.name:
            owner, repo_name = repo.name.split('/', 1)
        else:
            logger.warning(f"Repository name '{repo.name}' doesn't contain owner/repo format")
            return False, "Invalid name format"
        
        # Get advanced metrics using GitHubProcessor
        try:
            metrics_data = github_processor.get_repo_metrics(owner, repo_name)
            logger.info(f"Successfully got metrics for {repo.name}")
        except Exception as e:
            logger.error(f"Failed to get metrics for {repo.name}: {str(e)}")
            return False, f"Failed to get metrics: {str(e)}"
        
        # Map advanced metrics to database
        advanced_metric_mapping = {
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
        
        # Add/update metric values
        added_count = 0
        updated_count = 0
        
        for metric_key, metric_name in advanced_metric_mapping.items():
            if metric_key in metrics_data:
                # Find the metric in database
                metric = next((m for m in advanced_metrics if m.name == metric_name), None)
                if not metric:
                    logger.warning(f"Metric '{metric_name}' not found in advanced metrics list")
                    continue
                
                # Check if metric_repo entry already exists
                existing_entry = MetricRepoModel.query.filter_by(
                    id_metric=metric.id,
                    id_repo=repo.id
                ).first()
                
                if existing_entry:
                    # Update existing entry
                    existing_entry.value = float(metrics_data[metric_key])
                    updated_count += 1
                    logger.debug(f"Updated {metric_name}: {metrics_data[metric_key]}")
                else:
                    # Create new entry
                    metric_repo = MetricRepoModel(
                        id=generate(size=10),
                        id_metric=metric.id,
                        id_repo=repo.id,
                        value=float(metrics_data[metric_key])
                    )
                    db.session.add(metric_repo)
                    added_count += 1
                    logger.debug(f"Added {metric_name}: {metrics_data[metric_key]}")
        
        # Commit changes for this repository
        db.session.commit()
        logger.info(f"Successfully updated {repo.name}: {added_count} added, {updated_count} updated")
        return True, f"{added_count} added, {updated_count} updated"
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating repository {repo.name}: {str(e)}")
        return False, str(e)

def update_dataset_repositories(dataset_id, force_update=False, limit=None):
    """Update all repositories in a dataset with advanced metrics"""
    logger.info(f"Starting update for dataset: {dataset_id}")
    @classmethod
    def get_dataset_repos(cls, dataset_id: str):
        return list(cls.query.filter(cls.dataset_id == dataset_id)).first()
    dataset = DatasetModel.get_dataset_repos(dataset_id)
    if not dataset:
        logger.error(f"Dataset {dataset_id} not found")
        return False
    
    logger.info(f"Found dataset: {dataset.name}")
    
    # Get advanced metrics
    advanced_metrics = get_advanced_metrics()
    if not advanced_metrics:
        logger.error("No advanced metrics found in database. Run add_advanced_metrics.py first.")
        return False
    
    logger.info(f"Found {len(advanced_metrics)} advanced metrics")
    
    # Get all repositories in dataset
    repositories = RepositoryModel.query.filter_by(dataset_id=dataset_id).all()
    if limit:
        repositories = repositories[:limit]
    
    logger.info(f"Found {len(repositories)} repositories to process")
    
    # Initialize GitHub processor
    github_token = os.environ.get('GITHUB_TOKEN')
    if not github_token:
        logger.error("GITHUB_TOKEN environment variable not set")
        return False
    
    github_processor = GitHubProcessor(github_token)
    
    # Process each repository
    success_count = 0
    error_count = 0
    skip_count = 0
    
    for i, repo in enumerate(repositories, 1):
        logger.info(f"Processing {i}/{len(repositories)}: {repo.name}")
        
        success, message = update_repository_metrics(
            repo, github_processor, advanced_metrics, force_update
        )
        
        if success:
            if "Already has metrics" in message:
                skip_count += 1
            else:
                success_count += 1
        else:
            error_count += 1
            logger.error(f"Failed to update {repo.name}: {message}")
        
        # Add small delay to avoid rate limiting
        time.sleep(1)
    
    logger.info(f"""
    Update completed for dataset {dataset_id}:
    - Successfully updated: {success_count}
    - Skipped (already had metrics): {skip_count}  
    - Errors: {error_count}
    - Total processed: {len(repositories)}
    """)
    
    return True

def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Update existing repositories with advanced metrics')
    parser.add_argument('dataset_id', help='Dataset ID to update')
    parser.add_argument('--force', action='store_true', help='Force update even if metrics already exist')
    parser.add_argument('--limit', type=int, help='Limit number of repositories to process (for testing)')
    
    args = parser.parse_args()
    
    with app.app_context():
        logger.info("Starting repository metrics update...")
        
        # Check if advanced metrics exist
        advanced_metrics = get_advanced_metrics()
        if not advanced_metrics:
            logger.error("No advanced metrics found. Please run add_advanced_metrics.py first.")
            return 1
        
        # Update repositories
        success = update_dataset_repositories(
            args.dataset_id, 
            force_update=args.force,
            limit=args.limit
        )
        
        if success:
            logger.info("✅ Repository update completed successfully!")
            return 0
        else:
            logger.error("❌ Repository update failed!")
            return 1

if __name__ == "__main__":
    exit(main())
