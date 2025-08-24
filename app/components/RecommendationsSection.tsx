import styles from '../styles/RecommendationsSection.module.css'

interface Recommendation {
  type: 'warning' | 'critical' | 'info'
  metric: string
  title: string
  description: string
  actionItems: string[]
}

interface RecommendationsSectionProps {
  recommendations: Recommendation[]
}

const RecommendationsSection = (props: RecommendationsSectionProps) => {
  const getIconAndColor = (type: string) => {
    switch (type) {
      case 'critical':
        return { icon: '🚨', color: '#fad6d6', textColor: '#d32f2f' }
      case 'warning':
        return { icon: '⚠️', color: '#fceec2', textColor: '#f57c00' }
      case 'info':
        return { icon: 'ℹ️', color: '#e3f2fd', textColor: '#1976d2' }
      default:
        return { icon: '📋', color: '#f5f5f5', textColor: '#666' }
    }
  }

  if (!props.recommendations || props.recommendations.length === 0) {
    return (
      <div className={styles.noRecommendations}>
        <div className={styles.successIcon}>✅</div>
        <h3>Excelente trabalho!</h3>
        <p>Seu projeto está com todas as métricas em níveis saudáveis. Continue assim!</p>
      </div>
    )
  }

  return (
    <div className={styles.recommendationsContainer}>
      <h3 className={styles.sectionTitle}>
        📈 Recomendações para Melhoria
      </h3>
      
      {props.recommendations.map((recommendation, index) => {
        const { icon, color, textColor } = getIconAndColor(recommendation.type)
        
        return (
          <div 
            key={index} 
            className={styles.recommendationCard}
            style={{ backgroundColor: color, borderLeft: `4px solid ${textColor}` }}
          >
            <div className={styles.recommendationHeader}>
              <span className={styles.recommendationIcon}>{icon}</span>
              <div>
                <h4 style={{ color: textColor }}>{recommendation.title}</h4>
                <span className={styles.metricName}>Métrica: {recommendation.metric}</span>
              </div>
            </div>
            
            <p className={styles.recommendationDescription}>
              {recommendation.description}
            </p>
            
            <div className={styles.actionItems}>
              <strong>Ações sugeridas:</strong>
              <ul>
                {recommendation.actionItems.map((action, actionIndex) => (
                  <li key={actionIndex}>{action}</li>
                ))}
              </ul>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default RecommendationsSection
