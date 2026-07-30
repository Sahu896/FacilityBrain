// Thin fetch client for the real FacilityBrain backend (facilitybrain_project/api_server.py).
// CORS is open on that server, so plain fetch works with no proxy config.
// Override the base URL via a .env file (VITE_API_BASE=...) if the server runs elsewhere.
// In production the Flask server hosts UI + API on the same origin, so the base is relative.
const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? 'http://localhost:5050' : '')

async function request(path, options) {
  let res
  try {
    res = await fetch(`${API_BASE}${path}`, options)
  } catch {
    throw new Error(`Could not reach FacilityBrain API at ${API_BASE} — is api_server.py running?`)
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request to ${path} failed (${res.status})`)
  }
  return res.json()
}

export const getHealth = () => request('/api/health')
export const getAssets = () => request('/api/assets')
export const getAsset = (assetId) => request(`/api/assets/${assetId}`)
export const getFleet = () => request('/api/fleet')
export const getAssetHistory = (assetId) => request(`/api/assets/${assetId}/history`)
export const getFleetHistory = () => request('/api/fleet/history')

export const postRecommend = (assetId) => request('/api/recommend', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ asset_id: assetId }),
})

export const postChat = (question) => request('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ question }),
})

export const searchRag = (q, k = 4) => request(`/api/rag/search?q=${encodeURIComponent(q)}&k=${k}`)
