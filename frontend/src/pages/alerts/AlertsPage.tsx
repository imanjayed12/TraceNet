import {
  AlertCircle,
  Bell,
  Check,
  CheckCircle2,
  CheckCheck,
  Clock3,
  Edit3,
  Filter,
  LoaderCircle,
  MailOpen,
  Plus,
  RefreshCw,
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

import { alertsApi } from '../../api/alerts'
import { apiClient } from '../../api/client'
import { AppShell } from '../../components/layout/AppShell'
import { useAuth } from '../../hooks/useAuth'
import type {
  AlertCreateData,
  AlertInboxItem,
  AlertRecord,
  AlertSeverity,
  AlertStatus,
  AlertType,
  AlertUpdateData,
  TargetRole,
} from '../../types/alerts'
import { getApiErrorMessage } from '../../utils/apiError'


type WorkspaceTab = 'inbox' | 'management'
type InboxFilter = 'all' | 'unread' | 'unacknowledged'

interface SourceOption {
  id: number
  label: string
  value: string
}

interface AlertFormState {
  alert_type: AlertType
  severity: AlertSeverity
  status: AlertStatus
  title: string
  message: string
  source_value: string
  target_roles: TargetRole[]
  expires_at: string
}


const initialForm: AlertFormState = {
  alert_type: 'manual',
  severity: 'warning',
  status: 'active',
  title: '',
  message: '',
  source_value: '',
  target_roles: [],
  expires_at: '',
}


const severityStyles: Record<
  AlertSeverity,
  { badge: string; icon: string; border: string }
> = {
  info: {
    badge: 'bg-blue-50 text-blue-700',
    icon: 'bg-blue-50 text-blue-700',
    border: 'border-l-blue-500',
  },
  warning: {
    badge: 'bg-amber-50 text-amber-700',
    icon: 'bg-amber-50 text-amber-700',
    border: 'border-l-amber-500',
  },
  high: {
    badge: 'bg-orange-50 text-orange-700',
    icon: 'bg-orange-50 text-orange-700',
    border: 'border-l-orange-500',
  },
  critical: {
    badge: 'bg-red-50 text-red-700',
    icon: 'bg-red-50 text-red-700',
    border: 'border-l-red-600',
  },
}


const roleOptions: Array<[TargetRole, string]> = [
  ['police', 'Police'],
  ['ngo', 'NGO Worker'],
  ['analyst', 'Analyst'],
  ['government', 'Government Authority'],
  ['admin', 'Administrator'],
]


function normalizeList<T>(
  data: T[] | { results: T[] },
): T[] {
  return Array.isArray(data) ? data : data.results
}


function formatDate(value: string | null): string {
  if (!value) {
    return 'No expiry'
  }

  return new Intl.DateTimeFormat('en-BD', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}


function sourceLabel(item: {
  case_reference: string | null
  hotspot_name: string | null
  route_name: string | null
}): string {
  return item.case_reference
    ?? item.hotspot_name
    ?? item.route_name
    ?? 'General notification'
}


export function AlertsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<WorkspaceTab>('inbox')
  const [inbox, setInbox] = useState<AlertInboxItem[]>([])
  const [alerts, setAlerts] = useState<AlertRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionId, setActionId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [severity, setSeverity] =
    useState<AlertSeverity | 'all'>('all')
  const [inboxFilter, setInboxFilter] =
    useState<InboxFilter>('all')
  const [statusFilter, setStatusFilter] =
    useState<AlertStatus | 'all'>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editingAlert, setEditingAlert] =
    useState<AlertRecord | null>(null)

  const role = user?.role ?? ''
  const canManage = ['admin', 'police', 'government'].includes(role)
  const canDelete = role === 'admin'

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const [inboxData, alertData] = await Promise.all([
        alertsApi.getInbox(),
        alertsApi.getAlerts(),
      ])
      setInbox(inboxData)
      setAlerts(alertData)
    } catch (requestError) {
      setError(getApiErrorMessage(
        requestError,
        'Unable to load alert intelligence.',
      ))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const filteredInbox = useMemo(() => {
    const query = search.trim().toLowerCase()

    return inbox.filter((item) => {
      const matchesSearch = !query
        || item.title.toLowerCase().includes(query)
        || item.message.toLowerCase().includes(query)
        || sourceLabel(item).toLowerCase().includes(query)
      const matchesSeverity = severity === 'all'
        || item.severity === severity
      const matchesState = inboxFilter === 'all'
        || (inboxFilter === 'unread' && !item.is_read)
        || (inboxFilter === 'unacknowledged'
          && !item.is_acknowledged)

      return matchesSearch && matchesSeverity && matchesState
    })
  }, [inbox, inboxFilter, search, severity])

  const filteredAlerts = useMemo(() => {
    const query = search.trim().toLowerCase()

    return alerts.filter((alert) => {
      const matchesSearch = !query
        || alert.title.toLowerCase().includes(query)
        || alert.message.toLowerCase().includes(query)
        || sourceLabel(alert).toLowerCase().includes(query)
      const matchesSeverity = severity === 'all'
        || alert.severity === severity
      const matchesStatus = statusFilter === 'all'
        || alert.status === statusFilter

      return matchesSearch && matchesSeverity && matchesStatus
    })
  }, [alerts, search, severity, statusFilter])

  const metrics = useMemo(() => ({
    active: alerts.filter((alert) => alert.status === 'active').length,
    unread: inbox.filter((item) => !item.is_read).length,
    awaiting: inbox.filter((item) => !item.is_acknowledged).length,
    critical: inbox.filter((item) => item.severity === 'critical').length,
  }), [alerts, inbox])

  const runRecipientAction = async (
    item: AlertInboxItem,
    action: 'read' | 'acknowledge',
  ) => {
    setActionId(item.id)
    setError('')
    setSuccess('')

    try {
      const response = action === 'read'
        ? await alertsApi.markRead(item.id)
        : await alertsApi.acknowledge(item.id)
      setSuccess(response.detail)
      await loadData()
    } catch (requestError) {
      setError(getApiErrorMessage(
        requestError,
        'Unable to update this alert.',
      ))
    } finally {
      setActionId(null)
    }
  }

  const handleDelete = async (alert: AlertRecord) => {
    if (!window.confirm(`Delete "${alert.title}" permanently?`)) {
      return
    }

    setActionId(alert.id)
    setError('')
    setSuccess('')

    try {
      await alertsApi.deleteAlert(alert.id)
      setSuccess('Alert deleted successfully.')
      await loadData()
    } catch (requestError) {
      setError(getApiErrorMessage(
        requestError,
        'Unable to delete this alert.',
      ))
    } finally {
      setActionId(null)
    }
  }

  const openCreate = () => {
    setEditingAlert(null)
    setError('')
    setSuccess('')
    setFormOpen(true)
  }

  const openEdit = (alert: AlertRecord) => {
    setEditingAlert(alert)
    setError('')
    setSuccess('')
    setFormOpen(true)
  }

  return (
    <AppShell
      activeNavigation="alerts"
      unreadAlertCount={metrics.unread}
    >
      <main className="px-4 py-7 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1540px]">
          <header className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-teal-700">
                <Bell size={18} />
                Coordinated notifications
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                Alerts intelligence
              </h1>
              <p className="mt-2 max-w-3xl text-slate-600">
                Review priority notifications, acknowledge operational
                intelligence and manage role-based alerts.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void loadData()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <RefreshCw size={18} />
                Refresh alerts
              </button>
              {canManage && (
                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0f5273] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#0a405b]"
                >
                  <Plus size={18} />
                  Create alert
                </button>
              )}
            </div>
          </header>

          <StatusMessage type="error" message={error} />
          <StatusMessage type="success" message={success} />

          <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Active alerts"
              value={metrics.active}
              icon={<Bell className="text-white" />}
              iconClassName="bg-[#0c4765]"
            />
            <MetricCard
              label="Unread inbox"
              value={metrics.unread}
              icon={<MailOpen className="text-teal-700" />}
              iconClassName="bg-teal-50"
            />
            <MetricCard
              label="Awaiting acknowledgement"
              value={metrics.awaiting}
              icon={<Clock3 className="text-amber-700" />}
              iconClassName="bg-amber-50"
            />
            <MetricCard
              label="Critical notifications"
              value={metrics.critical}
              icon={<AlertCircle className="text-red-700" />}
              iconClassName="bg-red-50"
            />
          </section>

          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 pt-4">
              <div className="flex gap-6">
                <TabButton
                  active={tab === 'inbox'}
                  onClick={() => setTab('inbox')}
                  label="My inbox"
                  count={inbox.length}
                />
                <TabButton
                  active={tab === 'management'}
                  onClick={() => setTab('management')}
                  label="Alert registry"
                  count={alerts.length}
                />
              </div>
              <span className="mb-4 rounded-full bg-teal-50 px-4 py-2 text-xs font-bold text-teal-700">
                Role-based visibility
              </span>
            </div>

            <div className="border-b border-slate-200 p-5">
              <div className="flex items-center gap-2">
                <Filter size={19} className="text-teal-700" />
                <h2 className="font-bold text-slate-950">
                  Search and filters
                </h2>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
                <label className="relative">
                  <Search
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search title, message or source..."
                    className="h-12 w-full rounded-xl border border-slate-300 pl-12 pr-4 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </label>
                <FilterSelect
                  value={severity}
                  onChange={(value) => setSeverity(
                    value as AlertSeverity | 'all',
                  )}
                  options={[
                    ['all', 'All severities'],
                    ['critical', 'Critical'],
                    ['high', 'High'],
                    ['warning', 'Warning'],
                    ['info', 'Information'],
                  ]}
                />
                {tab === 'inbox' ? (
                  <FilterSelect
                    value={inboxFilter}
                    onChange={(value) => setInboxFilter(
                      value as InboxFilter,
                    )}
                    options={[
                      ['all', 'All inbox alerts'],
                      ['unread', 'Unread only'],
                      ['unacknowledged', 'Awaiting acknowledgement'],
                    ]}
                  />
                ) : (
                  <FilterSelect
                    value={statusFilter}
                    onChange={(value) => setStatusFilter(
                      value as AlertStatus | 'all',
                    )}
                    options={[
                      ['all', 'All statuses'],
                      ['active', 'Active'],
                      ['resolved', 'Resolved'],
                      ['cancelled', 'Cancelled'],
                    ]}
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setSeverity('all')
                    setInboxFilter('all')
                    setStatusFilter('all')
                  }}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <X size={17} />
                  Clear
                </button>
              </div>
            </div>

            {isLoading ? (
              <EmptyState loading />
            ) : tab === 'inbox' ? (
              <InboxList
                items={filteredInbox}
                actionId={actionId}
                onRead={(item) => void runRecipientAction(item, 'read')}
                onAcknowledge={(item) => void runRecipientAction(
                  item,
                  'acknowledge',
                )}
              />
            ) : (
              <ManagementTable
                alerts={filteredAlerts}
                canManage={canManage}
                canDelete={canDelete}
                actionId={actionId}
                onEdit={openEdit}
                onDelete={(alert) => void handleDelete(alert)}
              />
            )}
          </section>
        </div>
      </main>

      {formOpen && (
        <AlertFormModal
          editingAlert={editingAlert}
          onClose={() => setFormOpen(false)}
          onSaved={async (message) => {
            setFormOpen(false)
            setSuccess(message)
            await loadData()
          }}
        />
      )}
    </AppShell>
  )
}


function InboxList({
  items,
  actionId,
  onRead,
  onAcknowledge,
}: {
  items: AlertInboxItem[]
  actionId: number | null
  onRead: (item: AlertInboxItem) => void
  onAcknowledge: (item: AlertInboxItem) => void
}) {
  if (items.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="divide-y divide-slate-100">
      {items.map((item) => (
        <article
          key={item.id}
          className={`border-l-4 px-5 py-5 ${
            severityStyles[item.severity].border
          } ${item.is_read ? 'bg-white' : 'bg-sky-50/40'}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                severityStyles[item.severity].icon
              }`}>
                <Bell size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-slate-950">{item.title}</h3>
                  {!item.is_read && (
                    <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                      New
                    </span>
                  )}
                  <SeverityBadge severity={item.severity} />
                </div>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                  {item.message}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                  <span>Source: {sourceLabel(item)}</span>
                  <span>Received: {formatDate(item.alert_created_at)}</span>
                  <span>Delivery: {item.delivery_status}</span>
                  {item.expires_at && (
                    <span>Expires: {formatDate(item.expires_at)}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!item.is_read && (
                <button
                  type="button"
                  onClick={() => onRead(item)}
                  disabled={actionId === item.id}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <Check size={16} />
                  Mark read
                </button>
              )}
              {!item.is_acknowledged ? (
                <button
                  type="button"
                  onClick={() => onAcknowledge(item)}
                  disabled={actionId === item.id}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0f5273] px-3 py-2 text-xs font-bold text-white hover:bg-[#0a405b] disabled:opacity-50"
                >
                  {actionId === item.id
                    ? <LoaderCircle size={16} className="animate-spin" />
                    : <CheckCheck size={16} />}
                  Acknowledge
                </button>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                  <ShieldCheck size={16} />
                  Acknowledged
                </span>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}


function ManagementTable({
  alerts,
  canManage,
  canDelete,
  actionId,
  onEdit,
  onDelete,
}: {
  alerts: AlertRecord[]
  canManage: boolean
  canDelete: boolean
  actionId: number | null
  onEdit: (alert: AlertRecord) => void
  onDelete: (alert: AlertRecord) => void
}) {
  if (alerts.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px]">
        <thead className="bg-slate-50">
          <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-500">
            {['Alert', 'Type / source', 'Severity', 'Status', 'Recipients', 'Created', 'Actions'].map(
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
          {alerts.map((alert) => (
            <tr key={alert.id} className="hover:bg-slate-50/70">
              <td className="max-w-md px-5 py-5">
                <p className="font-semibold text-slate-950">{alert.title}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                  {alert.message}
                </p>
              </td>
              <td className="px-5 py-5 text-sm text-slate-700">
                {alert.alert_type_display}
                <span className="mt-1 block text-xs text-slate-500">
                  {sourceLabel(alert)}
                </span>
              </td>
              <td className="px-5 py-5">
                <SeverityBadge severity={alert.severity} />
              </td>
              <td className="px-5 py-5">
                <span className={`text-sm font-semibold ${
                  alert.status === 'active'
                    ? 'text-emerald-700'
                    : 'text-slate-600'
                }`}>
                  {alert.status_display}
                </span>
              </td>
              <td className="px-5 py-5 text-sm text-slate-600">
                {alert.recipient_count}
              </td>
              <td className="px-5 py-5 text-sm text-slate-500">
                {formatDate(alert.created_at)}
              </td>
              <td className="px-5 py-5">
                <div className="flex justify-end gap-2">
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => onEdit(alert)}
                      className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                      aria-label={`Edit ${alert.title}`}
                    >
                      <Edit3 size={17} />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(alert)}
                      disabled={actionId === alert.id}
                      className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                      aria-label={`Delete ${alert.title}`}
                    >
                      {actionId === alert.id
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


function AlertFormModal({
  editingAlert,
  onClose,
  onSaved,
}: {
  editingAlert: AlertRecord | null
  onClose: () => void
  onSaved: (message: string) => Promise<void>
}) {
  const [form, setForm] = useState<AlertFormState>(() => (
    editingAlert
      ? {
          alert_type: editingAlert.alert_type,
          severity: editingAlert.severity,
          status: editingAlert.status,
          title: editingAlert.title,
          message: editingAlert.message,
          source_value: '',
          target_roles: editingAlert.target_roles,
          expires_at: editingAlert.expires_at
            ? editingAlert.expires_at.slice(0, 16)
            : '',
        }
      : initialForm
  ))
  const [sources, setSources] = useState<SourceOption[]>([])
  const [isLoadingSources, setIsLoadingSources] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (editingAlert
      || !['case', 'route', 'hotspot'].includes(form.alert_type)) {
      setSources([])
      return
    }

    const loadSources = async () => {
      setIsLoadingSources(true)
      try {
        if (form.alert_type === 'case') {
          const response = await apiClient.get<
            Array<{ id: number; reference_code: string; title: string }>
            | { results: Array<{ id: number; reference_code: string; title: string }> }
          >('/cases/')
          setSources(normalizeList(response.data).map((item) => ({
            id: item.id,
            value: item.reference_code,
            label: `${item.reference_code} — ${item.title}`,
          })))
        } else {
          const endpoint = form.alert_type === 'route'
            ? '/locations/routes/'
            : '/locations/hotspots/'
          const response = await apiClient.get<
            Array<{ id: number; name: string }>
            | { results: Array<{ id: number; name: string }> }
          >(endpoint)
          setSources(normalizeList(response.data).map((item) => ({
            id: item.id,
            value: String(item.id),
            label: item.name,
          })))
        }
      } catch (requestError) {
        setFormError(getApiErrorMessage(
          requestError,
          'Unable to load alert sources.',
        ))
      } finally {
        setIsLoadingSources(false)
      }
    }

    void loadSources()
  }, [editingAlert, form.alert_type])

  const update = <Key extends keyof AlertFormState>(
    key: Key,
    value: AlertFormState[Key],
  ) => setForm((current) => ({ ...current, [key]: value }))

  const toggleRole = (role: TargetRole) => {
    update(
      'target_roles',
      form.target_roles.includes(role)
        ? form.target_roles.filter((item) => item !== role)
        : [...form.target_roles, role],
    )
  }

  const validate = (): string | null => {
    if (form.title.trim().length < 5) {
      return 'Alert title must contain at least 5 characters.'
    }
    if (form.message.trim().length < 10) {
      return 'Alert message must contain at least 10 characters.'
    }
    if (!editingAlert
      && ['case', 'route', 'hotspot'].includes(form.alert_type)
      && !form.source_value) {
      return `Select a ${form.alert_type} source.`
    }
    if (!editingAlert && form.target_roles.length === 0) {
      return 'Select at least one target role.'
    }
    if (form.expires_at
      && new Date(form.expires_at).getTime() <= Date.now()) {
      return 'Expiry time must be in the future.'
    }
    return null
  }

  const save = async () => {
    const validationError = validate()
    if (validationError) {
      setFormError(validationError)
      return
    }

    setIsSaving(true)
    setFormError('')
    try {
      const expiresAt = form.expires_at
        ? new Date(form.expires_at).toISOString()
        : null

      if (editingAlert) {
        const payload: AlertUpdateData = {
          severity: form.severity,
          status: form.status,
          title: form.title.trim(),
          message: form.message.trim(),
          expires_at: expiresAt,
        }
        await alertsApi.updateAlert(editingAlert.id, payload)
        await onSaved('Alert updated successfully.')
      } else {
        const payload: AlertCreateData = {
          alert_type: form.alert_type,
          severity: form.severity,
          title: form.title.trim(),
          message: form.message.trim(),
          target_roles: form.target_roles,
          expires_at: expiresAt,
        }
        if (form.alert_type === 'case') {
          payload.case_reference = form.source_value
        } else if (form.alert_type === 'route') {
          payload.route_id = Number(form.source_value)
        } else if (form.alert_type === 'hotspot') {
          payload.hotspot_id = Number(form.source_value)
        }
        await alertsApi.createAlert(payload)
        await onSaved('New alert created successfully.')
      }
    } catch (requestError) {
      setFormError(getApiErrorMessage(
        requestError,
        'Unable to save this alert.',
      ))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/60 px-4 py-8 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
              Secure alert coordination
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              {editingAlert ? 'Manage alert' : 'Create role-based alert'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <X size={20} />
          </button>
        </header>

        <div className="space-y-5 px-6 py-6">
          <StatusMessage type="error" message={formError} />
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Alert type">
              <select
                value={form.alert_type}
                disabled={Boolean(editingAlert)}
                onChange={(event) => {
                  update('alert_type', event.target.value as AlertType)
                  update('source_value', '')
                }}
                className="form-control disabled:bg-slate-100"
              >
                <option value="case">Case alert</option>
                <option value="hotspot">Hotspot alert</option>
                <option value="route">Route alert</option>
                <option value="emergency_access">Emergency access alert</option>
                <option value="system">System alert</option>
                <option value="manual">Manual alert</option>
              </select>
            </FormField>
            <FormField label="Severity">
              <select
                value={form.severity}
                onChange={(event) => update(
                  'severity',
                  event.target.value as AlertSeverity,
                )}
                className="form-control"
              >
                <option value="info">Information</option>
                <option value="warning">Warning</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </FormField>
          </div>

          {editingAlert && (
            <FormField label="Status">
              <select
                value={form.status}
                onChange={(event) => update(
                  'status',
                  event.target.value as AlertStatus,
                )}
                className="form-control"
              >
                <option value="active">Active</option>
                <option value="resolved">Resolved</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </FormField>
          )}

          {!editingAlert
            && ['case', 'route', 'hotspot'].includes(form.alert_type) && (
              <FormField label="Primary source">
                <select
                  value={form.source_value}
                  onChange={(event) => update('source_value', event.target.value)}
                  disabled={isLoadingSources}
                  className="form-control"
                >
                  <option value="">
                    {isLoadingSources ? 'Loading sources...' : `Select ${form.alert_type}`}
                  </option>
                  {sources.map((source) => (
                    <option key={source.id} value={source.value}>
                      {source.label}
                    </option>
                  ))}
                </select>
              </FormField>
            )}

          <FormField label="Title">
            <input
              value={form.title}
              maxLength={180}
              onChange={(event) => update('title', event.target.value)}
              placeholder="Concise operational alert title"
              className="form-control"
            />
          </FormField>
          <FormField label="Message">
            <textarea
              value={form.message}
              rows={5}
              onChange={(event) => update('message', event.target.value)}
              placeholder="Provide actionable, privacy-conscious information..."
              className="form-control resize-y"
            />
          </FormField>

          {!editingAlert && (
            <fieldset>
              <legend className="text-sm font-semibold text-slate-800">
                Target roles
              </legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {roleOptions.map(([role, label]) => (
                  <label
                    key={role}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-800"
                  >
                    <input
                      type="checkbox"
                      checked={form.target_roles.includes(role)}
                      onChange={() => toggleRole(role)}
                      className="h-4 w-4 accent-teal-600"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <FormField label="Expiry time (optional)">
            <input
              type="datetime-local"
              value={form.expires_at}
              onChange={(event) => update('expires_at', event.target.value)}
              className="form-control"
            />
          </FormField>
        </div>

        <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-200 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0f5273] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0a405b] disabled:opacity-60"
          >
            {isSaving && <LoaderCircle size={18} className="animate-spin" />}
            {editingAlert ? 'Save changes' : 'Send alert'}
          </button>
        </footer>
      </div>
    </div>
  )
}


function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const label = severity === 'info'
    ? 'Information'
    : severity.charAt(0).toUpperCase() + severity.slice(1)
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${
      severityStyles[severity].badge
    }`}>
      {label}
    </span>
  )
}


function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 pb-4 text-sm font-bold ${
        active
          ? 'border-teal-600 text-teal-700'
          : 'border-transparent text-slate-500 hover:text-slate-800'
      }`}
    >
      {label}
      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
        {count}
      </span>
    </button>
  )
}


function MetricCard({
  label,
  value,
  icon,
  iconClassName,
}: {
  label: string
  value: number
  icon: React.ReactNode
  iconClassName: string
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
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
      className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
    >
      {options.map(([value, label]) => (
        <option key={value} value={value}>{label}</option>
      ))}
    </select>
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


function EmptyState({ loading = false }: { loading?: boolean }) {
  return (
    <div className="grid min-h-72 place-items-center p-6 text-center">
      {loading ? (
        <LoaderCircle className="h-8 w-8 animate-spin text-teal-700" />
      ) : (
        <div>
          <Bell className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-4 font-bold text-slate-950">No matching alerts</h3>
          <p className="mt-2 text-sm text-slate-500">
            Change or clear the current filters.
          </p>
        </div>
      )}
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
