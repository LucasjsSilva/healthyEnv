import requests
import json
import os
from model.repository import RepositoryModel
from model.metric import MetricModel
from model.metric_repo import MetricRepoModel
from db import db
from nanoid import generate
import logging
from services.code_analysis_service import CodeAnalysisService

class GitHubProcessor:
    def __init__(self):
        self.github_token = os.environ.get('GITHUB_TOKEN', '')
        self.headers = {}
        if self.github_token:
            self.headers['Authorization'] = f'token {self.github_token}'
        self.code_analyzer = CodeAnalysisService()
        
    def extract_repo_info(self, repo_url):
        """Extract owner and repo name from GitHub URL"""
        if 'github.com/' not in repo_url:
            raise ValueError("Invalid GitHub URL")
        
        parts = repo_url.replace('https://github.com/', '').replace('http://github.com/', '').strip('/')
        if '/' not in parts:
            raise ValueError("Invalid GitHub repository format")
        
        owner, repo = parts.split('/', 1)
        # Remove .git suffix if present
        repo = repo.replace('.git', '')
        
        return owner, repo
    
    def get_repo_metrics(self, owner, repo):
        """Fetch repository metrics from GitHub API"""
        try:
            # Get basic repository info
            repo_url = f"https://api.github.com/repos/{owner}/{repo}"
            response = requests.get(repo_url, headers=self.headers)
            
            if response.status_code == 404:
                raise ValueError(f"Repository {owner}/{repo} not found")
            elif response.status_code != 200:
                raise ValueError(f"GitHub API error: {response.status_code}")
            
            repo_data = response.json()
            
            # Get languages data
            languages_url = f"https://api.github.com/repos/{owner}/{repo}/languages"
            languages_response = requests.get(languages_url, headers=self.headers)
            languages_data = languages_response.json() if languages_response.status_code == 200 else {}
            
            # Calculate lines of code (sum of all languages)
            loc = sum(languages_data.values()) if languages_data else 0
            
            # Get primary language
            primary_language = repo_data.get('language', 'Unknown')
            
            # Get contributors count
            contributors_url = f"https://api.github.com/repos/{owner}/{repo}/contributors"
            contributors_response = requests.get(contributors_url, headers=self.headers)
            contributors_count = len(contributors_response.json()) if contributors_response.status_code == 200 else 0
            
            # Get commits count (approximate from default branch)
            commits_url = f"https://api.github.com/repos/{owner}/{repo}/commits"
            commits_response = requests.get(commits_url, headers=self.headers, params={'per_page': 1})
            commits_count = 0
            if commits_response.status_code == 200:
                # Try to get total count from Link header
                link_header = commits_response.headers.get('Link', '')
                if 'last' in link_header:
                    try:
                        last_page = link_header.split('page=')[-1].split('&')[0].split('>')[0]
                        commits_count = int(last_page) * 30  # Approximate
                    except:
                        commits_count = 100  # Default estimate
                else:
                    commits_count = len(commits_response.json()) if commits_response.json() else 0
            
            # Get advanced code quality metrics
            try:
                code_metrics = self.code_analyzer.analyze_repository(owner, repo, self.github_token)
                logging.info(f"Code analysis completed for {owner}/{repo}")
            except Exception as e:
                logging.warning(f"Code analysis failed for {owner}/{repo}: {str(e)}")
                code_metrics = self.code_analyzer._get_default_metrics()
            
            # Combine basic and advanced metrics
            metrics = {
                'name': f"{owner}/{repo}",
                'language': primary_language,
                'loc': loc,
                'stars': repo_data.get('stargazers_count', 0),
                'forks': repo_data.get('forks_count', 0),
                'open_issues': repo_data.get('open_issues_count', 0),
                'contributors': contributors_count,
                'commits': commits_count,
                'description': repo_data.get('description', ''),
                'created_at': repo_data.get('created_at', ''),
                'updated_at': repo_data.get('updated_at', ''),
                # Advanced metrics
                'cyclomatic_complexity': code_metrics.get('cyclomatic_complexity', 0),
                'code_duplication': code_metrics.get('code_duplication', 0),
                'technical_debt': code_metrics.get('technical_debt', 0),
                'test_coverage': code_metrics.get('test_coverage', 0),
                'maintainability_index': code_metrics.get('maintainability_index', 0),
                'code_smells': code_metrics.get('code_smells', 0),
                'comment_ratio': code_metrics.get('comment_ratio', 0),
                'avg_function_length': code_metrics.get('avg_function_length', 0),
                'max_function_complexity': code_metrics.get('max_function_complexity', 0)
            }
            
            return metrics
            
        except Exception as e:
            logging.error(f"Error fetching metrics for {owner}/{repo}: {str(e)}")
            raise
    
    def add_repository_to_dataset(self, dataset_id, repo_url, submitter_name):
        """Process and add repository to dataset"""
        try:
            # Extract repository info
            owner, repo = self.extract_repo_info(repo_url)
            
            # Check if repository already exists
            existing_repo = RepositoryModel.find_repository_by_name(dataset_id, f"{owner}/{repo}")
            if existing_repo:
                logging.info(f"Repository {owner}/{repo} already exists in dataset {dataset_id}")
                return existing_repo
            
            # Get metrics from GitHub
            metrics = self.get_repo_metrics(owner, repo)
            
            # Create repository record
            repo_id = generate(size=10)
            repository = RepositoryModel(
                id=repo_id,
                id_dataset=dataset_id,
                name=metrics['name'],
                language=metrics['language'],
                loc=metrics['loc'],
                stars=metrics['stars'],
                forks=metrics['forks'],
                open_issues=metrics['open_issues'],
                contributors=metrics['contributors'],
                commits=metrics['commits']
            )
            
            # Save repository
            db.session.add(repository)
            db.session.flush()  # Ensure repo is saved before metrics
            
            # Get all available metrics
            available_metrics = MetricModel.get_all_metrics()
            
            # Create metric records for all available metrics
            metric_mapping = {
                'stars': metrics['stars'],
                'forks': metrics['forks'], 
                'open issues': metrics['open_issues'],
                'contributors': metrics['contributors'],
                'commits': metrics['commits'],
                'cyclomatic complexity': metrics['cyclomatic_complexity'],
                'code duplication': metrics['code_duplication'],
                'technical debt': metrics['technical_debt'],
                'test coverage': metrics['test_coverage'],
                'maintainability index': metrics['maintainability_index'],
                'code smells': metrics['code_smells'],
                'comment ratio': metrics['comment_ratio'],
                'average function length': metrics['avg_function_length'],
                'maximum function complexity': metrics['max_function_complexity']
            }
            
            for metric in available_metrics:
                metric_name_lower = metric.name.lower()
                value = 0
                
                # Map the metrics we can extract from GitHub and code analysis
                for key, val in metric_mapping.items():
                    if key in metric_name_lower:
                        value = val
                        break
                
                # Create metric record
                metric_repo = MetricRepoModel(
                    id=generate(size=10),
                    id_metric=metric.id,
                    id_repo=repo_id,
                    value=float(value)
                )
                db.session.add(metric_repo)
            
            # Commit all changes
            db.session.commit()
            
            logging.info(f"Successfully added repository {owner}/{repo} to dataset {dataset_id}")
            return repository
            
        except Exception as e:
            db.session.rollback()
            logging.error(f"Error adding repository to dataset: {str(e)}")
            raise
