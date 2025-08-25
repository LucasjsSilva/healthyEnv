#!/usr/bin/env python3
"""
Script to add advanced code quality metrics to the database
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask
from db import db
from model.metric import MetricModel
from model.metric_category import MetricCategory
from nanoid import generate
from dotenv import load_dotenv

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

def add_metric_categories():
    """Add new metric categories for advanced metrics"""
    categories = [
        {
            'id': 'code_qual',
            'working_group': 'Code Quality',
            'description': 'Metrics related to code quality and maintainability'
        },
        {
            'id': 'test_qual',
            'working_group': 'Testing Quality',
            'description': 'Metrics related to testing coverage and quality'
        },
        {
            'id': 'tech_debt',
            'working_group': 'Technical Debt',
            'description': 'Metrics related to technical debt and code smells'
        }
    ]
    
    for cat_data in categories:
        existing = MetricCategory.query.filter_by(id=cat_data['id']).first()
        if not existing:
            category = MetricCategory(
                id=cat_data['id'],
                working_group=cat_data['working_group'],
                description=cat_data['description']
            )
            db.session.add(category)
            print(f"Added category: {cat_data['working_group']}")
        else:
            print(f"Category already exists: {cat_data['working_group']}")

def add_advanced_metrics():
    """Add advanced code quality metrics"""
    metrics = [
        # Code Quality Metrics
        {
            'id': generate(size=10),
            'name': 'Cyclomatic Complexity',
            'description': 'Measure of code complexity based on control flow paths',
            'is_upper': False,  # Lower is better
            'category_id': 'code_qual'
        },
        {
            'id': generate(size=10),
            'name': 'Code Duplication',
            'description': 'Percentage of duplicated code blocks in the repository',
            'is_upper': False,  # Lower is better
            'category_id': 'code_qual'
        },
        {
            'id': generate(size=10),
            'name': 'Maintainability Index',
            'description': 'Overall maintainability score based on complexity and documentation',
            'is_upper': True,   # Higher is better
            'category_id': 'code_qual'
        },
        {
            'id': generate(size=10),
            'name': 'Comment Ratio',
            'description': 'Percentage of lines that are comments',
            'is_upper': True,   # Higher is better (to a point)
            'category_id': 'code_qual'
        },
        {
            'id': generate(size=10),
            'name': 'Average Function Length',
            'description': 'Average number of lines per function',
            'is_upper': False,  # Lower is better
            'category_id': 'code_qual'
        },
        {
            'id': generate(size=10),
            'name': 'Maximum Function Complexity',
            'description': 'Highest cyclomatic complexity of any single function',
            'is_upper': False,  # Lower is better
            'category_id': 'code_qual'
        },
        
        # Testing Quality Metrics
        {
            'id': generate(size=10),
            'name': 'Test Coverage',
            'description': 'Estimated percentage of code covered by tests',
            'is_upper': True,   # Higher is better
            'category_id': 'test_qual'
        },
        
        # Technical Debt Metrics
        {
            'id': generate(size=10),
            'name': 'Technical Debt',
            'description': 'Number of TODO, FIXME, and similar comments indicating technical debt',
            'is_upper': False,  # Lower is better
            'category_id': 'tech_debt'
        },
        {
            'id': generate(size=10),
            'name': 'Code Smells',
            'description': 'Number of detected code smells and anti-patterns',
            'is_upper': False,  # Lower is better
            'category_id': 'tech_debt'
        }
    ]
    
    for metric_data in metrics:
        existing = MetricModel.query.filter_by(name=metric_data['name']).first()
        if not existing:
            metric = MetricModel(
                id=metric_data['id'],
                name=metric_data['name'],
                description=metric_data['description'],
                is_upper=metric_data['is_upper'],
                category_id=metric_data['category_id']
            )
            db.session.add(metric)
            print(f"Added metric: {metric_data['name']}")
        else:
            print(f"Metric already exists: {metric_data['name']}")

def main():
    """Main function to add all advanced metrics"""
    with app.app_context():
        print("Adding advanced code quality metrics to database...")
        
        # Create tables if they don't exist
        db.create_all()
        
        # Add categories first
        print("\n1. Adding metric categories...")
        add_metric_categories()
        
        # Add metrics
        print("\n2. Adding advanced metrics...")
        add_advanced_metrics()
        
        # Commit changes
        try:
            db.session.commit()
            print("\n✅ Successfully added all advanced metrics!")
            
            # Show summary
            total_metrics = MetricModel.query.count()
            total_categories = MetricCategory.query.count()
            print(f"\nDatabase now contains:")
            print(f"- {total_categories} metric categories")
            print(f"- {total_metrics} metrics")
            
        except Exception as e:
            db.session.rollback()
            print(f"\n❌ Error committing changes: {str(e)}")
            return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
