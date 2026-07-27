import { useEffect, useRef, useState } from 'react'

// Alerts should match Predictive Insights' natural height exactly, and
// only scroll internally if it has more content than that — so measure
// the real rendered height instead of guessing with CSS stretch alone.
export function useAlertsHeightSync() {
  const insightsRef = useRef(null)
  const [matchHeight, setMatchHeight] = useState(null)

  useEffect(() => {
    const el = insightsRef.current
    if (!el) return
    const observer = new ResizeObserver(entries => {
      setMatchHeight(entries[0].contentRect.height)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { insightsRef, matchHeight }
}
