export type RiskLevel =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'


export type RouteType =
  | 'domestic'
  | 'cross_border'


export type TransportMode =
  | 'road'
  | 'rail'
  | 'water'
  | 'air'
  | 'mixed'


export type HotspotType =
  | 'transit_hub'
  | 'border_area'
  | 'urban_center'
  | 'industrial_area'
  | 'coastal_area'
  | 'other'


export interface District {
  id: number
  name: string
  slug: string
  division: string
  division_display: string
  latitude: string
  longitude: string
}


export interface IntelligenceRoute {
  id: number
  name: string

  origin: District
  destination: District

  route_type: RouteType
  route_type_display: string

  transport_mode: TransportMode
  transport_mode_display: string

  risk_level: RiskLevel
  risk_level_display: string

  description: string
  evidence_summary: string

  is_verified: boolean
  is_active: boolean

  created_by_name: string | null
  created_at: string
  updated_at: string
}


export interface IntelligenceHotspot {
  id: number
  name: string

  district: District

  latitude: string
  longitude: string

  hotspot_type: HotspotType
  hotspot_type_display: string

  recent_case_count: number
  active_route_count: number
  verified_route_count: number
  vulnerability_score: number

  risk_score: number
  risk_level: RiskLevel
  risk_level_display: string

  risk_factors: Record<string, unknown>
  risk_explanation: string
  last_assessed_at: string | null

  is_verified: boolean
  is_active: boolean

  created_by_name: string | null
  created_at: string
  updated_at: string
}


export interface MapFilters {
  riskLevel: RiskLevel | 'all'
  routeType: RouteType | 'all'
  transportMode: TransportMode | 'all'
  division: string
  search: string
  showDistricts: boolean
  showRoutes: boolean
  showHotspots: boolean
  verifiedOnly: boolean
}


export interface MapCoordinates {
  latitude: number
  longitude: number
}


export interface IntelligenceMapData {
  districts: District[]
  routes: IntelligenceRoute[]
  hotspots: IntelligenceHotspot[]
}


export interface IntelligenceMapMetrics {
  totalDistricts: number
  activeRoutes: number
  highRiskRoutes: number
  activeHotspots: number
  highRiskHotspots: number
  criticalLocations: number
  verifiedRoutes: number
  verifiedHotspots: number
}


export interface RiskAppearance {
  color: string
  backgroundColor: string
  borderColor: string
  label: string
}