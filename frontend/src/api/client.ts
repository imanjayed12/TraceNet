import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios'

import type {
  RefreshResponse,
} from '../types/auth'
import { tokenStorage } from './tokenStorage'


const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL
  ?? 'http://127.0.0.1:8000/api'
).replace(/\/$/, '')


interface RetryableRequestConfig
  extends InternalAxiosRequestConfig {
  _retry?: boolean
}


export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 75000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})


const refreshClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 75000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})


let refreshPromise: Promise<string> | null = null


const refreshAccessToken = async (): Promise<string> => {
  const refreshToken = tokenStorage.getRefreshToken()

  if (!refreshToken) {
    throw new Error('Refresh token is unavailable.')
  }

  const response = await refreshClient.post<RefreshResponse>(
    '/auth/refresh/',
    {
      refresh: refreshToken,
    },
  )

  tokenStorage.setTokens(
    response.data.access,
    response.data.refresh,
  )

  return response.data.access
}


apiClient.interceptors.request.use(
  (config) => {
    const accessToken = tokenStorage.getAccessToken()

    if (accessToken) {
      config.headers.set(
        'Authorization',
        `Bearer ${accessToken}`,
      )
    }

    return config
  },
)


apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = (
      error.config as RetryableRequestConfig | undefined
    )

    const isUnauthorized = (
      error.response?.status === 401
    )

    const isAuthenticationRequest = (
      originalRequest?.url?.includes('/auth/login/')
      || originalRequest?.url?.includes('/auth/register/')
      || originalRequest?.url?.includes('/auth/refresh/')
    )

    if (
      !isUnauthorized
      || !originalRequest
      || originalRequest._retry
      || isAuthenticationRequest
    ) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken()
          .finally(() => {
            refreshPromise = null
          })
      }

      const accessToken = await refreshPromise

      originalRequest.headers.set(
        'Authorization',
        `Bearer ${accessToken}`,
      )

      return apiClient(originalRequest)
    } catch (refreshError) {
      tokenStorage.clearTokens()

      window.dispatchEvent(
        new CustomEvent('tracenet:session-expired'),
      )

      return Promise.reject(refreshError)
    }
  },
)