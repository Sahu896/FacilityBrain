import { useEffect, useRef, useState } from 'react'

export function useMultiSelectDropdown(selected, onChange) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [])

  const toggle = (opt) => onChange(selected.includes(opt) ? selected.filter(o => o !== opt) : [...selected, opt])

  return { open, setOpen, ref, toggle }
}
