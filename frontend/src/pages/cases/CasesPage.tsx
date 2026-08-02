import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  FileText,
  Filter,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import {
  useState,
} from 'react'
import type {
  FormEvent,
} from 'react'

import {
  casesApi,
} from '../../api/cases'
import type {
  CaseFilters,
} from '../../api/cases'
import { AppShell } from '../../components/layout/AppShell'

import type {
  CaseSummary,
} from '../../types/dashboard'
import { Link } from 'wouter'

const statusOptions = [
  {
    value: '',
    label: 'All statuses',
  },
  {
    value: 'reported',
    label: 'Reported',
  },
  {
    value: 'under_review',
    label: 'Under review',
  },
  {
    value: 'investigating',
    label: 'Investigating',
  },
  {
    value: 'action_required',
    label: 'Action required',
  },
  {
    value: 'resolved',
    label: 'Resolved',
  },
  {
    value: 'closed',
    label: 'Closed',
  },
]


const priorityOptions = [
  {
    value: '',
    label: 'All priorities',
  },
  {
    value: 'low',
    label: 'Low',
  },
  {
    value: 'medium',
    label: 'Medium',
  },
  {
    value: 'high',
    label: 'High',
  },
  {
    value: 'critical',
    label: 'Critical',
  },
]


const categoryOptions = [
  {
    value: '',
    label: 'All categories',
  },
  {
    value: 'suspected',
    label: 'Suspected trafficking',
  },
  {
    value: 'confirmed',
    label: 'Confirmed trafficking',
  },
  {
    value: 'rescue',
    label: 'Rescue operation',
  },
  {
    value: 'route_intelligence',
    label: 'Route intelligence',
  },
  {
    value: 'other',
    label: 'Other',
  },
]


const verificationOptions = [
  {
    value: '',
    label: 'All verification',
  },
  {
    value: 'true',
    label: 'Verified only',
  },
  {
    value: 'false',
    label: 'Unverified only',
  },
]


function formatLabel(value: string): string {
  return value
    .replaceAll('_', ' ')
    .replace(
      /\b\w/g,
      (character) => character.toUpperCase(),
    )
}


function formatDate(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown'
  }

  return formatDistanceToNow(date, {
    addSuffix: true,
  })
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


function priorityClass(priority: string): string {
  const classes: Record<string, string> = {
    low: 'bg-emerald-50 text-emerald-700',
    medium: 'bg-amber-50 text-amber-700',
    high: 'bg-orange-50 text-orange-700',
    critical: 'bg-red-50 text-red-700',
  }

  return (
    classes[priority]
    ?? 'bg-slate-100 text-slate-700'
  )
}


export function CasesPage() {
  const [searchInput, setSearchInput] = useState('')
  const [filters, setFilters] = useState<CaseFilters>({
    search: '',
    status: '',
    priority: '',
    category: '',
    is_verified: '',
  })

  const casesQuery = useQuery({
    queryKey: [
      'cases',
      filters,
    ],
    queryFn: () => casesApi.getCases(filters),
  })

  const handleSearch = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    setFilters((current) => ({
      ...current,
      search: searchInput.trim(),
    }))
  }

  const updateFilter = (
    name: keyof CaseFilters,
    value: string,
  ) => {
    setFilters((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const clearFilters = () => {
    setSearchInput('')
    setFilters({
      search: '',
      status: '',
      priority: '',
      category: '',
      is_verified: '',
    })
  }

  const hasFilters = Boolean(
    filters.search
    || filters.status
    || filters.priority
    || filters.category
    || filters.is_verified,
  )

  const cases = casesQuery.data ?? []

  return (
    <AppShell activeNavigation="cases">
      <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-[1500px]">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-teal-700">
                <ShieldCheck size={17} />
                Protected case registry
              </div>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                Case management
              </h1>

              <p className="mt-2 max-w-2xl text-slate-600">
                Search and review anonymized trafficking
                investigations according to your authorized role.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                void casesQuery.refetch()
              }}
              disabled={casesQuery.isFetching}
              className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-teal-300 hover:text-teal-700 disabled:opacity-60 sm:self-auto"
            >
              <RefreshCw
                size={17}
                className={
                  casesQuery.isFetching
                    ? 'animate-spin'
                    : ''
                }
              />
              Refresh cases
            </button>
          </div>

          <CaseSummaryCards cases={cases} />

          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
            <div className="flex items-center gap-2">
              <Filter
                size={19}
                className="text-teal-700"
              />

              <h2 className="font-bold text-slate-950">
                Search and filters
              </h2>
            </div>

            <form
              onSubmit={handleSearch}
              className="mt-4 flex flex-col gap-3 sm:flex-row"
            >
              <div className="relative flex-1">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={searchInput}
                  onChange={(event) => {
                    setSearchInput(event.target.value)
                  }}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
                  placeholder="Search reference, title, summary or district..."
                  aria-label="Search cases"
                />
              </div>

              <button
                type="submit"
                className="h-11 rounded-xl bg-[#104968] px-6 text-sm font-semibold text-white transition hover:bg-[#0b3b56]"
              >
                Search
              </button>
            </form>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <FilterSelect
                label="Status"
                value={filters.status ?? ''}
                options={statusOptions}
                onChange={(value) => {
                  updateFilter('status', value)
                }}
              />

              <FilterSelect
                label="Priority"
                value={filters.priority ?? ''}
                options={priorityOptions}
                onChange={(value) => {
                  updateFilter('priority', value)
                }}
              />

              <FilterSelect
                label="Category"
                value={filters.category ?? ''}
                options={categoryOptions}
                onChange={(value) => {
                  updateFilter('category', value)
                }}
              />

              <FilterSelect
                label="Verification"
                value={filters.is_verified ?? ''}
                options={verificationOptions}
                onChange={(value) => {
                  updateFilter(
                    'is_verified',
                    value,
                    )
                }}
              />
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-red-700"
              >
                <X size={16} />
                Clear all filters
              </button>
            )}
          </section>

          <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="font-bold text-slate-950">
                  Case records
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {casesQuery.isLoading
                    ? 'Loading authorized records...'
                    : `${cases.length} authorized case${
                      cases.length === 1 ? '' : 's'
                    } found`}
                </p>
              </div>

              <div className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700">
                Role-based visibility
              </div>
            </div>

            {casesQuery.isLoading && (
              <CasesLoading />
            )}

            {casesQuery.isError && (
              <CasesError
                onRetry={() => {
                  void casesQuery.refetch()
                }}
              />
            )}

            {casesQuery.isSuccess && cases.length === 0 && (
              <EmptyCases hasFilters={hasFilters} />
            )}

            {casesQuery.isSuccess && cases.length > 0 && (
              <CaseTable cases={cases} />
            )}
          </section>
        </div>
      </main>
    </AppShell>
  )
}


function CaseSummaryCards({
  cases,
}: {
  cases: CaseSummary[]
}) {
  const activeCount = cases.filter(
    (item) => ![
      'resolved',
      'closed',
    ].includes(item.status),
  ).length

  const highPriorityCount = cases.filter(
    (item) => [
      'high',
      'critical',
    ].includes(item.priority),
  ).length

  const verifiedCount = cases.filter(
    (item) => item.is_verified,
  ).length

  const victimCount = cases.reduce(
    (total, item) => (
      total + (item.total_victims ?? 0)
    ),
    0,
  )

  return (
    <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SmallMetric
        label="Visible cases"
        value={cases.length}
        icon={<FileText size={21} />}
        tone="navy"
      />

      <SmallMetric
        label="Active workflow"
        value={activeCount}
        icon={<FileSearch size={21} />}
        tone="teal"
      />

      <SmallMetric
        label="High priority"
        value={highPriorityCount}
        icon={<AlertTriangle size={21} />}
        tone="orange"
      />

      <SmallMetric
        label="Recorded victims"
        value={victimCount}
        icon={<Users size={21} />}
        tone="violet"
      />

      <span className="sr-only">
        Verified cases: {verifiedCount}
      </span>
    </section>
  )
}


function SmallMetric({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: number
  icon: React.ReactNode
  tone: 'navy' | 'teal' | 'orange' | 'violet'
}) {
  const tones = {
    navy: 'bg-[#0d3a58] text-white',
    teal: 'bg-teal-50 text-teal-700',
    orange: 'bg-orange-50 text-orange-700',
    violet: 'bg-violet-50 text-violet-700',
  }

  return (
    <article className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
      <div>
        <p className="text-sm font-semibold text-slate-500">
          {label}
        </p>

        <p className="mt-2 text-2xl font-bold text-slate-950">
          {value}
        </p>
      </div>

      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}
      >
        {icon}
      </div>
    </article>
  )
}


function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Array<{
    value: string
    label: string
  }>
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
        }}
        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}


function CaseTable({
  cases,
}: {
  cases: CaseSummary[]
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[950px] text-left">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-3 font-semibold">
              Case
            </th>
            <th className="px-5 py-3 font-semibold">
              Location
            </th>
            <th className="px-5 py-3 font-semibold">
              Category
            </th>
            <th className="px-5 py-3 font-semibold">
              Status
            </th>
            <th className="px-5 py-3 font-semibold">
              Priority
            </th>
            <th className="px-5 py-3 font-semibold">
              Victims
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
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <FileText size={17} />
                  </div>

                  <div>
                    <Link
                    href={`/cases/${caseItem.reference_code}`}
                    className="max-w-xs font-semibold !text-slate-900 transition hover:!text-teal-700"
  >
                     {caseItem.title}
                    </Link>

                    <p className="mt-1 font-mono text-xs text-slate-500">
                    {caseItem.reference_code}
                    </p>
                    </div>
                </div>
              </td>

              <td className="px-5 py-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin
                    size={15}
                    className="text-slate-400"
                  />

                  {caseItem.incident_district?.name
                    ?? 'Not specified'}
                </div>
              </td>

              <td className="px-5 py-4 text-sm text-slate-600">
                {caseItem.category_display
                  ?? formatLabel(caseItem.category)}
              </td>

              <td className="px-5 py-4">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(caseItem.status)}`}
                >
                  {caseItem.status_display
                    ?? formatLabel(caseItem.status)}
                </span>
              </td>

              <td className="px-5 py-4">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityClass(caseItem.priority)}`}
                >
                  {caseItem.priority_display
                    ?? formatLabel(caseItem.priority)}
                </span>
              </td>

              <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                {caseItem.total_victims ?? 0}
              </td>

              <td className="px-5 py-4 text-sm text-slate-500">
                {formatDate(caseItem.updated_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}


function CasesLoading() {
  return (
    <div className="space-y-3 p-5">
      {Array.from({
        length: 4,
      }).map((_, index) => (
        <div
          key={index}
          className="h-16 animate-pulse rounded-xl bg-slate-100"
        />
      ))}
    </div>
  )
}


function CasesError({
  onRetry,
}: {
  onRetry: () => void
}) {
  return (
    <div className="p-6">
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle
            size={21}
            className="shrink-0 text-red-600"
          />

          <div>
            <h3 className="font-bold text-red-900">
              Case records could not be loaded
            </h3>

            <p className="mt-1 text-sm text-red-700">
              Check the backend connection and your
              case-access permission.
            </p>

            <button
              type="button"
              onClick={onRetry}
              className="mt-3 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


function EmptyCases({
  hasFilters,
}: {
  hasFilters: boolean
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        {hasFilters
          ? <FileSearch size={27} />
          : <CheckCircle2 size={27} />}
      </div>

      <h3 className="mt-4 font-bold text-slate-900">
        {hasFilters
          ? 'No matching cases'
          : 'No cases available'}
      </h3>

      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
        {hasFilters
          ? (
            'Try changing or clearing the current '
            + 'search filters.'
          )
          : (
            'No case records are currently visible '
            + 'to this account.'
          )}
      </p>
    </div>
  )
}