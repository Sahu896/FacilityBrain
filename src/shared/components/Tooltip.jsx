import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import '../css/Tooltip.css'

// Section 15: dark bg3 background, 1px b1 border, 150ms fade-in with a
// 300ms hover-intent delay. Rendered through a portal into <body> and
// positioned in fixed viewport coordinates — several widgets sit right
// under the header or near the sidebar, and the page's scrollable <main>
// clips absolutely-positioned overflow at its own edges (both top and
// left), so a normal in-place bubble gets cropped there. Portaling escapes
// that clipping entirely; flips below the trigger and clamps horizontally
// when there isn't room.
export default function Tooltip({ content, children, width = 220 }) {
  const [show, setShow] = useState(false)
  const [coords, setCoords] = useState(null)
  const timer = useRef(null)
  const wrapRef = useRef(null)

  const onEnter = () => {
    timer.current = setTimeout(() => {
      const rect = wrapRef.current?.getBoundingClientRect()
      if (!rect) return
      const estBubbleHeight = 80
      const placement = rect.top < estBubbleHeight + 12 ? 'bottom' : 'top'
      const left = Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 8))
      const top = placement === 'top' ? rect.top - 8 : rect.bottom + 8
      setCoords({ left, top, placement })
      setShow(true)
    }, 300)
  }
  const onLeave = () => { clearTimeout(timer.current); setShow(false) }

  return (
    <div className="tooltip-wrap" ref={wrapRef} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {children}
      {show && coords && createPortal(
        <div
          className={`tooltip-bubble tooltip-bubble--${coords.placement} tooltip-bubble--show`}
          style={{ width, left: coords.left, top: coords.top }}
        >
          {content}
        </div>,
        document.body
      )}
    </div>
  )
}
