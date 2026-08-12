import { isAxiosError } from 'axios'
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  TriangleAlert,
  UserRound,
} from 'lucide-react'
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useState,
} from 'react'

import { authApi } from '../../api/auth'
import { AppShell } from '../../components/layout/AppShell'
import { useAuth } from '../../hooks/useAuth'
import type {
  PasswordChangeData,
  ProfileUpdateData,
  UserRole,
} from '../../types/auth'


const roleLabels: Record<UserRole, string> = {
  admin: 'Administrator',
  police: 'Police',
  government: 'Government authority',
  analyst: 'Intelligence analyst',
  ngo: 'NGO worker',
}


function extractErrorMessage(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const message = extractErrorMessage(item)

      if (message) {
        return message
      }
    }

    return null
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>

    for (const key of [
      'detail',
      'non_field_errors',
      'current_password',
      'new_password',
      'new_password_confirm',
      'full_name',
      'organization',
      'phone',
    ]) {
      const message = extractErrorMessage(record[key])

      if (message) {
        return message
      }
    }

    for (const item of Object.values(record)) {
      const message = extractErrorMessage(item)

      if (message) {
        return message
      }
    }
  }

  return null
}


function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (isAxiosError(error)) {
    return extractErrorMessage(error.response?.data)
      ?? fallback
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}


function FieldLabel({
  children,
}: {
  children: string
}) {
  return (
    <span className="mb-2 block text-sm font-semibold text-slate-800">
      {children}
    </span>
  )
}


function ReadOnlyField({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#087b72] shadow-sm ring-1 ring-slate-200">
          {icon}
        </span>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {label}
          </p>

          <p className="mt-1 break-words text-sm font-semibold text-slate-900">
            {value || 'Not recorded'}
          </p>
        </div>
      </div>
    </div>
  )
}


interface PasswordInputProps {
  label: string
  value: string
  autoComplete: string
  placeholder: string
  visible: boolean
  onToggle: () => void
  onChange: (value: string) => void
}


function PasswordInput({
  label,
  value,
  autoComplete,
  placeholder,
  visible,
  onToggle,
  onChange,
}: PasswordInputProps) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>

      <span className="relative block">
        <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

        <input
          type={visible ? 'text' : 'password'}
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#087b72] focus:ring-4 focus:ring-teal-500/10"
          required
        />

        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </span>
    </label>
  )
}


export function ProfilePage() {
  const {
    user,
    refreshUser,
  } = useAuth()

  const [profileForm, setProfileForm] = (
    useState<ProfileUpdateData>({
      full_name: '',
      phone: '',
      organization: '',
    })
  )
  const [passwordForm, setPasswordForm] = (
    useState<PasswordChangeData>({
      current_password: '',
      new_password: '',
      new_password_confirm: '',
    })
  )
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [isSavingProfile, setIsSavingProfile] = (
    useState(false)
  )
  const [isChangingPassword, setIsChangingPassword] = (
    useState(false)
  )
  const [showCurrentPassword, setShowCurrentPassword] = (
    useState(false)
  )
  const [showNewPassword, setShowNewPassword] = (
    useState(false)
  )
  const [showConfirmation, setShowConfirmation] = (
    useState(false)
  )

  useEffect(() => {
    if (!user) {
      return
    }

    setProfileForm({
      full_name: user.full_name,
      phone: user.phone,
      organization: user.organization,
    })
  }, [user])

  const updateProfileField = (
    field: keyof ProfileUpdateData,
    value: string,
  ) => {
    setProfileForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const updatePasswordField = (
    field: keyof PasswordChangeData,
    value: string,
  ) => {
    setPasswordForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleProfileSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()
    setProfileError('')
    setProfileSuccess('')

    const payload: ProfileUpdateData = {
      full_name: profileForm.full_name.trim(),
      phone: profileForm.phone.trim(),
      organization: profileForm.organization.trim(),
    }

    if (!payload.full_name) {
      setProfileError('Full name is required.')
      return
    }

    if (!payload.organization) {
      setProfileError('Organization is required.')
      return
    }

    setIsSavingProfile(true)

    try {
      await authApi.updateProfile(payload)
      await refreshUser()
      setProfileSuccess('Profile updated successfully.')
    } catch (error) {
      setProfileError(
        getErrorMessage(
          error,
          'Unable to update your profile.',
        ),
      )
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handlePasswordSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (
      passwordForm.new_password
      !== passwordForm.new_password_confirm
    ) {
      setPasswordError('The new passwords do not match.')
      return
    }

    if (
      passwordForm.current_password
      === passwordForm.new_password
    ) {
      setPasswordError(
        'The new password must differ from the current password.',
      )
      return
    }

    setIsChangingPassword(true)

    try {
      const response = await authApi.changePassword(
        passwordForm,
      )

      setPasswordForm({
        current_password: '',
        new_password: '',
        new_password_confirm: '',
      })
      setPasswordSuccess(response.detail)

      window.setTimeout(() => {
        window.location.assign('/login')
      }, 1400)
    } catch (error) {
      setPasswordError(
        getErrorMessage(
          error,
          'Unable to change your password.',
        ),
      )
      setIsChangingPassword(false)
    }
  }

  if (!user) {
    return null
  }

  return (
    <AppShell activeNavigation="profile">
      <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#087b72]">
                <ShieldCheck className="h-4 w-4" />
                Identity and account security
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Profile &amp; security
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Maintain your professional contact details and protect your TraceNet account.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <BadgeCheck className="h-4 w-4" />
              {user.access_status_display}
            </div>
          </div>

          <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-[#0c4664] text-white shadow-sm">
            <div className="grid gap-6 p-6 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="flex min-w-0 items-center gap-4">
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-teal-300 text-2xl font-bold text-[#0b3d57]">
                  {user.full_name.trim().charAt(0).toUpperCase() || 'T'}
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-xl font-bold sm:text-2xl">
                    {user.full_name}
                  </h2>

                  <p className="mt-1 truncate text-sm text-cyan-100">
                    {user.organization}
                  </p>

                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal-200">
                    {roleLabels[user.role]}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-cyan-50">
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldCheck className="h-4 w-4 text-teal-300" />
                  Role-authorized account
                </div>

                <p className="mt-1 text-xs text-cyan-100">
                  Identity changes remain auditable.
                </p>
              </div>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)]">
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-[#087b72]">
                    <UserRound className="h-5 w-5" />
                  </span>

                  <div>
                    <h2 className="font-bold text-slate-950">
                      Professional profile
                    </h2>

                    <p className="mt-1 text-sm text-slate-600">
                      Update the contact details visible across your authorized workspace.
                    </p>
                  </div>
                </div>
              </div>

              <form
                onSubmit={handleProfileSubmit}
                className="p-5 sm:p-6"
              >
                {profileError && (
                  <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    {profileError}
                  </div>
                )}

                {profileSuccess && (
                  <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    {profileSuccess}
                  </div>
                )}

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <FieldLabel>Full name</FieldLabel>

                    <span className="relative block">
                      <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                      <input
                        type="text"
                        value={profileForm.full_name}
                        autoComplete="name"
                        onChange={(event) => updateProfileField(
                          'full_name',
                          event.target.value,
                        )}
                        className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#087b72] focus:ring-4 focus:ring-teal-500/10"
                        required
                      />
                    </span>
                  </label>

                  <label className="block">
                    <FieldLabel>Phone number</FieldLabel>

                    <span className="relative block">
                      <Phone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                      <input
                        type="tel"
                        value={profileForm.phone}
                        autoComplete="tel"
                        placeholder="Optional phone number"
                        onChange={(event) => updateProfileField(
                          'phone',
                          event.target.value,
                        )}
                        className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#087b72] focus:ring-4 focus:ring-teal-500/10"
                      />
                    </span>
                  </label>

                  <label className="block">
                    <FieldLabel>Organization</FieldLabel>

                    <span className="relative block">
                      <Building2 className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                      <input
                        type="text"
                        value={profileForm.organization}
                        autoComplete="organization"
                        onChange={(event) => updateProfileField(
                          'organization',
                          event.target.value,
                        )}
                        className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#087b72] focus:ring-4 focus:ring-teal-500/10"
                        required
                      />
                    </span>
                  </label>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <ReadOnlyField
                    icon={<Mail className="h-5 w-5" />}
                    label="Email"
                    value={user.email}
                  />

                  <ReadOnlyField
                    icon={<ShieldCheck className="h-5 w-5" />}
                    label="Role"
                    value={roleLabels[user.role]}
                  />

                  <ReadOnlyField
                    icon={<BadgeCheck className="h-5 w-5" />}
                    label="Access"
                    value={user.access_status_display}
                  />
                </div>

                <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-5 text-slate-500">
                    Email, role and access status can only be changed through authorized administration.
                  </p>

                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0c5678] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#084865] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingProfile ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save profile
                  </button>
                </div>
              </form>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
                    <KeyRound className="h-5 w-5" />
                  </span>

                  <div>
                    <h2 className="font-bold text-slate-950">
                      Change password
                    </h2>

                    <p className="mt-1 text-sm text-slate-600">
                      Changing your password securely ends existing sessions.
                    </p>
                  </div>
                </div>
              </div>

              <form
                onSubmit={handlePasswordSubmit}
                className="p-5 sm:p-6"
              >
                {passwordError && (
                  <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    {passwordError}
                  </div>
                )}

                {passwordSuccess && (
                  <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    {passwordSuccess}
                  </div>
                )}

                <div className="space-y-5">
                  <PasswordInput
                    label="Current password"
                    value={passwordForm.current_password}
                    autoComplete="current-password"
                    placeholder="Enter current password"
                    visible={showCurrentPassword}
                    onToggle={() => setShowCurrentPassword(
                      (current) => !current,
                    )}
                    onChange={(value) => updatePasswordField(
                      'current_password',
                      value,
                    )}
                  />

                  <PasswordInput
                    label="New password"
                    value={passwordForm.new_password}
                    autoComplete="new-password"
                    placeholder="Create a strong password"
                    visible={showNewPassword}
                    onToggle={() => setShowNewPassword(
                      (current) => !current,
                    )}
                    onChange={(value) => updatePasswordField(
                      'new_password',
                      value,
                    )}
                  />

                  <PasswordInput
                    label="Confirm new password"
                    value={passwordForm.new_password_confirm}
                    autoComplete="new-password"
                    placeholder="Repeat the new password"
                    visible={showConfirmation}
                    onToggle={() => setShowConfirmation(
                      (current) => !current,
                    )}
                    onChange={(value) => updatePasswordField(
                      'new_password_confirm',
                      value,
                    )}
                  />
                </div>

                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />

                    <p className="text-xs leading-5 text-amber-900">
                      Use a unique password that is difficult to predict. After a successful change, you must sign in again.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isChangingPassword ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <KeyRound className="h-4 w-4" />
                  )}
                  Change password
                </button>
              </form>
            </section>
          </div>
        </div>
      </main>
    </AppShell>
  )
}
