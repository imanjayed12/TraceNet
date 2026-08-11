import { apiClient } from './client'

import type {
  District,
  IntelligenceRoute,
  RiskLevel,
  RouteType,
  TransportMode,
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


export interface RouteQueryFilters {
  search?: string
  riskLevel?: RiskLevel | 'all'
  routeType?: RouteType | 'all'
  transportMode?: TransportMode | 'all'
  verification?: 'all' | 'verified' | 'unverified'
  activity?: 'all' | 'active' | 'inactive'
  origin?: string
  destination?: string
}


export interface RouteMutationData {
  name: string
  origin_id: number
  destination_id: number
  route_type: RouteType
  transport_mode: TransportMode
  risk_level: RiskLevel
  description: string
  evidence_summary: string
  is_verified: boolean
  is_active: boolean
}


export type RouteSubmissionData =
  Omit<
    RouteMutationData,
    'is_verified' | 'is_active'
  >
  & Partial<
    Pick<
      RouteMutationData,
      'is_verified' | 'is_active'
    >
  >


function buildRouteParams(
  filters: RouteQueryFilters,
): Record<string, string> {
  const params: Record<string, string> = {}

  if (filters.search?.trim()) {
    params.search = filters.search.trim()
  }

  if (
    filters.riskLevel
    && filters.riskLevel !== 'all'
  ) {
    params.risk_level = filters.riskLevel
  }

  if (
    filters.routeType
    && filters.routeType !== 'all'
  ) {
    params.route_type = filters.routeType
  }

  if (
    filters.transportMode
    && filters.transportMode !== 'all'
  ) {
    params.transport_mode = filters.transportMode
  }

  if (
    filters.verification
    && filters.verification !== 'all'
  ) {
    params.is_verified = (
      filters.verification === 'verified'
        ? 'true'
        : 'false'
    )
  }

  if (filters.activity !== 'active') {
    params.include_inactive = 'true'
  }

  if (filters.origin?.trim()) {
    params.origin = filters.origin.trim()
  }

  if (filters.destination?.trim()) {
    params.destination = filters.destination.trim()
  }

  return params
}


export const routesApi = {
  async getRoutes(
    filters: RouteQueryFilters = {},
  ): Promise<IntelligenceRoute[]> {
    const response = await apiClient.get<
      ApiListResponse<IntelligenceRoute>
    >(
      '/locations/routes/',
      {
        params: buildRouteParams(filters),
      },
    )

    const routes = normalizeList(response.data)

    if (filters.activity === 'inactive') {
      return routes.filter(
        (route) => !route.is_active,
      )
    }

    return routes
  },

  async getRoute(
    routeId: number,
  ): Promise<IntelligenceRoute> {
    const response =
      await apiClient.get<IntelligenceRoute>(
        `/locations/routes/${routeId}/`,
      )

    return response.data
  },

  async getDistricts(): Promise<District[]> {
    const response = await apiClient.get<
      ApiListResponse<District>
    >('/locations/districts/')

    return normalizeList(response.data)
  },

  async createRoute(
    data: RouteSubmissionData,
  ): Promise<IntelligenceRoute> {
    const response =
      await apiClient.post<IntelligenceRoute>(
        '/locations/routes/',
        data,
      )

    return response.data
  },

  async updateRoute(
    routeId: number,
    data: Partial<RouteSubmissionData>,
  ): Promise<IntelligenceRoute> {
    const response =
      await apiClient.patch<IntelligenceRoute>(
        `/locations/routes/${routeId}/`,
        data,
      )

    return response.data
  },

  async deleteRoute(
    routeId: number,
  ): Promise<void> {
    await apiClient.delete(
      `/locations/routes/${routeId}/`,
    )
  },
}