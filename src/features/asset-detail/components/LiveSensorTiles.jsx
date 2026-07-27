import { Thermometer, Droplet, Zap, Gauge, Activity, TrendingUp } from '../../../lib/icons'
import Sparkline from '../../../shared/components/Sparkline'
import '../css/LiveSensorTiles.css'

const SENSOR_META = {
  temperature: { label: 'Temperature', icon: Thermometer },
  humidity: { label: 'Humidity', icon: Droplet },
  power: { label: 'Power', icon: Zap },
  pressure: { label: 'Pressure', icon: Gauge },
  vibration: { label: 'Vibration', icon: Activity },
}

const STATUS_KEY = { Normal: 'normal', Warning: 'warning', Critical: 'critical' }
const STATUS_COLOR_VAR = { Normal: 'var(--green)', Warning: 'var(--amber)', Critical: 'var(--red)' }

export default function LiveSensorTiles({ sensors }) {
  return (
    <div className="lst-grid" style={{ gridTemplateColumns: `repeat(${sensors.length}, 1fr)` }}>
      {sensors.map(s => {
        const meta = SENSOR_META[s.kind]
        const statusKey = STATUS_KEY[s.status]
        return (
          <div key={s.kind} className={`lst-tile lst-tile--${statusKey}`}>
            <div className="lst-tile-head">
              <span className="lst-tile-label">
                <span className="lst-tile-icon" style={{ color: STATUS_COLOR_VAR[s.status] }}><meta.icon size={14} /></span>
                {meta.label}
              </span>
              <span className={`badge lst-status lst-status--${statusKey}`}>{s.status}</span>
            </div>
            <div className="lst-value-row">
              <span className="lst-value">{s.value}</span>
              <span className="lst-unit">{s.unit}</span>
              <TrendingUp size={12} className={`lst-trend-icon lst-trend-icon--${s.trend}`} />
            </div>
            <div className="lst-thresholds">Warn ≥{s.warnThreshold}{s.unit} · Critical ≥{s.critThreshold}{s.unit}</div>
            <Sparkline data={s.history} width={180} height={32} color={STATUS_COLOR_VAR[s.status]} />
          </div>
        )
      })}
    </div>
  )
}
