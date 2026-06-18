import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/services/api'
import { getErrorMessage } from '@/lib/errors'
import logo from '@/assets/logo.png'

const loginSchema = z.object({
  email: z.string().min(1, 'Please enter your email').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormValues = z.infer<typeof loginSchema>

function LoginPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (values: LoginFormValues) => {
    setApiError(null)

    try {
      const { data } = await api.post('/admin/auth/login', values)

      localStorage.setItem('adminToken', data.data.token)
      localStorage.setItem('adminInfo', JSON.stringify(data.data.admin))

      navigate('/', { replace: true })
    } catch (error) {
      setApiError(getErrorMessage(error, 'Login failed. Please try again.'))
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
              Admin Login
            </h2>
            <p className="font-secondary text-small text-muted-foreground">
              Enter your administrator credentials to access the system.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@busnet.com"
                autoComplete="email"
                aria-invalid={!!errors.email}
                {...register('email')}
              />
              {errors.email && (
                <p className="font-secondary text-small text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="font-secondary text-small text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  className="pr-10"
                  {...register('password')}
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
              {errors.password && (
                <p className="font-secondary text-small text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            {apiError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 font-secondary text-small text-destructive">
                {apiError}
              </div>
            )}

            <Button
              type="submit"
              className="w-full font-primary text-button font-semibold tracking-[0.05em] uppercase"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Sign In
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
