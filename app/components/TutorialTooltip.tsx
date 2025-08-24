import { useState, useEffect } from 'react'
import styles from '../styles/TutorialTooltip.module.css'

interface TutorialStep {
  id: string
  title: string
  description: string
  target: string
  position: 'top' | 'bottom' | 'left' | 'right'
}

interface TutorialTooltipProps {
  steps: TutorialStep[]
  isActive: boolean
  onComplete: () => void
}

const TutorialTooltip = ({ steps, isActive, onComplete }: TutorialTooltipProps) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(isActive)
  }, [isActive])

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      setIsVisible(false)
      onComplete()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const skipTutorial = () => {
    setIsVisible(false)
    onComplete()
  }

  if (!isVisible || steps.length === 0) return null

  const step = steps[currentStep]

  return (
    <>
      <div className={styles.overlay} />
      <div className={styles.tooltip} data-position={step.position}>
        <div className={styles.tooltipContent}>
          <div className={styles.tooltipHeader}>
            <h3>{step.title}</h3>
            <span className={styles.stepCounter}>
              {currentStep + 1} de {steps.length}
            </span>
          </div>
          
          <p className={styles.tooltipDescription}>
            {step.description}
          </p>
          
          <div className={styles.tooltipActions}>
            <button 
              onClick={skipTutorial}
              className={styles.skipButton}
            >
              Pular Tutorial
            </button>
            
            <div className={styles.navigationButtons}>
              {currentStep > 0 && (
                <button 
                  onClick={prevStep}
                  className={styles.prevButton}
                >
                  Anterior
                </button>
              )}
              
              <button 
                onClick={nextStep}
                className={styles.nextButton}
              >
                {currentStep === steps.length - 1 ? 'Finalizar' : 'Próximo'}
              </button>
            </div>
          </div>
        </div>
        
        <div className={styles.tooltipArrow} />
      </div>
    </>
  )
}

export default TutorialTooltip
