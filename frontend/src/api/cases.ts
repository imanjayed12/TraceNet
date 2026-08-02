import { apiClient } from './client'

import type {
  ApiCollection,
  CaseSummary,
} from '../types/dashboard'


export interface CaseFilters {
  search?: string
  status?: string
  priority?: string
  category?: string
  district?: string
  is_verified?: 'true' | 'false' | ''
}


function unwrapCases(
  collection: ApiCollection<CaseSummary>,
): CaseSummary[] {
  return Array.isArray(collection)
    ? collection
    : collection.results
}


function cleanFilters(
  filters: CaseFilters,
): Record<string, string> {
  return Object.entries(filters).reduce<
    Record<string, string>
  >(
    (result, [key, value]) => {
      if (
        typeof value === 'string'
        && value.trim() !== ''
      ) {
        result[key] = value.trim()
      }

      return result
    },
    {},
  )
}


export const casesApi = {
  async getCases(
    filters: CaseFilters = {},
  ): Promise<CaseSummary[]> {
    const response = await apiClient.get<
      ApiCollection<CaseSummary>
    >(
      '/cases/',
      {
        params: cleanFilters(filters),
      },
    )

    return unwrapCases(response.data)
  },

  async getCase(
    referenceCode: string,
  ): Promise<CaseSummary> {
    const response = await apiClient.get<CaseSummary>(
      `/cases/${encodeURIComponent(referenceCode)}/`,
    )

    return response.data
  },
}