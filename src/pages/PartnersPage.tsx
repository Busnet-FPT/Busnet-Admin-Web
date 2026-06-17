import { useEffect, useState } from 'react'
import { Building2, Search, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/lib/format'
import { StatusBadge } from '@/components/ui/status-badge'
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
import { Loader2 } from 'lucide-react'
import api from '@/services/api'
import { getErrorMessage } from '@/lib/errors'
import type { PartnerDetail, PartnerListItem, Pagination } from '@/types/admin'

/* ─── Constants ─────────────────────────────────────────────────────────── */

const STATUS_OPTIONS = [
  { value: 'ALL',              label: 'All statuses'     },
  { value: 'ACTIVE',           label: 'Active'           },
  { value: 'BANNED',           label: 'Banned'           },
  { value: 'UNVERIFIED',       label: 'Unverified'       },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
]

const EMPTY_PAGINATION: Pagination = { total: 0, page: 1, limit: 10, totalPages: 1 }

type ConfirmAction = {
  title: string
  description: string
  confirmLabel: string
  variant?: 'default' | 'destructive'
  onConfirm: () => Promise<void>
}

/* ─── Skeleton ───────────────────────────────────────────────────────────── */

function Sk({ className }: { className?: string }) {
  return <div className={cn('animate-pulse-soft rounded bg-slate-100', className)} />
}

function PartnerTableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Sk className="h-4 w-28" /></TableCell>
          <TableCell>
            <Sk className="mb-1.5 h-3.5 w-32" />
            <Sk className="h-3 w-40" />
          </TableCell>
          <TableCell><Sk className="h-4 w-24" /></TableCell>
          <TableCell><Sk className="h-5 w-16 rounded-full" /></TableCell>
          <TableCell><Sk className="h-4 w-5" /></TableCell>
          <TableCell><Sk className="h-4 w-36" /></TableCell>
          <TableCell>
            <div className="flex justify-end gap-2">
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

function PartnersPage() {
  const [partners,   setPartners]   = useState<PartnerListItem[]>([])
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
  const [detail,        setDetail]        = useState<PartnerDetail | null>(null)
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

  /* ── Auto-dismiss success alert ── */
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
  const fetchPartners = () => {
    setLoading(true)
    setListError(null)

    api
      .get('/admin/partners', {
        params: {
          page,
          limit: 10,
          search: debouncedSearch || undefined,
          status: status === 'ALL' ? undefined : status,
        },
      })
      .then(({ data }) => {
        setPartners(data.data.partners)
        setPagination(data.data.pagination)
      })
      .catch((error) => {
        setListError(getErrorMessage(error, 'Failed to load partners.'))
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPartners()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, status])

  /* ── Detail ── */
  const openDetail = (id: string) => {
    setSelectedId(id)
    setDetail(null)
    setDetailError(null)
    setDetailLoading(true)

    api
      .get(`/admin/partners/${id}`)
      .then(({ data }) => setDetail(data.data))
      .catch((error) => setDetailError(getErrorMessage(error, 'Failed to load partner detail.')))
      .finally(() => setDetailLoading(false))
  }

  const refreshAfterAction = () => {
    fetchPartners()
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
      const { data } = await api.patch(`/admin/partners/${banTargetId}/status`, {
        status: 'BANNED',
        type: banType,
        reason: banReason || undefined,
        expiredAt: banType === 'TEMPORARY' && banExpiredAt ? banExpiredAt : undefined,
      })
      setActionError(null)
      setActionSuccess(data.message || 'Partner account disabled successfully.')
      setBanTargetId(null)
      refreshAfterAction()
    } catch (error) {
      setBanError(getErrorMessage(error, 'Failed to disable partner account.'))
    } finally {
      setBanSubmitting(false)
    }
  }

  /* ── Unban / Delete confirms ── */
  const openUnbanConfirm = (partner: { _id: string }) => {
    setConfirmError(null)
    setConfirmAction({
      title: 'Enable Partner Account',
      description: 'This will reactivate the partner account and revoke any active bans.',
      confirmLabel: 'Enable',
      onConfirm: async () => {
        const { data } = await api.patch(`/admin/partners/${partner._id}/status`, { status: 'ACTIVE' })
        setActionSuccess(data.message || 'Partner account enabled successfully.')
        refreshAfterAction()
      },
    })
  }

  const openDeleteConfirm = (partner: { _id: string }) => {
    setConfirmError(null)
    setConfirmAction({
      title: 'Delete Partner',
      description: 'This will soft-delete the partner account. This action can be reversed by support staff only.',
      confirmLabel: 'Delete',
      variant: 'destructive',
      onConfirm: async () => {
        const { data } = await api.delete(`/admin/partners/${partner._id}`)
        setActionSuccess(data.message || 'Partner deleted successfully.')
        if (selectedId === partner._id) setSelectedId(null)
        fetchPartners()
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
    } catch (error) {
      const message = getErrorMessage(error, 'Action failed. Please try again.')
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
        <h2 className="text-2xl font-bold tracking-tight">Partners</h2>
        <p className="mt-1 text-sm text-slate-500">Manage bus operators and partner account status.</p>
      </div>

      {/* Action alerts */}
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
              <TableHead className="rounded-tl-xl font-semibold text-slate-600">Operator</TableHead>
              <TableHead className="font-semibold text-slate-600">Account</TableHead>
              <TableHead className="font-semibold text-slate-600">Phone</TableHead>
              <TableHead className="font-semibold text-slate-600">Status</TableHead>
              <TableHead className="font-semibold text-slate-600">Bans</TableHead>
              <TableHead className="font-semibold text-slate-600">Created At</TableHead>
              <TableHead className="rounded-tr-xl text-right font-semibold text-slate-600">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <PartnerTableSkeleton />
            ) : partners.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Building2 className="size-10 opacity-25" />
                    <p className="font-medium">No partners found</p>
                    <p className="text-xs text-slate-300">Try adjusting your search or filter</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              partners.map((partner, i) => (
                <TableRow
                  key={partner._id}
                  className="animate-row-in transition-colors hover:bg-slate-50/60"
                  style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'both' }}
                >
                  <TableCell className="font-medium text-slate-800">
                    {partner.partnerInformation?.operatorName || partner.fullName || partner.username}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{partner.username}</p>
                    <p className="text-xs text-slate-400">{partner.email}</p>
                  </TableCell>
                  <TableCell className="text-slate-600">{partner.phone || '-'}</TableCell>
                  <TableCell>
                    <StatusBadge status={partner.status} />
                  </TableCell>
                  <TableCell className="tabular-nums text-slate-600">{partner.banCounts}</TableCell>
                  <TableCell className="text-slate-500">{formatDate(partner.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => openDetail(partner._id)}>
                        View
                      </Button>
                      {partner.status === 'BANNED' ? (
                        <Button variant="secondary" size="sm" onClick={() => openUnbanConfirm(partner)}>
                          Enable
                        </Button>
                      ) : (
                        <Button variant="secondary" size="sm" onClick={() => openBanDialog(partner._id)}>
                          Disable
                        </Button>
                      )}
                      <Button variant="destructive" size="sm" onClick={() => openDeleteConfirm(partner)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
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
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
          >
            Next
          </Button>
        </div>
      </div>

      {/* ─── Detail Sheet ─────────────────────────────────────────────────── */}
      <Sheet open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Partner Detail</SheetTitle>
            <SheetDescription>Account, business information, subscription, and ban history.</SheetDescription>
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
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Account</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <span className="text-slate-400">Username</span>     <span>{detail.partner.username}</span>
                    <span className="text-slate-400">Full name</span>    <span>{detail.partner.fullName || '-'}</span>
                    <span className="text-slate-400">Email</span>
                    <span className="flex items-center gap-1.5 flex-wrap">
                      {detail.partner.email}
                      <Badge variant={detail.partner.isEmailVerified ? 'default' : 'outline'} className="text-[10px]">
                        {detail.partner.isEmailVerified ? 'Verified' : 'Unverified'}
                      </Badge>
                    </span>
                    <span className="text-slate-400">Phone</span>
                    <span className="flex items-center gap-1.5 flex-wrap">
                      {detail.partner.phone || '-'}
                      {detail.partner.phone && (
                        <Badge variant={detail.partner.isPhoneVerified ? 'default' : 'outline'} className="text-[10px]">
                          {detail.partner.isPhoneVerified ? 'Verified' : 'Unverified'}
                        </Badge>
                      )}
                    </span>
                    <span className="text-slate-400">Status</span>
                    <span><StatusBadge status={detail.partner.status} /></span>
                    <span className="text-slate-400">Ban count</span>    <span>{detail.partner.banCounts}</span>
                    <span className="text-slate-400">Created at</span>   <span>{formatDate(detail.partner.createdAt)}</span>
                  </div>
                </section>

                <Separator />

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Business Information</h3>
                  {detail.partnerInformation ? (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <span className="text-slate-400">Operator name</span>  <span>{detail.partnerInformation.operatorName}</span>
                      <span className="text-slate-400">Operator phone</span> <span>{detail.partnerInformation.operatorPhone || '-'}</span>
                      <span className="col-span-2 text-slate-400">Description</span>
                      <span className="col-span-2 text-slate-600">{detail.partnerInformation.description || '-'}</span>
                      <span className="text-slate-400">Bank</span>
                      <span>
                        {detail.partnerInformation.bankName
                          ? `${detail.partnerInformation.bankName} – ${detail.partnerInformation.bankAccountName ?? ''} – ${detail.partnerInformation.bankNumber ?? ''}`
                          : '-'}
                      </span>
                      <span className="text-slate-400">Tax code</span>       <span>{detail.partnerInformation.taxCode || '-'}</span>
                      <span className="text-slate-400">Business license</span>
                      <span>
                        {detail.partnerInformation.businessLicense ? (
                          <a href={detail.partnerInformation.businessLicense} target="_blank" rel="noreferrer" className="text-primary underline">
                            View document
                          </a>
                        ) : '-'}
                      </span>
                      <span className="text-slate-400">Verified</span>
                      <span>
                        <Badge variant={detail.partnerInformation.isVerified ? 'default' : 'outline'}>
                          {detail.partnerInformation.isVerified ? 'Verified' : 'Not verified'}
                        </Badge>
                      </span>
                      <span className="text-slate-400">Rating</span>
                      <span className="flex items-center gap-1">
                        <Star className="size-3.5 fill-amber-400 text-amber-400" />
                        {detail.partnerInformation.ratingAvg.toFixed(1)} ({detail.partnerInformation.totalReviews})
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">No business information submitted.</p>
                  )}
                </section>

                <Separator />

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Subscription</h3>
                  {detail.subscription?.planId ? (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <span className="text-slate-400">Plan</span>
                      <span>{detail.subscription.planId.planName} ({detail.subscription.planId.code})</span>
                      <span className="text-slate-400">Price</span>
                      <span>{formatCurrency(detail.subscription.planId.price)}</span>
                      <span className="text-slate-400">Duration</span>
                      <span>{detail.subscription.planId.durationDays} days</span>
                      <span className="text-slate-400">Status</span>
                      <span><Badge variant="outline">{detail.subscription.subscriptionStatus}</Badge></span>
                      <span className="text-slate-400">Subscribed at</span>  <span>{formatDate(detail.subscription.subscriptionDate)}</span>
                      <span className="text-slate-400">Expires at</span>     <span>{formatDate(detail.subscription.expirationDate)}</span>
                      <span className="text-slate-400">Auto-renew</span>     <span>{detail.subscription.autoRenew ? 'Yes' : 'No'}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">No active subscription.</p>
                  )}
                </section>

                <Separator />

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
                            <TableHead className="text-xs">Expires</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detail.banHistory.map((ban) => (
                            <TableRow key={ban._id}>
                              <TableCell className="text-xs">{ban.type}</TableCell>
                              <TableCell className="max-w-32 whitespace-normal text-xs">{ban.reason || '-'}</TableCell>
                              <TableCell>
                                <Badge variant={ban.status === 'ACTIVE' ? 'destructive' : 'outline'} className="text-[10px]">
                                  {ban.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs">{formatDate(ban.startedAt)}</TableCell>
                              <TableCell className="text-xs">{formatDate(ban.expiredAt)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </section>

                <Separator />

                <div className="flex flex-wrap gap-2 pt-1">
                  {detail.partner.status === 'BANNED' ? (
                    <Button variant="secondary" onClick={() => openUnbanConfirm(detail.partner)}>
                      Enable Partner
                    </Button>
                  ) : (
                    <Button variant="secondary" onClick={() => openBanDialog(detail.partner._id)}>
                      Disable Partner
                    </Button>
                  )}
                  <Button variant="destructive" onClick={() => openDeleteConfirm(detail.partner)}>
                    Delete Partner
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
            <DialogTitle>Disable Partner Account</DialogTitle>
            <DialogDescription>
              The partner will be banned and unable to access their account until re-enabled.
            </DialogDescription>
          </DialogHeader>

          {banError && <Alert variant="destructive">{banError}</Alert>}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ban Type</Label>
              <Select value={banType} onValueChange={(v) => setBanType(v as 'TEMPORARY' | 'PERMANENT')}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERMANENT">Permanent</SelectItem>
                  <SelectItem value="TEMPORARY">Temporary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {banType === 'TEMPORARY' && (
              <div className="space-y-2">
                <Label htmlFor="ban-expired-at">Expires At</Label>
                <Input
                  id="ban-expired-at"
                  type="datetime-local"
                  value={banExpiredAt}
                  onChange={(e) => setBanExpiredAt(e.target.value)}
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
            <Button variant="outline" onClick={() => setBanTargetId(null)} disabled={banSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={submitBan} disabled={banSubmitting}>
              {banSubmitting && <Loader2 className="size-4 animate-spin" />}
              Disable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Generic Confirm Dialog ───────────────────────────────────────── */}
      <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmAction?.title}</DialogTitle>
            <DialogDescription>{confirmAction?.description}</DialogDescription>
          </DialogHeader>

          {confirmError && <Alert variant="destructive">{confirmError}</Alert>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)} disabled={confirmSubmitting}>
              Cancel
            </Button>
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

export default PartnersPage
