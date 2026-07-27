import '../css/RingGauge.css'

// Small circular progress ring — a compact sibling to HealthGauge's big arc,
// used where several sub-metrics need to sit side by side.
export default function RingGauge({ value, color = 'var(--cyan)', size = 64, stroke = 6 }) {
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, value))
  const offset = circumference * (1 - clamped / 100)
  const center = size / 2

  return (
    <div className="ring-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={center} cy={center} r={r} fill="none" stroke="var(--b1)" strokeWidth={stroke} />
        <circle
          cx={center} cy={center} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          style={{ filter: `drop-shadow(0 0 5px ${color})` }}
        />
      </svg>
      <div className="ring-gauge-value" style={{ color }}>{Math.round(clamped)}%</div>
    </div>
  )
}
