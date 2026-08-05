import { apiClient } from './client'

import type {
  ManagedUser,
  UpdateManagedUserPayload,
  UserActionResponse,
  UserApiFilters,
} from '../types/users'


type ApiListResponse<T> =
  | T[]
  | {
      results: T[]
    }


function normalizeList<T>(
  response: ApiListResponse<T>,
): T[] {
  if (Array.isArray(response)) {
    return response
  }

  return response.results
}


export const usersApi = {
  async getUsers(
    filters: UserApiFilters = {},
  ): Promise<ManagedUser[]> {
    const response = await apiClient.get<
      ApiListResponse<ManagedUser>
    >(
      '/auth/users/',
      {
        params: filters,
      },
    )

    return normalizeList(response.data)
  },

  async getUser(
    id: number,
  ): Promise<ManagedUser> {
    const response = await apiClient.get<ManagedUser>(
      `/auth/users/${id}/`,
    )

    return response.data
  },

  async updateUser(
    id: number,
    payload: UpdateManagedUserPayload,
  ): Promise<ManagedUser> {
    const response = await apiClient.patch<ManagedUser>(
      `/auth/users/${id}/`,
      payload,
    )

    return response.data
  },

  async approveUser(
    id: number,
  ): Promise<UserActionResponse> {
    const response = (
      await apiClient.post<UserActionResponse>(
        `/auth/users/${id}/approve/`,
      )
    )

    return response.data
  },

  async rejectUser(
    id: number,
  ): Promise<UserActionResponse> {
    const response = (
      await apiClient.post<UserActionResponse>(
        `/auth/users/${id}/reject/`,
      )
    )

    return response.data
  },

  async activateUser(
    id: number,
  ): Promise<UserActionResponse> {
    const response = (
      await apiClient.post<UserActionResponse>(
        `/auth/users/${id}/activate/`,
      )
    )

    return response.data
  },

  async deactivateUser(
    id: number,
  ): Promise<UserActionResponse> {
    const response = (
      await apiClient.post<UserActionResponse>(
        `/auth/users/${id}/deactivate/`,
      )
    )

    return response.data
  },
}