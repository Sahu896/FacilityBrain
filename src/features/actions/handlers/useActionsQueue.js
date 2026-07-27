import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchAssets, rankRecommendations } from '../../../data/liveData'
import { useToast } from '../../../shared/handlers/useToast'

export function useActionsQueue() {
  const { push } = useToast()
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [statusFilter, setStatusFilter] = useState('pending')

  const load = useCallback(() => {
    let cancelled = false
    setIsLoading(true)
    setIsError(false)
    fetchAssets()
      .then(assets => { if (!cancelled) setItems(rankRecommendations(assets)) })
      .catch(() => { if (!cancelled) setIsError(true) })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => load(), [load])

  const filtered = useMemo(() => statusFilter === 'all' ? items : items.filter(i => i.status === statusFilter), [items, statusFilter])

  const setStatus = (id, status) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i))
    const rec = items.find(i => i.id === id)
    if (rec) push(`${rec.assetName} recommendation ${status}`, { type: status === 'accepted' ? 'success' : 'info' })
  }

  return { filtered, statusFilter, setStatusFilter, setStatus, isLoading, isError, refetch: load }
}
