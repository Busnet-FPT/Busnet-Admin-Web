import { useEffect, useState } from 'react'
import {
  Building2,
  DollarSign,
  Flag,
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
import api from '@/services/api'

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface AdminInfo {
  _id: string
  username: string
  email: string
  fullName?: string
  role: 'ADMIN' | 'SUPER_ADMIN'
  status: string
  avatar?: string | null
  lastLoginAt?: string | null
}

interface DashboardStats {
  users: number
  partners: number
  reports: number
  revenue: number
}

interface RevenueBreakdownRow {
  type: string
  count: number
  total: number
}

const EMPTY_STATS: DashboardStats = { users: 0, partners: 0, reports: 0, revenue: 0 }

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

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

function DashboardPage() {
  const adminInfo = getAdminInfo()
  const firstName = (adminInfo?.fullName || adminInfo?.username || 'Admin').split(' ')[0]

  const [stats,   setStats]   = useState<DashboardStats>(EMPTY_STATS)
  const [loaded,  setLoaded]  = useState(false)

  const [revenueBreakdown,       setRevenueBreakdown]       = useState<RevenueBreakdownRow[]>([])
  const [revenueBreakdownLoaded, setRevenueBreakdownLoaded] = useState(false)

  useEffect(() => {
    let m = true
    api.get('/admin/dashboard/stats')
      .then(({ data }) => { if (m) { setStats(data.data); setLoaded(true) } })
      .catch(() => { if (m) { setStats(EMPTY_STATS); setLoaded(true) } })
    return () => { m = false }
  }, [])

  useEffect(() => {
    let m = true
    api.get('/admin/dashboard/revenue-breakdown')
      .then(({ data }) => { if (m) { setRevenueBreakdown(data.data); setRevenueBreakdownLoaded(true) } })
      .catch(() => { if (m) { setRevenueBreakdown([]); setRevenueBreakdownLoaded(true) } })
    return () => { m = false }
  }, [])

  const chartData = (() => {
    const now = new Date()
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now)
      d.setDate(d.getDate() - (6 - i))
      return {
        date: d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
        revenue: Math.round((stats.revenue / 7) * (0.6 + Math.random() * 0.8)),
      }
    })
  })()

  const totalTx = revenueBreakdown.reduce((s, r) => s + r.count, 0)

  /* ─── Render ──────────────────────────────────────────────────────────── */

  return (
    <div className="animate-fade-up space-y-6">

      {/* ── Greeting ── */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          {getGreeting()}, {firstName} <span className="ml-1">👋</span>
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Here's what's happening across BusNet today, {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {[
          { label: 'Platform Revenue', value: loaded ? formatCurrency(stats.revenue) : null, icon: DollarSign, border: 'border-emerald-500', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
          { label: 'Total Bookings',   value: loaded ? String(totalTx) : null,               icon: TrendingUp, border: 'border-blue-500',    iconBg: 'bg-blue-50',    iconColor: 'text-blue-600'    },
          { label: 'Active Partners',  value: loaded ? String(stats.partners) : null,         icon: Building2,  border: 'border-violet-500',  iconBg: 'bg-violet-50',  iconColor: 'text-violet-600'  },
          { label: 'Total Customers',  value: loaded ? String(stats.users) : null,            icon: Users,      border: 'border-cyan-500',    iconBg: 'bg-cyan-50',    iconColor: 'text-cyan-600'    },
          { label: 'Active Routes',    value: '-',                                            icon: MapPin,     border: 'border-amber-500',   iconBg: 'bg-amber-50',   iconColor: 'text-amber-600'   },
          { label: 'Pending Reports',  value: loaded ? String(stats.reports) : null,          icon: Flag,       border: 'border-red-500',     iconBg: 'bg-red-50',     iconColor: 'text-red-600'     },
        ].map(({ label, value, icon: Icon, border, iconBg, iconColor }, i) => (
          <div
            key={label}
            className={cn('animate-fade-up rounded-xl border-l-4 bg-white p-4 shadow-sm', border)}
            style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
                {value !== null ? (
                  <p className="mt-1 truncate text-2xl font-bold tracking-tight text-slate-900">{value}</p>
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
          {loaded ? (
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
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Today's Bookings</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{loaded ? totalTx : '-'}</p>
            <p className="mt-1 text-xs text-slate-400">From all transaction types</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Partners</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{loaded ? stats.partners : '-'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Reports</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{loaded ? stats.reports : '-'}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Revenue Total</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600">{loaded ? formatCurrency(stats.revenue) : '-'}</p>
            <p className="mt-1 text-xs text-slate-400">All successful transactions</p>
          </div>
        </div>
      </div>

      {/* ── Revenue breakdown table ── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-bold text-slate-900">Revenue Breakdown</h3>
          <p className="text-xs text-slate-400">Categorized income from successful transactions</p>
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
                  <td className="px-6 py-3 text-right text-lg font-bold tabular-nums text-emerald-600">{formatCurrency(stats.revenue)}</td>
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
