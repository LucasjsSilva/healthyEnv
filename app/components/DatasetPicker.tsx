import { useEffect, useState } from 'react'
import axios from 'axios'
import Constants from '../utils/constants'

interface Dataset {
  id: string
  name: string
  description: string
  repo_count: number
  author: string
}

export default function DatasetPicker({ open, onClose, onPicked }: { open: boolean, onClose: () => void, onPicked: (datasetId: string) => void }) {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!open) return
    const fetchDatasets = async () => {
      setLoading(true)
      setError(null)
      try {
        const resp = await axios.get(`${Constants.baseUrl}/datasets`)
        const items = resp.data?.items || []
        setDatasets(items)
      } catch (e: any) {
        setError('Falha ao carregar datasets')
      } finally {
        setLoading(false)
      }
    }
    fetchDatasets()
  }, [open])

  const createDataset = async () => {
    if (!name.trim()) return
    setCreating(true)
    setError(null)
    try {
      const resp = await axios.post(`${Constants.baseUrl}/datasets`, { name, description }, { withCredentials: true })
      const ds = resp.data as Dataset
      setDatasets((prev) => [...prev, ds])
      setName('')
      setDescription('')
    } catch (e: any) {
      setError('Falha ao criar dataset')
    } finally {
      setCreating(false)
    }
  }

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: 'white', borderRadius: 8, width: 'min(680px, 92vw)', padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="text-lg font-semibold">Select a dataset</h2>
          <button onClick={onClose} className="px-2 py-1">✕</button>
        </div>

        {loading && <div>Loading...</div>}
        {error && <div className="text-red-600 text-sm">{error}</div>}

        {!loading && (
          <div style={{ display: 'grid', gap: 8, maxHeight: 280, overflow: 'auto', marginTop: 8 }}>
            {datasets.map((d) => (
              <div key={d.id} className="border rounded p-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">{d.name}</div>
                  <div className="text-xs opacity-80">{d.description}</div>
                </div>
                <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={() => onPicked(d.id)}>Use</button>
              </div>
            ))}
            {datasets.length === 0 && (
              <div className="text-sm opacity-80">No datasets yet.</div>
            )}
          </div>
        )}

        <div className="mt-4 border-t pt-3">
          <div className="text-sm font-medium mb-2">Create new dataset</div>
          <div style={{ display: 'grid', gap: 6 }}>
            <input
              className="border rounded px-2 py-1"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="border rounded px-2 py-1"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <button
              className="bg-emerald-600 text-white px-3 py-1 rounded disabled:opacity-50"
              disabled={creating}
              onClick={createDataset}
            >
              {creating ? 'Creating...' : 'Create dataset'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
