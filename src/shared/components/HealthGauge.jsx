import { useEffect, useState } from 'react'
import { scoreToBand, riskBandColor } from '../../lib/riskBand'
import { HEALTH_WEIGHTS } from '../../data/liveData'
import Tooltip from './Tooltip'
import '../css/HealthGauge.css'

// Circular arc gauge, 0-100 mapped to a 270° sweep with a 90° gap at the
// bottom (Section 5). Animates draw-in over 600ms ease-out on mount/update.
export default function HealthGauge({ score, size = 160, stroke = 14, dims, sublabel = '/ 100' }) {
  const band = scoreToBand(score)
  const color = riskBandColor(band)
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const arcFraction = 270 / 360
  const arcLength = circumference * arcFraction
  const center = size / 2

  const [animatedScore, setAnimatedScore] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimatedScore(score))
    return () => cancelAnimationFrame(id)
  }, [score])

  const valueOffset = arcLength * (1 - Math.max(0, Math.min(100, animatedScore)) / 100)
  const rotate = `rotate(135 ${center} ${center})`

  const tooltipContent = dims ? (
    <div>
      <div className="gauge-tooltip-title">Health Score breakdown</div>
      {Object.entries(HEALTH_WEIGHTS).map(([key, weight]) => (
        <div key={key} className="gauge-tooltip-row">
          <span className="gauge-tooltip-key">{key} · {Math.round(weight * 100)}%</span>
          <span className="gauge-tooltip-val">{dims[key]}</span>
        </div>
      ))}
    </div>
  ) : 'Weighted average across live sensor readings, maintenance compliance, asset age, and operational reliability.'

  return (
    <Tooltip content={tooltipContent} width={200}>
      <div className="gauge-wrap" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle cx={center} cy={center} r={r} fill="none" stroke="var(--b1)" strokeWidth={stroke}
            strokeDasharray={`${arcLength} ${circumference}`} strokeLinecap="round" transform={rotate} />
          <circle cx={center} cy={center} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={`${arcLength} ${circumference}`} strokeDashoffset={valueOffset} strokeLinecap="round"
            transform={rotate} className="gauge-value-arc" style={{ '--gauge-glow': `${color}80` }} />
        </svg>
        <div className="gauge-center">
          <div className="gauge-score" style={{ fontSize: Math.round(size * 0.19), color }}>{Math.round(score)}</div>
          <div className="gauge-sublabel">{sublabel}</div>
        </div>
      </div>
    </Tooltip>
  )
}
