import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileClock,
  FileText,
  Link2,
  MapPin,
  RefreshCw,
  Route as RouteIcon,
  ShieldAlert,
  UserRound,
  Users,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import {
  format,
  formatDistanceToNow,
} from 'date-fns'
import {
  Link,
  useParams,
} from 'wouter'

import { casesApi } from '../../api/cases'
import { AppShell } from '../../components/layout/AppShell'

import type {
  CaseDetail,
  CaseRouteLink,
  CaseUpdate,
  VictimProfile,
} from '../../types/cases'


function formatDate(
  value: string | null,
  includeTime = false,
): string {
  if (!value) {
    return 'Not recorded'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Not recorded'
  }

  return format(
    date,
    includeTime
      ? 'dd MMM yyyy, hh:mm a'
      : 'dd MMM yyyy',
  )
}


function formatRelativeDate(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown time'
  }

  return formatDistanceToNow(date, {
    addSuffix: true,
  })
}


function formatLabel(value: string): string {
  if (!value) {
    return 'Not specified'
  }

  return value
    .replaceAll('_', ' ')
    .replace(
      /\b\w/g,
      (character) => character.toUpperCase(),
    )
}


function statusClass(status: string): string {
  const classes: Record<string, string> = {
    reported: 'bg-blue-50 text-blue-700',
    under_review: 'bg-violet-50 text-violet-700',
    investigating: 'bg-cyan-50 text-cyan-700',
    action_required: 'bg-orange-50 text-orange-700',
    resolved: 'bg-emerald-50 text-emerald-700',
    closed: 'bg-slate-100 text-slate-600',
  }

  return (
    classes[status]
    ?? 'bg-slate-100 text-slate-700'
  )
}


function riskClass(level: string): string {
  const classes: Record<string, string> = {
    low: 'bg-emerald-50 text-emerald-700',
    medium: 'bg-amber-50 text-amber-700',
    high: 'bg-orange-50 text-orange-700',
    critical: 'bg-red-50 text-red-700',
  }

  return (
    classes[level]
    ?? 'bg-slate-100 text-slate-700'
  )
}


export function CaseDetailPage() {
  const params = useParams<{
    referenceCode: string
  }>()

  const referenceCode = params.referenceCode ?? ''

  const caseQuery = useQuery({
    queryKey: [
      'case-detail',
      referenceCode,
    ],
    queryFn: () => (
      casesApi.getCaseDetailBundle(referenceCode)
    ),
    enabled: referenceCode.length > 0,
  })

  return (
    <AppShell activeNavigation="cases">
      <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-[1500px]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/cases"
              className="inline-flex items-center gap-2 text-sm font-semibold !text-slate-600 transition hover:!text-teal-700"
            >
              <ArrowLeft size={17} />
              Back to case registry
            </Link>

            <button
              type="button"
              onClick={() => {
                void caseQuery.refetch()
              }}
              disabled={caseQuery.isFetching}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-teal-300 hover:text-teal-700 disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={
                  caseQuery.isFetching
                    ? 'animate-spin'
                    : ''
                }
              />
              Refresh
            </button>
          </div>

          {caseQuery.isLoading && (
            <DetailLoading />
          )}

          {caseQuery.isError && (
            <DetailError
              onRetry={() => {
                void caseQuery.refetch()
              }}
            />
          )}

          {caseQuery.data && (
            <CaseDetailContent
              caseRecord={caseQuery.data.caseRecord}
              updates={caseQuery.data.updates}
              routeLinks={caseQuery.data.routeLinks}
              victims={caseQuery.data.victims}
            />
          )}
        </div>
      </main>
    </AppShell>
  )
}


function CaseDetailContent({
  caseRecord,
  updates,
  routeLinks,
  victims,
}: {
  caseRecord: CaseDetail
  updates: CaseUpdate[]
  routeLinks: CaseRouteLink[]
  victims: VictimProfile[]
}) {
  return (
    <>
      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
        <div className="border-b border-slate-200 bg-gradient-to-r from-[#0d3a58] to-[#135879] px-6 py-7 text-white">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-xs text-cyan-100">
                  {caseRecord.reference_code}
                </span>

                {caseRecord.is_verified && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-200">
                    <CheckCircle2 size={14} />
                    Verified
                  </span>
                )}
              </div>

              <h1 className="mt-4 max-w-4xl text-3xl font-bold tracking-tight">
                {caseRecord.title}
              </h1>

              <p className="mt-3 text-sm text-slate-300">
                Last updated {formatRelativeDate(
                  caseRecord.updated_at,
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusClass(caseRecord.status)}`}
              >
                {caseRecord.status_display}
              </span>

              <span
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${riskClass(caseRecord.priority)}`}
              >
                {caseRecord.priority_display} priority
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-6 sm:grid-cols-2 xl:grid-cols-4">
          <HeaderMetric
            icon={<MapPin size={20} />}
            label="Incident district"
            value={
              caseRecord.incident_district?.name
              ?? 'Not specified'
            }
          />

          <HeaderMetric
            icon={<CalendarDays size={20} />}
            label="Incident date"
            value={formatDate(caseRecord.incident_date)}
          />

          <HeaderMetric
            icon={<Users size={20} />}
            label="Recorded victims"
            value={String(caseRecord.total_victims)}
          />

          <HeaderMetric
            icon={<ShieldAlert size={20} />}
            label="Confidentiality"
            value={caseRecord.confidentiality_display}
          />
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-5">
          <InformationCard
            title="Case overview"
            icon={<FileText size={20} />}
          >
            <p className="whitespace-pre-line leading-7 text-slate-700">
              {caseRecord.summary || 'No summary recorded.'}
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <DetailItem
                label="Category"
                value={caseRecord.category_display}
              />

              <DetailItem
                label="Location description"
                value={
                  caseRecord.location_description
                  || 'Not specified'
                }
              />

              <DetailItem
                label="Division"
                value={
                  caseRecord.incident_district
                    ?.division_display
                  ?? 'Not specified'
                }
              />

              <DetailItem
                label="Coordinates"
                value={
                  caseRecord.latitude
                  && caseRecord.longitude
                    ? (
                      `${caseRecord.latitude}, `
                      + `${caseRecord.longitude}`
                    )
                    : 'Not recorded'
                }
              />
            </div>
          </InformationCard>

          <RouteLinksSection routeLinks={routeLinks} />
          <VictimProfilesSection victims={victims} />
        </div>

        <div className="space-y-5">
          <InformationCard
            title="Assignment"
            icon={<UserRound size={20} />}
          >
            <div className="space-y-5">
              <DetailItem
                label="Reported by"
                value={
                  caseRecord.reported_by_name
                  ?? 'Not assigned'
                }
              />

              <DetailItem
                label="Assigned to"
                value={
                  caseRecord.assigned_to_name
                  ?? 'Unassigned'
                }
              />

              <DetailItem
                label="Reported at"
                value={formatDate(
                  caseRecord.reported_at,
                  true,
                )}
              />

              <DetailItem
                label="Resolved at"
                value={formatDate(
                  caseRecord.resolved_at,
                  true,
                )}
              />
            </div>
          </InformationCard>

          <UpdatesSection updates={updates} />
        </div>
      </section>
    </>
  )
}


function HeaderMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          {label}
        </p>

        <p className="mt-1 truncate font-semibold text-slate-900">
          {value}
        </p>
      </div>
    </div>
  )
}


function InformationCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
        <span className="text-teal-700">
          {icon}
        </span>

        <h2 className="font-bold text-slate-950">
          {title}
        </h2>
      </div>

      <div className="p-5">
        {children}
      </div>
    </article>
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
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1.5 text-sm font-semibold leading-6 text-slate-800">
        {value}
      </p>
    </div>
  )
}


function RouteLinksSection({
  routeLinks,
}: {
  routeLinks: CaseRouteLink[]
}) {
  return (
    <InformationCard
      title={`Linked routes (${routeLinks.length})`}
      icon={<RouteIcon size={20} />}
    >
      {routeLinks.length === 0 ? (
        <EmptySection message="No routes are linked to this case." />
      ) : (
        <div className="space-y-3">
          {routeLinks.map((link) => (
            <div
              key={link.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <Link2
                      size={17}
                      className="text-teal-700"
                    />

                    <p className="font-bold text-slate-900">
                      {link.route.name}
                    </p>
                  </div>

                  <p className="mt-2 text-sm text-slate-600">
                    {link.route.origin.name}
                    {' → '}
                    {link.route.destination.name}
                  </p>
                </div>

                <span
                  className={`self-start rounded-full px-2.5 py-1 text-xs font-bold ${riskClass(link.route.risk_level)}`}
                >
                  {link.route.risk_level_display}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <DetailItem
                  label="Relationship"
                  value={link.relationship_type_display}
                />

                <DetailItem
                  label="Confidence"
                  value={link.confidence_level_display}
                />

                <DetailItem
                  label="Transport"
                  value={link.route.transport_mode_display}
                />
              </div>

              {link.evidence_note && (
                <p className="mt-4 rounded-lg bg-white p-3 text-sm leading-6 text-slate-600">
                  {link.evidence_note}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </InformationCard>
  )
}


function VictimProfilesSection({
  victims,
}: {
  victims: VictimProfile[]
}) {
  return (
    <InformationCard
      title={`Anonymized victim profiles (${victims.length})`}
      icon={<Users size={20} />}
    >
      {victims.length === 0 ? (
        <EmptySection message="No victim profiles are available." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {victims.map((victim) => (
            <div
              key={victim.id}
              className="rounded-xl border border-slate-200 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-sm font-bold text-teal-700">
                  {victim.anonymous_code}
                </p>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {victim.support_status_display}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <DetailItem
                  label="Age group"
                  value={victim.age_group_display}
                />

                <DetailItem
                  label="Gender"
                  value={victim.gender_display}
                />

                <DetailItem
                  label="Exploitation"
                  value={
                    victim.exploitation_type_display
                  }
                />

                <DetailItem
                  label="Country"
                  value={
                    victim.country_of_origin
                    || 'Not recorded'
                  }
                />
              </div>

              {victim.support_needs && (
                <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                  <strong>Support needs:</strong>{' '}
                  {victim.support_needs}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </InformationCard>
  )
}


function UpdatesSection({
  updates,
}: {
  updates: CaseUpdate[]
}) {
  return (
    <InformationCard
      title={`Update history (${updates.length})`}
      icon={<FileClock size={20} />}
    >
      {updates.length === 0 ? (
        <EmptySection message="No case updates have been recorded." />
      ) : (
        <div className="space-y-5">
          {updates.map((update, index) => (
            <div
              key={update.id}
              className="relative pl-7"
            >
              {index < updates.length - 1 && (
                <span className="absolute left-[7px] top-5 h-[calc(100%+12px)] w-px bg-slate-200" />
              )}

              <span className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-4 border-teal-100 bg-teal-600" />

              <p className="text-sm font-bold text-slate-900">
                {update.update_type_display}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {formatDate(update.created_at, true)}
              </p>

              {update.previous_status
                && update.new_status && (
                <p className="mt-2 text-sm text-slate-600">
                  {formatLabel(update.previous_status)}
                  {' → '}
                  {formatLabel(update.new_status)}
                </p>
              )}

              {update.note && (
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {update.note}
                </p>
              )}

              <p className="mt-2 text-xs font-semibold text-slate-500">
                By {update.changed_by_name ?? 'System'}
                {update.is_internal && ' • Internal'}
              </p>
            </div>
          ))}
        </div>
      )}
    </InformationCard>
  )
}


function EmptySection({
  message,
}: {
  message: string
}) {
  return (
    <div className="flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
      <Clock3 size={22} className="text-slate-400" />

      <p className="mt-2 text-sm text-slate-500">
        {message}
      </p>
    </div>
  )
}


function DetailLoading() {
  return (
    <div className="mt-5 space-y-5">
      <div className="h-64 animate-pulse rounded-2xl bg-white" />

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="h-80 animate-pulse rounded-2xl bg-white" />
        <div className="h-80 animate-pulse rounded-2xl bg-white" />
      </div>
    </div>
  )
}


function DetailError({
  onRetry,
}: {
  onRetry: () => void
}) {
  return (
    <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle
          size={23}
          className="shrink-0 text-red-600"
        />

        <div>
          <h2 className="font-bold text-red-900">
            Case details could not be loaded
          </h2>

          <p className="mt-1 text-sm leading-6 text-red-700">
            The case may not exist or your account may not
            have permission to view it.
          </p>

          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  )
}