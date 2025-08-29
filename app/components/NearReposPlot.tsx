import dynamic from 'next/dynamic';
import PlotLoadingIndicator from './PlotLoadingIndicator';
import useWindowDimensions from "../utils/useWindowDimensions"
import { useEffect, useMemo, useState } from 'react'

const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => <PlotLoadingIndicator width={600} height={300} />,
})

interface NearReposPlotProps {
  selectedRepoInfo: object
  referenceReposInfo: object[]
}

const NearReposPlot = (props: NearReposPlotProps) => {
  const { width } = useWindowDimensions()

  let safeWidth = width - 17 > 1280 ? 1280 - 72 : width - 17 - 72;

  // Build datasets
  const far = props.referenceReposInfo.filter((repo: any) => !repo['near'])
  const near = props.referenceReposInfo.filter((repo: any) => repo['near'])

  // Compute confidence ellipses for 'near' points in 2D (PCA space)
  // 95% ~ sqrt(5.991) and 68% ~ sqrt(2.279) for chi-square with df=2
  const CHI2_95 = Math.sqrt(5.991)
  const CHI2_68 = Math.sqrt(2.279)

  function computeEllipse(points: { x: number, y: number }[], scale: number): { x: number[]; y: number[] } | null {
    const n = points.length
    if (n < 3) return null
    const xs = points.map(p => p.x).filter(v => Number.isFinite(v))
    const ys = points.map(p => p.y).filter(v => Number.isFinite(v))
    if (xs.length < 3 || ys.length < 3) return null
    const mx = xs.reduce((s, v) => s + v, 0) / xs.length
    const my = ys.reduce((s, v) => s + v, 0) / ys.length
    const ax = xs.map(v => v - mx)
    const ay = ys.map(v => v - my)
    const a = ax.reduce((s, v) => s + v * v, 0) / (xs.length - 1) // var x
    const c = ay.reduce((s, v) => s + v * v, 0) / (ys.length - 1) // var y
    const b = ax.reduce((s, v, i) => s + v * ay[i], 0) / (xs.length - 1) // cov xy
    // Eigen decomposition for 2x2 [[a,b],[b,c]]
    const trace = a + c
    const det = a * c - b * b
    const disc = Math.max(0, trace * trace - 4 * det)
    const sqrtDisc = Math.sqrt(disc)
    const lambda1 = 0.5 * (trace + sqrtDisc)
    const lambda2 = 0.5 * (trace - sqrtDisc)
    // Eigenvectors
    const vec1 = b !== 0 ? [lambda1 - c, b] : [1, 0]
    const vec2 = b !== 0 ? [lambda2 - c, b] : [0, 1]
    const n1 = Math.hypot(vec1[0], vec1[1]) || 1
    const n2 = Math.hypot(vec2[0], vec2[1]) || 1
    const u1 = [vec1[0] / n1, vec1[1] / n1]
    const u2 = [vec2[0] / n2, vec2[1] / n2]
    const r1 = scale * Math.sqrt(Math.max(lambda1, 0))
    const r2 = scale * Math.sqrt(Math.max(lambda2, 0))
    const steps = 64
    const xOut: number[] = []
    const yOut: number[] = []
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * 2 * Math.PI
      const px = r1 * Math.cos(t) * u1[0] + r2 * Math.sin(t) * u2[0]
      const py = r1 * Math.cos(t) * u1[1] + r2 * Math.sin(t) * u2[1]
      xOut.push(mx + px)
      yOut.push(my + py)
    }
    return { x: xOut, y: yOut }
  }

  const nearPoints = near
    .map((r: any) => ({ x: r['x'] as number, y: r['y'] as number }))
    .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y))
  const [showCI, setShowCI] = useState(true)
  // Persist toggle in localStorage
  useEffect(() => {
    try {
      const v = localStorage.getItem('nearRepos_showCI')
      if (v === '0') setShowCI(false)
      if (v === '1') setShowCI(true)
    } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem('nearRepos_showCI', showCI ? '1' : '0') } catch {}
  }, [showCI])
  const ellipse95 = useMemo(() => (showCI ? computeEllipse(nearPoints, CHI2_95) : null), [showCI, nearPoints])
  const ellipse68 = useMemo(() => (showCI ? computeEllipse(nearPoints, CHI2_68) : null), [showCI, nearPoints])

  // Mean marker of near points
  const meanPoint = useMemo(() => {
    if (nearPoints.length === 0) return null
    const mx = nearPoints.reduce((s, p) => s + p.x, 0) / nearPoints.length
    const my = nearPoints.reduce((s, p) => s + p.y, 0) / nearPoints.length
    if (!Number.isFinite(mx) || !Number.isFinite(my)) return null
    return { x: mx, y: my }
  }, [nearPoints])

  // Simple distance helper (Euclidean in PCA space)
  const dist = (x: number, y: number) => {
    if (!Number.isFinite(sx) || !Number.isFinite(sy) || !Number.isFinite(x) || !Number.isFinite(y)) return NaN
    const dx = x - sx
    const dy = y - sy
    return Math.hypot(dx, dy)
  }

  // Compute a focused view window around the selected repo + near points
  const sx = Number(props.selectedRepoInfo['x'])
  const sy = Number(props.selectedRepoInfo['y'])
  const rx = nearPoints.map(p => p.x)
  const ry = nearPoints.map(p => p.y)
  const allX = [...rx, sx].filter(v => Number.isFinite(v))
  const allY = [...ry, sy].filter(v => Number.isFinite(v))
  let xRange: [number, number] | undefined
  let yRange: [number, number] | undefined
  if (allX.length >= 1 && allY.length >= 1) {
    const minX = Math.min(...allX)
    const maxX = Math.max(...allX)
    const minY = Math.min(...allY)
    const maxY = Math.max(...allY)
    // More generous padding for clarity
    const padX = Math.max(1e-6, (maxX - minX) * 0.35 || 1.0)
    const padY = Math.max(1e-6, (maxY - minY) * 0.35 || 1.0)
    xRange = [minX - padX, maxX + padX]
    yRange = [minY - padY, maxY + padY]
  } else if (Number.isFinite(sx) && Number.isFinite(sy)) {
    // Fallback: center strictly on selected repo when there are no near points
    const pad = 1.0
    xRange = [sx - pad, sx + pad]
    yRange = [sy - pad, sy + pad]
  }

  const plotConfig = {
    displaylogo: false,
    responsive: true,
    scrollZoom: true,
    toImageButtonOptions: { format: 'png' as 'png', filename: 'near-repos' },
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 6 }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={showCI} onChange={(e) => setShowCI(e.target.checked)} />
          Mostrar IC (68% e 95%)
        </label>
      </div>
      {/* Loading/empty hint for near repos */}
      {props.referenceReposInfo && props.referenceReposInfo.length > 0 && near.length === 0 && (
        <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>carregando repositórios próximos…</div>
      )}
      {props.referenceReposInfo && props.referenceReposInfo.length === 0 && (
        <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>nenhum dado para exibir</div>
      )}
      <Plot
      data={[
        // Confidence bands (filled polygons) first so points overlay them
        ...(ellipse95 ? [{
          x: ellipse95.x,
          y: ellipse95.y,
          name: '95% CI (near)',
          type: 'scatter' as const,
          mode: 'lines' as const,
          fill: 'toself' as const,
          line: { color: 'rgba(37,144,218,0.35)', width: 1 },
          fillcolor: 'rgba(37,144,218,0.10)',
          hoverinfo: 'skip' as const,
        }] : []),
        ...(ellipse68 ? [{
          x: ellipse68.x,
          y: ellipse68.y,
          name: '68% CI (near)',
          type: 'scatter' as const,
          mode: 'lines' as const,
          fill: 'toself' as const,
          line: { color: 'rgba(37,144,218,0.55)', width: 1 },
          fillcolor: 'rgba(37,144,218,0.18)',
          hoverinfo: 'skip' as const,
        }] : []),
        {
          x: far.map((repo: any) => repo['x']),
          y: far.map((repo: any) => repo['y']),
          text: far.map((repo: any) => repo['name']),
          name: 'distantes',
          type: 'scatter',
          mode: 'markers',
          marker: { color: '#E66E6E', size: 6, opacity: 0.35 },
          hovertemplate: '%{text}<br>distância: %{customdata:.3f}<extra></extra>',
          customdata: far.map((repo: any) => dist(Number(repo['x']), Number(repo['y']))),
        },
        {
          x: near.map((repo: any) => repo['x']),
          y: near.map((repo: any) => repo['y']),
          text: near.map((repo: any) => repo['name']),
          name: 'próximos',
          type: 'scatter',
          mode: 'markers',
          marker: { color: '#2ca02c', size: 9 },
          hovertemplate: '%{text}<br>(x,y): (%{x:.3f}, %{y:.3f})<br>distância: %{customdata:.3f}<extra></extra>',
          customdata: near.map((repo: any) => dist(Number(repo['x']), Number(repo['y']))),
        },
        ...(meanPoint ? [{
          x: [meanPoint.x],
          y: [meanPoint.y],
          name: 'média (near)',
          type: 'scatter' as const,
          mode: 'markers' as const,
          marker: { color: '#2559a7', size: 10, symbol: 'x' as const },
          hovertemplate: 'Média near: (%{x:.3f}, %{y:.3f})<extra></extra>'
        }] : []),
        {
          x: [props.selectedRepoInfo['x']],
          y: [props.selectedRepoInfo['y']],
          text: [props.selectedRepoInfo['name']],
          name: props.selectedRepoInfo['name'],
          type: 'scatter',
          mode: 'markers',
          marker: { color: '#005a1e', size: 11 },
        },
      ]}
      layout={{
        width: safeWidth,
        height: 460,
        title: 'Repositories next to the selected one',
        xaxis: {
          showticklabels: false,
          range: xRange,
        },
        yaxis: {
          showticklabels: false,
          range: yRange,
          scaleanchor: 'x',
          scaleratio: 1,
        },
        font: {
          family: 'Lato, sans-serif',
          color: '#111111'
        },
        plot_bgcolor: '#ffffff',
        paper_bgcolor: '#ffffff',
        dragmode: 'pan',
      }}
      config={plotConfig}
    />
    </div>
  );
}

export default NearReposPlot;