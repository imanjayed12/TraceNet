import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  FileText,
  Filter,
  MapPin,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
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
import { useAuth } from '../../hooks/useAuth'

import type {
  CaseSummary,
} from '../../types/dashboard'
import type {
  CaseConfidentiality,
  CaseCreateData,
  CaseDistrict,
} from '../../types/cases'
import { Link } from 'wouter'


const caseCreatorRoles = new Set([
  'admin',
  'police',
  'government',
  'ngo',
])


const confidentialityOptions: Array<{
  value: CaseConfidentiality
  label: string
}> = [
  {
    value: 'internal',
    label: 'Internal',
  },
  {
    value: 'restricted',
    label: 'Restricted',
  },
  {
    value: 'highly_restricted',
    label: 'Highly restricted',
  },
]

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


function todayValue(): string {
  const today = new Date()
  const timezoneOffset = today.getTimezoneOffset() * 60_000

  return new Date(today.getTime() - timezoneOffset)
    .toISOString()
    .slice(0, 10)
}


function createInitialCaseData(): CaseCreateData {
  return {
    title: '',
    summary: '',
    category: 'suspected',
    priority: 'medium',
    confidentiality: 'restricted',
    incident_district_id: 0,
    location_description: '',
    latitude: null,
    longitude: null,
    incident_date: todayValue(),
    total_victims: 1,
    minor_victims: 0,
  }
}


function mutationErrorMessage(error: unknown): string {
  if (
    typeof error === 'object'
    && error !== null
    && 'response' in error
  ) {
    const response = (
      error as {
        response?: {
          data?: unknown
        }
      }
    ).response

    const data = response?.data

    if (typeof data === 'string') {
      return data
    }

    if (typeof data === 'object' && data !== null) {
      const firstValue = Object.values(data)[0]

      if (Array.isArray(firstValue)) {
        return String(firstValue[0])
      }

      if (typeof firstValue === 'string') {
        return firstValue
      }
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'The case could not be created. Please try again.'
}


export function CasesPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [searchInput, setSearchInput] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createdReference, setCreatedReference] = useState('')
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

  const districtsQuery = useQuery({
    queryKey: ['case-districts'],
    queryFn: casesApi.getDistricts,
    enabled: isCreateOpen,
  })

  const createCaseMutation = useMutation({
    mutationFn: casesApi.createCase,
    onSuccess: async (createdCase) => {
      setCreatedReference(createdCase.reference_code)
      setIsCreateOpen(false)

      await queryClient.invalidateQueries({
        queryKey: ['cases'],
      })
    },
  })

  const canCreateCases = Boolean(
  user
  && caseCreatorRoles.has(user.role),
)

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

            <div className="flex flex-wrap gap-3 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  void casesQuery.refetch()
                }}
                disabled={casesQuery.isFetching}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-teal-300 hover:text-teal-700 disabled:opacity-60"
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

              {canCreateCases && (
                <button
                  type="button"
                  onClick={() => {
                    setCreatedReference('')
                    createCaseMutation.reset()
                    setIsCreateOpen(true)
                  }}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#104968] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0b3b56]"
                >
                  <Plus size={17} />
                  Add case
                </button>
              )}
            </div>
          </div>

          {createdReference && (
            <div className="mt-5 flex flex-col gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 size={18} />
                New case submitted successfully.
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href={`/cases/${createdReference}`}
                  className="font-bold !text-emerald-800 underline underline-offset-4"
                >
                  View case {createdReference}
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setCreatedReference('')
                  }}
                  aria-label="Dismiss success message"
                >
                  <X size={17} />
                </button>
              </div>
            </div>
          )}

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

      {isCreateOpen && (
        <CreateCaseModal
          districts={districtsQuery.data ?? []}
          districtsLoading={districtsQuery.isLoading}
          isNgo={user?.role === 'ngo'}
          isSaving={createCaseMutation.isPending}
          error={
            createCaseMutation.isError
              ? mutationErrorMessage(createCaseMutation.error)
              : ''
          }
          onClose={() => {
            if (!createCaseMutation.isPending) {
              setIsCreateOpen(false)
            }
          }}
          onSubmit={(data) => {
            createCaseMutation.mutate(data)
          }}
        />
      )}
    </AppShell>
  )
}


function CreateCaseModal({
  districts,
  districtsLoading,
  isNgo,
  isSaving,
  error,
  onClose,
  onSubmit,
}: {
  districts: CaseDistrict[]
  districtsLoading: boolean
  isNgo: boolean
  isSaving: boolean
  error: string
  onClose: () => void
  onSubmit: (data: CaseCreateData) => void
}) {
  const [formData, setFormData] = useState<CaseCreateData>(
    createInitialCaseData,
  )
  const [validationError, setValidationError] = useState('')

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()
    setValidationError('')

    if (!formData.incident_district_id) {
      setValidationError('Select the incident district.')
      return
    }

    if (formData.minor_victims > formData.total_victims) {
      setValidationError(
        'Minor victim count cannot exceed total victims.',
      )
      return
    }

    const hasLatitude = Boolean(formData.latitude?.trim())
    const hasLongitude = Boolean(formData.longitude?.trim())

    if (hasLatitude !== hasLongitude) {
      setValidationError(
        'Provide both latitude and longitude, or leave both empty.',
      )
      return
    }

    onSubmit({
      ...formData,
      title: formData.title.trim(),
      summary: formData.summary.trim(),
      location_description: (
        formData.location_description.trim()
      ),
      latitude: formData.latitude?.trim() || null,
      longitude: formData.longitude?.trim() || null,
    })
  }

  const visibleConfidentialityOptions = isNgo
    ? confidentialityOptions.filter(
      (option) => option.value !== 'highly_restricted',
    )
    : confidentialityOptions

  return (
    <div
      className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/65 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-case-title"
    >
      <div className="mx-auto flex min-h-full max-w-3xl items-center justify-center">
        <div className="w-full overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
                Protected case submission
              </p>

              <h2
                id="create-case-title"
                className="mt-1 text-xl font-bold text-slate-950"
              >
                Add case record
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
              aria-label="Close case form"
            >
              <X size={19} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="max-h-[calc(100vh-12rem)] space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
              {isNgo && (
                <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm leading-6 text-teal-900">
                  <strong>NGO referral workflow:</strong>{' '}
                  the case will be submitted as reported and
                  unverified. An authorized operational officer
                  will review assignment and verification.
                </div>
              )}

              {(validationError || error) && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                  {validationError || error}
                </div>
              )}

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Case title
                </span>
                <input
                  required
                  maxLength={200}
                  value={formData.title}
                  onChange={(event) => {
                    setFormData((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }}
                  placeholder="Use an anonymized operational title"
                  className="h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormSelect
                  label="Category"
                  value={formData.category}
                  options={categoryOptions.slice(1)}
                  onChange={(value) => {
                    setFormData((current) => ({
                      ...current,
                      category: value as CaseCreateData['category'],
                    }))
                  }}
                />

                <FormSelect
                  label="Priority"
                  value={formData.priority}
                  options={priorityOptions.slice(1)}
                  onChange={(value) => {
                    setFormData((current) => ({
                      ...current,
                      priority: value as CaseCreateData['priority'],
                    }))
                  }}
                />

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Incident district
                  </span>
                  <select
                    required
                    value={formData.incident_district_id || ''}
                    disabled={districtsLoading}
                    onChange={(event) => {
                      setFormData((current) => ({
                        ...current,
                        incident_district_id: Number(
                          event.target.value,
                        ),
                      }))
                    }}
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 disabled:bg-slate-100"
                  >
                    <option value="">
                      {districtsLoading
                        ? 'Loading districts...'
                        : 'Select district'}
                    </option>
                    {districts.map((district) => (
                      <option key={district.id} value={district.id}>
                        {district.name} — {district.division_display}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Incident date
                  </span>
                  <input
                    required
                    type="date"
                    max={todayValue()}
                    value={formData.incident_date}
                    onChange={(event) => {
                      setFormData((current) => ({
                        ...current,
                        incident_date: event.target.value,
                      }))
                    }}
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Anonymized summary
                </span>
                <textarea
                  required
                  rows={4}
                  value={formData.summary}
                  onChange={(event) => {
                    setFormData((current) => ({
                      ...current,
                      summary: event.target.value,
                    }))
                  }}
                  placeholder="Describe the suspected incident without names, phone numbers or identifying details..."
                  className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  General location description
                </span>
                <input
                  required
                  value={formData.location_description}
                  onChange={(event) => {
                    setFormData((current) => ({
                      ...current,
                      location_description: event.target.value,
                    }))
                  }}
                  placeholder="Area, transit point or non-identifying landmark"
                  className="h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Total victims
                  </span>
                  <input
                    required
                    type="number"
                    min={0}
                    value={formData.total_victims}
                    onChange={(event) => {
                      setFormData((current) => ({
                        ...current,
                        total_victims: Number(event.target.value),
                      }))
                    }}
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Minor victims
                  </span>
                  <input
                    required
                    type="number"
                    min={0}
                    value={formData.minor_victims}
                    onChange={(event) => {
                      setFormData((current) => ({
                        ...current,
                        minor_victims: Number(event.target.value),
                      }))
                    }}
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Confidentiality
                  </span>
                  <select
                    value={formData.confidentiality}
                    onChange={(event) => {
                      setFormData((current) => ({
                        ...current,
                        confidentiality: event.target.value as CaseConfidentiality,
                      }))
                    }}
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
                  >
                    {visibleConfidentialityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Latitude (optional)
                  </span>
                  <input
                    inputMode="decimal"
                    value={formData.latitude ?? ''}
                    onChange={(event) => {
                      setFormData((current) => ({
                        ...current,
                        latitude: event.target.value,
                      }))
                    }}
                    placeholder="23.8103"
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Longitude (optional)
                  </span>
                  <input
                    inputMode="decimal"
                    value={formData.longitude ?? ''}
                    onChange={(event) => {
                      setFormData((current) => ({
                        ...current,
                        longitude: event.target.value,
                      }))
                    }}
                    placeholder="90.4125"
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
                  />
                </label>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                Do not enter victim names, exact home addresses,
                phone numbers or other directly identifying data.
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving || districtsLoading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#104968] px-5 text-sm font-semibold text-white transition hover:bg-[#0b3b56] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving && (
                  <LoaderCircle size={17} className="animate-spin" />
                )}
                {isSaving ? 'Submitting...' : 'Submit case'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}


function FormSelect({
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
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
        }}
        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
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
