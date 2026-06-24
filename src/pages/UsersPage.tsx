import { useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  Loader2,
  Mail,
  MapPin,
  MoreVertical,
  Phone,
  Search,
  Shield,
  ShieldAlert,
  Star,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from '@/components/ui/status-badge'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import api from '@/services/api'
import { getErrorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import type { CustomerDetail, CustomerListItem, Pagination } from '@/types/admin'

/* ─── Constants ─────────────────────────────────────────────────────────── */

const STATUS_OPTIONS = [
  { value: 'ALL',              label: 'All Statuses'     },
  { value: 'ACTIVE',           label: 'Active'           },
  { value: 'BANNED',           label: 'Suspended'        },
  { value: 'UNVERIFIED',       label: 'Unverified'       },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
]

const BOOKING_COLORS: Record<string, string> = {
  PENDING_PAYMENT:       '#f59e0b',
  CONFIRMED:             '#3b82f6',
  CANCEL_REQUESTED:      '#fb923c',
  COMPLETED:             '#10b981',
  CANCELLED_BY_CUSTOMER: '#ef4444',
  CANCELLED_BY_OPERATOR: '#f97316',
  NO_SHOW:               '#8b5cf6',
  REFUNDED:              '#94a3b8',
}

const BOOKING_LABELS: Record<string, string> = {
  PENDING_PAYMENT:       'Pending Payment',
  CONFIRMED:             'Confirmed',
  CANCEL_REQUESTED:      'Cancel Requested',
  COMPLETED:             'Completed',
  CANCELLED_BY_CUSTOMER: 'Cancelled (Customer)',
  CANCELLED_BY_OPERATOR: 'Cancelled (Operator)',
  NO_SHOW:               'No Show',
  REFUNDED:              'Refunded',
}

type ConfirmAction = {
  title: string
  description: string
  confirmLabel: string
  variant?: 'default' | 'destructive'
  onConfirm: () => Promise<void>
}

const EMPTY_PAGINATION: Pagination = { total: 0, page: 1, limit: 10, totalPages: 1 }

/* ─── Skeleton ───────────────────────────────────────────────────────────── */

function Sk({ className }: { className?: string }) {
  return <div className={cn('animate-pulse-soft rounded bg-slate-100', className)} />
}

function CustomerTableSkeleton() {
  return (
    <>
      {Array.from({ length: 7 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><div className="flex items-center gap-2.5"><Sk className="size-9 rounded-full" /><Sk className="h-4 w-24" /></div></TableCell>
          <TableCell><Sk className="h-4 w-36" /></TableCell>
          <TableCell><Sk className="h-4 w-14" /></TableCell>
          <TableCell><Sk className="h-4 w-20" /></TableCell>
          <TableCell><Sk className="h-5 w-16 rounded-full" /></TableCell>
          <TableCell><Sk className="h-4 w-16" /></TableCell>
        </TableRow>
      ))}
    </>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

function UsersPage() {
  const [customers,  setCustomers]  = useState<CustomerListItem[]>([])
  const [pagination, setPagination] = useState<Pagination>(EMPTY_PAGINATION)
  const [page,       setPage]       = useState(1)
  const [search,     setSearch]     = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status,     setStatus]     = useState('ALL')
  const [loading,    setLoading]    = useState(true)
  const [listError,  setListError]  = useState<string | null>(null)

  const [actionError,   setActionError]   = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const [selectedId,    setSelectedId]    = useState<string | null>(null)
  const [detail,        setDetail]        = useState<CustomerDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError,   setDetailError]   = useState<string | null>(null)

  const [banTargetId,   setBanTargetId]   = useState<string | null>(null)
  const [banType,       setBanType]       = useState<'TEMPORARY' | 'PERMANENT'>('PERMANENT')
  const [banReason,     setBanReason]     = useState('')
  const [banExpiredAt,  setBanExpiredAt]  = useState('')
  const [banSubmitting, setBanSubmitting] = useState(false)
  const [banError,      setBanError]      = useState<string | null>(null)

  const [confirmAction,     setConfirmAction]     = useState<ConfirmAction | null>(null)
  const [confirmSubmitting, setConfirmSubmitting] = useState(false)
  const [confirmError,      setConfirmError]      = useState<string | null>(null)

  /* ── Auto-dismiss ── */
  useEffect(() => {
    if (!actionSuccess) return
    const t = setTimeout(() => setActionSuccess(null), 4500)
    return () => clearTimeout(t)
  }, [actionSuccess])

  /* ── Search debounce ── */
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  /* ── Fetch list ── */
  const fetchCustomers = () => {
    setLoading(true)
    setListError(null)
    api
      .get('/admin/accounts', {
        params: { page, limit: 10, search: debouncedSearch || undefined, status: status === 'ALL' ? undefined : status },
      })
      .then(({ data }) => { setCustomers(data.data.customers); setPagination(data.data.pagination) })
      .catch((err) => setListError(getErrorMessage(err, 'Failed to load customers.')))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchCustomers() }, [page, debouncedSearch, status]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Stats ── */
  const stats = useMemo(() => {
    const active = customers.filter((c) => c.status === 'ACTIVE').length
    const banned = customers.filter((c) => c.status === 'BANNED').length
    return { active, banned }
  }, [customers])

  /* ── Detail ── */
  const openDetail = (id: string) => {
    setSelectedId(id)
    setDetail(null)
    setDetailError(null)
    setDetailLoading(true)
    api.get(`/admin/accounts/${id}`)
      .then(({ data }) => setDetail(data.data))
      .catch((err) => setDetailError(getErrorMessage(err, 'Failed to load customer detail.')))
      .finally(() => setDetailLoading(false))
  }

  const refreshAfterAction = () => { fetchCustomers(); if (selectedId) openDetail(selectedId) }

  /* ── Ban ── */
  const openBanDialog = (id: string) => { setBanTargetId(id); setBanType('PERMANENT'); setBanReason(''); setBanExpiredAt(''); setBanError(null) }

  const submitBan = async () => {
    if (!banTargetId) return
    setBanSubmitting(true); setBanError(null)
    try {
      const { data } = await api.patch(`/admin/accounts/${banTargetId}/status`, {
        status: 'BANNED', type: banType, reason: banReason || undefined,
        expiredAt: banType === 'TEMPORARY' && banExpiredAt ? banExpiredAt : undefined,
      })
      setActionError(null); setActionSuccess(data.message || 'Customer suspended.'); setBanTargetId(null); refreshAfterAction()
    } catch (err) { setBanError(getErrorMessage(err, 'Failed to suspend customer.')) }
    finally { setBanSubmitting(false) }
  }

  /* ── Unban / Delete ── */
  const openUnbanConfirm = (c: { _id: string }) => {
    setConfirmError(null)
    setConfirmAction({ title: 'Enable Customer', description: 'Reactivate this account and revoke bans.', confirmLabel: 'Enable',
      onConfirm: async () => { const { data } = await api.patch(`/admin/accounts/${c._id}/status`, { status: 'ACTIVE' }); setActionSuccess(data.message || 'Enabled.'); refreshAfterAction() },
    })
  }

  const openDeleteConfirm = (c: { _id: string }) => {
    setConfirmError(null)
    setConfirmAction({ title: 'Delete Customer', description: 'Soft-delete this account.', confirmLabel: 'Delete', variant: 'destructive',
      onConfirm: async () => { const { data } = await api.delete(`/admin/accounts/${c._id}`); setActionSuccess(data.message || 'Deleted.'); if (selectedId === c._id) setSelectedId(null); fetchCustomers() },
    })
  }

  const handleConfirm = async () => {
    if (!confirmAction) return
    setConfirmSubmitting(true); setConfirmError(null)
    try { await confirmAction.onConfirm(); setActionError(null); setConfirmAction(null) }
    catch (err) { const m = getErrorMessage(err, 'Action failed.'); setConfirmError(m); setActionError(m) }
    finally { setConfirmSubmitting(false) }
  }

  /* ─── Detail inline view ── */
  if (selectedId) {
    return (
      <div className="animate-fade-up space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-slate-400">
          <button onClick={() => setSelectedId(null)} className="hover:text-blue-600">Customers</button>
          <span>&gt;</span>
          <span className="font-semibold text-slate-700">Customer Detail</span>
        </div>

        {detailLoading && (
          <div className="flex items-center justify-center py-24"><Loader2 className="size-6 animate-spin text-slate-400" /></div>
        )}
        {detailError && <Alert variant="destructive">{detailError}</Alert>}

        {detail && (() => {
          const c = detail.customer
          const initials = (c.fullName || c.username || '?').charAt(0).toUpperCase()
          const totalBookings = detail.bookingStats.reduce((s, b) => s + b.count, 0)

          return (
            <>
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <button onClick={() => setSelectedId(null)} className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">&larr;</button>
                  {c.profilePicture ? (
                    <img src={c.profilePicture} alt="" className="size-16 rounded-2xl object-cover shadow-md" />
                  ) : (
                    <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-xl font-bold text-white shadow-md">{initials}</div>
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{c.fullName || c.username}</h2>
                    <div className="mt-1 flex items-center gap-2 text-sm text-slate-400">
                      <StatusBadge status={c.status} />
                      {c.phone && <><MapPin className="size-3.5" /> <span>{c.phone}</span></>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.status === 'BANNED'
                    ? <Button onClick={() => openUnbanConfirm(c)}>Enable</Button>
                    : <Button variant="outline" onClick={() => openBanDialog(c._id)}>Suspend</Button>
                  }
                  <Button variant="destructive" onClick={() => openDeleteConfirm(c)}>Delete</Button>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                {/* Left: General Info */}
                <div className="space-y-6">
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-5 text-xs font-bold uppercase tracking-widest text-slate-400">General Information</h3>
                    <div className="space-y-4">
                      {[
                        { icon: Mail, label: 'Email Address', value: c.email, badge: c.isEmailVerified ? 'Verified' : 'Unverified', badgeOk: c.isEmailVerified },
                        { icon: Phone, label: 'Phone Number', value: c.phone || '-', badge: c.phone ? (c.isPhoneVerified ? 'Verified' : 'Unverified') : undefined, badgeOk: c.isPhoneVerified },
                        { icon: Calendar, label: 'Member Since', value: new Date(c.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) },
                        { icon: Shield, label: 'Account Status', value: c.status, badge: `${c.banCounts} bans` },
                      ].map(({ icon: Icon, label, value, badge, badgeOk }) => (
                        <div key={label} className="flex items-start gap-3">
                          <Icon className="mt-1 size-4 shrink-0 text-slate-400" />
                          <div className="flex-1">
                            <p className="text-[11px] font-semibold text-slate-400">{label}</p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-slate-800">{value}</span>
                              {badge && (
                                <Badge className={cn('text-[10px]', badgeOk === true ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : badgeOk === false ? 'border-red-200 bg-red-50 text-red-700' : '')}>
                                  {badge}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Booking Stats Chart */}
                  {detail.bookingStats.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Booking History</h3>
                      </div>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={detail.bookingStats.map((s) => ({ name: BOOKING_LABELS[s._id] ?? s._id, value: s.count }))} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                            {detail.bookingStats.map((s, idx) => <Cell key={idx} fill={BOOKING_COLORS[s._id] ?? '#94a3b8'} strokeWidth={0} />)}
                          </Pie>
                          <Tooltip />
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="mt-3 grid grid-cols-2 gap-1.5">
                        {detail.bookingStats.map((s) => (
                          <div key={s._id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-xs">
                            <span className="text-slate-500">{BOOKING_LABELS[s._id] ?? s._id}</span>
                            <span className="font-semibold tabular-nums">{s.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ban History */}
                  {detail.banHistory.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Ban History</h3>
                      <div className="space-y-3">
                        {detail.banHistory.map((ban) => (
                          <div key={ban._id} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                            <div className={cn('mt-1 size-2.5 shrink-0 rounded-full', ban.status === 'ACTIVE' ? 'bg-red-500' : 'bg-slate-300')} />
                            <div className="min-w-0 flex-1 text-sm">
                              <p className="font-medium text-slate-800">{ban.type} &middot; {ban.reason || 'No reason'}</p>
                              <p className="mt-0.5 text-xs text-slate-400">{formatDate(ban.startedAt)}{ban.expiredAt ? ` → ${formatDate(ban.expiredAt)}` : ''}</p>
                            </div>
                            <Badge variant={ban.status === 'ACTIVE' ? 'destructive' : 'outline'} className="shrink-0 text-[10px]">{ban.status}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Stat cards */}
                <div className="space-y-4">
                  {[
                    { label: 'Total Bookings', value: String(totalBookings), sub: 'All time', icon: TrendingUp, iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
                    { label: 'Email Verified', value: c.isEmailVerified ? 'Yes' : 'No', sub: c.email, icon: Mail, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
                    { label: 'Ban Count', value: String(c.banCounts), sub: c.banCounts > 0 ? 'Has violations' : 'Clean record', icon: ShieldAlert, iconBg: 'bg-red-50', iconColor: 'text-red-600' },
                  ].map(({ label, value, sub, icon: Icon, iconBg, iconColor }) => (
                    <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
                      <div className="mt-2 flex items-end justify-between">
                        <div>
                          <p className="text-3xl font-bold tracking-tight text-slate-900">{value}</p>
                          <p className="mt-1 text-xs text-slate-400">{sub}</p>
                        </div>
                        <div className={cn('flex size-10 items-center justify-center rounded-xl', iconBg)}>
                          <Icon className={cn('size-5', iconColor)} />
                        </div>
                      </div>
                    </div>
                  ))}

                  {c.gender && (
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Profile</p>
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-slate-400">Gender</span><span className="font-medium text-slate-700">{c.gender}</span></div>
                        {c.dob && <div className="flex justify-between"><span className="text-slate-400">DOB</span><span className="font-medium text-slate-700">{formatDate(c.dob)}</span></div>}
                        <div className="flex justify-between"><span className="text-slate-400">Username</span><span className="font-medium text-slate-700">@{c.username}</span></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )
        })()}

        {/* Dialogs still needed inside detail view */}
        <Dialog open={!!banTargetId} onOpenChange={(open) => !open && setBanTargetId(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Suspend Customer</DialogTitle><DialogDescription>This customer will be unable to access their account.</DialogDescription></DialogHeader>
            {banError && <Alert variant="destructive">{banError}</Alert>}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Ban Type</Label>
                <Select value={banType} onValueChange={(v) => setBanType(v as 'TEMPORARY' | 'PERMANENT')}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PERMANENT">Permanent</SelectItem><SelectItem value="TEMPORARY">Temporary</SelectItem></SelectContent></Select>
              </div>
              {banType === 'TEMPORARY' && <div className="space-y-2"><Label>Expires At</Label><Input type="datetime-local" value={banExpiredAt} onChange={(e) => setBanExpiredAt(e.target.value)} /></div>}
              <div className="space-y-2"><Label>Reason</Label><Textarea placeholder="Reason (optional)" maxLength={500} value={banReason} onChange={(e) => setBanReason(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBanTargetId(null)} disabled={banSubmitting}>Cancel</Button>
              <Button variant="destructive" onClick={submitBan} disabled={banSubmitting}>{banSubmitting && <Loader2 className="size-4 animate-spin" />}Suspend</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{confirmAction?.title}</DialogTitle><DialogDescription>{confirmAction?.description}</DialogDescription></DialogHeader>
            {confirmError && <Alert variant="destructive">{confirmError}</Alert>}
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmAction(null)} disabled={confirmSubmitting}>Cancel</Button>
              <Button variant={confirmAction?.variant === 'destructive' ? 'destructive' : 'default'} onClick={handleConfirm} disabled={confirmSubmitting}>{confirmSubmitting && <Loader2 className="size-4 animate-spin" />}{confirmAction?.confirmLabel}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  /* ─── List view ─────────────────────────────────────────────────────── */

  return (
    <div className="animate-fade-up space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Manage Customers</h2>
          <p className="mt-1 text-sm text-slate-500">View and manage all registered customer accounts across the BusNet network.</p>
        </div>
      </div>

      {/* Toast */}
      {(actionError || actionSuccess) && (
        <div className="fixed right-6 top-20 z-50 animate-fade-up">
          {actionError   && <Alert variant="destructive" onDismiss={() => setActionError(null)} className="min-w-[320px] shadow-lg">{actionError}</Alert>}
          {actionSuccess && <Alert variant="success"     onDismiss={() => setActionSuccess(null)} className="min-w-[320px] shadow-lg">{actionSuccess}</Alert>}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total Customers', value: pagination.total, sub: 'All registered',   icon: Users,        border: 'border-blue-500',    iconBg: 'bg-blue-50',    iconColor: 'text-blue-600'    },
          { label: 'Active Accounts', value: stats.active,     sub: 'Currently active', icon: CheckCircle2, border: 'border-emerald-500', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
          { label: 'New This Month',  value: '-',              sub: 'Recent signups',   icon: UserPlus,     border: 'border-violet-500',  iconBg: 'bg-violet-50',  iconColor: 'text-violet-600'  },
          { label: 'Suspended',       value: stats.banned,     sub: 'Requires review',  icon: ShieldAlert,  border: 'border-red-500',     iconBg: 'bg-red-50',     iconColor: 'text-red-600'     },
        ].map(({ label, value, sub, icon: Icon, border, iconBg, iconColor }) => (
          <div key={label} className={cn('rounded-xl border-l-4 bg-white p-5 shadow-sm', border)}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
                <p className="mt-1 text-xs text-slate-400">{sub}</p>
              </div>
              <div className={cn('flex size-10 items-center justify-center rounded-lg', iconBg)}>
                <Icon className={cn('size-5', iconColor)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 space-y-1.5" style={{ minWidth: 200 }}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Search Customers</p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input placeholder="Search name, email, phone..." className="h-10 pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5" style={{ minWidth: 160 }}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Status</p>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
              <SelectTrigger className="h-10 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button onClick={() => fetchCustomers()} className="h-10 gap-2 bg-orange-500 text-white hover:bg-orange-600">
            <Filter className="size-4" />Apply Filter
          </Button>
        </div>
      </div>

      {listError && <Alert variant="destructive">{listError}</Alert>}

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-800 hover:bg-slate-800">
              <TableHead className="rounded-tl-xl text-[11px] font-bold uppercase tracking-wider text-slate-300">Customer</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Contact Info</TableHead>
              <TableHead className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-300">Bans</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Joined Date</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Status</TableHead>
              <TableHead className="rounded-tr-xl text-center text-[11px] font-bold uppercase tracking-wider text-slate-300">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <CustomerTableSkeleton /> : customers.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-16 text-center"><div className="flex flex-col items-center gap-2 text-slate-400"><Users className="size-10 opacity-25" /><p className="font-medium">No customers found</p></div></TableCell></TableRow>
            ) : customers.map((c, i) => {
              const initials = (c.fullName || c.username || '?').charAt(0).toUpperCase()
              return (
                <TableRow key={c._id} className="animate-row-in transition-colors hover:bg-slate-50/60" style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'both' }}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {c.profilePicture
                        ? <img src={c.profilePicture} alt="" className="size-9 rounded-full object-cover" />
                        : <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-bold text-white">{initials}</div>
                      }
                      <div>
                        <p className="font-semibold text-slate-800">{c.fullName || c.username}</p>
                        <p className="text-[11px] text-slate-400">ID: {c._id.slice(-6).toUpperCase()}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-slate-600">{c.email}</p>
                    <p className="text-[11px] text-slate-400">{c.phone || '-'}</p>
                  </TableCell>
                  <TableCell className="text-center tabular-nums font-medium text-slate-700">{c.banCounts}</TableCell>
                  <TableCell className="text-sm text-slate-600">{new Date(c.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => openDetail(c._id)} className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-blue-600" title="View"><Eye className="size-4" /></button>
                      <button onClick={() => openDetail(c._id)} className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="More"><MoreVertical className="size-4" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-slate-400">
          Showing {customers.length > 0 ? (page - 1) * pagination.limit + 1 : 0} - {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} customers
        </p>
        <div className="flex items-center gap-1">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="flex size-9 items-center justify-center rounded-lg text-sm text-slate-400 hover:bg-slate-100 disabled:opacity-30">&lt;</button>
          {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)} className={cn('flex size-9 items-center justify-center rounded-lg text-sm font-medium', page === p ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100')}>{p}</button>
          ))}
          {pagination.totalPages > 5 && <><span className="px-1 text-slate-400">...</span><button onClick={() => setPage(pagination.totalPages)} className={cn('flex size-9 items-center justify-center rounded-lg text-sm font-medium', page === pagination.totalPages ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100')}>{pagination.totalPages}</button></>}
          <button disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)} className="flex size-9 items-center justify-center rounded-lg text-sm text-slate-400 hover:bg-slate-100 disabled:opacity-30">&gt;</button>
        </div>
      </div>

      {/* ─── Ban Dialog ── */}
      <Dialog open={!!banTargetId} onOpenChange={(open) => !open && setBanTargetId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Suspend Customer</DialogTitle><DialogDescription>This customer will be unable to access their account.</DialogDescription></DialogHeader>
          {banError && <Alert variant="destructive">{banError}</Alert>}
          <div className="space-y-4">
            <div className="space-y-2"><Label>Ban Type</Label><Select value={banType} onValueChange={(v) => setBanType(v as 'TEMPORARY' | 'PERMANENT')}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PERMANENT">Permanent</SelectItem><SelectItem value="TEMPORARY">Temporary</SelectItem></SelectContent></Select></div>
            {banType === 'TEMPORARY' && <div className="space-y-2"><Label>Expires At</Label><Input type="datetime-local" value={banExpiredAt} onChange={(e) => setBanExpiredAt(e.target.value)} /></div>}
            <div className="space-y-2"><Label>Reason</Label><Textarea placeholder="Reason (optional)" maxLength={500} value={banReason} onChange={(e) => setBanReason(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanTargetId(null)} disabled={banSubmitting}>Cancel</Button>
            <Button variant="destructive" onClick={submitBan} disabled={banSubmitting}>{banSubmitting && <Loader2 className="size-4 animate-spin" />}Suspend</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Confirm Dialog ── */}
      <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{confirmAction?.title}</DialogTitle><DialogDescription>{confirmAction?.description}</DialogDescription></DialogHeader>
          {confirmError && <Alert variant="destructive">{confirmError}</Alert>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)} disabled={confirmSubmitting}>Cancel</Button>
            <Button variant={confirmAction?.variant === 'destructive' ? 'destructive' : 'default'} onClick={handleConfirm} disabled={confirmSubmitting}>{confirmSubmitting && <Loader2 className="size-4 animate-spin" />}{confirmAction?.confirmLabel}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default UsersPage
