import dynamic from 'next/dynamic'
import styles from '../styles/MetricPlot.module.css'
import PlotLoadingIndicator from './PlotLoadingIndicator'
import { bootstrapCI, getMedian, mean } from '../functions/stats'
import { useEffect, useMemo, useState } from 'react'
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

  const ci = props.ci ?? ciBackend ?? ciLocal
  const ciText = useMemo(() => (isFinite(ci.low) && isFinite(ci.high) ? `95% CI (median): [${ci.low.toFixed(3)}, ${ci.high.toFixed(3)}]` : ''), [ci])
  const ciRenderable = useMemo(() => isFinite(ci.low) && isFinite(ci.high) && ci.low < ci.high && ci.low > 0 && ci.high > 0, [ci])

  // Mean marker for the distribution
  const mAll = useMemo(() => mean(props.yAll), [props.yAll])

  const plotHeight = 500
  const containerHeight = plotHeight + 80 // header + padding extra

  return (
    <div className={styles.box} style={{ width: `${(props.width)}px`, height: `${containerHeight}px`, backgroundColor: getColor(props.situation) }} >
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '6px 8px' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={showCI} onChange={(e) => setShowCI(e.target.checked)} />
          Mostrar IC (mediana)
        </label>
        {showCI && ciLoading && <span style={{ fontSize: 12, color: '#666' }}>(calculando no servidor...)</span>}
        {showCI && ciError && <span style={{ fontSize: 12, color: '#a33' }}>(falha no backend, usando cálculo local)</span>}
      </div>
      <Plot
        data={[
          {
            y: props.yAll,
            text: props.labels,
            type: 'box',
            name: 'Métrica',
            pointpos: -1.8,
            boxpoints: 'all',
            jitter: 0.3,
            boxmean: true,
            quartilemethod: 'inclusive',
            
          },
          {
            y: [props.ySelected],
            x: ['Métrica'],
            text: [props.name],
            name: 'Repositório',
            marker: {
              size: 8
            },
            pointpos: -1.0,
          },
          // Mean marker of overall distribution
          ...(Number.isFinite(mAll)
            ? [{
                x: ['Métrica'],
                y: [mAll],
                name: 'média (todas)',
                type: 'scatter' as const,
                mode: 'markers' as const,
                marker: { color: '#2559a7', size: 10, symbol: 'x' as const },
                hovertemplate: 'Média: %{y:.3f}<extra></extra>'
              }]
            : []),
          // Optional visual overlay for CI as a vertical line at the category position
          ...(showCI && ciRenderable
            ? [
                {
                  x: ['Métrica', 'Métrica'],
                  y: [ci.low, ci.high],
                  type: 'scatter',
                  mode: 'lines',
                  name: '95% CI (median)',
                  line: { color: '#666', width: 6 },
                  hoverinfo: 'skip' as const,
                } as any,
              ]
            : [])
        ]}
        layout={{
          width: (props.width - 10),
          height: plotHeight,
          title: {
            text: showCI && ciText
              ? `${props.title}<br><span style="font-size:12px;color:#555">${ciText}</span>`
              : props.title,
          },
          font: {
            family: 'Lato, sans-serif',
            color: '#111111'
          },
          plot_bgcolor: getColor(props.situation),
          paper_bgcolor: getColor(props.situation),
          margin: { l: 60, r: 10, t: 48, b: 80 },
          legend: { orientation: 'h', y: -0.2, x: 0.5, xanchor: 'center' },
          yaxis: {
            type: "log",
            autorange: true,
            showgrid: false,
            zeroline: true,
          },
          annotations: []
        }}
      />
    </div >
  )
}

export default MetricPlot