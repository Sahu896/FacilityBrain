import { useState, useEffect, useCallback, useRef } from 'react'

// Stands in for TanStack Query's { data, isLoading, isError, refetch } shape
// without adding the dependency. `fetcher` may be sync or async (its return
// value is awaited either way) — this is what lets every widget below point
// at either the old dummy generator or the real FacilityBrain API with the
// same hook contract. Supports an optional artificial `delay` (useful for
// exercising skeleton loaders against instant local data) and silent
// background polling via `pollMs` (Section 4: KPI refresh should never
// flicker the whole card).
export function useDataQuery(fetcher, deps = [], { delay = 0, pollMs = null, keepPreviousData = true, shouldError = () => false } = {}) {
  const [state, setState] = useState({ data: undefined, isLoading: true, isError: false, error: null })
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const errorRef = useRef(shouldError)
  errorRef.current = shouldError

  const run = useCallback((silent) => {
    if (!silent) setState(s => ({ ...s, isLoading: true, isError: false }))
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        if (errorRef.current()) throw new Error('Simulated fetch failure')
        const result = await fetcherRef.current()
        if (!cancelled) setState({ data: result, isLoading: false, isError: false, error: null })
      } catch (err) {
        if (!cancelled) setState(s => ({ data: keepPreviousData ? s.data : undefined, isLoading: false, isError: true, error: err }))
      }
    }, delay)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [delay, keepPreviousData])

  useEffect(() => {
    return run(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    if (!pollMs) return undefined
    const iv = setInterval(() => run(true), pollMs)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollMs, ...deps])

  const refetch = useCallback(() => run(false), [run])

  return { ...state, refetch }
}
