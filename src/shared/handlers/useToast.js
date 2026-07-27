import { createContext, useCallback, useContext, useRef, useState } from 'react'

export const ToastContext = createContext(null)

export function useToastState() {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const dismiss = useCallback((id) => setToasts(t => t.filter(x => x.id !== id)), [])

  const push = useCallback((message, { type = 'info', duration = 4000 } = {}) => {
    const id = ++idRef.current
    setToasts(t => [...t, { id, message, type }])
    if (type !== 'error') setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  return { toasts, push, dismiss }
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
