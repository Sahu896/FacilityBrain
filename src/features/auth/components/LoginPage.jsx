import { useState } from 'react'
import { useAuth } from '../../../shared/handlers/useAuth'
import BrandLogo from '../../../shared/components/BrandLogo'
import { AlertTriangle } from '../../../lib/icons'
import '../css/LoginPage.css'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const result = login(email, password)
    if (!result.ok) setError(result.error)
  }

  return (
    <div className="login-page">
      <div className="card login-card">
        <BrandLogo size={48} />
        <div className="login-title">FacilityBrain</div>
        <div className="login-subtitle">Sign in to your predictive maintenance dashboard</div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-field">
            <span className="login-label">Email</span>
            <input
              type="email" required autoFocus
              className="login-input"
              placeholder="you@podtech.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
            />
          </label>
          <label className="login-field">
            <span className="login-label">Password</span>
            <input
              type="password" required
              className="login-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
            />
          </label>

          {error && (
            <div className="login-error">
              <AlertTriangle size={15} color="var(--red)" />
              <span className="login-error-text">{error}</span>
            </div>
          )}

          <button type="submit" className="btn btn-primary login-submit">Sign in</button>
        </form>

        <div className="login-footnote">Access is restricted to authorized FacilityBrain team members.</div>
      </div>
    </div>
  )
}
