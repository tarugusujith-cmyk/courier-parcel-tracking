import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  Check,
  CircleDollarSign,
  Clock3,
  Edit2,
  LoaderCircle,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Truck,
  X,
} from 'lucide-react'
import DashboardLayout from '../../components/ui/dashboard/DashboardLayout'
import api from '../../services/api'
import type { Pricing, DeliveryType } from '../../types'

type PricingFormValues = {
  deliveryType: DeliveryType
  baseWeight: string
  basePrice: string
  additionalKgPrice: string
  active: boolean
}

const initialForm: PricingFormValues = {
  deliveryType: 'standard',
  baseWeight: '1',
  basePrice: '',
  additionalKgPrice: '',
  active: true,
}

const deliveryTypeLabels: Record<DeliveryType, string> = {
  standard: 'Standard',
  express: 'Express',
  same_day: 'Same Day',
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)

export default function PricingPage() {
  const [pricingRules, setPricingRules] = useState<Pricing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<Pricing | null>(null)
  const [formValues, setFormValues] = useState<PricingFormValues>(initialForm)
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [deletingRule, setDeletingRule] = useState<Pricing | null>(null)
  const [toast, setToast] = useState('')

  const loadPricing = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')

    try {
      const response = await api.get<Pricing[]>('/pricing')
      setPricingRules(response.data)
    } catch {
      setLoadError('Unable to load pricing rules. Make sure JSON Server is running on port 5000.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPricing()
  }, [loadPricing])

  useEffect(() => {
    if (!toast) return

    const timeoutId = window.setTimeout(() => setToast(''), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [toast])

  const activeCount = pricingRules.filter((rule) => rule.active).length
  const inactiveCount = pricingRules.length - activeCount
  const averageBasePrice = pricingRules.length
    ? pricingRules.reduce((total, rule) => total + rule.basePrice, 0) / pricingRules.length
    : 0

  const filteredRules = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return pricingRules.filter((rule) => {
      const matchesSearch =
        !normalizedSearch ||
        deliveryTypeLabels[rule.deliveryType].toLowerCase().includes(normalizedSearch) ||
        rule.id.toLowerCase().includes(normalizedSearch)
      const matchesStatus =
        statusFilter === 'all' || (statusFilter === 'active' ? rule.active : !rule.active)

      return matchesSearch && matchesStatus
    })
  }, [pricingRules, searchTerm, statusFilter])

  function openCreateModal() {
    setEditingRule(null)
    setFormValues(initialForm)
    setFormError('')
    setIsModalOpen(true)
  }

  function openEditModal(rule: Pricing) {
    setEditingRule(rule)
    setFormValues({
      deliveryType: rule.deliveryType,
      baseWeight: String(rule.baseWeight),
      basePrice: String(rule.basePrice),
      additionalKgPrice: String(rule.additionalKgPrice),
      active: rule.active,
    })
    setFormError('')
    setIsModalOpen(true)
  }

  function closeModal() {
    if (isSaving) return
    setIsModalOpen(false)
    setEditingRule(null)
    setFormError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')

    const baseWeight = Number(formValues.baseWeight)
    const basePrice = Number(formValues.basePrice)
    const additionalKgPrice = Number(formValues.additionalKgPrice)

    if (
      !formValues.baseWeight.trim() ||
      !formValues.basePrice.trim() ||
      !formValues.additionalKgPrice.trim() ||
      !Number.isFinite(baseWeight) ||
      !Number.isFinite(basePrice) ||
      !Number.isFinite(additionalKgPrice)
    ) {
      setFormError('Enter a valid number for each weight and price field.')
      return
    }

    if (baseWeight <= 0 || basePrice < 0 || additionalKgPrice < 0) {
      setFormError('Base weight must be greater than zero. Prices cannot be negative.')
      return
    }

    const duplicateType = pricingRules.some(
      (rule) => rule.deliveryType === formValues.deliveryType && rule.id !== editingRule?.id,
    )

    if (duplicateType) {
      setFormError('A pricing rule already exists for this delivery type. Edit that rule instead.')
      return
    }

    const payload: Omit<Pricing, 'id'> = {
      deliveryType: formValues.deliveryType,
      baseWeight,
      basePrice,
      additionalKgPrice,
      active: formValues.active,
    }

    setIsSaving(true)

    try {
      if (editingRule) {
        const response = await api.patch<Pricing>(`/pricing/${editingRule.id}`, payload)
        setPricingRules((current) =>
          current.map((rule) => (rule.id === editingRule.id ? response.data : rule)),
        )
        setToast('Pricing rule updated successfully.')
      } else {
        const response = await api.post<Pricing>('/pricing', payload)
        setPricingRules((current) => [...current, response.data])
        setToast('Pricing rule created successfully.')
      }

      setIsModalOpen(false)
      setEditingRule(null)
    } catch {
      setFormError('Could not save the pricing rule. Check that JSON Server is running and try again.')
    } finally {
      setIsSaving(false)
    }
  }

  async function toggleRuleStatus(rule: Pricing) {
    try {
      const response = await api.patch<Pricing>(`/pricing/${rule.id}`, {
        active: !rule.active,
      })
      setPricingRules((current) =>
        current.map((item) => (item.id === rule.id ? response.data : item)),
      )
      setToast(`Pricing rule ${response.data.active ? 'activated' : 'deactivated'}.`)
    } catch {
      setToast('Could not update the pricing rule status.')
    }
  }

  async function handleDelete() {
    if (!deletingRule) return

    try {
      await api.delete(`/pricing/${deletingRule.id}`)
      setPricingRules((current) => current.filter((rule) => rule.id !== deletingRule.id))
      setToast('Pricing rule deleted successfully.')
      setDeletingRule(null)
    } catch {
      setToast('Could not delete the pricing rule. Please try again.')
    }
  }

  return (
    <DashboardLayout>
      <main className="min-w-0 space-y-6 p-1 text-slate-900 dark:text-slate-100">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Operations / Configuration</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Pricing Management</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Configure delivery rates for each QuickShip service.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus size={18} /> Add Pricing Rule
          </button>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total pricing rules"
            value={String(pricingRules.length)}
            description="Configured delivery services"
            icon={<CircleDollarSign size={20} />}
            iconClass="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
          />
          <SummaryCard
            title="Active rules"
            value={String(activeCount)}
            description="Currently available for use"
            icon={<ShieldCheck size={20} />}
            iconClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
          />
          <SummaryCard
            title="Inactive rules"
            value={String(inactiveCount)}
            description="Temporarily unavailable"
            icon={<Clock3 size={20} />}
            iconClass="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
          />
          <SummaryCard
            title="Average base price"
            value={formatCurrency(averageBasePrice)}
            description="Across all configured rules"
            icon={<Truck size={20} />}
            iconClass="bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <div>
              <h2 className="font-semibold">Delivery rate cards</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Manage base rates and extra weight charges.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative block">
                <span className="sr-only">Search pricing rules</span>
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search service or ID"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 sm:w-56 dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                aria-label="Filter by status"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {loadError && (
            <div className="m-4 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              <p>{loadError}</p>
              <button type="button" onClick={() => void loadPricing()} className="font-semibold underline">
                Retry
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <LoaderCircle size={20} className="animate-spin" /> Loading pricing rules...
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
              <div className="rounded-full bg-slate-100 p-3 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                <CircleDollarSign size={24} />
              </div>
              <h3 className="mt-3 font-semibold">No pricing rules found</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Try another search or create a new pricing rule.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/60 dark:text-slate-400">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Service</th>
                      <th className="px-5 py-4 font-semibold">Base weight</th>
                      <th className="px-5 py-4 font-semibold">Base price</th>
                      <th className="px-5 py-4 font-semibold">Additional / kg</th>
                      <th className="px-5 py-4 font-semibold">Status</th>
                      <th className="px-5 py-4 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredRules.map((rule) => (
                      <tr key={rule.id} className="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <ServiceIcon deliveryType={rule.deliveryType} />
                            <div>
                              <p className="font-semibold">{deliveryTypeLabels[rule.deliveryType]}</p>
                              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{rule.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">{rule.baseWeight} kg</td>
                        <td className="px-5 py-4 font-semibold">{formatCurrency(rule.basePrice)}</td>
                        <td className="px-5 py-4">{formatCurrency(rule.additionalKgPrice)}</td>
                        <td className="px-5 py-4"><StatusBadge active={rule.active} /></td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(rule)}
                              title="Edit pricing rule"
                              aria-label={`Edit ${deliveryTypeLabels[rule.deliveryType]} pricing`}
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
                            >
                              <Edit2 size={17} />
                            </button>
                            <button
                              type="button"
                              onClick={() => void toggleRuleStatus(rule)}
                              title={rule.active ? 'Deactivate rule' : 'Activate rule'}
                              aria-label={`${rule.active ? 'Deactivate' : 'Activate'} ${deliveryTypeLabels[rule.deliveryType]} pricing`}
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
                            >
                              {rule.active ? <X size={17} /> : <Check size={17} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingRule(rule)}
                              title="Delete pricing rule"
                              aria-label={`Delete ${deliveryTypeLabels[rule.deliveryType]} pricing`}
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 p-4 md:hidden">
                {filteredRules.map((rule) => (
                  <article key={rule.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <ServiceIcon deliveryType={rule.deliveryType} />
                        <div>
                          <h3 className="font-semibold">{deliveryTypeLabels[rule.deliveryType]}</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{rule.id}</p>
                        </div>
                      </div>
                      <StatusBadge active={rule.active} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <Metric label="Base weight" value={`${rule.baseWeight} kg`} />
                      <Metric label="Base price" value={formatCurrency(rule.basePrice)} />
                      <Metric label="Additional / kg" value={formatCurrency(rule.additionalKgPrice)} />
                    </div>
                    <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                      <button type="button" onClick={() => openEditModal(rule)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold dark:border-slate-700">
                        <Edit2 size={14} /> Edit
                      </button>
                      <button type="button" onClick={() => void toggleRuleStatus(rule)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold dark:border-slate-700">
                        {rule.active ? <X size={14} /> : <Check size={14} />}
                        {rule.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button type="button" onClick={() => setDeletingRule(rule)} aria-label="Delete pricing rule" className="rounded-lg border border-red-200 px-3 py-2 text-red-600 dark:border-red-900/60 dark:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Showing {filteredRules.length} of {pricingRules.length} pricing {pricingRules.length === 1 ? 'rule' : 'rules'}
          </div>
        </section>

        <section className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 sm:p-5 dark:border-blue-900/50 dark:bg-blue-950/20">
          <h2 className="font-semibold text-blue-950 dark:text-blue-200">How pricing is calculated</h2>
          <p className="mt-1 text-sm text-blue-900/80 dark:text-blue-300/80">
            The base price covers the configured base weight. Each additional kilogram is charged at the rule's additional-per-kg rate. Connect this calculation to shipment creation to apply the rates when a parcel is booked.
          </p>
        </section>
      </main>

      {isModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal()
          }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="pricing-modal-title" className="my-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-slate-800">
              <div>
                <h2 id="pricing-modal-title" className="text-lg font-bold">{editingRule ? 'Edit pricing rule' : 'Add pricing rule'}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Set the weight and rate for a delivery service.</p>
              </div>
              <button type="button" onClick={closeModal} disabled={isSaving} aria-label="Close dialog" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4 p-5">
              <FormField label="Delivery type" htmlFor="deliveryType">
                <select
                  id="deliveryType"
                  value={formValues.deliveryType}
                  onChange={(event) => setFormValues((current) => ({ ...current, deliveryType: event.target.value as DeliveryType }))}
                  disabled={Boolean(editingRule)}
                  className="form-control"
                >
                  <option value="standard">Standard</option>
                  <option value="express">Express</option>
                  <option value="same_day">Same Day</option>
                </select>
                {editingRule && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Delivery type cannot be changed when editing a rule.</p>}
              </FormField>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField label="Base weight (kg)" htmlFor="baseWeight">
                  <input id="baseWeight" type="number" min="0.01" step="0.01" required value={formValues.baseWeight} onChange={(event) => setFormValues((current) => ({ ...current, baseWeight: event.target.value }))} className="form-control" />
                </FormField>
                <FormField label="Base price (₹)" htmlFor="basePrice">
                  <input id="basePrice" type="number" min="0" step="0.01" required value={formValues.basePrice} onChange={(event) => setFormValues((current) => ({ ...current, basePrice: event.target.value }))} className="form-control" />
                </FormField>
                <FormField label="Extra / kg (₹)" htmlFor="additionalKgPrice">
                  <input id="additionalKgPrice" type="number" min="0" step="0.01" required value={formValues.additionalKgPrice} onChange={(event) => setFormValues((current) => ({ ...current, additionalKgPrice: event.target.value }))} className="form-control" />
                </FormField>
              </div>

              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <span>
                  <span className="block text-sm font-semibold">Rule active</span>
                  <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">Active rules can be selected for new shipments.</span>
                </span>
                <input type="checkbox" checked={formValues.active} onChange={(event) => setFormValues((current) => ({ ...current, active: event.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              </label>

              {formError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{formError}</p>}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end dark:border-slate-800">
                <button type="button" onClick={closeModal} disabled={isSaving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800">Cancel</button>
                <button type="submit" disabled={isSaving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {isSaving && <LoaderCircle size={16} className="animate-spin" />}
                  {editingRule ? 'Save changes' : 'Create pricing rule'}
                </button>
              </div>
            </form>
          </section>
        </div>,
        document.body,
      )}

      {deletingRule && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <section role="alertdialog" aria-modal="true" aria-labelledby="delete-pricing-title" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"><Trash2 size={20} /></div>
            <h2 id="delete-pricing-title" className="mt-4 text-lg font-bold">Delete pricing rule?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              This will permanently delete the {deliveryTypeLabels[deletingRule.deliveryType]} pricing rule. This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setDeletingRule(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold dark:border-slate-700">Cancel</button>
              <button type="button" onClick={() => void handleDelete()} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700">Delete rule</button>
            </div>
          </section>
        </div>,
        document.body,
      )}

      {toast && (
        <div role="status" className="fixed bottom-5 right-5 z-[70] max-w-sm rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl dark:bg-slate-100 dark:text-slate-900">
          {toast}
        </div>
      )}

      <style>{`
        .form-control {
          display: block;
          width: 100%;
          border: 1px solid rgb(226 232 240);
          border-radius: 0.75rem;
          background: white;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 150ms, box-shadow 150ms;
        }
        .form-control:focus {
          border-color: rgb(59 130 246);
          box-shadow: 0 0 0 3px rgb(59 130 246 / 15%);
        }
        .form-control:disabled {
          cursor: not-allowed;
          opacity: 0.65;
        }
        .dark .form-control {
          border-color: rgb(51 65 85);
          background: rgb(2 6 23);
          color: rgb(241 245 249);
        }
      `}</style>
    </DashboardLayout>
  )
}

function SummaryCard({
  title,
  value,
  description,
  icon,
  iconClass,
}: {
  title: string
  value: string
  description: string
  icon: ReactNode
  iconClass: string
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
        </div>
        <div className={`rounded-xl p-3 ${iconClass}`}>{icon}</div>
      </div>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{description}</p>
    </article>
  )
}

function ServiceIcon({ deliveryType }: { deliveryType: DeliveryType }) {
  const iconStyles: Record<DeliveryType, string> = {
    standard: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
    express: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
    same_day: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  }

  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconStyles[deliveryType]}`}>
      {deliveryType === 'standard' ? <Truck size={19} /> : deliveryType === 'express' ? <Clock3 size={19} /> : <CircleDollarSign size={19} />}
    </div>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  )
}

function FormField({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      {children}
    </div>
  )
}
