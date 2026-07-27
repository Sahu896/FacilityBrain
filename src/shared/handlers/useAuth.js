import { createContext, useCallback, useContext, useState } from 'react'

const STORAGE_KEY = 'fb_auth_user'

// Hardcoded demo credentials — no real auth backend exists for this project.
// A single shared password gates a fixed allow-list of team email addresses.
const VALID_EMAILS = [
  'sunandan.handoo@podtech.com',
  'shrishti.singh@podtech.com',
  'shivani.singh@podtech.com',
  'pragati.naik@podtech.com',
  'susil@podtech.com',
]
const PASSWORD = 'facilitybrain2026'

export function nameFromEmail(email) {
  const local = email.split('@')[0]
  return local.split('.').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

export function initialsFromEmail(email) {
  const name = nameFromEmail(email)
  const parts = name.split(' ')
  return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase()
}

function readStoredUser() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored && VALID_EMAILS.includes(stored) ? stored : null
  } catch {
    return null
  }
}

export const AuthContext = createContext(null)

export function useAuthState() {
  const [user, setUser] = useState(() => readStoredUser())

  const login = useCallback((email, password) => {
    const normalized = email.trim().toLowerCase()
    if (!VALID_EMAILS.includes(normalized)) return { ok: false, error: 'No FacilityBrain account found for that email.' }
    if (password !== PASSWORD) return { ok: false, error: 'Incorrect password.' }
    try { localStorage.setItem(STORAGE_KEY, normalized) } catch { /* private browsing, etc. */ }
    setUser(normalized)
    return { ok: true }
  }, [])

  const logout = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* private browsing, etc. */ }
    setUser(null)
  }, [])

  return { user, isAuthenticated: !!user, login, logout }
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
