export interface CaseSummary {
  id?: number
  reference_code: string
  title: string
  category: string
  category_display?: string
  status: string
  status_display?: string
  priority: string
  priority_display?: string
  total_victims?: number
  is_verified: boolean
  updated_at: string
  incident_district?: {
    id: number
    name: string
    slug: string
    division: string
    division_display: string
    latitude: string
    longitude: string
  }
}


export interface RouteSummary {
  id: number
  name: string
  route_type: string
  route_type_display?: string
  transport_mode: string
  transport_mode_display?: string
  risk_level: string
  risk_level_display?: string
  is_verified: boolean
  is_active: boolean
  updated_at?: string
  origin?: {
    id: number
    name: string
    slug: string
  }
  destination?: {
    id: number
    name: string
    slug: string
  }
}


export interface HotspotSummary {
  id: number
  name: string
  hotspot_type: string
  hotspot_type_display?: string
  risk_score: number
  risk_level: string
  risk_level_display?: string
  is_verified: boolean
  is_active: boolean
  updated_at?: string
  district?: {
    id: number
    name: string
    slug: string
  }
}


export interface AlertSummary {
  id: number
  alert_type: string
  severity: string
  status: string
  title: string
  description?: string
  recipient_count?: number
  created_at: string
}


export interface AlertInboxItem {
  id: number
  alert_id: number
  alert_type: string
  severity: string
  title: string
  delivery_status: string
  is_read: boolean
  is_acknowledged: boolean
  alert_created_at: string
}


export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}


export type ApiCollection<T> =
  | T[]
  | PaginatedResponse<T>


export interface DashboardData {
  cases: CaseSummary[]
  routes: RouteSummary[]
  hotspots: HotspotSummary[]
  alerts: AlertSummary[]
  inbox: AlertInboxItem[]
}


export interface DashboardMetrics {
  totalCases: number
  activeCases: number
  criticalCases: number
  verifiedCases: number
  activeRoutes: number
  highRiskRoutes: number
  activeHotspots: number
  highRiskHotspots: number
  activeAlerts: number
  unreadAlerts: number
  unacknowledgedAlerts: number
}


export interface StatusChartItem {
  name: string
  value: number
}


export interface DashboardViewModel {
  data: DashboardData
  metrics: DashboardMetrics
  caseStatusChart: StatusChartItem[]
  casePriorityChart: StatusChartItem[]
  recentCases: CaseSummary[]
  recentAlerts: AlertSummary[]
}