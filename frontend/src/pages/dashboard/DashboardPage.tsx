import {
  Activity,
  AlertTriangle,
  Bell,
  ChevronRight,
  CircleAlert,
  FileText,
  MapPinned,
  RefreshCw,
  Route as RouteIcon,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import type { ReactNode } from 'react'
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

import { dashboardApi } from '../../api/dashboard'
import { AppShell } from '../../components/layout/AppShell'

import type {
  AlertSummary,
  CaseSummary,
  StatusChartItem,
} from '../../types/dashboard'


const chartColors = [
  '#087b72',
  '#155e75',
  '#f59e0b',
  '#dc2626',
  '#7c3aed',
  '#64748b',
]

function formatRole(role: string): string {
  return role
    .replaceAll('_', ' ')
    .replace(
      /\b\w/g,
      (character) => character.toUpperCase(),
    )
}


function formatDate(date: string): string {
  const value = new Date(date)

  if (Number.isNaN(value.getTime())) {
    return 'Unknown time'
  }

  return formatDistanceToNow(value, {
    addSuffix: true,
  })
}


function riskBadge(level: string) {
  const styles: Record<string, string> = {
    low: 'bg-emerald-50 text-emerald-700',
    medium: 'bg-amber-50 text-amber-700',
    high: 'bg-orange-50 text-orange-700',
    critical: 'bg-red-50 text-red-700',
  }

  return (
    styles[level]
    ?? 'bg-slate-100 text-slate-700'
  )
}


function statusBadge(status: string) {
  const styles: Record<string, string> = {
    reported: 'bg-blue-50 text-blue-700',
    under_review: 'bg-violet-50 text-violet-700',
    investigating: 'bg-cyan-50 text-cyan-700',
    action_required: 'bg-orange-50 text-orange-700',
    resolved: 'bg-emerald-50 text-emerald-700',
    closed: 'bg-slate-100 text-slate-600',
  }

  return (
    styles[status]
    ?? 'bg-slate-100 text-slate-700'
  )
}


export function DashboardPage() {
  const dashboardQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.getDashboard,
    refetchInterval: 60_000,
  })

  return (
    <AppShell
      activeNavigation="dashboard"
      unreadAlertCount={
        dashboardQuery.data?.metrics.unreadAlerts ?? 0
      }
    >
      <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-[1500px]">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-teal-700">
                <Activity size={17} />
                Operational overview
              </div>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                Intelligence dashboard
              </h1>

              <p className="mt-2 max-w-2xl text-slate-600">
                Live visibility across cases, trafficking
                routes, risk hotspots and coordinated alerts.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                void dashboardQuery.refetch()
              }}
              disabled={dashboardQuery.isFetching}
              className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-teal-300 hover:text-teal-700 disabled:opacity-60 sm:self-auto"
            >
              <RefreshCw
                size={17}
                className={
                  dashboardQuery.isFetching
                    ? 'animate-spin'
                    : ''
                }
              />

              Refresh data
            </button>
          </div>

          {dashboardQuery.isLoading && (
            <DashboardLoading />
          )}

          {dashboardQuery.isError && (
            <DashboardError
              onRetry={() => {
                void dashboardQuery.refetch()
              }}
            />
          )}

          {dashboardQuery.data && (
            <DashboardContent
              dashboard={dashboardQuery.data}
            />
          )}
        </div>
      </main>
    </AppShell>
  )
}

function DashboardContent({
  dashboard,
}: {
  dashboard: Awaited<
    ReturnType<typeof dashboardApi.getDashboard>
  >
}) {
  const {
    metrics,
    caseStatusChart,
    casePriorityChart,
    recentCases,
    recentAlerts,
  } = dashboard

  return (
    <>
      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total cases"
          value={metrics.totalCases}
          detail={`${metrics.activeCases} currently active`}
          icon={<FileText size={23} />}
          tone="navy"
        />

        <MetricCard
          label="High-risk routes"
          value={metrics.highRiskRoutes}
          detail={`${metrics.activeRoutes} active routes`}
          icon={<RouteIcon size={23} />}
          tone="orange"
        />

        <MetricCard
          label="High-risk hotspots"
          value={metrics.highRiskHotspots}
          detail={`${metrics.activeHotspots} active hotspots`}
          icon={<MapPinned size={23} />}
          tone="red"
        />

        <MetricCard
          label="Active alerts"
          value={metrics.activeAlerts}
          detail={`${metrics.unreadAlerts} unread in inbox`}
          icon={<Bell size={23} />}
          tone="teal"
        />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="grid gap-5 md:grid-cols-2">
          <ChartCard
            title="Case status"
            subtitle="Current investigation workflow"
            data={caseStatusChart}
          />

          <ChartCard
            title="Case priority"
            subtitle="Operational urgency distribution"
            data={casePriorityChart}
          />
        </div>

        <OperationalSummary
          totalCases={metrics.totalCases}
          verifiedCases={metrics.verifiedCases}
          criticalCases={metrics.criticalCases}
          unacknowledged={
            metrics.unacknowledgedAlerts
          }
        />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <RecentCases cases={recentCases} />
        <RecentAlerts alerts={recentAlerts} />
      </section>
    </>
  )
}


function MetricCard({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string
  value: number
  detail: string
  icon: ReactNode
  tone: 'navy' | 'orange' | 'red' | 'teal'
}) {
  const tones = {
    navy: 'bg-[#0d3a58] text-white',
    orange: 'bg-orange-50 text-orange-700',
    red: 'bg-red-50 text-red-700',
    teal: 'bg-teal-50 text-teal-700',
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            {label}
          </p>

          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-500">
        {detail}
      </p>
    </article>
  )
}


function ChartCard({
  title,
  subtitle,
  data,
}: {
  title: string
  subtitle: string
  data: StatusChartItem[]
}) {
  const total = data.reduce(
    (sum, item) => sum + item.value,
    0,
  )

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
      <h2 className="font-bold text-slate-950">
        {title}
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        {subtitle}
      </p>

      {data.length === 0 ? (
        <EmptyState message="No data is available yet." />
      ) : (
        <div className="mt-3 grid items-center gap-2 sm:grid-cols-[0.9fr_1.1fr]">
          <div className="relative h-44">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={70}
                  paddingAngle={3}
                  stroke="none"
                >
                  {data.map((item, index) => (
                    <Cell
                      key={item.name}
                      fill={
                        chartColors[
                          index % chartColors.length
                        ]
                      }
                    />
                  ))}
                </Pie>

                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    borderColor: '#e2e8f0',
                    boxShadow:
                      '0 10px 30px rgba(15, 23, 42, 0.08)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-slate-950">
                {total}
              </span>
              <span className="text-xs text-slate-500">
                Total
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            {data.map((item, index) => (
              <div
                key={item.name}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        chartColors[
                          index % chartColors.length
                        ],
                    }}
                  />

                  <span className="truncate text-slate-600">
                    {item.name}
                  </span>
                </div>

                <span className="font-bold text-slate-900">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}


function OperationalSummary({
  totalCases,
  verifiedCases,
  criticalCases,
  unacknowledged,
}: {
  totalCases: number
  verifiedCases: number
  criticalCases: number
  unacknowledged: number
}) {
  const verificationRate = totalCases > 0
    ? Math.round((verifiedCases / totalCases) * 100)
    : 0

  return (
    <article className="rounded-2xl bg-[#0d3a58] p-6 text-white shadow-lg shadow-slate-900/10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-cyan-100">
            Operational readiness
          </p>

          <h2 className="mt-1 text-xl font-bold">
            Response indicators
          </h2>
        </div>

        <ShieldCheck className="text-teal-300" />
      </div>

      <div className="mt-7 space-y-5">
        <SummaryRow
          label="Case verification"
          value={`${verificationRate}%`}
          warning={false}
        />

        <div className="h-2 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-teal-300 transition-all"
            style={{
              width: `${verificationRate}%`,
            }}
          />
        </div>

        <SummaryRow
          label="Critical cases"
          value={String(criticalCases)}
          warning={criticalCases > 0}
        />

        <SummaryRow
          label="Alerts awaiting acknowledgement"
          value={String(unacknowledged)}
          warning={unacknowledged > 0}
        />
      </div>

      <div className="mt-7 rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-200">
        Data refreshes automatically every 60 seconds.
        Security-sensitive operations remain auditable.
      </div>
    </article>
  )
}


function SummaryRow({
  label,
  value,
  warning,
}: {
  label: string
  value: string
  warning: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-slate-200">
        {label}
      </span>

      <span
        className={
          warning
            ? 'rounded-full bg-amber-400/15 px-3 py-1 text-sm font-bold text-amber-200'
            : 'text-lg font-bold text-white'
        }
      >
        {value}
      </span>
    </div>
  )
}


function RecentCases({
  cases,
}: {
  cases: CaseSummary[]
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="font-bold text-slate-950">
            Recent cases
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Latest operational records
          </p>
        </div>

        <ChevronRight
          size={20}
          className="text-slate-400"
        />
      </div>

      {cases.length === 0 ? (
        <EmptyState message="No cases are available." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">
                  Case
                </th>
                <th className="px-5 py-3 font-semibold">
                  District
                </th>
                <th className="px-5 py-3 font-semibold">
                  Status
                </th>
                <th className="px-5 py-3 font-semibold">
                  Priority
                </th>
                <th className="px-5 py-3 font-semibold">
                  Updated
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {cases.map((caseItem) => (
                <tr
                  key={caseItem.reference_code}
                  className="transition hover:bg-slate-50"
                >
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900">
                      {caseItem.title}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {caseItem.reference_code}
                    </p>
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">
                    {caseItem.incident_district?.name
                      ?? 'Not specified'}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(caseItem.status)}`}
                    >
                      {caseItem.status_display
                        ?? formatRole(caseItem.status)}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${riskBadge(caseItem.priority)}`}
                    >
                      {caseItem.priority_display
                        ?? formatRole(caseItem.priority)}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-500">
                    {formatDate(caseItem.updated_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  )
}


function RecentAlerts({
  alerts,
}: {
  alerts: AlertSummary[]
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="font-bold text-slate-950">
            Recent alerts
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Priority intelligence notifications
          </p>
        </div>

        <Bell size={19} className="text-slate-400" />
      </div>

      {alerts.length === 0 ? (
        <EmptyState message="No alerts are available." />
      ) : (
        <div className="divide-y divide-slate-100">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex gap-3 px-5 py-4"
            >
              <div
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${riskBadge(alert.severity)}`}
              >
                <CircleAlert size={18} />
              </div>

              <div className="min-w-0">
                <p className="font-semibold leading-5 text-slate-900">
                  {alert.title}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`rounded-full px-2 py-1 font-semibold ${riskBadge(alert.severity)}`}
                  >
                    {formatRole(alert.severity)}
                  </span>

                  <span className="text-slate-500">
                    {formatDate(alert.created_at)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}


function EmptyState({
  message,
}: {
  message: string
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center p-6 text-center">
      <Search size={26} className="text-slate-300" />
      <p className="mt-3 text-sm text-slate-500">
        {message}
      </p>
    </div>
  )
}


function DashboardLoading() {
  return (
    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({
        length: 4,
      }).map((_, index) => (
        <div
          key={index}
          className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white"
        />
      ))}
    </div>
  )
}


function DashboardError({
  onRetry,
}: {
  onRetry: () => void
}) {
  return (
    <div className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle
          className="shrink-0 text-red-600"
          size={23}
        />

        <div>
          <h2 className="font-bold text-red-900">
            Dashboard data could not be loaded
          </h2>

          <p className="mt-1 text-sm leading-6 text-red-700">
            Confirm that the Django server is running and
            your account has the required permissions.
          </p>

          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  )
}