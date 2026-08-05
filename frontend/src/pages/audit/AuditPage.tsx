import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Eye,
  Filter,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  X,
  XCircle,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { auditApi } from '../../api/audit'
import { AppShell } from '../../components/layout/AppShell'
import { useAuth } from '../../hooks/useAuth'
import { getApiErrorMessage } from '../../utils/apiError'

import type {
  AuditAction,
  AuditApiFilters,
  AuditFilters,
  AuditLog,
  AuditMetrics,
} from '../../types/audit'


const initialFilters: AuditFilters = {
  search: '',
  action: 'all',
  resourceType: '',
  actorEmail: '',
  success: 'all',
  dateFrom: '',
  dateTo: '',
}


const actionOptions: Array<{
  value: AuditAction
  label: string
}> = [
  {
    value: 'login',
    label: 'Login',
  },
  {
    value: 'login_failed',
    label: 'Login failed',
  },
  {
    value: 'logout',
    label: 'Logout',
  },
  {
    value: 'create',
    label: 'Create',
  },
  {
    value: 'view',
    label: 'View',
  },
  {
    value: 'update',
    label: 'Update',
  },
  {
    value: 'delete',
    label: 'Delete',
  },
  {
    value: 'export',
    label: 'Export',
  },
  {
    value: 'approve_user',
    label: 'Approve user',
  },
  {
    value: 'reject_user',
    label: 'Reject user',
  },
  {
    value: 'emergency_invite',
    label: 'Emergency invitation',
  },
  {
    value: 'emergency_access',
    label: 'Emergency access',
  },
  {
    value: 'emergency_revoke',
    label: 'Emergency revoke',
  },
  {
    value: 'alert_read',
    label: 'Alert read',
  },
  {
    value: 'alert_acknowledge',
    label: 'Alert acknowledged',
  },
]


const authenticationActions = new Set<AuditAction>([
  'login',
  'login_failed',
  'logout',
])


const securitySensitiveActions = new Set<AuditAction>([
  'login_failed',
  'delete',
  'approve_user',
  'reject_user',
  'emergency_invite',
  'emergency_access',
  'emergency_revoke',
])


function toApiFilters(
  filters: AuditFilters,
): AuditApiFilters {
  return {
    search: filters.search || undefined,
    action: (
      filters.action === 'all'
        ? undefined
        : filters.action
    ),
    resource_type:
      filters.resourceType || undefined,
    actor_email:
      filters.actorEmail || undefined,
    success: (
      filters.success === 'all'
        ? undefined
        : filters.success === 'true'
    ),
    date_from:
      filters.dateFrom || undefined,
    date_to:
      filters.dateTo || undefined,
  }
}


function calculateMetrics(
  logs: AuditLog[],
): AuditMetrics {
  const actors = new Set(
    logs
      .map((log) => log.actor_email)
      .filter(Boolean),
  )

  return {
    totalEvents: logs.length,
    successfulEvents: logs.filter(
      (log) => log.success,
    ).length,
    failedEvents: logs.filter(
      (log) => !log.success,
    ).length,
    authenticationEvents: logs.filter(
      (log) => (
        authenticationActions.has(log.action)
      ),
    ).length,
    securitySensitiveEvents: logs.filter(
      (log) => (
        securitySensitiveActions.has(log.action)
      ),
    ).length,
    uniqueActors: actors.size,
  }
}


function formatDateTime(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(
    'en-GB',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(date)
}


function humanizeKey(value: string): string {
  return value
    .replaceAll('_', ' ')
    .replace(
      /\b\w/g,
      (character) => character.toUpperCase(),
    )
}


function displayValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'Not recorded'
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  if (typeof value === 'object') {
    return JSON.stringify(
      value,
      null,
      2,
    )
  }

  return String(value)
}


function actionAppearance(action: AuditAction) {
  if (
    action === 'login_failed'
    || action === 'delete'
    || action === 'reject_user'
    || action === 'emergency_revoke'
  ) {
    return {
      className:
        'bg-red-50 text-red-700 ring-red-200',
      icon: AlertTriangle,
    }
  }

  if (
    action === 'emergency_invite'
    || action === 'emergency_access'
  ) {
    return {
      className:
        'bg-amber-50 text-amber-700 ring-amber-200',
      icon: KeyRound,
    }
  }

  if (
    action === 'approve_user'
    || action === 'create'
  ) {
    return {
      className:
        'bg-emerald-50 text-emerald-700 ring-emerald-200',
      icon: CheckCircle2,
    }
  }

  if (
    action === 'login'
    || action === 'logout'
  ) {
    return {
      className:
        'bg-blue-50 text-blue-700 ring-blue-200',
      icon: LockKeyhole,
    }
  }

  return {
    className:
      'bg-slate-100 text-slate-700 ring-slate-200',
    icon: Activity,
  }
}


function methodClassName(method: string): string {
  switch (method.toUpperCase()) {
    case 'POST':
      return 'bg-emerald-50 text-emerald-700'
    case 'PUT':
    case 'PATCH':
      return 'bg-amber-50 text-amber-700'
    case 'DELETE':
      return 'bg-red-50 text-red-700'
    case 'GET':
      return 'bg-blue-50 text-blue-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}


export function AuditPage() {
  const { user } = useAuth()

  const [logs, setLogs] = useState<AuditLog[]>([])
  const [filters, setFilters] = (
    useState<AuditFilters>(initialFilters)
  )
  const [selectedLog, setSelectedLog] = (
    useState<AuditLog | null>(null)
  )
  const [isLoading, setIsLoading] = (
    useState(true)
  )
  const [error, setError] = (
    useState<string | null>(null)
  )
  const [lastUpdated, setLastUpdated] = (
    useState<Date | null>(null)
  )

  const loadLogs = useCallback(
    async (
      requestedFilters: AuditApiFilters = {},
    ) => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await auditApi.getLogs(
          requestedFilters,
        )

        setLogs(response)
        setLastUpdated(new Date())
      } catch (requestError) {
        setError(
          getApiErrorMessage(requestError),
        )
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (user?.role === 'admin') {
      void loadLogs()
    } else {
      setIsLoading(false)
    }
  }, [
    loadLogs,
    user?.role,
  ])

  const metrics = useMemo(
    () => calculateMetrics(logs),
    [logs],
  )

  const resourceTypes = useMemo(
    () => (
      Array.from(
        new Set(
          logs
            .map((log) => log.resource_type)
            .filter(Boolean),
        ),
      ).sort()
    ),
    [logs],
  )

  const hasActiveFilters = useMemo(
    () => (
      filters.search !== ''
      || filters.action !== 'all'
      || filters.resourceType !== ''
      || filters.actorEmail !== ''
      || filters.success !== 'all'
      || filters.dateFrom !== ''
      || filters.dateTo !== ''
    ),
    [filters],
  )

  const handleSearch = () => {
    void loadLogs(
      toApiFilters(filters),
    )
  }

  const handleClearFilters = () => {
    setFilters(initialFilters)
    void loadLogs()
  }

  if (user?.role !== 'admin') {
    return (
      <AppShell activeNavigation="audit">
        <main className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-700">
              <LockKeyhole size={27} />
            </div>

            <h1 className="mt-5 text-2xl font-bold text-slate-950">
              Administrator access required
            </h1>

            <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-600">
              Audit and compliance records are restricted
              to approved TraceNet administrators.
            </p>
          </div>
        </main>
      </AppShell>
    )
  }

  return (
    <AppShell activeNavigation="audit">
      <main className="px-4 py-7 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1500px]">
          <PageHeader
            lastUpdated={lastUpdated}
            isLoading={isLoading}
            onRefresh={() => {
              void loadLogs(
                toApiFilters(filters),
              )
            }}
          />

          {error && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <CircleAlert
                size={19}
                className="mt-0.5 shrink-0"
              />

              <div className="flex-1">
                <p className="font-semibold">
                  Unable to load audit records
                </p>
                <p className="mt-1">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  void loadLogs(
                    toApiFilters(filters),
                  )
                }}
                className="font-semibold hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          <MetricsGrid metrics={metrics} />

          <AuditFiltersPanel
            filters={filters}
            resourceTypes={resourceTypes}
            hasActiveFilters={hasActiveFilters}
            isLoading={isLoading}
            onChange={setFilters}
            onSearch={handleSearch}
            onClear={handleClearFilters}
          />

          <AuditRecords
            logs={logs}
            isLoading={isLoading}
            onSelect={setSelectedLog}
          />
        </div>
      </main>

      {selectedLog && (
        <AuditDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </AppShell>
  )
}


function PageHeader({
  lastUpdated,
  isLoading,
  onRefresh,
}: {
  lastUpdated: Date | null
  isLoading: boolean
  onRefresh: () => void
}) {
  return (
    <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-teal-700">
          <ShieldCheck size={18} />
          Security and compliance oversight
        </div>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
          Audit &amp; compliance
        </h1>

        <p className="mt-2 max-w-3xl leading-7 text-slate-600">
          Review accountable system activity, authentication
          events and security-sensitive operations across the
          TraceNet platform.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {lastUpdated && (
          <p className="text-xs text-slate-500">
            Updated{' '}
            {lastUpdated.toLocaleTimeString(
              [],
              {
                hour: '2-digit',
                minute: '2-digit',
              },
            )}
          </p>
        )}

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={18}
            className={
              isLoading
                ? 'animate-spin'
                : ''
            }
          />
          Refresh audit log
        </button>
      </div>
    </div>
  )
}


function MetricsGrid({
  metrics,
}: {
  metrics: AuditMetrics
}) {
  const cards = [
    {
      label: 'Total events',
      value: metrics.totalEvents,
      detail: `${metrics.uniqueActors} unique actors`,
      icon: Activity,
      iconClassName:
        'bg-[#0f4c6a] text-white',
    },
    {
      label: 'Successful events',
      value: metrics.successfulEvents,
      detail: 'Completed operations',
      icon: CheckCircle2,
      iconClassName:
        'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Failed events',
      value: metrics.failedEvents,
      detail: 'Requires security review',
      icon: XCircle,
      iconClassName:
        'bg-red-50 text-red-700',
    },
    {
      label: 'Sensitive events',
      value: metrics.securitySensitiveEvents,
      detail: `${metrics.authenticationEvents} authentication events`,
      icon: ShieldCheck,
      iconClassName:
        'bg-violet-50 text-violet-700',
    },
  ]

  return (
    <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon

        return (
          <article
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  {card.label}
                </p>

                <p className="mt-3 text-3xl font-bold text-slate-950">
                  {card.value}
                </p>

                <p className="mt-3 text-sm text-slate-500">
                  {card.detail}
                </p>
              </div>

              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.iconClassName}`}
              >
                <Icon size={23} />
              </div>
            </div>
          </article>
        )
      })}
    </section>
  )
}


function AuditFiltersPanel({
  filters,
  resourceTypes,
  hasActiveFilters,
  isLoading,
  onChange,
  onSearch,
  onClear,
}: {
  filters: AuditFilters
  resourceTypes: string[]
  hasActiveFilters: boolean
  isLoading: boolean
  onChange: (filters: AuditFilters) => void
  onSearch: () => void
  onClear: () => void
}) {
  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Filter
          size={20}
          className="text-teal-700"
        />
        <h2 className="font-bold text-slate-950">
          Search and filters
        </h2>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="xl:col-span-2">
          <span className="sr-only">
            Search audit events
          </span>

          <div className="flex min-h-12 items-center rounded-xl border border-slate-300 bg-white px-4 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
            <Search
              size={19}
              className="shrink-0 text-slate-400"
            />

            <input
              value={filters.search}
              onChange={(event) => {
                onChange({
                  ...filters,
                  search: event.target.value,
                })
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  onSearch()
                }
              }}
              placeholder="Search actor, resource, path or ID..."
              className="w-full border-0 bg-transparent px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
        </label>

        <select
          value={filters.action}
          onChange={(event) => {
            onChange({
              ...filters,
              action:
                event.target.value as AuditFilters['action'],
            })
          }}
          className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        >
          <option value="all">
            All actions
          </option>

          {actionOptions.map((option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={filters.success}
          onChange={(event) => {
            onChange({
              ...filters,
              success:
                event.target.value as AuditFilters['success'],
            })
          }}
          className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        >
          <option value="all">
            All outcomes
          </option>
          <option value="true">
            Successful
          </option>
          <option value="false">
            Failed
          </option>
        </select>

        <input
          type="email"
          value={filters.actorEmail}
          onChange={(event) => {
            onChange({
              ...filters,
              actorEmail: event.target.value,
            })
          }}
          placeholder="Filter actor email..."
          className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        />

        <select
          value={filters.resourceType}
          onChange={(event) => {
            onChange({
              ...filters,
              resourceType: event.target.value,
            })
          }}
          className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        >
          <option value="">
            All resource types
          </option>

          {resourceTypes.map((resourceType) => (
            <option
              key={resourceType}
              value={resourceType}
            >
              {humanizeKey(resourceType)}
            </option>
          ))}
        </select>

        <label>
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
            From date
          </span>

          <input
            type="date"
            value={filters.dateFrom}
            onChange={(event) => {
              onChange({
                ...filters,
                dateFrom: event.target.value,
              })
            }}
            className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </label>

        <label>
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
            To date
          </span>

          <input
            type="date"
            value={filters.dateTo}
            min={filters.dateFrom || undefined}
            onChange={(event) => {
              onChange({
                ...filters,
                dateTo: event.target.value,
              })
            }}
            className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClear}
          disabled={!hasActiveFilters}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <X size={17} />
          Clear all filters
        </button>

        <button
          type="button"
          onClick={onSearch}
          disabled={isLoading}
          className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-[#105978] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0b4863] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (
            <LoaderCircle
              size={18}
              className="animate-spin"
            />
          ) : (
            <Search size={18} />
          )}
          Apply filters
        </button>
      </div>
    </section>
  )
}


function AuditRecords({
  logs,
  isLoading,
  onSelect,
}: {
  logs: AuditLog[]
  isLoading: boolean
  onSelect: (log: AuditLog) => void
}) {
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="font-bold text-slate-950">
            Audit event records
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {logs.length}{' '}
            authorized events found
          </p>
        </div>

        <div className="rounded-full bg-teal-50 px-4 py-2 text-xs font-bold text-teal-700">
          Admin-only visibility
        </div>
      </div>

      {isLoading ? (
        <div className="grid min-h-72 place-items-center">
          <div className="text-center">
            <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-teal-700" />
            <p className="mt-3 text-sm text-slate-500">
              Loading secure audit records...
            </p>
          </div>
        </div>
      ) : logs.length === 0 ? (
        <div className="grid min-h-72 place-items-center px-6 text-center">
          <div>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <Activity size={27} />
            </div>

            <h3 className="mt-4 font-bold text-slate-950">
              No matching audit events
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Try changing or clearing the current filters.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-4">
                  Actor
                </th>
                <th className="px-5 py-4">
                  Action
                </th>
                <th className="px-5 py-4">
                  Resource
                </th>
                <th className="px-5 py-4">
                  Request
                </th>
                <th className="px-5 py-4">
                  Outcome
                </th>
                <th className="px-5 py-4">
                  Time
                </th>
                <th className="px-5 py-4 text-right">
                  Details
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {logs.map((log) => (
                <AuditRow
                  key={log.id}
                  log={log}
                  onSelect={() => onSelect(log)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}


function AuditRow({
  log,
  onSelect,
}: {
  log: AuditLog
  onSelect: () => void
}) {
  const appearance = actionAppearance(log.action)
  const ActionIcon = appearance.icon

  return (
    <tr className="transition hover:bg-slate-50">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <UserRound size={19} />
          </div>

          <div className="min-w-0">
            <p className="max-w-56 truncate text-sm font-semibold text-slate-950">
              {log.actor_name || 'System actor'}
            </p>

            <p className="mt-1 max-w-56 truncate text-xs text-slate-500">
              {log.actor_email || 'Anonymous'}
            </p>
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset ${appearance.className}`}
        >
          <ActionIcon size={14} />
          {log.action_display}
        </span>
      </td>

      <td className="px-5 py-4">
        <p className="max-w-52 truncate text-sm font-semibold text-slate-900">
          {log.resource_label
            || humanizeKey(log.resource_type)
            || 'System'}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          {log.resource_type || 'system'}
          {log.resource_id
            ? ` · ID ${log.resource_id}`
            : ''}
        </p>
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          {log.request_method && (
            <span
              className={`rounded-md px-2 py-1 text-[10px] font-bold ${methodClassName(log.request_method)}`}
            >
              {log.request_method}
            </span>
          )}

          <span className="max-w-52 truncate text-xs text-slate-500">
            {log.request_path || 'Not recorded'}
          </span>
        </div>
      </td>

      <td className="px-5 py-4">
        <div
          className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
            log.success
              ? 'text-emerald-700'
              : 'text-red-700'
          }`}
        >
          {log.success ? (
            <CheckCircle2 size={17} />
          ) : (
            <XCircle size={17} />
          )}

          {log.success
            ? 'Successful'
            : 'Failed'}
        </div>

        {log.status_code !== null && (
          <p className="mt-1 text-xs text-slate-500">
            HTTP {log.status_code}
          </p>
        )}
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <CalendarDays
            size={16}
            className="text-slate-400"
          />
          {formatDateTime(log.created_at)}
        </div>
      </td>

      <td className="px-5 py-4 text-right">
        <button
          type="button"
          onClick={onSelect}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition hover:border-teal-500 hover:bg-teal-50 hover:text-teal-700"
          aria-label={`View audit event ${log.id}`}
        >
          <Eye size={17} />
        </button>
      </td>
    </tr>
  )
}


function AuditDetailModal({
  log,
  onClose,
}: {
  log: AuditLog
  onClose: () => void
}) {
  const metadataEntries = Object.entries(
    log.metadata || {},
  )
  const appearance = actionAppearance(log.action)
  const ActionIcon = appearance.icon

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-detail-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
              Secure audit evidence
            </p>

            <h2
              id="audit-detail-title"
              className="mt-2 text-xl font-bold text-slate-950"
            >
              Audit event #{log.id}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
            aria-label="Close audit details"
          >
            <X size={20} />
          </button>
        </header>

        <div className="overflow-y-auto p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#0b3a53] p-5 text-white">
            <div>
              <p className="text-sm text-cyan-100">
                Recorded action
              </p>

              <div className="mt-2 flex items-center gap-2 text-xl font-bold">
                <ActionIcon size={22} />
                {log.action_display}
              </div>
            </div>

            <div
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                log.success
                  ? 'bg-emerald-400/20 text-emerald-100'
                  : 'bg-red-400/20 text-red-100'
              }`}
            >
              {log.success
                ? 'Successful'
                : 'Failed'}
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <DetailItem
              label="Actor"
              value={
                log.actor_name || 'System actor'
              }
            />
            <DetailItem
              label="Actor email"
              value={
                log.actor_email || 'Anonymous'
              }
            />
            <DetailItem
              label="Resource type"
              value={
                humanizeKey(
                  log.resource_type || 'system',
                )
              }
            />
            <DetailItem
              label="Resource identifier"
              value={
                log.resource_id || 'Not recorded'
              }
            />
            <DetailItem
              label="Resource label"
              value={
                log.resource_label
                || 'Not recorded'
              }
            />
            <DetailItem
              label="Recorded at"
              value={
                formatDateTime(log.created_at)
              }
            />
            <DetailItem
              label="Request method"
              value={
                log.request_method || 'Not recorded'
              }
            />
            <DetailItem
              label="HTTP status"
              value={
                log.status_code === null
                  ? 'Not recorded'
                  : String(log.status_code)
              }
            />
            <DetailItem
              label="IP address"
              value={
                log.ip_address || 'Not recorded'
              }
            />
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Request path
            </p>
            <p className="mt-2 break-all font-mono text-sm text-slate-800">
              {log.request_path || 'Not recorded'}
            </p>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-bold text-slate-950">
                Sanitized metadata
              </h3>

              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                Sensitive values redacted
              </span>
            </div>

            {metadataEntries.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                No additional safe metadata was recorded.
              </div>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {metadataEntries.map(
                  ([key, value]) => (
                    <div
                      key={key}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        {humanizeKey(key)}
                      </p>

                      <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-slate-900">
                        {displayValue(value)}
                      </pre>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <ShieldCheck
              size={19}
              className="mt-0.5 shrink-0"
            />
            <p className="leading-6">
              This record is immutable audit evidence.
              TraceNet intentionally excludes passwords,
              authentication tokens and confidential case
              content from audit metadata.
            </p>
          </div>
        </div>

        <footer className="flex justify-end border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-xl bg-[#105978] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0b4863]"
          >
            Close details
            <ChevronRight size={17} />
          </button>
        </footer>
      </section>
    </div>
  )
}


function DetailItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  )
}