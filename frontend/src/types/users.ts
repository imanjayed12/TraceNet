export type UserRole =
  | 'police'
  | 'ngo'
  | 'analyst'
  | 'government'
  | 'admin'


export type UserAccessStatus =
  | 'pending'
  | 'approved'
  | 'emergency'
  | 'rejected'


export interface ManagedUser {
  id: number
  email: string
  full_name: string
  phone: string
  organization: string

  role: UserRole
  role_display: string

  access_status: UserAccessStatus
  access_status_display: string

  is_active: boolean
  is_staff: boolean
  is_superuser: boolean

  date_joined: string
  last_login: string | null
}


export interface UserManagementFilters {
  search: string
  role: UserRole | 'all'
  accessStatus: UserAccessStatus | 'all'
  activity: 'all' | 'active' | 'inactive'
}


export interface UserApiFilters {
  search?: string
  role?: UserRole
  access_status?: UserAccessStatus
  is_active?: boolean
}


export interface UpdateManagedUserPayload {
  role?: UserRole
  access_status?: UserAccessStatus
  is_active?: boolean
}


export interface UserActionResponse {
  detail: string
  user: ManagedUser
}


export interface UserManagementMetrics {
  total: number
  pending: number
  approved: number
  active: number
  inactive: number
  administrators: number
}