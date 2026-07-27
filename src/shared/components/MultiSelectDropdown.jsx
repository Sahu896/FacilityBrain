import { ChevronDown } from '../../lib/icons'
import { useMultiSelectDropdown } from '../handlers/useMultiSelectDropdown'
import '../css/MultiSelectDropdown.css'

export default function MultiSelectDropdown({ label, options, selected, onChange }) {
  const { open, setOpen, ref, toggle } = useMultiSelectDropdown(selected, onChange)

  return (
    <div className="msd-wrap" ref={ref}>
      <button className="btn btn-secondary msd-trigger" onClick={() => setOpen(o => !o)}>
        {label}{selected.length > 0 ? ` (${selected.length})` : ''} <ChevronDown size={12} />
      </button>
      {open && (
        <div className="card msd-panel">
          {options.map(opt => (
            <label key={opt} className="msd-option">
              <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
