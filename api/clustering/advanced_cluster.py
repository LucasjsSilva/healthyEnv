import json
import math
import numpy as np
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
from sklearn.cluster import DBSCAN, KMeans
from sklearn.metrics import silhouette_score, calinski_harabasz_score
from sklearn.neighbors import NearestNeighbors
from model.metric_repo import MetricRepoModel
from model.metric import MetricModel
import logging
from typing import List, Dict, Tuple, Optional

class AdvancedClusteringService:
    """Advanced clustering service with multiple algorithms and validation"""
    
    def __init__(self):
        # Metric weights based on importance for repository health
        self.metric_weights = {
            # Basic GitHub metrics (lower weight)
            'stars': 0.8,
            'forks': 0.8,
            'contributors': 1.0,
            'commits': 0.9,
            'open_issues': 0.7,
            
            # Code quality metrics (higher weight)
            'cyclomatic_complexity': 1.5,
            'maintainability_index': 1.8,
            'code_duplication': 1.6,
            'comment_ratio': 1.2,
            'avg_function_length': 1.3,
            'max_function_complexity': 1.4,
            
            # Testing and debt metrics (highest weight)
            'test_coverage': 2.0,
            'technical_debt': 1.7,
            'code_smells': 1.5
        }
        
        self.scaler = None
        self.dimensionality_reducer = None
        
    def get_enhanced_cluster(self, repos: List, dataset_id: str, selected_repo_name: str, 
                           n: int, algorithm: str = 'auto') -> str:
        """
        Enhanced clustering with multiple algorithms and validation
        
        Args:
            repos: List of repository objects
            dataset_id: Dataset identifier
            selected_repo_name: Name of the selected repository
            n: Number of similar repositories to find
            algorithm: Clustering algorithm ('auto', 'knn', 'dbscan', 'kmeans')
            
        Returns:
            JSON string with clustering results and validation metrics
        """
        try:
            # Extract metrics from repositories
            metrics_data, feature_names = self._extract_metrics_data(repos, dataset_id)
            
            if len(metrics_data) < 2:
                return self._get_fallback_result(repos, selected_repo_name, n)
            
            # Preprocess data
            processed_data = self._advanced_preprocessing(metrics_data, feature_names)
            
            # Find selected repository index
            selected_idx = self._find_repo_index(repos, selected_repo_name)
            if selected_idx == -1:
                raise ValueError(f"Repository {selected_repo_name} not found")
            
            # Apply clustering algorithm
            if algorithm == 'auto':
                algorithm = self._select_best_algorithm(processed_data)
            
            similar_indices, cluster_quality = self._apply_clustering(
                processed_data, selected_idx, n, algorithm
            )
            
            # Generate results
            results = self._generate_enhanced_results(
                repos, selected_idx, similar_indices, cluster_quality, 
                processed_data, feature_names, algorithm
            )
            
            return json.dumps(results, indent=2)
            
        except Exception as e:
            logging.error(f"Enhanced clustering failed: {str(e)}")
            return self._get_fallback_result(repos, selected_repo_name, n)
    
    def _extract_metrics_data(self, repos: List, dataset_id: str) -> Tuple[np.ndarray, List[str]]:
        """Extract all available metrics for repositories"""
        repo_ids = [repo.id for repo in repos]
        metrics_data = MetricRepoModel.get_repos_metrics(repo_ids)
        
        # Get all available metrics
        all_metrics = MetricModel.get_all_metrics()
        metric_names = [metric.name.lower() for metric in all_metrics]
        
        # Create metrics matrix
        metrics_matrix = []
        feature_names = []
        
        for repo in repos:
            repo_metrics = []
            
            # Basic repository metrics (from repo object)
            basic_metrics = {
                'stars': getattr(repo, 'stars', 0),
                'forks': getattr(repo, 'forks', 0),
                'contributors': getattr(repo, 'contributors', 0),
                'commits': getattr(repo, 'commits', 0),
                'open_issues': getattr(repo, 'open_issues', 0),
                'loc': getattr(repo, 'loc', 0)
            }
            
            # Advanced metrics (from database)
            advanced_metrics = {}
            for metric_data in metrics_data:
                if metric_data.id_repo == repo.id:
                    metric_name = next((m.name.lower() for m in all_metrics 
                                      if m.id == metric_data.id_metric), None)
                    if metric_name:
                        advanced_metrics[metric_name] = metric_data.value
            
            # Combine all metrics
            all_repo_metrics = {**basic_metrics, **advanced_metrics}
            
            # Build feature vector with consistent ordering
            if not feature_names:  # First repository - establish feature order
                feature_names = sorted(all_repo_metrics.keys())
            
            for feature in feature_names:
                value = all_repo_metrics.get(feature, 0)
                repo_metrics.append(float(value))
            
            metrics_matrix.append(repo_metrics)
        
        return np.array(metrics_matrix), feature_names
    
    def _advanced_preprocessing(self, data: np.ndarray, feature_names: List[str]) -> np.ndarray:
        """Advanced preprocessing with weighted features and robust scaling"""
        # Apply weights to features
        weighted_data = data.copy()
        for i, feature in enumerate(feature_names):
            # Find matching weight (partial string matching)
            weight = 1.0
            for metric_key, metric_weight in self.metric_weights.items():
                if metric_key in feature.lower():
                    weight = metric_weight
                    break
            weighted_data[:, i] *= weight
        
        # Use RobustScaler to handle outliers better
        self.scaler = RobustScaler()
        scaled_data = self.scaler.fit_transform(weighted_data)
        
        # Apply dimensionality reduction if we have many features
        if scaled_data.shape[1] > 10:
            # Use PCA to reduce to manageable number of components
            n_components = min(10, scaled_data.shape[1] - 1, scaled_data.shape[0] - 1)
            self.dimensionality_reducer = PCA(n_components=n_components)
            reduced_data = self.dimensionality_reducer.fit_transform(scaled_data)
            
            logging.info(f"Reduced {scaled_data.shape[1]} features to {n_components} components")
            logging.info(f"Explained variance ratio: {self.dimensionality_reducer.explained_variance_ratio_.sum():.3f}")
            
            return reduced_data
        
        return scaled_data
    
    def _find_repo_index(self, repos: List, repo_name: str) -> int:
        """Find the index of the selected repository"""
        for i, repo in enumerate(repos):
            if repo.name == repo_name:
                return i
        return -1
    
    def _select_best_algorithm(self, data: np.ndarray) -> str:
        """Automatically select the best clustering algorithm"""
        n_samples = data.shape[0]
        
        if n_samples < 10:
            return 'knn'  # Simple KNN for small datasets
        elif n_samples < 50:
            return 'kmeans'  # K-means for medium datasets
        else:
            return 'dbscan'  # DBSCAN for larger datasets
    
    def _apply_clustering(self, data: np.ndarray, selected_idx: int, n: int, 
                         algorithm: str) -> Tuple[List[int], Dict]:
        """Apply the specified clustering algorithm"""
        if algorithm == 'knn':
            return self._knn_clustering(data, selected_idx, n)
        elif algorithm == 'dbscan':
            return self._dbscan_clustering(data, selected_idx, n)
        elif algorithm == 'kmeans':
            return self._kmeans_clustering(data, selected_idx, n)
        else:
            raise ValueError(f"Unknown algorithm: {algorithm}")
    
    def _knn_clustering(self, data: np.ndarray, selected_idx: int, n: int) -> Tuple[List[int], Dict]:
        """K-Nearest Neighbors clustering"""
        # Use cosine distance for better similarity measurement
        nbrs = NearestNeighbors(n_neighbors=min(n + 1, len(data)), metric='cosine')
        nbrs.fit(data)
        
        distances, indices = nbrs.kneighbors([data[selected_idx]])
        
        # Remove the selected repository itself
        similar_indices = [idx for idx in indices[0] if idx != selected_idx][:n]
        
        # Calculate quality metrics
        if len(data) > 2:
            silhouette = silhouette_score(data, [0] * len(data))  # Dummy labels for silhouette
        else:
            silhouette = 0.0
        
        quality = {
            'algorithm': 'knn',
            'silhouette_score': silhouette,
            'avg_distance': float(np.mean(distances[0][1:n+1])),
            'confidence': self._calculate_confidence(distances[0][1:n+1])
        }
        
        return similar_indices, quality
    
    def _dbscan_clustering(self, data: np.ndarray, selected_idx: int, n: int) -> Tuple[List[int], Dict]:
        """DBSCAN clustering"""
        # Automatically determine eps using k-distance graph
        k = min(4, len(data) - 1)
        nbrs = NearestNeighbors(n_neighbors=k)
        nbrs.fit(data)
        distances, _ = nbrs.kneighbors(data)
        distances = np.sort(distances[:, k-1], axis=0)
        
        # Use elbow method to find optimal eps
        eps = np.percentile(distances, 75)  # Use 75th percentile as eps
        
        # Apply DBSCAN
        dbscan = DBSCAN(eps=eps, min_samples=max(2, len(data) // 10))
        cluster_labels = dbscan.fit_predict(data)
        
        selected_cluster = cluster_labels[selected_idx]
        
        if selected_cluster == -1:  # Selected repo is noise, fall back to KNN
            return self._knn_clustering(data, selected_idx, n)
        
        # Find repositories in the same cluster
        cluster_indices = [i for i, label in enumerate(cluster_labels) 
                          if label == selected_cluster and i != selected_idx]
        
        # If not enough in cluster, add closest from other clusters
        if len(cluster_indices) < n:
            nbrs = NearestNeighbors(n_neighbors=len(data))
            nbrs.fit(data)
            distances, indices = nbrs.kneighbors([data[selected_idx]])
            
            for idx in indices[0]:
                if idx != selected_idx and idx not in cluster_indices:
                    cluster_indices.append(idx)
                    if len(cluster_indices) >= n:
                        break
        
        similar_indices = cluster_indices[:n]
        
        # Calculate quality metrics
        if len(set(cluster_labels)) > 1:
            silhouette = silhouette_score(data, cluster_labels)
        else:
            silhouette = 0.0
        
        quality = {
            'algorithm': 'dbscan',
            'silhouette_score': silhouette,
            'n_clusters': len(set(cluster_labels)) - (1 if -1 in cluster_labels else 0),
            'eps': eps,
            'noise_points': list(cluster_labels).count(-1)
        }
        
        return similar_indices, quality
    
    def _kmeans_clustering(self, data: np.ndarray, selected_idx: int, n: int) -> Tuple[List[int], Dict]:
        """K-Means clustering"""
        # Determine optimal number of clusters using elbow method
        max_k = min(10, len(data) // 2)
        if max_k < 2:
            return self._knn_clustering(data, selected_idx, n)
        
        inertias = []
        silhouette_scores = []
        k_range = range(2, max_k + 1)
        
        for k in k_range:
            kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
            cluster_labels = kmeans.fit_predict(data)
            inertias.append(kmeans.inertia_)
            silhouette_scores.append(silhouette_score(data, cluster_labels))
        
        # Choose k with best silhouette score
        best_k = k_range[np.argmax(silhouette_scores)]
        
        # Apply final clustering
        kmeans = KMeans(n_clusters=best_k, random_state=42, n_init=10)
        cluster_labels = kmeans.fit_predict(data)
        
        selected_cluster = cluster_labels[selected_idx]
        
        # Find repositories in the same cluster
        cluster_indices = [i for i, label in enumerate(cluster_labels) 
                          if label == selected_cluster and i != selected_idx]
        
        # If not enough in cluster, add closest from other clusters
        if len(cluster_indices) < n:
            distances = np.linalg.norm(data - data[selected_idx], axis=1)
            sorted_indices = np.argsort(distances)
            
            for idx in sorted_indices:
                if idx != selected_idx and idx not in cluster_indices:
                    cluster_indices.append(idx)
                    if len(cluster_indices) >= n:
                        break
        
        similar_indices = cluster_indices[:n]
        
        quality = {
            'algorithm': 'kmeans',
            'silhouette_score': silhouette_scores[best_k - 2],
            'calinski_harabasz_score': calinski_harabasz_score(data, cluster_labels),
            'n_clusters': best_k,
            'inertia': kmeans.inertia_
        }
        
        return similar_indices, quality
    
    def _calculate_confidence(self, distances: np.ndarray) -> float:
        """Calculate confidence score based on distance distribution"""
        if len(distances) < 2:
            return 1.0
        
        # Lower variance in distances = higher confidence
        variance = np.var(distances)
        mean_distance = np.mean(distances)
        
        # Normalize confidence (0-1 scale)
        confidence = 1.0 / (1.0 + variance / (mean_distance + 1e-6))
        return float(confidence)
    
    def _generate_enhanced_results(self, repos: List, selected_idx: int, similar_indices: List[int],
                                 cluster_quality: Dict, processed_data: np.ndarray, 
                                 feature_names: List[str], algorithm: str) -> Dict:
        """Generate enhanced results with validation metrics"""
        selected_repo = repos[selected_idx]
        
        # Build selected repository data
        selected_repo_data = {
            'id': selected_repo.id,
            'name': selected_repo.name,
            'language': getattr(selected_repo, 'language', 'Unknown'),
            'loc': getattr(selected_repo, 'loc', 0),
            'stars': getattr(selected_repo, 'stars', 0),
            'forks': getattr(selected_repo, 'forks', 0),
            'open_issues': getattr(selected_repo, 'open_issues', 0),
            'contributors': getattr(selected_repo, 'contributors', 0),
            'commits': getattr(selected_repo, 'commits', 0)
        }
        
        # Add coordinates for visualization
        if processed_data.shape[1] >= 2:
            selected_repo_data['x'] = float(processed_data[selected_idx][0])
            selected_repo_data['y'] = float(processed_data[selected_idx][1])
        else:
            selected_repo_data['x'] = 0.0
            selected_repo_data['y'] = 0.0
        
        # Build similar repositories data
        similar_repos = []
        for idx in similar_indices:
            if idx < len(repos):
                repo = repos[idx]
                repo_data = {
                    'id': repo.id,
                    'name': repo.name,
                    'near': True,
                    'distance': float(np.linalg.norm(processed_data[idx] - processed_data[selected_idx]))
                }
                
                if processed_data.shape[1] >= 2:
                    repo_data['x'] = float(processed_data[idx][0])
                    repo_data['y'] = float(processed_data[idx][1])
                else:
                    repo_data['x'] = 0.0
                    repo_data['y'] = 0.0
                
                similar_repos.append(repo_data)
        
        # Add remaining repositories as distant
        for i, repo in enumerate(repos):
            if i != selected_idx and i not in similar_indices:
                repo_data = {
                    'id': repo.id,
                    'name': repo.name,
                    'near': False,
                    'distance': float(np.linalg.norm(processed_data[i] - processed_data[selected_idx]))
                }
                
                if processed_data.shape[1] >= 2:
                    repo_data['x'] = float(processed_data[i][0])
                    repo_data['y'] = float(processed_data[i][1])
                else:
                    repo_data['x'] = 0.0
                    repo_data['y'] = 0.0
                
                similar_repos.append(repo_data)
        
        # Get metrics for selected and similar repositories
        all_repo_ids = [selected_repo.id] + [repos[idx].id for idx in similar_indices]
        metrics_data = MetricRepoModel.get_repos_metrics(all_repo_ids)
        
        # Build metrics dictionary
        metrics_dict = {}
        for repo_id in all_repo_ids:
            metrics_dict[repo_id] = {}
        
        for metric_data in metrics_data:
            if metric_data.id_repo in metrics_dict:
                metrics_dict[metric_data.id_repo][metric_data.id_metric] = metric_data.value
        
        # Add metrics to selected repository
        selected_repo_data['metrics'] = metrics_dict.get(selected_repo.id, {})
        
        # Add metrics to similar repositories
        for repo_data in similar_repos:
            if repo_data['near']:
                repo_data['metrics'] = metrics_dict.get(repo_data['id'], {})
        
        # Build final results
        results = {
            'selected': selected_repo_data,
            'repos': similar_repos,
            'clustering_info': {
                'algorithm': algorithm,
                'quality_metrics': cluster_quality,
                'features_used': len(feature_names),
                'total_repositories': len(repos),
                'similar_found': len(similar_indices)
            }
        }
        
        return results
    
    def _get_fallback_result(self, repos: List, selected_repo_name: str, n: int) -> str:
        """Fallback to simple clustering when advanced methods fail"""
        logging.warning("Falling back to simple clustering")
        from clustering.cluster import get_cluster
        return get_cluster(repos, "", selected_repo_name, n)


# Main function for backward compatibility
def get_enhanced_cluster(repos: List, dataset_id: str, selected_repo_name: str, n: int, 
                        algorithm: str = 'auto') -> str:
    """Enhanced clustering function with backward compatibility"""
    service = AdvancedClusteringService()
    return service.get_enhanced_cluster(repos, dataset_id, selected_repo_name, n, algorithm)
