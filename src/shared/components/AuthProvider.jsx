import { AuthContext, useAuthState } from '../handlers/useAuth'

export function AuthProvider({ children }) {
  const auth = useAuthState()
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}
