export type ReportType =
  | 'executive_summary'
  | 'case_analysis'
  | 'geographic_risk'
  | 'route_analysis'
  | 'alert_analysis'
  | 'audit_compliance'


export type ReportOutputFormat =
  | 'json'
  | 'csv'
  | 'pdf'


export type ReportStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'


export interface Report {
  id: number
  title: string

  report_type: ReportType
  report_type_display: string

  output_format: ReportOutputFormat
  output_format_display: string

  status: ReportStatus
  status_display: string

  date_from: string | null
  date_to: string | null

  filters: Record<string, unknown>
  summary: Record<string, unknown>

  generated_by_name: string
  generated_by_email: string

  error_message: string
  generated_at: string | null
  created_at: string
  updated_at: string
}


export interface CreateReportPayload {
  title: string
  report_type: ReportType
  output_format: ReportOutputFormat
  date_from: string | null
  date_to: string | null
  filters: Record<string, unknown>
}


export interface ReportFilters {
  search: string
  reportType: ReportType | 'all'
  outputFormat: ReportOutputFormat | 'all'
  status: ReportStatus | 'all'
}


export interface ReportMetrics {
  total: number
  completed: number
  processing: number
  failed: number
  downloadable: number
}