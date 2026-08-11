export type CaseCategory =
  | 'suspected'
  | 'confirmed'
  | 'rescue'
  | 'route_intelligence'
  | 'other'


export type CaseStatus =
  | 'reported'
  | 'under_review'
  | 'investigating'
  | 'action_required'
  | 'resolved'
  | 'closed'


export type CasePriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'


export type CaseConfidentiality =
  | 'internal'
  | 'restricted'
  | 'highly_restricted'


export type CaseUpdateType =
  | 'status_change'
  | 'note'
  | 'assignment'
  | 'verification'
  | 'other'


export type VictimAgeGroup =
  | 'child'
  | 'adolescent'
  | 'adult'
  | 'unknown'


export type VictimGender =
  | 'female'
  | 'male'
  | 'other'
  | 'unknown'


export type ExploitationType =
  | 'labour'
  | 'sexual'
  | 'forced_marriage'
  | 'domestic_servitude'
  | 'organ_removal'
  | 'other'
  | 'unknown'


export type VictimSupportStatus =
  | 'identified'
  | 'rescued'
  | 'referred'
  | 'receiving_support'
  | 'reintegrating'
  | 'unknown'


export type VictimSupportNeed =
  | 'medical'
  | 'legal'
  | 'shelter'
  | 'counselling'
  | 'family_support'
  | 'education'
  | 'livelihood'


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
  category: CaseCategory
  category_display: string
  status: CaseStatus
  status_display: string
  priority: CasePriority
  priority_display: string
  confidentiality: CaseConfidentiality
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


export interface CaseCreateData {
  title: string
  summary: string
  category: CaseCategory
  priority: CasePriority
  confidentiality: CaseConfidentiality
  incident_district_id: number
  location_description: string
  latitude: string | null
  longitude: string | null
  incident_date: string
  total_victims: number
  minor_victims: number
}


export interface CaseUpdate {
  id: number
  case_reference: string
  update_type: CaseUpdateType
  update_type_display: string
  previous_status: CaseStatus | ''
  new_status: CaseStatus | ''
  note: string
  is_internal: boolean
  changed_by_name: string | null
  created_at: string
}


export interface CaseUpdateCreateData {
  case_id: number
  update_type: 'note' | 'other'
  note: string
  is_internal: false
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
  age_group: VictimAgeGroup
  age_group_display: string
  gender: VictimGender
  gender_display: string
  exploitation_type: ExploitationType
  exploitation_type_display: string
  support_status: VictimSupportStatus
  support_status_display: string
  country_of_origin: string
  support_needs: VictimSupportNeed[]
  protected_note: string
  recorded_by_name: string | null
  created_at: string
  updated_at: string
}


export interface VictimProfileMutationData {
  case_id: number
  age_group: VictimAgeGroup
  gender: VictimGender
  exploitation_type: ExploitationType
  support_status: VictimSupportStatus
  country_of_origin: string
  support_needs: VictimSupportNeed[]
  protected_note: string
}


export interface CaseDetailBundle {
  caseRecord: CaseDetail
  updates: CaseUpdate[]
  routeLinks: CaseRouteLink[]
  victims: VictimProfile[]
}