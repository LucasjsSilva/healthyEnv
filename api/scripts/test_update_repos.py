#!/usr/bin/env python3
"""
Simple script to test updating a few repositories with advanced metrics
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask
from db import db
from model.repository import RepositoryModel
from model.dataset import DatasetModel
from dotenv import load_dotenv
import logging

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

def list_datasets():
    """List all available datasets"""
    datasets = DatasetModel.query.all()
    print("\n📊 Datasets disponíveis:")
    for dataset in datasets:
        repo_count = RepositoryModel.query.filter_by(dataset_id=dataset.id).count()
        print(f"  - ID: {dataset.id} | Nome: {dataset.name} | Repositórios: {repo_count}")
    return datasets

def list_repositories(dataset_id, limit=10):
    """List repositories in a dataset"""
    repos = RepositoryModel.query.filter_by(dataset_id=dataset_id).limit(limit).all()
    print(f"\n📁 Primeiros {limit} repositórios no dataset {dataset_id}:")
    for i, repo in enumerate(repos, 1):
        print(f"  {i}. {repo.name} ({repo.language}) - {repo.stars} stars")
    return repos

def main():
    """Main function to explore the database"""
    with app.app_context():
        print("🔍 Explorando repositórios existentes no banco de dados...\n")
        
        # List datasets
        datasets = list_datasets()
        
        if not datasets:
            print("❌ Nenhum dataset encontrado no banco de dados.")
            return 1
        
        # Show repositories for each dataset
        for dataset in datasets:
            repos = list_repositories(dataset.id, limit=5)
            
        print(f"\n💡 Para atualizar um dataset com as novas métricas, use:")
        print(f"python update_existing_repos_metrics.py <dataset_id>")
        print(f"\nExemplo:")
        if datasets:
            print(f"python update_existing_repos_metrics.py {datasets[0].id}")
        
        print(f"\n⚠️  Certifique-se de que:")
        print(f"1. As novas métricas foram adicionadas (rode add_advanced_metrics.py)")
        print(f"2. Você tem o GITHUB_TOKEN configurado no .env")
        print(f"3. Teste primeiro com --limit 5 para alguns repositórios")
        
        return 0

if __name__ == "__main__":
    exit(main())
