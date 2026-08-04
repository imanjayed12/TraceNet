import { apiClient } from './client'

import type {
  AlertActionResponse,
  AlertCreateData,
  AlertInboxFilters,
  AlertInboxItem,
  AlertListFilters,
  AlertRecord,
  AlertUpdateData,
} from '../types/alerts'


type ApiListResponse<T> =
  | T[]
  | {
      results: T[]
    }


function normalizeList<T>(
  response: ApiListResponse<T>,
): T[] {
  return Array.isArray(response)
    ? response
    : response.results
}


function createQuery(
  values: Record<
    string,
    string | boolean | undefined
  >,
): string {
  const params = new URLSearchParams()

  Object.entries(values).forEach(
    ([key, value]) => {
      if (
        value !== undefined
        && value !== ''
      ) {
        params.set(key, String(value))
      }
    },
  )

  const query = params.toString()

  return query ? `?${query}` : ''
}


export const alertsApi = {
  async getAlerts(
    filters: AlertListFilters = {},
  ): Promise<AlertRecord[]> {
    const query = createQuery({
      search: filters.search,
      alert_type: filters.alert_type,
      severity: filters.severity,
      status: filters.status,
    })

    const response = await apiClient.get<
      ApiListResponse<AlertRecord>
    >(`/alerts/${query}`)

    return normalizeList(response.data)
  },

  async getAlert(
    id: number,
  ): Promise<AlertRecord> {
    const response =
      await apiClient.get<AlertRecord>(
        `/alerts/${id}/`,
      )

    return response.data
  },

  async createAlert(
    data: AlertCreateData,
  ): Promise<AlertRecord> {
    const response =
      await apiClient.post<AlertRecord>(
        '/alerts/',
        data,
      )

    return response.data
  },

  async updateAlert(
    id: number,
    data: AlertUpdateData,
  ): Promise<AlertRecord> {
    const response =
      await apiClient.patch<AlertRecord>(
        `/alerts/${id}/`,
        data,
      )

    return response.data
  },

  async deleteAlert(
    id: number,
  ): Promise<void> {
    await apiClient.delete(
      `/alerts/${id}/`,
    )
  },

  async getInbox(
    filters: AlertInboxFilters = {},
  ): Promise<AlertInboxItem[]> {
    const query = createQuery({
      is_read: filters.is_read,
      is_acknowledged:
        filters.is_acknowledged,
      severity: filters.severity,
    })

    const response = await apiClient.get<
      ApiListResponse<AlertInboxItem>
    >(`/alerts/inbox/${query}`)

    return normalizeList(response.data)
  },

  async markRead(
    recipientId: number,
  ): Promise<AlertActionResponse> {
    const response =
      await apiClient.post<AlertActionResponse>(
        `/alerts/inbox/${recipientId}/read/`,
      )

    return response.data
  },

  async acknowledge(
    recipientId: number,
  ): Promise<AlertActionResponse> {
    const response =
      await apiClient.post<AlertActionResponse>(
        `/alerts/inbox/${recipientId}/acknowledge/`,
      )

    return response.data
  },
}