import {
  Bell,
  Check,
  ChevronRight,
  CircleAlert,
  FileBarChart,
  FileText,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Map as MapIcon,
  MapPinned,
  Menu,
  RefreshCw,
  Route as RouteIcon,
  ScrollText,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type {
  ReactNode,
} from 'react'
import {
  Link,
  useLocation,
} from 'wouter'

import { alertsApi } from '../../api/alerts'
import { usersApi } from '../../api/users'
import { useAuth } from '../../hooks/useAuth'
import type {
  AlertInboxItem,
  AlertSeverity,
} from '../../types/alerts'


export type NavigationKey =
  | 'dashboard'
  | 'cases'
  | 'map'
  | 'routes'
  | 'hotspots'
  | 'alerts'
  | 'reports'
  | 'audit'
  | 'users'
  | 'profile'


interface NavigationItem {
  key: NavigationKey
  label: string
  path: string
  icon: typeof LayoutDashboard
  available: boolean
}


const navigationItems: NavigationItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    available: true,
  },
  {
    key: 'cases',
    label: 'Cases',
    path: '/cases',
    icon: FileText,
    available: true,
  },
  {
    key: 'map',
    label: 'Intelligence map',
    path: '/map',
    icon: MapIcon,
    available: true,
  },
  {
    key: 'routes',
    label: 'Routes',
    path: '/routes',
    icon: RouteIcon,
    available: true,
  },
  {
    key: 'hotspots',
    label: 'Hotspots',
    path: '/hotspots',
    icon: MapPinned,
    available: true,
  },
  {
    key: 'alerts',
    label: 'Alerts',
    path: '/alerts',
    icon: Bell,
    available: true,
  },
  {
    key: 'reports',
    label: 'Reports',
    path: '/reports',
    icon: FileBarChart,
    available: true,
  },
  {
    key: 'users',
    label: 'User management',
    path: '/users',
    icon: Users,
    available: true,
  },
  {
    key: 'audit',
    label: 'Audit & compliance',
    path: '/audit',
    icon: ScrollText,
    available: true,
  },
]


const severityStyles: Record<
  AlertSeverity,
  {
    dot: string
    badge: string
    label: string
  }
> = {
  info: {
    dot: 'bg-blue-500',
    badge: 'bg-blue-50 text-blue-700',
    label: 'Info',
  },
  warning: {
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700',
    label: 'Warning',
  },
  high: {
    dot: 'bg-orange-500',
    badge: 'bg-orange-50 text-orange-700',
    label: 'High',
  },
  critical: {
    dot: 'bg-red-600',
    badge: 'bg-red-50 text-red-700',
    label: 'Critical',
  },
}


function formatRole(role: string): string {
  return role
    .replaceAll('_', ' ')
    .replace(
      /\b\w/g,
      (character) => character.toUpperCase(),
    )
}


function formatAlertTime(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Time unavailable'
  }

  const elapsedSeconds = Math.max(
    0,
    Math.floor(
      (Date.now() - date.getTime()) / 1000,
    ),
  )

  if (elapsedSeconds < 60) {
    return 'Just now'
  }

  const elapsedMinutes = Math.floor(
    elapsedSeconds / 60,
  )

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m ago`
  }

  const elapsedHours = Math.floor(
    elapsedMinutes / 60,
  )

  if (elapsedHours < 24) {
    return `${elapsedHours}h ago`
  }

  const elapsedDays = Math.floor(
    elapsedHours / 24,
  )

  if (elapsedDays < 7) {
    return `${elapsedDays}d ago`
  }

  return new Intl.DateTimeFormat(
    'en-GB',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  ).format(date)
}


interface AppShellProps {
  activeNavigation: NavigationKey
  unreadAlertCount?: number
  children: ReactNode
}


export function AppShell({
  activeNavigation,
  unreadAlertCount = 0,
  children,
}: AppShellProps) {
  const [, navigate] = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false)

  const {
    user,
    logout,
  } = useAuth()
  const [pendingUserCount, setPendingUserCount] = (
    useState(0)
  )

  const loadPendingUserCount = useCallback(
    async () => {
      if (user?.role !== 'admin') {
        setPendingUserCount(0)
        return
      }

      try {
        const pendingUsers = await usersApi.getUsers({
          access_status: 'pending',
        })
        setPendingUserCount(pendingUsers.length)
      } catch {
        // Keep the most recently verified count.
      }
    },
    [user?.role],
  )

  useEffect(() => {
    if (user?.role !== 'admin') {
      setPendingUserCount(0)
      return undefined
    }

    void loadPendingUserCount()

    const refreshInterval = window.setInterval(
      () => {
        void loadPendingUserCount()
      },
      60_000,
    )
    const handlePendingUsersChanged = () => {
      void loadPendingUserCount()
    }

    window.addEventListener(
      'tracenet:pending-users-changed',
      handlePendingUsersChanged,
    )

    return () => {
      window.clearInterval(refreshInterval)
      window.removeEventListener(
        'tracenet:pending-users-changed',
        handlePendingUsersChanged,
      )
    }
  }, [loadPendingUserCount, user?.role])

  const handleLogout = () => {
    void logout().finally(() => {
      navigate('/login')
    })
  }

  return (
    <div className="min-h-screen bg-[#f3f6fa] text-slate-900">
      <Sidebar
        activeNavigation={activeNavigation}
        userName={user?.full_name ?? 'TraceNet user'}
        role={user?.role ?? ''}
        pendingUserCount={pendingUserCount}
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onLogout={handleLogout}
      />

      <div className="lg:pl-72">
        <TopBar
          userName={user?.full_name ?? 'User'}
          fallbackUnreadCount={unreadAlertCount}
          onOpenMenu={() => setMobileMenuOpen(true)}
          onOpenProfile={() => navigate('/profile')}
        />

        {children}
      </div>
    </div>
  )
}


function TopBar({
  userName,
  fallbackUnreadCount,
  onOpenMenu,
  onOpenProfile,
}: {
  userName: string
  fallbackUnreadCount: number
  onOpenMenu: () => void
  onOpenProfile: () => void
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-18 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenMenu}
          className="rounded-xl border border-slate-200 p-2 text-slate-600 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu size={21} />
        </button>

        <div className="hidden sm:block">
          <p className="text-sm text-slate-500">
            Bangladesh operational network
          </p>

          <p className="text-sm font-semibold text-slate-900">
            Secure intelligence workspace
          </p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <NotificationCenter
            fallbackUnreadCount={fallbackUnreadCount}
          />

          <button
            type="button"
            onClick={onOpenProfile}
            aria-label="Open profile and security settings"
            className="flex items-center gap-3 rounded-xl border-l border-slate-200 py-1 pl-3 pr-2 text-left transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 font-bold text-teal-800">
              {userName.charAt(0).toUpperCase()}
            </span>

            <span className="hidden max-w-44 sm:block">
              <span className="block truncate text-sm font-semibold text-slate-900">
                {userName}
              </span>

              <span className="block text-xs text-emerald-600">
                Profile & security
              </span>
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}


function NotificationCenter({
  fallbackUnreadCount,
}: {
  fallbackUnreadCount: number
}) {
  const [, navigate] = useLocation()
  const containerRef = useRef<HTMLDivElement>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isMarkingAllRead, setIsMarkingAllRead] =
    useState(false)
  const [loadError, setLoadError] = useState(false)
  const [inbox, setInbox] = useState<AlertInboxItem[]>([])

  const loadInbox = useCallback(async (
    showLoading = false,
  ) => {
    if (showLoading) {
      setIsLoading(true)
    }

    try {
      const items = await alertsApi.getInbox()
      const sortedItems = [...items].sort(
        (first, second) => (
          new Date(
            second.alert_created_at,
          ).getTime()
          - new Date(
            first.alert_created_at,
          ).getTime()
        ),
      )

      setInbox(sortedItems)
      setLoadError(false)
    } catch {
      setLoadError(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadInbox(true)

    const intervalId = window.setInterval(
      () => {
        if (document.visibilityState === 'visible') {
          void loadInbox()
        }
      },
      60_000,
    )

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadInbox()
      }
    }

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )
    }
  }, [loadInbox])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handlePointerDown = (
      event: PointerEvent,
    ) => {
      if (
        containerRef.current
        && !containerRef.current.contains(
          event.target as Node,
        )
      ) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener(
      'pointerdown',
      handlePointerDown,
    )
    document.addEventListener(
      'keydown',
      handleKeyDown,
    )

    return () => {
      document.removeEventListener(
        'pointerdown',
        handlePointerDown,
      )
      document.removeEventListener(
        'keydown',
        handleKeyDown,
      )
    }
  }, [isOpen])

  const unreadItems = useMemo(
    () => inbox.filter((item) => !item.is_read),
    [inbox],
  )

  const unreadCount = isLoading && inbox.length === 0
    ? fallbackUnreadCount
    : unreadItems.length

  const recentItems = useMemo(
    () => inbox.slice(0, 5),
    [inbox],
  )

  const handleOpenAlert = async (
    item: AlertInboxItem,
  ) => {
    if (!item.is_read) {
      try {
        const response = await alertsApi.markRead(
          item.id,
        )

        setInbox((current) => current.map(
          (currentItem) => (
            currentItem.id === item.id
              ? response.alert
              : currentItem
          ),
        ))
      } catch {
        // The Alerts page can retry the action.
      }
    }

    setIsOpen(false)
    const isRegistrationAlert = (
      item.alert_type === 'system'
      && item.title === (
        'New registration awaiting approval'
      )
    )

    navigate(
      isRegistrationAlert ? '/users' : '/alerts',
    )
  }

  const handleMarkAllRead = async () => {
    if (
      unreadItems.length === 0
      || isMarkingAllRead
    ) {
      return
    }

    setIsMarkingAllRead(true)

    try {
      const responses = await Promise.all(
        unreadItems.map((item) => (
          alertsApi.markRead(item.id)
        )),
      )
      const updatedItems = new Map<
        number,
        AlertInboxItem
      >(
        responses.map(
          (response): [number, AlertInboxItem] => [
            response.alert.id,
            response.alert,
          ],
        ),
      )

      setInbox((current) => current.map(
        (item) => updatedItems.get(item.id) ?? item,
      ))
      setLoadError(false)
    } catch {
      setLoadError(true)
      void loadInbox()
    } finally {
      setIsMarkingAllRead(false)
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      <button
        type="button"
        onClick={() => {
          const nextOpenState = !isOpen
          setIsOpen(nextOpenState)

          if (nextOpenState) {
            void loadInbox()
          }
        }}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl border bg-white transition ${
          isOpen
            ? 'border-teal-300 text-teal-700 ring-4 ring-teal-500/10'
            : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
        }`}
        aria-label={
          unreadCount > 0
            ? `Alert inbox, ${unreadCount} unread`
            : 'Alert inbox'
        }
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Bell size={19} />

        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 99
              ? '99+'
              : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Recent alert notifications"
          className="fixed left-3 right-3 top-16 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-[26rem]"
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-950">
                  Notifications
                </h2>

                {unreadCount > 0 && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">
                    {unreadCount} unread
                  </span>
                )}
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Secure operational alert inbox
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                void loadInbox(true)
              }}
              disabled={isLoading}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50"
              aria-label="Refresh notifications"
            >
              <RefreshCw
                size={16}
                className={
                  isLoading
                    ? 'animate-spin'
                    : ''
                }
              />
            </button>
          </div>

          {loadError && (
            <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-5 py-2.5 text-xs font-medium text-red-700">
              <CircleAlert size={15} />
              Notifications could not be refreshed.
            </div>
          )}

          <div className="max-h-[min(28rem,calc(100vh-10rem))] overflow-y-auto">
            {isLoading && inbox.length === 0 ? (
              <div className="grid min-h-48 place-items-center px-5 py-8 text-center">
                <div>
                  <LoaderCircle className="mx-auto animate-spin text-teal-600" />
                  <p className="mt-3 text-sm text-slate-500">
                    Loading secure alerts...
                  </p>
                </div>
              </div>
            ) : recentItems.length === 0 ? (
              <div className="grid min-h-48 place-items-center px-6 py-8 text-center">
                <div>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <Check size={22} />
                  </div>
                  <p className="mt-3 font-semibold text-slate-900">
                    Inbox is clear
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    No alert deliveries are available.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentItems.map((item) => {
                  const severity = severityStyles[
                    item.severity
                  ]

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        void handleOpenAlert(item)
                      }}
                      className={`relative flex w-full gap-3 px-5 py-4 text-left transition hover:bg-slate-50 ${
                        item.is_read
                          ? 'bg-white'
                          : 'bg-teal-50/45'
                      }`}
                    >
                      {!item.is_read && (
                        <span className="absolute left-0 top-0 h-full w-1 bg-teal-500" />
                      )}

                      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${severity.dot}`} />

                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-3">
                          <span className={`line-clamp-1 text-sm text-slate-950 ${
                            item.is_read
                              ? 'font-semibold'
                              : 'font-bold'
                          }`}>
                            {item.title}
                          </span>

                          <span className="shrink-0 text-[11px] text-slate-400">
                            {formatAlertTime(
                              item.alert_created_at,
                            )}
                          </span>
                        </span>

                        <span className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
                          {item.message}
                        </span>

                        <span className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${severity.badge}`}>
                            {severity.label}
                          </span>

                          {item.is_acknowledged && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                              <Check size={12} />
                              Acknowledged
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3">
            <button
              type="button"
              onClick={() => {
                void handleMarkAllRead()
              }}
              disabled={
                unreadItems.length === 0
                || isMarkingAllRead
              }
              className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 transition hover:text-teal-800 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {isMarkingAllRead ? (
                <LoaderCircle
                  size={14}
                  className="animate-spin"
                />
              ) : (
                <Check size={14} />
              )}
              Mark all as read
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                navigate('/alerts')
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 transition hover:text-slate-950"
            >
              View all alerts
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


function Sidebar({
  activeNavigation,
  userName,
  role,
  pendingUserCount,
  open,
  onClose,
  onLogout,
}: {
  activeNavigation: NavigationKey
  userName: string
  role: string
  pendingUserCount: number
  open: boolean
  onClose: () => void
  onLogout: () => void
}) {
  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#082f49] text-white shadow-xl transition-transform duration-200 lg:translate-x-0 ${
          open
            ? 'translate-x-0'
            : '-translate-x-full'
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex items-center gap-3 !text-white"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500">
              <ShieldCheck size={25} />
            </div>

            <div>
              <p className="text-xl font-bold">
                TraceNet
              </p>

              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-100">
                Intelligence & Response
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-300 hover:bg-white/10 lg:hidden"
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <p className="px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Operations
          </p>

          <div className="mt-3 space-y-1">
            {navigationItems.map((item) => {
              const isAdminOnlyItem = (
                item.key === 'users'
                || item.key === 'audit'
              )

              const isReportsItemRestricted = (
                item.key === 'reports'
                && ![
                  'admin',
                  'analyst',
                ].includes(role)
              )

              if (
                (
                  isAdminOnlyItem
                  && role !== 'admin'
                )
                || isReportsItemRestricted
              ) {
                return null
              }
              const Icon = item.icon
              const isActive = (
                item.key === activeNavigation
              )

              if (!item.available) {
                return (
                  <div
                    key={item.key}
                    title={`${item.label} page is coming next`}
                    className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-400"
                  >
                    <Icon size={19} />
                    {item.label}

                    <span className="ml-auto text-[9px] font-bold uppercase tracking-wide text-slate-500">
                      Soon
                    </span>
                  </div>
                )
              }

              return (
                <Link
                  key={item.key}
                  href={item.path}
                  onClick={onClose}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                    isActive
                      ? 'bg-teal-500 !text-white shadow-lg shadow-slate-950/10'
                      : '!text-slate-300 hover:bg-white/10 hover:!text-white'
                  }`}
                >
                  <Icon size={19} />
                  {item.label}

                  {(
                    item.key === 'users'
                    && pendingUserCount > 0
                  ) && (
                    <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-amber-300 px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-slate-950">
                      {pendingUserCount > 99
                        ? '99+'
                        : pendingUserCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <Users
                size={20}
                className="text-teal-300"
              />

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {userName}
                </p>

                <p className="mt-0.5 text-xs text-slate-400">
                  {formatRole(role)}
                </p>
              </div>
            </div>
          </div>
        </nav>

        <div className="border-t border-white/10 p-4">
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-300 transition hover:bg-red-500/10 hover:text-red-200"
          >
            <LogOut size={19} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
