import { RouterProvider } from './lib/router'
import { ToastProvider } from './shared/components/ToastProvider'
import { AuthProvider } from './shared/components/AuthProvider'
import { ThemeProvider } from './shared/components/ThemeProvider'
import { useAuth } from './shared/handlers/useAuth'
import AppShell from './AppShell'
import LoginPage from './features/auth/components/LoginPage'

function AuthGate() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <AppShell /> : <LoginPage />
}

export default function App() {
  return (
    <ThemeProvider>
      <RouterProvider>
        <AuthProvider>
          <ToastProvider>
            <AuthGate />
          </ToastProvider>
        </AuthProvider>
      </RouterProvider>
    </ThemeProvider>
  )
}
