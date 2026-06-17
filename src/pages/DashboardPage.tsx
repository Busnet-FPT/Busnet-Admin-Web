import { useEffect, useState } from 'react'
import type React from 'react'
import {
  Users,
  Building2,
  Flag,
  TrendingUp,
  Mail,
  ShieldCheck,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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

interface PartnerStatusCount {
  status: string
  count: number
}

interface RevenueBreakdownRow {
  type:  string
  count: number
  total: number
}

/* ─── Constants ──────────────────────────────────────────────────────────── */

const EMPTY_STATS: DashboardStats = { users: 0, partners: 0, reports: 0, revenue: 0 }

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  SUPER_ADMIN: 'Super Administrator',
}

type StatCardDef = {
  key: keyof DashboardStats
  label: string
  sub: string
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
  accentBar: string
  format?: (v: number) => string
}

const STAT_CARDS: StatCardDef[] = [
  {
    key: 'users',
    label: 'Total Users',
    sub: 'Registered customers',
    icon: Users,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    accentBar: 'bg-blue-500',
  },
  {
    key: 'partners',
    label: 'Partners',
    sub: 'Bus operators',
    icon: Building2,
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    accentBar: 'bg-violet-500',
  },
  {
    key: 'reports',
    label: 'Reports',
    sub: 'Support tickets',
    icon: Flag,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    accentBar: 'bg-amber-500',
  },
  {
    key: 'revenue',
    label: 'Revenue',
    sub: 'Successful transactions',
    icon: TrendingUp,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    accentBar: 'bg-emerald-500',
    format: formatCurrency,
  },
]

const TX_TYPE_LABELS: Record<string, string> = {
  BOOKING_PAYMENT:      'Booking Payment',
  SUBSCRIPTION_PAYMENT: 'Subscription Payment',
  REFUND:               'Refund',
  OTHER:                'Other',
}

const TX_TYPE_COLORS: Record<string, string> = {
  BOOKING_PAYMENT:      'bg-blue-50 text-blue-700 border-blue-200',
  SUBSCRIPTION_PAYMENT: 'bg-violet-50 text-violet-700 border-violet-200',
  REFUND:               'bg-red-50 text-red-700 border-red-200',
  OTHER:                'bg-slate-100 text-slate-600 border-slate-200',
}

const TX_TYPE_ICON_COLORS: Record<string, string> = {
  BOOKING_PAYMENT:      'bg-blue-500',
  SUBSCRIPTION_PAYMENT: 'bg-violet-500',
  REFUND:               'bg-red-400',
  OTHER:                'bg-slate-400',
}

const PARTNER_STATUS_COLORS: Record<string, string> = {
  ACTIVE:           '#10b981',
  BANNED:           '#ef4444',
  UNVERIFIED:       '#f59e0b',
  PENDING_APPROVAL: '#f59e0b',
  DELETED:          '#94a3b8',
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function getAdminInfo(): AdminInfo | null {
  const raw = localStorage.getItem('adminInfo')
  if (!raw) return null
  try { return JSON.parse(raw) as AdminInfo } catch { return null }
}

/* ─── Skeleton ───────────────────────────────────────────────────────────── */

function StatSkeleton() {
  return <div className="h-9 w-24 animate-pulse-soft rounded-lg bg-slate-100" />
}

function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div
      className="animate-pulse-soft rounded-xl bg-slate-100"
      style={{ height }}
    />
  )
}

/* ─── Custom tooltip ─────────────────────────────────────────────────────── */

function CustomBarTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { value: number; fill: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg text-sm">
      <p className="font-medium text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill }} className="tabular-nums font-semibold">
          {p.value.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

function DashboardPage() {
  const adminInfo = getAdminInfo()

  const [stats,   setStats]   = useState<DashboardStats>(EMPTY_STATS)
  const [loaded,  setLoaded]  = useState(false)

  const [partnerStatuses,       setPartnerStatuses]       = useState<PartnerStatusCount[]>([])
  const [partnerStatusesLoaded, setPartnerStatusesLoaded] = useState(false)

  const [revenueBreakdown,       setRevenueBreakdown]       = useState<RevenueBreakdownRow[]>([])
  const [revenueBreakdownLoaded, setRevenueBreakdownLoaded] = useState(false)

  /* ── Fetch stats ── */
  useEffect(() => {
    let mounted = true
    api
      .get('/admin/dashboard/stats')
      .then(({ data }) => { if (mounted) { setStats(data.data); setLoaded(true) } })
      .catch(() => { if (mounted) { setStats(EMPTY_STATS); setLoaded(true) } })
    return () => { mounted = false }
  }, [])

  /* ── Fetch revenue breakdown ── */
  useEffect(() => {
    let mounted = true
    api
      .get('/admin/dashboard/revenue-breakdown')
      .then(({ data }) => { if (mounted) { setRevenueBreakdown(data.data); setRevenueBreakdownLoaded(true) } })
      .catch(() => { if (mounted) { setRevenueBreakdown([]); setRevenueBreakdownLoaded(true) } })
    return () => { mounted = false }
  }, [])

  /* ── Fetch partner status breakdown ── */
  useEffect(() => {
    let mounted = true
    api
      .get('/admin/partners', { params: { limit: 200 } })
      .then(({ data }) => {
        if (!mounted) return
        const partners: { status: string }[] = data.data?.partners ?? []
        const counts: Record<string, number> = {}
        for (const p of partners) {
          counts[p.status] = (counts[p.status] ?? 0) + 1
        }
        setPartnerStatuses(
          Object.entries(counts).map(([status, count]) => ({ status, count })),
        )
        setPartnerStatusesLoaded(true)
      })
      .catch(() => { if (mounted) { setPartnerStatuses([]); setPartnerStatusesLoaded(true) } })
    return () => { mounted = false }
  }, [])

  /* ── Derived chart data ── */
  const platformBarData = [
    { name: 'Users',    value: stats.users,    fill: '#3b82f6' },
    { name: 'Partners', value: stats.partners,  fill: '#8b5cf6' },
    { name: 'Reports',  value: stats.reports,   fill: '#f59e0b' },
  ]

  const compositionData = [
    { name: 'Customers', value: stats.users,   fill: '#3b82f6' },
    { name: 'Partners',  value: stats.partners, fill: '#8b5cf6' },
  ].filter((d) => d.value > 0)

  /* ─── Render ─────────────────────────────────────────────────────────── */

  return (
    <div className="animate-fade-up space-y-6">

      {/* Page heading */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="mt-1 text-sm text-slate-500">Overview of the BusNet platform</p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map((card, i) => {
          const { key, label, sub, icon: Icon, iconBg, iconColor, accentBar } = card
          const raw       = stats[key]
          const displayed = card.format ? card.format(raw) : raw.toLocaleString()

          return (
            <div
              key={key}
              className="animate-fade-up"
              style={{ animationDelay: `${i * 55}ms`, animationFillMode: 'both' }}
            >
              <Card className="group relative overflow-hidden transition-shadow duration-200 hover:shadow-md">
                <div className={cn('absolute inset-x-0 top-0 h-[3px]', accentBar)} />
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 pt-5">
                  <CardTitle className="text-sm font-medium text-slate-500">{label}</CardTitle>
                  <div className={cn('flex size-9 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110', iconBg)}>
                    <Icon className={cn('size-4', iconColor)} />
                  </div>
                </CardHeader>
                <CardContent className="pb-5">
                  {loaded ? (
                    <p className="text-3xl font-bold tracking-tight">{displayed}</p>
                  ) : (
                    <StatSkeleton />
                  )}
                  <p className="mt-1.5 text-xs text-slate-400">{sub}</p>
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>

      {/* ── Charts row ── */}
      <div
        className="animate-fade-up grid gap-4 lg:grid-cols-3"
        style={{ animationDelay: '240ms', animationFillMode: 'both' }}
      >
        {/* Platform overview bar chart — 2/3 width */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Platform Overview</CardTitle>
            <CardDescription>Total count by entity type</CardDescription>
          </CardHeader>
          <CardContent>
            {loaded ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={platformBarData} barSize={44} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    allowDecimals={false}
                    width={36}
                  />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {platformBarData.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartSkeleton height={220} />
            )}
          </CardContent>
        </Card>

        {/* Platform composition donut — 1/3 width */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Composition</CardTitle>
            <CardDescription>Users vs Partners ratio</CardDescription>
          </CardHeader>
          <CardContent>
            {loaded ? (
              compositionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={compositionData}
                      cx="50%"
                      cy="45%"
                      innerRadius={58}
                      outerRadius={82}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {compositionData.map((d, i) => (
                        <Cell key={i} fill={d.fill} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [Number(value ?? 0).toLocaleString(), '']}
                      contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">
                  No data yet
                </div>
              )
            ) : (
              <ChartSkeleton height={220} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Partner status distribution ── */}
      <div
        className="animate-fade-up grid gap-4 lg:grid-cols-3"
        style={{ animationDelay: '300ms', animationFillMode: 'both' }}
      >
        {/* Partner status donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Partner Status</CardTitle>
            <CardDescription>Distribution across all partners</CardDescription>
          </CardHeader>
          <CardContent>
            {partnerStatusesLoaded ? (
              partnerStatuses.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={190}>
                    <PieChart>
                      <Pie
                        data={partnerStatuses}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={72}
                        paddingAngle={3}
                        dataKey="count"
                        nameKey="status"
                      >
                        {partnerStatuses.map((d, i) => (
                          <Cell key={i} fill={PARTNER_STATUS_COLORS[d.status] ?? '#94a3b8'} strokeWidth={0} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, _name, item) => [
                          Number(value ?? 0),
                          (item.payload as { status: string }).status,
                        ]}
                        contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-1 space-y-1.5">
                    {partnerStatuses.map((d) => (
                      <div key={d.status} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="inline-block size-2 rounded-full"
                            style={{ background: PARTNER_STATUS_COLORS[d.status] ?? '#94a3b8' }}
                          />
                          <span className="text-slate-500">{d.status}</span>
                        </div>
                        <span className="font-semibold tabular-nums text-slate-700">{d.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex h-[190px] items-center justify-center text-sm text-slate-400">
                  No partner data
                </div>
              )
            ) : (
              <ChartSkeleton height={190} />
            )}
          </CardContent>
        </Card>

        {/* Revenue highlight card — 2/3 width */}
        <Card className="lg:col-span-2 flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Revenue Summary</CardTitle>
            <CardDescription>Total from all successful transactions</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-center gap-6">
            <div className="flex items-end gap-3">
              <p className="text-5xl font-bold tracking-tight text-emerald-600">
                {loaded ? formatCurrency(stats.revenue) : <span className="inline-block h-12 w-48 animate-pulse-soft rounded-lg bg-slate-100" />}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Customers',      value: stats.users,    color: 'bg-blue-500',   text: 'text-blue-600'   },
                { label: 'Partners',       value: stats.partners,  color: 'bg-violet-500', text: 'text-violet-600' },
                { label: 'Open Reports',   value: stats.reports,   color: 'bg-amber-500',  text: 'text-amber-600'  },
              ].map(({ label, value, color, text }) => (
                <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className={cn('mb-2 h-1 w-8 rounded-full', color)} />
                  {loaded ? (
                    <p className={cn('text-xl font-bold tabular-nums', text)}>{value.toLocaleString()}</p>
                  ) : (
                    <div className="h-7 w-10 animate-pulse-soft rounded bg-slate-200" />
                  )}
                  <p className="mt-0.5 text-xs text-slate-400">{label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Revenue breakdown table ── */}
      <div
        className="animate-fade-up"
        style={{ animationDelay: '340ms', animationFillMode: 'both' }}
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Revenue Breakdown</CardTitle>
            <CardDescription>Categorized income from successful transactions</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="rounded-tl-xl pl-6 font-semibold text-slate-600">Type</TableHead>
                  <TableHead className="font-semibold text-slate-600">Description</TableHead>
                  <TableHead className="text-center font-semibold text-slate-600">Transactions</TableHead>
                  <TableHead className="pr-6 text-right font-semibold text-slate-600">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!revenueBreakdownLoaded ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-6"><div className="h-5 w-36 animate-pulse-soft rounded bg-slate-100" /></TableCell>
                      <TableCell><div className="h-4 w-48 animate-pulse-soft rounded bg-slate-100" /></TableCell>
                      <TableCell className="text-center"><div className="mx-auto h-4 w-8 animate-pulse-soft rounded bg-slate-100" /></TableCell>
                      <TableCell className="pr-6 text-right"><div className="ml-auto h-4 w-24 animate-pulse-soft rounded bg-slate-100" /></TableCell>
                    </TableRow>
                  ))
                ) : revenueBreakdown.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-slate-400">
                      No successful transaction data available
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {revenueBreakdown.map((row, i) => (
                      <TableRow
                        key={row.type}
                        className="animate-row-in transition-colors hover:bg-slate-50/60"
                        style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}
                      >
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={cn('inline-block size-2.5 rounded-full', TX_TYPE_ICON_COLORS[row.type] ?? 'bg-slate-400')}
                            />
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                                TX_TYPE_COLORS[row.type] ?? 'bg-slate-100 text-slate-600 border-slate-200',
                              )}
                            >
                              {TX_TYPE_LABELS[row.type] ?? row.type}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {row.type === 'BOOKING_PAYMENT'      && 'Revenue from customer ticket bookings'}
                          {row.type === 'SUBSCRIPTION_PAYMENT' && 'Partner subscription plan fees'}
                          {row.type === 'REFUND'               && 'Refunds to customers / partners'}
                          {row.type === 'OTHER'                && 'Other transactions'}
                        </TableCell>
                        <TableCell className="text-center tabular-nums text-slate-600">
                          {row.count.toLocaleString()}
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <span className={cn(
                            'font-semibold tabular-nums',
                            row.type === 'REFUND' ? 'text-red-600' : 'text-emerald-600',
                          )}>
                            {row.type === 'REFUND' ? '−' : '+'}{formatCurrency(row.total)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Total row */}
                    <TableRow className="border-t-2 border-slate-200 bg-slate-50/50">
                      <TableCell className="pl-6 font-semibold text-slate-700" colSpan={2}>
                        Total Revenue
                      </TableCell>
                      <TableCell className="text-center font-semibold tabular-nums text-slate-700">
                        {revenueBreakdown.reduce((s, r) => s + r.count, 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="pr-6 text-right text-lg font-bold tabular-nums text-emerald-600">
                        {formatCurrency(stats.revenue)}
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* ── Admin profile ── */}
      {adminInfo && (
        <div className="animate-fade-up" style={{ animationDelay: '360ms', animationFillMode: 'both' }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Account Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex items-center gap-4">
                  {adminInfo.avatar ? (
                    <img
                      src={adminInfo.avatar}
                      alt={adminInfo.fullName || adminInfo.username}
                      className="size-14 rounded-full object-cover ring-2 ring-slate-100"
                    />
                  ) : (
                    <div className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-xl font-bold text-white shadow-md shadow-blue-200">
                      {(adminInfo.fullName || adminInfo.username || 'A').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-base font-semibold">{adminInfo.fullName || adminInfo.username}</p>
                    <p className="text-sm text-slate-500">@{adminInfo.username}</p>
                  </div>
                </div>

                <div className="grid flex-1 gap-3 sm:grid-cols-2 sm:border-l sm:pl-6">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="size-4 shrink-0 text-slate-400" />
                    {adminInfo.email}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <ShieldCheck className="size-4 shrink-0 text-slate-400" />
                    {ROLE_LABELS[adminInfo.role] ?? adminInfo.role}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">Status:</span>
                    <Badge variant={adminInfo.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {adminInfo.status}
                    </Badge>
                  </div>
                  {adminInfo.lastLoginAt && (
                    <div className="text-sm text-slate-400">
                      Last login:{' '}
                      <span className="text-slate-600">
                        {new Date(adminInfo.lastLoginAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default DashboardPage
