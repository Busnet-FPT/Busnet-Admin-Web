import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Mail, ShieldCheck, UserCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import api from '@/services/api'
import { getErrorMessage } from '@/lib/errors'
import type { AdminProfile } from '@/types/admin'

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
  code: z.string().min(1, 'Please enter the verification code'),
})

type ProfileFormValues = z.infer<typeof profileSchema>
type PasswordFormValues = z.infer<typeof passwordSchema>
type VerifyCodeFormValues = z.infer<typeof verifyCodeSchema>

const ROLE_LABELS: Record<AdminProfile['role'], string> = {
  ADMIN: 'Administrator',
  SUPER_ADMIN: 'Super Administrator',
}

function SettingsPage() {
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)

  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)

  const [verifyOpen, setVerifyOpen] = useState(false)
  const [verifyStep, setVerifyStep] = useState<'send' | 'code'>('send')
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null)
  const [sendingCode, setSendingCode] = useState(false)

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  })

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  })

  const verifyForm = useForm<VerifyCodeFormValues>({
    resolver: zodResolver(verifyCodeSchema),
  })

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
    return () => {
      URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const onSubmitProfile = async (values: ProfileFormValues) => {
    setProfileError(null)
    setProfileSuccess(null)

    try {
      let payload: FormData | ProfileFormValues = values

      if (avatarFile) {
        const formData = new FormData()
        formData.append('fullName', values.fullName)
        formData.append('username', values.username)
        formData.append('avatar', avatarFile)
        payload = formData
      }

      const { data } = await api.patch('/admin/profile', payload)
      persistAdminInfo(data.data)
      profileForm.reset({
        fullName: data.data.fullName || '',
        username: data.data.username,
      })
      setAvatarFile(null)
      setAvatarPreview(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setProfileSuccess(data.message || 'Profile updated successfully.')
    } catch (error) {
      setProfileError(getErrorMessage(error, 'Failed to update profile.'))
    }
  }

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

  const openVerifyDialog = () => {
    setVerifyOpen(true)
    setVerifyStep('send')
    setVerifyError(null)
    setVerifySuccess(null)
    verifyForm.reset()
  }

  const handleSendCode = async () => {
    setSendingCode(true)
    setVerifyError(null)
    setVerifySuccess(null)

    try {
      const { data } = await api.post('/admin/auth/send-verify-email')
      setVerifySuccess(data.message || 'Verification code sent to your email.')
      setVerifyStep('code')
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
      setTimeout(() => {
        setVerifyOpen(false)
      }, 1000)
    } catch (error) {
      setVerifyError(getErrorMessage(error, 'Failed to verify email.'))
    }
  }

  const avatarSrc = avatarPreview || profile?.avatar || null

  return (
    <div className="animate-fade-up space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Account Settings</h2>
        <p className="text-slate-500">Manage your admin account information and security.</p>
      </div>

      {profileLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading account information...
        </div>
      ) : (
        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  Update your display name, username, and avatar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {profileError && <Alert variant="destructive">{profileError}</Alert>}
                {profileSuccess && <Alert variant="success">{profileSuccess}</Alert>}

                <div className="flex items-center gap-4">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={profile?.fullName || profile?.username}
                      className="size-16 rounded-full object-cover"
                    />
                  ) : (
                    <UserCircle className="size-16 text-slate-300" />
                  )}
                  <div className="space-y-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Change Avatar
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                    {avatarFile && (
                      <p className="text-xs text-muted-foreground">{avatarFile.name}</p>
                    )}
                  </div>
                </div>

                <form
                  className="space-y-4"
                  onSubmit={profileForm.handleSubmit(onSubmitProfile)}
                  noValidate
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        aria-invalid={!!profileForm.formState.errors.fullName}
                        {...profileForm.register('fullName')}
                      />
                      {profileForm.formState.errors.fullName && (
                        <p className="text-sm text-destructive">
                          {profileForm.formState.errors.fullName.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        aria-invalid={!!profileForm.formState.errors.username}
                        {...profileForm.register('username')}
                      />
                      {profileForm.formState.errors.username && (
                        <p className="text-sm text-destructive">
                          {profileForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
                        <Mail className="size-4" />
                        {profile?.email}
                      </div>
                      {profile?.isEmailVerified ? (
                        <Badge variant="default">Verified</Badge>
                      ) : (
                        <>
                          <Badge variant="destructive">Not verified</Badge>
                          <Button type="button" variant="outline" size="sm" onClick={openVerifyDialog}>
                            Verify Email
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <ShieldCheck className="size-4 text-slate-400" />
                      {profile && ROLE_LABELS[profile.role]}
                    </div>
                    {profile && (
                      <Badge variant={profile.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {profile.status}
                      </Badge>
                    )}
                  </div>

                  <Button type="submit" disabled={profileForm.formState.isSubmitting}>
                    {profileForm.formState.isSubmitting && (
                      <Loader2 className="size-4 animate-spin" />
                    )}
                    Save Changes
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {passwordError && <Alert variant="destructive">{passwordError}</Alert>}
                {passwordSuccess && <Alert variant="success">{passwordSuccess}</Alert>}

                <form
                  className="max-w-sm space-y-4"
                  onSubmit={passwordForm.handleSubmit(onSubmitPassword)}
                  noValidate
                >
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      autoComplete="current-password"
                      aria-invalid={!!passwordForm.formState.errors.currentPassword}
                      {...passwordForm.register('currentPassword')}
                    />
                    {passwordForm.formState.errors.currentPassword && (
                      <p className="text-sm text-destructive">
                        {passwordForm.formState.errors.currentPassword.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      autoComplete="new-password"
                      aria-invalid={!!passwordForm.formState.errors.newPassword}
                      {...passwordForm.register('newPassword')}
                    />
                    {passwordForm.formState.errors.newPassword && (
                      <p className="text-sm text-destructive">
                        {passwordForm.formState.errors.newPassword.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      aria-invalid={!!passwordForm.formState.errors.confirmPassword}
                      {...passwordForm.register('confirmPassword')}
                    />
                    {passwordForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-destructive">
                        {passwordForm.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                    {passwordForm.formState.isSubmitting && (
                      <Loader2 className="size-4 animate-spin" />
                    )}
                    Change Password
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Email</DialogTitle>
            <DialogDescription>
              {verifyStep === 'send'
                ? 'We will send a verification code to your email address.'
                : 'Enter the 6-digit verification code sent to your email.'}
            </DialogDescription>
          </DialogHeader>

          {verifyError && <Alert variant="destructive">{verifyError}</Alert>}
          {verifySuccess && <Alert variant="success">{verifySuccess}</Alert>}

          {verifyStep === 'send' ? (
            <DialogFooter>
              <Button type="button" onClick={handleSendCode} disabled={sendingCode}>
                {sendingCode && <Loader2 className="size-4 animate-spin" />}
                Send Verification Code
              </Button>
            </DialogFooter>
          ) : (
            <form
              className="space-y-4"
              onSubmit={verifyForm.handleSubmit(onSubmitVerifyCode)}
              noValidate
            >
              <div className="space-y-2">
                <Label htmlFor="verify-code">Verification Code</Label>
                <Input
                  id="verify-code"
                  maxLength={6}
                  aria-invalid={!!verifyForm.formState.errors.code}
                  {...verifyForm.register('code')}
                />
                {verifyForm.formState.errors.code && (
                  <p className="text-sm text-destructive">
                    {verifyForm.formState.errors.code.message}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleSendCode} disabled={sendingCode}>
                  {sendingCode && <Loader2 className="size-4 animate-spin" />}
                  Resend Code
                </Button>
                <Button type="submit" disabled={verifyForm.formState.isSubmitting}>
                  {verifyForm.formState.isSubmitting && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  Verify
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SettingsPage
