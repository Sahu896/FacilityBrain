import { useState } from 'react'
import { postRecommend } from '../../../lib/api'

// Drives the "Get AI Recommendation" modal — a real call to POST /api/recommend
// (LLM forecast grounded in the project's own PRDs, can take 2-90s).
export function useAssetRecommendation(assetId) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  function request() {
    setOpen(true)
    setLoading(true)
    setError(null)
    setResult(null)
    postRecommend(assetId)
      .then(setResult)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  return { open, setOpen, loading, result, error, request }
}
