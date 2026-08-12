import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'wouter'
import { z } from 'zod'

import { authApi } from '../../api/auth'
import { getApiErrorMessage } from '../../utils/apiError'


const resetPasswordSchema = z
  .object({
    new_password: z
      .string()
      .min(8, 'Use at least 8 characters.'),
    new_password_confirm: z
      .string()
      .min(1, 'Confirm your new password.'),
  })
  .refine(
    (values) => (
      values.new_password
      === values.new_password_confirm
    ),
    {
      message: 'The two passwords do not match.',
      path: ['new_password_confirm'],
    },
  )


type ResetPasswordFormData = z.infer<
  typeof resetPasswordSchema
>


export function ResetPasswordPage() {
  const resetCredentials = useMemo(() => {
    const parameters = new URLSearchParams(
      window.location.search,
    )

    return {
      uid: parameters.get('uid') ?? '',
      token: parameters.get('token') ?? '',
    }
  }, [])

  const hasResetCredentials = Boolean(
    resetCredentials.uid
    && resetCredentials.token,
  )

  const [serverError, setServerError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = (
    useState(false)
  )

  const {
    register,
    handleSubmit,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      new_password: '',
      new_password_confirm: '',
    },
  })

  const onSubmit = async (
    formData: ResetPasswordFormData,
  ) => {
    setServerError('')
    setSuccessMessage('')

    if (!hasResetCredentials) {
      setServerError(
        'This password reset link is invalid or incomplete.',
      )
      return
    }

    try {
      const response = await authApi.confirmPasswordReset({
        ...resetCredentials,
        ...formData,
      })
      setSuccessMessage(response.detail)
    } catch (error) {
      setServerError(
        getApiErrorMessage(
          error,
          'This password reset link is invalid or has expired.',
        ),
      )
    }
  }

  return (
    <main className="min-h-screen bg-[#eef3f8] px-4 py-8 sm:px-6 lg:grid lg:place-items-center lg:py-12">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/40 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="relative overflow-hidden bg-[#0b3b58] p-8 text-white sm:p-10 lg:p-12">
          <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:52px_52px]" />

          <div className="relative flex h-full min-h-80 flex-col">
            <Link
              href="/"
              className="inline-flex w-fit items-center gap-3"
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#08c5b6] shadow-lg shadow-teal-950/25">
                <ShieldCheck className="h-7 w-7" />
              </span>

              <span>
                <span className="block text-2xl font-bold">
                  TraceNet
                </span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
                  Intelligence &amp; Response
                </span>
              </span>
            </Link>

            <div className="my-auto py-12">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-300">
                Protected credential update
              </p>

              <h1 className="mt-5 text-3xl font-bold leading-tight sm:text-4xl">
                Create a secure new password.
              </h1>

              <p className="mt-5 max-w-md text-sm leading-7 text-cyan-50/85">
                A successful reset invalidates the one-time link and revokes existing refresh sessions.
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-cyan-50">
              <div className="flex items-center gap-2 font-semibold">
                <KeyRound className="h-4 w-4 text-teal-300" />
                Strong password required
              </div>

              <p className="mt-2 text-xs leading-5 text-cyan-100">
                Avoid predictable, reused, common or personally similar passwords.
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center p-7 sm:p-10 lg:p-14">
          <div className="w-full">
            <Link
              href="/login"
              className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-[#087b72]"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to login
            </Link>

            {successMessage ? (
              <div className="text-center">
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-8 w-8" />
                </span>

                <p className="mt-7 text-xs font-bold uppercase tracking-[0.22em] text-[#087b72]">
                  Password updated
                </p>

                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                  Access secured
                </h2>

                <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-slate-600">
                  {successMessage}
                </p>

                <Link
                  href="/login"
                  className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#0d3a58] px-6 font-semibold !text-white shadow-lg shadow-[#0d3a58]/15 transition hover:bg-[#124b6d]"
                >
                  Sign in securely
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            ) : (
              <>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#087b72]">
                  Secure reset
                </p>

                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                  Set a new password
                </h2>

                <p className="mt-4 text-sm leading-7 text-slate-600">
                  Enter and confirm a strong password for your TraceNet account.
                </p>

                {!hasResetCredentials && (
                  <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <p>
                      This reset link is incomplete. Request a new password reset email.
                    </p>
                  </div>
                )}

                {serverError && (
                  <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <p>{serverError}</p>
                  </div>
                )}

                <form
                  className="mt-8 space-y-5"
                  onSubmit={handleSubmit(onSubmit)}
                  noValidate
                >
                  <div>
                    <label
                      htmlFor="new-password"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      New password
                    </label>

                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                      <input
                        id="new-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Create a strong password"
                        className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-12 text-slate-900 shadow-sm transition placeholder:text-slate-400 hover:border-slate-400 focus:border-[#159b91] focus:ring-4 focus:ring-[#159b91]/10"
                        aria-invalid={Boolean(
                          errors.new_password,
                        )}
                        {...register('new_password')}
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword(
                          (current) => !current,
                        )}
                        className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100"
                        aria-label={
                          showPassword
                            ? 'Hide new password'
                            : 'Show new password'
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>

                    {errors.new_password && (
                      <p className="mt-2 text-sm text-red-600">
                        {errors.new_password.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="new-password-confirm"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Confirm new password
                    </label>

                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                      <input
                        id="new-password-confirm"
                        type={
                          showConfirmation
                            ? 'text'
                            : 'password'
                        }
                        autoComplete="new-password"
                        placeholder="Repeat the new password"
                        className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-12 text-slate-900 shadow-sm transition placeholder:text-slate-400 hover:border-slate-400 focus:border-[#159b91] focus:ring-4 focus:ring-[#159b91]/10"
                        aria-invalid={Boolean(
                          errors.new_password_confirm,
                        )}
                        {...register('new_password_confirm')}
                      />

                      <button
                        type="button"
                        onClick={() => setShowConfirmation(
                          (current) => !current,
                        )}
                        className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100"
                        aria-label={
                          showConfirmation
                            ? 'Hide password confirmation'
                            : 'Show password confirmation'
                        }
                      >
                        {showConfirmation ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>

                    {errors.new_password_confirm && (
                      <p className="mt-2 text-sm text-red-600">
                        {errors.new_password_confirm.message}
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
                    Use at least 8 characters. Server-side security rules also reject common, predictable or personally similar passwords.
                  </div>

                  <button
                    type="submit"
                    disabled={
                      isSubmitting
                      || !hasResetCredentials
                    }
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0d3a58] px-5 font-semibold text-white shadow-lg shadow-[#0d3a58]/15 transition hover:bg-[#124b6d] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <LoaderCircle className="h-5 w-5 animate-spin" />
                        Securing account...
                      </>
                    ) : (
                      <>
                        Reset password
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </form>

                {!hasResetCredentials && (
                  <Link
                    href="/forgot-password"
                    className="mt-6 flex justify-center text-sm font-semibold text-[#087b72] hover:text-[#075f59]"
                  >
                    Request a new reset link
                  </Link>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
