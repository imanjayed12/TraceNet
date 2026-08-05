export type AuditAction =
  | 'login'
  | 'login_failed'
  | 'logout'
  | 'create'
  | 'view'
  | 'update'
  | 'delete'
  | 'export'
  | 'approve_user'
  | 'reject_user'
  | 'emergency_invite'
  | 'emergency_access'
  | 'emergency_revoke'
  | 'alert_read'
  | 'alert_acknowledge'


export type AuditSuccessFilter =
  | 'all'
  | 'true'
  | 'false'


export interface AuditLog {
  id: number
  created_at: string

  actor_email: string
  actor_name: string

  action: AuditAction
  action_display: string

  resource_type: string
  resource_id: string
  resource_label: string

  request_method: string
  request_path: string
  ip_address: string | null

  status_code: number | null
  success: boolean

  metadata: Record<string, unknown>
}


export interface AuditFilters {
  search: string
  action: AuditAction | 'all'
  resourceType: string
  actorEmail: string
  success: AuditSuccessFilter
  dateFrom: string
  dateTo: string
}


export interface AuditMetrics {
  totalEvents: number
  successfulEvents: number
  failedEvents: number
  authenticationEvents: number
  securitySensitiveEvents: number
  uniqueActors: number
}


export interface AuditApiFilters {
  search?: string
  action?: AuditAction
  resource_type?: string
  actor_email?: string
  success?: boolean
  date_from?: string
  date_to?: string
}