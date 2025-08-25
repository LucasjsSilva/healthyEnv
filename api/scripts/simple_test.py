#!/usr/bin/env python3
"""
Simple test script to check database connection and basic functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from flask import Flask
    from db import db
    from model.repository import RepositoryModel
    from model.dataset import DatasetModel
    from dotenv import load_dotenv
    print("✅ All imports successful")
except ImportError as e:
    print(f"❌ Import error: {e}")
    sys.exit(1)

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Database settings
try:
    db_user = os.environ['DB_USER']
    db_password = os.environ['DB_PASSWORD']
    db_host = os.environ['DB_HOST']
    db_name = os.environ['DB_NAME']
    print("✅ Environment variables loaded")
except KeyError as e:
    print(f"❌ Missing environment variable: {e}")
    sys.exit(1)

app.config['SQLALCHEMY_DATABASE_URI'] = f'mysql+pymysql://{db_user}:{db_password}@{db_host}/{db_name}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

def main():
    """Test basic functionality"""
    with app.app_context():
        try:
            # Test database connection
            datasets = DatasetModel.query.all()
            print(f"✅ Database connection successful - found {len(datasets)} datasets")
            
            for dataset in datasets:
                repo_count = RepositoryModel.query.filter_by(dataset_id=dataset.id).count()
                print(f"  - {dataset.id}: {dataset.name} ({repo_count} repos)")
            
            return 0
        except Exception as e:
            print(f"❌ Database error: {e}")
            return 1

if __name__ == "__main__":
    exit(main())
