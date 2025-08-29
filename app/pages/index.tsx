import Header from '../components/Header'
import TutorialTooltip from '../components/TutorialTooltip'
import styles from '../styles/Home.module.css'
import Link from 'next/link'
import Head from 'next/head'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { useState, useEffect } from 'react'
import Router from 'next/router'

export default function Home() {
  const [showTutorial, setShowTutorial] = useState(false)
  const image = '/assets/landing.png'

  useEffect(() => {
    // Check if user has seen the tutorial before
    const hasSeenTutorial = localStorage.getItem('healthyenv-tutorial-completed')
    if (!hasSeenTutorial) {
      // Delay tutorial start to let page load
      setTimeout(() => setShowTutorial(true), 1000)
    }
  }, [])

  const handleTutorialComplete = () => {
    localStorage.setItem('healthyenv-tutorial-completed', 'true')
    setShowTutorial(false)
  }

  const tutorialSteps = [
    {
      id: 'welcome',
      title: 'Bem-vindo ao HealthyEnv!',
      description: 'O HealthyEnv é uma ferramenta para avaliar a saúde de repositórios de software usando métricas e machine learning.',
      target: 'main-hero',
      position: 'bottom' as const
    },
    {
      id: 'analyze',
      title: 'Análise de Repositórios',
      description: 'Clique aqui para começar a analisar repositórios. Você pode usar nossos datasets ou submeter novos repositórios.',
      target: 'analyze-button',
      position: 'top' as const
    },
    {
      id: 'about',
      title: 'Saiba Mais',
      description: 'Na seção About você encontra informações detalhadas sobre as métricas utilizadas e como interpretá-las.',
      target: 'about-link',
      position: 'bottom' as const
    }
  ]

  return (
    <>
      <Head>
        <title>HealthyEnv - Ferramenta para avaliação de repositórios de software</title>
      </Head>
      <Header selectedIndex={0} />
      <div className={styles.container}>
        <div className={styles.firstSection} id="main-hero">
          <div className={styles.imageContainer}>
            <Image src={image} layout='fill' objectFit='contain' alt='An example of analysis.' className={styles.image} quality='100' />
          </div>
          <div className={styles.presentation}>
            <span className={styles.title}>
              Easy software repository analysis
            </span>
            <span className={styles.subtitle}>
              HealthyEnv is a free tool capable of analyzing a software
              repository based on hundreds of other repositories in our dataset.
            </span>
            <div className={styles.linksList}>
              <div id="analyze-button" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link href='/dashboard/datasets' className={`
                bg-blue-500 text-white px-5 py-3 rounded-full shadow-md cursor-pointer
              `}>
                  Explore the dataset
                </Link>
                <button
                  onClick={() => {
                    try {
                      const data = sessionStorage.getItem('userData')
                      if (!data) {
                        Router.push('/auth?next=/dashboard/requests')
                      } else {
                        Router.push('/dashboard/requests')
                      }
                    } catch {
                      Router.push('/auth?next=/dashboard/requests')
                    }
                  }}
                  className={`bg-green-600 text-white px-5 py-3 rounded-full shadow-md cursor-pointer`}
                >
                  Analyze my repositories
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <TutorialTooltip 
        steps={tutorialSteps}
        isActive={showTutorial}
        onComplete={handleTutorialComplete}
      />
    </>
  )
}
