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

        <Route component={LoginPage} />
      </Switch>
    </Suspense>
  )
}