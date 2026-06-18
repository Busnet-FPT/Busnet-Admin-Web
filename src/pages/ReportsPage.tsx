import { useEffect, useState } from 'react'
import { Flag, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
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
import type {
  Pagination,
  ReportDetail,
  ReportListItem,
  ReportStatus,
  ReportTargetType,
} from '@/types/admin'

/* ─── Constants ─────────────────────────────────────────────────────────── */

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL',       label: 'All statuses' },
  { value: 'PENDING',   label: 'Pending'       },
  { value: 'RESOLVED',  label: 'Resolved'      },
  { value: 'DISMISSED', label: 'Dismissed'     },
]

const TARGET_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL',      label: 'All types' },
  { value: 'OPERATOR', label: 'Operator'  },
  { value: 'BOOKING',  label: 'Booking'   },
  { value: 'TRIP',     label: 'Trip'      },
]

const TARGET_COLORS: Record<ReportTargetType, string> = {
  OPERATOR: 'bg-violet-50 text-violet-700 border-violet-200',
  BOOKING:  'bg-blue-50   text-blue-700   border-blue-200',
  TRIP:     'bg-teal-50   text-teal-700   border-teal-200',
}

const EMPTY_PAGINATION: Pagination = { total: 0, page: 1, limit: 10, totalPages: 1 }

/* ─── Skeleton ───────────────────────────────────────────────────────────── */

function Sk({ className }: { className?: string }) {
  return <div className={cn('animate-pulse-soft rounded bg-slate-100', className)} />
}

function ReportTableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <div className="space-y-1.5">
              <Sk className="h-4 w-28" />
              <Sk className="h-3 w-36" />
            </div>
          </TableCell>
          <TableCell><Sk className="h-5 w-16 rounded-full" /></TableCell>
          <TableCell><Sk className="h-4 w-40" /></TableCell>
          <TableCell><Sk className="h-5 w-16 rounded-full" /></TableCell>
          <TableCell><Sk className="h-4 w-32" /></TableCell>
          <TableCell><div className="flex justify-end"><Sk className="h-7 w-12 rounded-md" /></div></TableCell>
        </TableRow>
      ))}
    </>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

function ReportsPage() {
  const [reports,    setReports]    = useState<ReportListItem[]>([])
  const [pagination, setPagination] = useState<Pagination>(EMPTY_PAGINATION)
  const [page,       setPage]       = useState(1)
  const [status,     setStatus]     = useState('ALL')
  const [targetType, setTargetType] = useState('ALL')
  const [loading,    setLoading]    = useState(true)
  const [listError,  setListError]  = useState<string | null>(null)

  const [actionError,   setActionError]   = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null)
  const [detailLoading,  setDetailLoading]  = useState(false)
  const [detailError,    setDetailError]    = useState<string | null>(null)

  const [resolveNote,       setResolveNote]       = useState('')
  const [resolveSubmitting, setResolveSubmitting] = useState(false)
  const [resolveError,      setResolveError]      = useState<string | null>(null)
  const [pendingAction,     setPendingAction]      = useState<'RESOLVED' | 'DISMISSED' | null>(null)

  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  /* ── Auto-dismiss ── */
  useEffect(() => {
    if (!actionSuccess) return
    const t = setTimeout(() => setActionSuccess(null), 4500)
    return () => clearTimeout(t)
  }, [actionSuccess])

  /* ── Fetch list ── */
  const fetchReports = () => {
    setLoading(true)
    setListError(null)

    api
      .get('/admin/reports', {
        params: {
          page,
          limit: 10,
          status:     status     === 'ALL' ? undefined : status,
          targetType: targetType === 'ALL' ? undefined : targetType,
        },
      })
      .then(({ data }) => {
        setReports(data.data.reports ?? [])
        setPagination(data.data.pagination ?? EMPTY_PAGINATION)
      })
      .catch((err) => setListError(getErrorMessage(err, 'Failed to load reports.')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, targetType])

  /* ── Open detail ── */
  const openDetail = (id: string) => {
    setSelectedReport(null)
    setDetailError(null)
    setResolveNote('')
    setPendingAction(null)
    setResolveError(null)
    setDetailLoading(true)

    api
      .get(`/admin/reports/${id}`)
      .then(({ data }) => setSelectedReport(data.data))
      .catch((err) => setDetailError(getErrorMessage(err, 'Failed to load report detail.')))
      .finally(() => setDetailLoading(false))
  }

  const closeDetail = () => {
    setSelectedReport(null)
    setDetailError(null)
    setDetailLoading(false)
  }

  /* ── Resolve / Dismiss ── */
  const submitAction = async (action: 'RESOLVED' | 'DISMISSED') => {
    if (!selectedReport) return
    setResolveSubmitting(true)
    setResolveError(null)
    try {
      const { data } = await api.patch(`/admin/reports/${selectedReport._id}/resolve`, {
        status:    action,
        adminNote: resolveNote || undefined,
      })
      const newAdminNote = resolveNote || null
      setReports((prev) =>
        prev.map((r) =>
          r._id === selectedReport._id
            ? { ...r, status: action as ReportStatus, adminNote: newAdminNote }
            : r,
        ),
      )
      setSelectedReport((prev) =>
        prev ? { ...prev, status: action as ReportStatus, adminNote: newAdminNote } : prev,
      )
      setActionSuccess(data.message || `Report ${action.toLowerCase()} successfully.`)
      setActionError(null)
      setPendingAction(null)
      setResolveNote('')
    } catch (err) {
      setResolveError(getErrorMessage(err, 'Failed to update report status.'))
    } finally {
      setResolveSubmitting(false)
    }
  }

  /* ─── Render ─────────────────────────────────────────────────────────── */

  return (
    <div className="animate-fade-up space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
        <p className="mt-1 text-sm text-slate-500">Review and manage user-submitted reports.</p>
      </div>

      {/* Alerts */}
      {actionError   && <Alert variant="destructive" onDismiss={() => setActionError(null)}>{actionError}</Alert>}
      {actionSuccess && <Alert variant="success"     onDismiss={() => setActionSuccess(null)}>{actionSuccess}</Alert>}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={targetType} onValueChange={(v) => { setTargetType(v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TARGET_OPTIONS.map((o) => (
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
              <TableHead className="rounded-tl-xl font-semibold text-slate-600">Reporter</TableHead>
              <TableHead className="font-semibold text-slate-600">Target</TableHead>
              <TableHead className="font-semibold text-slate-600">Reason</TableHead>
              <TableHead className="font-semibold text-slate-600">Status</TableHead>
              <TableHead className="font-semibold text-slate-600">Created</TableHead>
              <TableHead className="rounded-tr-xl text-right font-semibold text-slate-600">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <ReportTableSkeleton />
            ) : reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Flag className="size-10 opacity-25" />
                    <p className="font-medium">No reports found</p>
                    <p className="text-xs text-slate-300">Try adjusting your filters</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              reports.map((r, i) => (
                <TableRow
                  key={r._id}
                  className="animate-row-in transition-colors hover:bg-slate-50/60"
                  style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'both' }}
                >
                  <TableCell>
                    <p className="text-sm font-medium text-slate-800">
                      {r.reporterId?.fullName || r.reporterId?.username || 'Deleted user'}
                    </p>
                    <p className="text-xs text-slate-400">{r.reporterId?.email ?? '-'}</p>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                      TARGET_COLORS[r.targetType],
                    )}>
                      {r.targetType}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="truncate text-sm text-slate-600">{r.reason}</p>
                  </TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-sm text-slate-400">{formatDate(r.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => openDetail(r._id)}>
                      View
                    </Button>
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
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>

      {/* ─── Detail Dialog ────────────────────────────────────────────────── */}
      <Dialog
        open={!!selectedReport || detailLoading || !!detailError}
        onOpenChange={(open) => !open && closeDetail()}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Detail</DialogTitle>
            {selectedReport && (
              <DialogDescription>ID: {selectedReport._id}</DialogDescription>
            )}
          </DialogHeader>

          {detailLoading && (
            <div className="space-y-3 py-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Sk key={i} className={cn('h-4', i % 3 === 0 ? 'w-1/3' : 'w-3/4')} />
              ))}
            </div>
          )}

          {detailError && <Alert variant="destructive">{detailError}</Alert>}

          {selectedReport && (
            <div className="space-y-5">
              {/* Reporter */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Reporter</h3>
                {selectedReport.reporterId ? (
                  <div className="flex items-center gap-3">
                    {selectedReport.reporterId.profilePicture ? (
                      <img src={selectedReport.reporterId.profilePicture} alt="" className="size-10 rounded-full object-cover" />
                    ) : (
                      <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-sm font-bold text-white">
                        {(selectedReport.reporterId.fullName || selectedReport.reporterId.username || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{selectedReport.reporterId.fullName || selectedReport.reporterId.username}</p>
                      <p className="text-xs text-slate-400">{selectedReport.reporterId.email}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">Reporter account has been deleted.</p>
                )}
              </section>

              <Separator />

              {/* Report content */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Report</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <span className="text-slate-400">Target type</span>
                  <span className={cn(
                    'inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                    TARGET_COLORS[selectedReport.targetType],
                  )}>
                    {selectedReport.targetType}
                  </span>
                  <span className="text-slate-400">Target ID</span>
                  <span className="font-mono text-xs">{selectedReport.targetId}</span>
                  <span className="text-slate-400">Status</span>
                  <span><StatusBadge status={selectedReport.status} /></span>
                  <span className="text-slate-400">Created</span>
                  <span>{formatDate(selectedReport.createdAt)}</span>
                  {selectedReport.resolvedAt && (
                    <>
                      <span className="text-slate-400">Resolved</span>
                      <span>{formatDate(selectedReport.resolvedAt)}</span>
                    </>
                  )}
                  {selectedReport.resolvedBy && (
                    <>
                      <span className="text-slate-400">Resolved by</span>
                      <span>{selectedReport.resolvedBy.fullName || selectedReport.resolvedBy.email}</span>
                    </>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-400">Reason</p>
                  <p className="text-sm">{selectedReport.reason}</p>
                </div>

                {selectedReport.description && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-400">Description</p>
                    <p className="whitespace-pre-wrap text-sm text-slate-600">{selectedReport.description}</p>
                  </div>
                )}

                {selectedReport.adminNote && (
                  <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                    <p className="text-xs font-medium text-blue-600">Admin note</p>
                    <p className="text-sm text-blue-800">{selectedReport.adminNote}</p>
                  </div>
                )}
              </section>

              {/* Evidence gallery */}
              {(selectedReport.evidence?.length ?? 0) > 0 && (
                <>
                  <Separator />
                  <section className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Evidence ({selectedReport.evidence?.length ?? 0})
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedReport.evidence?.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="overflow-hidden rounded-lg border border-slate-200 transition-opacity hover:opacity-80"
                          onClick={() => setLightboxSrc(url)}
                        >
                          <img
                            src={url}
                            alt={`Evidence ${idx + 1}`}
                            className="aspect-square w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {/* Resolve / Dismiss — only for PENDING */}
              {selectedReport.status === 'PENDING' && (
                <>
                  <Separator />
                  <section className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Action</h3>

                    {resolveError && <Alert variant="destructive">{resolveError}</Alert>}

                    {pendingAction ? (
                      <div className="space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <p className="text-sm font-medium">
                          {pendingAction === 'RESOLVED' ? 'Resolve' : 'Dismiss'} this report?
                        </p>
                        <div className="space-y-1.5">
                          <Label htmlFor="admin-note">Admin note (optional)</Label>
                          <Textarea
                            id="admin-note"
                            placeholder="Add a note visible to support staff..."
                            maxLength={1000}
                            value={resolveNote}
                            onChange={(e) => setResolveNote(e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={pendingAction === 'RESOLVED' ? 'default' : 'destructive'}
                            disabled={resolveSubmitting}
                            onClick={() => submitAction(pendingAction)}
                          >
                            {resolveSubmitting && <Loader2 className="size-3.5 animate-spin" />}
                            Confirm {pendingAction === 'RESOLVED' ? 'Resolve' : 'Dismiss'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={resolveSubmitting}
                            onClick={() => { setPendingAction(null); setResolveNote('') }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => setPendingAction('RESOLVED')}>
                          Resolve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setPendingAction('DISMISSED')}>
                          Dismiss
                        </Button>
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeDetail}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Evidence Lightbox ────────────────────────────────────────────── */}
      <Dialog open={!!lightboxSrc} onOpenChange={(open) => !open && setLightboxSrc(null)}>
        <DialogContent className="max-w-3xl border-0 bg-black/90 p-2">
          {lightboxSrc && (
            <img src={lightboxSrc} alt="Evidence" className="max-h-[80vh] w-full object-contain" />
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setLightboxSrc(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ReportsPage
