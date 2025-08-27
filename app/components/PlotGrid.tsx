import MetricPlot from "./MetricPlot"
import useWindowDimensions from "../utils/useWindowDimensions"
import styles from '../styles/PlotGrid.module.css'
import { FC, useEffect, useMemo, useState } from "react"
import Constants from '../utils/constants'

interface PlotGridProps {
  metrics: any
  workingGroup
}

const PlotGrid: FC<{ data: PlotGridProps }> = ({ data }) => {
  const { width } = useWindowDimensions()

  let safeWidth = width > 1280 ? 1280 - 72 : width - 72;
  const maxPlotsPerRow = safeWidth >= 400 ? Math.floor(safeWidth / 400) : 1;
  let plotWidth = (safeWidth - ((maxPlotsPerRow - 1) * 10)) / maxPlotsPerRow;
  var style = { '--width': `${plotWidth}px` } as React.CSSProperties

  // Pre-compute CI for all metrics (median) via backend in parallel
  const [ciMap, setCiMap] = useState<Record<string, { low: number; high: number }>>({})
  const [loadingCI, setLoadingCI] = useState(false)

  const refs = useMemo(() => data.metrics.map((m: any) => ({
    id: String(m['id']),
    values: m['values']['reference'].map((v: any) => Number(v['value']))
  })), [data.metrics])

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        setLoadingCI(true)
        const results = await Promise.all(refs.map(async (r) => {
          try {
            const res = await fetch(`${Constants.baseUrl}/stats/bootstrap_ci`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ values: r.values, estimator: 'median', iterations: 1000, alpha: 0.05 })
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            if (Number.isFinite(data.low) && Number.isFinite(data.high)) {
              return { id: r.id, ci: { low: Number(data.low), high: Number(data.high) } }
            }
          } catch (_) {
            // ignore individual errors; MetricPlot will fallback locally
          }
          return { id: r.id, ci: undefined as any }
        }))
        if (cancelled) return
        const map: Record<string, { low: number; high: number }> = {}
        results.forEach((r) => { if (r.ci) map[r.id] = r.ci })
        setCiMap(map)
      } finally {
        if (!cancelled) setLoadingCI(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [refs])

  const generatePlots = () => {
    const plots = []
    data.metrics.forEach((metric: any) => {
      const id = String(metric['id'])
      const ci = ciMap[id]
      plots.push(
        <MetricPlot
          key={id}
          yAll={metric['values']['reference'].map((value: any) => value['value'])}
          ySelected={metric['values']['selected']['value']}
          labels={metric['values']['reference'].map((value: any) => value['name'])}
          name={metric['values']['selected']['name']}
          title={metric['name']}
          width={plotWidth}
          situation={metric['situation']}
          ci={ci}
        />
      )
    });

    return plots
  }

  return (
    <div>{
      <div className={styles.metricCategory}>
        <span className={styles.workingGroup}>
          {data['working_group']}
        </span>
        <span className={styles.description}>
          {data['description']}
        </span>
      </div>
    }
      <div className={styles.grid} style={style}>
        {generatePlots()}
      </div>

    </div>
  )
}

export default PlotGrid