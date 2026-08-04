export type AlertType =
  | 'case'
  | 'hotspot'
  | 'route'
  | 'emergency_access'
  | 'system'
  | 'manual'


export type AlertSeverity =
  | 'info'
  | 'warning'
  | 'high'
  | 'critical'


export type AlertStatus =
  | 'active'
  | 'resolved'
  | 'cancelled'


export type TargetRole =
  | 'police'
  | 'ngo'
  | 'analyst'
  | 'government'
  | 'admin'


export type DeliveryStatus =
  | 'pending'
  | 'delivered'
  | 'failed'


export interface AlertRecord {
  id: number

  alert_type: AlertType
  alert_type_display: string

  severity: AlertSeverity
  severity_display: string

  status: AlertStatus
  status_display: string

  title: string
  message: string

  case_reference: string | null
  hotspot_name: string | null
  route_name: string | null

  target_roles: TargetRole[]
  created_by_name: string | null
  recipient_count: number

  expires_at: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}


export interface AlertInboxItem {
  id: number
  alert_id: number

  alert_type: AlertType
  severity: AlertSeverity

  title: string
  message: string

  case_reference: string | null
  hotspot_name: string | null
  route_name: string | null

  delivery_status: DeliveryStatus

  is_read: boolean
  read_at: string | null

  is_acknowledged: boolean
  acknowledged_at: string | null

  expires_at: string | null
  alert_created_at: string
}


export interface AlertCreateData {
  alert_type: AlertType
  severity: AlertSeverity

  title: string
  message: string

  case_reference?: string | null
  hotspot_id?: number | null
  route_id?: number | null

  target_roles: TargetRole[]
  recipient_ids?: number[]

  expires_at?: string | null
}


export interface AlertUpdateData {
  severity?: AlertSeverity
  status?: AlertStatus
  title?: string
  message?: string
  expires_at?: string | null
}


export interface AlertListFilters {
  search?: string
  alert_type?: AlertType
  severity?: AlertSeverity
  status?: AlertStatus
}


export interface AlertInboxFilters {
  is_read?: boolean
  is_acknowledged?: boolean
  severity?: AlertSeverity
}


export interface AlertActionResponse {
  detail: string
  alert: AlertInboxItem
}