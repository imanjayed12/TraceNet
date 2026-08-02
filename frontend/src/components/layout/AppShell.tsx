import {
  Bell,
  FileBarChart,
  FileText,
  LayoutDashboard,
  LogOut,
  Map,
  MapPinned,
  Menu,
  Route as RouteIcon,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  Link,
  useLocation,
} from 'wouter'

import { useAuth } from '../../hooks/useAuth'


export type NavigationKey =
  | 'dashboard'
  | 'cases'
  | 'map'
  | 'routes'
  | 'hotspots'
  | 'alerts'
  | 'reports'


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
    icon: Map,
    available: true,
  },
  {
    key: 'routes',
    label: 'Routes',
    path: '/routes',
    icon: RouteIcon,
    available: false,
  },
  {
    key: 'hotspots',
    label: 'Hotspots',
    path: '/hotspots',
    icon: MapPinned,
    available: false,
  },
  {
    key: 'alerts',
    label: 'Alerts',
    path: '/alerts',
    icon: Bell,
    available: false,
  },
  {
    key: 'reports',
    label: 'Reports',
    path: '/reports',
    icon: FileBarChart,
    available: false,
  },
]


function formatRole(role: string): string {
  return role
    .replaceAll('_', ' ')
    .replace(
      /\b\w/g,
      (character) => character.toUpperCase(),
    )
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
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onLogout={handleLogout}
      />

      <div className="lg:pl-72">
        <TopBar
          userName={user?.full_name ?? 'User'}
          unreadCount={unreadAlertCount}
          onOpenMenu={() => setMobileMenuOpen(true)}
        />

        {children}
      </div>
    </div>
  )
}


function TopBar({
  userName,
  unreadCount,
  onOpenMenu,
}: {
  userName: string
  unreadCount: number
  onOpenMenu: () => void
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
          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600"
            aria-label="Alert inbox"
          >
            <Bell size={19} />

            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                {unreadCount > 99
                  ? '99+'
                  : unreadCount}
              </span>
            )}
          </button>

          <div className="hidden items-center gap-3 border-l border-slate-200 pl-3 sm:flex">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 font-bold text-teal-800">
              {userName.charAt(0).toUpperCase()}
            </div>

            <div className="max-w-44">
              <p className="truncate text-sm font-semibold text-slate-900">
                {userName}
              </p>

              <p className="text-xs text-emerald-600">
                Authenticated
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}


function Sidebar({
  activeNavigation,
  userName,
  role,
  open,
  onClose,
  onLogout,
}: {
  activeNavigation: NavigationKey
  userName: string
  role: string
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