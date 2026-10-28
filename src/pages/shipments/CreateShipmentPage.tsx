import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  PackagePlus,
  RefreshCw,
  Scale,
  Truck,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import DashboardLayout from '../../components/ui/dashboard/DashboardLayout'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../services/api'

interface Branch {
  id: string
  name?: string
  branchName?: string
  branch_name?: string
  city?: string
  address?: string
  status?: string
}

interface PricingRule {
  id: string
  deliveryType?: string
  delivery_type?: string
  serviceType?: string
  type?: string
  name?: string
  baseWeight?: number
  basePrice?: number
  additionalKgPrice?: number
  active?: boolean
  status?: string
}

interface CreatedShipment {
  id: string
  trackingNumber: string
  customerId: string
  senderName: string
  senderPhone: string
  senderAddress: string
  receiverName: string
  receiverPhone: string
  receiverAddress: string
  destinationCity: string
  originBranchId: string
  destinationBranchId: string
  currentBranchId: string
  weight: number
  deliveryType: string
  estimatedPrice: number
  status: string
  createdAt: string
}

const inputClass =
  'w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white'

const labelClass =
  'mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300'

const initialForm = {
  senderName: '',
  senderPhone: '',
  senderAddress: '',
  receiverName: '',
  receiverPhone: '',
  receiverAddress: '',
  destinationCity: '',
  originBranchId: '',
  destinationBranchId: '',
  weight: '1',
  deliveryType: 'standard',
}

function branchLabel(branch: Branch) {
  const name = branch.name || branch.branchName || branch.branch_name || branch.id
  return branch.city ? `${name} — ${branch.city}` : name
}

function getDeliveryType(rule: PricingRule) {
  return (
    rule.deliveryType ||
    rule.delivery_type ||
    rule.serviceType ||
    rule.type ||
    rule.name ||
    ''
  )
    .toLowerCase()
    .replaceAll(' ', '_')
}

function getEstimatedPrice(
  weight: number,
  deliveryType: string,
  rules: PricingRule[],
) {
  const rule = rules.find(
    (item) =>
      getDeliveryType(item) === deliveryType &&
      item.active !== false &&
      item.status !== 'inactive',
  )

  if (!rule) return null

  const baseWeight = Number(rule.baseWeight ?? 1)
  const basePrice = Number(rule.basePrice ?? 0)
  const extraPrice = Number(rule.additionalKgPrice ?? 0)
  const extraWeight = Math.max(0, weight - baseWeight)

  return Math.round((basePrice + extraWeight * extraPrice) * 100) / 100
}

export default function CreateShipmentPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState(initialForm)
  const [branches, setBranches] = useState<Branch[]>([])
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadFormData() {
      setLoading(true)
      setError('')

      try {
        const [branchResponse, pricingResponse] = await Promise.all([
          api.get<Branch[]>('/branches'),
          api.get<PricingRule[]>('/pricing'),
        ])

        if (!mounted) return

        const availableBranches = Array.isArray(branchResponse.data)
          ? branchResponse.data.filter(
              (branch) =>
                branch.status !== 'inactive' &&
                branch.status !== 'closed',
            )
          : []

        setBranches(availableBranches)
        setPricingRules(
          Array.isArray(pricingResponse.data) ? pricingResponse.data : [],
        )

        setForm((previous) => ({
          ...previous,
          originBranchId:
            previous.originBranchId || availableBranches[0]?.id || '',
          destinationBranchId:
            previous.destinationBranchId || availableBranches[1]?.id ||
            availableBranches[0]?.id ||
            '',
        }))
      } catch {
        if (mounted) {
          setError(
            'Unable to load branches or pricing. Check that JSON Server is running on port 5000 and both endpoints are available.',
          )
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void loadFormData()

    return () => {
      mounted = false
    }
  }, [])

  const weight = Number(form.weight)

  const estimatedPrice = useMemo(
    () =>
      Number.isFinite(weight) && weight > 0
        ? getEstimatedPrice(weight, form.deliveryType, pricingRules)
        : null,
    [weight, form.deliveryType, pricingRules],
  )

  function updateField(
    field: keyof typeof initialForm,
    value: string,
  ) {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!user) {
      setError('Your session has expired. Please sign in again.')
      return
    }

    if (!user.customerId) {
      setError(
        'Your account is not linked to a customer record. Please contact the administrator.',
      )
      return
    }

    if (
      !/^[A-Za-z][A-Za-z .'-]{1,98}$/.test(form.senderName.trim()) ||
      !/^[A-Za-z][A-Za-z .'-]{1,98}$/.test(form.receiverName.trim())
    ) {
      setError('Enter valid sender and receiver names.')
      return
    }

    if (
      !/^\d{10}$/.test(form.senderPhone) ||
      !/^\d{10}$/.test(form.receiverPhone)
    ) {
      setError('Enter a valid 10-digit mobile number for both contacts.')
      return
    }

    if (
      !form.senderAddress.trim() ||
      !form.receiverAddress.trim() ||
      !form.destinationCity.trim()
    ) {
      setError('Complete all address and destination fields.')
      return
    }

    if (!Number.isFinite(weight) || weight <= 0 || weight > 1000) {
      setError('Enter a parcel weight greater than 0 and no more than 1000 kg.')
      return
    }

    if (!form.originBranchId || !form.destinationBranchId) {
      setError('Select both the origin and destination branches.')
      return
    }

    if (estimatedPrice === null) {
      setError(
        `No active pricing rule was found for ${form.deliveryType.replaceAll('_', ' ')} delivery. Check the pricing page.`,
      )
      return
    }

    setSaving(true)

    try {
      const timestamp = Date.now()
      const trackingNumber = `QS${String(timestamp).slice(-10)}`

      const payload: CreatedShipment = {
        id: `SH${timestamp}`,
        trackingNumber,
        customerId: user.customerId,
        senderName: form.senderName.trim(),
        senderPhone: form.senderPhone,
        senderAddress: form.senderAddress.trim(),
        receiverName: form.receiverName.trim(),
        receiverPhone: form.receiverPhone,
        receiverAddress: form.receiverAddress.trim(),
        destinationCity: form.destinationCity.trim(),
        originBranchId: form.originBranchId,
        destinationBranchId: form.destinationBranchId,
        currentBranchId: form.originBranchId,
        weight,
        deliveryType: form.deliveryType,
        estimatedPrice,
        status: 'shipment_created',
        createdAt: new Date().toISOString(),
      }

      await api.post('/shipments', payload)

      setSuccess(
        `Shipment created successfully! Your tracking number is ${trackingNumber}.`,
      )
      setForm(initialForm)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setError(
        'Could not create the shipment. Check JSON Server and try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-5xl space-y-6 pb-8">
        <Link
          to="/customer/shipments"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
        >
          <ArrowLeft size={16} />
          Back to My Shipments
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
              <PackagePlus size={17} />
              Customer Portal / New Shipment
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Create a Shipment
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Enter your parcel details, provide the delivery addresses, and
              review the estimated delivery charge before submitting.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <Truck size={23} />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Delivery status
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                Shipment Created
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
          >
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
          >
            <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Shipment created</p>
              <p className="mt-1 break-words">{success}</p>
              <button
                type="button"
                onClick={() => navigate('/customer/shipments')}
                className="mt-3 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
              >
                View My Shipments
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <PackagePlus size={20} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">
                  Sender Details
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Contact details for the person sending the parcel.
                </p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="senderName">
                  Sender name *
                </label>
                <input
                  id="senderName"
                  className={inputClass}
                  value={form.senderName}
                  onChange={(event) =>
                    updateField('senderName', event.target.value)
                  }
                  placeholder="Enter full name"
                  maxLength={100}
                  autoComplete="name"
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="senderPhone">
                  Sender mobile number *
                </label>
                <input
                  id="senderPhone"
                  className={inputClass}
                  value={form.senderPhone}
                  onChange={(event) =>
                    updateField(
                      'senderPhone',
                      event.target.value.replace(/\D/g, '').slice(0, 10),
                    )
                  }
                  placeholder="10-digit mobile number"
                  inputMode="numeric"
                  autoComplete="tel"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="senderAddress">
                  Pickup address *
                </label>
                <textarea
                  id="senderAddress"
                  className={inputClass}
                  value={form.senderAddress}
                  onChange={(event) =>
                    updateField('senderAddress', event.target.value)
                  }
                  placeholder="House number, street, area, city and PIN code"
                  rows={3}
                  maxLength={500}
                  required
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
                <MapPin size={20} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">
                  Receiver Details
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Provide accurate recipient details for delivery.
                </p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="receiverName">
                  Receiver name *
                </label>
                <input
                  id="receiverName"
                  className={inputClass}
                  value={form.receiverName}
                  onChange={(event) =>
                    updateField('receiverName', event.target.value)
                  }
                  placeholder="Enter receiver's full name"
                  maxLength={100}
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="receiverPhone">
                  Receiver mobile number *
                </label>
                <input
                  id="receiverPhone"
                  className={inputClass}
                  value={form.receiverPhone}
                  onChange={(event) =>
                    updateField(
                      'receiverPhone',
                      event.target.value.replace(/\D/g, '').slice(0, 10),
                    )
                  }
                  placeholder="10-digit mobile number"
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="receiverAddress">
                  Delivery address *
                </label>
                <textarea
                  id="receiverAddress"
                  className={inputClass}
                  value={form.receiverAddress}
                  onChange={(event) =>
                    updateField('receiverAddress', event.target.value)
                  }
                  placeholder="House number, street, area, city and PIN code"
                  rows={3}
                  maxLength={500}
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="destinationCity">
                  Destination city *
                </label>
                <input
                  id="destinationCity"
                  className={inputClass}
                  value={form.destinationCity}
                  onChange={(event) =>
                    updateField('destinationCity', event.target.value)
                  }
                  placeholder="e.g. Coimbatore"
                  maxLength={100}
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="destinationBranchId">
                  Destination branch *
                </label>
                <select
                  id="destinationBranchId"
                  className={inputClass}
                  value={form.destinationBranchId}
                  onChange={(event) =>
                    updateField('destinationBranchId', event.target.value)
                  }
                  disabled={loading || branches.length === 0}
                  required
                >
                  <option value="">Select destination branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branchLabel(branch)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <Scale size={20} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">
                  Parcel & Delivery
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Select the parcel weight and available delivery service.
                </p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="originBranchId">
                  Origin branch *
                </label>
                <select
                  id="originBranchId"
                  className={inputClass}
                  value={form.originBranchId}
                  onChange={(event) =>
                    updateField('originBranchId', event.target.value)
                  }
                  disabled={loading || branches.length === 0}
                  required
                >
                  <option value="">Select origin branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branchLabel(branch)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass} htmlFor="weight">
                  Parcel weight (kg) *
                </label>
                <input
                  id="weight"
                  className={inputClass}
                  type="number"
                  min="0.01"
                  max="1000"
                  step="0.01"
                  value={form.weight}
                  onChange={(event) => updateField('weight', event.target.value)}
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="deliveryType">
                  Delivery service *
                </label>
                <select
                  id="deliveryType"
                  className={inputClass}
                  value={form.deliveryType}
                  onChange={(event) =>
                    updateField('deliveryType', event.target.value)
                  }
                  required
                >
                  <option value="standard">Standard Delivery</option>
                  <option value="express">Express Delivery</option>
                  <option value="same_day">Same-day Delivery</option>
                </select>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/80 p-5 dark:border-blue-900/60 dark:bg-blue-500/5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Estimated delivery charge
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                    Calculated from the active pricing rule and parcel weight.
                    Final charges may differ if additional fees apply.
                  </p>
                </div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {estimatedPrice === null
                    ? 'Not available'
                    : `₹${estimatedPrice.toFixed(2)}`}
                </p>
              </div>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate('/customer/dashboard')}
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || loading || branches.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <RefreshCw size={17} className="animate-spin" />
              ) : (
                <PackagePlus size={17} />
              )}
              {saving ? 'Creating shipment...' : 'Create Shipment'}
            </button>
          </div>

          {loading && (
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              <RefreshCw className="mr-2 inline animate-spin" size={15} />
              Loading branch and pricing information...
            </p>
          )}

          {!loading && branches.length === 0 && (
            <p className="text-center text-sm text-amber-600 dark:text-amber-400">
              No active branches are available. Add a branch before creating a
              shipment.
            </p>
          )}
        </form>
      </div>
    </DashboardLayout>
  )
}
