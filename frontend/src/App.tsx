import { LoaderCircle } from 'lucide-react'
import {
  lazy,
  Suspense,
  useEffect,
} from 'react'
import type { ReactNode } from 'react'
import {
  Route,
  Switch,
  useLocation,
} from 'wouter'

import { useAuth } from './hooks/useAuth'
import { LoginPage } from './pages/auth/LoginPage'


const RegistrationPage = lazy(
  async () => {
    const module = await import(
      './pages/auth/RegistrationPage'
    )

    return {
      default: module.RegistrationPage,
    }
  },
)


const DashboardPage = lazy(
  async () => {
    const module = await import(
      './pages/dashboard/DashboardPage'
    )

    return {
      default: module.DashboardPage,
    }
  },
)


const CasesPage = lazy(
  async () => {
    const module = await import(
      './pages/cases/CasesPage'
    )

    return {
      default: module.CasesPage,
    }
  },
)


const CaseDetailPage = lazy(
  async () => {
    const module = await import(
      './pages/cases/CaseDetailPage'
    )

    return {
      default: module.CaseDetailPage,
    }
  },
)


const IntelligenceMapPage = lazy(
  async () => {
    const module = await import(
      './pages/map/IntelligenceMapPage'
    )

    return {
      default: module.IntelligenceMapPage,
    }
  },
)

const HotspotsPage = lazy(
  async () => {
    const module = await import(
      './pages/hotspots/HotspotsPage'
    )

    return {
      default: module.HotspotsPage,
    }
  },
)

const AlertsPage = lazy(
  async () => {
    const module = await import(
      './pages/alerts/AlertsPage'
    )

    return {
      default: module.AlertsPage,
    }
  },
)

const ReportsPage = lazy(
  async () => {
    const module = await import(
      './pages/reports/ReportsPage'
    )

    return {
      default: module.ReportsPage,
    }
  },
)

const RoutesPage = lazy(
  async () => {
    const module = await import(
      './pages/routes/RoutesPage'
    )

    return {
      default: module.RoutesPage,
    }
  },
)
const AuditPage = lazy(
  async () => {
    const module = await import(
      './pages/audit/AuditPage'
    )

    return {
      default: module.AuditPage,
    }
  },
)

const UsersPage = lazy(
  async () => {
    const module = await import(
      './pages/users/UsersPage'
    )

    return {
      default: module.UsersPage,
    }
  },
)

function LoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f7fb]">
      <div className="text-center">
        <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-[#087b72]" />

        <p className="mt-4 text-sm font-medium text-slate-600">
          Loading secure workspace...
        </p>
      </div>
    </main>
  )
}


function ProtectedPage({
  children,
}: {
  children: ReactNode
}) {
  const [, navigate] = useLocation()

  const {
    user,
    isAuthenticated,
    isInitializing,
  } = useAuth()

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      navigate('/login', {
        replace: true,
      })
    }
  }, [
    isAuthenticated,
    isInitializing,
    navigate,
  ])

  if (isInitializing) {
    return <LoadingScreen />
  }

  if (!isAuthenticated || !user) {
    return null
  }

  return children
}


function ProtectedDashboard() {
  return (
    <ProtectedPage>
      <DashboardPage />
    </ProtectedPage>
  )
}


function ProtectedCases() {
  return (
    <ProtectedPage>
      <CasesPage />
    </ProtectedPage>
  )
}


function ProtectedCaseDetail() {
  return (
    <ProtectedPage>
      <CaseDetailPage />
    </ProtectedPage>
  )
}


function ProtectedIntelligenceMap() {
  return (
    <ProtectedPage>
      <IntelligenceMapPage />
    </ProtectedPage>
  )
}

function ProtectedHotspots() {
  return (
    <ProtectedPage>
      <HotspotsPage />
    </ProtectedPage>
  )
}

function ProtectedAlerts() {
  return (
    <ProtectedPage>
      <AlertsPage />
    </ProtectedPage>
  )
}

function ProtectedReports() {
  return (
    <ProtectedPage>
      <ReportsPage />
    </ProtectedPage>
  )
}

function ProtectedRoutes() {
  return (
    <ProtectedPage>
      <RoutesPage />
    </ProtectedPage>
  )
}

function ProtectedAudit() {
  return (
    <ProtectedPage>
      <AuditPage />
    </ProtectedPage>
  )
}

function ProtectedUsers() {
  return (
    <ProtectedPage>
      <UsersPage />
    </ProtectedPage>
  )
}

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Switch>
        <Route path="/" component={LoginPage} />
        <Route path="/login" component={LoginPage} />

        <Route
          path="/register"
          component={RegistrationPage}
        />

        <Route
          path="/dashboard"
          component={ProtectedDashboard}
        />

        <Route
          path="/cases/:referenceCode"
          component={ProtectedCaseDetail}
        />

        <Route
          path="/cases"
          component={ProtectedCases}
        />

        <Route
          path="/map"
          component={ProtectedIntelligenceMap}
        />

        <Route
          path="/routes"
          component={ProtectedRoutes}
        />

        <Route
          path="/hotspots"
          component={ProtectedHotspots}
        />

        <Route
          path="/alerts"
          component={ProtectedAlerts}
        />

        <Route
          path="/reports"
          component={ProtectedReports}
        />

        <Route
          path="/audit"
          component={ProtectedAudit}
        />

        <Route
          path="/users"
          component={ProtectedUsers}
        />
        <Route component={LoginPage} />
      </Switch>
    </Suspense>
  )
}