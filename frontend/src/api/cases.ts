import { apiClient } from './client'

import type {
  ApiCollection,
  CaseSummary,
} from '../types/dashboard'

import type {
  CaseCreateData,
  CaseDetail,
  CaseDetailBundle,
  CaseDistrict,
  CaseRouteLink,
  CaseUpdate,
  CaseUpdateCreateData,
  VictimProfile,
  VictimProfileMutationData,
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


  async getDistricts(): Promise<CaseDistrict[]> {
    const response = await apiClient.get<
      ApiCollection<CaseDistrict>
    >('/locations/districts/')

    return unwrapCollection(response.data)
  },


  async createCase(
    data: CaseCreateData,
  ): Promise<CaseDetail> {
    const response = await apiClient.post<CaseDetail>(
      '/cases/',
      data,
    )

    return response.data
  },


  async createCaseUpdate(
    data: CaseUpdateCreateData,
  ): Promise<CaseUpdate> {
    const response = await apiClient.post<CaseUpdate>(
      '/cases/updates/',
      data,
    )

    return response.data
  },


  async createVictimProfile(
    data: VictimProfileMutationData,
  ): Promise<VictimProfile> {
    const response = await apiClient.post<VictimProfile>(
      '/cases/victims/',
      data,
    )

    return response.data
  },


  async updateVictimProfile(
    anonymousCode: string,
    data: Partial<VictimProfileMutationData>,
  ): Promise<VictimProfile> {
    const response =
      await apiClient.patch<VictimProfile>(
        `/cases/victims/${
          encodeURIComponent(anonymousCode)
        }/`,
        data,
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