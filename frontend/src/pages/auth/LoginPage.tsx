import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Fingerprint,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  ShieldCheck,
} from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation } from 'wouter'
import { z } from 'zod'

import { useAuth } from '../../hooks/useAuth'
import { getApiErrorMessage } from '../../utils/apiError'


const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Enter a valid email address.'),
  password: z
    .string()
    .min(1, 'Password is required.'),
})


type LoginFormData = z.infer<typeof loginSchema>


export function LoginPage() {
  const [, navigate] = useLocation()
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(
    false,
  )
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (
    formData: LoginFormData,
  ) => {
    setServerError('')

    try {
      await login(formData)
      navigate('/dashboard')
    } catch (error) {
      setServerError(
        getApiErrorMessage(
          error,
          'Login failed. Check your credentials.',
        ),
      )
    }
  }

  return (
    <main className="min-h-screen bg-[#eef3f8]">
      <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden overflow-hidden bg-[#0b2942] px-12 py-10 text-white lg:flex lg:flex-col">
          <div className="absolute inset-0 opacity-40">
            <div className="absolute -left-28 top-24 h-96 w-96 rounded-full bg-[#168b91] blur-3xl" />
            <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#1d6387] blur-3xl" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] bg-[size:42px_42px]" />
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#13a89e] shadow-lg shadow-black/20">
              <ShieldCheck
                aria-hidden="true"
                className="h-7 w-7"
              />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight">
                TraceNet
              </p>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-300">
                Intelligence & response
              </p>
            </div>
          </div>

          <div className="relative z-10 my-auto max-w-xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-slate-200 backdrop-blur">
              <Fingerprint className="h-4 w-4 text-[#4cd5c9]" />
              Secure role-based operations
            </div>

            <h1 className="max-w-lg text-5xl font-semibold leading-[1.08] tracking-[-0.04em]">
              Coordinated intelligence for safer
              communities.
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
              Monitor cases, routes, hotspots and alerts
              through one accountable, privacy-conscious
              operational platform.
            </p>

            <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
              {[
                ['64', 'Districts mapped'],
                ['24/7', 'Alert monitoring'],
                ['100%', 'Audited access'],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur"
                >
                  <p className="text-2xl font-semibold">
                    {value}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-2 text-sm text-slate-400">
            <MapPin className="h-4 w-4" />
            Bangladesh operational coverage
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-9 flex items-center gap-3 lg:hidden">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#0d3a58] text-white">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">
                  TraceNet
                </p>
                <p className="text-xs text-slate-500">
                  Intelligence & response
                </p>
              </div>
            </div>

            <div className="mb-8">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#087b72]">
                Secure access
              </p>
              <h2 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950">
                Welcome back
              </h2>
              <p className="mt-3 leading-7 text-slate-600">
                Sign in with your approved TraceNet account
                to continue.
              </p>
            </div>

            {serverError && (
              <div
                role="alert"
                className="mb-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
              >
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <p>{serverError}</p>
              </div>
            )}

            <form
              className="space-y-5"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
            >
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@organization.org"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-900 shadow-sm transition placeholder:text-slate-400 hover:border-slate-400 focus:border-[#159b91] focus:ring-4 focus:ring-[#159b91]/10"
                  aria-invalid={Boolean(errors.email)}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Password
                  </label>
                  <span className="text-xs text-slate-500">
                    Case-sensitive
                  </span>
                </div>

                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    id="password"
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-12 text-slate-900 shadow-sm transition placeholder:text-slate-400 hover:border-slate-400 focus:border-[#159b91] focus:ring-4 focus:ring-[#159b91]/10"
                    aria-invalid={Boolean(
                      errors.password,
                    )}
                    {...register('password')}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setShowPassword((current) => !current)
                    }}
                    className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                    aria-label={
                      showPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>

                {errors.password && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0d3a58] px-5 font-semibold text-white shadow-lg shadow-[#0d3a58]/15 transition hover:bg-[#124b6d] disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in securely
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 rounded-xl border border-slate-200 bg-white/70 p-4 text-center text-sm text-slate-600">
              Need an approved account?{' '}
              <Link
                href="/register"
                className="font-semibold text-[#087b72] hover:text-[#075f59]"
              >
                Submit registration
              </Link>
            </div>

            <p className="mt-6 text-center text-xs leading-5 text-slate-500">
              Access is monitored and recorded for security,
              accountability and safeguarding.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}