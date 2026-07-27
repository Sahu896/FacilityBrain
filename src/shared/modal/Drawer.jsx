import { X } from '../../lib/icons'
import '../css/Drawer.css'

// Right-side slide-in, 400-480px (Section 15) — alert acknowledgment detail,
// sparkline event detail.
export default function Drawer({ open, onClose, title, children, width = 440 }) {
  return (
    <>
      <div className={`drawer-scrim${open ? ' drawer-scrim--open' : ''}`} onClick={onClose} />
      <div className={`card drawer-panel${open ? ' drawer-panel--open' : ''}`} role="dialog" aria-label={title} style={{ width }}>
        <div className="drawer-header">
          <span className="drawer-title">{title}</span>
          <button className="icon-btn" aria-label="Close" onClick={onClose}><X size={15} /></button>
        </div>
        <div className="drawer-body">{children}</div>
      </div>
    </>
  )
}
