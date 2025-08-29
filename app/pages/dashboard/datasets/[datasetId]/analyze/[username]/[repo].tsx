import axios from "axios"
import Popup from "reactjs-popup"
import Head from "next/head"
import Constants from "../../../../../../utils/constants"
import styles from '../../../../../../styles/AnalyzeRepo.module.css'
import { Dots } from 'react-activity'
import Router, { useRouter } from "next/router"
import { useEffect, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faArrowRightArrowLeft, faArrowsRotate, faCertificate, faCheck } from "@fortawesome/free-solid-svg-icons"
import { getFirstQuartile, getMedian, getThirdQuartile } from "../../../../../../functions/stats"
import "react-activity/dist/Dots.css";
import PlotGrid from "../../../../../../components/PlotGrid"
import DashboardHeader from "../../../../../../components/DashboardHeader"
import RepoInfos from "../../../../../../components/RepoInfos"
import NearReposPlot from "../../../../../../components/NearReposPlot"
import MetricsHint from "../../../../../../components/MetricsHint"
import AnalysisSummarySection from "../../../../../../components/AnalysisSummarySection"
import RecommendationsSection from "../../../../../../components/RecommendationsSection"
import ChangeRepoModal from "../../../../../../components/ChangeRepoModal"
import ChangeNModal from "../../../../../../components/ChangeNModal"
import ProgressLoader from "../../../../../../components/ProgressLoader"
import FeedbackWidget from "../../../../../../components/FeedbackWidget"
import TutorialTooltip from "../../../../../../components/TutorialTooltip"
import ClusteringControls from "../../../../../../components/ClusteringControls"
import ClusteringQualityMetrics from "../../../../../../components/ClusteringQualityMetrics"
import generateRecommendations from "../../../../../../utils/recommendationsEngine"

enum MetricSituation {
  Ok = 'OK',
  Reasonable = 'REASONABLE',
  Bad = 'BAD',
}

const Repo = () => {
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(true)
  const [selectedRepoInfo, setSelectedRepoInfo] = useState({})
  const [referenceReposInfo, setReferenceReposInfo] = useState([])
  const [metricsData, setMetricsData] = useState([])
  const [requestPayloads, setRequestPayloads] = useState([])
  const [analysisSummary, setAnalysisSummary] = useState({})
  const [recommendations, setRecommendations] = useState([])
  const [showAnalysisTutorial, setShowAnalysisTutorial] = useState(false)
  const [nValue, setNValue] = useState(1)
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('auto')
  const [clusteringInfo, setClusteringInfo] = useState(null)

  // Modal
  const [open, setOpen] = useState(false)
  const closeModalRepo = () => setOpen(false)
  const [openN, setOpenN] = useState(false)
  const closeModalN = () => setOpenN(false)

  useEffect(() => {
    if (!router.isReady) return
    // Sempre que datasetId, username, repo ou near mudar, recarrega a análise
    loadRepo(router.query.datasetId, `${router.query.username}/${router.query.repo}`, safeNear(), 'auto')
  }, [router.isReady, router.query.datasetId, router.query.username, router.query.repo, router.query.near])

  // function verifyAuth() {
  //   const data = JSON.parse(localStorage.getItem('userData'))

  //   if (data == undefined) {
  //     Router.push(`/auth?next=${router.asPath}`)
  //   } else {
  //     if ((Date.now() - data['timestamp']) > 86400000) {
  //       Router.push(`/auth?next=${router.asPath}`)
  //     }
  //   }
  // }

  // Coerce near param to a safe number with default
  const safeNear = (): number => {
    const n = Number(router.query.near)
    return Number.isFinite(n) && n > 0 ? n : 10
  }

  // Load a repo's analysis
  async function loadRepo(datasetId: string | string[], repoName: string | string[], n: number, algorithm: string = 'auto') {
    setIsLoading(true)

    // API URLs
    const ds = Array.isArray(datasetId) ? datasetId[0] : datasetId
    const rn = Array.isArray(repoName) ? repoName[0] : repoName
    // Ensure owner and repo are path segments, not a single encoded string
    let owner = ''
    let repo = ''
    if (typeof rn === 'string' && rn.includes('/')) {
      const parts = rn.split('/')
      owner = parts[0]
      repo = parts[1]
    } else if (typeof rn === 'string') {
      // fallback if only repo was provided
      owner = String(router.query.username || '')
      repo = rn
    }
    const urlResults = `${Constants.baseUrl}/datasets/${encodeURIComponent(String(ds))}/cluster/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}?near_n=${n}&algorithm=${encodeURIComponent(String(algorithm))}&enhanced=true`
    const urlMetricsInfo = `${Constants.baseUrl}/metrics`
    const urlMetricsCategories = `${Constants.baseUrl}/metrics/categories`

    // Make all requests and update states with the received data
    await Promise.all([axios.get(urlResults), axios.get(urlMetricsInfo), axios.get(urlMetricsCategories)]).then((values) => {
      const resultsResponse = values[0].data
      const metricsInfoResponse = values[1].data
      const metricsCategoriesResponse = values[2].data

      setSelectedRepoInfo(resultsResponse['selected'])
      setReferenceReposInfo(resultsResponse['repos'])
      setClusteringInfo(resultsResponse['clustering_info'])
      setRequestPayloads([{
        url: urlResults,
        payload: JSON.stringify(resultsResponse, null, 2)
      }])

      // Make an list with all necessary data to perform an analysis
      const metricsData = []
      let okMetricsCount = 0, reasonableMetricsCount = 0, badMetricsCount = 0

      metricsCategoriesResponse.items.forEach(category => {
        const metricInfo = []

        metricsInfoResponse.items.forEach(metric => {
          if (category.id === metric['category_id']) {
            const refMetricsValues = [], valuesArray = []
            const selected = {
              name: resultsResponse['selected']['name'],
              value: resultsResponse['selected']['metrics'][metric['id']]
            }
            resultsResponse['repos'].forEach((repo: any) => {
              if (repo.near) {
                refMetricsValues.push({
                  name: repo.name,
                  value: repo.metrics[metric['id']]
                })
                valuesArray.push(repo.metrics[metric['id']])
              }
            })

            const median = getMedian(valuesArray)
            const firstQuartile = getFirstQuartile(valuesArray)
            const thirdQuartile = getThirdQuartile(valuesArray)
            // TODO: const { median, firstQuartile, thirdQuartile } = funcaoQueRetornaTodosNumObjecto(valuesArray);

            let metricSituation: MetricSituation
            if ((resultsResponse.selected['metrics'][metric['id']] > median ? true : false) == metric['is_upper']) {
              metricSituation = MetricSituation.Ok
              okMetricsCount++
            } else {
              if (metric['is_upper']) {
                if (resultsResponse.selected['metrics'][metric['id']] >= firstQuartile) {
                  metricSituation = MetricSituation.Reasonable
                  reasonableMetricsCount++
                } else {
                  metricSituation = MetricSituation.Bad
                  badMetricsCount++
                }
              } else {
                if (resultsResponse.selected['metrics'][metric['id']] <= thirdQuartile) {
                  metricSituation = MetricSituation.Reasonable
                  reasonableMetricsCount++
                } else {
                  metricSituation = MetricSituation.Bad
                  badMetricsCount++
                }
              }
            }

            metricInfo.push({
              id: metric['id'],
              name: metric['name'],
              description: metric['description'],
              is_upper: metric['is_upper'],
              category_id: metric['category_id'],
              values: {
                selected: selected,
                reference: refMetricsValues,
              },
              situation: metricSituation,
            })
          }
        })
        if (metricInfo.length > 0) metricsData.push({
          id: category.id,
          working_group: category['working_group'],
          description: category['description'],
          metrics: metricInfo,
        })
      })

      setMetricsData(metricsData)
      setAnalysisSummary({ okMetricsCount, reasonableMetricsCount, badMetricsCount })
      
      // Generate recommendations based on metrics analysis
      const allMetrics = metricsData.flatMap(category => category.metrics)
      const generatedRecommendations = generateRecommendations(allMetrics)
      setRecommendations(generatedRecommendations)
      
      // Show tutorial for first-time users on analysis page
      const hasSeenAnalysisTutorial = localStorage.getItem('healthyenv-analysis-tutorial-completed')
      if (!hasSeenAnalysisTutorial) {
        setTimeout(() => setShowAnalysisTutorial(true), 2000)
      }
    })

    setIsLoading(false)
  }

  const refreshAnalysis = (dataset: string, user: string, repo: string, n: number): void => {
    const nn = Number.isFinite(n) && n > 0 ? n : safeNear()
    loadRepo(dataset, `${user}/${repo}`, nn, selectedAlgorithm)
  }

  const handleAlgorithmChange = (algorithm: string): void => {
    setSelectedAlgorithm(algorithm)
  }

  const handleRefreshClustering = (): void => {
    loadRepo(router.query.datasetId, `${router.query.username}/${router.query.repo}`, safeNear(), selectedAlgorithm)
  }

  const handleFeedbackSubmit = async (feedbackData: any) => {
    try {
      // TODO: Implement feedback submission to backend
      console.log('Feedback submitted:', feedbackData)
      // Example API call:
      // await axios.post(`${Constants.baseUrl}/feedback`, feedbackData)
    } catch (error) {
      console.error('Error submitting feedback:', error)
      throw error
    }
  }

  const analysisSteps = [
    "Conectando ao banco de dados",
    "Obtendo métricas do repositório",
    "Calculando similaridade com outros projetos",
    "Gerando recomendações",
    "Preparando visualizações"
  ]

  const handleAnalysisTutorialComplete = () => {
    localStorage.setItem('healthyenv-analysis-tutorial-completed', 'true')
    setShowAnalysisTutorial(false)
  }

  const analysisTutorialSteps = [
    {
      id: 'repo-info',
      title: 'Informações do Repositório',
      description: 'Aqui você vê as informações básicas do repositório analisado: linguagem, stars, forks, etc.',
      target: 'repo-info-section',
      position: 'right' as const
    },
    {
      id: 'analysis-summary',
      title: 'Resumo da Análise',
      description: 'Este gráfico mostra a distribuição das métricas: quantas estão saudáveis (verde), razoáveis (amarelo) ou ruins (vermelho).',
      target: 'analysis-summary-section',
      position: 'left' as const
    },
    {
      id: 'similar-repos',
      title: 'Repositórios Similares',
      description: 'Mostra os repositórios mais similares encontrados no dataset usando machine learning.',
      target: 'distribution-section',
      position: 'top' as const
    },
    {
      id: 'metrics-plots',
      title: 'Gráficos das Métricas',
      description: 'Cada gráfico mostra como seu repositório se compara com outros similares. O fundo colorido indica se a métrica está boa, razoável ou ruim.',
      target: 'metrics-section',
      position: 'top' as const
    },
    {
      id: 'recommendations',
      title: 'Recomendações Personalizadas',
      description: 'Com base nas métricas problemáticas, geramos recomendações específicas para melhorar a saúde do seu projeto.',
      target: 'recommendations-section',
      position: 'top' as const
    }
  ]

  return (
    <>
      <Head>
        <title>{`HealthyEnv - Análise de ${router.query.repo}`} </title>
      </Head>
      <DashboardHeader selectedIndex={1} />
      <ProgressLoader 
        isLoading={isLoading}
        message="Analisando repositório"
        steps={analysisSteps}
        showProgress={true}
      />
      {
        !isLoading && <div className={styles.container} key={String(router.query.datasetId || '')}>
            <div className={styles['clustering-summary']}>
              <div className={styles['selected-repo-info']}>
                <div className={styles.repoInfoTitle}>
                  <span className={styles['repo-name']}>
                    {selectedRepoInfo['name']}
                  </span>
                  <div className={styles['repo-type-badge']}>
                    Added by HealthyEnv
                    <FontAwesomeIcon icon={faCheck} style={{ marginLeft: 5, height: 'match-content' }} />
                  </div>
                </div>
                <RepoInfos
                  language={selectedRepoInfo['language']}
                  loc={selectedRepoInfo['loc']}
                  stars={selectedRepoInfo['stars']}
                  forks={selectedRepoInfo['forks']}
                  openIssues={selectedRepoInfo['open_issues']}
                  contributors={selectedRepoInfo['contributors']}
                  commits={selectedRepoInfo['commits']} />
                {clusteringInfo && (
                  <>
                    <span className={styles['algorithm-hint']}>
                      Algorithm used:
                    </span>
                    <span className={styles['algorithm-title']}>
                      {clusteringInfo.algorithm === 'auto' ? 'Automático' :
                       clusteringInfo.algorithm === 'knn' ? 'K-Nearest Neighbors' :
                       clusteringInfo.algorithm === 'dbscan' ? 'DBSCAN' :
                       clusteringInfo.algorithm === 'kmeans' ? 'K-Means' :
                       'Distance-based similarity'}
                    </span>
                    <span>
                      {clusteringInfo.algorithm === 'knn' ? 'Encontra repositórios mais próximos usando distância coseno com métricas avançadas.' :
                       clusteringInfo.algorithm === 'dbscan' ? 'Clustering baseado em densidade que detecta outliers automaticamente.' :
                       clusteringInfo.algorithm === 'kmeans' ? 'Agrupa repositórios em clusters bem definidos usando centróides.' :
                       'Seleciona automaticamente o melhor algoritmo baseado no tamanho do dataset.'}
                    </span>
                  </>
                )}
                <span className={styles.nearHint}>Obtaining <b>{safeNear()}</b> similar projects.</span>
                <div style={{ display: 'flex', flexDirection: 'row' }}>
                  <div className={styles['change-algorithm-button']} onClick={() => setOpen(true)}>
                    <FontAwesomeIcon icon={faArrowRightArrowLeft} />
                    <span className={styles['button-label']}>
                      Change repository
                    </span>
                  </div>
                  <div className={styles['change-algorithm-button']} onClick={() => setOpenN(true)}>
                    <FontAwesomeIcon icon={faArrowsRotate} />
                    <span className={styles['button-label']}>
                      Change similar amount
                    </span>
                  </div>
                </div>
              </div>
              {/* <NearReposPlot selectedRepoInfo={selectedRepoInfo} referenceReposInfo={referenceReposInfo} /> */}
            </div>

            {/* Clustering Controls */}
            <ClusteringControls 
              currentAlgorithm={selectedAlgorithm}
              onAlgorithmChange={handleAlgorithmChange}
              onRefresh={handleRefreshClustering}
              isLoading={isLoading}
            />

            {/* Clustering Quality Metrics */}
            {clusteringInfo && (
              <ClusteringQualityMetrics clusteringInfo={clusteringInfo} />
            )}

            <div className={styles.section} id="distribution-section">
              <div className={styles.sectionHeader}>
                <span className={styles['section-title']}>Distribution</span>
              </div>
              <NearReposPlot selectedRepoInfo={selectedRepoInfo} referenceReposInfo={referenceReposInfo} />
            </div>

            <div className={styles.section} id="metrics-section">
              <div className={styles.sectionHeader}>
                <span className={styles['section-title']}>Metrics applied</span>
                <MetricsHint />
              </div>
              {
                metricsData.map((metricCategory: any) => {
                  return <PlotGrid
                    key={metricCategory['id']}
                    data={metricCategory}

                  />
                })
              }
            </div>
            
            <div className={styles.section} id="recommendations-section">
              <div className={styles.sectionHeader}>
                <span className={styles['section-title']}>Recomendações de Melhoria</span>
              </div>
              <RecommendationsSection recommendations={recommendations} />
            </div>
            {/* TODO: refazer esta seção, não ficou legal de nenhuma forma
            
            <div className={styles.section}>
              <div className={styles['section-title']}>
                <span>Analysis summary</span>
              </div>
              <AnalysisSummarySection metricsCount={analysisSummary} />
            </div> */}

            <div className={styles.section}>
              <div className={styles['section-title']}>
                <span>Request details</span>
              </div>
              <div className={styles['request-details']}>
                <span className={styles['request-method']}>GET</span>
                <span className={styles['request-url']}>{requestPayloads[0].url}</span>
              </div>
              <div className={styles['response-body-container']}>
                <span className={styles['body-title']}>Response payload</span>
                <textarea rows={20} value={requestPayloads[0].payload} spellCheck={false} readOnly={true} />
              </div>
            </div>
          </div>
      }
      <Popup open={open} onClose={closeModalRepo} >
        <ChangeRepoModal closeModal={closeModalRepo} refreshAnalysis={refreshAnalysis} datasetId={router.query.datasetId} n={safeNear()} />
      </Popup>
      <Popup open={openN} onClose={closeModalN} >
        <ChangeNModal closeModal={closeModalN} refreshAnalysis={refreshAnalysis} currNValue={safeNear()} datasetCount={referenceReposInfo.length} datasetId={router.query.datasetId} userName={router.query.username} repoName={router.query.repo} />
      </Popup>
      
      <FeedbackWidget onSubmit={handleFeedbackSubmit} />
      
      <TutorialTooltip 
        steps={analysisTutorialSteps}
        isActive={showAnalysisTutorial}
        onComplete={handleAnalysisTutorialComplete}
      />
    </>
  )
}

export default Repo