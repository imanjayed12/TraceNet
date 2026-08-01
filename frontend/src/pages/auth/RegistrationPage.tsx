import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'wouter'
import { z } from 'zod'

import { authApi } from '../../api/auth'


const registrationSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, 'Enter your full name.')
      .max(150, 'Full name is too long.'),

    email: z
      .string()
      .trim()
      .email('Enter a valid email address.'),

    phone: z
      .string()
      .trim()
      .max(20, 'Phone number is too long.'),

    organization: z
      .string()
      .trim()
      .min(2, 'Enter your organization name.')
      .max(150, 'Organization name is too long.'),

    role: z.enum([
      'police',
      'ngo',
      'analyst',
      'government',
    ]),

    password: z
      .string()
      .min(8, 'Password must contain at least 8 characters.'),

    password_confirm: z
      .string()
      .min(1, 'Confirm your password.'),
  })
  .refine(
    (data) => data.password === data.password_confirm,
    {
      message: 'Passwords do not match.',
      path: ['password_confirm'],
    },
  )


type RegistrationFormData = z.infer<
  typeof registrationSchema
>


function getRegistrationError(error: unknown): string {
  if (
    typeof error === 'object'
    && error !== null
    && 'response' in error
  ) {
    const response = (
      error as {
        response?: {
          data?: Record<string, unknown>
        }
      }
    ).response

    const data = response?.data

    if (data) {
      const detail = data.detail

      if (typeof detail === 'string') {
        return detail
      }

      for (const value of Object.values(data)) {
        if (
          Array.isArray(value)
          && typeof value[0] === 'string'
        ) {
          return value[0]
        }

        if (typeof value === 'string') {
          return value
        }
      }
    }
  }

  return (
    'Registration could not be submitted. '
    + 'Please check your information and try again.'
  )
}


export function RegistrationPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] =
    useState(false)
  const [serverError, setServerError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const {
    register,
    handleSubmit,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      organization: '',
      role: 'police',
      password: '',
      password_confirm: '',
    },
  })

  const onSubmit = async (
    data: RegistrationFormData,
  ) => {
    setServerError('')
    setSuccessMessage('')

    try {
      const response = await authApi.register(data)
      setSuccessMessage(response.detail)
    } catch (error) {
      setServerError(getRegistrationError(error))
    }
  }

  if (successMessage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-10">
        <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-900/5 sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <CheckCircle2 size={34} />
          </div>

          <p className="mt-7 text-sm font-bold uppercase tracking-[0.22em] text-teal-700">
            Registration received
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            Approval is pending
          </h1>

          <p className="mx-auto mt-4 max-w-md leading-7 text-slate-600">
            {successMessage}
          </p>

          <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            For security, you cannot sign in until a TraceNet
            administrator verifies and approves your account.
          </div>

          <Link
            href="/login"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-[#104968] px-6 py-3 font-semibold !text-white transition hover:bg-[#0b3b56]"
          >
            Return to login
            <ArrowRight size={18} />
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10">
      <section className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="relative overflow-hidden bg-[#092f48] px-8 py-10 text-white sm:px-12 lg:p-14">
          <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:52px_52px]" />

          <div className="relative">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500">
                <ShieldCheck size={30} />
              </div>

              <div>
                <p className="text-2xl font-bold">TraceNet</p>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                  Intelligence & Response
                </p>
              </div>
            </div>

            <div className="mt-20">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-teal-300">
                Verified participation
              </p>

              <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight">
                Join a secure and accountable response network.
              </h1>

              <p className="mt-6 leading-7 text-slate-300">
                Registration is available to authorized police,
                government, NGO and analytical personnel.
              </p>
            </div>

            <div className="mt-12 space-y-5">
              {[
                'Every account requires administrator approval.',
                'Access is controlled according to professional role.',
                'Security-sensitive activity is recorded for audit.',
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 text-sm text-slate-200"
                >
                  <CheckCircle2
                    className="mt-0.5 shrink-0 text-teal-300"
                    size={19}
                  />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className="px-6 py-9 sm:px-10 sm:py-11 lg:px-14">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-teal-700"
          >
            <ArrowLeft size={17} />
            Return to login
          </Link>

          <div className="mt-8">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-teal-700">
              Account request
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              Submit registration
            </h2>

            <p className="mt-3 text-slate-600">
              Use your professional information. An administrator
              will review the request before login is enabled.
            </p>
          </div>

          <form
            className="mt-8 space-y-5"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            {serverError && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
              >
                {serverError}
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Full name"
                error={errors.full_name?.message}
              >
                <InputIcon icon={<UserRound size={18} />}>
                  <input
                    {...register('full_name')}
                    className={inputClass}
                    placeholder="Your full name"
                    autoComplete="name"
                  />
                </InputIcon>
              </Field>

              <Field
                label="Professional email"
                error={errors.email?.message}
              >
                <InputIcon icon={<Mail size={18} />}>
                  <input
                    {...register('email')}
                    className={inputClass}
                    placeholder="name@organization.org"
                    type="email"
                    autoComplete="email"
                  />
                </InputIcon>
              </Field>

              <Field
                label="Phone number"
                optional
                error={errors.phone?.message}
              >
                <InputIcon icon={<Phone size={18} />}>
                  <input
                    {...register('phone')}
                    className={inputClass}
                    placeholder="+880..."
                    type="tel"
                    autoComplete="tel"
                  />
                </InputIcon>
              </Field>

              <Field
                label="Organization"
                error={errors.organization?.message}
              >
                <InputIcon icon={<Building2 size={18} />}>
                  <input
                    {...register('organization')}
                    className={inputClass}
                    placeholder="Agency or organization"
                    autoComplete="organization"
                  />
                </InputIcon>
              </Field>
            </div>

            <Field
              label="Requested role"
              error={errors.role?.message}
            >
              <select
                {...register('role')}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-900 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
              >
                <option value="police">Police officer</option>
                <option value="government">
                  Government authority
                </option>
                <option value="ngo">NGO worker</option>
                <option value="analyst">Intelligence analyst</option>
              </select>
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Password"
                error={errors.password?.message}
              >
                <PasswordInput
                  registration={register('password')}
                  visible={showPassword}
                  onToggle={() => setShowPassword(
                    (current) => !current,
                  )}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                />
              </Field>

              <Field
                label="Confirm password"
                error={errors.password_confirm?.message}
              >
                <PasswordInput
                  registration={register('password_confirm')}
                  visible={showConfirmation}
                  onToggle={() => setShowConfirmation(
                    (current) => !current,
                  )}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                />
              </Field>
            </div>

            <p className="text-xs leading-5 text-slate-500">
              Use at least 8 characters and avoid common,
              predictable or personally similar passwords.
            </p>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#104968] px-6 font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-[#0b3b56] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? 'Submitting securely...'
                : 'Submit for approval'}
              {!isSubmitting && <ArrowRight size={19} />}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}


const inputClass = (
  'h-12 w-full rounded-xl border border-slate-300 '
  + 'bg-white pl-11 pr-4 text-slate-900 outline-none '
  + 'transition placeholder:text-slate-400 '
  + 'focus:border-teal-600 focus:ring-4 '
  + 'focus:ring-teal-600/10'
)


interface FieldProps {
  label: string
  error?: string
  optional?: boolean
  children: React.ReactNode
}


function Field({
  label,
  error,
  optional = false,
  children,
}: FieldProps) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-800">
        {label}
        {optional && (
          <span className="font-normal text-slate-400">
            Optional
          </span>
        )}
      </span>

      {children}

      {error && (
        <span className="mt-1.5 block text-xs font-medium text-red-600">
          {error}
        </span>
      )}
    </label>
  )
}


function InputIcon({
  icon,
  children,
}: {
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
        {icon}
      </span>
      {children}
    </div>
  )
}


interface PasswordInputProps {
  registration: ReturnType<
    ReturnType<typeof useForm<RegistrationFormData>>['register']
  >
  visible: boolean
  onToggle: () => void
  placeholder: string
  autoComplete: string
}


function PasswordInput({
  registration,
  visible,
  onToggle,
  placeholder,
  autoComplete,
}: PasswordInputProps) {
  return (
    <div className="relative">
      <LockKeyhole
        size={18}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
      />

      <input
        {...registration}
        type={visible ? 'text' : 'password'}
        className={`${inputClass} pr-11`}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />

      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible
          ? <EyeOff size={18} />
          : <Eye size={18} />}
      </button>
    </div>
  )
}