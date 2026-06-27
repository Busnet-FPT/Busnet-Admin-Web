import { useEffect, useState } from 'react'
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  Loader2,
  Search,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
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
import type { BlogListItem, Pagination } from '@/types/admin'

/* ─── Constants ─────────────────────────────────────────────────────────── */

const EMPTY_PAGINATION: Pagination = { total: 0, page: 1, limit: 10, totalPages: 1 }

/* ─── Skeleton ───────────────────────────────────────────────────────────── */

function Sk({ className }: { className?: string }) {
  return <div className={cn('animate-pulse-soft rounded bg-slate-100', className)} />
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Sk className="h-4 w-48" /></TableCell>
          <TableCell><Sk className="h-4 w-28" /></TableCell>
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

function BlogApprovalsPage() {
  const [blogs, setBlogs] = useState<BlogListItem[]>([])
  const [pagination, setPagination] = useState<Pagination>(EMPTY_PAGINATION)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  // Toast state
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Detail modal state
  const [selectedBlog, setSelectedBlog] = useState<BlogListItem | null>(null)
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

  /* ── Fetch Pending Blogs ── */
  const fetchBlogs = () => {
    setLoading(true)
    setListError(null)

    api
      .get('/admin/blogs/pending', {
        params: {
          page,
          limit: 10,
          search: debouncedSearch || undefined,
        },
      })
      .then(({ data }) => {
        setBlogs(data.data.blogs)
        setPagination({
          total: data.data.pagination.totalItems,
          page: data.data.pagination.currentPage,
          limit: data.data.pagination.limit,
          totalPages: data.data.pagination.totalPages,
        })
      })
      .catch((error) => {
        setListError(getErrorMessage(error, 'Failed to load pending blogs.'))
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchBlogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch])

  /* ── Modal Handlers ── */
  const openDetail = (blog: BlogListItem) => {
    setSelectedBlog(blog)
    setIsRejecting(false)
    setRejectionReason('')
    setReviewError(null)
  }

  const closeDetail = () => {
    setSelectedBlog(null)
    setIsRejecting(false)
    setRejectionReason('')
    setReviewError(null)
  }

  /* ── Approve ── */
  const handleApprove = async () => {
    if (!selectedBlog) return
    setReviewSubmitting(true)
    setReviewError(null)

    try {
      const { data } = await api.patch(`/admin/blogs/${selectedBlog._id}/approve`)
      setActionError(null)
      setActionSuccess(data.message || 'Blog approved successfully.')
      closeDetail()
      fetchBlogs()
    } catch (error) {
      setReviewError(getErrorMessage(error, 'Failed to approve blog.'))
    } finally {
      setReviewSubmitting(false)
    }
  }

  /* ── Reject ── */
  const handleReject = async () => {
    if (!selectedBlog) return
    if (!rejectionReason.trim()) {
      setReviewError('Please provide a rejection reason.')
      return
    }

    setReviewSubmitting(true)
    setReviewError(null)

    try {
      const { data } = await api.patch(`/admin/blogs/${selectedBlog._id}/reject`, {
        reason: rejectionReason.trim(),
      })
      setActionError(null)
      setActionSuccess(data.message || 'Blog rejected successfully.')
      closeDetail()
      fetchBlogs()
    } catch (error) {
      setReviewError(getErrorMessage(error, 'Failed to reject blog.'))
    } finally {
      setReviewSubmitting(false)
    }
  }

  return (
    <div className="animate-fade-up space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Blog Approvals</h2>
          <p className="mt-1 text-sm text-slate-500">
            Review and approve blog posts submitted by partners before they are published.
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
            label: 'Pending Review',
            value: String(pagination.total),
            sub: 'Blog posts awaiting approval',
            icon: Clock,
            border: 'border-amber-500',
            iconBg: 'bg-amber-50',
            iconColor: 'text-amber-600',
          },
          {
            label: 'Approved Today',
            value: '—',
            sub: 'Published after admin review',
            icon: CheckCircle2,
            border: 'border-emerald-500',
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
          },
          {
            label: 'Rejected',
            value: '—',
            sub: 'Needs partner correction',
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

      {/* Filter Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 space-y-1.5" style={{ minWidth: 220 }}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Search Blog</p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by title or summary..."
                className="h-10 pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <Button
            onClick={() => fetchBlogs()}
            className="h-10 gap-2 bg-orange-500 text-white hover:bg-orange-600"
          >
            <Filter className="size-4" />
            Apply Filter
          </Button>
        </div>
      </div>

      {listError && <Alert variant="destructive">{listError}</Alert>}

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-800 hover:bg-slate-800">
              <TableHead className="rounded-tl-xl text-[11px] font-bold uppercase tracking-wider text-slate-300">Blog Title</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Author</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Tag</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Submitted</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Status</TableHead>
              <TableHead className="rounded-tr-xl text-center text-[11px] font-bold uppercase tracking-wider text-slate-300">Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableSkeleton />
            ) : blogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <BookOpen className="size-10 opacity-25" />
                    <p className="font-medium">No pending blogs found</p>
                    <p className="text-xs text-slate-300">All blog posts have been reviewed</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              blogs.map((blog, i) => (
                <TableRow
                  key={blog._id}
                  className="animate-row-in transition-colors hover:bg-slate-50/60"
                  style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'both' }}
                >
                  {/* Title */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img
                        src={blog.coverImage}
                        alt=""
                        className="size-10 shrink-0 rounded-lg border border-slate-200 object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-800 max-w-[260px]">{blog.title}</p>
                        {blog.summary && (
                          <p className="truncate text-[11px] text-slate-400 max-w-[260px]">{blog.summary}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Author */}
                  <TableCell>
                    <div>
                      <p className="text-sm font-semibold text-slate-750">
                        {blog.partnerName || blog.authorId?.fullName || 'N/A'}
                      </p>
                      {blog.partnerName && blog.authorId?.fullName && (
                        <p className="text-[10px] text-slate-400">By: {blog.authorId.fullName}</p>
                      )}
                      <p className="text-[11px] text-slate-400">{blog.authorId?.email}</p>
                    </div>
                  </TableCell>

                  {/* Tag */}
                  <TableCell>
                    <Badge className="border border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                      {blog.tag}
                    </Badge>
                  </TableCell>

                  {/* Submitted Date */}
                  <TableCell className="text-sm text-slate-600">
                    {new Date(blog.createdAt).toLocaleDateString('en-US', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge className="border-amber-200 bg-amber-50 text-xs font-semibold text-amber-700 border">
                      Pending Approval
                    </Badge>
                  </TableCell>

                  {/* Action */}
                  <TableCell>
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => openDetail(blog)}
                        className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
                        title="Review Blog"
                      >
                        <Eye className="size-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-slate-400">
          Showing {blogs.length > 0 ? (page - 1) * pagination.limit + 1 : 0} to{' '}
          {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} blogs
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

      {/* ── Detail & Action Dialog ── */}
      <Dialog open={!!selectedBlog} onOpenChange={(open) => !open && closeDetail()}>
        <DialogContent className="sm:max-w-3xl overflow-y-auto max-h-[90vh] rounded-2xl p-6">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <BookOpen className="size-5 text-blue-600" />
              Review Blog Post
            </DialogTitle>
            <DialogDescription>
              Read the blog content and decide whether to approve or reject it.
            </DialogDescription>
          </DialogHeader>

          {reviewError && <Alert variant="destructive" className="mt-4">{reviewError}</Alert>}

          {selectedBlog && (
            <div className="mt-6 space-y-6">
              {/* Cover Image */}
              {selectedBlog.coverImage && (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <img
                    src={selectedBlog.coverImage}
                    alt="Cover"
                    className="h-48 w-full object-cover"
                  />
                </div>
              )}

              {/* Blog Info */}
              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 border border-slate-150 rounded-xl p-5 bg-slate-50/50">
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Title</Label>
                  <p className="mt-0.5 text-lg font-bold text-slate-800">{selectedBlog.title}</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Partner / Author</Label>
                  <p className="mt-0.5 text-sm font-bold text-slate-800">
                    {selectedBlog.partnerName || 'N/A'}
                  </p>
                  {selectedBlog.partnerName && selectedBlog.authorId?.fullName && (
                    <p className="text-xs text-slate-500">By: {selectedBlog.authorId.fullName}</p>
                  )}
                  {!selectedBlog.partnerName && selectedBlog.authorId?.fullName && (
                    <p className="mt-0.5 text-sm font-medium text-slate-700">{selectedBlog.authorId.fullName}</p>
                  )}
                  <p className="text-[11px] text-slate-400">{selectedBlog.authorId?.email}</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tag</Label>
                  <p className="mt-0.5 text-sm text-slate-700">{selectedBlog.tag}</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Submitted Date</Label>
                  <p className="mt-0.5 text-sm text-slate-700">
                    {new Date(selectedBlog.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Slug</Label>
                  <p className="mt-0.5 text-sm font-mono text-slate-600">{selectedBlog.slug}</p>
                </div>
                {selectedBlog.summary && (
                  <div className="sm:col-span-2">
                    <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Summary</Label>
                    <p className="mt-0.5 text-sm text-slate-700 leading-relaxed">{selectedBlog.summary}</p>
                  </div>
                )}
              </div>

              {/* Rejection input toggle */}
              {isRejecting && (
                <div className="space-y-2.5 border-t border-slate-100 pt-4 animate-fade-in">
                  <Label htmlFor="rejection-reason" className="text-xs font-bold text-red-600 uppercase tracking-wider">
                    Rejection Reason (Required)
                  </Label>
                  <Textarea
                    id="rejection-reason"
                    placeholder="Provide clear instructions for why the blog was rejected (e.g., inappropriate content, misleading information, poor quality)."
                    maxLength={500}
                    rows={4}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="focus-visible:ring-red-500 border-red-200 resize-none shadow-sm"
                  />
                  <p className="text-[10px] text-slate-400">
                    This feedback will be emailed to the partner.
                  </p>
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
                  onClick={handleReject}
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
                  disabled={reviewSubmitting}
                >
                  Reject Blog
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow"
                  onClick={handleApprove}
                  disabled={reviewSubmitting}
                >
                  {reviewSubmitting && <Loader2 className="size-4 animate-spin" />}
                  Approve & Publish
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default BlogApprovalsPage
