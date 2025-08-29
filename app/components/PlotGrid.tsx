import MetricPlot from "./MetricPlot"
import useWindowDimensions from "../utils/useWindowDimensions"
import styles from '../styles/PlotGrid.module.css'
import { FC, useEffect, useMemo, useRef, useState } from "react"
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
  const style = useMemo(() => ({ '--width': `${plotWidth}px` } as React.CSSProperties), [plotWidth])

  // Pre-compute CI for all metrics (median) via backend in parallel
  const [ciMap, setCiMap] = useState<Record<string, { low: number; high: number }>>({})
  const [loadingCI, setLoadingCI] = useState(false)
  const debounceTimer = useRef<any>(null)

  const refs = useMemo(() => data.metrics.map((m: any) => ({
    id: String(m['id']),
    values: m['values']['reference'].map((v: any) => Number(v['value']))
  })), [data.metrics])

  // Stable signature per metric to avoid redundant fetches
  const refSigs = useMemo(() => refs.map(r => {
    const n = r.values.length
    const a = n ? r.values[0] : 0
    const b = n ? r.values[n - 1] : 0
    // simple checksum
    const sum = r.values.slice(0, 50).reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0)
    return { id: r.id, sig: `${n}:${a}:${b}:${sum.toFixed(4)}` }
  }), [refs])

  useEffect(() => {
    let cancelled = false
    // Debounce to avoid bursts during resize/navegação
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(async () => {
      try {
        setLoadingCI(true)
        const results = await Promise.all(refs.map(async (r) => {
          // Skip if we already have CI and signature unchanged
          const sig = refSigs.find(s => s.id === r.id)?.sig
          const cacheKey = `ci_sig_${r.id}`
          try {
            const prevSig = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null
            if (prevSig && prevSig === sig && ciMap[r.id]) {
              return { id: r.id, ci: ciMap[r.id] }
            }
          } catch {}
          try {
            const res = await fetch(`${Constants.baseUrl}/stats/bootstrap_ci`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ values: r.values, estimator: 'median', iterations: 1000, alpha: 0.05 })
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            if (Number.isFinite(data.low) && Number.isFinite(data.high)) {
              // persist signature to avoid next fetch
              try { if (sig) localStorage.setItem(cacheKey, sig) } catch {}
              return { id: r.id, ci: { low: Number(data.low), high: Number(data.high) } }
            }
          } catch (_) {
            // ignore individual errors; MetricPlot will fallback locally
          }
          return { id: r.id, ci: undefined as any }
        }))
        if (cancelled) return
        const map: Record<string, { low: number; high: number }> = { ...ciMap }
        results.forEach((r) => { if (r.ci) map[r.id] = r.ci })
        setCiMap(map)
      } finally {
        if (!cancelled) setLoadingCI(false)
      }
    }, 200) // 200ms debounce
    return () => { cancelled = true; if (debounceTimer.current) clearTimeout(debounceTimer.current) }
  }, [refs, refSigs])

  // Prepare stable metric props derived only from data.metrics (not affected by CI/width)
  const prepared = useMemo(() => {
    return data.metrics.map((metric: any) => {
      const refVals = metric['values']['reference']
      return {
        id: String(metric['id']),
        yAll: refVals.map((v: any) => Number(v['value'])),
        labels: refVals.map((v: any) => String(v['name'])),
        ySelected: Number(metric['values']['selected']['value']),
        name: String(metric['values']['selected']['name']),
        title: String(metric['name']),
        situation: metric['situation'] as any,
      }
    })
  }, [data.metrics])

  const plots = useMemo(() => {
    return prepared.map((p) => (
      <MetricPlot
        key={p.id}
        yAll={p.yAll}
        ySelected={p.ySelected}
        labels={p.labels}
        name={p.name}
        title={p.title}
        width={plotWidth}
        situation={p.situation}
        ci={ciMap[p.id]}
        category={data['working_group']}
      />
    ))
  }, [prepared, ciMap, plotWidth, data['working_group']])

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
        {plots}
      </div>

    </div>
  )
}

export default PlotGrid