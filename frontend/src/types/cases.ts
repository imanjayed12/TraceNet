export interface CaseDistrict {
  id: number
  name: string
  slug: string
  division: string
  division_display: string
  latitude: string
  longitude: string
}


export interface CaseDetail {
  id: number
  reference_code: string
  title: string
  summary: string
  category: string
  category_display: string
  status: string
  status_display: string
  priority: string
  priority_display: string
  confidentiality: string
  confidentiality_display: string
  incident_district: CaseDistrict
  location_description: string
  latitude: string | null
  longitude: string | null
  incident_date: string
  total_victims: number
  minor_victims: number
  is_verified: boolean
  reported_by_name: string | null
  assigned_to_id: number | null
  assigned_to_name: string | null
  reported_at: string
  updated_at: string
  resolved_at: string | null
}


export interface CaseUpdate {
  id: number
  case_reference: string
  update_type: string
  update_type_display: string
  previous_status: string
  new_status: string
  note: string
  is_internal: boolean
  changed_by_name: string | null
  created_at: string
}


export interface LinkedDistrict {
  id: number
  name: string
  slug: string
  division?: string
  division_display?: string
  latitude?: string
  longitude?: string
}


export interface LinkedRoute {
  id: number
  name: string
  origin: LinkedDistrict
  destination: LinkedDistrict
  route_type: string
  route_type_display: string
  transport_mode: string
  transport_mode_display: string
  risk_level: string
  risk_level_display: string
  is_verified: boolean
  is_active: boolean
}


export interface CaseRouteLink {
  id: number
  case_reference: string
  route: LinkedRoute
  relationship_type: string
  relationship_type_display: string
  confidence_level: string
  confidence_level_display: string
  evidence_note: string
  linked_by_name: string | null
  created_at: string
  updated_at: string
}


export interface VictimProfile {
  id: number
  anonymous_code: string
  case_reference: string
  age_group: string
  age_group_display: string
  gender: string
  gender_display: string
  exploitation_type: string
  exploitation_type_display: string
  support_status: string
  support_status_display: string
  country_of_origin: string
  support_needs: string
  protected_note: string
  recorded_by_name: string | null
  created_at: string
  updated_at: string
}


export interface CaseDetailBundle {
  caseRecord: CaseDetail
  updates: CaseUpdate[]
  routeLinks: CaseRouteLink[]
  victims: VictimProfile[]
}