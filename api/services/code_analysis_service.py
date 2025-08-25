import ast
import os
import re
import tempfile
import shutil
import requests
import zipfile
from collections import defaultdict, Counter
from typing import Dict, List, Tuple, Optional
import logging

class CodeAnalysisService:
    """Service for analyzing code quality metrics from repository source code"""
    
    def __init__(self):
        self.supported_extensions = {
            '.py': self._analyze_python_file,
            '.js': self._analyze_javascript_file,
            '.ts': self._analyze_typescript_file,
            '.java': self._analyze_java_file,
            '.cpp': self._analyze_cpp_file,
            '.c': self._analyze_c_file,
            '.cs': self._analyze_csharp_file,
            '.go': self._analyze_go_file
        }
        
    def analyze_repository(self, owner: str, repo: str, github_token: str = None) -> Dict:
        """
        Analyze a GitHub repository for code quality metrics
        
        Args:
            owner: Repository owner
            repo: Repository name
            github_token: GitHub token for API access
            
        Returns:
            Dictionary with code quality metrics
        """
        try:
            # Download repository source code
            temp_dir = self._download_repository(owner, repo, github_token)
            
            # Analyze code metrics
            metrics = self._analyze_codebase(temp_dir)
            
            # Cleanup
            shutil.rmtree(temp_dir, ignore_errors=True)
            
            return metrics
            
        except Exception as e:
            logging.error(f"Error analyzing repository {owner}/{repo}: {str(e)}")
            return self._get_default_metrics()
    
    def _download_repository(self, owner: str, repo: str, github_token: str = None) -> str:
        """Download repository source code to temporary directory"""
        headers = {}
        if github_token:
            headers['Authorization'] = f'token {github_token}'
            
        # Download repository as ZIP
        download_url = f"https://api.github.com/repos/{owner}/{repo}/zipball"
        response = requests.get(download_url, headers=headers, stream=True)
        
        if response.status_code != 200:
            raise ValueError(f"Failed to download repository: {response.status_code}")
        
        # Create temporary directory
        temp_dir = tempfile.mkdtemp()
        zip_path = os.path.join(temp_dir, "repo.zip")
        
        # Save ZIP file
        with open(zip_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        # Extract ZIP
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)
        
        # Remove ZIP file
        os.remove(zip_path)
        
        # Find the extracted directory (GitHub creates a folder with commit hash)
        extracted_dirs = [d for d in os.listdir(temp_dir) if os.path.isdir(os.path.join(temp_dir, d))]
        if not extracted_dirs:
            raise ValueError("No directory found in extracted ZIP")
            
        return os.path.join(temp_dir, extracted_dirs[0])
    
    def _analyze_codebase(self, repo_path: str) -> Dict:
        """Analyze entire codebase for quality metrics"""
        metrics = {
            'cyclomatic_complexity': 0,
            'code_duplication': 0,
            'technical_debt': 0,
            'test_coverage': 0,
            'maintainability_index': 0,
            'code_smells': 0,
            'total_files': 0,
            'total_lines': 0,
            'comment_ratio': 0,
            'function_count': 0,
            'class_count': 0,
            'avg_function_length': 0,
            'max_function_complexity': 0
        }
        
        file_metrics = []
        all_functions = []
        all_code_blocks = []
        
        # Walk through all files
        for root, dirs, files in os.walk(repo_path):
            # Skip common non-source directories
            dirs[:] = [d for d in dirs if not d.startswith('.') and d not in 
                      ['node_modules', '__pycache__', 'venv', 'env', 'build', 'dist', 'target']]
            
            for file in files:
                file_path = os.path.join(root, file)
                file_ext = os.path.splitext(file)[1].lower()
                
                if file_ext in self.supported_extensions:
                    try:
                        file_metric = self.supported_extensions[file_ext](file_path)
                        if file_metric:
                            file_metrics.append(file_metric)
                            all_functions.extend(file_metric.get('functions', []))
                            all_code_blocks.extend(file_metric.get('code_blocks', []))
                            metrics['total_files'] += 1
                            metrics['total_lines'] += file_metric.get('lines', 0)
                            metrics['function_count'] += file_metric.get('function_count', 0)
                            metrics['class_count'] += file_metric.get('class_count', 0)
                    except Exception as e:
                        logging.warning(f"Error analyzing file {file_path}: {str(e)}")
        
        # Calculate aggregate metrics
        if file_metrics:
            metrics['cyclomatic_complexity'] = sum(f.get('complexity', 0) for f in file_metrics)
            metrics['technical_debt'] = sum(f.get('debt_score', 0) for f in file_metrics)
            metrics['code_smells'] = sum(f.get('code_smells', 0) for f in file_metrics)
            
            total_comments = sum(f.get('comment_lines', 0) for f in file_metrics)
            metrics['comment_ratio'] = (total_comments / metrics['total_lines']) * 100 if metrics['total_lines'] > 0 else 0
            
            if all_functions:
                function_lengths = [f.get('length', 0) for f in all_functions]
                function_complexities = [f.get('complexity', 0) for f in all_functions]
                metrics['avg_function_length'] = sum(function_lengths) / len(function_lengths)
                metrics['max_function_complexity'] = max(function_complexities) if function_complexities else 0
            
            # Calculate code duplication
            metrics['code_duplication'] = self._calculate_duplication(all_code_blocks)
            
            # Calculate maintainability index (simplified version)
            metrics['maintainability_index'] = self._calculate_maintainability_index(metrics)
            
            # Estimate test coverage based on test files
            metrics['test_coverage'] = self._estimate_test_coverage(repo_path)
        
        return metrics
    
    def _analyze_python_file(self, file_path: str) -> Optional[Dict]:
        """Analyze Python file for quality metrics"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Parse AST
            tree = ast.parse(content)
            
            metrics = {
                'lines': len(content.splitlines()),
                'complexity': 0,
                'function_count': 0,
                'class_count': 0,
                'comment_lines': 0,
                'debt_score': 0,
                'code_smells': 0,
                'functions': [],
                'code_blocks': []
            }
            
            # Count comments
            metrics['comment_lines'] = len([line for line in content.splitlines() 
                                          if line.strip().startswith('#')])
            
            # Analyze AST nodes
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    func_complexity = self._calculate_function_complexity(node)
                    func_length = node.end_lineno - node.lineno if hasattr(node, 'end_lineno') else 10
                    
                    metrics['functions'].append({
                        'name': node.name,
                        'complexity': func_complexity,
                        'length': func_length
                    })
                    
                    metrics['function_count'] += 1
                    metrics['complexity'] += func_complexity
                    
                elif isinstance(node, ast.ClassDef):
                    metrics['class_count'] += 1
            
            # Detect code smells
            metrics['code_smells'] = self._detect_python_code_smells(content)
            
            # Calculate technical debt
            metrics['debt_score'] = self._calculate_technical_debt(content)
            
            # Extract code blocks for duplication analysis
            metrics['code_blocks'] = self._extract_code_blocks(content)
            
            return metrics
            
        except Exception as e:
            logging.warning(f"Error analyzing Python file {file_path}: {str(e)}")
            return None
    
    def _analyze_javascript_file(self, file_path: str) -> Optional[Dict]:
        """Analyze JavaScript/TypeScript file (simplified analysis)"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            metrics = {
                'lines': len(content.splitlines()),
                'complexity': 0,
                'function_count': 0,
                'class_count': 0,
                'comment_lines': 0,
                'debt_score': 0,
                'code_smells': 0,
                'functions': [],
                'code_blocks': []
            }
            
            # Count comments (single line and multi-line)
            single_comments = len(re.findall(r'//.*', content))
            multi_comments = len(re.findall(r'/\*.*?\*/', content, re.DOTALL))
            metrics['comment_lines'] = single_comments + multi_comments
            
            # Count functions (simplified regex)
            function_patterns = [
                r'function\s+\w+\s*\(',
                r'\w+\s*:\s*function\s*\(',
                r'\w+\s*=>\s*{',
                r'const\s+\w+\s*=\s*\('
            ]
            
            for pattern in function_patterns:
                metrics['function_count'] += len(re.findall(pattern, content))
            
            # Count classes
            metrics['class_count'] = len(re.findall(r'class\s+\w+', content))
            
            # Estimate complexity based on control structures
            complexity_patterns = [
                r'\bif\b', r'\belse\b', r'\bfor\b', r'\bwhile\b',
                r'\bswitch\b', r'\bcatch\b', r'\btry\b'
            ]
            
            for pattern in complexity_patterns:
                metrics['complexity'] += len(re.findall(pattern, content))
            
            # Detect code smells
            metrics['code_smells'] = self._detect_js_code_smells(content)
            
            # Calculate technical debt
            metrics['debt_score'] = self._calculate_technical_debt(content)
            
            # Extract code blocks
            metrics['code_blocks'] = self._extract_code_blocks(content)
            
            return metrics
            
        except Exception as e:
            logging.warning(f"Error analyzing JavaScript file {file_path}: {str(e)}")
            return None
    
    def _analyze_typescript_file(self, file_path: str) -> Optional[Dict]:
        """Analyze TypeScript file (uses JavaScript analysis)"""
        return self._analyze_javascript_file(file_path)
    
    def _analyze_java_file(self, file_path: str) -> Optional[Dict]:
        """Analyze Java file (simplified analysis)"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            metrics = {
                'lines': len(content.splitlines()),
                'complexity': 0,
                'function_count': 0,
                'class_count': 0,
                'comment_lines': 0,
                'debt_score': 0,
                'code_smells': 0,
                'functions': [],
                'code_blocks': []
            }
            
            # Count comments
            single_comments = len(re.findall(r'//.*', content))
            multi_comments = len(re.findall(r'/\*.*?\*/', content, re.DOTALL))
            metrics['comment_lines'] = single_comments + multi_comments
            
            # Count methods and classes
            metrics['function_count'] = len(re.findall(r'(public|private|protected)?\s*(static)?\s*\w+\s+\w+\s*\(', content))
            metrics['class_count'] = len(re.findall(r'class\s+\w+', content))
            
            # Estimate complexity
            complexity_patterns = [
                r'\bif\b', r'\belse\b', r'\bfor\b', r'\bwhile\b',
                r'\bswitch\b', r'\bcatch\b', r'\btry\b'
            ]
            
            for pattern in complexity_patterns:
                metrics['complexity'] += len(re.findall(pattern, content))
            
            metrics['code_smells'] = self._detect_java_code_smells(content)
            metrics['debt_score'] = self._calculate_technical_debt(content)
            metrics['code_blocks'] = self._extract_code_blocks(content)
            
            return metrics
            
        except Exception as e:
            logging.warning(f"Error analyzing Java file {file_path}: {str(e)}")
            return None
    
    def _analyze_cpp_file(self, file_path: str) -> Optional[Dict]:
        """Analyze C++ file (simplified analysis)"""
        return self._analyze_c_file(file_path)
    
    def _analyze_c_file(self, file_path: str) -> Optional[Dict]:
        """Analyze C file (simplified analysis)"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            metrics = {
                'lines': len(content.splitlines()),
                'complexity': 0,
                'function_count': 0,
                'class_count': 0,
                'comment_lines': 0,
                'debt_score': 0,
                'code_smells': 0,
                'functions': [],
                'code_blocks': []
            }
            
            # Count comments
            single_comments = len(re.findall(r'//.*', content))
            multi_comments = len(re.findall(r'/\*.*?\*/', content, re.DOTALL))
            metrics['comment_lines'] = single_comments + multi_comments
            
            # Count functions
            metrics['function_count'] = len(re.findall(r'\w+\s+\w+\s*\([^)]*\)\s*{', content))
            
            # Estimate complexity
            complexity_patterns = [
                r'\bif\b', r'\belse\b', r'\bfor\b', r'\bwhile\b',
                r'\bswitch\b', r'\bgoto\b'
            ]
            
            for pattern in complexity_patterns:
                metrics['complexity'] += len(re.findall(pattern, content))
            
            metrics['debt_score'] = self._calculate_technical_debt(content)
            metrics['code_blocks'] = self._extract_code_blocks(content)
            
            return metrics
            
        except Exception as e:
            logging.warning(f"Error analyzing C/C++ file {file_path}: {str(e)}")
            return None
    
    def _analyze_csharp_file(self, file_path: str) -> Optional[Dict]:
        """Analyze C# file (simplified analysis)"""
        return self._analyze_java_file(file_path)  # Similar syntax
    
    def _analyze_go_file(self, file_path: str) -> Optional[Dict]:
        """Analyze Go file (simplified analysis)"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            metrics = {
                'lines': len(content.splitlines()),
                'complexity': 0,
                'function_count': 0,
                'class_count': 0,
                'comment_lines': 0,
                'debt_score': 0,
                'code_smells': 0,
                'functions': [],
                'code_blocks': []
            }
            
            # Count comments
            single_comments = len(re.findall(r'//.*', content))
            multi_comments = len(re.findall(r'/\*.*?\*/', content, re.DOTALL))
            metrics['comment_lines'] = single_comments + multi_comments
            
            # Count functions
            metrics['function_count'] = len(re.findall(r'func\s+\w+\s*\(', content))
            
            # Count structs (Go's equivalent to classes)
            metrics['class_count'] = len(re.findall(r'type\s+\w+\s+struct', content))
            
            # Estimate complexity
            complexity_patterns = [
                r'\bif\b', r'\belse\b', r'\bfor\b', r'\bswitch\b',
                r'\bselect\b', r'\bgo\b'
            ]
            
            for pattern in complexity_patterns:
                metrics['complexity'] += len(re.findall(pattern, content))
            
            metrics['debt_score'] = self._calculate_technical_debt(content)
            metrics['code_blocks'] = self._extract_code_blocks(content)
            
            return metrics
            
        except Exception as e:
            logging.warning(f"Error analyzing Go file {file_path}: {str(e)}")
            return None
    
    def _calculate_function_complexity(self, node: ast.FunctionDef) -> int:
        """Calculate cyclomatic complexity of a Python function"""
        complexity = 1  # Base complexity
        
        for child in ast.walk(node):
            if isinstance(child, (ast.If, ast.While, ast.For, ast.AsyncFor)):
                complexity += 1
            elif isinstance(child, ast.ExceptHandler):
                complexity += 1
            elif isinstance(child, ast.With, ast.AsyncWith):
                complexity += 1
            elif isinstance(child, ast.BoolOp):
                complexity += len(child.values) - 1
        
        return complexity
    
    def _detect_python_code_smells(self, content: str) -> int:
        """Detect code smells in Python code"""
        smells = 0
        lines = content.splitlines()
        
        for line in lines:
            line = line.strip()
            # Long lines
            if len(line) > 120:
                smells += 1
            # Too many parameters (simplified check)
            if 'def ' in line and line.count(',') > 5:
                smells += 1
            # Magic numbers
            if re.search(r'\b\d{2,}\b', line) and 'def ' not in line:
                smells += 1
        
        return smells
    
    def _detect_js_code_smells(self, content: str) -> int:
        """Detect code smells in JavaScript code"""
        smells = 0
        lines = content.splitlines()
        
        for line in lines:
            line = line.strip()
            # Long lines
            if len(line) > 120:
                smells += 1
            # Console.log statements
            if 'console.log' in line:
                smells += 1
            # var usage (should use let/const)
            if re.match(r'^\s*var\s+', line):
                smells += 1
        
        return smells
    
    def _detect_java_code_smells(self, content: str) -> int:
        """Detect code smells in Java code"""
        smells = 0
        lines = content.splitlines()
        
        for line in lines:
            line = line.strip()
            # Long lines
            if len(line) > 120:
                smells += 1
            # System.out.println statements
            if 'System.out.println' in line:
                smells += 1
        
        return smells
    
    def _calculate_technical_debt(self, content: str) -> int:
        """Calculate technical debt score based on TODO/FIXME comments"""
        debt_patterns = [
            r'TODO', r'FIXME', r'HACK', r'XXX', r'BUG'
        ]
        
        debt_score = 0
        for pattern in debt_patterns:
            debt_score += len(re.findall(pattern, content, re.IGNORECASE))
        
        return debt_score
    
    def _extract_code_blocks(self, content: str) -> List[str]:
        """Extract code blocks for duplication analysis"""
        lines = content.splitlines()
        blocks = []
        
        # Extract blocks of 5+ consecutive non-empty lines
        current_block = []
        for line in lines:
            line = line.strip()
            if line and not line.startswith('#') and not line.startswith('//'):
                current_block.append(line)
            else:
                if len(current_block) >= 5:
                    blocks.append('\n'.join(current_block))
                current_block = []
        
        if len(current_block) >= 5:
            blocks.append('\n'.join(current_block))
        
        return blocks
    
    def _calculate_duplication(self, code_blocks: List[str]) -> float:
        """Calculate code duplication percentage"""
        if len(code_blocks) < 2:
            return 0.0
        
        duplicates = 0
        total_comparisons = 0
        
        for i in range(len(code_blocks)):
            for j in range(i + 1, len(code_blocks)):
                total_comparisons += 1
                similarity = self._calculate_similarity(code_blocks[i], code_blocks[j])
                if similarity > 0.8:  # 80% similarity threshold
                    duplicates += 1
        
        return (duplicates / total_comparisons) * 100 if total_comparisons > 0 else 0.0
    
    def _calculate_similarity(self, block1: str, block2: str) -> float:
        """Calculate similarity between two code blocks"""
        lines1 = set(block1.splitlines())
        lines2 = set(block2.splitlines())
        
        if not lines1 or not lines2:
            return 0.0
        
        intersection = len(lines1.intersection(lines2))
        union = len(lines1.union(lines2))
        
        return intersection / union if union > 0 else 0.0
    
    def _calculate_maintainability_index(self, metrics: Dict) -> float:
        """Calculate maintainability index (simplified version)"""
        # Simplified maintainability index calculation
        # Based on Halstead Volume, Cyclomatic Complexity, and Lines of Code
        
        loc = metrics.get('total_lines', 1)
        complexity = metrics.get('cyclomatic_complexity', 1)
        comment_ratio = metrics.get('comment_ratio', 0)
        
        # Simplified formula (not the exact Microsoft formula)
        mi = max(0, (171 - 5.2 * (complexity / max(loc, 1)) * 100 
                    - 0.23 * complexity 
                    - 16.2 * (loc / 1000)
                    + 50 * (comment_ratio / 100)))
        
        return min(100, mi)
    
    def _estimate_test_coverage(self, repo_path: str) -> float:
        """Estimate test coverage based on test files presence"""
        test_patterns = [
            r'test.*\.py$', r'.*_test\.py$', r'.*\.test\.js$', r'.*\.spec\.js$',
            r'.*Test\.java$', r'test.*\.java$', r'.*_test\.go$'
        ]
        
        total_files = 0
        test_files = 0
        
        for root, dirs, files in os.walk(repo_path):
            dirs[:] = [d for d in dirs if not d.startswith('.')]
            
            for file in files:
                if any(file.endswith(ext) for ext in ['.py', '.js', '.ts', '.java', '.go']):
                    total_files += 1
                    
                    for pattern in test_patterns:
                        if re.match(pattern, file, re.IGNORECASE):
                            test_files += 1
                            break
        
        # Rough estimation: assume each test file covers 5 source files
        estimated_coverage = min(100, (test_files * 5 / max(total_files, 1)) * 100)
        return estimated_coverage
    
    def _get_default_metrics(self) -> Dict:
        """Return default metrics when analysis fails"""
        return {
            'cyclomatic_complexity': 0,
            'code_duplication': 0,
            'technical_debt': 0,
            'test_coverage': 0,
            'maintainability_index': 0,
            'code_smells': 0,
            'total_files': 0,
            'total_lines': 0,
            'comment_ratio': 0,
            'function_count': 0,
            'class_count': 0,
            'avg_function_length': 0,
            'max_function_complexity': 0
        }
