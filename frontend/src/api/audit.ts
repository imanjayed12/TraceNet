import { apiClient } from './client'

import type {
  AuditApiFilters,
  AuditLog,
} from '../types/audit'


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


function cleanParams(
  filters: AuditApiFilters,
): Record<string, string | boolean> {
  const params: Record<
    string,
    string | boolean
  > = {}

  if (filters.search?.trim()) {
    params.search = filters.search.trim()
  }

  if (filters.action) {
    params.action = filters.action
  }

  if (filters.resource_type?.trim()) {
    params.resource_type =
      filters.resource_type.trim()
  }

  if (filters.actor_email?.trim()) {
    params.actor_email =
      filters.actor_email.trim()
  }

  if (typeof filters.success === 'boolean') {
    params.success = filters.success
  }

  if (filters.date_from) {
    params.date_from = filters.date_from
  }

  if (filters.date_to) {
    params.date_to = filters.date_to
  }

  return params
}


export const auditApi = {
  async getLogs(
    filters: AuditApiFilters = {},
  ): Promise<AuditLog[]> {
    const response = await apiClient.get<
      ApiListResponse<AuditLog>
    >('/audit/', {
      params: cleanParams(filters),
    })

    return normalizeList(response.data)
  },
}