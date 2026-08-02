import { apiClient } from './client'

import type {
  District,
  IntelligenceHotspot,
  IntelligenceMapData,
  IntelligenceRoute,
} from '../types/map'


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


export const intelligenceMapApi = {
  async getDistricts(): Promise<District[]> {
    const response = await apiClient.get<
      ApiListResponse<District>
    >('/locations/districts/')

    return normalizeList(response.data)
  },

  async getRoutes(): Promise<IntelligenceRoute[]> {
    const response = await apiClient.get<
      ApiListResponse<IntelligenceRoute>
    >('/locations/routes/')

    return normalizeList(response.data).filter(
      (route) => route.is_active,
    )
  },

  async getHotspots(): Promise<IntelligenceHotspot[]> {
    const response = await apiClient.get<
      ApiListResponse<IntelligenceHotspot>
    >('/locations/hotspots/')

    return normalizeList(response.data).filter(
      (hotspot) => hotspot.is_active,
    )
  },

  async getMapData(): Promise<IntelligenceMapData> {
    const [
      districts,
      routes,
      hotspots,
    ] = await Promise.all([
      this.getDistricts(),
      this.getRoutes(),
      this.getHotspots(),
    ])

    return {
      districts,
      routes,
      hotspots,
    }
  },
}