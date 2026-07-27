import { createContext, useContext, useEffect, useState, useCallback } from 'react'

const RouterContext = createContext(null)

function normalize(pathname) {
  return pathname.replace(/\/+$/, '') || '/'
}

export function RouterProvider({ children }) {
  const [path, setPath] = useState(() => normalize(window.location.pathname))

  useEffect(() => {
    const onPop = () => setPath(normalize(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback((to) => {
    if (normalize(to) === normalize(window.location.pathname)) return
    window.history.pushState({}, '', to)
    setPath(normalize(to))
  }, [])

  return (
    <RouterContext.Provider value={{ path, navigate }}>
      {children}
    </RouterContext.Provider>
  )
}

export function useRouter() {
  const ctx = useContext(RouterContext)
  if (!ctx) throw new Error('useRouter must be used within RouterProvider')
  return ctx
}

// Matches a pattern like '/assets/:id' against a concrete path.
// Returns a params object on match, or null.
export function matchRoute(pattern, path) {
  const patternParts = pattern.split('/').filter(Boolean)
  const pathParts = path.split('/').filter(Boolean)
  if (patternParts.length !== pathParts.length) return null
  const params = {}
  for (let i = 0; i < patternParts.length; i++) {
    const pp = patternParts[i]
    if (pp.startsWith(':')) params[pp.slice(1)] = decodeURIComponent(pathParts[i])
    else if (pp !== pathParts[i]) return null
  }
  return params
}

export function Link({ to, className, children, onClick, ...rest }) {
  const { navigate } = useRouter()
  return (
    <a href={to} className={className} onClick={(e) => { e.preventDefault(); onClick?.(e); navigate(to) }} {...rest}>
      {children}
    </a>
  )
}
