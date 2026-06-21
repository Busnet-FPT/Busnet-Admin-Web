import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Calendar,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Power,
  Search,
  Star,
  Trash2,
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
import type { SubscriptionPlan } from '@/types/admin'

/* ─── Constants ─────────────────────────────────────────────────────────── */

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL',      label: 'All Statuses'     },
  { value: 'ACTIVE',   label: 'Active'           },
  { value: 'INACTIVE', label: 'Inactive'          },
  { value: 'DELETED',  label: 'Deleted'           },
]

const planSchema = z.object({
  planName:     z.string().trim().min(1, 'Plan name is required'),
  code:         z.string().trim().min(1, 'Code is required'),
  price:        z.number().min(0, 'Price must be at least 0'),
  durationDays: z.number().int('Must be a whole number').min(1, 'Duration must be at least 1 day'),
  discount:     z.number().min(0, 'Discount must be at least 0'),
  maxBuses:     z.number().int('Must be a whole number').min(0, 'Must be at least 0'),
  maxRoutes:    z.number().int('Must be a whole number').min(0, 'Must be at least 0'),
  description:  z.string().optional(),
  planFeatures: z.string().optional(),
  chartColor:   z.string().optional(),
  isPopular:    z.boolean().optional(),
})

type PlanFormValues = z.infer<typeof planSchema>

type ConfirmAction = {
  title: string
  description: string
  confirmLabel: string
  variant?: 'default' | 'destructive'
  onConfirm: () => Promise<void>
}

const EMPTY_FORM: PlanFormValues = {
  planName: '', code: '', price: 0, durationDays: 30,
  discount: 0, maxBuses: 0, maxRoutes: 0,
  description: '', planFeatures: '', chartColor: '', isPopular: false,
}

const COLOR_OPTIONS = [
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#10b981', label: 'Emerald' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#ef4444', label: 'Red' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#f97316', label: 'Orange' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#6366f1', label: 'Indigo' },
]

/* ─── Skeleton ───────────────────────────────────────────────────────────── */

function Sk({ className }: { className?: string }) {
  return <div className={cn('animate-pulse-soft rounded bg-slate-100', className)} />
}

function PlanTableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Sk className="h-4 w-28" /></TableCell>
          <TableCell><Sk className="h-4 w-16" /></TableCell>
          <TableCell><Sk className="h-4 w-16" /></TableCell>
          <TableCell><Sk className="h-6 w-8 rounded-full" /></TableCell>
          <TableCell><Sk className="h-4 w-20" /></TableCell>
          <TableCell><Sk className="h-5 w-14 rounded-full" /></TableCell>
          <TableCell><Sk className="h-4 w-20" /></TableCell>
        </TableRow>
      ))}
    </>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

function SubscriptionsPage() {
  const [plans,       setPlans]       = useState<SubscriptionPlan[]>([])
  const [status,      setStatus]      = useState('ALL')
  const [searchTerm,  setSearchTerm]  = useState('')
  const [loading,     setLoading]     = useState(true)
  const [listError,   setListError]   = useState<string | null>(null)

  const [actionError,   setActionError]   = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const [detailPlan,   setDetailPlan]   = useState<SubscriptionPlan | null>(null)

  const [formOpen,     setFormOpen]     = useState(false)
  const [editingPlan,  setEditingPlan]  = useState<SubscriptionPlan | null>(null)
  const [formError,    setFormError]    = useState<string | null>(null)

  const [confirmAction,     setConfirmAction]     = useState<ConfirmAction | null>(null)
  const [confirmSubmitting, setConfirmSubmitting] = useState(false)
  const [confirmError,      setConfirmError]      = useState<string | null>(null)

  const form = useForm<PlanFormValues>({ resolver: zodResolver(planSchema), defaultValues: EMPTY_FORM })

  /* ── Auto-dismiss ── */
  useEffect(() => {
    if (!actionSuccess) return
    const t = setTimeout(() => setActionSuccess(null), 4500)
    return () => clearTimeout(t)
  }, [actionSuccess])

  /* ── Fetch ── */
  const fetchPlans = () => {
    setLoading(true)
    setListError(null)

    api
      .get('/admin/subscriptions', { params: { status: status === 'ALL' ? undefined : status } })
      .then(({ data }) => setPlans(data.data.plans))
      .catch((error) => setListError(getErrorMessage(error, 'Failed to load subscription plans.')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPlans()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  /* ── Derived stats ── */
  const stats = useMemo(() => {
    const active = plans.filter((p) => p.status === 'ACTIVE').length
    const totalRevenue = plans.reduce((s, p) => s + (p.status === 'ACTIVE' ? p.price : 0), 0)
    return { total: plans.length, active, totalRevenue }
  }, [plans])

  /* ── Filtered plans ── */
  const filteredPlans = useMemo(() => {
    if (!searchTerm.trim()) return plans
    const q = searchTerm.toLowerCase()
    return plans.filter(
      (p) => p.planName.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || (p.planFeatures || []).some((f) => f.toLowerCase().includes(q)),
    )
  }, [plans, searchTerm])

  /* ── Form helpers ── */
  const openCreateForm = () => {
    setEditingPlan(null)
    setFormError(null)
    setActionSuccess(null)
    setActionError(null)
    form.reset(EMPTY_FORM)
    setFormOpen(true)
  }

  const openEditForm = (plan: SubscriptionPlan) => {
    setEditingPlan(plan)
    setFormError(null)
    setActionSuccess(null)
    setActionError(null)
    form.reset({
      planName:     plan.planName,
      code:         plan.code,
      price:        plan.price,
      durationDays: plan.durationDays,
      discount:     plan.discount,
      maxBuses:     plan.maxBuses ?? 0,
      maxRoutes:    plan.maxRoutes ?? 0,
      description:  plan.description || '',
      planFeatures: (plan.planFeatures || []).join('\n'),
      chartColor:   plan.chartColor || '',
      isPopular:    plan.isPopular,
    })
    setFormOpen(true)
  }

  /* ── Submit ── */
  const onSubmitPlan = async (values: PlanFormValues) => {
    setFormError(null)
    const payload = {
      planName: values.planName, code: values.code, price: values.price,
      durationDays: values.durationDays, discount: values.discount,
      maxBuses: values.maxBuses, maxRoutes: values.maxRoutes,
      description: values.description || undefined,
      chartColor: values.chartColor || undefined,
      isPopular: values.isPopular ?? false,
      planFeatures: values.planFeatures ? values.planFeatures.split('\n').map((f) => f.trim()).filter(Boolean) : [],
    }
    try {
      const { data } = editingPlan
        ? await api.patch(`/admin/subscriptions/${editingPlan._id}`, payload)
        : await api.post('/admin/subscriptions', payload)
      setActionError(null)
      setActionSuccess(data.message || (editingPlan ? 'Plan updated.' : 'Plan created.'))
      setFormOpen(false)
      fetchPlans()
    } catch (error) {
      setFormError(getErrorMessage(error, 'Failed to save plan.'))
    }
  }

  /* ── Status toggle ── */
  const openStatusToggle = (plan: SubscriptionPlan) => {
    const next = plan.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    setConfirmError(null)
    setConfirmAction({
      title: next === 'ACTIVE' ? 'Activate Plan' : 'Deactivate Plan',
      description: `This will ${next === 'ACTIVE' ? 'activate' : 'deactivate'} "${plan.planName}".`,
      confirmLabel: next === 'ACTIVE' ? 'Activate' : 'Deactivate',
      onConfirm: async () => {
        const { data } = await api.patch(`/admin/subscriptions/${plan._id}/status`, { status: next })
        setActionSuccess(data.message || 'Status updated.')
        fetchPlans()
      },
    })
  }

  /* ── Delete ── */
  const openDeleteConfirm = (plan: SubscriptionPlan) => {
    setConfirmError(null)
    setConfirmAction({
      title: 'Delete Plan',
      description: `This will soft-delete "${plan.planName}".`,
      confirmLabel: 'Delete',
      variant: 'destructive',
      onConfirm: async () => {
        const { data } = await api.delete(`/admin/subscriptions/${plan._id}`)
        setActionSuccess(data.message || 'Plan deleted.')
        fetchPlans()
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
      const msg = getErrorMessage(error, 'Action failed.')
      setConfirmError(msg)
      setActionError(msg)
    } finally {
      setConfirmSubmitting(false)
    }
  }

  const handleCloseForm = () => {
    setFormOpen(false)
    setEditingPlan(null)
    setFormError(null)
    form.reset(EMPTY_FORM)
  }

  /* ─── Render ─────────────────────────────────────────────────────────── */

  /* ── Edit / Create inline view ── */
  if (formOpen) {
    const isEditing = !!editingPlan
    const watchedFeatures = form.watch('planFeatures') || ''
    const featureList = watchedFeatures.split('\n').map((f) => f.trim()).filter(Boolean)

    return (
      <div className="animate-fade-up space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={handleCloseForm} className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600">
            &larr; <span>Back to Subscriptions</span>
          </button>
          <span className="text-slate-300">|</span>
          <h2 className="text-xl font-bold text-slate-900">
            {isEditing ? `Edit Plan: ${editingPlan.planName}` : 'Create New Plan'}
          </h2>
        </div>

        {/* Cautionary Notice */}
        {isEditing && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
            <span className="mt-0.5 text-lg">⚠</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">Cautionary Notice</p>
              <p className="mt-0.5 text-xs text-amber-700">
                Partners currently on this plan will be affected. Changes will apply at their next billing cycle.
              </p>
            </div>
          </div>
        )}

        {formError && <Alert variant="destructive">{formError}</Alert>}

        <form onSubmit={form.handleSubmit(onSubmitPlan)} noValidate>
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">

            {/* Left — Plan Configuration */}
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-5 text-base font-bold text-slate-900">Plan Configuration</h3>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="planName" className="text-xs font-semibold text-slate-500">Plan Name</Label>
                    <Input id="planName" className="h-11" {...form.register('planName')} />
                    {form.formState.errors.planName && <p className="text-xs text-red-500">{form.formState.errors.planName.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="price" className="text-xs font-semibold text-slate-500">Base Price (Monthly)</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                      <Input id="price" type="number" min={0} step="1000" className="h-11 pl-7" {...form.register('price', { valueAsNumber: true })} />
                    </div>
                    {form.formState.errors.price && <p className="text-xs text-red-500">{form.formState.errors.price.message}</p>}
                  </div>
                </div>

                <div className="mt-5 space-y-1.5">
                  <Label htmlFor="description" className="text-xs font-semibold text-slate-500">Description</Label>
                  <Textarea id="description" className="min-h-[90px] resize-none" {...form.register('description')} />
                </div>

                <div className="mt-5 grid gap-5 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="maxBuses" className="text-xs font-semibold text-slate-500">Vehicle Limit</Label>
                    <Input id="maxBuses" type="number" min={0} className="h-11" {...form.register('maxBuses', { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="maxRoutes" className="text-xs font-semibold text-slate-500">Max Routes</Label>
                    <Input id="maxRoutes" type="number" min={0} className="h-11" {...form.register('maxRoutes', { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="durationDays" className="text-xs font-semibold text-slate-500">Billing Frequency</Label>
                    <Select
                      value={String(form.watch('durationDays'))}
                      onValueChange={(v) => form.setValue('durationDays', Number(v))}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">Monthly</SelectItem>
                        <SelectItem value="90">Quarterly</SelectItem>
                        <SelectItem value="365">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="code" className="text-xs font-semibold text-slate-500">Plan Code</Label>
                    <Input id="code" className="h-11" {...form.register('code')} />
                    {form.formState.errors.code && <p className="text-xs text-red-500">{form.formState.errors.code.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="discount" className="text-xs font-semibold text-slate-500">Discount (%)</Label>
                    <Input id="discount" type="number" min={0} className="h-11" {...form.register('discount', { valueAsNumber: true })} />
                  </div>
                </div>
              </div>

              {/* Features & Capabilities */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-base font-bold text-slate-900">Features & Capabilities</h3>
                <Textarea
                  id="planFeatures"
                  placeholder={'Unlimited bookings\nPriority support 24/7\nAdvanced analytics dashboard'}
                  className="min-h-[100px] resize-none"
                  {...form.register('planFeatures')}
                />
                <p className="mt-2 text-[11px] text-slate-400">Enter one feature per line</p>

                {featureList.length > 0 && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {featureList.map((f, i) => (
                      <div key={i} className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-blue-600" />
                        <span className="text-sm text-slate-700">{f}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right — Revision Summary */}
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-base font-bold text-slate-900">Revision Summary</h3>

                <div className="space-y-4 text-sm">
                  {isEditing && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Affected Partners</span>
                      <span className="font-semibold text-slate-800">-</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Features Count</span>
                    <span className="font-semibold text-slate-800">{featureList.length}</span>
                  </div>
                  {isEditing && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Last Modified</span>
                      <span className="font-semibold text-slate-800">
                        {new Date(editingPlan.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Chart color + popular */}
                <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500">Chart Color</Label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {COLOR_OPTIONS.map((c) => {
                        const selected = form.watch('chartColor') === c.value
                        return (
                          <button
                            key={c.value}
                            type="button"
                            title={c.label}
                            onClick={() => form.setValue('chartColor', selected ? '' : c.value)}
                            className={cn(
                              'flex size-8 items-center justify-center rounded-lg border-2 transition-all',
                              selected ? 'border-slate-900 scale-110' : 'border-transparent hover:scale-110',
                            )}
                          >
                            <span className="size-5 rounded-md shadow-sm" style={{ backgroundColor: c.value }} />
                          </button>
                        )
                      })}
                    </div>
                    {form.watch('chartColor') && (
                      <p className="text-[11px] text-slate-400">
                        Selected: {COLOR_OPTIONS.find((c) => c.value === form.watch('chartColor'))?.label}
                      </p>
                    )}
                  </div>
                  <label className="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 cursor-pointer">
                    <input type="checkbox" className="size-4 rounded accent-blue-600" {...form.register('isPopular')} />
                    <div>
                      <p className="text-sm font-medium text-slate-700">Mark as Popular</p>
                      <p className="text-[11px] text-slate-400">Highlight in plan listings</p>
                    </div>
                  </label>
                </div>

                {/* Actions */}
                <div className="mt-5 space-y-2.5">
                  <Button
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    className="h-11 w-full gap-2 bg-orange-500 text-white hover:bg-orange-600"
                  >
                    {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
                    Save Changes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full"
                    onClick={handleCloseForm}
                    disabled={form.formState.isSubmitting}
                  >
                    Discard Changes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    )
  }

  /* ── Detail inline view ── */
  if (detailPlan) {
    const cycle = detailPlan.durationDays <= 31 ? 'Monthly' : detailPlan.durationDays <= 93 ? 'Quarterly' : 'Yearly'
    const cycleSuffix = detailPlan.durationDays <= 31 ? '/mo' : detailPlan.durationDays <= 93 ? '/qtr' : '/yr'

    return (
      <div className="animate-fade-up space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-slate-400">
          <button onClick={() => setDetailPlan(null)} className="hover:text-blue-600">Subscriptions</button>
          <span>&gt;</span>
          <span className="font-semibold text-slate-700">Plan Detail</span>
        </div>

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setDetailPlan(null)} className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700">&larr;</button>
            <h2 className="text-2xl font-bold text-slate-900">{detailPlan.planName}</h2>
            <Badge className={cn(
              'text-xs',
              detailPlan.status === 'ACTIVE' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600',
            )}>
              {detailPlan.status}
            </Badge>
            {detailPlan.isPopular && <Star className="size-4 fill-amber-400 text-amber-400" />}
          </div>
          <Button onClick={() => { setDetailPlan(null); openEditForm(detailPlan) }} variant="outline" className="gap-2">
            <Pencil className="size-4" />
            Edit Plan
          </Button>
        </div>

        {/* Row 1: Summary + Features */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Plan Summary */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h4 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Plan Summary</h4>
            <p className="text-4xl font-bold tracking-tight text-slate-900">
              {formatCurrency(detailPlan.price)}
              <span className="ml-1 text-sm font-normal text-slate-400">{cycleSuffix}</span>
            </p>

            <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Billing Cycle</p>
                <p className="mt-1 font-medium text-slate-800">{cycle}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Created Date</p>
                <p className="mt-1 font-medium text-slate-800">
                  {new Date(detailPlan.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">Plan Status</p>
                <p className="text-[11px] text-slate-400">Visible to new partners</p>
              </div>
              <div className={cn(
                'relative h-6 w-11 rounded-full transition-colors',
                detailPlan.status === 'ACTIVE' ? 'bg-blue-500' : 'bg-slate-300',
              )}>
                <span className={cn(
                  'absolute top-0.5 size-5 rounded-full bg-white shadow transition-all',
                  detailPlan.status === 'ACTIVE' ? 'right-0.5' : 'left-0.5',
                )} />
              </div>
            </div>
          </div>

          {/* Included Features */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h4 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Included Features</h4>
            {detailPlan.planFeatures.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {detailPlan.planFeatures.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-blue-600" />
                    <span className="text-sm text-slate-700">{feature}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No features defined.</p>
            )}

            {detailPlan.description && (
              <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-3">
                <CreditCard className="mt-0.5 size-4 shrink-0 text-blue-600" />
                <p className="text-xs leading-relaxed text-slate-600">{detailPlan.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Stat cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Max Buses',  value: detailPlan.maxBuses },
            { label: 'Max Routes', value: detailPlan.maxRoutes },
            { label: 'Discount',   value: `${detailPlan.discount}%` },
            { label: 'Duration',   value: `${detailPlan.durationDays}d` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">{label}</p>
            </div>
          ))}
        </div>

        {/* Row 3: Footer info */}
        <div className="flex flex-wrap items-center justify-between rounded-xl border border-slate-100 bg-white px-5 py-3 text-sm shadow-sm">
          <div className="flex items-center gap-4">
            <span className="text-slate-400">Code:</span>
            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">{detailPlan.code}</span>
            {detailPlan.chartColor && (
              <>
                <span className="text-slate-200">|</span>
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  Color: <span className="size-3.5 rounded" style={{ backgroundColor: detailPlan.chartColor }} />
                </span>
              </>
            )}
          </div>
          <span className="text-xs text-slate-400">Updated {formatDate(detailPlan.updatedAt)}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-up space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Subscription Plans</h2>
          <p className="mt-1 text-sm text-slate-500">Manage pricing plans available to bus operator partners.</p>
        </div>
        <Button onClick={openCreateForm} className="gap-2 bg-orange-500 text-white hover:bg-orange-600">
          <Plus className="size-4" />
          Create New Plan
        </Button>
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
          { label: 'Total Plans',       value: String(stats.total),                   sub: 'Global availability', icon: Calendar,     border: 'border-blue-500',   iconBg: 'bg-blue-50',    iconColor: 'text-blue-600'    },
          { label: 'Active Plans',      value: String(stats.active),                  sub: 'Healthy status',      icon: CheckCircle2, border: 'border-emerald-500', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
          { label: 'Total Subscribers', value: '-',                                   sub: 'All partners',        icon: Users,        border: 'border-violet-500', iconBg: 'bg-violet-50',  iconColor: 'text-violet-600'  },
          { label: 'Monthly Revenue',   value: formatCurrency(stats.totalRevenue),    sub: 'Active plans sum',    icon: DollarSign,   border: 'border-amber-500',  iconBg: 'bg-amber-50',   iconColor: 'text-amber-600'   },
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

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1" style={{ maxWidth: 300 }}>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by plan name or feature..."
            className="h-10 pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-10 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {listError && <Alert variant="destructive">{listError}</Alert>}

      {/* ── Table ── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-800 hover:bg-slate-800">
              <TableHead className="rounded-tl-xl text-[11px] font-bold uppercase tracking-wider text-slate-300">Plan Name</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Price/Month</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Billing Cycle</TableHead>
              <TableHead className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-300">Features</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Limits</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Status</TableHead>
              <TableHead className="rounded-tr-xl text-center text-[11px] font-bold uppercase tracking-wider text-slate-300">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <PlanTableSkeleton />
            ) : filteredPlans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <CreditCard className="size-10 opacity-25" />
                    <p className="font-medium">No subscription plans found</p>
                    <p className="text-xs text-slate-300">Create your first plan to get started</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredPlans.map((plan, i) => (
                <TableRow
                  key={plan._id}
                  className="animate-row-in border-l-2 border-l-transparent transition-colors hover:bg-slate-50/60"
                  style={{
                    animationDelay: `${i * 30}ms`,
                    animationFillMode: 'both',
                    borderLeftColor: plan.chartColor || undefined,
                  }}
                >
                  {/* Plan Name */}
                  <TableCell>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-slate-800">{plan.planName}</p>
                        {plan.isPopular && <Star className="size-3.5 fill-amber-400 text-amber-400" />}
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-400">{plan.description || plan.code}</p>
                    </div>
                  </TableCell>

                  {/* Price */}
                  <TableCell className="font-semibold tabular-nums text-slate-800">
                    {formatCurrency(plan.price)}
                  </TableCell>

                  {/* Billing Cycle */}
                  <TableCell className="text-sm text-slate-600">
                    {plan.durationDays <= 31 ? 'Monthly' : plan.durationDays <= 93 ? 'Quarterly' : 'Yearly'}
                  </TableCell>

                  {/* Features count */}
                  <TableCell className="text-center">
                    <span className="inline-flex size-8 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                      {plan.planFeatures.length}
                    </span>
                  </TableCell>

                  {/* Limits */}
                  <TableCell className="text-sm text-slate-600">
                    {plan.maxBuses} buses / {plan.maxRoutes} routes
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        'size-2 rounded-full',
                        plan.status === 'ACTIVE' ? 'bg-emerald-500' : plan.status === 'INACTIVE' ? 'bg-amber-500' : 'bg-slate-300',
                      )} />
                      <span className={cn(
                        'text-xs font-medium',
                        plan.status === 'ACTIVE' ? 'text-emerald-700' : plan.status === 'INACTIVE' ? 'text-amber-700' : 'text-slate-500',
                      )}>
                        {plan.status}
                      </span>
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setDetailPlan(plan)}
                        className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
                        title="View"
                      >
                        <Eye className="size-4" />
                      </button>
                      <button
                        onClick={() => plan.status !== 'DELETED' && openEditForm(plan)}
                        className={cn(
                          'flex size-8 items-center justify-center rounded-lg transition-colors',
                          plan.status === 'DELETED' ? 'cursor-not-allowed text-slate-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600',
                        )}
                        title="Edit"
                      >
                        <Pencil className="size-4" />
                      </button>
                      {plan.status !== 'DELETED' && (
                        <button
                          onClick={() => openStatusToggle(plan)}
                          className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-amber-600"
                          title={plan.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        >
                          <Power className="size-4" />
                        </button>
                      )}
                      {plan.status !== 'DELETED' && (
                        <button
                          onClick={() => openDeleteConfirm(plan)}
                          className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination info ── */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Showing {filteredPlans.length} of {plans.length} plans
        </p>
      </div>



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

export default SubscriptionsPage
