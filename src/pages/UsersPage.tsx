import { useEffect, useState } from 'react'
import { Loader2, Search, Users } from 'lucide-react'
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
  { value: 'ALL',              label: 'All statuses'     },
  { value: 'ACTIVE',           label: 'Active'           },
  { value: 'BANNED',           label: 'Banned'           },
  { value: 'UNVERIFIED',       label: 'Unverified'       },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
]

const BOOKING_COLORS: Record<string, string> = {
  PENDING_PAYMENT:       '#f59e0b',
  CONFIRMED:             '#3b82f6',
  COMPLETED:             '#10b981',
  CANCELLED_BY_CUSTOMER: '#ef4444',
  CANCELLED_BY_OPERATOR: '#f97316',
  NO_SHOW:               '#8b5cf6',
  REFUNDED:              '#94a3b8',
}

const BOOKING_LABELS: Record<string, string> = {
  PENDING_PAYMENT:       'Pending Payment',
  CONFIRMED:             'Confirmed',
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
          <TableCell>
            <div className="flex items-center gap-2.5">
              <Sk className="size-8 rounded-full" />
              <Sk className="h-4 w-28" />
            </div>
          </TableCell>
          <TableCell><Sk className="h-4 w-40" /></TableCell>
          <TableCell><Sk className="h-4 w-24" /></TableCell>
          <TableCell><Sk className="h-5 w-16 rounded-full" /></TableCell>
          <TableCell><Sk className="size-5 rounded-full" /></TableCell>
          <TableCell><Sk className="h-4 w-5" /></TableCell>
          <TableCell><Sk className="h-4 w-36" /></TableCell>
          <TableCell>
            <div className="flex justify-end gap-1.5">
              <Sk className="h-7 w-12 rounded-md" />
              <Sk className="h-7 w-16 rounded-md" />
              <Sk className="h-7 w-14 rounded-md" />
            </div>
          </TableCell>
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
        params: {
          page,
          limit: 10,
          search: debouncedSearch || undefined,
          status: status === 'ALL' ? undefined : status,
        },
      })
      .then(({ data }) => {
        setCustomers(data.data.customers)
        setPagination(data.data.pagination)
      })
      .catch((err) => setListError(getErrorMessage(err, 'Failed to load customers.')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCustomers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, status])

  /* ── Detail ── */
  const openDetail = (id: string) => {
    setSelectedId(id)
    setDetail(null)
    setDetailError(null)
    setDetailLoading(true)

    api
      .get(`/admin/accounts/${id}`)
      .then(({ data }) => setDetail(data.data))
      .catch((err) => setDetailError(getErrorMessage(err, 'Failed to load customer detail.')))
      .finally(() => setDetailLoading(false))
  }

  const refreshAfterAction = () => {
    fetchCustomers()
    if (selectedId) openDetail(selectedId)
  }

  /* ── Ban ── */
  const openBanDialog = (id: string) => {
    setBanTargetId(id)
    setBanType('PERMANENT')
    setBanReason('')
    setBanExpiredAt('')
    setBanError(null)
  }

  const submitBan = async () => {
    if (!banTargetId) return
    setBanSubmitting(true)
    setBanError(null)
    try {
      const { data } = await api.patch(`/admin/accounts/${banTargetId}/status`, {
        status: 'BANNED',
        type: banType,
        reason: banReason || undefined,
        expiredAt: banType === 'TEMPORARY' && banExpiredAt ? banExpiredAt : undefined,
      })
      setActionError(null)
      setActionSuccess(data.message || 'Customer account disabled successfully.')
      setBanTargetId(null)
      refreshAfterAction()
    } catch (err) {
      setBanError(getErrorMessage(err, 'Failed to disable customer account.'))
    } finally {
      setBanSubmitting(false)
    }
  }

  /* ── Unban / Delete confirms ── */
  const openUnbanConfirm = (customer: { _id: string }) => {
    setConfirmError(null)
    setConfirmAction({
      title: 'Enable Customer Account',
      description: 'This will reactivate the customer account and revoke any active bans.',
      confirmLabel: 'Enable',
      onConfirm: async () => {
        const { data } = await api.patch(`/admin/accounts/${customer._id}/status`, { status: 'ACTIVE' })
        setActionSuccess(data.message || 'Customer account enabled successfully.')
        refreshAfterAction()
      },
    })
  }

  const openDeleteConfirm = (customer: { _id: string }) => {
    setConfirmError(null)
    setConfirmAction({
      title: 'Delete Customer',
      description: 'This will soft-delete the customer account. This action can be reversed by support staff only.',
      confirmLabel: 'Delete',
      variant: 'destructive',
      onConfirm: async () => {
        const { data } = await api.delete(`/admin/accounts/${customer._id}`)
        setActionSuccess(data.message || 'Customer deleted successfully.')
        if (selectedId === customer._id) setSelectedId(null)
        fetchCustomers()
      },
    })
  }

  const handleConfirm = async () => {
    if (!confirmAction) return
    setConfirmSubmitting(true)
    setConfirmError(null)
    try {
      await confirmAction.onConfirm()
      setActionError(null)
      setConfirmAction(null)
    } catch (err) {
      const message = getErrorMessage(err, 'Action failed. Please try again.')
      setConfirmError(message)
      setActionError(message)
    } finally {
      setConfirmSubmitting(false)
    }
  }

  /* ─── Render ─────────────────────────────────────────────────────────── */

  return (
    <div className="animate-fade-up space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Customers</h2>
        <p className="mt-1 text-sm text-slate-500">Manage customer accounts and account status.</p>
      </div>

      {/* Alerts */}
      {actionError   && <Alert variant="destructive" onDismiss={() => setActionError(null)}>{actionError}</Alert>}
      {actionSuccess && <Alert variant="success"     onDismiss={() => setActionSuccess(null)}>{actionSuccess}</Alert>}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by name, email, username, phone..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {listError && <Alert variant="destructive">{listError}</Alert>}

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80">
              <TableHead className="rounded-tl-xl font-semibold text-slate-600">Customer</TableHead>
              <TableHead className="font-semibold text-slate-600">Email</TableHead>
              <TableHead className="font-semibold text-slate-600">Phone</TableHead>
              <TableHead className="font-semibold text-slate-600">Status</TableHead>
              <TableHead className="font-semibold text-slate-600">Verified</TableHead>
              <TableHead className="font-semibold text-slate-600">Bans</TableHead>
              <TableHead className="font-semibold text-slate-600">Joined</TableHead>
              <TableHead className="rounded-tr-xl text-right font-semibold text-slate-600">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <CustomerTableSkeleton />
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Users className="size-10 opacity-25" />
                    <p className="font-medium">No customers found</p>
                    <p className="text-xs text-slate-300">Try adjusting your search or filter</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              customers.map((c, i) => {
                const initials = (c.fullName || c.username || '?').charAt(0).toUpperCase()
                return (
                  <TableRow
                    key={c._id}
                    className="animate-row-in transition-colors hover:bg-slate-50/60"
                    style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'both' }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        {c.profilePicture ? (
                          <img src={c.profilePicture} alt={initials} className="size-8 rounded-full object-cover" />
                        ) : (
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-bold text-white">
                            {initials}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-slate-800">{c.fullName || c.username}</p>
                          {c.fullName && <p className="text-xs text-slate-400">@{c.username}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{c.email}</TableCell>
                    <TableCell className="text-sm text-slate-500">{c.phone || '-'}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell>
                      <Badge variant={c.isEmailVerified ? 'default' : 'outline'} className="text-[10px]">
                        {c.isEmailVerified ? 'Verified' : 'Unverified'}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums text-slate-500">{c.banCounts}</TableCell>
                    <TableCell className="text-sm text-slate-400">{formatDate(c.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => openDetail(c._id)}>
                          View
                        </Button>
                        {c.status === 'BANNED' ? (
                          <Button variant="secondary" size="sm" onClick={() => openUnbanConfirm(c)}>
                            Enable
                          </Button>
                        ) : (
                          <Button variant="secondary" size="sm" onClick={() => openBanDialog(c._id)}>
                            Disable
                          </Button>
                        )}
                        <Button variant="destructive" size="sm" onClick={() => openDeleteConfirm(c)}>
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Page {pagination.page} of {Math.max(pagination.totalPages, 1)}{' '}
          <span className="text-slate-300">·</span>{' '}
          {pagination.total} total
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>

      {/* ─── Detail Sheet ─────────────────────────────────────────────────── */}
      <Sheet open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Customer Detail</SheetTitle>
            <SheetDescription>Account info, booking stats, and ban history.</SheetDescription>
          </SheetHeader>

          <div className="space-y-6 px-4 pb-6">
            {detailLoading && (
              <div className="space-y-3 pt-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Sk key={i} className={cn('h-4', i % 3 === 0 ? 'w-1/3' : 'w-2/3')} />
                ))}
              </div>
            )}

            {detailError && <Alert variant="destructive">{detailError}</Alert>}

            {detail && (
              <>
                {/* Account info */}
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Account</h3>
                  <div className="flex items-center gap-3">
                    {detail.customer.profilePicture ? (
                      <img src={detail.customer.profilePicture} alt="" className="size-12 rounded-full object-cover" />
                    ) : (
                      <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-lg font-bold text-white">
                        {(detail.customer.fullName || detail.customer.username || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">{detail.customer.fullName || detail.customer.username}</p>
                      <p className="text-xs text-slate-400">@{detail.customer.username}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <span className="text-slate-400">Email</span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      {detail.customer.email}
                      <Badge variant={detail.customer.isEmailVerified ? 'default' : 'outline'} className="text-[10px]">
                        {detail.customer.isEmailVerified ? 'Verified' : 'Unverified'}
                      </Badge>
                    </span>
                    <span className="text-slate-400">Phone</span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      {detail.customer.phone || '-'}
                      {detail.customer.phone && (
                        <Badge variant={detail.customer.isPhoneVerified ? 'default' : 'outline'} className="text-[10px]">
                          {detail.customer.isPhoneVerified ? 'Verified' : 'Unverified'}
                        </Badge>
                      )}
                    </span>
                    {detail.customer.gender && (
                      <>
                        <span className="text-slate-400">Gender</span>
                        <span>{detail.customer.gender}</span>
                      </>
                    )}
                    {detail.customer.dob && (
                      <>
                        <span className="text-slate-400">Date of birth</span>
                        <span>{formatDate(detail.customer.dob)}</span>
                      </>
                    )}
                    <span className="text-slate-400">Status</span>
                    <span><StatusBadge status={detail.customer.status} /></span>
                    <span className="text-slate-400">Ban count</span>
                    <span>{detail.customer.banCounts}</span>
                    <span className="text-slate-400">Joined</span>
                    <span>{formatDate(detail.customer.createdAt)}</span>
                  </div>
                </section>

                <Separator />

                {/* Booking stats */}
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Booking Statistics</h3>
                  {detail.bookingStats.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={detail.bookingStats.map((s) => ({
                              name:  BOOKING_LABELS[s._id] ?? s._id,
                              value: s.count,
                            }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={82}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {detail.bookingStats.map((s, idx) => (
                              <Cell key={idx} fill={BOOKING_COLORS[s._id] ?? '#94a3b8'} strokeWidth={0} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="grid grid-cols-2 gap-1">
                        {detail.bookingStats.map((s) => (
                          <div key={s._id} className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs">
                            <span className="text-slate-500">{BOOKING_LABELS[s._id] ?? s._id}</span>
                            <span className="font-semibold tabular-nums">{s.count}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-400">No booking data available.</p>
                  )}
                </section>

                <Separator />

                {/* Ban history */}
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ban History (last 5)</h3>
                  {detail.banHistory.length === 0 ? (
                    <p className="text-sm text-slate-400">No ban history.</p>
                  ) : (
                    <div className="overflow-hidden rounded-lg border border-slate-100">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/60">
                            <TableHead className="text-xs">Type</TableHead>
                            <TableHead className="text-xs">Reason</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-xs">Started</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detail.banHistory.map((ban) => (
                            <TableRow key={ban._id}>
                              <TableCell className="text-xs">{ban.type}</TableCell>
                              <TableCell className="max-w-32 whitespace-normal text-xs">{ban.reason || '-'}</TableCell>
                              <TableCell>
                                <StatusBadge status={ban.status} className="text-[10px]" />
                              </TableCell>
                              <TableCell className="text-xs">{formatDate(ban.startedAt)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </section>

                <Separator />

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {detail.customer.status === 'BANNED' ? (
                    <Button variant="secondary" onClick={() => openUnbanConfirm(detail.customer)}>
                      Enable Customer
                    </Button>
                  ) : (
                    <Button variant="secondary" onClick={() => openBanDialog(detail.customer._id)}>
                      Disable Customer
                    </Button>
                  )}
                  <Button variant="destructive" onClick={() => openDeleteConfirm(detail.customer)}>
                    Delete Customer
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── Ban Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={!!banTargetId} onOpenChange={(open) => !open && setBanTargetId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Customer Account</DialogTitle>
            <DialogDescription>
              The customer will be banned and unable to access their account until re-enabled.
            </DialogDescription>
          </DialogHeader>

          {banError && <Alert variant="destructive">{banError}</Alert>}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ban Type</Label>
              <Select value={banType} onValueChange={(v) => setBanType(v as 'TEMPORARY' | 'PERMANENT')}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERMANENT">Permanent</SelectItem>
                  <SelectItem value="TEMPORARY">Temporary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {banType === 'TEMPORARY' && (
              <div className="space-y-2">
                <Label htmlFor="ban-exp">Expires At</Label>
                <input
                  id="ban-exp"
                  type="datetime-local"
                  value={banExpiredAt}
                  onChange={(e) => setBanExpiredAt(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="ban-reason">Reason</Label>
              <Textarea
                id="ban-reason"
                placeholder="Reason for disabling this account (optional)"
                maxLength={500}
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBanTargetId(null)} disabled={banSubmitting}>Cancel</Button>
            <Button variant="destructive" onClick={submitBan} disabled={banSubmitting}>
              {banSubmitting && <Loader2 className="size-4 animate-spin" />}
              Disable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Confirm Dialog ───────────────────────────────────────────────── */}
      <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmAction?.title}</DialogTitle>
            <DialogDescription>{confirmAction?.description}</DialogDescription>
          </DialogHeader>

          {confirmError && <Alert variant="destructive">{confirmError}</Alert>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)} disabled={confirmSubmitting}>Cancel</Button>
            <Button
              variant={confirmAction?.variant === 'destructive' ? 'destructive' : 'default'}
              onClick={handleConfirm}
              disabled={confirmSubmitting}
            >
              {confirmSubmitting && <Loader2 className="size-4 animate-spin" />}
              {confirmAction?.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default UsersPage
