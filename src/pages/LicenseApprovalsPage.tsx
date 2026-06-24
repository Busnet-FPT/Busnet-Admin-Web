import { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  Clock,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Loader2,
  Search,
  XCircle,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
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
import api from '@/services/api'
import { getErrorMessage } from '@/lib/errors'
import type { PendingRegistrationListItem, Pagination } from '@/types/admin'

/* ─── Constants ─────────────────────────────────────────────────────────── */

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending Review' },
  { value: 'REJECTED', label: 'Rejected' },
]

const EMPTY_PAGINATION: Pagination = { total: 0, page: 1, limit: 10, totalPages: 1 }

/* ─── Helper Functions ─────────────────────────────────────────────────── */

const isImageFile = (url?: string | null) => {
  if (!url) return false
  const ext = url.split('.').pop()?.toLowerCase()
  return ext ? ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) : false
}

/* ─── Skeleton ───────────────────────────────────────────────────────────── */

function Sk({ className }: { className?: string }) {
  return <div className={cn('animate-pulse-soft rounded bg-slate-100', className)} />
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Sk className="h-4 w-28" /></TableCell>
          <TableCell><Sk className="h-4 w-36" /></TableCell>
          <TableCell><Sk className="h-4 w-20" /></TableCell>
          <TableCell><Sk className="h-4 w-24" /></TableCell>
          <TableCell><Sk className="h-5 w-16 rounded-full" /></TableCell>
          <TableCell>
            <div className="flex justify-center">
              <Sk className="h-7 w-8 rounded-md" />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

/* ─── Main Page Component ────────────────────────────────────────────────── */

function LicenseApprovalsPage() {
  const [registrations, setRegistrations] = useState<PendingRegistrationListItem[]>([])
  const [pagination, setPagination] = useState<Pagination>(EMPTY_PAGINATION)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  // Success & Error Toasts
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Selected Detail Modal state
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<PendingRegistrationListItem | null>(null)
  const [isRejecting, setIsRejecting] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

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

  /* ── Fetch List ── */
  const fetchRegistrations = () => {
    setLoading(true)
    setListError(null)

    api
      .get('/admin/partners/pending-registrations', {
        params: {
          page,
          limit: 10,
          search: debouncedSearch || undefined,
          status: status === 'ALL' ? undefined : status,
        },
      })
      .then(({ data }) => {
        setRegistrations(data.data.registrations)
        setPagination(data.data.pagination)
      })
      .catch((error) => {
        setListError(getErrorMessage(error, 'Failed to load pending registrations.'))
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchRegistrations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, status])

  /* ── Stats computation ── */
  const stats = useMemo(() => {
    const pending = registrations.filter((r) => r.licenseStatus === 'PENDING').length
    const rejected = registrations.filter((r) => r.licenseStatus === 'REJECTED').length
    return { pending, rejected }
  }, [registrations])

  /* ── Modal Open handler ── */
  const openDetail = (item: PendingRegistrationListItem) => {
    setDetail(item)
    setSelectedId(item._id)
    setIsRejecting(false)
    setRejectionReason('')
    setReviewError(null)
  }

  const closeDetail = () => {
    setSelectedId(null)
    setDetail(null)
    setIsRejecting(false)
    setRejectionReason('')
    setReviewError(null)
  }

  /* ── Review Submission ── */
  const submitReview = async (reviewStatus: 'APPROVED' | 'REJECTED') => {
    if (!detail) return
    if (reviewStatus === 'REJECTED' && !rejectionReason.trim()) {
      setReviewError('Please provide a rejection reason.')
      return
    }

    setReviewSubmitting(true)
    setReviewError(null)

    try {
      const { data } = await api.patch(`/admin/partners/pending-registrations/${detail._id}/review`, {
        status: reviewStatus,
        rejectionReason: reviewStatus === 'REJECTED' ? rejectionReason.trim() : undefined,
      })

      setActionError(null)
      setActionSuccess(data.message || `Registration successfully ${reviewStatus.toLowerCase()}.`)
      closeDetail()
      fetchRegistrations()
    } catch (error) {
      setReviewError(getErrorMessage(error, 'Failed to submit license review.'))
    } finally {
      setReviewSubmitting(false)
    }
  }

  return (
    <div className="animate-fade-up space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">License Approvals</h2>
          <p className="mt-1 text-sm text-slate-500">
            Review and approve business licenses submitted by newly registering bus operator partners.
          </p>
        </div>
      </div>

      {/* Toast Alerts */}
      {(actionError || actionSuccess) && (
        <div className="fixed right-6 top-20 z-50 animate-fade-up">
          {actionError && (
            <Alert variant="destructive" onDismiss={() => setActionError(null)} className="min-w-[320px] shadow-lg">
              {actionError}
            </Alert>
          )}
          {actionSuccess && (
            <Alert variant="success" onDismiss={() => setActionSuccess(null)} className="min-w-[320px] shadow-lg">
              {actionSuccess}
            </Alert>
          )}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            label: 'Total Pending Review',
            value: String(pagination.total),
            sub: 'Awaiting administrator action',
            icon: Clock,
            border: 'border-amber-500',
            iconBg: 'bg-amber-50',
            iconColor: 'text-amber-600',
          },
          {
            label: 'Pending License',
            value: String(stats.pending),
            sub: 'Submitted, not yet processed',
            icon: FileText,
            border: 'border-blue-500',
            iconBg: 'bg-blue-50',
            iconColor: 'text-blue-600',
          },
          {
            label: 'Rejected Registrations',
            value: String(stats.rejected),
            sub: 'Requires partner corrections',
            icon: XCircle,
            border: 'border-red-500',
            iconBg: 'bg-red-50',
            iconColor: 'text-red-600',
          },
        ].map(({ label, value, sub, icon: Icon, border, iconBg, iconColor }) => (
          <div key={label} className={cn('rounded-xl border-l-4 bg-white p-5 shadow-sm border', border)}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
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

      {/* Filter Options */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 space-y-1.5" style={{ minWidth: 220 }}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Search Operator</p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by company name..."
                className="h-10 pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5" style={{ minWidth: 160 }}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Review Status</p>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
              <SelectTrigger className="h-10 w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => fetchRegistrations()}
            className="h-10 gap-2 bg-orange-500 text-white hover:bg-orange-600"
          >
            <Filter className="size-4" />
            Apply Filter
          </Button>
        </div>
      </div>

      {listError && <Alert variant="destructive">{listError}</Alert>}

      {/* Table Container */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-800 hover:bg-slate-800">
              <TableHead className="rounded-tl-xl text-[11px] font-bold uppercase tracking-wider text-slate-300">Operator Company</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Contact Owner</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Tax ID</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Submitted Date</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-300">License Status</TableHead>
              <TableHead className="rounded-tr-xl text-center text-[11px] font-bold uppercase tracking-wider text-slate-300">Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableSkeleton />
            ) : registrations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Building2 className="size-10 opacity-25" />
                    <p className="font-medium">No registrations found</p>
                    <p className="text-xs text-slate-300">Try adjusting your filters or search query</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              registrations.map((reg, i) => {
                const ownerName = reg.accountId?.fullName || 'N/A'
                const planName = reg.selectedPlanId?.planName || 'No Plan Selected'
                const price = reg.selectedPlanId?.price || 0

                return (
                  <TableRow
                    key={reg._id}
                    className="animate-row-in transition-colors hover:bg-slate-50/60"
                    style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'both' }}
                  >
                    {/* Operator Name & Plan */}
                    <TableCell>
                      <div>
                        <p className="font-semibold text-slate-800">{reg.operatorName}</p>
                        <p className="text-[11px] text-slate-400">
                          Plan: <span className="font-medium text-slate-500">{planName}</span> ({formatCurrency(price)})
                        </p>
                      </div>
                    </TableCell>

                    {/* Contact Person */}
                    <TableCell>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{ownerName}</p>
                        <p className="text-[11px] text-slate-400">{reg.accountId?.email}</p>
                      </div>
                    </TableCell>

                    {/* Tax Code */}
                    <TableCell className="text-sm font-mono text-slate-600">
                      {reg.taxCode || 'N/A'}
                    </TableCell>

                    {/* Submitted Date */}
                    <TableCell className="text-sm text-slate-600">
                      {new Date(reg.createdAt).toLocaleDateString('en-US', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell>
                      <Badge
                        className={cn(
                          'text-xs font-semibold px-2 py-0.5 border',
                          reg.licenseStatus === 'PENDING'
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : 'border-red-200 bg-red-50 text-red-700'
                        )}
                      >
                        {reg.licenseStatus === 'PENDING' ? 'Pending Approval' : 'Rejected'}
                      </Badge>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => openDetail(reg)}
                          className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
                          title="Review Registration"
                        >
                          <Eye className="size-4" />
                        </button>
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-slate-400">
          Showing {registrations.length > 0 ? (page - 1) * pagination.limit + 1 : 0} to{' '}
          {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} registrations
        </p>
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
            const p = i + 1
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={cn(
                  'flex size-9 items-center justify-center rounded-lg text-sm font-medium transition-colors',
                  page === p ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'
                )}
              >
                {p}
              </button>
            )
          })}
        </div>
      </div>
      {/* Detail & Action Dialog Modal */}
      <Dialog open={!!selectedId} onOpenChange={(open) => !open && closeDetail()}>
        <DialogContent className="sm:max-w-4xl overflow-y-auto max-h-[90vh] rounded-2xl p-6">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <FileCheck className="size-5 text-blue-600" />
              Review Operator Registration
            </DialogTitle>
            <DialogDescription>
              Validate the operator's details and uploaded business license document.
            </DialogDescription>
          </DialogHeader>

          {reviewError && <Alert variant="destructive" className="mt-4">{reviewError}</Alert>}

          {detail && (
            <div className="mt-6 space-y-6">
              {/* Core Information Section */}
              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 border border-slate-150 rounded-xl p-5 bg-slate-50/50">
                <div>
                  <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Company Name</Label>
                  <p className="mt-0.5 text-sm font-bold text-slate-800">{detail.operatorName}</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tax Code / ID</Label>
                  <p className="mt-0.5 text-sm font-mono text-slate-700">{detail.taxCode || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact Phone</Label>
                  <p className="mt-0.5 text-sm text-slate-700">{detail.operatorPhone || detail.accountId?.phone || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact Email</Label>
                  <p className="mt-0.5 text-sm text-slate-700">{detail.accountId?.email || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Owner Full Name</Label>
                  <p className="mt-0.5 text-sm text-slate-700">{detail.accountId?.fullName || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Selected Subscription Plan</Label>
                  <p className="mt-0.5 text-sm font-medium text-slate-850">
                    {detail.selectedPlanId?.planName || 'N/A'} ({detail.selectedPlanId?.durationDays || 30} days)
                  </p>
                </div>
              </div>

              {/* Business License File Attachment */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Uploaded Business License</Label>
                {detail.businessLicense ? (
                  isImageFile(detail.businessLicense) ? (
                    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2 text-center">
                      <img
                        src={detail.businessLicense}
                        alt="Business License Preview"
                        className="max-h-[350px] w-auto rounded-lg object-contain mx-auto border"
                      />
                      <div className="mt-3">
                        <a
                          href={detail.businessLicense}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
                        >
                          <ExternalLink className="size-3.5" /> View original license image
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 shadow-inner">
                        <FileText className="size-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-850">Business License Document</p>
                        <p className="mt-0.5 text-xs text-slate-400">PDF, Word, or other file formats</p>
                      </div>
                      <a
                        href={detail.businessLicense}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 items-center justify-center rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white shadow transition-colors hover:bg-blue-700"
                      >
                        <ExternalLink className="mr-1.5 size-3.5" /> View Document
                      </a>
                    </div>
                  )
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-amber-700">
                    <AlertTriangle className="size-5 shrink-0" />
                    <p className="text-sm font-medium">No business license file has been uploaded.</p>
                  </div>
                )}
              </div>

              {/* Status & Rejection details if already rejected */}
              {detail.licenseStatus === 'REJECTED' && !isRejecting && (
                <div className="rounded-xl border border-red-200 bg-red-50/40 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-650" />
                    <div>
                      <p className="text-sm font-bold text-red-800">Previously Rejected</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        Reviewed by: <span className="text-slate-700">{detail.reviewedBy?.fullName || detail.reviewedBy?.email || 'System'}</span>
                        {detail.reviewedAt && ` on ${new Date(detail.reviewedAt).toLocaleString()}`}
                      </p>
                      <p className="mt-2 text-sm text-slate-750 bg-white rounded-lg border border-red-100 p-2.5 shadow-sm font-medium">
                        <span className="font-bold text-red-750 block text-[11px] uppercase tracking-wider mb-1">Reason:</span>
                        {detail.rejectionReason || 'No details provided.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Rejection input toggle */}
              {isRejecting && (
                <div className="space-y-2.5 border-t border-slate-100 pt-4 animate-fade-in">
                  <Label htmlFor="rejection-reason" className="text-xs font-bold text-red-600 uppercase tracking-wider">
                    Rejection Reason (Required)
                  </Label>
                  <Textarea
                    id="rejection-reason"
                    placeholder="Provide clear instructions for why the license is rejected (e.g., blurred image, expired document, incorrect tax code)."
                    maxLength={600}
                    rows={4}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="focus-visible:ring-red-500 border-red-200 resize-none shadow-sm"
                  />
                  <p className="text-[10px] text-slate-400">This feedback will be emailed to the registrant and shown when they continue registration.</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-6 border-t border-slate-100 pt-4 flex-col sm:flex-row gap-2">
            {isRejecting ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsRejecting(false)}
                  disabled={reviewSubmitting}
                  className="sm:mr-auto"
                >
                  Back
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => submitReview('REJECTED')}
                  disabled={reviewSubmitting}
                  className="gap-1.5 shadow"
                >
                  {reviewSubmitting && <Loader2 className="size-4 animate-spin" />}
                  Confirm Rejection
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={closeDetail}
                  disabled={reviewSubmitting}
                  className="sm:mr-auto"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setIsRejecting(true)}
                  disabled={reviewSubmitting || !detail?.businessLicense}
                >
                  Reject License
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow"
                  onClick={() => submitReview('APPROVED')}
                  disabled={reviewSubmitting || !detail?.businessLicense}
                >
                  {reviewSubmitting && <Loader2 className="size-4 animate-spin" />}
                  Approve & Accept
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default LicenseApprovalsPage
