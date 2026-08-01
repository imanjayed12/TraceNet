import {
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  ShieldCheck,
} from 'lucide-react'
import { useEffect } from 'react'
import {
  Route,
  Switch,
  useLocation,
} from 'wouter'

import { useAuth } from './hooks/useAuth'
import { LoginPage } from './pages/auth/LoginPage'
import { RegistrationPage } from './pages/auth/RegistrationPage'


function LoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f7fb]">
      <div className="text-center">
        <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-[#087b72]" />

        <p className="mt-4 text-sm font-medium text-slate-600">
          Restoring secure session...
        </p>
      </div>
    </main>
  )
}


function ProtectedDashboard() {
  const [, navigate] = useLocation()

  const {
    user,
    isAuthenticated,
    isInitializing,
    logout,
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

  return (
    <main className="min-h-screen bg-[#f4f7fb] p-6">
      <div className="mx-auto max-w-6xl">
        <header className="surface-card flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#0d3a58] text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>

            <div>
              <p className="font-bold text-slate-950">
                TraceNet
              </p>

              <p className="text-sm text-slate-500">
                Secure operational dashboard
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              void logout().finally(() => {
                navigate('/login')
              })
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </header>

        <section className="surface-card mt-6 p-8">
          <LayoutDashboard className="h-9 w-9 text-[#087b72]" />

          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
            Welcome, {user.full_name}
          </h1>

          <p className="mt-3 text-slate-600">
            Authentication is connected. The complete
            analytics dashboard is the next frontend step.
          </p>

          <div className="mt-6 inline-flex rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
            Role: {user.role}
          </div>
        </section>
      </div>
    </main>
  )
}


export default function App() {
  return (
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

      <Route component={LoginPage} />
    </Switch>
  )
}