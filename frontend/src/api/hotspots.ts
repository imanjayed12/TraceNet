import { apiClient } from './client'

import type {
  District,
  HotspotType,
  IntelligenceHotspot,
} from '../types/map'


type ApiListResponse<T> =
  | T[]
  | {
      results: T[]
    }


export interface HotspotQueryFilters {
  search?: string
  district?: string
  hotspot_type?: HotspotType
  risk_level?: string
  is_verified?: boolean
  include_inactive?: boolean
}


export interface HotspotMutationData {
  name: string
  district_id: number
  latitude: string
  longitude: string
  hotspot_type: HotspotType
  recent_case_count: number
  active_route_count: number
  verified_route_count: number
  vulnerability_score: number
  is_verified: boolean
  is_active: boolean
}


function normalizeList<T>(
  response: ApiListResponse<T>,
): T[] {
  return Array.isArray(response)
    ? response
    : response.results
}


function buildQuery(
  filters: HotspotQueryFilters = {},
): string {
  const params = new URLSearchParams()

  if (filters.search?.trim()) {
    params.set('search', filters.search.trim())
  }

  if (filters.district) {
    params.set('district', filters.district)
  }

  if (filters.hotspot_type) {
    params.set(
      'hotspot_type',
      filters.hotspot_type,
    )
  }

  if (filters.risk_level) {
    params.set('risk_level', filters.risk_level)
  }

  if (filters.is_verified !== undefined) {
    params.set(
      'is_verified',
      String(filters.is_verified),
    )
  }

  if (filters.include_inactive) {
    params.set('include_inactive', 'true')
  }

  const query = params.toString()

  return query ? `?${query}` : ''
}


export const hotspotsApi = {
  async getHotspots(
    filters: HotspotQueryFilters = {},
  ): Promise<IntelligenceHotspot[]> {
    const response = await apiClient.get<
      ApiListResponse<IntelligenceHotspot>
    >(
      `/locations/hotspots/${buildQuery(filters)}`,
    )

    return normalizeList(response.data)
  },

  async getHotspot(
    id: number,
  ): Promise<IntelligenceHotspot> {
    const response =
      await apiClient.get<IntelligenceHotspot>(
        `/locations/hotspots/${id}/`,
      )

    return response.data
  },

  async getDistricts(): Promise<District[]> {
    const response = await apiClient.get<
      ApiListResponse<District>
    >('/locations/districts/')

    return normalizeList(response.data)
  },

  async createHotspot(
    data: HotspotMutationData,
  ): Promise<IntelligenceHotspot> {
    const response =
      await apiClient.post<IntelligenceHotspot>(
        '/locations/hotspots/',
        data,
      )

    return response.data
  },

  async updateHotspot(
    id: number,
    data: Partial<HotspotMutationData>,
  ): Promise<IntelligenceHotspot> {
    const response =
      await apiClient.patch<IntelligenceHotspot>(
        `/locations/hotspots/${id}/`,
        data,
      )

    return response.data
  },

  async deleteHotspot(
    id: number,
  ): Promise<void> {
    await apiClient.delete(
      `/locations/hotspots/${id}/`,
    )
  },
}