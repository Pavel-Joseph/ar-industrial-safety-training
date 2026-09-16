import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { api } from '../api'
import { TOKEN_KEY, USER_KEY } from '../config/env'

const AuthContext = createContext(null)

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser)
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))

  const signIn = useCallback(async (credentials) => {
    const data = await api.login(credentials)
    setUser(data.user)
    setToken(data.token)
    return data.user
  }, [])

  const signOut = useCallback(async () => {
    await api.logout()
    setUser(null)
    setToken(null)
  }, [])

  const value = useMemo(
    () => ({ user, token, isAuthenticated: Boolean(token), signIn, signOut }),
    [user, token, signIn, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
