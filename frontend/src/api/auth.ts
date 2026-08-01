import { apiClient } from './client'
import { tokenStorage } from './tokenStorage'

import type {
  AuthUser,
  LoginCredentials,
  LoginResponse,
  RegistrationData,
} from '../types/auth'


export interface RegistrationResponse {
  detail: string
  user: {
    email: string
    full_name: string
    role: string
    organization: string
    is_active: boolean
    approval_status: string
  }
}


export const authApi = {
  async login(
    credentials: LoginCredentials,
  ): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(
      '/auth/login/',
      credentials,
    )

    tokenStorage.setTokens(
      response.data.access,
      response.data.refresh,
    )

    return response.data
  },

  async register(
    data: RegistrationData,
  ): Promise<RegistrationResponse> {
    const response = (
      await apiClient.post<RegistrationResponse>(
        '/auth/register/',
        data,
      )
    )

    return response.data
  },

  async getCurrentUser(): Promise<AuthUser> {
    const response = await apiClient.get<AuthUser>(
      '/auth/me/',
    )

    return response.data
  },

  async logout(): Promise<void> {
    const refreshToken = tokenStorage.getRefreshToken()

    try {
      if (refreshToken) {
        await apiClient.post(
          '/auth/logout/',
          {
            refresh: refreshToken,
          },
        )
      }
    } finally {
      tokenStorage.clearTokens()
    }
  },
}