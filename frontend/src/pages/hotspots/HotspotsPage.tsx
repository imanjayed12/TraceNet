import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Filter,
  LoaderCircle,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  hotspotsApi,
} from '../../api/hotspots'
import type {
  HotspotMutationData,
  HotspotSubmissionData,
} from '../../api/hotspots'
import { AppShell } from '../../components/layout/AppShell'
import { useAuth } from '../../hooks/useAuth'
import type {
  District,
  HotspotType,
  IntelligenceHotspot,
  RiskLevel,
} from '../../types/map'
import { getApiErrorMessage } from '../../utils/apiError'


interface HotspotFilters {
  search: string
  riskLevel: RiskLevel | 'all'
  hotspotType: HotspotType | 'all'
  verification: 'all' | 'verified' | 'unverified'
  activity: 'all' | 'active' | 'inactive'
  district: string
}


const initialFilters: HotspotFilters = {
  search: '',
  riskLevel: 'all',
  hotspotType: 'all',
  verification: 'all',
  activity: 'all',
  district: 'all',
}


const initialFormData: HotspotMutationData = {
  name: '',
  district_id: 0,
  latitude: '',
  longitude: '',
  hotspot_type: 'transit_hub',
  recent_case_count: 0,
  active_route_count: 0,
  verified_route_count: 0,
  vulnerability_score: 0,
  is_verified: false,
  is_active: true,
}


const riskStyles: Record<
  RiskLevel,
  { badge: string; icon: string }
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


function formatDate(value: string | null): string {
  if (!value) {
    return 'Not assessed'
  }

  return new Intl.DateTimeFormat('en-BD', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}


export function HotspotsPage() {
  const { user } = useAuth()
  const [hotspots, setHotspots] = useState<
    IntelligenceHotspot[]
  >([])
  const [districts, setDistricts] = useState<
    District[]
  >([])
  const [filters, setFilters] =
    useState<HotspotFilters>(initialFilters)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] =
    useState<number | null>(null)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] =
    useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingHotspot, setEditingHotspot] =
    useState<IntelligenceHotspot | null>(null)
  const [formData, setFormData] =
    useState<HotspotMutationData>(initialFormData)

  const role = user?.role ?? ''

  const canCreateHotspots = [
    'admin',
    'government',
    'analyst',
  ].includes(role)

  const canDelete = role === 'admin'
  const canControlWorkflow = role === 'admin'

  const canEditHotspot = (
    hotspot: IntelligenceHotspot,
  ): boolean => {
    if (
      role === 'admin'
      || role === 'analyst'
    ) {
      return true
    }

    if (role === 'government') {
      return (
        hotspot.created_by_id === user?.id
      )
    }

    return false
  }

  const loadHotspots = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const data = await hotspotsApi.getHotspots({
        include_inactive: true,
      })
      setHotspots(data)
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'Unable to load hotspot intelligence.',
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadDistricts = useCallback(async () => {
    try {
      setDistricts(await hotspotsApi.getDistricts())
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
    void loadHotspots()
  }, [loadDistricts, loadHotspots])

  const visibleHotspots = useMemo(() => {
    const search = filters.search.trim().toLowerCase()

    return hotspots.filter((hotspot) => {
      const matchesSearch = !search
        || hotspot.name.toLowerCase().includes(search)
        || hotspot.district.name.toLowerCase().includes(search)
        || hotspot.risk_explanation
          .toLowerCase().includes(search)
      const matchesRisk = filters.riskLevel === 'all'
        || hotspot.risk_level === filters.riskLevel
      const matchesType = filters.hotspotType === 'all'
        || hotspot.hotspot_type === filters.hotspotType
      const matchesDistrict = filters.district === 'all'
        || hotspot.district.slug === filters.district
      const matchesVerification =
        filters.verification === 'all'
        || (filters.verification === 'verified'
          ? hotspot.is_verified
          : !hotspot.is_verified)
      const matchesActivity = filters.activity === 'all'
        || (filters.activity === 'active'
          ? hotspot.is_active
          : !hotspot.is_active)

      return matchesSearch
        && matchesRisk
        && matchesType
        && matchesDistrict
        && matchesVerification
        && matchesActivity
    })
  }, [filters, hotspots])

  const metrics = useMemo(() => ({
    total: visibleHotspots.length,
    active: visibleHotspots.filter(
      (hotspot) => hotspot.is_active,
    ).length,
    highRisk: visibleHotspots.filter(
      (hotspot) => ['high', 'critical'].includes(
        hotspot.risk_level,
      ),
    ).length,
    critical: visibleHotspots.filter(
      (hotspot) => hotspot.risk_level === 'critical',
    ).length,
    verified: visibleHotspots.filter(
      (hotspot) => hotspot.is_verified,
    ).length,
    cases: visibleHotspots.reduce(
      (total, hotspot) => total + hotspot.recent_case_count,
      0,
    ),
  }), [visibleHotspots])

  const openCreateForm = () => {
    setEditingHotspot(null)
    setFormData(initialFormData)
    setError('')
    setSuccessMessage('')
    setFormOpen(true)
  }

  const openEditForm = (
    hotspot: IntelligenceHotspot,
  ) => {
    if (!canEditHotspot(hotspot)) {
      setError(
        'You do not have permission to edit this hotspot.',
      )
      return
    }

    setEditingHotspot(hotspot)
    setFormData({
      name: hotspot.name,
      district_id: hotspot.district.id,
      latitude: hotspot.latitude,
      longitude: hotspot.longitude,
      hotspot_type: hotspot.hotspot_type,
      recent_case_count: hotspot.recent_case_count,
      active_route_count: hotspot.active_route_count,
      verified_route_count: hotspot.verified_route_count,
      vulnerability_score: hotspot.vulnerability_score,
      is_verified: hotspot.is_verified,
      is_active: hotspot.is_active,
    })
    setError('')
    setSuccessMessage('')
    setFormOpen(true)
  }

  const closeForm = () => {
    if (!isSaving) {
      setFormOpen(false)
      setEditingHotspot(null)
      setFormData(initialFormData)
    }
  }

  const validateForm = (): string | null => {
    const latitude = Number(formData.latitude)
    const longitude = Number(formData.longitude)

    if (!formData.name.trim()) {
      return 'Hotspot name is required.'
    }
    if (!formData.district_id) {
      return 'Select a district.'
    }
    if (!formData.latitude.trim()
      || !Number.isFinite(latitude)
      || latitude < -90
      || latitude > 90) {
      return 'Enter a valid latitude between -90 and 90.'
    }
    if (!formData.longitude.trim()
      || !Number.isFinite(longitude)
      || longitude < -180
      || longitude > 180) {
      return 'Enter a valid longitude between -180 and 180.'
    }
    if (formData.verified_route_count
      > formData.active_route_count) {
      return 'Verified route count cannot exceed active route count.'
    }
    if (formData.vulnerability_score < 0
      || formData.vulnerability_score > 100) {
      return 'Vulnerability score must be between 0 and 100.'
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
      const basePayload: HotspotSubmissionData = {
        name: formData.name.trim(),
        district_id: formData.district_id,
        latitude: formData.latitude.trim(),
        longitude: formData.longitude.trim(),
        hotspot_type: formData.hotspot_type,
        recent_case_count:
          formData.recent_case_count,
        active_route_count:
          formData.active_route_count,
        verified_route_count:
          formData.verified_route_count,
        vulnerability_score:
          formData.vulnerability_score,
      }

      const payload: HotspotSubmissionData = (
        canControlWorkflow
          ? {
              ...basePayload,
              is_verified: formData.is_verified,
              is_active: formData.is_active,
            }
          : basePayload
      )

      if (editingHotspot) {
        await hotspotsApi.updateHotspot(
          editingHotspot.id,
          payload,
        )
        setSuccessMessage(
          'Hotspot assessment updated successfully.',
        )
      } else {
        await hotspotsApi.createHotspot(payload)
        setSuccessMessage(
          'New hotspot intelligence created successfully.',
        )
      }

      setFormOpen(false)
      setEditingHotspot(null)
      setFormData(initialFormData)
      await loadHotspots()
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'Unable to save hotspot intelligence.',
        ),
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (
    hotspot: IntelligenceHotspot,
  ) => {
    if (!window.confirm(
      `Delete "${hotspot.name}" permanently?`,
    )) {
      return
    }

    setDeletingId(hotspot.id)
    setError('')
    setSuccessMessage('')

    try {
      await hotspotsApi.deleteHotspot(hotspot.id)
      setSuccessMessage('Hotspot deleted successfully.')
      await loadHotspots()
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'Unable to delete this hotspot.',
        ),
      )
    } finally {
      setDeletingId(null)
    }
  }

  const updateFilter = <Key extends keyof HotspotFilters>(
    key: Key,
    value: HotspotFilters[Key],
  ) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }))
  }

  return (
    <AppShell activeNavigation="hotspots">
      <main className="px-4 py-7 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1540px]">
          <header className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-teal-700">
                <MapPin size={18} />
                Geospatial risk registry
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                Hotspots management
              </h1>
              <p className="mt-2 max-w-3xl text-slate-600">
                Assess vulnerable locations using explainable,
                backend-calculated risk intelligence.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void loadHotspots()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <RefreshCw size={18} />
                Refresh hotspots
              </button>
              {canCreateHotspots && (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0f5273] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#0a405b]"
                >
                  <Plus size={18} />
                  Add hotspot
                </button>
              )}
            </div>
          </header>

          <StatusMessage type="error" message={error} />
          <StatusMessage
            type="success"
            message={successMessage}
          />

          <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Visible hotspots"
              value={metrics.total}
              icon={<MapPin className="text-white" />}
              iconClassName="bg-[#0c4765]"
            />
            <MetricCard
              label="Active monitoring"
              value={metrics.active}
              icon={<CheckCircle2 className="text-teal-700" />}
              iconClassName="bg-teal-50"
            />
            <MetricCard
              label="High-risk hotspots"
              value={metrics.highRisk}
              detail={`${metrics.critical} critical`}
              icon={<AlertCircle className="text-red-700" />}
              iconClassName="bg-red-50"
            />
            <MetricCard
              label="Verified hotspots"
              value={metrics.verified}
              detail={`${metrics.cases} recent cases`}
              icon={<ShieldCheck className="text-violet-700" />}
              iconClassName="bg-violet-50"
            />
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-teal-700" />
              <h2 className="font-bold text-slate-950">
                Search and filters
              </h2>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[1.5fr_repeat(4,1fr)]">
              <label className="relative">
                <span className="sr-only">Search hotspots</span>
                <Search
                  size={19}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={filters.search}
                  onChange={(event) => updateFilter(
                    'search',
                    event.target.value,
                  )}
                  placeholder="Search hotspot, district or assessment..."
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </label>

              <FilterSelect
                value={filters.riskLevel}
                onChange={(value) => updateFilter(
                  'riskLevel',
                  value as RiskLevel | 'all',
                )}
                options={[
                  ['all', 'All risk levels'],
                  ['critical', 'Critical'],
                  ['high', 'High'],
                  ['medium', 'Medium'],
                  ['low', 'Low'],
                ]}
              />
              <FilterSelect
                value={filters.hotspotType}
                onChange={(value) => updateFilter(
                  'hotspotType',
                  value as HotspotType | 'all',
                )}
                options={[
                  ['all', 'All hotspot types'],
                  ['transit_hub', 'Transit hub'],
                  ['border_area', 'Border area'],
                  ['urban_center', 'Urban center'],
                  ['industrial_area', 'Industrial area'],
                  ['coastal_area', 'Coastal area'],
                  ['other', 'Other'],
                ]}
              />
              <FilterSelect
                value={filters.verification}
                onChange={(value) => updateFilter(
                  'verification',
                  value as HotspotFilters['verification'],
                )}
                options={[
                  ['all', 'All verification'],
                  ['verified', 'Verified'],
                  ['unverified', 'Unverified'],
                ]}
              />
              <FilterSelect
                value={filters.activity}
                onChange={(value) => updateFilter(
                  'activity',
                  value as HotspotFilters['activity'],
                )}
                options={[
                  ['all', 'All activity'],
                  ['active', 'Active only'],
                  ['inactive', 'Inactive only'],
                ]}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <div className="w-full sm:w-72">
                <FilterSelect
                  value={filters.district}
                  onChange={(value) => updateFilter(
                    'district',
                    value,
                  )}
                  options={[
                    ['all', 'All districts'],
                    ...districts.map((district) => [
                      district.slug,
                      `${district.name} — ${district.division_display}`,
                    ] as [string, string]),
                  ]}
                />
              </div>
              <button
                type="button"
                onClick={() => setFilters(initialFilters)}
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
                  Hotspot intelligence records
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {visibleHotspots.length} authorized hotspots found
                </p>
              </div>
              <span className="rounded-full bg-teal-50 px-4 py-2 text-xs font-bold text-teal-700">
                Explainable risk scoring
              </span>
            </div>

            {isLoading ? (
              <EmptyState loading />
            ) : visibleHotspots.length === 0 ? (
              <EmptyState />
            ) : (
              <HotspotTable
                hotspots={visibleHotspots}
                canEdit={canEditHotspot}
                canDelete={canDelete}
                deletingId={deletingId}
                onEdit={openEditForm}
                onDelete={(hotspot) => {
                  void handleDelete(hotspot)
                }}
              />
            )}
          </section>
        </div>
      </main>

      {formOpen && (
        <HotspotFormModal
          editingHotspot={editingHotspot}
          districts={districts}
          formData={formData}
          setFormData={setFormData}
          isSaving={isSaving}
          error={error}
          canControlWorkflow={
            canControlWorkflow
          }
          onClose={closeForm}
          onSave={() => void handleSave()}
        />
      )}
    </AppShell>
  )
}


function StatusMessage({
  type,
  message,
}: {
  type: 'error' | 'success'
  message: string
}) {
  if (!message) {
    return null
  }

  const isError = type === 'error'
  const Icon = isError ? AlertCircle : CheckCircle2

  return (
    <div className={`mt-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
      isError
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
    }`}>
      <Icon size={19} className="mt-0.5 shrink-0" />
      <p>{message}</p>
    </div>
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
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
          {detail && (
            <p className="mt-2 text-sm text-slate-500">{detail}</p>
          )}
        </div>
        <div className={`grid h-12 w-12 place-items-center rounded-xl ${iconClassName}`}>
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
      onChange={(event) => onChange(event.target.value)}
      className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
    >
      {options.map(([optionValue, label]) => (
        <option key={optionValue} value={optionValue}>
          {label}
        </option>
      ))}
    </select>
  )
}


function EmptyState({ loading = false }: { loading?: boolean }) {
  return (
    <div className="grid min-h-72 place-items-center px-5">
      <div className="text-center">
        {loading ? (
          <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-teal-700" />
        ) : (
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-500">
            <MapPin size={26} />
          </div>
        )}
        <h3 className="mt-4 font-bold text-slate-950">
          {loading ? 'Loading hotspot intelligence...' : 'No matching hotspots'}
        </h3>
        {!loading && (
          <p className="mt-2 text-sm text-slate-500">
            Change or clear the current filters.
          </p>
        )}
      </div>
    </div>
  )
}


function HotspotTable({
  hotspots,
  canEdit,
  canDelete,
  deletingId,
  onEdit,
  onDelete,
}: {
  hotspots: IntelligenceHotspot[]
    canEdit: (
    hotspot: IntelligenceHotspot,
  ) => boolean
  canDelete: boolean
  deletingId: number | null
  onEdit: (hotspot: IntelligenceHotspot) => void
  onDelete: (hotspot: IntelligenceHotspot) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1180px]">
        <thead className="bg-slate-50">
          <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-500">
            {['Hotspot', 'District', 'Type', 'Risk score', 'Cases / routes', 'Verification', 'Assessed', 'Actions'].map(
              (heading) => (
                <th
                  key={heading}
                  className={`px-5 py-4 ${heading === 'Actions' ? 'text-right' : ''}`}
                >
                  {heading}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {hotspots.map((hotspot) => (
            <tr key={hotspot.id} className="hover:bg-slate-50/70">
              <td className="px-5 py-5">
                <div className="flex items-start gap-3">
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                    riskStyles[hotspot.risk_level].icon
                  }`}>
                    <MapPin size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-950">{hotspot.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      ID: {hotspot.id}{!hotspot.is_active ? ' · Inactive' : ''}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-5 text-sm text-slate-700">
                {hotspot.district.name}
                <span className="block text-xs text-slate-500">
                  {hotspot.district.division_display}
                </span>
              </td>
              <td className="px-5 py-5 text-sm text-slate-600">
                {hotspot.hotspot_type_display}
              </td>
              <td className="px-5 py-5">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                    riskStyles[hotspot.risk_level].badge
                  }`}>
                    {hotspot.risk_level_display}
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {hotspot.risk_score}/100
                  </span>
                </div>
              </td>
              <td className="px-5 py-5 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <Users size={15} className="text-teal-700" />
                  {hotspot.recent_case_count} cases
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  {hotspot.active_route_count} active · {hotspot.verified_route_count} verified
                </span>
              </td>
              <td className="px-5 py-5">
                <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                  hotspot.is_verified ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                  {hotspot.is_verified
                    ? <ShieldCheck size={16} />
                    : <AlertCircle size={16} />}
                  {hotspot.is_verified ? 'Verified' : 'Unverified'}
                </span>
              </td>
              <td className="px-5 py-5 text-sm text-slate-500">
                {formatDate(hotspot.last_assessed_at)}
              </td>
              <td className="px-5 py-5">
                <div className="flex justify-end gap-2">
                  {canEdit(hotspot) && (
                    <button
                      type="button"
                      onClick={() => onEdit(hotspot)}
                      className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                      aria-label={`Edit ${hotspot.name}`}
                      title="Edit hotspot"
                    >
                      <Edit3 size={17} />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(hotspot)}
                      disabled={deletingId === hotspot.id}
                      className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                      aria-label={`Delete ${hotspot.name}`}
                      title="Delete hotspot"
                    >
                      {deletingId === hotspot.id
                        ? <LoaderCircle size={17} className="animate-spin" />
                        : <Trash2 size={17} />}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}


function HotspotFormModal({
  editingHotspot,
  districts,
  formData,
  setFormData,
  isSaving,
  error,
  canControlWorkflow,
  onClose,
  onSave,
}: {
  editingHotspot: IntelligenceHotspot | null
  districts: District[]
  formData: HotspotMutationData
  setFormData: React.Dispatch<React.SetStateAction<HotspotMutationData>>
  isSaving: boolean
  error: string
  canControlWorkflow: boolean
  onClose: () => void
  onSave: () => void
}) {
  const updateForm = <Key extends keyof HotspotMutationData>(
    key: Key,
    value: HotspotMutationData[Key],
  ) => {
    setFormData((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const numberValue = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => Math.max(0, Number(event.target.value) || 0)

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/60 px-4 py-8 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
              Explainable hotspot assessment
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              {editingHotspot ? 'Edit hotspot intelligence' : 'Add hotspot intelligence'}
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
          <StatusMessage type="error" message={error} />

          <FormField label="Hotspot name">
            <input
              value={formData.name}
              onChange={(event) => updateForm('name', event.target.value)}
              placeholder="Example: Dhaka Transit Hub"
              className="form-control"
            />
          </FormField>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="District">
              <select
                value={formData.district_id}
                onChange={(event) => updateForm(
                  'district_id',
                  Number(event.target.value),
                )}
                className="form-control"
              >
                <option value={0}>Select district</option>
                {districts.map((district) => (
                  <option key={district.id} value={district.id}>
                    {district.name} — {district.division_display}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Hotspot type">
              <select
                value={formData.hotspot_type}
                onChange={(event) => updateForm(
                  'hotspot_type',
                  event.target.value as HotspotType,
                )}
                className="form-control"
              >
                <option value="transit_hub">Transit hub</option>
                <option value="border_area">Border area</option>
                <option value="urban_center">Urban center</option>
                <option value="industrial_area">Industrial area</option>
                <option value="coastal_area">Coastal area</option>
                <option value="other">Other</option>
              </select>
            </FormField>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Latitude">
              <input
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(event) => updateForm('latitude', event.target.value)}
                placeholder="23.8103"
                className="form-control"
              />
            </FormField>
            <FormField label="Longitude">
              <input
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(event) => updateForm('longitude', event.target.value)}
                placeholder="90.4125"
                className="form-control"
              />
            </FormField>
          </div>

          <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
            <p className="text-sm font-bold text-teal-900">
              Automatic risk assessment
            </p>
            <p className="mt-1 text-xs leading-5 text-teal-700">
              TraceNet calculates the risk score, level, factors and explanation after saving.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <FormField label="Recent cases">
              <input
                type="number"
                min={0}
                value={formData.recent_case_count}
                onChange={(event) => updateForm('recent_case_count', numberValue(event))}
                className="form-control"
              />
            </FormField>
            <FormField label="Active routes">
              <input
                type="number"
                min={0}
                value={formData.active_route_count}
                onChange={(event) => updateForm('active_route_count', numberValue(event))}
                className="form-control"
              />
            </FormField>
            <FormField label="Verified routes">
              <input
                type="number"
                min={0}
                value={formData.verified_route_count}
                onChange={(event) => updateForm('verified_route_count', numberValue(event))}
                className="form-control"
              />
            </FormField>
            <FormField label="Vulnerability (0–100)">
              <input
                type="number"
                min={0}
                max={100}
                value={formData.vulnerability_score}
                onChange={(event) => updateForm('vulnerability_score', numberValue(event))}
                className="form-control"
              />
            </FormField>
          </div>

          {editingHotspot && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Current calculated assessment
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {editingHotspot.risk_explanation}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                  riskStyles[editingHotspot.risk_level].badge
                }`}>
                  {editingHotspot.risk_level_display} · {editingHotspot.risk_score}/100
                </span>
              </div>
            </div>
          )}

          {canControlWorkflow ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <ToggleField
                label="Verified intelligence"
                description="Mark only after formal assessment."
                checked={formData.is_verified}
                onChange={(checked) => {
                  updateForm(
                    'is_verified',
                    checked,
                  )
                }}
              />

              <ToggleField
                label="Active hotspot"
                description="Include in current monitoring."
                checked={formData.is_active}
                onChange={(checked) => {
                  updateForm(
                    'is_active',
                    checked,
                  )
                }}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3">
              <p className="text-sm font-semibold text-teal-900">
                Administrative review required
              </p>

              <p className="mt-1 text-sm leading-6 text-teal-700">
                The hotspot remains active and unverified
                until an administrator completes the
                formal review.
              </p>
            </div>
          )}
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
            className="inline-flex items-center gap-2 rounded-xl bg-[#0f5273] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0a405b] disabled:opacity-60"
          >
            {isSaving && <LoaderCircle size={18} className="animate-spin" />}
            {editingHotspot ? 'Save assessment' : 'Create hotspot'}
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
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 accent-teal-600"
      />
      <span>
        <span className="block text-sm font-semibold text-slate-900">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
      </span>
    </label>
  )
}