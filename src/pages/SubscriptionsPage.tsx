import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CreditCard, Loader2, Plus, Star } from 'lucide-react'
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
import type { SubscriptionPlan } from '@/types/admin'

/* ─── Constants ─────────────────────────────────────────────────────────── */

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL',      label: 'Active & Inactive' },
  { value: 'ACTIVE',   label: 'Active'            },
  { value: 'INACTIVE', label: 'Inactive'           },
  { value: 'DELETED',  label: 'Deleted'            },
]

const STATUS_BADGE: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE:   'default',
  INACTIVE: 'secondary',
  DELETED:  'outline',
}

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

/* ─── Skeleton ───────────────────────────────────────────────────────────── */

function Sk({ className }: { className?: string }) {
  return <div className={cn('animate-pulse-soft rounded bg-slate-100', className)} />
}

function PlanTableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Sk className="h-4 w-32" /></TableCell>
          <TableCell><Sk className="h-4 w-20" /></TableCell>
          <TableCell><Sk className="h-4 w-20" /></TableCell>
          <TableCell><Sk className="h-4 w-16" /></TableCell>
          <TableCell><Sk className="h-4 w-10" /></TableCell>
          <TableCell><Sk className="h-4 w-28" /></TableCell>
          <TableCell><Sk className="h-5 w-16 rounded-full" /></TableCell>
          <TableCell>
            <div className="flex justify-end gap-1.5">
              <Sk className="h-7 w-10 rounded-md" />
              <Sk className="h-7 w-20 rounded-md" />
              <Sk className="h-7 w-14 rounded-md" />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

function SubscriptionsPage() {
  const [plans,       setPlans]       = useState<SubscriptionPlan[]>([])
  const [status,      setStatus]      = useState('ALL')
  const [loading,     setLoading]     = useState(true)
  const [listError,   setListError]   = useState<string | null>(null)

  const [actionError,   setActionError]   = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const [formOpen,     setFormOpen]     = useState(false)
  const [editingPlan,  setEditingPlan]  = useState<SubscriptionPlan | null>(null)
  const [formError,    setFormError]    = useState<string | null>(null)

  const [confirmAction,     setConfirmAction]     = useState<ConfirmAction | null>(null)
  const [confirmSubmitting, setConfirmSubmitting] = useState(false)
  const [confirmError,      setConfirmError]      = useState<string | null>(null)

  const form = useForm<PlanFormValues>({ resolver: zodResolver(planSchema), defaultValues: EMPTY_FORM })

  /* ── Auto-dismiss success alert ── */
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

  /* ── Submit plan ── */
  const onSubmitPlan = async (values: PlanFormValues) => {
    setFormError(null)

    const payload = {
      planName:     values.planName,
      code:         values.code,
      price:        values.price,
      durationDays: values.durationDays,
      discount:     values.discount,
      maxBuses:     values.maxBuses,
      maxRoutes:    values.maxRoutes,
      description:  values.description || undefined,
      chartColor:   values.chartColor  || undefined,
      isPopular:    values.isPopular ?? false,
      planFeatures: values.planFeatures
        ? values.planFeatures.split('\n').map((f) => f.trim()).filter(Boolean)
        : [],
    }

    try {
      const { data } = editingPlan
        ? await api.patch(`/admin/subscriptions/${editingPlan._id}`, payload)
        : await api.post('/admin/subscriptions', payload)

      setActionError(null)
      setActionSuccess(
        data.message || (editingPlan ? 'Subscription plan updated successfully.' : 'Subscription plan created successfully.')
      )
      setFormOpen(false)
      fetchPlans()
    } catch (error) {
      setFormError(getErrorMessage(error, 'Failed to save subscription plan.'))
    }
  }

  /* ── Status toggle ── */
  const openStatusToggle = (plan: SubscriptionPlan) => {
    const next = plan.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    setConfirmError(null)
    setConfirmAction({
      title:        next === 'ACTIVE' ? 'Activate Plan'   : 'Deactivate Plan',
      description:  `This will ${next === 'ACTIVE' ? 'activate' : 'deactivate'} "${plan.planName}".`,
      confirmLabel: next === 'ACTIVE' ? 'Activate'        : 'Deactivate',
      onConfirm: async () => {
        const { data } = await api.patch(`/admin/subscriptions/${plan._id}/status`, { status: next })
        setActionSuccess(data.message || 'Subscription plan status updated.')
        fetchPlans()
      },
    })
  }

  /* ── Delete ── */
  const openDeleteConfirm = (plan: SubscriptionPlan) => {
    setConfirmError(null)
    setConfirmAction({
      title:        'Delete Plan',
      description:  `This will soft-delete "${plan.planName}". Partners on this plan will not be affected immediately.`,
      confirmLabel: 'Delete',
      variant:      'destructive',
      onConfirm: async () => {
        const { data } = await api.delete(`/admin/subscriptions/${plan._id}`)
        setActionSuccess(data.message || 'Subscription plan deleted successfully.')
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Subscriptions</h2>
          <p className="mt-1 text-sm text-slate-500">Manage subscription plans available to partners.</p>
        </div>
        <Button onClick={openCreateForm} className="gap-2">
          <Plus className="size-4" />
          Create Plan
        </Button>
      </div>

      {/* Action alerts */}
      {actionError   && <Alert variant="destructive" onDismiss={() => setActionError(null)}>{actionError}</Alert>}
      {actionSuccess && <Alert variant="success"     onDismiss={() => setActionSuccess(null)}>{actionSuccess}</Alert>}

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48">
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

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80">
              <TableHead className="rounded-tl-xl font-semibold text-slate-600">Plan</TableHead>
              <TableHead className="font-semibold text-slate-600">Code</TableHead>
              <TableHead className="font-semibold text-slate-600">Price</TableHead>
              <TableHead className="font-semibold text-slate-600">Duration</TableHead>
              <TableHead className="font-semibold text-slate-600">Discount</TableHead>
              <TableHead className="font-semibold text-slate-600">Limits</TableHead>
              <TableHead className="font-semibold text-slate-600">Status</TableHead>
              <TableHead className="rounded-tr-xl text-right font-semibold text-slate-600">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <PlanTableSkeleton />
            ) : plans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <CreditCard className="size-10 opacity-25" />
                    <p className="font-medium">No subscription plans found</p>
                    <p className="text-xs text-slate-300">Create your first plan to get started</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              plans.map((plan, i) => (
                <TableRow
                  key={plan._id}
                  className="animate-row-in transition-colors hover:bg-slate-50/60"
                  style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'both' }}
                >
                  <TableCell className="font-medium text-slate-800">
                    <div className="flex items-center gap-1.5">
                      {plan.planName}
                      {plan.isPopular && <Star className="size-3.5 fill-amber-400 text-amber-400" />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">
                      {plan.code}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium tabular-nums text-slate-700">
                    {formatCurrency(plan.price)}
                  </TableCell>
                  <TableCell className="text-slate-500">{plan.durationDays} days</TableCell>
                  <TableCell className="text-slate-500">{plan.discount}%</TableCell>
                  <TableCell className="text-slate-500">
                    {plan.maxBuses} buses / {plan.maxRoutes} routes
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE[plan.status] ?? 'outline'}>{plan.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={plan.status === 'DELETED'}
                        onClick={() => openEditForm(plan)}
                      >
                        Edit
                      </Button>
                      {plan.status !== 'DELETED' && (
                        <Button variant="secondary" size="sm" onClick={() => openStatusToggle(plan)}>
                          {plan.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </Button>
                      )}
                      {plan.status !== 'DELETED' && (
                        <Button variant="destructive" size="sm" onClick={() => openDeleteConfirm(plan)}>
                          Delete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ─── Create / Edit Dialog ─────────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Edit Subscription Plan' : 'Create Subscription Plan'}</DialogTitle>
            <DialogDescription>
              {editingPlan
                ? 'Update the details of this subscription plan.'
                : 'Define a new subscription plan for partners.'}
            </DialogDescription>
          </DialogHeader>

          {formError && <Alert variant="destructive">{formError}</Alert>}

          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmitPlan)} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="planName">Plan Name</Label>
                <Input id="planName" aria-invalid={!!form.formState.errors.planName} {...form.register('planName')} />
                {form.formState.errors.planName && (
                  <p className="text-sm text-destructive">{form.formState.errors.planName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input id="code" aria-invalid={!!form.formState.errors.code} {...form.register('code')} />
                {form.formState.errors.code && (
                  <p className="text-sm text-destructive">{form.formState.errors.code.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="price">Price (VND)</Label>
                <Input id="price" type="number" min={0} step="1000" aria-invalid={!!form.formState.errors.price} {...form.register('price', { valueAsNumber: true })} />
                {form.formState.errors.price && (
                  <p className="text-sm text-destructive">{form.formState.errors.price.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="durationDays">Duration (days)</Label>
                <Input id="durationDays" type="number" min={1} aria-invalid={!!form.formState.errors.durationDays} {...form.register('durationDays', { valueAsNumber: true })} />
                {form.formState.errors.durationDays && (
                  <p className="text-sm text-destructive">{form.formState.errors.durationDays.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount">Discount (%)</Label>
                <Input id="discount" type="number" min={0} aria-invalid={!!form.formState.errors.discount} {...form.register('discount', { valueAsNumber: true })} />
                {form.formState.errors.discount && (
                  <p className="text-sm text-destructive">{form.formState.errors.discount.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxBuses">Max Buses</Label>
                <Input id="maxBuses" type="number" min={0} aria-invalid={!!form.formState.errors.maxBuses} {...form.register('maxBuses', { valueAsNumber: true })} />
                {form.formState.errors.maxBuses && (
                  <p className="text-sm text-destructive">{form.formState.errors.maxBuses.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxRoutes">Max Routes</Label>
                <Input id="maxRoutes" type="number" min={0} aria-invalid={!!form.formState.errors.maxRoutes} {...form.register('maxRoutes', { valueAsNumber: true })} />
                {form.formState.errors.maxRoutes && (
                  <p className="text-sm text-destructive">{form.formState.errors.maxRoutes.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...form.register('description')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="planFeatures">Features (one per line)</Label>
              <Textarea
                id="planFeatures"
                placeholder={'Unlimited bookings\nPriority support\nAdvanced analytics'}
                {...form.register('planFeatures')}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="chartColor">Chart Color</Label>
                <Input id="chartColor" placeholder="#2563eb" {...form.register('chartColor')} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  id="isPopular"
                  type="checkbox"
                  className="size-4 rounded border-input accent-primary"
                  {...form.register('isPopular')}
                />
                <Label htmlFor="isPopular">Mark as popular</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={form.formState.isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {editingPlan ? 'Save Changes' : 'Create Plan'}
              </Button>
            </DialogFooter>
          </form>
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

export default SubscriptionsPage
