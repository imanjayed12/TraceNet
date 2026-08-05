import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  Eye,
  FileBarChart,
  FileJson,
  FileSpreadsheet,
  FileText,
  Filter,
  LoaderCircle,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { isAxiosError } from 'axios'

import { reportsApi } from '../../api/reports'
import { AppShell } from '../../components/layout/AppShell'
import { useAuth } from '../../hooks/useAuth'

import type {
  CreateReportPayload,
  Report,
  ReportFilters,
  ReportOutputFormat,
  ReportStatus,
  ReportType,
} from '../../types/reports'


const reportTypeOptions: Array<{
  value: ReportType
  label: string
}> = [
  {
    value: 'executive_summary',
    label: 'Executive summary',
  },
  {
    value: 'case_analysis',
    label: 'Case analysis',
  },
  {
    value: 'geographic_risk',
    label: 'Geographic risk',
  },
  {
    value: 'route_analysis',
    label: 'Route analysis',
  },
  {
    value: 'alert_analysis',
    label: 'Alert analysis',
  },
  {
    value: 'audit_compliance',
    label: 'Audit compliance',
  },
]


const outputFormatOptions: Array<{
  value: ReportOutputFormat
  label: string
}> = [
  {
    value: 'pdf',
    label: 'PDF document',
  },
  {
    value: 'csv',
    label: 'CSV spreadsheet',
  },
  {
    value: 'json',
    label: 'JSON data',
  },
]


const initialFilters: ReportFilters = {
  search: '',
  reportType: 'all',
  outputFormat: 'all',
  status: 'all',
}


const initialCreatePayload: CreateReportPayload = {
  title: '',
  report_type: 'executive_summary',
  output_format: 'pdf',
  date_from: null,
  date_to: null,
  filters: {},
}


function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (isAxiosError(error)) {
    const data = error.response?.data

    if (
      data &&
      typeof data === 'object' &&
      'detail' in data &&
      typeof data.detail === 'string'
    ) {
      return data.detail
    }

    if (data && typeof data === 'object') {
      const firstValue = Object.values(data)[0]

      if (Array.isArray(firstValue)) {
        return firstValue
          .map(String)
          .join(' ')
      }

      if (typeof firstValue === 'string') {
        return firstValue
      }
    }

    if (!error.response) {
      return (
        'Unable to connect to the TraceNet server. ' +
        'Please check that the backend is running.'
      )
    }
  }

  return fallback
}


function formatDate(value: string | null): string {
  if (!value) {
    return 'Not generated'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}


function humanizeKey(value: string): string {
  return value
    .replaceAll('_', ' ')
    .replace(
      /\b\w/g,
      (character) => character.toUpperCase(),
    )
}


function SummaryValue({
  value,
}: {
  value: unknown
}) {
  if (value === null || value === undefined) {
    return (
      <span className="text-slate-500">
        Not recorded
      </span>
    )
  }

  if (typeof value === 'boolean') {
    return <span>{value ? 'Yes' : 'No'}</span>
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number'
  ) {
    return <span>{String(value)}</span>
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <span className="text-slate-500">
          No records
        </span>
      )
    }

    return (
      <div className="mt-2 space-y-2">
        {value.map((item, index) => (
          <div
            key={index}
            className="rounded-lg border border-slate-200 bg-white p-3"
          >
            {(
              item &&
              typeof item === 'object' &&
              !Array.isArray(item)
            ) ? (
              <div className="space-y-2">
                {Object.entries(item).map(
                  ([itemKey, itemValue]) => (
                    <div
                      key={itemKey}
                      className="flex items-start justify-between gap-4 text-sm"
                    >
                      <span className="text-slate-500">
                        {humanizeKey(itemKey)}
                      </span>

                      <span className="text-right font-semibold text-slate-900">
                        <SummaryValue value={itemValue} />
                      </span>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <SummaryValue value={item} />
            )}
          </div>
        ))}
      </div>
    )
  }

  if (typeof value === 'object') {
    return (
      <div className="mt-2 space-y-3">
        {Object.entries(value).map(
          ([objectKey, objectValue]) => (
            <div
              key={objectKey}
              className="border-t border-slate-200 pt-3 first:border-t-0 first:pt-0"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {humanizeKey(objectKey)}
              </p>

              <div className="mt-1 text-sm font-semibold text-slate-900">
                <SummaryValue value={objectValue} />
              </div>
            </div>
          ),
        )}
      </div>
    )
  }

  return <span>{String(value)}</span>
}


function getFormatIcon(
  format: ReportOutputFormat,
) {
  if (format === 'pdf') {
    return FileText
  }

  if (format === 'csv') {
    return FileSpreadsheet
  }

  return FileJson
}


function statusAppearance(status: ReportStatus) {
  if (status === 'completed') {
    return {
      label: 'Completed',
      classes: 'bg-emerald-50 text-emerald-700',
    }
  }

  if (status === 'failed') {
    return {
      label: 'Failed',
      classes: 'bg-red-50 text-red-700',
    }
  }

  if (status === 'processing') {
    return {
      label: 'Processing',
      classes: 'bg-blue-50 text-blue-700',
    }
  }

  return {
    label: 'Pending',
    classes: 'bg-amber-50 text-amber-700',
  }
}


export function ReportsPage() {
  const { user } = useAuth()

  const [reports, setReports] = useState<Report[]>([])
  const [filters, setFilters] =
    useState<ReportFilters>(initialFilters)

  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [successMessage, setSuccessMessage] =
    useState('')

  const [createModalOpen, setCreateModalOpen] =
    useState(false)
  const [createPayload, setCreatePayload] =
    useState<CreateReportPayload>(
      initialCreatePayload,
    )
  const [createError, setCreateError] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const [selectedReport, setSelectedReport] =
    useState<Report | null>(null)
  const [downloadingId, setDownloadingId] =
    useState<number | null>(null)

  const canGenerateReports = (
    user?.role === 'admin' ||
    user?.role === 'analyst'
  )

  const loadReports = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')

    try {
      const response = await reportsApi.getReports()
      setReports(response)
    } catch (error) {
      setLoadError(
        getErrorMessage(
          error,
          'Unable to load report records.',
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadReports()
  }, [loadReports])

  const filteredReports = useMemo(() => {
    const search = filters.search
      .trim()
      .toLowerCase()

    return reports.filter((report) => {
      const matchesSearch = (
        !search ||
        report.title.toLowerCase().includes(search) ||
        report.generated_by_name
          .toLowerCase()
          .includes(search) ||
        report.report_type_display
          .toLowerCase()
          .includes(search)
      )

      const matchesType = (
        filters.reportType === 'all' ||
        report.report_type === filters.reportType
      )

      const matchesFormat = (
        filters.outputFormat === 'all' ||
        report.output_format === filters.outputFormat
      )

      const matchesStatus = (
        filters.status === 'all' ||
        report.status === filters.status
      )

      return (
        matchesSearch &&
        matchesType &&
        matchesFormat &&
        matchesStatus
      )
    })
  }, [filters, reports])

  const metrics = useMemo(() => {
    return {
      total: reports.length,
      completed: reports.filter(
        (report) => report.status === 'completed',
      ).length,
      processing: reports.filter(
        (report) => (
          report.status === 'pending' ||
          report.status === 'processing'
        ),
      ).length,
      failed: reports.filter(
        (report) => report.status === 'failed',
      ).length,
    }
  }, [reports])

  const clearFilters = () => {
    setFilters(initialFilters)
  }

  const openCreateModal = () => {
    setCreatePayload(initialCreatePayload)
    setCreateError('')
    setCreateModalOpen(true)
  }

  const closeCreateModal = () => {
    if (isCreating) {
      return
    }

    setCreateModalOpen(false)
    setCreateError('')
  }

  const handleCreateReport = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()
    setCreateError('')
    setSuccessMessage('')

    const title = createPayload.title.trim()

    if (!title) {
      setCreateError('Enter a report title.')
      return
    }

    if (
      createPayload.date_from &&
      createPayload.date_to &&
      createPayload.date_from > createPayload.date_to
    ) {
      setCreateError(
        'The start date cannot be after the end date.',
      )
      return
    }

    setIsCreating(true)

    try {
      const createdReport =
        await reportsApi.createReport({
          ...createPayload,
          title,
        })

      setReports((currentReports) => [
        createdReport,
        ...currentReports,
      ])

      setCreateModalOpen(false)
      setCreatePayload(initialCreatePayload)
      setSuccessMessage(
        'Report generated successfully and is ready for review.',
      )
    } catch (error) {
      setCreateError(
        getErrorMessage(
          error,
          'Unable to generate the report.',
        ),
      )
    } finally {
      setIsCreating(false)
    }
  }

  const handleDownload = async (report: Report) => {
    setDownloadingId(report.id)
    setLoadError('')

    try {
      await reportsApi.downloadReport(report)
    } catch (error) {
      setLoadError(
        getErrorMessage(
          error,
          'Unable to download this report.',
        ),
      )
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <AppShell activeNavigation="reports">
      <main className="px-4 py-7 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1540px]">
          <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-teal-700">
                <FileBarChart size={18} />
                Analytics and reporting
              </div>

              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                Reports & analytics
              </h1>

              <p className="mt-2 max-w-3xl text-slate-600">
                Generate role-authorized operational reports,
                review analytical summaries and export secure
                intelligence in multiple formats.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void loadReports()}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw
                  size={18}
                  className={
                    isLoading ? 'animate-spin' : ''
                  }
                />
                Refresh reports
              </button>

              {canGenerateReports && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0d5575] px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-[#083f59]"
                >
                  <Plus size={18} />
                  Generate report
                </button>
              )}
            </div>
          </section>

          {successMessage && (
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              <CheckCircle2 size={19} />
              {successMessage}
            </div>
          )}

          {loadError && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              <AlertCircle
                size={19}
                className="mt-0.5 shrink-0"
              />
              <span>{loadError}</span>
            </div>
          )}

          <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Total reports"
              value={metrics.total}
              description="Authorized records"
              icon={FileBarChart}
              iconClasses="bg-[#0d5575] text-white"
            />

            <MetricCard
              label="Completed"
              value={metrics.completed}
              description="Ready for download"
              icon={CheckCircle2}
              iconClasses="bg-teal-50 text-teal-700"
            />

            <MetricCard
              label="In progress"
              value={metrics.processing}
              description="Pending or processing"
              icon={Clock3}
              iconClasses="bg-blue-50 text-blue-700"
            />

            <MetricCard
              label="Failed"
              value={metrics.failed}
              description="Requires review"
              icon={AlertCircle}
              iconClasses="bg-red-50 text-red-700"
            />
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-slate-950">
              <Filter
                size={20}
                className="text-teal-700"
              />
              Search and filters
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
              <input
                type="search"
                value={filters.search}
                onChange={(event) => {
                  setFilters((current) => ({
                    ...current,
                    search: event.target.value,
                  }))
                }}
                placeholder="Search report title, type or creator..."
                className="h-12 rounded-xl border border-slate-300 px-4 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />

              <select
                value={filters.reportType}
                onChange={(event) => {
                  setFilters((current) => ({
                    ...current,
                    reportType: event.target.value as (
                      ReportFilters['reportType']
                    ),
                  }))
                }}
                className="h-12 rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-teal-500"
              >
                <option value="all">
                  All report types
                </option>

                {reportTypeOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={filters.outputFormat}
                onChange={(event) => {
                  setFilters((current) => ({
                    ...current,
                    outputFormat: event.target.value as (
                      ReportFilters['outputFormat']
                    ),
                  }))
                }}
                className="h-12 rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-teal-500"
              >
                <option value="all">
                  All formats
                </option>
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>

              <select
                value={filters.status}
                onChange={(event) => {
                  setFilters((current) => ({
                    ...current,
                    status: event.target.value as (
                      ReportFilters['status']
                    ),
                  }))
                }}
                className="h-12 rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-teal-500"
              >
                <option value="all">
                  All statuses
                </option>
                <option value="completed">
                  Completed
                </option>
                <option value="processing">
                  Processing
                </option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
              >
                <X size={16} />
                Clear all filters
              </button>
            </div>
          </section>

          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
              <div>
                <h2 className="font-bold text-slate-950">
                  Generated report records
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {filteredReports.length} authorized reports found
                </p>
              </div>

              <span className="rounded-full bg-teal-50 px-4 py-2 text-xs font-bold text-teal-700">
                Role-based analytics
              </span>
            </div>

            {isLoading ? (
              <div className="grid min-h-72 place-items-center">
                <div className="text-center">
                  <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-teal-700" />
                  <p className="mt-3 text-sm text-slate-500">
                    Loading reports...
                  </p>
                </div>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="grid min-h-72 place-items-center px-5 text-center">
                <div>
                  <FileBarChart className="mx-auto h-11 w-11 text-slate-300" />
                  <h3 className="mt-4 font-bold text-slate-950">
                    No matching reports
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Generate a report or change the current
                    filters.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px]">
                  <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-4">
                        Report
                      </th>
                      <th className="px-5 py-4">
                        Type
                      </th>
                      <th className="px-5 py-4">
                        Format
                      </th>
                      <th className="px-5 py-4">
                        Status
                      </th>
                      <th className="px-5 py-4">
                        Generated by
                      </th>
                      <th className="px-5 py-4">
                        Generated
                      </th>
                      <th className="px-5 py-4 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredReports.map((report) => {
                      const FormatIcon = getFormatIcon(
                        report.output_format,
                      )
                      const appearance =
                        statusAppearance(report.status)

                      return (
                        <tr
                          key={report.id}
                          className="transition hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-[#0d5575]">
                                <FormatIcon size={20} />
                              </div>

                              <div>
                                <p className="font-semibold text-slate-950">
                                  {report.title}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  ID: {report.id}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-700">
                            {report.report_type_display}
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase text-slate-700">
                              {report.output_format}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${appearance.classes}`}
                            >
                              {appearance.label}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-medium text-slate-800">
                              {report.generated_by_name}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {report.generated_by_email}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {formatDate(
                              report.generated_at ??
                              report.created_at,
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedReport(report)
                                }}
                                className="grid h-9 w-9 place-items-center rounded-full border border-slate-300 text-slate-600 transition hover:bg-slate-100"
                                aria-label="View report summary"
                                title="View summary"
                              >
                                <Eye size={17} />
                              </button>

                              <button
                                type="button"
                                disabled={
                                  report.status !== 'completed' ||
                                  downloadingId === report.id
                                }
                                onClick={() => {
                                  void handleDownload(report)
                                }}
                                className="grid h-9 w-9 place-items-center rounded-full border border-slate-300 text-[#0d5575] transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="Download report"
                                title="Download report"
                              >
                                {downloadingId === report.id ? (
                                  <LoaderCircle
                                    size={17}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Download size={17} />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

      {createModalOpen && (
        <CreateReportModal
          payload={createPayload}
          error={createError}
          isCreating={isCreating}
          onChange={setCreatePayload}
          onClose={closeCreateModal}
          onSubmit={handleCreateReport}
        />
      )}

      {selectedReport && (
        <ReportSummaryModal
          report={selectedReport}
          downloading={
            downloadingId === selectedReport.id
          }
          onClose={() => setSelectedReport(null)}
          onDownload={() => {
            void handleDownload(selectedReport)
          }}
        />
      )}
    </AppShell>
  )
}


function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  iconClasses,
}: {
  label: string
  value: number
  description: string
  icon: typeof FileBarChart
  iconClasses: string
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-950">
            {value}
          </p>
          <p className="mt-3 text-sm text-slate-500">
            {description}
          </p>
        </div>

        <div
          className={`grid h-12 w-12 place-items-center rounded-xl ${iconClasses}`}
        >
          <Icon size={22} />
        </div>
      </div>
    </article>
  )
}


function CreateReportModal({
  payload,
  error,
  isCreating,
  onChange,
  onClose,
  onSubmit,
}: {
  payload: CreateReportPayload
  error: string
  isCreating: boolean
  onChange: React.Dispatch<
    React.SetStateAction<CreateReportPayload>
  >
  onClose: () => void
  onSubmit: (
    event: React.FormEvent<HTMLFormElement>,
  ) => void
}) {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
      <form
        onSubmit={onSubmit}
        className="my-6 w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
              Secure report generation
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              Generate operational report
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isCreating}
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            aria-label="Close report form"
          >
            <X size={20} />
          </button>
        </header>

        <div className="space-y-5 p-6">
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-medium text-red-700">
              <AlertCircle
                size={19}
                className="mt-0.5 shrink-0"
              />
              {error}
            </div>
          )}

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Report title
            </span>
            <input
              type="text"
              value={payload.title}
              onChange={(event) => {
                onChange((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }}
              placeholder="Example: August operational intelligence summary"
              className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="text-sm font-semibold text-slate-700">
                Report type
              </span>
              <select
                value={payload.report_type}
                onChange={(event) => {
                  onChange((current) => ({
                    ...current,
                    report_type: event.target.value as ReportType,
                  }))
                }}
                className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-teal-500"
              >
                {reportTypeOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="text-sm font-semibold text-slate-700">
                Output format
              </span>
              <select
                value={payload.output_format}
                onChange={(event) => {
                  onChange((current) => ({
                    ...current,
                    output_format: event.target.value as (
                      ReportOutputFormat
                    ),
                  }))
                }}
                className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-teal-500"
              >
                {outputFormatOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
            <div className="flex gap-3">
              <CalendarDays className="mt-0.5 shrink-0 text-teal-700" />
              <div>
                <p className="font-semibold text-teal-900">
                  Optional reporting period
                </p>
                <p className="mt-1 text-sm text-teal-700">
                  Leave both fields empty to include all
                  authorized operational data.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="text-sm font-semibold text-slate-700">
                Start date
              </span>
              <input
                type="date"
                value={payload.date_from ?? ''}
                onChange={(event) => {
                  onChange((current) => ({
                    ...current,
                    date_from:
                      event.target.value || null,
                  }))
                }}
                className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-teal-500"
              />
            </label>

            <label>
              <span className="text-sm font-semibold text-slate-700">
                End date
              </span>
              <input
                type="date"
                value={payload.date_to ?? ''}
                onChange={(event) => {
                  onChange((current) => ({
                    ...current,
                    date_to:
                      event.target.value || null,
                  }))
                }}
                className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-teal-500"
              />
            </label>
          </div>
        </div>

        <footer className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            disabled={isCreating}
            className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isCreating}
            className="inline-flex min-w-40 items-center justify-center gap-2 rounded-xl bg-[#0d5575] px-5 py-3 font-semibold text-white hover:bg-[#083f59] disabled:opacity-60"
          >
            {isCreating ? (
              <>
                <LoaderCircle
                  size={18}
                  className="animate-spin"
                />
                Generating...
              </>
            ) : (
              <>
                <BarChart3 size={18} />
                Generate report
              </>
            )}
          </button>
        </footer>
      </form>
    </div>
  )
}


function ReportSummaryModal({
  report,
  downloading,
  onClose,
  onDownload,
}: {
  report: Report
  downloading: boolean
  onClose: () => void
  onDownload: () => void
}) {
  const summaryEntries = Object.entries(
    report.summary ?? {},
  )
  const appearance = statusAppearance(report.status)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <section className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex shrink-0 items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
              Report summary
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              {report.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            aria-label="Close report summary"
          >
            <X size={20} />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryField
              label="Report type"
              value={report.report_type_display}
            />
            <SummaryField
              label="Output format"
              value={report.output_format_display}
            />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Status
              </p>
              <span
                className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${appearance.classes}`}
              >
                {appearance.label}
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <SummaryField
              label="Generated by"
              value={report.generated_by_name}
            />
            <SummaryField
              label="Generated at"
              value={formatDate(
                report.generated_at ??
                report.created_at,
              )}
            />
          </div>

          <div>
            <h3 className="font-bold text-slate-950">
              Analytical summary
            </h3>

            {summaryEntries.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                No summary metrics are available.
              </div>
            ) : (
            <div className="mt-3 space-y-3">
                {summaryEntries.map(([key, value]) => (
                <SummarySection
                key={key}
                title={humanizeKey(key)}
                value={value}
                />
                ))}
            </div>
            )}
          </div>

          {report.error_message && (
            <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
              {report.error_message}
            </div>
          )}
        </div>

        <footer className="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>

          <button
            type="button"
            onClick={onDownload}
            disabled={
              report.status !== 'completed' ||
              downloading
            }
            className="inline-flex items-center gap-2 rounded-xl bg-[#0d5575] px-5 py-3 font-semibold text-white hover:bg-[#083f59] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {downloading ? (
              <LoaderCircle
                size={18}
                className="animate-spin"
              />
            ) : (
              <Download size={18} />
            )}
            Download {report.output_format.toUpperCase()}
          </button>
        </footer>
      </section>
    </div>
  )
}



function SummarySection({
  title,
  value,
}: {
  title: string
  value: unknown
}) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <button
        type="button"
        onClick={() => {
          setIsOpen((current) => !current)
        }}
        className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition hover:bg-slate-100"
        aria-expanded={isOpen}
      >
        <span className="text-xs font-bold uppercase tracking-wide text-slate-600">
          {title}
        </span>

        <ChevronDown
          size={18}
          className={`shrink-0 text-slate-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="border-t border-slate-200 bg-white px-4 pb-4 pt-3">
          <div className="break-words text-slate-900">
            <SummaryValue value={value} />
          </div>
        </div>
      )}
    </section>
  )
}

function SummaryField({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 font-semibold text-slate-900">
        {value}
      </p>
    </div>
  )
}
