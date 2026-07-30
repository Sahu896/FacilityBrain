import { ThemeContext, useThemeState } from '../handlers/useTheme'

export function ThemeProvider({ children }) {
  const theme = useThemeState()
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}
