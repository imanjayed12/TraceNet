import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Filter,
  LoaderCircle,
  MapPin,
  Plus,
  RefreshCw,
  Route as RouteIcon,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  routesApi,
} from '../../api/routes'
import type {
  RouteMutationData,
  RouteQueryFilters,
} from '../../api/routes'
import { AppShell } from '../../components/layout/AppShell'
import { useAuth } from '../../hooks/useAuth'
import type {
  District,
  IntelligenceRoute,
  RiskLevel,
  RouteType,
  TransportMode,
} from '../../types/map'
import { getApiErrorMessage } from '../../utils/apiError'


const initialFilters: RouteQueryFilters = {
  search: '',
  riskLevel: 'all',
  routeType: 'all',
  transportMode: 'all',
  verification: 'all',
  activity: 'all',
}


const initialFormData: RouteMutationData = {
  name: '',
  origin_id: 0,
  destination_id: 0,
  route_type: 'domestic',
  transport_mode: 'road',
  risk_level: 'medium',
  description: '',
  evidence_summary: '',
  is_verified: false,
  is_active: true,
}


const riskStyles: Record<
  RiskLevel,
  {
    badge: string
    icon: string
  }
> = {
  low: {
    badge: 'bg-emerald-50 text-emerald-700',
    icon: 'bg-emerald-50 text-emerald-700',
  },
  medium: {
    badge: 'bg-amber-50 text-amber-700',
    icon: 'bg-amber-50 text-amber-700',
  },
  high: {
    badge: 'bg-orange-50 text-orange-700',
    icon: 'bg-orange-50 text-orange-700',
  },
  critical: {
    badge: 'bg-red-50 text-red-700',
    icon: 'bg-red-50 text-red-700',
  },
}


function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-BD', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}


export function RoutesPage() {
  const { user } = useAuth()

  const [routes, setRoutes] = useState<
    IntelligenceRoute[]
  >([])
  const [districts, setDistricts] = useState<
    District[]
  >([])
  const [filters, setFilters] =
    useState<RouteQueryFilters>(initialFilters)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingRouteId, setDeletingRouteId] =
    useState<number | null>(null)

  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] =
    useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editingRoute, setEditingRoute] =
    useState<IntelligenceRoute | null>(null)
  const [formData, setFormData] =
    useState<RouteMutationData>(initialFormData)

  const role = user?.role ?? ''

  const canManageRoutes = [
    'admin',
    'police',
    'government',
    'analyst',
  ].includes(role)

  const canDeleteRoutes = role === 'admin'

  const loadRoutes = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const data = await routesApi.getRoutes(filters)
      setRoutes(data)
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'Unable to load route intelligence.',
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  const loadDistricts = useCallback(async () => {
    try {
      const data = await routesApi.getDistricts()
      setDistricts(data)
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'Unable to load district information.',
        ),
      )
    }
  }, [])

  useEffect(() => {
    void loadDistricts()
  }, [loadDistricts])

  useEffect(() => {
    void loadRoutes()
  }, [loadRoutes])

  const metrics = useMemo(() => {
    return {
      total: routes.length,
      active: routes.filter(
        (route) => route.is_active,
      ).length,
      critical: routes.filter(
        (route) => route.risk_level === 'critical',
      ).length,
      highRisk: routes.filter(
        (route) =>
          route.risk_level === 'critical'
          || route.risk_level === 'high',
      ).length,
      verified: routes.filter(
        (route) => route.is_verified,
      ).length,
      crossBorder: routes.filter(
        (route) =>
          route.route_type === 'cross_border',
      ).length,
    }
  }, [routes])

  const openCreateForm = () => {
    setEditingRoute(null)
    setFormData(initialFormData)
    setError('')
    setSuccessMessage('')
    setFormOpen(true)
  }

  const openEditForm = (
    route: IntelligenceRoute,
  ) => {
    setEditingRoute(route)
    setFormData({
      name: route.name,
      origin_id: route.origin.id,
      destination_id: route.destination.id,
      route_type: route.route_type,
      transport_mode: route.transport_mode,
      risk_level: route.risk_level,
      description: route.description,
      evidence_summary: route.evidence_summary,
      is_verified: route.is_verified,
      is_active: route.is_active,
    })
    setError('')
    setSuccessMessage('')
    setFormOpen(true)
  }

  const closeForm = () => {
    if (isSaving) {
      return
    }

    setFormOpen(false)
    setEditingRoute(null)
    setFormData(initialFormData)
  }

  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return 'Route name is required.'
    }

    if (!formData.origin_id) {
      return 'Select an origin district.'
    }

    if (!formData.destination_id) {
      return 'Select a destination district.'
    }

    if (
      formData.origin_id
      === formData.destination_id
    ) {
      return (
        'Origin and destination must be '
        + 'different districts.'
      )
    }

    return null
  }

  const handleSave = async () => {
    const validationError = validateForm()

    if (validationError) {
      setError(validationError)
      return
    }

    setIsSaving(true)
    setError('')
    setSuccessMessage('')

    try {
      const payload: RouteMutationData = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description.trim(),
        evidence_summary:
          formData.evidence_summary.trim(),
      }

      if (editingRoute) {
        await routesApi.updateRoute(
          editingRoute.id,
          payload,
        )

        setSuccessMessage(
          'Route intelligence updated successfully.',
        )
      } else {
        await routesApi.createRoute(payload)

        setSuccessMessage(
          'New route intelligence created successfully.',
        )
      }

      setFormOpen(false)
      setEditingRoute(null)
      setFormData(initialFormData)
      await loadRoutes()
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'Unable to save route intelligence.',
        ),
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (
    route: IntelligenceRoute,
  ) => {
    const confirmed = window.confirm(
      `Delete "${route.name}" permanently?`,
    )

    if (!confirmed) {
      return
    }

    setDeletingRouteId(route.id)
    setError('')
    setSuccessMessage('')

    try {
      await routesApi.deleteRoute(route.id)

      setSuccessMessage(
        'Route deleted successfully.',
      )

      await loadRoutes()
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'Unable to delete this route.',
        ),
      )
    } finally {
      setDeletingRouteId(null)
    }
  }

  const updateFilter = <
    Key extends keyof RouteQueryFilters,
  >(
    key: Key,
    value: RouteQueryFilters[Key],
  ) => {
    setFilters(
      (currentFilters) => ({
        ...currentFilters,
        [key]: value,
      }),
    )
  }

  const clearFilters = () => {
    setFilters(initialFilters)
  }

  return (
    <AppShell activeNavigation="routes">
      <main className="px-4 py-7 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1540px]">
          <header className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-teal-700">
                <RouteIcon size={18} />
                Route intelligence registry
              </div>

              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                Routes management
              </h1>

              <p className="mt-2 max-w-3xl text-slate-600">
                Monitor, assess and manage domestic and
                cross-border movement routes according to
                authorized operational roles.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  void loadRoutes()
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <RefreshCw size={18} />
                Refresh routes
              </button>

              {canManageRoutes && (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0f5273] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0a405b]"
                >
                  <Plus size={18} />
                  Add route
                </button>
              )}
            </div>
          </header>

          {error && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle
                size={19}
                className="mt-0.5 shrink-0"
              />
              <p>{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2
                size={19}
                className="mt-0.5 shrink-0"
              />
              <p>{successMessage}</p>
            </div>
          )}

          <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Visible routes"
              value={metrics.total}
              icon={
                <RouteIcon className="text-white" />
              }
              iconClassName="bg-[#0c4765]"
            />

            <MetricCard
              label="Active routes"
              value={metrics.active}
              icon={
                <CheckCircle2 className="text-teal-700" />
              }
              iconClassName="bg-teal-50"
            />

            <MetricCard
              label="High-risk routes"
              value={metrics.highRisk}
              detail={`${metrics.critical} critical`}
              icon={
                <AlertCircle className="text-red-700" />
              }
              iconClassName="bg-red-50"
            />

            <MetricCard
              label="Verified routes"
              value={metrics.verified}
              detail={`${metrics.crossBorder} cross-border`}
              icon={
                <ShieldCheck className="text-violet-700" />
              }
              iconClassName="bg-violet-50"
            />
          </section>

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

            <div className="mt-5 grid gap-4 xl:grid-cols-[1.6fr_repeat(4,1fr)]">
              <label className="relative">
                <span className="sr-only">
                  Search routes
                </span>

                <Search
                  size={19}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={filters.search ?? ''}
                  onChange={(event) => {
                    updateFilter(
                      'search',
                      event.target.value,
                    )
                  }}
                  placeholder="Search route, origin or destination..."
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </label>

              <FilterSelect
                value={filters.riskLevel ?? 'all'}
                onChange={(value) => {
                  updateFilter(
                    'riskLevel',
                    value as RiskLevel | 'all',
                  )
                }}
                options={[
                  ['all', 'All risk levels'],
                  ['critical', 'Critical'],
                  ['high', 'High'],
                  ['medium', 'Medium'],
                  ['low', 'Low'],
                ]}
              />

              <FilterSelect
                value={filters.routeType ?? 'all'}
                onChange={(value) => {
                  updateFilter(
                    'routeType',
                    value as RouteType | 'all',
                  )
                }}
                options={[
                  ['all', 'All route types'],
                  ['domestic', 'Domestic'],
                  ['cross_border', 'Cross-border'],
                ]}
              />

              <FilterSelect
                value={
                  filters.transportMode ?? 'all'
                }
                onChange={(value) => {
                  updateFilter(
                    'transportMode',
                    value as TransportMode | 'all',
                  )
                }}
                options={[
                  ['all', 'All transport'],
                  ['road', 'Road'],
                  ['rail', 'Rail'],
                  ['water', 'Water'],
                  ['air', 'Air'],
                  ['mixed', 'Mixed'],
                ]}
              />

              <FilterSelect
                value={
                  filters.verification ?? 'all'
                }
                onChange={(value) => {
                  updateFilter(
                    'verification',
                    value as
                      | 'all'
                      | 'verified'
                      | 'unverified',
                  )
                }}
                options={[
                  ['all', 'All verification'],
                  ['verified', 'Verified'],
                  ['unverified', 'Unverified'],
                ]}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <div className="w-full sm:w-56">
                <FilterSelect
                  value={filters.activity ?? 'all'}
                  onChange={(value) => {
                    updateFilter(
                      'activity',
                      value as
                        | 'all'
                        | 'active'
                        | 'inactive',
                    )
                  }}
                  options={[
                    ['all', 'All activity'],
                    ['active', 'Active only'],
                    ['inactive', 'Inactive only'],
                  ]}
                />
              </div>

              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"
              >
                <X size={17} />
                Clear all filters
              </button>
            </div>
          </section>

          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-5">
              <div>
                <h2 className="font-bold text-slate-950">
                  Route intelligence records
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {routes.length} authorized routes found
                </p>
              </div>

              <span className="rounded-full bg-teal-50 px-4 py-2 text-xs font-bold text-teal-700">
                Role-based management
              </span>
            </div>

            {isLoading ? (
              <div className="grid min-h-72 place-items-center">
                <div className="text-center">
                  <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-teal-700" />
                  <p className="mt-3 text-sm text-slate-500">
                    Loading route intelligence...
                  </p>
                </div>
              </div>
            ) : routes.length === 0 ? (
              <div className="grid min-h-72 place-items-center px-5">
                <div className="text-center">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-500">
                    <RouteIcon size={26} />
                  </div>

                  <h3 className="mt-4 font-bold text-slate-950">
                    No matching routes
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">
                    Change or clear the current filters.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px]">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-4">
                        Route
                      </th>
                      <th className="px-5 py-4">
                        Movement
                      </th>
                      <th className="px-5 py-4">
                        Type
                      </th>
                      <th className="px-5 py-4">
                        Transport
                      </th>
                      <th className="px-5 py-4">
                        Risk
                      </th>
                      <th className="px-5 py-4">
                        Verification
                      </th>
                      <th className="px-5 py-4">
                        Updated
                      </th>
                      <th className="px-5 py-4 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {routes.map((route) => (
                      <tr
                        key={route.id}
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-5">
                          <div className="flex items-start gap-3">
                            <div
                              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                                riskStyles[
                                  route.risk_level
                                ].icon
                              }`}
                            >
                              <RouteIcon size={20} />
                            </div>

                            <div>
                              <p className="font-semibold text-slate-950">
                                {route.name}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                ID: {route.id}
                                {!route.is_active
                                  ? ' · Inactive'
                                  : ''}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-5">
                          <div className="flex items-center gap-2 text-sm text-slate-700">
                            <MapPin
                              size={16}
                              className="text-teal-700"
                            />
                            <span>
                              {route.origin.name}
                              {' → '}
                              {route.destination.name}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-5 text-sm text-slate-600">
                          {route.route_type_display}
                        </td>

                        <td className="px-5 py-5 text-sm text-slate-600">
                          {route.transport_mode_display}
                        </td>

                        <td className="px-5 py-5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                              riskStyles[
                                route.risk_level
                              ].badge
                            }`}
                          >
                            {route.risk_level_display}
                          </span>
                        </td>

                        <td className="px-5 py-5">
                          {route.is_verified ? (
                            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                              <ShieldCheck size={16} />
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700">
                              <AlertCircle size={16} />
                              Unverified
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-5 text-sm text-slate-500">
                          {formatDate(route.updated_at)}
                        </td>

                        <td className="px-5 py-5">
                          <div className="flex justify-end gap-2">
                            {canManageRoutes && (
                              <button
                                type="button"
                                onClick={() => {
                                  openEditForm(route)
                                }}
                                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                                aria-label={`Edit ${route.name}`}
                                title="Edit route"
                              >
                                <Edit3 size={17} />
                              </button>
                            )}

                            {canDeleteRoutes && (
                              <button
                                type="button"
                                onClick={() => {
                                  void handleDelete(route)
                                }}
                                disabled={
                                  deletingRouteId
                                  === route.id
                                }
                                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label={`Delete ${route.name}`}
                                title="Delete route"
                              >
                                {deletingRouteId
                                  === route.id ? (
                                    <LoaderCircle
                                      size={17}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Trash2 size={17} />
                                  )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

      {formOpen && (
        <RouteFormModal
          editingRoute={editingRoute}
          districts={districts}
          formData={formData}
          setFormData={setFormData}
          isSaving={isSaving}
          error={error}
          onClose={closeForm}
          onSave={() => {
            void handleSave()
          }}
        />
      )}
    </AppShell>
  )
}


function MetricCard({
  label,
  value,
  detail,
  icon,
  iconClassName,
}: {
  label: string
  value: number
  detail?: string
  icon: React.ReactNode
  iconClassName: string
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

          {detail && (
            <p className="mt-2 text-sm text-slate-500">
              {detail}
            </p>
          )}
        </div>

        <div
          className={`grid h-12 w-12 place-items-center rounded-xl ${iconClassName}`}
        >
          {icon}
        </div>
      </div>
    </article>
  )
}


function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: Array<[string, string]>
}) {
  return (
    <select
      value={value}
      onChange={(event) => {
        onChange(event.target.value)
      }}
      className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
    >
      {options.map(([optionValue, label]) => (
        <option
          key={optionValue}
          value={optionValue}
        >
          {label}
        </option>
      ))}
    </select>
  )
}


function RouteFormModal({
  editingRoute,
  districts,
  formData,
  setFormData,
  isSaving,
  error,
  onClose,
  onSave,
}: {
  editingRoute: IntelligenceRoute | null
  districts: District[]
  formData: RouteMutationData
  setFormData: React.Dispatch<
    React.SetStateAction<RouteMutationData>
  >
  isSaving: boolean
  error: string
  onClose: () => void
  onSave: () => void
}) {
  const updateForm = <
    Key extends keyof RouteMutationData,
  >(
    key: Key,
    value: RouteMutationData[Key],
  ) => {
    setFormData(
      (currentData) => ({
        ...currentData,
        [key]: value,
      }),
    )
  }

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/60 px-4 py-8 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
              Secure route management
            </p>

            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              {editingRoute
                ? 'Edit route intelligence'
                : 'Add route intelligence'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            aria-label="Close form"
          >
            <X size={20} />
          </button>
        </header>

        <div className="space-y-5 px-6 py-6">
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle
                size={18}
                className="mt-0.5 shrink-0"
              />
              <p>{error}</p>
            </div>
          )}

          <FormField label="Route name">
            <input
              value={formData.name}
              onChange={(event) => {
                updateForm('name', event.target.value)
              }}
              placeholder="Example: Dhaka–Jashore Corridor"
              className="form-control"
            />
          </FormField>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Origin district">
              <select
                value={formData.origin_id}
                onChange={(event) => {
                  updateForm(
                    'origin_id',
                    Number(event.target.value),
                  )
                }}
                className="form-control"
              >
                <option value={0}>
                  Select origin
                </option>

                {districts.map((district) => (
                  <option
                    key={district.id}
                    value={district.id}
                  >
                    {district.name}
                    {' — '}
                    {district.division_display}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Destination district">
              <select
                value={formData.destination_id}
                onChange={(event) => {
                  updateForm(
                    'destination_id',
                    Number(event.target.value),
                  )
                }}
                className="form-control"
              >
                <option value={0}>
                  Select destination
                </option>

                {districts.map((district) => (
                  <option
                    key={district.id}
                    value={district.id}
                  >
                    {district.name}
                    {' — '}
                    {district.division_display}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <FormField label="Route type">
              <select
                value={formData.route_type}
                onChange={(event) => {
                  updateForm(
                    'route_type',
                    event.target.value as RouteType,
                  )
                }}
                className="form-control"
              >
                <option value="domestic">
                  Domestic
                </option>
                <option value="cross_border">
                  Cross-border
                </option>
              </select>
            </FormField>

            <FormField label="Transport mode">
              <select
                value={formData.transport_mode}
                onChange={(event) => {
                  updateForm(
                    'transport_mode',
                    event.target
                      .value as TransportMode,
                  )
                }}
                className="form-control"
              >
                <option value="road">Road</option>
                <option value="rail">Rail</option>
                <option value="water">Water</option>
                <option value="air">Air</option>
                <option value="mixed">Mixed</option>
              </select>
            </FormField>

            <FormField label="Risk level">
              <select
                value={formData.risk_level}
                onChange={(event) => {
                  updateForm(
                    'risk_level',
                    event.target.value as RiskLevel,
                  )
                }}
                className="form-control"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">
                  Critical
                </option>
              </select>
            </FormField>
          </div>

          <FormField label="Description">
            <textarea
              value={formData.description}
              onChange={(event) => {
                updateForm(
                  'description',
                  event.target.value,
                )
              }}
              rows={4}
              placeholder="Describe the route and operational context..."
              className="form-control resize-y"
            />
          </FormField>

          <FormField label="Evidence summary">
            <textarea
              value={formData.evidence_summary}
              onChange={(event) => {
                updateForm(
                  'evidence_summary',
                  event.target.value,
                )
              }}
              rows={4}
              placeholder="Record anonymized supporting evidence..."
              className="form-control resize-y"
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <ToggleField
              label="Verified intelligence"
              description="Mark only after formal assessment."
              checked={formData.is_verified}
              onChange={(checked) => {
                updateForm('is_verified', checked)
              }}
            />

            <ToggleField
              label="Active route"
              description="Include in current monitoring."
              checked={formData.is_active}
              onChange={(checked) => {
                updateForm('is_active', checked)
              }}
            />
          </div>
        </div>

        <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-200 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0f5273] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0a405b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving && (
              <LoaderCircle
                size={18}
                className="animate-spin"
              />
            )}

            {editingRoute
              ? 'Save changes'
              : 'Create route'}
          </button>
        </footer>
      </div>
    </div>
  )
}


function FormField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-800">
        {label}
      </span>
      {children}
    </label>
  )
}


function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => {
          onChange(event.target.checked)
        }}
        className="mt-1 h-4 w-4 accent-teal-600"
      />

      <span>
        <span className="block text-sm font-semibold text-slate-900">
          {label}
        </span>

        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {description}
        </span>
      </span>
    </label>
  )
}