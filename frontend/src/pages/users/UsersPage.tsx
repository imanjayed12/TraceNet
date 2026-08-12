import {
  Activity,
  BadgeCheck,
  CheckCircle2,
  CircleAlert,
  Eye,
  Filter,
  LoaderCircle,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserCog,
  UserRound,
  Users,
  UserX,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type {
  FormEvent,
  ReactNode,
} from 'react'

import { usersApi } from '../../api/users'
import { AppShell } from '../../components/layout/AppShell'
import { useAuth } from '../../hooks/useAuth'
import type {
  ManagedUser,
  UpdateManagedUserPayload,
  UserAccessStatus,
  UserManagementFilters,
  UserManagementMetrics,
  UserRole,
} from '../../types/users'
import { getApiErrorMessage } from '../../utils/apiError'


const initialFilters: UserManagementFilters = {
  search: '',
  role: 'all',
  accessStatus: 'all',
  activity: 'all',
}


const roleOptions: Array<{
  value: UserRole
  label: string
}> = [
  {
    value: 'police',
    label: 'Police',
  },
  {
    value: 'ngo',
    label: 'NGO worker',
  },
  {
    value: 'analyst',
    label: 'Analyst',
  },
  {
    value: 'government',
    label: 'Government authority',
  },
  {
    value: 'admin',
    label: 'Administrator',
  },
]


const accessStatusOptions: Array<{
  value: UserAccessStatus
  label: string
}> = [
  {
    value: 'pending',
    label: 'Pending approval',
  },
  {
    value: 'approved',
    label: 'Approved',
  },
  {
    value: 'emergency',
    label: 'Emergency access',
  },
  {
    value: 'rejected',
    label: 'Rejected',
  },
]


type AccountAction =
  | 'approve'
  | 'reject'
  | 'activate'
  | 'deactivate'


interface ConfirmationState {
  action: AccountAction
  user: ManagedUser
}


function formatDate(
  value: string | null,
): string {
  if (!value) {
    return 'Not recorded'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Not recorded'
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


function getRoleLabel(
  role: UserRole,
): string {
  return (
    roleOptions.find(
      (option) => option.value === role,
    )?.label ?? role
  )
}


function getAccessLabel(
  accessStatus: UserAccessStatus,
): string {
  return (
    accessStatusOptions.find(
      (option) => (
        option.value === accessStatus
      ),
    )?.label ?? accessStatus
  )
}


function calculateMetrics(
  users: ManagedUser[],
): UserManagementMetrics {
  return {
    total: users.length,
    pending: users.filter(
      (user) => (
        user.access_status === 'pending'
      ),
    ).length,
    approved: users.filter(
      (user) => (
        user.access_status === 'approved'
      ),
    ).length,
    active: users.filter(
      (user) => user.is_active,
    ).length,
    inactive: users.filter(
      (user) => !user.is_active,
    ).length,
    administrators: users.filter(
      (user) => user.role === 'admin',
    ).length,
  }
}


export function UsersPage() {
  const {
    user: currentUser,
  } = useAuth()

  const [users, setUsers] = useState<
    ManagedUser[]
  >([])
  const [filters, setFilters] =
    useState<UserManagementFilters>(
      initialFilters,
    )

  const [isLoading, setIsLoading] =
    useState(true)
  const [processingUserId, setProcessingUserId] =
    useState<number | null>(null)

  const [errorMessage, setErrorMessage] =
    useState('')
  const [successMessage, setSuccessMessage] =
    useState('')

  const [selectedUser, setSelectedUser] =
    useState<ManagedUser | null>(null)
  const [editingUser, setEditingUser] =
    useState<ManagedUser | null>(null)
  const [confirmation, setConfirmation] =
    useState<ConfirmationState | null>(null)

  const isAdministrator = (
    currentUser?.role === 'admin'
  )

  const loadUsers = useCallback(
    async () => {
      if (!isAdministrator) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setErrorMessage('')

      try {
        const response =
          await usersApi.getUsers()

        setUsers(response)
      } catch (error) {
        setErrorMessage(
          getApiErrorMessage(
            error,
            'Unable to load user accounts.',
          ),
        )
      } finally {
        setIsLoading(false)
      }
    },
    [isAdministrator],
  )

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const metrics = useMemo(
    () => calculateMetrics(users),
    [users],
  )

  const filteredUsers = useMemo(
    () => {
      const search = filters.search
        .trim()
        .toLowerCase()

      return users.filter((user) => {
        const matchesSearch = (
          !search
          || user.full_name
            .toLowerCase()
            .includes(search)
          || user.email
            .toLowerCase()
            .includes(search)
          || user.organization
            .toLowerCase()
            .includes(search)
          || user.phone
            .toLowerCase()
            .includes(search)
        )

        const matchesRole = (
          filters.role === 'all'
          || user.role === filters.role
        )

        const matchesAccessStatus = (
          filters.accessStatus === 'all'
          || user.access_status
            === filters.accessStatus
        )

        const matchesActivity = (
          filters.activity === 'all'
          || (
            filters.activity === 'active'
            && user.is_active
          )
          || (
            filters.activity === 'inactive'
            && !user.is_active
          )
        )

        return (
          matchesSearch
          && matchesRole
          && matchesAccessStatus
          && matchesActivity
        )
      })
    },
    [
      filters,
      users,
    ],
  )

  const hasActiveFilters = (
    filters.search.trim() !== ''
    || filters.role !== 'all'
    || filters.accessStatus !== 'all'
    || filters.activity !== 'all'
  )

  const replaceUser = (
    updatedUser: ManagedUser,
  ) => {
    setUsers((currentUsers) => (
      currentUsers.map((user) => (
        user.id === updatedUser.id
          ? updatedUser
          : user
      ))
    ))

    setSelectedUser((current) => (
      current?.id === updatedUser.id
        ? updatedUser
        : current
    ))
  }

  const executeAccountAction = async (
    state: ConfirmationState,
  ) => {
    setProcessingUserId(state.user.id)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      let response

      if (state.action === 'approve') {
        response = await usersApi.approveUser(
          state.user.id,
        )
      } else if (state.action === 'reject') {
        response = await usersApi.rejectUser(
          state.user.id,
        )
      } else if (
        state.action === 'activate'
      ) {
        response = await usersApi.activateUser(
          state.user.id,
        )
      } else {
        response = (
          await usersApi.deactivateUser(
            state.user.id,
          )
        )
      }

      replaceUser(response.user)

      if (
        state.action === 'approve'
        || state.action === 'reject'
      ) {
        window.dispatchEvent(
          new Event('tracenet:pending-users-changed'),
        )
      }

      setSuccessMessage(response.detail)
      setConfirmation(null)
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(
          error,
          'Unable to update this user account.',
        ),
      )
      setConfirmation(null)
    } finally {
      setProcessingUserId(null)
    }
  }

  const saveUserChanges = async (
    id: number,
    payload: UpdateManagedUserPayload,
  ) => {
    setProcessingUserId(id)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const updatedUser =
        await usersApi.updateUser(
          id,
          payload,
        )

      replaceUser(updatedUser)
      setEditingUser(null)
      setSuccessMessage(
        'User role and access settings updated successfully.',
      )
    } catch (error) {
      throw error
    } finally {
      setProcessingUserId(null)
    }
  }

  if (!isAdministrator) {
    return (
      <AppShell activeNavigation="users">
        <main className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <ShieldCheck size={28} />
            </div>

            <h1 className="mt-5 text-2xl font-bold text-slate-950">
              Administrator access required
            </h1>

            <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-600">
              User management contains sensitive account
              approval and authorization controls. Only an
              approved TraceNet administrator can access
              this workspace.
            </p>
          </div>
        </main>
      </AppShell>
    )
  }

  return (
    <AppShell activeNavigation="users">
      <main className="px-4 py-7 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px]">
          <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-teal-700">
                <UserCog size={18} />
                Identity and access administration
              </div>

              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                User management
              </h1>

              <p className="mt-2 max-w-3xl leading-7 text-slate-600">
                Review registration requests, manage
                professional roles and control access to
                TraceNet&apos;s security-sensitive
                operational workspace.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                void loadUsers()
              }}
              disabled={isLoading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={19}
                className={
                  isLoading
                    ? 'animate-spin'
                    : ''
                }
              />
              Refresh users
            </button>
          </header>

          {successMessage && (
            <FeedbackBanner
              type="success"
              message={successMessage}
              onClose={() => {
                setSuccessMessage('')
              }}
            />
          )}

          {errorMessage && (
            <FeedbackBanner
              type="error"
              message={errorMessage}
              onClose={() => {
                setErrorMessage('')
              }}
            />
          )}

          <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              label="Total accounts"
              value={metrics.total}
              detail={`${metrics.administrators} administrators`}
              icon={<Users size={25} />}
              iconClassName="bg-[#0d4b6e] text-white"
            />

            <MetricCard
              label="Pending review"
              value={metrics.pending}
              detail="Awaiting administrator decision"
              icon={<CircleAlert size={25} />}
              iconClassName="bg-amber-50 text-amber-600"
            />

            <MetricCard
              label="Approved users"
              value={metrics.approved}
              detail="Administratively approved"
              icon={<BadgeCheck size={25} />}
              iconClassName="bg-emerald-50 text-emerald-600"
            />

            <MetricCard
              label="Active accounts"
              value={metrics.active}
              detail="Login access enabled"
              icon={<Activity size={25} />}
              iconClassName="bg-teal-50 text-teal-600"
            />

            <MetricCard
              label="Inactive accounts"
              value={metrics.inactive}
              detail="Login access unavailable"
              icon={<UserX size={25} />}
              iconClassName="bg-red-50 text-red-600"
            />
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Filter
                size={21}
                className="text-teal-700"
              />
              <h2 className="font-bold text-slate-950">
                Search and filters
              </h2>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
              <label className="relative">
                <span className="sr-only">
                  Search users
                </span>

                <Search
                  size={19}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="search"
                  value={filters.search}
                  onChange={(event) => {
                    setFilters((current) => ({
                      ...current,
                      search: event.target.value,
                    }))
                  }}
                  placeholder="Search name, email, organization or phone..."
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                />
              </label>

              <select
                value={filters.role}
                onChange={(event) => {
                  setFilters((current) => ({
                    ...current,
                    role: event.currentTarget.value as UserManagementFilters['role'],
                  }))
                }}
                className="h-12 rounded-xl border border-slate-300 bg-white px-4 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              >
                <option value="all">
                  All roles
                </option>

                {roleOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={filters.accessStatus}
                onChange={(event) => {
                  setFilters((current) => ({
                    ...current,
                    accessStatus: event.currentTarget.value as UserManagementFilters['accessStatus'],
                  }))
                }}
                className="h-12 rounded-xl border border-slate-300 bg-white px-4 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              >
                <option value="all">
                  All access statuses
                </option>

                {accessStatusOptions.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ),
                )}
              </select>

              <select
                value={filters.activity}
                onChange={(event) => {
                  setFilters((current) => ({
                    ...current,
                    activity: event.currentTarget.value as UserManagementFilters['activity'],
                  }))
                }}
                className="h-12 rounded-xl border border-slate-300 bg-white px-4 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              >
                <option value="all">
                  All activity
                </option>
                <option value="active">
                  Active
                </option>
                <option value="inactive">
                  Inactive
                </option>
              </select>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-500">
                Showing {filteredUsers.length} of{' '}
                {users.length} authorized accounts
              </p>

              <button
                type="button"
                disabled={!hasActiveFilters}
                onClick={() => {
                  setFilters(initialFilters)
                }}
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <X size={16} />
                Clear all filters
              </button>
            </div>
          </section>

          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-5">
              <div>
                <h2 className="font-bold text-slate-950">
                  Account registry
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Role-based administrative visibility
                </p>
              </div>

              <span className="rounded-full bg-teal-50 px-4 py-2 text-xs font-bold text-teal-700">
                Admin-only controls
              </span>
            </div>

            {isLoading ? (
              <LoadingState />
            ) : filteredUsers.length === 0 ? (
              <EmptyState
                hasFilters={hasActiveFilters}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px] border-collapse text-left">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-4">
                        User
                      </th>
                      <th className="px-5 py-4">
                        Role
                      </th>
                      <th className="px-5 py-4">
                        Access
                      </th>
                      <th className="px-5 py-4">
                        Activity
                      </th>
                      <th className="px-5 py-4">
                        Joined
                      </th>
                      <th className="px-5 py-4 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {filteredUsers.map((user) => (
                      <UserRow
                        key={user.id}
                        user={user}
                        currentUserId={
                          currentUser?.id
                        }
                        isProcessing={
                          processingUserId
                          === user.id
                        }
                        onView={() => {
                          setSelectedUser(user)
                        }}
                        onEdit={() => {
                          setEditingUser(user)
                        }}
                        onAction={(action) => {
                          setConfirmation({
                            action,
                            user,
                          })
                        }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => {
            setSelectedUser(null)
          }}
          onEdit={() => {
            setEditingUser(selectedUser)
            setSelectedUser(null)
          }}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          isSaving={
            processingUserId === editingUser.id
          }
          onClose={() => {
            setEditingUser(null)
          }}
          onSave={saveUserChanges}
        />
      )}

      {confirmation && (
        <ConfirmationModal
          state={confirmation}
          isProcessing={
            processingUserId
            === confirmation.user.id
          }
          onClose={() => {
            if (processingUserId === null) {
              setConfirmation(null)
            }
          }}
          onConfirm={() => {
            void executeAccountAction(
              confirmation,
            )
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
  detail: string
  icon: ReactNode
  iconClassName: string
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-600">
            {label}
          </p>

          <p className="mt-3 text-3xl font-bold text-slate-950">
            {value}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconClassName}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-5 text-sm text-slate-500">
        {detail}
      </p>
    </article>
  )
}


function FeedbackBanner({
  type,
  message,
  onClose,
}: {
  type: 'success' | 'error'
  message: string
  onClose: () => void
}) {
  const isSuccess = type === 'success'

  return (
    <div
      className={`mt-6 flex items-start justify-between gap-4 rounded-xl border px-4 py-3 ${
        isSuccess
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-red-200 bg-red-50 text-red-700'
      }`}
    >
      <div className="flex items-start gap-3">
        {isSuccess ? (
          <CheckCircle2
            size={20}
            className="mt-0.5 shrink-0"
          />
        ) : (
          <CircleAlert
            size={20}
            className="mt-0.5 shrink-0"
          />
        )}

        <p className="text-sm font-medium">
          {message}
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss message"
        className="rounded-lg p-1 transition hover:bg-black/5"
      >
        <X size={17} />
      </button>
    </div>
  )
}


function UserRow({
  user,
  currentUserId,
  isProcessing,
  onView,
  onEdit,
  onAction,
}: {
  user: ManagedUser
  currentUserId: number | undefined
  isProcessing: boolean
  onView: () => void
  onEdit: () => void
  onAction: (action: AccountAction) => void
}) {
  const isCurrentUser = (
    user.id === currentUserId
  )

  return (
    <tr className="transition hover:bg-slate-50/70">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 font-bold text-teal-700">
            {user.full_name
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="max-w-64 truncate font-semibold text-slate-950">
                {user.full_name}
              </p>

              {isCurrentUser && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">
                  You
                </span>
              )}

              {user.is_superuser && (
                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-700">
                  Superuser
                </span>
              )}
            </div>

            <p className="mt-1 max-w-72 truncate text-sm text-slate-500">
              {user.email}
            </p>

            {user.organization && (
              <p className="mt-1 max-w-72 truncate text-xs text-slate-400">
                {user.organization}
              </p>
            )}
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <RoleBadge role={user.role} />
      </td>

      <td className="px-5 py-4">
        <AccessBadge
          accessStatus={user.access_status}
        />
      </td>

      <td className="px-5 py-4">
        <span
          className={`inline-flex items-center gap-2 text-sm font-semibold ${
            user.is_active
              ? 'text-emerald-700'
              : 'text-slate-500'
          }`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              user.is_active
                ? 'bg-emerald-500'
                : 'bg-slate-300'
            }`}
          />
          {user.is_active
            ? 'Active'
            : 'Inactive'}
        </span>
      </td>

      <td className="px-5 py-4">
        <p className="text-sm text-slate-700">
          {formatDate(user.date_joined)}
        </p>

        <p className="mt-1 text-xs text-slate-400">
          Last login:{' '}
          {formatDate(user.last_login)}
        </p>
      </td>

      <td className="px-5 py-4">
        <div className="flex justify-end gap-2">
          <ActionButton
            label="View user"
            onClick={onView}
            disabled={isProcessing}
          >
            <Eye size={17} />
          </ActionButton>

          <ActionButton
            label="Edit user"
            onClick={onEdit}
            disabled={isProcessing}
          >
            <Pencil size={17} />
          </ActionButton>

          {user.access_status === 'pending' && (
            <>
              <ActionButton
                label="Approve user"
                onClick={() => {
                  onAction('approve')
                }}
                disabled={isProcessing}
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                <UserCheck size={17} />
              </ActionButton>

              <ActionButton
                label="Reject user"
                onClick={() => {
                  onAction('reject')
                }}
                disabled={isProcessing}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <UserX size={17} />
              </ActionButton>
            </>
          )}

          {(
            user.access_status === 'approved'
            && !isCurrentUser
          ) && (
            <ActionButton
              label={
                user.is_active
                  ? 'Deactivate user'
                  : 'Activate user'
              }
              onClick={() => {
                onAction(
                  user.is_active
                    ? 'deactivate'
                    : 'activate',
                )
              }}
              disabled={isProcessing}
              className={
                user.is_active
                  ? 'border-red-200 text-red-600 hover:bg-red-50'
                  : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
              }
            >
              {user.is_active ? (
                <UserX size={17} />
              ) : (
                <UserCheck size={17} />
              )}
            </ActionButton>
          )}

          {isProcessing && (
            <LoaderCircle
              size={18}
              className="self-center animate-spin text-teal-700"
            />
          )}
        </div>
      </td>
    </tr>
  )
}


function ActionButton({
  label,
  onClick,
  disabled,
  className = '',
  children,
}: {
  label: string
  onClick: () => void
  disabled: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  )
}


function RoleBadge({
  role,
}: {
  role: UserRole
}) {
  const classes: Record<UserRole, string> = {
    admin: 'bg-violet-50 text-violet-700',
    police: 'bg-blue-50 text-blue-700',
    government: 'bg-cyan-50 text-cyan-700',
    analyst: 'bg-teal-50 text-teal-700',
    ngo: 'bg-amber-50 text-amber-700',
  }

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${classes[role]}`}
    >
      {getRoleLabel(role)}
    </span>
  )
}


function AccessBadge({
  accessStatus,
}: {
  accessStatus: UserAccessStatus
}) {
  const classes: Record<
    UserAccessStatus,
    string
  > = {
    approved: (
      'bg-emerald-50 text-emerald-700'
    ),
    pending: 'bg-amber-50 text-amber-700',
    emergency: 'bg-blue-50 text-blue-700',
    rejected: 'bg-red-50 text-red-700',
  }

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${classes[accessStatus]}`}
    >
      {getAccessLabel(accessStatus)}
    </span>
  )
}


function LoadingState() {
  return (
    <div className="grid min-h-80 place-items-center p-8">
      <div className="text-center">
        <LoaderCircle className="mx-auto h-9 w-9 animate-spin text-teal-700" />

        <p className="mt-4 font-semibold text-slate-700">
          Loading authorized accounts...
        </p>
      </div>
    </div>
  )
}


function EmptyState({
  hasFilters,
}: {
  hasFilters: boolean
}) {
  return (
    <div className="grid min-h-80 place-items-center p-8 text-center">
      <div>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <UserRound size={27} />
        </div>

        <h3 className="mt-4 text-lg font-bold text-slate-950">
          {hasFilters
            ? 'No matching users'
            : 'No user accounts found'}
        </h3>

        <p className="mt-2 text-slate-500">
          {hasFilters
            ? 'Change or clear the current filters.'
            : 'New registration requests will appear here.'}
        </p>
      </div>
    </div>
  )
}


function ModalFrame({
  title,
  eyebrow,
  onClose,
  children,
  footer,
  maxWidth = 'max-w-3xl',
}: {
  title: string
  eyebrow: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  maxWidth?: string
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${maxWidth}`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
              {eyebrow}
            </p>

            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              {title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
          >
            <X size={20} />
          </button>
        </header>

        <div className="overflow-y-auto p-6">
          {children}
        </div>

        {footer && (
          <footer className="border-t border-slate-200 bg-white px-6 py-4">
            {footer}
          </footer>
        )}
      </section>
    </div>
  )
}


function UserDetailsModal({
  user,
  onClose,
  onEdit,
}: {
  user: ManagedUser
  onClose: () => void
  onEdit: () => void
}) {
  return (
    <ModalFrame
      title={user.full_name}
      eyebrow="Secure identity record"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0d5678] px-5 py-2.5 font-semibold text-white hover:bg-[#0a4865]"
          >
            <Pencil size={17} />
            Manage access
          </button>
        </div>
      }
    >
      <div className="rounded-2xl bg-[#0a405f] p-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-400/20 text-xl font-bold">
              {user.full_name
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <p className="font-bold">
                {user.email}
              </p>
              <p className="mt-1 text-sm text-cyan-100">
                Account ID #{user.id}
              </p>
            </div>
          </div>

          <AccessBadge
            accessStatus={user.access_status}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <DetailItem
          label="Professional role"
          value={getRoleLabel(user.role)}
        />
        <DetailItem
          label="Account activity"
          value={
            user.is_active
              ? 'Active'
              : 'Inactive'
          }
        />
        <DetailItem
          label="Organization"
          value={
            user.organization
            || 'Not provided'
          }
        />
        <DetailItem
          label="Phone number"
          value={
            user.phone
            || 'Not provided'
          }
        />
        <DetailItem
          label="Joined"
          value={formatDate(user.date_joined)}
        />
        <DetailItem
          label="Last login"
          value={formatDate(user.last_login)}
        />
        <DetailItem
          label="Staff account"
          value={user.is_staff ? 'Yes' : 'No'}
        />
        <DetailItem
          label="Superuser"
          value={
            user.is_superuser
              ? 'Yes'
              : 'No'
          }
        />
      </div>

      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
        Account approval, role changes and activation
        controls are security-sensitive and recorded in
        TraceNet&apos;s immutable audit trail.
      </div>
    </ModalFrame>
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
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 font-semibold text-slate-900">
        {value}
      </p>
    </div>
  )
}


function EditUserModal({
  user,
  isSaving,
  onClose,
  onSave,
}: {
  user: ManagedUser
  isSaving: boolean
  onClose: () => void
  onSave: (
    id: number,
    payload: UpdateManagedUserPayload,
  ) => Promise<void>
}) {
  const [role, setRole] =
    useState<UserRole>(user.role)
  const [
    accessStatus,
    setAccessStatus,
  ] = useState<UserAccessStatus>(
    user.access_status,
  )
  const [isActive, setIsActive] =
    useState(user.is_active)
  const [formError, setFormError] =
    useState('')

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()
    setFormError('')

    try {
      await onSave(
        user.id,
        {
          role,
          access_status: accessStatus,
          is_active: isActive,
        },
      )
    } catch (error) {
      setFormError(
        getApiErrorMessage(
          error,
          'Unable to save user access settings.',
        ),
      )
    }
  }

  return (
    <ModalFrame
      title={`Manage ${user.full_name}`}
      eyebrow="Role and access control"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            form="user-access-form"
            disabled={isSaving}
            className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-[#0d5678] px-5 py-2.5 font-semibold text-white hover:bg-[#0a4865] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving && (
              <LoaderCircle
                size={17}
                className="animate-spin"
              />
            )}
            Save changes
          </button>
        </div>
      }
    >
      <form
        id="user-access-form"
        onSubmit={(event) => {
          void handleSubmit(event)
        }}
      >
        {formError && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <CircleAlert
              size={19}
              className="mt-0.5 shrink-0"
            />
            {formError}
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="font-semibold text-slate-950">
            {user.email}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {user.organization
              || 'No organization provided'}
          </p>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label>
            <span className="text-sm font-semibold text-slate-700">
              Professional role
            </span>

            <select
              value={role}
              onChange={(event) => {
                setRole(
                  event.target.value as UserRole,
                )
              }}
              className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
            >
              {roleOptions.map((option) => (
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
              Access status
            </span>

            <select
              value={accessStatus}
              onChange={(event) => {
                setAccessStatus(event.currentTarget.value as UserAccessStatus)
              }}
              className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
            >
              {accessStatusOptions.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => {
              setIsActive(event.target.checked)
            }}
            className="mt-1 h-4 w-4 accent-teal-600"
          />

          <span>
            <span className="block font-semibold text-slate-900">
              Active account
            </span>
            <span className="mt-1 block text-sm leading-6 text-slate-500">
              Active approved accounts can authenticate
              according to their professional role.
            </span>
          </span>
        </label>

        <div className="mt-5 flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
          <ShieldCheck
            size={20}
            className="mt-0.5 shrink-0"
          />
          TraceNet protects your own administrator access,
          superuser accounts and the final active approved
          administrator.
        </div>
      </form>
    </ModalFrame>
  )
}


function ConfirmationModal({
  state,
  isProcessing,
  onClose,
  onConfirm,
}: {
  state: ConfirmationState
  isProcessing: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const content: Record<
    AccountAction,
    {
      title: string
      description: string
      buttonLabel: string
      dangerous: boolean
      icon: ReactNode
    }
  > = {
    approve: {
      title: 'Approve account request?',
      description: (
        'This user will become active and can sign in using the assigned professional role.'
      ),
      buttonLabel: 'Approve account',
      dangerous: false,
      icon: <UserCheck size={28} />,
    },
    reject: {
      title: 'Reject account request?',
      description: (
        'The registration will be rejected and the account will remain unable to sign in.'
      ),
      buttonLabel: 'Reject account',
      dangerous: true,
      icon: <UserX size={28} />,
    },
    activate: {
      title: 'Activate this account?',
      description: (
        'The approved user will regain login access according to the assigned role.'
      ),
      buttonLabel: 'Activate account',
      dangerous: false,
      icon: <Activity size={28} />,
    },
    deactivate: {
      title: 'Deactivate this account?',
      description: (
        'The user will lose login access until an administrator activates the account again.'
      ),
      buttonLabel: 'Deactivate account',
      dangerous: true,
      icon: <UserX size={28} />,
    },
  }

  const selected = content[state.action]

  return (
    <ModalFrame
      title={selected.title}
      eyebrow="Confirm security-sensitive operation"
      onClose={onClose}
      maxWidth="max-w-lg"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className={`inline-flex min-w-40 items-center justify-center gap-2 rounded-xl px-5 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
              selected.dangerous
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isProcessing && (
              <LoaderCircle
                size={17}
                className="animate-spin"
              />
            )}
            {selected.buttonLabel}
          </button>
        </div>
      }
    >
      <div
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${
          selected.dangerous
            ? 'bg-red-50 text-red-600'
            : 'bg-emerald-50 text-emerald-600'
        }`}
      >
        {selected.icon}
      </div>

      <div className="mt-5 text-center">
        <p className="font-bold text-slate-950">
          {state.user.full_name}
        </p>

        <p className="mt-1 text-sm text-slate-500">
          {state.user.email}
        </p>

        <p className="mt-5 leading-7 text-slate-600">
          {selected.description}
        </p>
      </div>

      <div className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
        <ShieldCheck
          size={19}
          className="mt-0.5 shrink-0"
        />
        This decision will be recorded in the immutable
        Audit & Compliance log.
      </div>
    </ModalFrame>
  )
}
