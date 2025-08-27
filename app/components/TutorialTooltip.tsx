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
  const [tooltipStyle, setTooltipStyle] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  useEffect(() => {
    setIsVisible(isActive)
  }, [isActive])

  // Compute tooltip position relative to target element
  useEffect(() => {
    if (!isVisible || steps.length === 0) return
    const step = steps[currentStep]
    const el = typeof window !== 'undefined' ? document.getElementById(step.target) : null

    const computePosition = () => {
      const viewportPadding = 12
      const defaultTop = window.innerHeight / 2 - 100
      const defaultLeft = window.innerWidth / 2 - 160

      if (!el) {
        setTooltipStyle({ top: Math.max(0, defaultTop), left: Math.max(0, defaultLeft) })
        return
      }

      const rect = el.getBoundingClientRect()
      const tooltipWidth = 320 // match CSS max-width
      const tooltipHeight = 160 // rough estimate; not exact but good enough for positioning
      let top = 0
      let left = 0

      switch (step.position) {
        case 'top':
          top = rect.top - tooltipHeight - 12
          left = rect.left + rect.width / 2 - tooltipWidth / 2
          break
        case 'bottom':
          top = rect.bottom + 12
          left = rect.left + rect.width / 2 - tooltipWidth / 2
          break
        case 'left':
          top = rect.top + rect.height / 2 - tooltipHeight / 2
          left = rect.left - tooltipWidth - 12
          break
        case 'right':
          top = rect.top + rect.height / 2 - tooltipHeight / 2
          left = rect.right + 12
          break
      }

      // Keep within viewport
      top = Math.min(Math.max(top, viewportPadding), window.innerHeight - tooltipHeight - viewportPadding)
      left = Math.min(Math.max(left, viewportPadding), window.innerWidth - tooltipWidth - viewportPadding)
      setTooltipStyle({ top, left })
    }

    // Smoothly bring target into view first, then compute position
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
      // Recompute after scroll settles
      setTimeout(computePosition, 350)
    }
    // Also compute immediately to avoid flicker
    computePosition()
    // Recompute on resize/scroll
    window.addEventListener('resize', computePosition)
    window.addEventListener('scroll', computePosition, true)
    return () => {
      window.removeEventListener('resize', computePosition)
      window.removeEventListener('scroll', computePosition, true)
    }
  }, [isVisible, currentStep, steps])

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
      <div
        className={styles.tooltip}
        data-position={step.position}
        style={{ top: tooltipStyle.top, left: tooltipStyle.left }}
      >
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
