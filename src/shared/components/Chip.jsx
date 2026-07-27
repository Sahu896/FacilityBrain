import '../css/Chip.css'

export default function Chip({ active, color, onClick, children }) {
  const style = active ? { '--chip-c': color, '--chip-bg': `${color}15` } : undefined
  return (
    <button
      className={`chip chip--custom${active ? ' active' : ''}`}
      onClick={onClick}
      style={style}
    >
      {children}
    </button>
  )
}
