import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCog, faInfoCircle } from '@fortawesome/free-solid-svg-icons'
import styles from '../styles/ClusteringControls.module.css'

interface ClusteringControlsProps {
  currentAlgorithm: string
  onAlgorithmChange: (algorithm: string) => void
  onRefresh: () => void
  isLoading: boolean
}

const ClusteringControls = ({ 
  currentAlgorithm, 
  onAlgorithmChange, 
  onRefresh, 
  isLoading 
}: ClusteringControlsProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const algorithms = [
    {
      value: 'auto',
      name: 'Automático',
      description: 'Seleciona o melhor algoritmo baseado no tamanho do dataset'
    },
    {
      value: 'knn',
      name: 'K-Nearest Neighbors',
      description: 'Encontra repositórios mais próximos usando distância coseno'
    },
    {
      value: 'dbscan',
      name: 'DBSCAN',
      description: 'Clustering baseado em densidade, detecta outliers'
    },
    {
      value: 'kmeans',
      name: 'K-Means',
      description: 'Agrupa repositórios em clusters bem definidos'
    }
  ]

  const handleAlgorithmChange = (algorithm: string) => {
    onAlgorithmChange(algorithm)
    onRefresh()
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <FontAwesomeIcon icon={faCog} className={styles.icon} />
        <span className={styles.title}>Configurações de Clustering</span>
        <button 
          className={styles.toggleButton}
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? 'Ocultar' : 'Mostrar'} Avançado
        </button>
      </div>

      {showAdvanced && (
        <div className={styles.advancedPanel}>
          <div className={styles.algorithmSection}>
            <label className={styles.label}>
              <FontAwesomeIcon icon={faInfoCircle} className={styles.infoIcon} />
              Algoritmo de Clustering:
            </label>
            
            <div className={styles.algorithmGrid}>
              {algorithms.map((algo) => (
                <div 
                  key={algo.value}
                  className={`${styles.algorithmCard} ${
                    currentAlgorithm === algo.value ? styles.selected : ''
                  }`}
                  onClick={() => handleAlgorithmChange(algo.value)}
                >
                  <div className={styles.algorithmName}>{algo.name}</div>
                  <div className={styles.algorithmDescription}>{algo.description}</div>
                  {currentAlgorithm === algo.value && (
                    <div className={styles.selectedBadge}>Ativo</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.enhancedToggle}>
            <label className={styles.checkboxLabel}>
              <input 
                type="checkbox" 
                defaultChecked={true}
                className={styles.checkbox}
              />
              <span>Usar métricas avançadas de qualidade de código</span>
            </label>
            <div className={styles.helpText}>
              Inclui complexidade ciclomática, duplicação de código, cobertura de testes e outras métricas avançadas
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClusteringControls
