import { useCallback, useEffect, useState } from 'react'
import { fetchAssets, deriveAlerts } from '../../../data/liveData'

// Alerts are derived live from real per-asset deviation data (the API has no persisted
// alerts feed) — see data/liveData.js#deriveAlerts.
export function useAlerts() {
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [filter, setFilter] = useState('all')

  const load = useCallback(() => {
    let cancelled = false
    setIsLoading(true)
    setIsError(false)
    fetchAssets()
      .then(assets => { if (!cancelled) setItems(deriveAlerts(assets)) })
      .catch(() => { if (!cancelled) setIsError(true) })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => load(), [load])

  const filtered = filter === 'all' ? items : items.filter(a => a.sev === filter)

  function acknowledge(id) {
    setItems(items.map(a => a.id === id ? { ...a, status: 'acknowledged' } : a))
  }

  return { items, filter, setFilter, filtered, acknowledge, isLoading, isError, refetch: load }
}
