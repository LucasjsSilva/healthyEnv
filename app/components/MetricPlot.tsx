import dynamic from 'next/dynamic'
import styles from '../styles/MetricPlot.module.css'
import PlotLoadingIndicator from './PlotLoadingIndicator'
import { bootstrapCI, getMedian, mean } from '../functions/stats'
import { useEffect, useMemo, useState, memo } from 'react'
import Constants from '../utils/constants'

const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => <PlotLoadingIndicator width={0} height={500} />
})

enum MetricSituation {
  Ok = 'OK',
  Reasonable = 'REASONABLE',
  Bad = 'BAD',
}

interface MetricPlotProps {
  yAll: number[]
  ySelected: number
  labels: string[]
  name: string
  title: string
  width: number
  situation: MetricSituation
  ci?: { low: number; high: number }
  category?: string
}

const MetricPlot = (props: MetricPlotProps) => {
  const getColor = (situation: MetricSituation): string => {
    switch (situation) {
      case MetricSituation.Ok:
        return '#c4ffcc'
      case MetricSituation.Reasonable:
        return '#fceec2'
      case MetricSituation.Bad:
        return '#fad6d6'
    }
  }

  // Controls
  const [showCI, setShowCI] = useState(true)
  const [showMean, setShowMean] = useState(true)
  // Persist toggles in localStorage
  useEffect(() => {
    try {
      const v1 = localStorage.getItem('metricPlot_showCI')
      if (v1 === '0') setShowCI(false)
      if (v1 === '1') setShowCI(true)
      const v2 = localStorage.getItem('metricPlot_showMean')
      if (v2 === '0') setShowMean(false)
      if (v2 === '1') setShowMean(true)
    } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem('metricPlot_showCI', showCI ? '1' : '0') } catch {}
  }, [showCI])
  useEffect(() => {
    try { localStorage.setItem('metricPlot_showMean', showMean ? '1' : '0') } catch {}
  }, [showMean])

  // Compute a 95% bootstrap CI for the median as scientific reference range (local fallback)
  const ciLocal = useMemo(() => bootstrapCI(props.yAll, { estimator: getMedian, iterations: 600, alpha: 0.05 }), [props.yAll])

  // Try backend CI first; fall back to local if it fails
  const [ciBackend, setCiBackend] = useState<{ low: number; high: number } | null>(null)
  const [ciLoading, setCiLoading] = useState(false)
  const [ciError, setCiError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!showCI) return
      if (props.ci) { // if parent provided CI, use it and skip fetch
        setCiBackend(props.ci)
        setCiError(null)
        setCiLoading(false)
        return
      }
      try {
        setCiLoading(true)
        setCiError(null)
        setCiBackend(null)
        const res = await fetch(`${Constants.baseUrl}/stats/bootstrap_ci`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: props.yAll, estimator: 'median', iterations: 1000, alpha: 0.05 })
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!cancelled && Number.isFinite(data.low) && Number.isFinite(data.high)) {
          setCiBackend({ low: Number(data.low), high: Number(data.high) })
        }
      } catch (e: any) {
        if (!cancelled) setCiError(e?.message || 'erro ao obter IC')
      } finally {
        if (!cancelled) setCiLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [props.yAll, showCI, props.ci])

  // Determine axis type: use linear if any non-positive values present
  const hasNonPositive = useMemo(() => props.yAll.some(v => !Number.isFinite(v) || v <= 0), [props.yAll])
  const useLogScale = !hasNonPositive

  const ci = props.ci ?? ciBackend ?? ciLocal
  const ciText = useMemo(() => (isFinite(ci.low) && isFinite(ci.high) ? `95% CI (median): [${ci.low.toFixed(3)}, ${ci.high.toFixed(3)}]` : ''), [ci])
  const ciRenderable = useMemo(() => {
    if (!isFinite(ci.low) || !isFinite(ci.high) || ci.low >= ci.high) return false
    return useLogScale ? (ci.low > 0 && ci.high > 0) : true
  }, [ci, useLogScale])

  // Mean marker for the distribution
  const mAll = useMemo(() => mean(props.yAll), [props.yAll])

  // Dense data handling
  const n = props.yAll.length
  const isDenseHigh = n > 600
  const isDenseMed = n > 200 && n <= 600
  const jitter = isDenseHigh ? 0 : (isDenseMed ? 0.15 : 0.3)
  const boxpointsMode: 'all' | 'outliers' | false = isDenseHigh ? 'outliers' : 'all'

  // Category-based marker colors with accessible contrast
  const rawCategory = (props.category || 'default').toLowerCase()
  const categorySlug = useMemo(() => {
    const s = rawCategory
    if (s.includes('quality')) return 'quality'
    if (s.includes('activity')) return 'activity'
    if (s.includes('community')) return 'community'
    if (s.includes('efficiency')) return 'efficiency'
    if (s.includes('process')) return 'process'
    return 'default'
  }, [rawCategory])
  const categoryColors: Record<string, { repo: string; mean: string }> = {
    // Deep hues for contrast on light backgrounds (OK/Reasonable/Bad)
    default:   { repo: '#d45500', mean: '#114d9c' }, // deep orange & deep blue
    quality:   { repo: '#b22222', mean: '#104e8b' }, // firebrick & steel-ish blue
    activity:  { repo: '#6a1b9a', mean: '#2e7d32' }, // deep purple & green
    community: { repo: '#ad1457', mean: '#006064' }, // deep pink & teal
    efficiency:{ repo: '#4e342e', mean: '#2e7d32' }, // brown & green
    process:   { repo: '#6d4c41', mean: '#114d9c' }, // brown & blue
  }
  const palette = categoryColors[categorySlug] || categoryColors['default']

  const plotHeight = 500
  const containerHeight = plotHeight + 96 // extra room for multi-line title/subtitle

  // Memoized Plotly data and layout to avoid unnecessary re-renders
  const plotData = useMemo(() => {
    return [
      {
        y: props.yAll,
        text: props.labels,
        type: 'box',
        name: '',
        showlegend: false,
        pointpos: -1.8,
        boxpoints: boxpointsMode,
        jitter,
        boxmean: true,
        quartilemethod: 'inclusive',
      },
      {
        y: [props.ySelected],
        x: ['Métrica'],
        text: [props.name],
        name: 'Repositório',
        marker: {
          size: 9,
          color: palette.repo,
          line: { color: '#111', width: 1.2 }
        },
        pointpos: -1.0,
        type: 'scatter' as const,
        mode: 'markers' as const,
        hovertemplate: '%{text}: %{y:.3f}<extra></extra>'
      },
      ...(showMean && Number.isFinite(mAll)
        ? [{
            x: ['Métrica'],
            y: [mAll],
            name: 'média (todas)',
            type: 'scatter' as const,
            mode: 'markers' as const,
            marker: { color: palette.mean, size: 10, symbol: 'x' as const, line: { color: '#111', width: 1 } },
            hovertemplate: 'Média: %{y:.3f}<extra></extra>'
          }]
        : []),
      ...(showCI && ciRenderable
        ? [
            {
              x: ['Métrica', 'Métrica'],
              y: [ci.low, ci.high],
              type: 'scatter',
              mode: 'lines',
              name: 'IC 95% (mediana)',
              line: { color: '#333', width: 7 },
              hoverinfo: 'skip' as const,
            } as any,
          ]
        : [])
    ]
  }, [props.yAll, props.labels, props.ySelected, props.name, showMean, mAll, showCI, ciRenderable, ci.low, ci.high, boxpointsMode, jitter, palette.repo, palette.mean])

  const plotLayout = useMemo(() => ({
    width: Math.max(200, props.width - 16),
    height: plotHeight,
    title: {
      text: showCI && ciText
        ? `${props.title} — ${props.name}<br><span style=\"font-size:12px;color:#555\">${ciText}</span>`
        : `${props.title} — ${props.name}`,
      x: 0,
      xanchor: 'left',
      font: { size: 14 },
    },
    font: {
      family: 'Lato, sans-serif',
      color: '#111111'
    },
    plot_bgcolor: getColor(props.situation),
    paper_bgcolor: getColor(props.situation),
    margin: { l: 70, r: 12, t: 68, b: 88 },
    legend: { orientation: 'h', y: -0.22, x: 0.5, xanchor: 'center', font: { size: 11, color: '#333' }, traceorder: 'normal' },
    yaxis: {
      type: useLogScale ? 'log' : 'linear',
      autorange: true,
      showgrid: false,
      zeroline: true,
      title: { text: useLogScale ? 'Valor (escala log)' : 'Valor', font: { size: 11, color: '#444' } },
    },
    annotations: []
  }), [props.width, props.title, props.name, props.situation, showCI, ciText, useLogScale])

  return (
    <div className={styles.box} style={{ width: `${(props.width)}px`, height: `${containerHeight}px`, backgroundColor: getColor(props.situation) }} >
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '6px 8px' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={showCI} onChange={(e) => setShowCI(e.target.checked)} />
          Mostrar IC (mediana)
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={showMean} onChange={(e) => setShowMean(e.target.checked)} />
          Mostrar média (todas)
        </label>
        {showCI && ciLoading && <span style={{ fontSize: 12, color: '#666' }}>(calculando no servidor...)</span>}
        {showCI && ciError && <span style={{ fontSize: 12, color: '#a33' }}>(falha no backend, usando cálculo local)</span>}
      </div>
      <Plot data={plotData as any} layout={plotLayout as any} />
    </div >
  )
}

// Custom comparator to avoid unnecessary re-renders
function arraySig(a?: any[]): string {
  if (!a || a.length === 0) return '0:0:0:0'
  const n = a.length
  const a0 = Number(a[0]) || 0
  const al = Number(a[n - 1]) || 0
  let sum = 0
  for (let i = 0; i < Math.min(64, n); i++) {
    const v = Number(a[i])
    if (Number.isFinite(v)) sum += v
  }
  return `${n}:${a0}:${al}:${sum.toFixed(4)}`
}

const areEqual = (prev: any, next: any) => {
  if (prev.width !== next.width) return false
  if (prev.title !== next.title) return false
  if (prev.name !== next.name) return false
  if (prev.situation !== next.situation) return false
  if (prev.category !== next.category) return false
  if (prev.ySelected !== next.ySelected) return false
  // Compare yAll and labels by signature
  if (arraySig(prev.yAll) !== arraySig(next.yAll)) return false
  if (arraySig(prev.labels) !== arraySig(next.labels)) return false
  // Compare CI if provided
  const pc = prev.ci, nc = next.ci
  if (!!pc !== !!nc) return false
  if (pc && nc && (pc.low !== nc.low || pc.high !== nc.high)) return false
  return true
}

export default memo(MetricPlot, areEqual)