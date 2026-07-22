import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  ImageIcon,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Trash2,
  Upload,
  User,
  UserCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import api from '@/services/api'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/errors'
import type { AdminProfile } from '@/types/admin'

/* ─── Schemas ───────────────────────────────────────────────────────────── */

const profileSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name cannot be empty'),
  username: z.string().trim().min(1, 'Username cannot be empty'),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

const verifyCodeSchema = z.object({
  code: z.string()
    .length(6, 'Code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Code must contain only digits'),
})

const DEFAULT_RESEND_COOLDOWN_SECONDS = 60

type ProfileFormValues = z.infer<typeof profileSchema>
type PasswordFormValues = z.infer<typeof passwordSchema>
type VerifyCodeFormValues = z.infer<typeof verifyCodeSchema>

const ROLE_LABELS: Record<AdminProfile['role'], string> = {
  ADMIN: 'Administrator',
}

const ABOUT_MAX = 250

/* ─── Tab definitions ───────────────────────────────────────────────────── */

type TabKey = 'personal' | 'security'

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'personal', label: 'Personal Info', icon: User },
  { key: 'security', label: 'Security', icon: Lock },
]

/* ─── Page ──────────────────────────────────────────────────────────────── */

function SettingsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabKey>('personal')

  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)

  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [aboutMe, setAboutMe] = useState('')

  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)

  const [verifyOpen, setVerifyOpen] = useState(false)
  const [verifyStep, setVerifyStep] = useState<'send' | 'code'>('send')
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null)

  const [sendingCode, setSendingCode] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const profileForm = useForm<ProfileFormValues>({ resolver: zodResolver(profileSchema) })
  const passwordForm = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema) })
  const verifyForm = useForm<VerifyCodeFormValues>({ resolver: zodResolver(verifyCodeSchema) })
  const watchedCode = verifyForm.watch('code') || ''
  const isCodeValid = watchedCode.length === 6 && !verifyForm.formState.errors.code

  /* ── Fetch profile ── */
  const fetchProfile = () => {
    setProfileLoading(true)
    setProfileError(null)

    api
      .get('/admin/profile')
      .then(({ data }) => {
        const admin: AdminProfile = data.data
        setProfile(admin)
        profileForm.reset({
          fullName: admin.fullName || '',
          username: admin.username,
        })
      })
      .catch((error) => {
        setProfileError(getErrorMessage(error, 'Failed to load profile.'))
      })
      .finally(() => setProfileLoading(false))
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const persistAdminInfo = (admin: AdminProfile) => {
    setProfile(admin)
    try {
      const stored = JSON.parse(localStorage.getItem('adminInfo') || '{}')
      localStorage.setItem('adminInfo', JSON.stringify({ ...stored, ...admin }))
    } catch {
      localStorage.setItem('adminInfo', JSON.stringify(admin))
    }
  }

  useEffect(() => {
    if (!avatarPreview) return
    return () => { URL.revokeObjectURL(avatarPreview) }
  }, [avatarPreview])

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleRemoveAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  /* ── Submit profile ── */
  const onSubmitProfile = async (values: ProfileFormValues) => {
    setProfileError(null)
    setProfileSuccess(null)

    try {
      const formData = new FormData()
      formData.append('fullName', values.fullName)
      formData.append('username', values.username)

      if (avatarFile) {
        formData.append('avatar', avatarFile)
      }

      const { data } = await api.patch('/admin/profile', formData)
      persistAdminInfo(data.data)
      profileForm.reset({
        fullName: data.data.fullName || '',
        username: data.data.username,
      })
      setAvatarFile(null)
      setAvatarPreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setProfileSuccess(data.message || 'Profile updated successfully.')
      setTimeout(() => {
        setProfileSuccess(null)
        fetchProfile()
      }, 1500)
    } catch (error) {
      setProfileError(getErrorMessage(error, 'Failed to update profile.'))
    }
  }

  /* ── Submit password ── */
  const onSubmitPassword = async (values: PasswordFormValues) => {
    setPasswordError(null)
    setPasswordSuccess(null)

    try {
      const { data } = await api.patch('/admin/profile/password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      setPasswordSuccess(data.message || 'Password changed successfully.')
      passwordForm.reset()
    } catch (error) {
      setPasswordError(getErrorMessage(error, 'Failed to change password.'))
    }
  }

  /* ── Email verify ── */

  // Ticks the resend cooldown down to 0 once a second while the dialog is open.
  useEffect(() => {
    if (!verifyOpen || resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [verifyOpen, resendCooldown])

  const openVerifyDialog = () => {
    setVerifyOpen(true)
    setVerifyStep('send')
    setVerifyError(null)
    setVerifySuccess(null)
    setResendCooldown(0)
    verifyForm.reset()
  }

  const handleSendCode = async () => {
    if (resendCooldown > 0) return
    setSendingCode(true)
    setVerifyError(null)
    setVerifySuccess(null)

    try {
      const { data } = await api.post('/admin/auth/send-verify-email')
      setVerifySuccess(data.message || 'Verification code sent to your email.')
      setVerifyStep('code')
      setResendCooldown(data.data?.resendCooldownSeconds || DEFAULT_RESEND_COOLDOWN_SECONDS)
      verifyForm.reset()
    } catch (error) {
      setVerifyError(getErrorMessage(error, 'Failed to send verification code.'))
    } finally {
      setSendingCode(false)
    }
  }

  const onSubmitVerifyCode = async (values: VerifyCodeFormValues) => {
    setVerifyError(null)
    setVerifySuccess(null)

    try {
      const { data } = await api.post('/admin/auth/verify-email', { code: values.code })

      if (profile) {
        persistAdminInfo({ ...profile, isEmailVerified: true })
      }

      setVerifySuccess(data.message || 'Email verified successfully.')
      setTimeout(() => { setVerifyOpen(false) }, 2000)
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to verify email.')
      setVerifyError(message)

      // Exceeded the attempt limit: the account is now locked out. Sign the
      // admin out and send them back to the login page rather than leaving
      // them on a Settings page they can no longer do anything useful on.
      if (message.toLowerCase().includes('locked')) {
        setTimeout(() => {
          localStorage.removeItem('adminToken')
          localStorage.removeItem('adminInfo')
          navigate('/login', { replace: true })
        }, 2500)
      }
    }
  }

  const handleDiscard = () => {
    if (profile) {
      profileForm.reset({
        fullName: profile.fullName || '',
        username: profile.username,
      })
    }
    setAvatarFile(null)
    setAvatarPreview(null)
    setAboutMe('')
    setProfileError(null)
    setProfileSuccess(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const resolveAvatar = (url: string | null | undefined) => {
    if (!url) return null
    if (url.startsWith('http')) return url
    const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
    return base.replace(/\/api\/?$/, '') + url
  }

  const avatarSrc = avatarPreview || resolveAvatar(profile?.avatar) || null

  /* ─── Render ──────────────────────────────────────────────────────────── */

  return (
    <div className="animate-fade-up flex flex-col">

      {/* ── Page header ── */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
            <span>Settings</span>
            <ChevronRight className="size-3.5" />
            <span className="font-medium text-slate-600">Update Profile</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-600 text-white">
              <User className="size-4" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">Update Profile</h2>
              <p className="text-sm text-slate-500">Manage your personal identity and account security</p>
            </div>
          </div>
        </div>

        {activeTab === 'personal' && (
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleDiscard}>
              Discard Changes
            </Button>
            <Button
              type="button"
              onClick={profileForm.handleSubmit(onSubmitProfile)}
              disabled={profileForm.formState.isSubmitting}
              className="gap-2 bg-orange-500 text-white hover:bg-orange-600"
            >
              {profileForm.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {/* Toast notifications */}
      {(profileSuccess || profileError) && (
        <div className="fixed right-6 top-20 z-50 animate-fade-up">
          {profileError && (
            <Alert variant="destructive" onDismiss={() => setProfileError(null)} className="min-w-[320px] shadow-lg">
              {profileError}
            </Alert>
          )}
          {profileSuccess && (
            <Alert variant="success" onDismiss={() => setProfileSuccess(null)} className="min-w-[320px] shadow-lg">
              {profileSuccess}
            </Alert>
          )}
        </div>
      )}

      {/* ── Loading ── */}
      {profileLoading ? (
        <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground justify-center">
          <Loader2 className="size-5 animate-spin" />
          Loading account information...
        </div>
      ) : (
        <>
          {/* ── Tabs ── */}
          <div className="mb-6 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all ${
                  activeTab === key
                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>

          {/* ── Personal Info tab ── */}
          {activeTab === 'personal' && (
            <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} noValidate>
              <div className="grid gap-6 lg:grid-cols-[280px_1fr]">

                {/* Left — Profile image */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-5 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Profile Image
                  </h3>
                  <div className="flex flex-col items-center">
                    <div className="relative mb-5">
                      {avatarSrc ? (
                        <img
                          src={avatarSrc}
                          alt={profile?.fullName || profile?.username}
                          className="size-28 rounded-full border-4 border-white object-cover shadow-lg"
                        />
                      ) : (
                        <div className="flex size-28 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-slate-200 to-slate-300 shadow-lg">
                          <UserCircle className="size-16 text-slate-400" />
                        </div>
                      )}
                    </div>

                    <Button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mb-3 w-full gap-2 bg-blue-600 text-white hover:bg-blue-700"
                    >
                      <Upload className="size-4" />
                      Change Photo
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />

                    {(avatarSrc || avatarFile) && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="flex items-center gap-1.5 text-sm font-medium text-red-500 transition-colors hover:text-red-600"
                      >
                        <Trash2 className="size-3.5" />
                        Remove Photo
                      </button>
                    )}

                    <p className="mt-4 text-center text-[11px] text-slate-400">
                      <ImageIcon className="mb-0.5 inline size-3" /> JPG, GIF or PNG.
                      <br />
                      Max size 2MB.
                    </p>
                  </div>
                </div>

                {/* Right — Account details */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-5 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Account Details
                  </h3>

                  <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                    {/* Full Name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="fullName" className="text-xs font-semibold text-slate-600">
                        Full Name
                      </Label>
                      <Input
                        id="fullName"
                        placeholder="Enter your full name"
                        aria-invalid={!!profileForm.formState.errors.fullName}
                        className="h-11 rounded-lg border-slate-200 bg-white shadow-sm"
                        {...profileForm.register('fullName')}
                      />
                      {profileForm.formState.errors.fullName && (
                        <p className="text-xs text-red-500">{profileForm.formState.errors.fullName.message}</p>
                      )}
                    </div>

                    {/* Role (read-only, mapped to "Job Title") */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Job Title</Label>
                      <Input
                        readOnly
                        value={profile ? ROLE_LABELS[profile.role] : ''}
                        className="h-11 rounded-lg border-slate-200 bg-slate-50 text-slate-500 shadow-sm"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Email Address</Label>
                      <div className="relative">
                        <Input
                          readOnly
                          value={profile?.email || ''}
                          className="h-11 rounded-lg border-slate-200 bg-slate-50 pr-24 text-slate-500 shadow-sm"
                        />
                        <div className="absolute inset-y-0 right-3 flex items-center">
                          {profile?.isEmailVerified ? (
                            <Badge className="gap-1 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700">
                              <span className="size-1.5 rounded-full bg-emerald-500" />
                              Verified
                            </Badge>
                          ) : (
                            <button type="button" onClick={openVerifyDialog}>
                              <Badge variant="destructive" className="cursor-pointer text-[10px]">
                                Not verified
                              </Badge>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status (mapped to "Department") */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Department</Label>
                      <Input
                        readOnly
                        value={profile?.status || ''}
                        className="h-11 rounded-lg border-slate-200 bg-slate-50 text-slate-500 shadow-sm"
                      />
                    </div>

                    {/* Username */}
                    <div className="space-y-1.5">
                      <Label htmlFor="username" className="text-xs font-semibold text-slate-600">
                        Username
                      </Label>
                      <Input
                        id="username"
                        placeholder="Enter username"
                        aria-invalid={!!profileForm.formState.errors.username}
                        className="h-11 rounded-lg border-slate-200 bg-white shadow-sm"
                        {...profileForm.register('username')}
                      />
                      {profileForm.formState.errors.username && (
                        <p className="text-xs text-red-500">{profileForm.formState.errors.username.message}</p>
                      )}
                    </div>

                    {/* Employee ID (read-only) */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Employee ID</Label>
                      <Input
                        readOnly
                        value={profile?._id ? `BN-${profile._id.slice(-6).toUpperCase()}` : '-'}
                        className="h-11 rounded-lg border-slate-200 bg-slate-50 font-mono text-xs text-slate-500 shadow-sm"
                      />
                    </div>

                    {/* Last Login (mapped to "Date of Birth") */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Last Login</Label>
                      <div className="relative">
                        <Input
                          readOnly
                          value={profile?.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleDateString('en-US') : '-'}
                          className="h-11 rounded-lg border-slate-200 bg-slate-50 pr-10 text-slate-500 shadow-sm"
                        />
                        <CalendarDays className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>

                    {/* Time Zone */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Time Zone</Label>
                      <div className="relative">
                        <Input
                          readOnly
                          value="(GMT+07:00) Bangkok, Hanoi, Jakarta"
                          className="h-11 rounded-lg border-slate-200 bg-slate-50 pr-10 text-slate-500 shadow-sm"
                        />
                        <Clock className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── About Me ── */}
              <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  About Me
                </h3>
                <Textarea
                  placeholder="Write a short bio about yourself..."
                  maxLength={ABOUT_MAX}
                  value={aboutMe}
                  onChange={(e) => setAboutMe(e.target.value)}
                  className="min-h-[110px] resize-none rounded-lg border-slate-200 text-sm shadow-sm"
                />
                <p className="mt-2 text-right text-xs text-slate-400">
                  {aboutMe.length} / {ABOUT_MAX} characters
                </p>
              </div>
            </form>
          )}

          {/* ── Security tab ── */}
          {activeTab === 'security' && (
            <>
              {/* Breadcrumb */}
              <div className="mb-5 flex items-center gap-1.5 text-sm text-slate-400">
                <span>Settings</span>
                <ChevronRight className="size-3.5" />
                <span>Security</span>
                <ChevronRight className="size-3.5" />
                <span className="font-semibold text-slate-700">Change Password</span>
              </div>

              <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
                <h3 className="text-2xl font-bold text-slate-900">Change Password</h3>
                <p className="mt-1.5 text-sm text-slate-500">
                  Use a strong password to keep your admin account secure.
                </p>

                {passwordError && <Alert variant="destructive" className="mt-5">{passwordError}</Alert>}
                {passwordSuccess && <Alert variant="success" className="mt-5">{passwordSuccess}</Alert>}

                <form
                  className="mt-8 space-y-6"
                  onSubmit={passwordForm.handleSubmit(onSubmitPassword)}
                  noValidate
                >
                  {/* Current Password */}
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      Current Password
                    </Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="currentPassword"
                        type={showCurrentPw ? 'text' : 'password'}
                        placeholder="Enter current password"
                        autoComplete="current-password"
                        aria-invalid={!!passwordForm.formState.errors.currentPassword}
                        className="h-12 rounded-lg border-slate-200 pl-10 pr-11 shadow-sm"
                        {...passwordForm.register('currentPassword')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPw((v) => !v)}
                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-slate-600"
                      >
                        {showCurrentPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {passwordForm.formState.errors.currentPassword && (
                      <p className="text-xs text-red-500">{passwordForm.formState.errors.currentPassword.message}</p>
                    )}
                  </div>

                  {/* New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      New Password
                    </Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="newPassword"
                        type={showNewPw ? 'text' : 'password'}
                        placeholder="Enter new password"
                        autoComplete="new-password"
                        aria-invalid={!!passwordForm.formState.errors.newPassword}
                        className="h-12 rounded-lg border-slate-200 pl-10 pr-11 shadow-sm"
                        {...passwordForm.register('newPassword')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw((v) => !v)}
                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-slate-600"
                      >
                        {showNewPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">
                      Must be at least 6 characters with 1 number and 1 symbol
                    </p>
                    {passwordForm.formState.errors.newPassword && (
                      <p className="text-xs text-red-500">{passwordForm.formState.errors.newPassword.message}</p>
                    )}
                  </div>

                  {/* Confirm New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      Confirm New Password
                    </Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPw ? 'text' : 'password'}
                        placeholder="Re-type new password"
                        autoComplete="new-password"
                        aria-invalid={!!passwordForm.formState.errors.confirmPassword}
                        className="h-12 rounded-lg border-slate-200 pl-10 pr-11 shadow-sm"
                        {...passwordForm.register('confirmPassword')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPw((v) => !v)}
                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {passwordForm.formState.errors.confirmPassword && (
                      <p className="text-xs text-red-500">{passwordForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>

                  {/* Submit */}
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={passwordForm.formState.isSubmitting}
                      className="h-11 gap-2 rounded-lg bg-orange-500 px-8 text-sm font-semibold text-white shadow-md shadow-orange-200 hover:bg-orange-600"
                    >
                      {passwordForm.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
                      Update Password
                    </Button>
                  </div>
                </form>

              </div>

              {/* Footer info */}
              <p className="mt-6 text-center text-xs text-slate-400">
                Last password change: {profile?.lastLoginAt
                  ? new Date(profile.lastLoginAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'N/A'}
              </p>
            </>
          )}

          {/* ── Sticky footer ── */}
          {activeTab === 'personal' && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Clock className="size-4" />
                Last updated:{' '}
                <span className="font-medium text-slate-600">
                  {profile?.lastLoginAt
                    ? new Date(profile.lastLoginAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })
                    : 'N/A'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" onClick={handleDiscard}>
                  Discard
                </Button>
                <Button
                  type="button"
                  onClick={profileForm.handleSubmit(onSubmitProfile)}
                  disabled={profileForm.formState.isSubmitting}
                  className="gap-2 bg-orange-500 text-white hover:bg-orange-600"
                >
                  {profileForm.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  Save Profile
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Verify Email Dialog ─────────────────────────────────────────── */}
      <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
        <DialogContent>
          <DialogHeader>
            {/* Icon crossfades between the two real states of the flow — not
                decorative, it reflects whether a code has been sent yet. */}
            <div
              key={verifyStep}
              className="animate-scale-in flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              {verifyStep === 'send' ? <Mail className="size-5" /> : <ShieldCheck className="size-5" />}
            </div>
            <DialogTitle>Verify Email</DialogTitle>
            <DialogDescription>
              {verifyStep === 'send' ? (
                <>We&apos;ll send a verification code to <span className="font-medium text-foreground">{profile?.email}</span>.</>
              ) : (
                'Enter the 6-digit verification code sent to your email.'
              )}
            </DialogDescription>
          </DialogHeader>

          {verifyError && <Alert variant="destructive">{verifyError}</Alert>}
          {verifySuccess && <Alert variant="success">{verifySuccess}</Alert>}

          <div key={verifyStep} className="animate-fade-up">
            {verifyStep === 'send' ? (
              <DialogFooter>
                <Button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sendingCode}
                  className="gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  {sendingCode ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                  {sendingCode ? 'Sending...' : 'Send Verification Code'}
                </Button>
              </DialogFooter>
            ) : (
              <form className="space-y-4" onSubmit={verifyForm.handleSubmit(onSubmitVerifyCode)} noValidate>
                <div className="space-y-2">
                  <Label htmlFor="verify-code">Verification Code</Label>
                  <div className="group relative">
                    {isCodeValid ? (
                      <CheckCircle2 className="animate-scale-in pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
                    ) : (
                      <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    )}
                    <Input
                      id="verify-code"
                      maxLength={6}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="123456"
                      className={cn(
                        'h-11 pl-9 text-base tracking-[0.3em] transition-shadow placeholder:tracking-normal',
                        isCodeValid && 'border-primary focus-visible:border-primary focus-visible:ring-primary/20',
                      )}
                      aria-invalid={!!verifyForm.formState.errors.code}
                      {...verifyForm.register('code')}
                      onChange={(e) => {
                        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6)
                        verifyForm.register('code').onChange(e)
                      }}
                    />
                  </div>
                  {verifyForm.formState.errors.code && (
                    <p className="animate-fade-down text-sm text-destructive">{verifyForm.formState.errors.code.message}</p>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendCode}
                    disabled={sendingCode || resendCooldown > 0}
                    className="transition-all hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {sendingCode && <Loader2 className="size-4 animate-spin" />}
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                  </Button>
                  <Button
                    type="submit"
                    disabled={verifyForm.formState.isSubmitting}
                    className="gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {verifyForm.formState.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                    Verify
                  </Button>
                </DialogFooter>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SettingsPage
