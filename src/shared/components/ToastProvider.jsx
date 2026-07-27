import { X, AlertTriangle, Check } from '../../lib/icons'
import { ToastContext, useToastState } from '../handlers/useToast'
import '../css/Toast.css'

export function ToastProvider({ children }) {
  const { toasts, push, dismiss } = useToastState()

  return (
    <ToastContext.Provider value={{ push, dismiss }}>
      {children}
      <div className="toast-stack">
        {toasts.map(t => (
          <div key={t.id} className={`card toast toast--${t.type === 'error' ? 'error' : t.type === 'success' ? 'success' : 'info'}`}>
            <span className="toast-icon">
              {t.type === 'error' ? <AlertTriangle size={15} /> : <Check size={15} />}
            </span>
            <span className="toast-message">{t.message}</span>
            <button className="icon-btn toast-dismiss" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
