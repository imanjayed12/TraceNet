export type UserRole =
  | 'admin'
  | 'police'
  | 'government'
  | 'analyst'
  | 'ngo'

export type AccessStatus =
  | 'pending'
  | 'approved'
  | 'emergency'
  | 'rejected'

export interface AuthUser {
  id: number
  email: string
  full_name: string
  phone: string
  organization: string
  role: UserRole
  is_active: boolean
  access_status: AccessStatus
}

export interface LoginResponse {
  access: string
  refresh: string
  user: AuthUser
}

export interface RefreshResponse {
  access: string
  refresh?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegistrationData {
  email: string
  full_name: string
  phone: string
  organization: string
  role: Exclude<UserRole, 'admin'>
  password: string
  password_confirm: string
}