import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import api from '@/services/api'
import { getErrorMessage } from '@/lib/errors'
import logo from '@/assets/logo.png'

const emailSchema = z.object({
  email: z.string().min(1, 'Please enter your email').email('Invalid email address'),
})

const resetSchema = z
  .object({
    code: z.string().min(1, 'Please enter the verification code'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type EmailFormValues = z.infer<typeof emailSchema>
type ResetFormValues = z.infer<typeof resetSchema>

function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'email' | 'reset'>('email')
  const [email, setEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
  })

  const resetForm = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
  })

  const onSubmitEmail = async (values: EmailFormValues) => {
    setApiError(null)
    setSuccessMessage(null)

    try {
      const { data } = await api.post('/admin/auth/forgot-password', values)
      setEmail(values.email)
      setSuccessMessage(data.message || 'A verification code has been sent to your email.')
      setStep('reset')
    } catch (error) {
      setApiError(getErrorMessage(error, 'Failed to send verification code. Please try again.'))
    }
  }

  const onSubmitReset = async (values: ResetFormValues) => {
    setApiError(null)
    setSuccessMessage(null)

    try {
      const { data } = await api.post('/admin/auth/reset-password', {
        email,
        code: values.code,
        newPassword: values.newPassword,
      })

      setSuccessMessage(data.message || 'Password reset successfully. Please sign in again.')

      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 1500)
    } catch (error) {
      setApiError(getErrorMessage(error, 'Failed to reset password. Please try again.'))
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:w-1/2">
        <div className="absolute -right-24 -top-24 size-72 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-white/10" />

        <div className="relative z-10 inline-flex w-fit rounded-2xl bg-white p-4 shadow-sm">
          <img src={logo} alt="BusNet" className="h-16 w-auto" />
        </div>

        <div className="relative z-10 max-w-md space-y-4">
          <h1 className="font-primary text-display font-bold leading-tight">
            BusNet Admin Console
          </h1>
          <p className="font-secondary text-body leading-relaxed text-primary-foreground/80">
            Manage users, partners, reports, and every operation of the
            BusNet bus ticketing platform.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2 font-secondary text-small text-primary-foreground/70">
          <ShieldCheck className="size-4" />
          Restricted area for system administrators
        </div>
      </div>

      {/* Form panel */}
      <div className="flex w-full items-center justify-center bg-background p-6 sm:p-12 lg:w-1/2">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <div className="lg:hidden">
              <img src={logo} alt="BusNet" className="h-14 w-auto" />
            </div>
            <h2 className="font-primary text-h2 font-bold leading-heading">
              Forgot Password
            </h2>
            <p className="font-secondary text-small text-muted-foreground">
              {step === 'email'
                ? 'Enter your email address and we will send you a verification code.'
                : `Enter the verification code sent to ${email} and choose a new password.`}
            </p>
          </div>

          {successMessage && <Alert variant="success">{successMessage}</Alert>}
          {apiError && <Alert variant="destructive">{apiError}</Alert>}

          {step === 'email' ? (
            <form
              className="space-y-5"
              onSubmit={emailForm.handleSubmit(onSubmitEmail)}
              noValidate
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@busnet.com"
                  autoComplete="email"
                  aria-invalid={!!emailForm.formState.errors.email}
                  {...emailForm.register('email')}
                />
                {emailForm.formState.errors.email && (
                  <p className="font-secondary text-small text-destructive">
                    {emailForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full font-primary text-button font-semibold tracking-[0.05em] uppercase"
                disabled={emailForm.formState.isSubmitting}
              >
                {emailForm.formState.isSubmitting && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Send Verification Code
              </Button>
            </form>
          ) : (
            <form
              className="space-y-5"
              onSubmit={resetForm.handleSubmit(onSubmitReset)}
              noValidate
            >
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Enter the code from your email"
                  aria-invalid={!!resetForm.formState.errors.code}
                  {...resetForm.register('code')}
                />
                {resetForm.formState.errors.code && (
                  <p className="font-secondary text-small text-destructive">
                    {resetForm.formState.errors.code.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="pr-10"
                    aria-invalid={!!resetForm.formState.errors.newPassword}
                    {...resetForm.register('newPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {resetForm.formState.errors.newPassword && (
                  <p className="font-secondary text-small text-destructive">
                    {resetForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="pr-10"
                    aria-invalid={!!resetForm.formState.errors.confirmPassword}
                    {...resetForm.register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                {resetForm.formState.errors.confirmPassword && (
                  <p className="font-secondary text-small text-destructive">
                    {resetForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full font-primary text-button font-semibold tracking-[0.05em] uppercase"
                disabled={resetForm.formState.isSubmitting}
              >
                {resetForm.formState.isSubmitting && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Reset Password
              </Button>

              <button
                type="button"
                onClick={() => {
                  setStep('email')
                  setApiError(null)
                  setSuccessMessage(null)
                  emailForm.reset()
                }}
                className="font-secondary text-small text-muted-foreground hover:text-foreground"
              >
                Use a different email
              </button>
            </form>
          )}

          <Link
            to="/login"
            className="flex items-center gap-2 font-secondary text-small text-primary hover:underline"
          >
            <ArrowLeft className="size-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
