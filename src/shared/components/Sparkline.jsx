import '../css/Sparkline.css'

// Thin line chart, no axis labels, optional event markers (Section 5:
// 90-day sparkline with maintenance/incident event dots).
export default function Sparkline({ data, width = 240, height = 48, color = '#06D6FF', markers = [], onMarkerClick }) {
  if (!data?.length) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const stepX = width / (data.length - 1)
  const points = data.map((v, i) => `${(i * stepX).toFixed(1)},${(height - ((v - min) / span) * height).toFixed(1)}`).join(' ')

  return (
    <svg width={width} height={height} className="sparkline-svg">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.6"
        className="sparkline-line" style={{ '--spark-glow': `${color}80` }} />
      {markers.map((m, i) => {
        const x = (m.index * stepX)
        const y = height - ((data[m.index] - min) / span) * height
        return (
          <circle key={i} cx={x} cy={y} r={3.5} fill={m.color ?? color} stroke="var(--bg2)" strokeWidth="1.5"
            className={`sparkline-marker${onMarkerClick ? ' sparkline-marker--clickable' : ''}`}
            onClick={() => onMarkerClick?.(m)}>
            <title>{m.label}</title>
          </circle>
        )
      })}
    </svg>
  )
}
