import { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  Bus,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  MapPin,
  MoreVertical,
  Search,
  ShieldAlert,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react'
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
  { value: 'ALL',              label: 'All Statuses'     },
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
          <TableCell><Sk className="h-4 w-32" /></TableCell>
          <TableCell><Sk className="mx-auto h-4 w-8" /></TableCell>
          <TableCell><Sk className="mx-auto h-4 w-8" /></TableCell>
          <TableCell><Sk className="h-4 w-20" /></TableCell>
          <TableCell><Sk className="h-5 w-16 rounded-full" /></TableCell>
          <TableCell>
            <div className="flex justify-center gap-2">
              <Sk className="h-7 w-8 rounded-md" />
              <Sk className="h-7 w-8 rounded-md" />
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

  /* ─── Derived stats ─────────────────────────────────────────────────── */

  const stats = useMemo(() => {
    const active  = partners.filter((p) => p.status === 'ACTIVE').length
    const pending = partners.filter((p) => p.status === 'PENDING_APPROVAL' || p.status === 'UNVERIFIED').length
    const banned  = partners.filter((p) => p.status === 'BANNED').length
    return { active, pending, banned }
  }, [partners])

  /* ─── Render ─────────────────────────────────────────────────────────── */

  return (
    <div className="animate-fade-up space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Manage Partners</h2>
          <p className="mt-1 text-sm text-slate-500">View and manage all registered bus operator partners.</p>
        </div>
      </div>

      {/* Toast alerts */}
      {(actionError || actionSuccess) && (
        <div className="fixed right-6 top-20 z-50 animate-fade-up">
          {actionError   && <Alert variant="destructive" onDismiss={() => setActionError(null)} className="min-w-[320px] shadow-lg">{actionError}</Alert>}
          {actionSuccess && <Alert variant="success"     onDismiss={() => setActionSuccess(null)} className="min-w-[320px] shadow-lg">{actionSuccess}</Alert>}
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total Partners',    value: pagination.total, sub: 'All registered',     icon: Users,        border: 'border-blue-500',   iconBg: 'bg-blue-50',   iconColor: 'text-blue-600'   },
          { label: 'Active',            value: stats.active,     sub: 'Currently active',   icon: CheckCircle2, border: 'border-emerald-500', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
          { label: 'Pending Approval',  value: stats.pending,    sub: 'Requires review',    icon: Clock,        border: 'border-amber-500',  iconBg: 'bg-amber-50',  iconColor: 'text-amber-600'  },
          { label: 'Suspended',         value: stats.banned,     sub: 'Action required',    icon: ShieldAlert,  border: 'border-red-500',    iconBg: 'bg-red-50',    iconColor: 'text-red-600'    },
        ].map(({ label, value, sub, icon: Icon, border, iconBg, iconColor }) => (
          <div key={label} className={cn('rounded-xl border-l-4 bg-white p-5 shadow-sm', border)}>
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

      {/* ── Filters ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 space-y-1.5" style={{ minWidth: 200 }}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Search Partner</p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search partner name..."
                className="h-10 pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5" style={{ minWidth: 160 }}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Status</p>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
              <SelectTrigger className="h-10 w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => fetchPartners()}
            className="h-10 gap-2 bg-orange-500 text-white hover:bg-orange-600"
          >
            <Filter className="size-4" />
            Apply Filter
          </Button>
        </div>
      </div>

      {listError && <Alert variant="destructive">{listError}</Alert>}

      {/* ── Table ── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-800 hover:bg-slate-800">
              <TableHead className="rounded-tl-xl text-[11px] font-bold uppercase tracking-wider text-slate-300">Partner Logo + Name</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Contact Email</TableHead>
              <TableHead className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-300">Rating</TableHead>
              <TableHead className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-300">Reviews</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Joined Date</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Status</TableHead>
              <TableHead className="rounded-tr-xl text-center text-[11px] font-bold uppercase tracking-wider text-slate-300">Action</TableHead>
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
              partners.map((partner, i) => {
                const name = partner.partnerInformation?.operatorName || partner.fullName || partner.username
                const initials = name.charAt(0).toUpperCase()
                return (
                  <TableRow
                    key={partner._id}
                    className="animate-row-in transition-colors hover:bg-slate-50/60"
                    style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'both' }}
                  >
                    {/* Partner Logo + Name */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {partner.profilePicture ? (
                          <img src={partner.profilePicture} alt="" className="size-10 rounded-lg object-cover" />
                        ) : (
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white">
                            {initials}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-800">{name}</p>
                          <p className="text-[11px] text-slate-400">ID: {partner._id.slice(-6).toUpperCase()}</p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Email */}
                    <TableCell className="text-sm text-slate-600">{partner.email}</TableCell>

                    {/* Rating */}
                    <TableCell className="text-center tabular-nums font-medium text-slate-700">
                      {partner.partnerInformation?.ratingAvg?.toFixed(1) ?? '-'}
                    </TableCell>

                    {/* Reviews */}
                    <TableCell className="text-center tabular-nums font-medium text-slate-700">
                      {partner.partnerInformation?.totalReviews ?? 0}
                    </TableCell>

                    {/* Joined Date */}
                    <TableCell>
                      <p className="text-sm text-slate-600">
                        {new Date(partner.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <StatusBadge status={partner.status} />
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openDetail(partner._id)}
                          className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
                          title="View detail"
                        >
                          <Eye className="size-4" />
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => openDetail(partner._id)}
                            className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                            title="More actions"
                          >
                            <MoreVertical className="size-4" />
                          </button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-slate-400">
          Showing {partners.length > 0 ? (page - 1) * pagination.limit + 1 : 0} to{' '}
          {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} partners
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
                  page === p
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100',
                )}
              >
                {p}
              </button>
            )
          })}
          {pagination.totalPages > 5 && (
            <>
              <span className="px-1 text-slate-400">...</span>
              <button
                onClick={() => setPage(pagination.totalPages)}
                className={cn(
                  'flex size-9 items-center justify-center rounded-lg text-sm font-medium transition-colors',
                  page === pagination.totalPages
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100',
                )}
              >
                {pagination.totalPages}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Bottom info cards ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="col-span-2 rounded-xl border border-blue-100 bg-blue-50/50 p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-blue-800">
            <TrendingUp className="size-4" />
            Partner Onboarding Tips
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-blue-100 bg-white p-4">
              <p className="text-sm font-semibold text-slate-800">Fast-Track Verification</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Partners with complete tax documentation are verified 40% faster. Encourage uploads during the initial registration.
              </p>
            </div>
            <div className="rounded-lg border border-blue-100 bg-white p-4">
              <p className="text-sm font-semibold text-slate-800">Fleet Optimization</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Inactive partners (0 buses) for over 30 days are automatically flagged for account review by the system.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-orange-800">Need Help?</h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Our support team is available 24/7 to assist with partner verification issues or system configurations.
          </p>
          <Button variant="outline" className="mt-4 gap-2 border-orange-200 text-orange-700 hover:bg-orange-100">
            Contact Support
          </Button>
        </div>
      </div>

      {/* ─── Partner Detail Overlay ─────────────────────────────────────── */}
      {selectedId && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-5xl animate-fade-up rounded-2xl border border-slate-200 bg-white shadow-2xl">

            {detailLoading && (
              <div className="flex items-center justify-center py-32">
                <Loader2 className="size-6 animate-spin text-slate-400" />
              </div>
            )}

            {detailError && (
              <div className="p-6">
                <Alert variant="destructive">{detailError}</Alert>
                <Button variant="outline" className="mt-4" onClick={() => setSelectedId(null)}>Close</Button>
              </div>
            )}

            {detail && (() => {
              const dName = detail.partnerInformation?.operatorName || detail.partner.fullName || detail.partner.username
              const dInitial = dName.charAt(0).toUpperCase()
              const info = detail.partnerInformation
              return (
                <>
                  {/* ── Breadcrumb ── */}
                  <div className="border-b border-slate-100 px-8 py-3 text-xs text-slate-400">
                    Manage Partners <span className="mx-1">/</span> <span className="font-semibold text-slate-700">Partner Detail</span>
                  </div>

                  {/* ── Header ── */}
                  <div className="flex flex-wrap items-center justify-between gap-4 px-8 py-5">
                    <div className="flex items-center gap-4">
                      <button onClick={() => setSelectedId(null)} className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700">
                        &larr;
                      </button>
                      {detail.partner.profilePicture ? (
                        <img src={detail.partner.profilePicture} alt="" className="size-14 rounded-2xl object-cover shadow-md" />
                      ) : (
                        <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-xl font-bold text-white shadow-md">{dInitial}</div>
                      )}
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-xl font-bold text-slate-900">{dName}</h3>
                          <StatusBadge status={detail.partner.status} />
                        </div>
                        <p className="mt-0.5 text-sm text-slate-400">
                          ID: {detail.partner._id.slice(-8).toUpperCase()} &middot; {detail.partner.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {detail.partner.status === 'BANNED' ? (
                        <Button onClick={() => openUnbanConfirm(detail.partner)} className="gap-2 bg-blue-600 hover:bg-blue-700">
                          Enable Partner
                        </Button>
                      ) : (
                        <Button variant="outline" onClick={() => openBanDialog(detail.partner._id)}>
                          Disable Partner
                        </Button>
                      )}
                      <Button variant="destructive" onClick={() => openDeleteConfirm(detail.partner)}>
                        Delete
                      </Button>
                    </div>
                  </div>

                  {/* ── Content grid ── */}
                  <div className="grid gap-6 px-8 pb-8 lg:grid-cols-[1fr_300px]">

                    {/* Left column */}
                    <div className="space-y-6">

                      {/* Business Information */}
                      <div className="rounded-xl border border-slate-200 p-6">
                        <h4 className="mb-5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Business Information</h4>
                        {info ? (
                          <div className="grid gap-x-10 gap-y-5 sm:grid-cols-2 text-sm">
                            <div>
                              <p className="text-[11px] font-semibold text-slate-400">Company Name</p>
                              <p className="mt-1 font-medium text-slate-800">{info.operatorName}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold text-slate-400">License Number</p>
                              <p className="mt-1 font-medium text-slate-800">{info.taxCode || '-'}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold text-slate-400">Tax ID</p>
                              <p className="mt-1 text-slate-700">{info.taxCode || '-'}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold text-slate-400">Joined Date</p>
                              <p className="mt-1 text-slate-700">{new Date(detail.partner.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                            </div>
                            <div className="sm:col-span-2">
                              <p className="text-[11px] font-semibold text-slate-400">Business Address</p>
                              <p className="mt-1 text-slate-700">{info.description || '-'}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold text-slate-400">Contact Person</p>
                              <p className="mt-1 text-slate-700">{detail.partner.fullName || detail.partner.username}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold text-slate-400">Email Address</p>
                              <p className="mt-1 text-slate-700">{detail.partner.email}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold text-slate-400">Phone Number</p>
                              <p className="mt-1 text-slate-700">{info.operatorPhone || detail.partner.phone || '-'}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold text-slate-400">Bank Account</p>
                              <p className="mt-1 text-slate-700">
                                {info.bankName ? `${info.bankName} – ${info.bankNumber ?? ''}` : '-'}
                              </p>
                            </div>
                            {info.businessLicense && (
                              <div className="sm:col-span-2 flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                                <span className="text-xs text-slate-500">
                                  {info.isVerified ? 'Verified' : 'Last verified'}: {info.verifiedAt ? formatDate(info.verifiedAt) : 'Pending'}
                                </span>
                                <a href={info.businessLicense} target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-600 hover:underline">
                                  Verify Documents
                                </a>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400">No business information submitted.</p>
                        )}
                      </div>

                      {/* Subscription */}
                      {detail.subscription?.planId && (
                        <div className="rounded-xl border border-slate-200 p-6">
                          <h4 className="mb-5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Subscription</h4>
                          <div className="grid gap-x-10 gap-y-5 sm:grid-cols-2 text-sm">
                            <div>
                              <p className="text-[11px] font-semibold text-slate-400">Plan</p>
                              <p className="mt-1 font-medium text-slate-800">{detail.subscription.planId.planName} ({detail.subscription.planId.code})</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold text-slate-400">Price</p>
                              <p className="mt-1 font-medium text-slate-800">{formatCurrency(detail.subscription.planId.price)}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold text-slate-400">Duration</p>
                              <p className="mt-1 text-slate-700">{detail.subscription.planId.durationDays} days</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold text-slate-400">Status</p>
                              <Badge variant="outline" className="mt-1">{detail.subscription.subscriptionStatus}</Badge>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold text-slate-400">Subscribed</p>
                              <p className="mt-1 text-slate-700">{formatDate(detail.subscription.subscriptionDate)}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold text-slate-400">Expires</p>
                              <p className="mt-1 text-slate-700">{formatDate(detail.subscription.expirationDate)}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Ban History */}
                      {detail.banHistory.length > 0 && (
                        <div className="rounded-xl border border-slate-200 p-6">
                          <h4 className="mb-5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Ban History</h4>
                          <div className="space-y-3">
                            {detail.banHistory.map((ban) => (
                              <div key={ban._id} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                                <div className={cn('mt-1 size-2.5 shrink-0 rounded-full', ban.status === 'ACTIVE' ? 'bg-red-500' : 'bg-slate-300')} />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-slate-800">{ban.type} ban &middot; {ban.reason || 'No reason provided'}</p>
                                  <p className="mt-0.5 text-xs text-slate-400">
                                    {formatDate(ban.startedAt)}{ban.expiredAt ? ` → ${formatDate(ban.expiredAt)}` : ''}
                                  </p>
                                </div>
                                <Badge variant={ban.status === 'ACTIVE' ? 'destructive' : 'outline'} className="shrink-0 text-[10px]">{ban.status}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right column — stat cards */}
                    <div className="space-y-4">
                      {[
                        {
                          label: 'Total Reviews',
                          value: info?.totalReviews?.toLocaleString() ?? '0',
                          sub: info ? `Avg ${info.ratingAvg.toFixed(1)} rating` : '',
                          iconBg: 'bg-blue-50', iconColor: 'text-blue-600', icon: Users,
                        },
                        {
                          label: 'Avg Rating',
                          value: info?.ratingAvg?.toFixed(1) ?? '-',
                          sub: info ? `Based on ${info.totalReviews} reviews` : '',
                          iconBg: 'bg-amber-50', iconColor: 'text-amber-600', icon: Star, stars: true,
                        },
                        {
                          label: 'Ban Count',
                          value: String(detail.partner.banCounts),
                          sub: detail.partner.banCounts > 0 ? 'Has violation history' : 'Clean record',
                          iconBg: 'bg-red-50', iconColor: 'text-red-600', icon: ShieldAlert,
                        },
                        {
                          label: 'Account Status',
                          value: detail.partner.status,
                          sub: `Since ${formatDate(detail.partner.updatedAt)}`,
                          iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', icon: CheckCircle2,
                        },
                      ].map(({ label, value, sub, iconBg, iconColor, icon: Icon, stars }) => (
                        <div key={label} className="rounded-xl border border-slate-200 p-5">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
                          <div className="mt-2 flex items-end justify-between">
                            <div>
                              <p className="text-3xl font-bold tracking-tight text-slate-900">{value}</p>
                              {stars && info && (
                                <div className="mt-1.5 flex gap-0.5">
                                  {Array.from({ length: 5 }, (_, i) => (
                                    <Star key={i} className={cn('size-4', i < Math.round(info.ratingAvg) ? 'fill-amber-400 text-amber-400' : 'text-slate-200')} />
                                  ))}
                                </div>
                              )}
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
          </div>
        </div>
      )}

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
