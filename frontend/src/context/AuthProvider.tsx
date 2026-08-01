import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { authApi } from '../api/auth'
import { tokenStorage } from '../api/tokenStorage'
import type {
  AuthUser,
  LoginCredentials,
} from '../types/auth'
import {
  AuthContext,
  type AuthContextValue,
} from './authContext'


interface AuthProviderProps {
  children: ReactNode
}


export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(
    null,
  )
  const [isInitializing, setIsInitializing] = (
    useState(true)
  )

  const refreshUser = useCallback(async () => {
    const currentUser = await authApi.getCurrentUser()
    setUser(currentUser)
  }, [])

  const login = useCallback(
    async (
      credentials: LoginCredentials,
    ): Promise<AuthUser> => {
      const loginResponse = await authApi.login(
        credentials,
      )

      setUser(loginResponse.user)
      return loginResponse.user
    },
    [],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    const initializeAuthentication = async () => {
      const hasSession = Boolean(
        tokenStorage.getAccessToken()
        || tokenStorage.getRefreshToken(),
      )

      if (!hasSession) {
        setIsInitializing(false)
        return
      }

      try {
        await refreshUser()
      } catch {
        tokenStorage.clearTokens()
        setUser(null)
      } finally {
        setIsInitializing(false)
      }
    }

    void initializeAuthentication()
  }, [refreshUser])

  useEffect(() => {
    const handleSessionExpired = () => {
      tokenStorage.clearTokens()
      setUser(null)
    }

    window.addEventListener(
      'tracenet:session-expired',
      handleSessionExpired,
    )

    return () => {
      window.removeEventListener(
        'tracenet:session-expired',
        handleSessionExpired,
      )
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isInitializing,
      login,
      logout,
      refreshUser,
    }),
    [
      user,
      isInitializing,
      login,
      logout,
      refreshUser,
    ],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}