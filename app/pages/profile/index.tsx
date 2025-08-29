import { useEffect, useState } from 'react'
import Head from 'next/head'
import Router from 'next/router'
import axios from 'axios'
import Constants from '../../utils/constants'
import DashboardHeader from '../../components/DashboardHeader'
import DatasetPicker from '../../components/DatasetPicker'

interface Repo {
  id: number
  full_name: string
  html_url: string
  description?: string
  private: boolean
  fork: boolean
}

export default function ProfilePage() {
  const [repos, setRepos] = useState<Repo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [datasetModalRepo, setDatasetModalRepo] = useState<Repo | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resultMsg, setResultMsg] = useState<string | null>(null)

  useEffect(() => {
    // Require auth: if no sessionStorage userData, redirect to login
    try {
      const data = sessionStorage.getItem('userData')
      if (!data) {
        Router.push('/auth?next=/profile')
        return
      }
    } catch {
      Router.push('/auth?next=/profile')
      return
    }

    const fetchRepos = async () => {
      try {
        const resp = await axios.get(`${Constants.baseUrl}/me/repos`, { withCredentials: true })
        setRepos(resp.data || [])
      } catch (e: any) {
        setError('Falha ao carregar repositórios. Faça login novamente.')
      } finally {
        setLoading(false)
      }
    }

    fetchRepos()
  }, [])

  const handleAnalyze = (repo: Repo) => {
    setDatasetModalRepo(repo)
  }

  const onDatasetPicked = async (datasetId: string) => {
    if (!datasetModalRepo) return
    setSubmitting(true)
    setResultMsg(null)
    try {
      const resp = await axios.post(
        `${Constants.baseUrl}/datasets/${datasetId}/request_and_process`,
        { repo_url: datasetModalRepo.html_url },
        { withCredentials: true }
      )
      setResultMsg(`Submitted and processed: status ${resp.data?.status || 'DONE'}`)
    } catch (e: any) {
      setResultMsg('Erro ao submeter/processar o repositório.')
    } finally {
      setSubmitting(false)
      setDatasetModalRepo(null)
    }
  }

  const onViewMetrics = (repo: Repo) => {
    // Navega para análise/cluster se existir; como fallback, vai para datasets para localizar
    Router.push('/dashboard/datasets')
  }

  return (
    <>
      <Head>
        <title>My Profile - HealthyEnv</title>
      </Head>
      <DashboardHeader selectedIndex={1} />
      <div style={{ maxWidth: 1024, margin: '0 auto', padding: 16 }}>
        <h1 className="text-2xl font-semibold mb-4">My repositories</h1>
        {loading && <div>Loading...</div>}
        {error && <div className="text-red-600">{error}</div>}
        {!loading && !error && (
          <div style={{ display: 'grid', gap: 12 }}>
            {repos.map((r) => (
              <div key={r.id} className="border rounded-md p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.full_name}</div>
                  <div className="text-sm opacity-80">{r.description || ''}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="bg-emerald-600 text-white px-3 py-1 rounded"
                    onClick={() => handleAnalyze(r)}
                  >
                    Analyze
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {resultMsg && (
          <div className="mt-4 text-sm">{resultMsg}</div>
        )}
      </div>

      <DatasetPicker
        open={!!datasetModalRepo}
        onClose={() => setDatasetModalRepo(null)}
        onPicked={onDatasetPicked}
      />
    </>
  )
}
