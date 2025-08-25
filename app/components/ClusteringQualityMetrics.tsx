import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartBar, faCheckCircle, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
import styles from '../styles/ClusteringQualityMetrics.module.css'

interface ClusteringInfo {
  algorithm: string
  quality_metrics: {
    silhouette_score?: number
    confidence?: number
    n_clusters?: number
    avg_distance?: number
    calinski_harabasz_score?: number
    eps?: number
    noise_points?: number
    inertia?: number
  }
  features_used: number
  total_repositories: number
  similar_found: number
}

interface ClusteringQualityMetricsProps {
  clusteringInfo: ClusteringInfo
}

const ClusteringQualityMetrics = ({ clusteringInfo }: ClusteringQualityMetricsProps) => {
  const { algorithm, quality_metrics, features_used, total_repositories, similar_found } = clusteringInfo

  const getAlgorithmName = (algo: string) => {
    const names = {
      'auto': 'Automático',
      'knn': 'K-Nearest Neighbors',
      'dbscan': 'DBSCAN',
      'kmeans': 'K-Means'
    }
    return names[algo] || algo
  }

  const getQualityLevel = (score: number, type: 'silhouette' | 'confidence') => {
    if (type === 'silhouette') {
      if (score >= 0.7) return { level: 'excellent', color: '#28a745', icon: faCheckCircle }
      if (score >= 0.5) return { level: 'good', color: '#ffc107', icon: faExclamationTriangle }
      return { level: 'poor', color: '#dc3545', icon: faExclamationTriangle }
    } else {
      if (score >= 0.8) return { level: 'excellent', color: '#28a745', icon: faCheckCircle }
      if (score >= 0.6) return { level: 'good', color: '#ffc107', icon: faExclamationTriangle }
      return { level: 'poor', color: '#dc3545', icon: faExclamationTriangle }
    }
  }

  const formatScore = (score: number) => {
    return (score * 100).toFixed(1) + '%'
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <FontAwesomeIcon icon={faChartBar} className={styles.headerIcon} />
        <span className={styles.title}>Qualidade do Clustering</span>
      </div>

      <div className={styles.content}>
        <div className={styles.algorithmInfo}>
          <div className={styles.algorithmBadge}>
            {getAlgorithmName(algorithm)}
          </div>
          <div className={styles.statsGrid}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{features_used}</span>
              <span className={styles.statLabel}>Métricas Usadas</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{similar_found}</span>
              <span className={styles.statLabel}>Similares Encontrados</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{total_repositories}</span>
              <span className={styles.statLabel}>Total no Dataset</span>
            </div>
          </div>
        </div>

        <div className={styles.qualityMetrics}>
          {quality_metrics.silhouette_score !== undefined && (
            <div className={styles.metric}>
              <div className={styles.metricHeader}>
                <span className={styles.metricName}>Silhouette Score</span>
                {(() => {
                  const quality = getQualityLevel(quality_metrics.silhouette_score, 'silhouette')
                  return (
                    <FontAwesomeIcon 
                      icon={quality.icon} 
                      style={{ color: quality.color }}
                      className={styles.qualityIcon}
                    />
                  )
                })()}
              </div>
              <div className={styles.metricValue}>
                {formatScore(quality_metrics.silhouette_score)}
              </div>
              <div className={styles.metricDescription}>
                Mede a qualidade da separação entre clusters
              </div>
            </div>
          )}

          {quality_metrics.confidence !== undefined && (
            <div className={styles.metric}>
              <div className={styles.metricHeader}>
                <span className={styles.metricName}>Confiança</span>
                {(() => {
                  const quality = getQualityLevel(quality_metrics.confidence, 'confidence')
                  return (
                    <FontAwesomeIcon 
                      icon={quality.icon} 
                      style={{ color: quality.color }}
                      className={styles.qualityIcon}
                    />
                  )
                })()}
              </div>
              <div className={styles.metricValue}>
                {formatScore(quality_metrics.confidence)}
              </div>
              <div className={styles.metricDescription}>
                Confiabilidade dos repositórios similares encontrados
              </div>
            </div>
          )}

          {quality_metrics.avg_distance !== undefined && (
            <div className={styles.metric}>
              <div className={styles.metricHeader}>
                <span className={styles.metricName}>Distância Média</span>
              </div>
              <div className={styles.metricValue}>
                {quality_metrics.avg_distance.toFixed(3)}
              </div>
              <div className={styles.metricDescription}>
                Distância média entre repositórios similares
              </div>
            </div>
          )}

          {quality_metrics.n_clusters !== undefined && (
            <div className={styles.metric}>
              <div className={styles.metricHeader}>
                <span className={styles.metricName}>Clusters Encontrados</span>
              </div>
              <div className={styles.metricValue}>
                {quality_metrics.n_clusters}
              </div>
              <div className={styles.metricDescription}>
                Número de grupos identificados no dataset
              </div>
            </div>
          )}

          {quality_metrics.noise_points !== undefined && quality_metrics.noise_points > 0 && (
            <div className={styles.metric}>
              <div className={styles.metricHeader}>
                <span className={styles.metricName}>Outliers</span>
                <FontAwesomeIcon 
                  icon={faExclamationTriangle} 
                  style={{ color: '#ffc107' }}
                  className={styles.qualityIcon}
                />
              </div>
              <div className={styles.metricValue}>
                {quality_metrics.noise_points}
              </div>
              <div className={styles.metricDescription}>
                Repositórios identificados como outliers
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ClusteringQualityMetrics
