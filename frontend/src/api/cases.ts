import { apiClient } from './client'

import type {
  ApiCollection,
  CaseSummary,
} from '../types/dashboard'

import type {
  CaseDetail,
  CaseDetailBundle,
  CaseRouteLink,
  CaseUpdate,
  VictimProfile,
} from '../types/cases'


export interface CaseFilters {
  search?: string
  status?: string
  priority?: string
  category?: string
  district?: string
  is_verified?: 'true' | 'false' | ''
}


function unwrapCollection<T>(
  collection: ApiCollection<T>,
): T[] {
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

    return unwrapCollection(response.data)
  },

  async getCase(
    referenceCode: string,
  ): Promise<CaseDetail> {
    const response = await apiClient.get<CaseDetail>(
      `/cases/${encodeURIComponent(referenceCode)}/`,
    )

    return response.data
  },

  async getCaseDetailBundle(
    referenceCode: string,
  ): Promise<CaseDetailBundle> {
    const encodedReference = encodeURIComponent(
      referenceCode,
    )

    const [
      caseResponse,
      updatesResponse,
      routeLinksResponse,
      victimsResponse,
    ] = await Promise.all([
      apiClient.get<CaseDetail>(
        `/cases/${encodedReference}/`,
      ),

      apiClient.get<ApiCollection<CaseUpdate>>(
        '/cases/updates/',
        {
          params: {
            case: referenceCode,
          },
        },
      ),

      apiClient.get<ApiCollection<CaseRouteLink>>(
        '/cases/route-links/',
        {
          params: {
            case: referenceCode,
          },
        },
      ),

      apiClient.get<ApiCollection<VictimProfile>>(
        '/cases/victims/',
        {
          params: {
            case: referenceCode,
          },
        },
      ),
    ])

    return {
      caseRecord: caseResponse.data,

      updates: unwrapCollection(
        updatesResponse.data,
      ),

      routeLinks: unwrapCollection(
        routeLinksResponse.data,
      ),

      victims: unwrapCollection(
        victimsResponse.data,
      ),
    }
  },
}