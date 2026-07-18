import { useEffect, useState } from 'react'
import axios from 'axios'
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  Flag,
  Loader2,
  MapPin,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { getErrorMessage } from '@/lib/errors'
import api from '@/services/api'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface AdminInfo {
  _id: string
  username: string
  email: string
  fullName?: string
  role: 'ADMIN'
  status: string
  avatar?: string | null
  lastLoginAt?: string | null
}

interface StatMetric {
  value: number
  // % change vs. 30 days ago; null when there's no baseline to compare against
  change: number | null
}

interface DashboardStats {
  users: StatMetric
  partners: StatMetric
  reports: StatMetric
  revenue: StatMetric
  activeRoutes: StatMetric
  totalBookings: StatMetric
}

interface RevenueBreakdownRow {
  type: string
  count: number
  total: number
}

interface RevenueChartPoint {
  date: string
  label: string
  revenue: number
}

const RANGE_OPTIONS = [
  { value: '7d',  label: 'Last 7 days',   unit: 'day',   amount: 7,  trendLabel: '7d'  },
  { value: '30d', label: 'Last 30 days',  unit: 'day',   amount: 30, trendLabel: '30d' },
  { value: '3m',  label: 'Last 3 months', unit: 'month', amount: 3,  trendLabel: '3mo' },
  { value: '6m',  label: 'Last 6 months', unit: 'month', amount: 6,  trendLabel: '6mo' },
  { value: '12m', label: 'Last 12 months', unit: 'month', amount: 12, trendLabel: '12mo' },
] as const

type RangeValue = (typeof RANGE_OPTIONS)[number]['value']

const EMPTY_METRIC: StatMetric = { value: 0, change: null }
const EMPTY_STATS: DashboardStats = {
  users: EMPTY_METRIC,
  partners: EMPTY_METRIC,
  reports: EMPTY_METRIC,
  revenue: EMPTY_METRIC,
  activeRoutes: EMPTY_METRIC,
  totalBookings: EMPTY_METRIC,
}

const TX_TYPE_LABELS: Record<string, string> = {
  BOOKING_PAYMENT:      'Booking Payment',
  SUBSCRIPTION_PAYMENT: 'Subscription',
  REFUND:               'Refund',
  OTHER:                'Other',
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function getAdminInfo(): AdminInfo | null {
  const raw = localStorage.getItem('adminInfo')
  if (!raw) return null
  try { return JSON.parse(raw) as AdminInfo } catch { return null }
}

function Sk({ className }: { className?: string }) {
  return <div className={cn('animate-pulse-soft rounded-lg bg-slate-100', className)} />
}

function TrendBadge({ change, periodLabel }: { change: number | null; periodLabel: string }) {
  if (change === null) {
    return <span className="text-[11px] font-semibold text-slate-400">New</span>
  }
  if (change === 0) {
    return <span className="text-[11px] font-semibold text-slate-400">0% vs last {periodLabel}</span>
  }
  const isUp = change > 0
  const Icon = isUp ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={cn('inline-flex items-center gap-0.5 text-[11px] font-semibold', isUp ? 'text-emerald-600' : 'text-red-600')}
      title={`vs. the previous ${periodLabel}`}
    >
      <Icon className="size-3" />
      {Math.abs(change)}% vs last {periodLabel}
    </span>
  )
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

// With responseType: 'blob', a JSON error body still arrives as a Blob, so
// the message has to be read out of it manually before falling back.
async function resolveExportErrorMessage(error: unknown): Promise<string> {
  if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
    try {
      const text = await error.response.data.text()
      const parsed = JSON.parse(text) as { message?: string }
      if (parsed.message) return parsed.message
    } catch {
      // not JSON — fall through to the generic message below
    }
  }
  return getErrorMessage(error, 'Failed to export statistics.')
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

function DashboardPage() {
  const adminInfo = getAdminInfo()
  const firstName = (adminInfo?.fullName || adminInfo?.username || 'Admin').split(' ')[0]

  const [stats,   setStats]   = useState<DashboardStats>(EMPTY_STATS)
  const [loaded,  setLoaded]  = useState(false)

  const [revenueBreakdown,       setRevenueBreakdown]       = useState<RevenueBreakdownRow[]>([])
  const [revenueBreakdownLoaded, setRevenueBreakdownLoaded] = useState(false)

  const [revenueChart,       setRevenueChart]       = useState<RevenueChartPoint[]>([])
  const [revenueChartLoaded, setRevenueChartLoaded] = useState(false)
  const [range, setRange] = useState<RangeValue>('7d')

  const [exportingFormat, setExportingFormat] = useState<'xlsx' | 'pdf' | null>(null)
  const [exportError,     setExportError]     = useState<string | null>(null)

  useEffect(() => {
    const { unit, amount } = RANGE_OPTIONS.find((o) => o.value === range)!
    let m = true
    setLoaded(false)
    api.get('/admin/dashboard/stats', { params: { unit, amount } })
      .then(({ data }) => { if (m) { setStats(data.data); setLoaded(true) } })
      .catch(() => { if (m) { setStats(EMPTY_STATS); setLoaded(true) } })
    return () => { m = false }
  }, [range])

  useEffect(() => {
    const { unit, amount } = RANGE_OPTIONS.find((o) => o.value === range)!
    let m = true
    setRevenueBreakdownLoaded(false)
    api.get('/admin/dashboard/revenue-breakdown', { params: { unit, amount } })
      .then(({ data }) => { if (m) { setRevenueBreakdown(data.data); setRevenueBreakdownLoaded(true) } })
      .catch(() => { if (m) { setRevenueBreakdown([]); setRevenueBreakdownLoaded(true) } })
    return () => { m = false }
  }, [range])

  useEffect(() => {
    const { unit, amount } = RANGE_OPTIONS.find((o) => o.value === range)!
    let m = true
    setRevenueChartLoaded(false)
    api.get('/admin/dashboard/revenue-chart', { params: { unit, amount } })
      .then(({ data }) => { if (m) { setRevenueChart(data.data); setRevenueChartLoaded(true) } })
      .catch(() => { if (m) { setRevenueChart([]); setRevenueChartLoaded(true) } })
    return () => { m = false }
  }, [range])

  async function handleExport(format: 'xlsx' | 'pdf') {
    const { unit, amount } = RANGE_OPTIONS.find((o) => o.value === range)!
    setExportingFormat(format)
    setExportError(null)
    try {
      const response = await api.get('/admin/dashboard/export', {
        params: { format, unit, amount },
        responseType: 'blob',
      })
      const disposition = response.headers['content-disposition'] as string | undefined
      const filename = disposition?.match(/filename="?([^"]+)"?/)?.[1] || `busnet-statistics.${format}`

      const url = URL.createObjectURL(response.data as Blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setExportError(await resolveExportErrorMessage(err))
    } finally {
      setExportingFormat(null)
    }
  }

  const chartData = revenueChart.map((point) => ({
    date: point.label,
    revenue: point.revenue,
  }))

  const currentRangeOption = RANGE_OPTIONS.find((o) => o.value === range)!

  /* ─── Render ──────────────────────────────────────────────────────────── */

  return (
    <div className="animate-fade-up space-y-6">

      {/* ── Toast ── */}
      {exportError && (
        <div className="fixed right-6 top-20 z-50 animate-fade-up">
          <Alert variant="destructive" onDismiss={() => setExportError(null)} className="min-w-[320px] shadow-lg">
            {exportError}
          </Alert>
        </div>
      )}

      {/* ── Greeting + period selector ── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {getGreeting()}, {firstName} <span className="ml-1">👋</span>
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Here's what's happening across BusNet today, {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={(v) => setRange(v as RangeValue)}>
            <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9" disabled={exportingFormat !== null}>
                {exportingFormat ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('xlsx')} disabled={exportingFormat !== null}>
                <FileSpreadsheet className="size-4" /> Export as Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')} disabled={exportingFormat !== null}>
                <FileText className="size-4" /> Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Stat cards — every figure is "new in the selected period", not an all-time total ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {[
          { label: 'Platform Revenue', value: loaded ? formatCurrency(stats.revenue.value) : null,       change: stats.revenue.change,       icon: DollarSign, border: 'border-emerald-500', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
          { label: 'Total Bookings',   value: loaded ? String(stats.totalBookings.value) : null,          change: stats.totalBookings.change, icon: TrendingUp, border: 'border-blue-500',    iconBg: 'bg-blue-50',    iconColor: 'text-blue-600'    },
          { label: 'New Partners',     value: loaded ? String(stats.partners.value) : null,                change: stats.partners.change,      icon: Building2,  border: 'border-violet-500',  iconBg: 'bg-violet-50',  iconColor: 'text-violet-600'  },
          { label: 'New Customers',    value: loaded ? String(stats.users.value) : null,                   change: stats.users.change,         icon: Users,      border: 'border-cyan-500',    iconBg: 'bg-cyan-50',    iconColor: 'text-cyan-600'    },
          { label: 'New Routes',       value: loaded ? String(stats.activeRoutes.value) : null,            change: stats.activeRoutes.change,  icon: MapPin,     border: 'border-amber-500',   iconBg: 'bg-amber-50',   iconColor: 'text-amber-600'   },
          { label: 'New Reports',      value: loaded ? String(stats.reports.value) : null,                 change: stats.reports.change,       icon: Flag,       border: 'border-red-500',     iconBg: 'bg-red-50',     iconColor: 'text-red-600'     },
        ].map(({ label, value, change, icon: Icon, border, iconBg, iconColor }, i) => (
          <div
            key={label}
            className={cn('animate-fade-up rounded-xl border-l-4 bg-white p-4 shadow-sm', border)}
            style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
                {value !== null ? (
                  <>
                    <p className="mt-1 truncate text-2xl font-bold tracking-tight text-slate-900">{value}</p>
                    <div className="mt-1"><TrendBadge change={change} periodLabel={currentRangeOption.trendLabel} /></div>
                  </>
                ) : (
                  <Sk className="mt-2 h-7 w-20" />
                )}
              </div>
              <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', iconBg)}>
                <Icon className={cn('size-4', iconColor)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Revenue chart + Today's stats ── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Revenue Overview</h3>
              <p className="text-xs text-slate-400">Aggregate performance from all platform partners.</p>
            </div>
          </div>
          {revenueChartLoaded ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} width={50} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid #e2e8f0' }} formatter={(v) => [formatCurrency(Number(v)), 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} fill="url(#revGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <Sk className="h-[240px]" />
          )}
        </div>

        {/* Right stats */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Bookings ({currentRangeOption.label})</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{loaded ? stats.totalBookings.value : '-'}</p>
            <p className="mt-1 text-xs text-slate-400">From all transaction types</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">New Partners</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{loaded ? stats.partners.value : '-'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">New Reports</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{loaded ? stats.reports.value : '-'}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Revenue ({currentRangeOption.label})</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600">{loaded ? formatCurrency(stats.revenue.value) : '-'}</p>
            <p className="mt-1 text-xs text-slate-400">All successful transactions</p>
          </div>
        </div>
      </div>

      {/* ── Revenue breakdown table ── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-bold text-slate-900">Revenue Breakdown</h3>
          <p className="text-xs text-slate-400">Categorized income from successful transactions — {currentRangeOption.label}</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Type</th>
              <th className="px-6 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">Transactions</th>
              <th className="px-6 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Total</th>
            </tr>
          </thead>
          <tbody>
            {!revenueBreakdownLoaded ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td className="px-6 py-3"><Sk className="h-4 w-32" /></td>
                  <td className="px-6 py-3 text-center"><Sk className="mx-auto h-4 w-8" /></td>
                  <td className="px-6 py-3 text-right"><Sk className="ml-auto h-4 w-24" /></td>
                </tr>
              ))
            ) : revenueBreakdown.length === 0 ? (
              <tr><td colSpan={3} className="px-6 py-10 text-center text-slate-400">No transaction data</td></tr>
            ) : (
              <>
                {revenueBreakdown.map((row) => (
                  <tr key={row.type} className="border-b border-slate-50 transition-colors hover:bg-slate-50/60">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className={cn(
                          'size-2.5 rounded-full',
                          row.type === 'BOOKING_PAYMENT' ? 'bg-blue-500' : row.type === 'SUBSCRIPTION_PAYMENT' ? 'bg-violet-500' : row.type === 'REFUND' ? 'bg-red-400' : 'bg-slate-400',
                        )} />
                        <span className="font-medium text-slate-700">{TX_TYPE_LABELS[row.type] ?? row.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center tabular-nums text-slate-600">{row.count.toLocaleString()}</td>
                    <td className="px-6 py-3 text-right">
                      <span className={cn('font-semibold tabular-nums', row.type === 'REFUND' ? 'text-red-600' : 'text-emerald-600')}>
                        {row.type === 'REFUND' ? '−' : '+'}{formatCurrency(row.total)}
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50/50">
                  <td className="px-6 py-3 font-semibold text-slate-700">Total</td>
                  <td className="px-6 py-3 text-center font-semibold tabular-nums text-slate-700">{revenueBreakdown.reduce((s, r) => s + r.count, 0).toLocaleString()}</td>
                  <td className="px-6 py-3 text-right text-lg font-bold tabular-nums text-emerald-600">{formatCurrency(stats.revenue.value)}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DashboardPage
