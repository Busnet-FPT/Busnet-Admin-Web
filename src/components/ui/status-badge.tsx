import { cn } from '@/lib/utils'

const STYLES: Record<string, string> = {
  ACTIVE:           'bg-emerald-50 text-emerald-700 border-emerald-200',
  BANNED:           'bg-red-50    text-red-700    border-red-200',
  DISABLED:         'bg-red-50    text-red-700    border-red-200',
  PENDING:          'bg-amber-50  text-amber-700  border-amber-200',
  IN_REVIEW:        'bg-amber-50  text-amber-700  border-amber-200',
  UNVERIFIED:       'bg-amber-50  text-amber-700  border-amber-200',
  PENDING_APPROVAL: 'bg-amber-50  text-amber-700  border-amber-200',
  DELETED:          'bg-slate-100 text-slate-500  border-slate-200',
  DISMISSED:        'bg-slate-100 text-slate-500  border-slate-200',
  REJECTED:         'bg-red-50    text-red-700    border-red-200',
  INACTIVE:         'bg-slate-100 text-slate-500  border-slate-200',
  RESOLVED:         'bg-blue-50   text-blue-700   border-blue-200',
}

const DEFAULT_STYLE = 'bg-slate-100 text-slate-500 border-slate-200'

function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        STYLES[status] ?? DEFAULT_STYLE,
        className,
      )}
    >
      {status}
    </span>
  )
}

export { StatusBadge }
