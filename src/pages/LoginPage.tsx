import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  AlertCircle,
  Bus,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogIn,
  Mail,
  MapPin,
  Shield,
  ShieldCheck,
  TicketCheck,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Particles from '@/components/Particles'
import api from '@/services/api'
import { getErrorMessage } from '@/lib/errors'
import logo from '@/assets/logo.png'

const loginSchema = z.object({
  email: z.string().min(1, 'Please enter your email').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const verifyLoginSchema = z.object({
  code: z.string().length(6, 'Code must be exactly 6 digits').regex(/^\d{6}$/, 'Code must contain only digits'),
})

type LoginFormValues = z.infer<typeof loginSchema>
type VerifyLoginFormValues = z.infer<typeof verifyLoginSchema>

function LoginPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  // Set once login() responds with requiresVerification: true (admin was
  // previously locked out and still hasn't verified their email) — switches
  // the form to the post-login code-confirmation step for that address.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [verifyNotice, setVerifyNotice] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const verifyForm = useForm<VerifyLoginFormValues>({ resolver: zodResolver(verifyLoginSchema) })

  const onSubmit = async (values: LoginFormValues) => {
    setApiError(null)

    try {
      const { data } = await api.post('/admin/auth/login', values)

      if (data.data?.requiresVerification) {
        setPendingEmail(data.data.email)
        setVerifyNotice(data.message || 'Please confirm the code sent to your email to finish logging in.')
        // Some browsers auto-fill this new field with the just-typed email
        // (same DOM position as the field it replaced) — force it blank.
        verifyForm.reset({ code: '' })
        return
      }

      localStorage.setItem('adminToken', data.data.token)
      localStorage.setItem('adminInfo', JSON.stringify(data.data.admin))

      navigate('/', { replace: true })
    } catch (error) {
      setApiError(getErrorMessage(error, 'Invalid email or password. Please try again.'))
    }
  }

  const onSubmitVerifyLogin = async (values: VerifyLoginFormValues) => {
    setApiError(null)

    try {
      const { data } = await api.post('/admin/auth/verify-login', { email: pendingEmail, code: values.code })

      localStorage.setItem('adminToken', data.data.token)
      localStorage.setItem('adminInfo', JSON.stringify(data.data.admin))

      navigate('/', { replace: true })
    } catch (error) {
      setApiError(getErrorMessage(error, 'Failed to verify code.'))
    }
  }

  return (
    <div className="flex min-h-screen">

      {/* ── Left brand panel ── */}
      <div className="relative hidden w-[45%] flex-col justify-between overflow-hidden bg-slate-900 p-10 text-white lg:flex">
        {/* Particles background */}
        <div className="absolute inset-0 z-0">
          <Particles
            particleColors={['#3b82f6', '#6366f1', '#8b5cf6', '#60a5fa', '#a5b4fc']}
            particleCount={300}
            particleSpread={10}
            speed={0.05}
            particleBaseSize={150}
            moveParticlesOnHover={true}
            particleHoverFactor={1}
            alphaParticles={false}
            sizeRandomness={1.2}
            cameraDistance={20}
            disableRotation={false}
            pixelRatio={2}
          />
        </div>

        {/* Decorative blobs */}
        <div className="absolute -left-20 -top-20 size-80 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-16 size-96 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 size-64 -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />

        {/* Logo + branding */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-6 flex size-20 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-900/50">
            <img src={logo} alt="BusNet" className="h-11 w-auto" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">BusNet</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.25em] text-blue-400">
            Admin Terminal
          </p>

          <div className="mt-10 max-w-sm">
            <h2 className="text-[1.7rem] font-bold leading-tight">
              Manage Your Network with Confidence
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Monitor operations, oversee partners, and ensure a seamless
              experience for every passenger across our global logistics
              ecosystem.
            </p>
          </div>

          {/* Stat badges */}
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {[
              { icon: Users, label: '500+ Operators' },
              { icon: TicketCheck, label: '2M+ Bookings' },
              { icon: MapPin, label: '120+ Routes' },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 backdrop-blur-sm"
              >
                <Icon className="size-3.5 text-blue-400" />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
          Protected Infrastructure V2.4.1
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex w-full flex-col bg-slate-50 lg:w-[55%]">

        {/* Top bar */}
        <div className="flex items-center justify-end gap-3 px-6 py-4">
          <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500">
            <Bus className="size-3.5" />
            EN
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-400">
            v2.4.1
          </span>
        </div>

        {/* Form */}
        <div className="flex flex-1 items-center justify-center px-6 pb-10">
          <div className="w-full max-w-md">

            {/* Mobile logo */}
            <div className="mb-6 flex justify-center lg:hidden">
              <div className="flex size-14 items-center justify-center rounded-xl bg-blue-600">
                <img src={logo} alt="BusNet" className="h-8 w-auto" />
              </div>
            </div>

            {/* Header */}
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-blue-600 shadow-md shadow-blue-200">
                <Shield className="size-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                {pendingEmail ? 'Confirm Your Identity' : 'Admin Sign In'}
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                {pendingEmail
                  ? `Enter the 6-digit code sent to ${pendingEmail}.`
                  : 'Enter your credentials to access the administration panel.'}
              </p>
            </div>

            {/* API error */}
            {apiError && (
              <div className="mb-5 flex items-center gap-2.5 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
                <AlertCircle className="size-4 shrink-0" />
                {apiError}
              </div>
            )}

            {!apiError && verifyNotice && pendingEmail && (
              <div className="mb-5 flex items-center gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                <ShieldCheck className="size-4 shrink-0" />
                {verifyNotice}
              </div>
            )}

            {pendingEmail ? (
              <form className="space-y-5" onSubmit={verifyForm.handleSubmit(onSubmitVerifyLogin)} noValidate>
                <div className="space-y-2">
                  <label htmlFor="verify-code" className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                    <ShieldCheck className="size-3.5 text-slate-400" />
                    Verification Code
                  </label>
                  <Input
                    id="verify-code"
                    maxLength={6}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    aria-invalid={!!verifyForm.formState.errors.code}
                    className="h-11 rounded-lg border-slate-200 bg-white text-center font-mono text-lg tracking-[0.4em] shadow-sm focus-visible:ring-blue-500"
                    {...verifyForm.register('code')}
                    onChange={(e) => {
                      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6)
                      verifyForm.register('code').onChange(e)
                    }}
                  />
                  {verifyForm.formState.errors.code && (
                    <p className="text-xs text-red-500">{verifyForm.formState.errors.code.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={verifyForm.formState.isSubmitting}
                  className="h-11 w-full gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-400 text-sm font-semibold text-white shadow-md shadow-orange-200 transition-all hover:from-orange-600 hover:to-orange-500 hover:shadow-lg hover:shadow-orange-200"
                >
                  {verifyForm.formState.isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <LogIn className="size-4" />
                  )}
                  Verify &amp; Sign In
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setPendingEmail(null)
                    setVerifyNotice(null)
                    setApiError(null)
                    verifyForm.reset()
                  }}
                  className="w-full text-center text-sm font-medium text-blue-600 hover:underline"
                >
                  Back to login
                </button>
              </form>
            ) : (
            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>

              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="email" className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <Mail className="size-3.5 text-slate-400" />
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@busnet.com"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  className="h-11 rounded-lg border-slate-200 bg-white text-sm shadow-sm focus-visible:ring-blue-500"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label htmlFor="password" className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <Lock className="size-3.5 text-slate-400" />
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••"
                    autoComplete="current-password"
                    aria-invalid={!!errors.password}
                    className="h-11 rounded-lg border-slate-200 bg-white pr-10 text-sm shadow-sm focus-visible:ring-blue-500"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 transition-colors hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500">{errors.password.message}</p>
                )}
              </div>

              {/* Remember + Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" className="size-4 rounded border-slate-300 accent-blue-600" />
                  Remember this device
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Sign In button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 w-full gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-400 text-sm font-semibold text-white shadow-md shadow-orange-200 transition-all hover:from-orange-600 hover:to-orange-500 hover:shadow-lg hover:shadow-orange-200"
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <LogIn className="size-4" />
                )}
                Sign In
              </Button>
            </form>
            )}

            {/* Security notice */}
            <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" />
              <p className="text-[11px] leading-relaxed text-slate-500">
                This is a restricted area. All access attempts are{' '}
                <span className="font-semibold text-slate-700 underline decoration-dotted">logged</span> and{' '}
                <span className="font-semibold text-slate-700 underline decoration-dotted">monitored</span>.
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
