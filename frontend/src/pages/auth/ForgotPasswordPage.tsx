import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  Mail,
  ShieldCheck,
} from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'wouter'
import { z } from 'zod'

import { authApi } from '../../api/auth'
import { getApiErrorMessage } from '../../utils/apiError'


const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Enter a valid email address.'),
})


type ForgotPasswordFormData = z.infer<
  typeof forgotPasswordSchema
>


export function ForgotPasswordPage() {
  const [serverError, setServerError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const {
    register,
    handleSubmit,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = async (
    formData: ForgotPasswordFormData,
  ) => {
    setServerError('')
    setSuccessMessage('')

    try {
      const response = await authApi.requestPasswordReset(
        formData,
      )
      setSuccessMessage(response.detail)
    } catch (error) {
      setServerError(
        getApiErrorMessage(
          error,
          'Unable to process the password reset request.',
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
                Secure account recovery
              </p>

              <h1 className="mt-5 text-3xl font-bold leading-tight sm:text-4xl">
                Recover access without exposing your account.
              </h1>

              <p className="mt-5 max-w-md text-sm leading-7 text-cyan-50/85">
                TraceNet uses a temporary, one-time link and returns the same response for every submitted email address.
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-cyan-50">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="h-4 w-4 text-teal-300" />
                Privacy-preserving recovery
              </div>

              <p className="mt-2 text-xs leading-5 text-cyan-100">
                Reset requests are rate-limited, time-limited and recorded for security audit.
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center p-7 sm:p-10 lg:p-14">
          <div className="w-full">
            <Link
              href="/login"
              className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-[#087b72] "
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
                  Request received
                </p>

                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                  Check your email
                </h2>

                <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-slate-600">
                  {successMessage}
                </p>

                <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  The response does not confirm whether an account exists. If eligible, the reset link will expire and can only be used once.
                </div>

                <Link
                  href="/login"
                  className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#0d3a58] text-white px-6 font-semibold text-white shadow-lg shadow-[#0d3a58]/15 transition hover:bg-[#124b6d]"
                >
                  Return to login
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            ) : (
              <>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#087b72]">
                  Password assistance
                </p>

                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                  Forgot your password
                </h2>

                <p className="mt-4 text-sm leading-7 text-slate-600">
                  Enter your professional email. If the account is eligible, TraceNet will send a secure reset link.
                </p>

                {serverError && (
                  <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <p>{serverError}</p>
                  </div>
                )}

                <form
                  className="mt-8 space-y-6"
                  onSubmit={handleSubmit(onSubmit)}
                  noValidate
                >
                  <div>
                    <label
                      htmlFor="reset-email"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Email address
                    </label>

                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                      <input
                        id="reset-email"
                        type="email"
                        autoComplete="email"
                        placeholder="name@organization.org"
                        className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-slate-900 shadow-sm transition placeholder:text-slate-400 hover:border-slate-400 focus:border-[#159b91] focus:ring-4 focus:ring-[#159b91]/10"
                        aria-invalid={Boolean(errors.email)}
                        {...register('email')}
                      />
                    </div>

                    {errors.email && (
                      <p className="mt-2 text-sm text-red-600">
                        {errors.email.message}
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
                        Sending secure link...
                      </>
                    ) : (
                      <>
                        Send reset link
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
