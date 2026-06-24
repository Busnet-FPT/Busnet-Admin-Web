import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Filter,
  Flag,
  Image as ImageIcon,
  Loader2,
  Mail,
  MoreVertical,
  Search,
  ShieldAlert,
  User,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
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
  DialogFooter,
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

const STATUS_OPTIONS = [
  { value: 'ALL',       label: 'All Statuses' },
  { value: 'PENDING',   label: 'Pending'       },
  { value: 'IN_REVIEW', label: 'In Review'     },
  { value: 'RESOLVED',  label: 'Resolved'      },
  { value: 'REJECTED',  label: 'Rejected'      },
  { value: 'DISMISSED', label: 'Dismissed'     },
]

const TARGET_OPTIONS = [
  { value: 'ALL',      label: 'All Types' },
  { value: 'OPERATOR', label: 'Operator'  },
  { value: 'BOOKING',  label: 'Booking'   },
  { value: 'TRIP',     label: 'Trip'      },
  { value: 'PAYMENT',  label: 'Payment'   },
  { value: 'SYSTEM',   label: 'System'    },
  { value: 'OTHER',    label: 'Other'     },
]

const TARGET_COLORS: Record<ReportTargetType, string> = {
  OPERATOR: 'bg-violet-50 text-violet-700 border-violet-200',
  BOOKING:  'bg-blue-50 text-blue-700 border-blue-200',
  TRIP:     'bg-teal-50 text-teal-700 border-teal-200',
  PAYMENT:  'bg-amber-50 text-amber-700 border-amber-200',
  SYSTEM:   'bg-red-50 text-red-700 border-red-200',
  OTHER:    'bg-slate-50 text-slate-700 border-slate-200',
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
          <TableCell><div className="flex items-center gap-2.5"><Sk className="size-9 rounded-full" /><Sk className="h-4 w-24" /></div></TableCell>
          <TableCell><Sk className="h-5 w-16 rounded-full" /></TableCell>
          <TableCell><Sk className="h-4 w-40" /></TableCell>
          <TableCell><Sk className="h-5 w-16 rounded-full" /></TableCell>
          <TableCell><Sk className="h-4 w-24" /></TableCell>
          <TableCell><Sk className="h-4 w-16" /></TableCell>
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
  const [detailOpen,     setDetailOpen]     = useState(false)
  const [detailError,    setDetailError]    = useState<string | null>(null)

  const [resolveNote,       setResolveNote]       = useState('')
  const [resolveSubmitting, setResolveSubmitting] = useState(false)
  const [resolveError,      setResolveError]      = useState<string | null>(null)
  const [pendingAction,     setPendingAction]      = useState<'RESOLVED' | 'DISMISSED' | null>(null)

  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  useEffect(() => { if (!actionSuccess) return; const t = setTimeout(() => setActionSuccess(null), 4500); return () => clearTimeout(t) }, [actionSuccess])

  /* ── Fetch ── */
  const fetchReports = () => {
    setLoading(true); setListError(null)
    api.get('/admin/reports', { params: { page, limit: 10, status: status === 'ALL' ? undefined : status, targetType: targetType === 'ALL' ? undefined : targetType } })
      .then(({ data }) => { setReports(data.data.reports ?? []); setPagination(data.data.pagination ?? EMPTY_PAGINATION) })
      .catch((err) => setListError(getErrorMessage(err, 'Failed to load reports.')))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchReports() }, [page, status, targetType]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Stats ── */
  const stats = useMemo(() => {
    const pending  = reports.filter((r) => r.status === 'PENDING' || r.status === 'IN_REVIEW').length
    const resolved = reports.filter((r) => r.status === 'RESOLVED').length
    const dismissed = reports.filter((r) => r.status === 'DISMISSED' || r.status === 'REJECTED').length
    return { pending, resolved, dismissed }
  }, [reports])

  /* ── Detail ── */
  const openDetail = (id: string) => {
    setSelectedReport(null); setDetailError(null); setResolveNote(''); setPendingAction(null); setResolveError(null)
    setDetailLoading(true); setDetailOpen(true)
    api.get(`/admin/reports/${id}`)
      .then(({ data }) => setSelectedReport(data.data))
      .catch((err) => setDetailError(getErrorMessage(err, 'Failed to load report.')))
      .finally(() => setDetailLoading(false))
  }

  const closeDetail = () => { setSelectedReport(null); setDetailError(null); setDetailLoading(false); setDetailOpen(false) }

  /* ── Resolve / Dismiss ── */
  const submitAction = async (action: 'RESOLVED' | 'DISMISSED') => {
    if (!selectedReport) return
    setResolveSubmitting(true); setResolveError(null)
    try {
      const { data } = await api.patch(`/admin/reports/${selectedReport._id}/resolve`, { status: action, adminNote: resolveNote || undefined })
      const newNote = resolveNote || null
      setReports((prev) => prev.map((r) => r._id === selectedReport._id ? { ...r, status: action as ReportStatus, adminNote: newNote } : r))
      setSelectedReport((prev) => prev ? { ...prev, status: action as ReportStatus, adminNote: newNote } : prev)
      setActionSuccess(data.message || `Report ${action.toLowerCase()}.`); setActionError(null); setPendingAction(null); setResolveNote('')
    } catch (err) { setResolveError(getErrorMessage(err, 'Failed to update report.')) }
    finally { setResolveSubmitting(false) }
  }

  /* ── Detail inline view ── */
  if (detailOpen) {
    return (
      <div className="animate-fade-up space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-slate-400">
          <button onClick={closeDetail} className="hover:text-blue-600">Reports</button>
          <span>&gt;</span>
          <span className="font-semibold text-slate-700">Report Detail</span>
        </div>

        {detailLoading && <div className="flex items-center justify-center py-24"><Loader2 className="size-6 animate-spin text-slate-400" /></div>}
        {detailError && <Alert variant="destructive">{detailError}</Alert>}

        {/* Toast */}
        {(actionError || actionSuccess) && (
          <div className="fixed right-6 top-20 z-50 animate-fade-up">
            {actionError   && <Alert variant="destructive" onDismiss={() => setActionError(null)} className="min-w-[320px] shadow-lg">{actionError}</Alert>}
            {actionSuccess && <Alert variant="success"     onDismiss={() => setActionSuccess(null)} className="min-w-[320px] shadow-lg">{actionSuccess}</Alert>}
          </div>
        )}

        {selectedReport && (() => {
          const reporter = selectedReport.reporterId
          const rInitial = (reporter?.fullName || reporter?.username || '?').charAt(0).toUpperCase()
          return (
            <>
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <button onClick={closeDetail} className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">&larr;</button>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-xl font-bold text-slate-900">Report #{selectedReport._id.slice(-6).toUpperCase()}</h2>
                      <StatusBadge status={selectedReport.status} />
                      <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', TARGET_COLORS[selectedReport.targetType])}>
                        {selectedReport.targetType}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-400">Created {formatDate(selectedReport.createdAt)}</p>
                  </div>
                </div>
                {(selectedReport.status === 'PENDING' || selectedReport.status === 'IN_REVIEW') && (
                  <div className="flex items-center gap-2">
                    <Button onClick={() => setPendingAction('RESOLVED')} className="gap-2 bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="size-4" />Resolve</Button>
                    <Button variant="destructive" onClick={() => setPendingAction('DISMISSED')} className="gap-2"><XCircle className="size-4" />Dismiss</Button>
                  </div>
                )}
              </div>

              <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
                {/* Left column */}
                <div className="space-y-6">
                  {/* Reporter */}
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Reporter</h3>
                    {reporter ? (
                      <div className="flex items-center gap-4">
                        {reporter.profilePicture
                          ? <img src={reporter.profilePicture} alt="" className="size-12 rounded-xl object-cover shadow" />
                          : <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-lg font-bold text-white shadow">{rInitial}</div>
                        }
                        <div>
                          <p className="font-semibold text-slate-800">{reporter.fullName || reporter.username}</p>
                          <p className="text-sm text-slate-400">{reporter.email}</p>
                          {reporter.phone && <p className="text-sm text-slate-400">{reporter.phone}</p>}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm italic text-slate-400">Reporter account deleted.</p>
                    )}
                  </div>

                  {/* Report Content */}
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Report Details</h3>
                    <div className="space-y-4">
                      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 text-sm">
                        <div>
                          <p className="text-[11px] font-semibold text-slate-400">Target Type</p>
                          <span className={cn('mt-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', TARGET_COLORS[selectedReport.targetType])}>{selectedReport.targetType}</span>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-slate-400">Target ID</p>
                          <p className="mt-1 rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700 w-fit">{selectedReport.targetId}</p>
                        </div>
                        {selectedReport.resolvedAt && (
                          <div>
                            <p className="text-[11px] font-semibold text-slate-400">Resolved At</p>
                            <p className="mt-1 text-slate-700">{formatDate(selectedReport.resolvedAt)}</p>
                          </div>
                        )}
                        {selectedReport.resolvedBy && (
                          <div>
                            <p className="text-[11px] font-semibold text-slate-400">Resolved By</p>
                            <p className="mt-1 text-slate-700">{selectedReport.resolvedBy.fullName || selectedReport.resolvedBy.email}</p>
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="text-[11px] font-semibold text-slate-400">Reason</p>
                        <p className="mt-1 text-sm font-medium text-slate-800">{selectedReport.reason}</p>
                      </div>

                      {selectedReport.description && (
                        <div>
                          <p className="text-[11px] font-semibold text-slate-400">Description</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{selectedReport.description}</p>
                        </div>
                      )}

                      {selectedReport.adminNote && (
                        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                          <p className="text-[11px] font-semibold text-blue-600">Admin Note</p>
                          <p className="mt-0.5 text-sm text-blue-800">{selectedReport.adminNote}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Evidence */}
                  {(selectedReport.evidence?.length ?? 0) > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                        Evidence ({selectedReport.evidence?.length})
                      </h3>
                      <div className="grid grid-cols-3 gap-3">
                        {selectedReport.evidence?.map((url, idx) => (
                          <button key={idx} type="button" onClick={() => setLightboxSrc(url)} className="overflow-hidden rounded-lg border border-slate-200 transition-opacity hover:opacity-80">
                            <img src={url} alt={`Evidence ${idx + 1}`} className="aspect-square w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action panel */}
                  {pendingAction && (selectedReport.status === 'PENDING' || selectedReport.status === 'IN_REVIEW') && (
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                        {pendingAction === 'RESOLVED' ? 'Resolve Report' : 'Dismiss Report'}
                      </h3>
                      {resolveError && <Alert variant="destructive" className="mb-4">{resolveError}</Alert>}
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label>Admin Note (optional)</Label>
                          <Textarea placeholder="Add a note visible to support staff..." maxLength={1000} value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            disabled={resolveSubmitting}
                            onClick={() => submitAction(pendingAction)}
                            className={pendingAction === 'RESOLVED' ? 'gap-2 bg-emerald-600 hover:bg-emerald-700' : 'gap-2'}
                            variant={pendingAction === 'DISMISSED' ? 'destructive' : 'default'}
                          >
                            {resolveSubmitting && <Loader2 className="size-4 animate-spin" />}
                            Confirm {pendingAction === 'RESOLVED' ? 'Resolve' : 'Dismiss'}
                          </Button>
                          <Button variant="outline" onClick={() => { setPendingAction(null); setResolveNote('') }} disabled={resolveSubmitting}>Cancel</Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right column */}
                <div className="space-y-4">
                  {[
                    { label: 'Status', value: selectedReport.status,
                      icon: selectedReport.status === 'RESOLVED' ? CheckCircle2 : (selectedReport.status === 'DISMISSED' || selectedReport.status === 'REJECTED') ? XCircle : Clock,
                      iconBg: selectedReport.status === 'RESOLVED' ? 'bg-emerald-50' : (selectedReport.status === 'DISMISSED' || selectedReport.status === 'REJECTED') ? 'bg-red-50' : 'bg-amber-50',
                      iconColor: selectedReport.status === 'RESOLVED' ? 'text-emerald-600' : (selectedReport.status === 'DISMISSED' || selectedReport.status === 'REJECTED') ? 'text-red-600' : 'text-amber-600',
                      sub: selectedReport.resolvedAt ? `Since ${formatDate(selectedReport.resolvedAt)}` : 'Awaiting action' },
                    { label: 'Target Type', value: selectedReport.targetType, icon: FileText, iconBg: 'bg-violet-50', iconColor: 'text-violet-600', sub: `ID: ${selectedReport.targetId.slice(-8)}` },
                    { label: 'Evidence', value: String(selectedReport.evidence?.length ?? 0), icon: ImageIcon, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', sub: 'Attachments' },
                    { label: 'Created', value: new Date(selectedReport.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), icon: Calendar, iconBg: 'bg-slate-100', iconColor: 'text-slate-600', sub: new Date(selectedReport.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) },
                  ].map(({ label, value, icon: Icon, iconBg, iconColor, sub }) => (
                    <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
                      <div className="mt-2 flex items-end justify-between">
                        <div>
                          <p className="text-2xl font-bold tracking-tight text-slate-900">{value}</p>
                          <p className="mt-1 text-xs text-slate-400">{sub}</p>
                        </div>
                        <div className={cn('flex size-10 items-center justify-center rounded-xl', iconBg)}>
                          <Icon className={cn('size-5', iconColor)} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )
        })()}

        {/* Lightbox */}
        <Dialog open={!!lightboxSrc} onOpenChange={(open) => !open && setLightboxSrc(null)}>
          <DialogContent className="max-w-3xl border-0 bg-black/90 p-2">
            {lightboxSrc && <img src={lightboxSrc} alt="Evidence" className="max-h-[80vh] w-full object-contain" />}
            <DialogFooter><Button variant="secondary" onClick={() => setLightboxSrc(null)}>Close</Button></DialogFooter>
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
          <h2 className="text-2xl font-bold tracking-tight">Manage Reports</h2>
          <p className="mt-1 text-sm text-slate-500">Review and manage user-submitted reports across the BusNet platform.</p>
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
          { label: 'Total Reports',   value: pagination.total, sub: 'All submitted',    icon: Flag,         border: 'border-blue-500',    iconBg: 'bg-blue-50',    iconColor: 'text-blue-600'    },
          { label: 'Pending',         value: stats.pending,    sub: 'Awaiting review',  icon: Clock,        border: 'border-amber-500',   iconBg: 'bg-amber-50',   iconColor: 'text-amber-600'   },
          { label: 'Resolved',        value: stats.resolved,   sub: 'Action taken',     icon: CheckCircle2, border: 'border-emerald-500', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
          { label: 'Dismissed',       value: stats.dismissed,  sub: 'No action needed', icon: XCircle,      border: 'border-red-500',     iconBg: 'bg-red-50',     iconColor: 'text-red-600'     },
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
          <div className="space-y-1.5" style={{ minWidth: 160 }}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Status</p>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
              <SelectTrigger className="h-10 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5" style={{ minWidth: 160 }}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Target Type</p>
            <Select value={targetType} onValueChange={(v) => { setTargetType(v); setPage(1) }}>
              <SelectTrigger className="h-10 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{TARGET_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button onClick={() => fetchReports()} className="h-10 gap-2 bg-orange-500 text-white hover:bg-orange-600">
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
              <TableHead className="rounded-tl-xl text-[11px] font-bold uppercase tracking-wider text-slate-300">Reporter</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Target</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Reason</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Status</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Created</TableHead>
              <TableHead className="rounded-tr-xl text-center text-[11px] font-bold uppercase tracking-wider text-slate-300">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <ReportTableSkeleton /> : reports.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-16 text-center"><div className="flex flex-col items-center gap-2 text-slate-400"><Flag className="size-10 opacity-25" /><p className="font-medium">No reports found</p></div></TableCell></TableRow>
            ) : reports.map((r, i) => {
              const rName = r.reporterId?.fullName || r.reporterId?.username || 'Deleted user'
              const rInit = rName.charAt(0).toUpperCase()
              return (
                <TableRow key={r._id} className="animate-row-in transition-colors hover:bg-slate-50/60" style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'both' }}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {r.reporterId?.profilePicture
                        ? <img src={r.reporterId.profilePicture} alt="" className="size-9 rounded-full object-cover" />
                        : <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-bold text-white">{rInit}</div>
                      }
                      <div>
                        <p className="font-semibold text-slate-800">{rName}</p>
                        <p className="text-[11px] text-slate-400">{r.reporterId?.email ?? '-'}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', TARGET_COLORS[r.targetType])}>{r.targetType}</span>
                  </TableCell>
                  <TableCell className="max-w-xs"><p className="truncate text-sm text-slate-600">{r.reason}</p></TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-sm text-slate-500">{new Date(r.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => openDetail(r._id)} className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-blue-600" title="View"><Eye className="size-4" /></button>
                      <button onClick={() => openDetail(r._id)} className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="More"><MoreVertical className="size-4" /></button>
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
          Showing {reports.length > 0 ? (page - 1) * pagination.limit + 1 : 0} - {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} reports
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
    </div>
  )
}

export default ReportsPage
