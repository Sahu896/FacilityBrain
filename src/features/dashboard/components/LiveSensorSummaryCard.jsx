import { Thermometer, Droplet, Zap, Activity, Gauge, AlertTriangle } from '../../../lib/icons'
import { fetchAssets } from '../../../data/liveData'
import { useDataQuery } from '../../../lib/useDataQuery'
import SkeletonBlock from '../../../shared/components/SkeletonBlock'
import EmptyState from '../../../shared/components/EmptyState'
import '../css/LiveSensorSummaryCard.css'

const SENSOR_META = {
  temperature: { label: 'Temperature', icon: Thermometer },
  humidity: { label: 'Humidity', icon: Droplet },
  power: { label: 'Power', icon: Zap },
  pressure: { label: 'Pressure', icon: Gauge },
  vibration: { label: 'Vibration', icon: Activity },
}

function aggregate(assets) {
  const byKind = {}
  assets.forEach(a => a.sensors.forEach(s => {
    byKind[s.kind] ??= { normal: 0, warning: 0, critical: 0 }
    byKind[s.kind][s.status.toLowerCase()] += 1
  }))
  return byKind
}

export default function LiveSensorSummaryCard() {
  const { data, isLoading, isError, refetch } = useDataQuery(async () => aggregate(await fetchAssets()), [], { pollMs: 60000 })

  return (
    <div className="card live-sensor-card" style={{ borderLeftColor: 'var(--cyan)' }}>
      <div className="live-sensor-header">
        <div>
          <div className="widget-eyebrow">LIVE SENSOR DATA</div>
          <div className="widget-title">Health sensor status</div>
        </div>
        <span className="live-sensor-cadence">Every 15 min · IoT / SCADA / BMS</span>
      </div>

      {isError ? (
        <EmptyState icon={AlertTriangle} tone="error" title="Couldn't load sensor data"
          body="Couldn't reach the FacilityBrain API — is api_server.py running?"
          action={<button className="btn btn-secondary" onClick={refetch}>Retry</button>} />
      ) : (
      <div className="live-sensor-grid">
        {Object.entries(SENSOR_META).map(([kind, meta]) => {
          const counts = data?.[kind]
          return (
            <div key={kind} className="live-sensor-tile">
              <div className="live-sensor-tile-head">
                <meta.icon size={14} />
                <span>{meta.label}</span>
              </div>
              {isLoading || !counts ? (
                <SkeletonBlock height={14} />
              ) : (
                <div className="live-sensor-counts">
                  <span className="live-sensor-count live-sensor-count--ok">{counts.normal} OK</span>
                  <span className="live-sensor-count live-sensor-count--warn">{counts.warning} Warn</span>
                  <span className="live-sensor-count live-sensor-count--crit">{counts.critical} Crit</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}
