import { useState, useEffect } from 'react'
import styles from '../styles/ProgressLoader.module.css'

interface ProgressLoaderProps {
  isLoading: boolean
  message?: string
  steps?: string[]
  currentStep?: number
  showProgress?: boolean
}

const ProgressLoader = ({ 
  isLoading, 
  message = "Carregando...", 
  steps = [],
  currentStep = 0,
  showProgress = false 
}: ProgressLoaderProps) => {
  const [dots, setDots] = useState('')
  
  useEffect(() => {
    if (!isLoading) return
    
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return ''
        return prev + '.'
      })
    }, 500)
    
    return () => clearInterval(interval)
  }, [isLoading])

  if (!isLoading) return null

  const progressPercentage = steps.length > 0 ? ((currentStep + 1) / steps.length) * 100 : 0

  return (
    <div className={styles.overlay}>
      <div className={styles.loader}>
        <div className={styles.spinnerContainer}>
          <div className={styles.spinner}></div>
        </div>
        
        <div className={styles.content}>
          <h3 className={styles.message}>{message}{dots}</h3>
          
          {showProgress && steps.length > 0 && (
            <div className={styles.progressSection}>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill}
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              
              <div className={styles.stepInfo}>
                <span className={styles.stepText}>
                  Etapa {currentStep + 1} de {steps.length}
                </span>
                {steps[currentStep] && (
                  <span className={styles.currentStepText}>
                    {steps[currentStep]}
                  </span>
                )}
              </div>
            </div>
          )}
          
          <div className={styles.loadingTips}>
            <p>💡 <strong>Dica:</strong> Enquanto aguarda, que tal conhecer nossas métricas na seção "About"?</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProgressLoader
