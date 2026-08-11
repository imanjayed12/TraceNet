import {
  ArrowRight,
  BarChart3,
  BellRing,
  CheckCircle2,
  FileBarChart,
  Fingerprint,
  LocateFixed,
  LockKeyhole,
  Map,
  Menu,
  Network,
  Route,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import {
  useEffect,
  useState,
} from 'react'
import { useLocation } from 'wouter'

import { useAuth } from '../../hooks/useAuth'


const features = [
  {
    icon: Map,
    title: 'Intelligence map',
    description:
      'Visualize districts, monitored routes and geospatial risk hotspots in one operational view.',
  },
  {
    icon: Route,
    title: 'Route intelligence',
    description:
      'Record movement routes, assess risk levels and maintain verified operational evidence.',
  },
  {
    icon: LocateFixed,
    title: 'Explainable hotspots',
    description:
      'Calculate transparent hotspot risk using case activity, routes and vulnerability indicators.',
  },
  {
    icon: BellRing,
    title: 'Secure alerts',
    description:
      'Deliver role-targeted alerts with read, acknowledgement and live notification tracking.',
  },
  {
    icon: FileBarChart,
    title: 'Reports and analytics',
    description:
      'Generate authorized analytical summaries and export intelligence as JSON, CSV or PDF.',
  },
  {
    icon: Fingerprint,
    title: 'Audit and compliance',
    description:
      'Maintain accountable audit evidence for authentication and security-sensitive operations.',
  },
]


const roles = [
  {
    icon: ShieldCheck,
    title: 'Administrator',
    description:
      'Controls users, access, verification, audit evidence and system-wide administration.',
  },
  {
    icon: Network,
    title: 'Police',
    description:
      'Records cases and operational route intelligence for investigation and response.',
  },
  {
    icon: BarChart3,
    title: 'Analyst',
    description:
      'Reviews intelligence, evaluates risk and prepares evidence-based analytical reports.',
  },
  {
    icon: Users,
    title: 'NGO & Government',
    description:
      'Supports authorized coordination, assistance and institutional response workflows.',
  },
]


const safeguards = [
  'JWT-based secure authentication',
  'Role-based access control',
  'Administrator approval for new accounts',
  'Immutable audit and compliance records',
  'Sensitive metadata redaction',
  'Account activation and access-status validation',
]


function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({
    behavior: 'smooth',
  })
}


export function LandingPage() {
  const [, navigate] = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false)

  const {
    isAuthenticated,
    isInitializing,
  } = useAuth()

  useEffect(() => {
    document.title =
      'TraceNet | Intelligence & Response'
  }, [])

  function openWorkspace() {
    if (isAuthenticated) {
      navigate('/dashboard')
      return
    }

    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => {
              scrollToSection('home')
            }}
            className="flex items-center gap-3 text-left"
            aria-label="Go to TraceNet home"
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-500 text-white shadow-lg shadow-teal-500/20">
              <ShieldCheck className="h-6 w-6" />
            </span>

            <span>
              <span className="block text-xl font-black tracking-tight text-[#073b55]">
                TraceNet
              </span>

              <span className="block text-[9px] font-bold uppercase tracking-[0.24em] text-teal-700">
                Intelligence & Response
              </span>
            </span>
          </button>

          <nav className="hidden items-center gap-7 lg:flex">
            <button
              type="button"
              onClick={() => {
                scrollToSection('about')
              }}
              className="text-sm font-semibold text-slate-600 transition hover:text-teal-700"
            >
              About
            </button>

            <button
              type="button"
              onClick={() => {
                scrollToSection('features')
              }}
              className="text-sm font-semibold text-slate-600 transition hover:text-teal-700"
            >
              Features
            </button>

            <button
              type="button"
              onClick={() => {
                scrollToSection('roles')
              }}
              className="text-sm font-semibold text-slate-600 transition hover:text-teal-700"
            >
              Roles
            </button>

            <button
              type="button"
              onClick={() => {
                scrollToSection('security')
              }}
              className="text-sm font-semibold text-slate-600 transition hover:text-teal-700"
            >
              Security
            </button>
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            {!isAuthenticated && (
              <button
                type="button"
                onClick={() => {
                  navigate('/login')
                }}
                className="h-11 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 transition hover:border-teal-600 hover:text-teal-700"
              >
                Sign in
              </button>
            )}

        <button
          type="button"
          onClick={() => {
            if (isAuthenticated) {
              openWorkspace()
              return
            }

            navigate('/register')
          }}
          disabled={isInitializing}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#075875] px-5 text-sm font-bold text-white shadow-lg shadow-cyan-950/15 transition hover:bg-[#064b64] disabled:cursor-wait disabled:opacity-60"
        >
          {isAuthenticated
            ? 'Open workspace'
            : 'Request access'}

          <ArrowRight className="h-4 w-4" />
        </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen((current) => !current)
            }}
            className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-slate-700 lg:hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-5 py-5 lg:hidden">
            <div className="mx-auto grid max-w-7xl gap-2">
              {[
                ['About', 'about'],
                ['Features', 'features'],
                ['Roles', 'roles'],
                ['Security', 'security'],
              ].map(([label, id]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    scrollToSection(id)
                  }}
                  className="rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {label}
                </button>
              ))}

              <div className="mt-3 grid grid-cols-2 gap-3">
                {!isAuthenticated && (
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/login')
                    }}
                    className="h-11 rounded-xl border border-slate-300 text-sm font-bold text-slate-700"
                  >
                    Sign in
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (isAuthenticated) {
                      openWorkspace()
                      return
                    }

                    navigate('/register')
                  }}
                  className={`h-11 rounded-xl bg-[#075875] px-4 text-sm font-bold text-white ${
                    isAuthenticated ? 'col-span-2' : ''
                  }`}
                >
                  {isAuthenticated
                    ? 'Workspace'
                    : 'Request access'}
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        <section
          id="home"
          className="relative overflow-hidden bg-[#f3f7fb]"
        >
          <div className="absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-teal-200/35 blur-3xl" />
          <div className="absolute -bottom-56 -left-48 h-[34rem] w-[34rem] rounded-full bg-cyan-200/35 blur-3xl" />

          <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl items-center gap-14 px-5 py-20 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white px-4 py-2 text-sm font-bold text-teal-800 shadow-sm">
                <Sparkles className="h-4 w-4" />
                Secure intelligence for coordinated response
              </div>

              <h1 className="mt-7 max-w-3xl text-4xl font-black leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Turning fragmented information into{' '}
                <span className="text-teal-700">
                  actionable intelligence.
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600">
                TraceNet is a role-based intelligence and
                response platform for monitoring cases,
                routes, hotspots and security-sensitive
                operations across an authorized operational
                network.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={openWorkspace}
                  disabled={isInitializing}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#075875] px-7 py-4 font-bold text-white shadow-xl shadow-cyan-950/20 transition hover:-translate-y-0.5 hover:bg-[#064b64] disabled:opacity-60"
                >
                  {isAuthenticated
                    ? 'Open secure workspace'
                    : 'Sign in to TraceNet'}


                </button>

                {!isAuthenticated && (
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/register')
                    }}
                    className="rounded-xl border border-slate-300 bg-white px-7 py-4 font-bold text-slate-700 shadow-sm transition hover:border-teal-600 hover:text-teal-700"
                  >
                    Request an account
                  </button>
                )}
              </div>

              <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold text-slate-600">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-600" />
                  Role-authorized access
                </span>

                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-600" />
                  Explainable risk
                </span>

                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-600" />
                  Accountable audit trail
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[2rem] border border-white/80 bg-white/85 p-4 shadow-2xl shadow-slate-900/15 backdrop-blur sm:p-6">
                <div className="rounded-[1.5rem] bg-[#073b55] p-6 text-white sm:p-8">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">
                        Operational overview
                      </p>

                      <h2 className="mt-2 text-2xl font-black">
                        Connected intelligence
                      </h2>
                    </div>

                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-400/20">
                      <Network className="h-6 w-6 text-teal-200" />
                    </span>
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-3">
                    {[
                      ['Cases', 'Secure records'],
                      ['Routes', 'Movement intelligence'],
                      ['Hotspots', 'Risk assessment'],
                      ['Alerts', 'Coordinated response'],
                    ].map(([title, description]) => (
                      <div
                        key={title}
                        className="rounded-2xl border border-white/10 bg-white/10 p-4"
                      >
                        <p className="font-bold">
                          {title}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-300">
                          {description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <ShieldCheck className="h-6 w-6 text-teal-700" />

                    <p className="mt-4 font-black text-slate-900">
                      Controlled access
                    </p>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Approved professionals receive only
                      role-authorized capabilities.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <BarChart3 className="h-6 w-6 text-teal-700" />

                    <p className="mt-4 font-black text-slate-900">
                      Explainable insights
                    </p>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Transparent risk factors support
                      accountable operational decisions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="about"
          className="scroll-mt-24 py-24"
        >
          <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-700">
                About TraceNet
              </p>

              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                One secure workspace for intelligence and
                coordinated response.
              </h2>
            </div>

            <div className="space-y-5 text-base leading-8 text-slate-600">
              <p>
                TraceNet brings case information,
                geospatial intelligence, monitored routes,
                hotspot assessments and operational alerts
                into a unified platform.
              </p>

              <p>
                Every professional works through an
                approved role. Sensitive operations are
                permission-controlled and recorded to
                support transparency, accountability and
                compliance.
              </p>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="scroll-mt-20 bg-[#f3f7fb] py-24"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-700">
                Core capabilities
              </p>

              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                Intelligence that supports the complete
                operational workflow
              </h2>

              <p className="mt-5 leading-7 text-slate-600">
                From initial information capture to
                geospatial assessment, notification,
                reporting and compliance.
              </p>
            </div>

            <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon

                return (
                  <article
                    key={feature.title}
                    className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-teal-700">
                      <Icon className="h-6 w-6" />
                    </span>

                    <h3 className="mt-6 text-xl font-black">
                      {feature.title}
                    </h3>

                    <p className="mt-3 leading-7 text-slate-600">
                      {feature.description}
                    </p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section
          id="roles"
          className="scroll-mt-20 py-24"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-700">
                Professional network
              </p>

              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                Purpose-built access for every authorized
                role
              </h2>

              <p className="mt-5 leading-7 text-slate-600">
                TraceNet separates responsibilities so
                every professional receives the tools
                required for their operational duty.
              </p>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {roles.map((role) => {
                const Icon = role.icon

                return (
                  <article
                    key={role.title}
                    className="rounded-3xl border border-slate-200 p-6"
                  >
                    <Icon className="h-7 w-7 text-teal-700" />

                    <h3 className="mt-5 text-lg font-black">
                      {role.title}
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {role.description}
                    </p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section
          id="security"
          className="scroll-mt-20 bg-[#073b55] py-24 text-white"
        >
          <div className="mx-auto grid max-w-7xl gap-14 px-5 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div>
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-teal-400/15 text-teal-200">
                <LockKeyhole className="h-7 w-7" />
              </span>

              <p className="mt-7 text-sm font-black uppercase tracking-[0.2em] text-teal-200">
                Security by design
              </p>

              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                Sensitive intelligence deserves accountable
                protection.
              </h2>

              <p className="mt-6 max-w-xl leading-8 text-slate-300">
                TraceNet combines authentication,
                permission enforcement, account approval
                and audit evidence to protect every
                security-sensitive operation.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {safeguards.map((safeguard) => (
                <div
                  key={safeguard}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/10 p-4"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-300" />

                  <span className="text-sm font-semibold leading-6 text-slate-100">
                    {safeguard}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="mx-auto max-w-5xl px-5 sm:px-6">
            <div className="overflow-hidden rounded-[2rem] bg-teal-50 px-6 py-14 text-center sm:px-12">
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                Ready to enter the secure operational
                network?
              </h2>

              <p className="mx-auto mt-5 max-w-2xl leading-7 text-slate-600">
                Sign in with an approved account or submit
                a registration request for administrator
                review.
              </p>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={openWorkspace}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#075875] px-7 py-4 font-bold text-white"
                >
                  {isAuthenticated
                    ? 'Open workspace'
                    : 'Sign in securely'}


                </button>

                {!isAuthenticated && (
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/register')
                    }}
                    className="rounded-xl border border-slate-300 bg-white px-7 py-4 font-bold text-slate-700"
                  >
                    Create registration request
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-500 text-white">
              <ShieldCheck className="h-5 w-5" />
            </span>

            <div>
              <p className="font-black text-[#073b55]">
                TraceNet
              </p>

              <p className="text-xs text-slate-500">
                Intelligence & Response
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} TraceNet. Secure,
            accountable and role-authorized.
          </p>
        </div>
      </footer>
    </div>
  )
}
