import { riskBandMeta } from '../../lib/riskBand'
import '../css/Badge.css'

// Risk-band color coding is always paired with a text label (Section 17) —
// never color alone.
export function RiskBadge({ band, size = 'md' }) {
  const meta = riskBandMeta(band)
  const style = {
    '--badge-bg': `${meta.hex}18`,
    '--badge-fg': meta.hex,
    '--badge-bd': `${meta.hex}40`,
    '--badge-pad': size === 'sm' ? '2px 8px' : '3px 9px',
    '--badge-font': size === 'sm' ? '9px' : '10px',
  }
  return (
    <span className="badge badge--band" style={style}>
      <span className="badge-dot" />
      {meta.label}
    </span>
  )
}

export function SevBadge({ sev }) {
  const meta = { critical: { label: 'Critical', hex: '#FF6B6B' }, warning: { label: 'Warning', hex: '#F5A623' }, info: { label: 'Info', hex: '#06D6FF' } }[sev]
  const style = { '--badge-bg': `${meta.hex}18`, '--badge-fg': meta.hex, '--badge-bd': `${meta.hex}40` }
  return <span className="badge badge--tone" style={style}>{meta.label}</span>
}

export function StatusBadge({ status }) {
  const meta = {
    online: { label: 'Online', hex: '#10E898' }, offline: { label: 'Offline', hex: '#3E4C5E' },
    new: { label: 'New', hex: '#06D6FF' }, acknowledged: { label: 'Acknowledged', hex: '#7D8A99' }, resolved: { label: 'Resolved', hex: '#10E898' },
    open: { label: 'Open', hex: '#F5A623' }, closed: { label: 'Closed', hex: '#10E898' },
    pending: { label: 'Pending', hex: '#06D6FF' }, accepted: { label: 'Accepted', hex: '#10E898' }, dismissed: { label: 'Dismissed', hex: '#3E4C5E' },
  }[status] ?? { label: status, hex: '#7D8A99' }
  const style = { '--badge-bg': `${meta.hex}18`, '--badge-fg': meta.hex, '--badge-bd': `${meta.hex}40` }
  return <span className="badge badge--tone" style={style}>{meta.label}</span>
}
