import * as React from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const ALERT_CONFIG = {
  default: {
    container: 'border-border bg-muted text-foreground',
    icon: Info,
    iconClass: 'text-foreground/60',
  },
  success: {
    container: 'border-green-500/25 bg-green-50 text-green-800',
    icon: CheckCircle2,
    iconClass: 'text-green-600',
  },
  destructive: {
    container: 'border-destructive/30 bg-destructive/8 text-destructive',
    icon: AlertCircle,
    iconClass: 'text-destructive',
  },
} as const

function Alert({
  className,
  variant = 'default',
  onDismiss,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  variant?: keyof typeof ALERT_CONFIG
  onDismiss?: () => void
}) {
  const { container, icon: Icon, iconClass } = ALERT_CONFIG[variant]

  return (
    <div
      role="alert"
      data-slot="alert"
      className={cn(
        'animate-fade-down flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
        container,
        className,
      )}
      {...props}
    >
      <Icon className={cn('mt-px size-4 shrink-0', iconClass)} />
      <div className="flex-1 leading-relaxed">{children}</div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="ml-1 shrink-0 opacity-50 transition-opacity hover:opacity-100"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}

export { Alert }
