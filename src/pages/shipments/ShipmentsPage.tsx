
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import {
  Package,
  Plus,
  Search,
  Filter,
  Eye,
  X,
  Truck,
  CheckCircle2,
  Clock3,
  MapPin,
  RefreshCw,
  AlertCircle,
  CalendarDays,
  Scale,
} from 'lucide-react'

import { api } from '../../services/api'
import DashboardLayout from '../../components/ui/dashboard/DashboardLayout'

type ShipmentStatus =
  | 'shipment_created'
  | 'branch_received'
  | 'in_transit'
  | 'destination_branch'
  | 'agent_assigned'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed_delivery'
  | 'cancelled'
  | 'return_to_sender'

interface Shipment {
  id: string
  trackingNumber?: string
  tracking_number?: string
  senderName?: string
  receiverName?: string
  destinationCity?: string
  status: ShipmentStatus | string
  createdAt?: string
  created_at?: string
  customerId?: string
  senderCustomerId?: string
  originBranchId?: string
  destinationBranchId?: string
  currentBranchId?: string
  assignedAgentId?: string
  weight?: number
  deliveryType?: string
}

interface ShipmentForm {
  senderName: string
  receiverName: string
  destinationCity: string
  weight: string
  deliveryType: string
}

const STATUS_OPTIONS: ShipmentStatus[] = [
  'shipment_created',
  'branch_received',
  'in_transit',
  'destination_branch',
  'agent_assigned',
  'out_for_delivery',
  'delivered',
  'failed_delivery',
  'cancelled',
  'return_to_sender',
]

const EMPTY_FORM: ShipmentForm = {
  senderName: '',
  receiverName: '',
  destinationCity: '',
  weight: '1',
  deliveryType: 'standard',
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white'

function formatStatus(status: string) {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatDate(date?: string) {
  if (!date) return '—'

  const parsed = new Date(date)

  if (Number.isNaN(parsed.getTime())) return '—'

  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function statusClasses(status: string) {
  switch (status) {
    case 'delivered':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'

    case 'in_transit':
    case 'out_for_delivery':
    case 'destination_branch':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'

    case 'failed_delivery':
    case 'return_to_sender':
      return 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'

    case 'cancelled':
      return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'

    default:
      return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
  }
}

function FormField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block min-w-0 space-y-1.5">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </span>
      {children}
    </label>
  )
}

function SummaryCard({
  title,
  value,
  icon,
  color,
}: {
  title: string
  value: number
  icon: ReactNode
  color: 'blue' | 'violet' | 'emerald' | 'amber'
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
    violet:
      'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
    emerald:
      'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    amber:
      'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {title}
        </p>
        <span className={`rounded-xl p-2.5 ${colorClasses[color]}`}>
          {icon}
        </span>
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  )
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string
  subtitle: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-md sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="my-auto flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/30 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800 sm:p-6">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {title}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="shrink-0 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        
<div className="min-h-0 flex-1 overflow-y-auto scrollbar-none p-5 sm:p-6">
  {children}
</div>


        {footer && (
          <div className="shrink-0 border-t border-slate-200 p-4 dark:border-slate-800 sm:p-5">
            {footer}
          </div>
        )}
      </section>
    </div>,
    document.body,
  )
}

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedShipment, setSelectedShipment] =
    useState<Shipment | null>(null)
  const [form, setForm] = useState<ShipmentForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  async function loadShipments() {
    setLoading(true)
    setError('')

    try {
      const response = await api.get<Shipment[]>('/shipments')
      setShipments(Array.isArray(response.data) ? response.data : [])
    } catch {
      setError(
        'Unable to load shipments. Check that JSON Server is running on port 5000.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadShipments()
  }, [])

  const filteredShipments = useMemo(() => {
    const query = search.trim().toLowerCase()

    return shipments.filter((shipment) => {
      const trackingNumber =
        shipment.trackingNumber ?? shipment.tracking_number ?? ''

      const matchesSearch =
        !query ||
        [
          trackingNumber,
          shipment.id,
          shipment.senderName ?? '',
          shipment.receiverName ?? '',
          shipment.destinationCity ?? '',
        ].some((value) => value.toLowerCase().includes(query))

      const matchesStatus =
        statusFilter === 'all' || shipment.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [shipments, search, statusFilter])

  const deliveredCount = shipments.filter(
    (shipment) => shipment.status === 'delivered',
  ).length

  const transitCount = shipments.filter((shipment) =>
    ['in_transit', 'out_for_delivery', 'destination_branch'].includes(
      shipment.status,
    ),
  ).length

  const pendingCount = shipments.filter((shipment) =>
    ['shipment_created', 'branch_received', 'agent_assigned'].includes(
      shipment.status,
    ),
  ).length

  async function handleCreateShipment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const weight = Number(form.weight)

    if (!Number.isFinite(weight) || weight <= 0) {
      setError('Enter a valid parcel weight greater than zero.')
      return
    }

    if (
      !form.senderName.trim() ||
      !form.receiverName.trim() ||
      !form.destinationCity.trim()
    ) {
      setError('Please complete all required shipment fields.')
      return
    }

    setSaving(true)

    try {
      const trackingNumber = `QS${Date.now().toString().slice(-10)}`

      const payload: Shipment = {
        id: `SH${Date.now()}`,
        trackingNumber,
        senderName: form.senderName.trim(),
        receiverName: form.receiverName.trim(),
        destinationCity: form.destinationCity.trim(),
        weight,
        deliveryType: form.deliveryType,
        status: 'shipment_created',
        createdAt: new Date().toISOString(),
      }

      const response = await api.post<Shipment>('/shipments', payload)

      setShipments((previous) => [response.data, ...previous])
      setForm(EMPTY_FORM)
      setShowCreateModal(false)
      setSuccess(
        `Shipment created successfully. Tracking number: ${trackingNumber}`,
      )
    } catch {
      setError(
        'Unable to create shipment. Please check JSON Server and try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  const closeCreateModal = () => setShowCreateModal(false)
  const closeDetailsModal = () => setSelectedShipment(null)

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        {/* Page heading */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Package size={16} />
              Operations / Shipments
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Shipment Management
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Create, search and manage parcel deliveries.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setError('')
              setSuccess('')
              setShowCreateModal(true)
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={18} />
            Create Shipment
          </button>
        </div>

        {/* Feedback messages */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span className="break-words">{success}</span>
            <button
              type="button"
              onClick={() => setSuccess('')}
              aria-label="Dismiss success message"
              className="ml-auto shrink-0 rounded p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Shipments"
            value={shipments.length}
            icon={<Package size={20} />}
            color="blue"
          />
          <SummaryCard
            title="In Transit"
            value={transitCount}
            icon={<Truck size={20} />}
            color="violet"
          />
          <SummaryCard
            title="Delivered"
            value={deliveredCount}
            icon={<CheckCircle2 size={20} />}
            color="emerald"
          />
          <SummaryCard
            title="Awaiting Dispatch"
            value={pendingCount}
            icon={<Clock3 size={20} />}
            color="amber"
          />
        </div>

        {/* Shipments table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-4 dark:border-slate-800 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                All Shipments
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {filteredShipments.length} of {shipments.length} shipments
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 sm:min-w-64">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search shipments..."
                  aria-label="Search shipments"
                  className={`${inputClass} pl-10`}
                />
              </div>

              <div className="relative">
                <Filter
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  aria-label="Filter by shipment status"
                  className={`${inputClass} appearance-none pl-9 pr-8 sm:w-52`}
                >
                  <option value="all">All statuses</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {formatStatus(status)}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => void loadShipments()}
                disabled={loading}
                title="Refresh shipments"
                aria-label="Refresh shipments"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <RefreshCw
                  size={16}
                  className={loading ? 'animate-spin' : ''}
                />
                <span className="sm:hidden">Refresh</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-slate-500 dark:text-slate-400">
              <RefreshCw size={18} className="animate-spin" />
              Loading shipments...
            </div>
          ) : filteredShipments.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-5 text-center">
              <div className="mb-4 rounded-2xl bg-slate-100 p-4 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <Package size={30} />
              </div>

              <h3 className="font-semibold text-slate-900 dark:text-white">
                {shipments.length === 0
                  ? 'No shipments yet'
                  : 'No matching shipments'}
              </h3>

              <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                {shipments.length === 0
                  ? 'Create your first shipment to start managing parcel deliveries.'
                  : 'Try a different search term or shipment status.'}
              </p>

              {shipments.length === 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setError('')
                    setShowCreateModal(true)
                  }}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Plus size={17} />
                  Create Shipment
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/60 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Tracking ID</th>
                    <th className="px-5 py-4 font-semibold">
                      Sender / Receiver
                    </th>
                    <th className="px-5 py-4 font-semibold">Destination</th>
                    <th className="px-5 py-4 font-semibold">Created Date</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 text-right font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredShipments.map((shipment) => (
                    <tr
                      key={shipment.id}
                      className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-4">
                        <span className="font-semibold text-blue-700 dark:text-blue-400">
                          {shipment.trackingNumber ??
                            shipment.tracking_number ??
                            shipment.id}
                        </span>
                        <p className="mt-1 text-xs text-slate-400">
                          {shipment.id}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-800 dark:text-slate-200">
                          {shipment.senderName || '—'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          To: {shipment.receiverName || '—'}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <MapPin size={14} className="text-slate-400" />
                          {shipment.destinationCity || '—'}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                        {formatDate(shipment.createdAt ?? shipment.created_at)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(shipment.status)}`}
                        >
                          {formatStatus(shipment.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setError('')
                            setSelectedShipment(shipment)
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:text-slate-300 dark:hover:text-blue-400"
                        >
                          <Eye size={15} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Create Shipment modal: rendered outside the dashboard layout */}
      {showCreateModal && (
        <Modal
          title="Create Shipment"
          subtitle="Enter the parcel and recipient details."
          onClose={closeCreateModal}
          footer={
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeCreateModal}
                disabled={saving}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-shipment-form"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && <RefreshCw size={16} className="animate-spin" />}
                {saving ? 'Creating...' : 'Create Shipment'}
              </button>
            </div>
          }
        >
          <form
            id="create-shipment-form"
            onSubmit={handleCreateShipment}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Sender Name">
                <input
                  required
                  maxLength={100}
                  value={form.senderName}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      senderName: event.target.value,
                    }))
                  }
                  placeholder="Enter sender name"
                  className={inputClass}
                />
              </FormField>

              <FormField label="Receiver Name">
                <input
                  required
                  maxLength={100}
                  value={form.receiverName}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      receiverName: event.target.value,
                    }))
                  }
                  placeholder="Enter receiver name"
                  className={inputClass}
                />
              </FormField>
            </div>

            <FormField label="Destination City">
              <input
                required
                maxLength={100}
                value={form.destinationCity}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    destinationCity: event.target.value,
                  }))
                }
                placeholder="Enter destination city"
                className={inputClass}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Parcel Weight (kg)">
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.weight}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      weight: event.target.value,
                    }))
                  }
                  placeholder="e.g. 1.5"
                  className={inputClass}
                />
              </FormField>

              <FormField label="Delivery Type">
                <select
                  value={form.deliveryType}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      deliveryType: event.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="standard">Standard</option>
                  <option value="express">Express</option>
                  <option value="same_day">Same Day</option>
                </select>
              </FormField>
            </div>

            <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
              The shipment will be created with the status Shipment Created.
            </div>
          </form>
        </Modal>
      )}

      {/* Shipment Details modal */}
      {selectedShipment && (
        <Modal
          title="Shipment Details"
          subtitle="Review the parcel information and current status."
          onClose={closeDetailsModal}
          footer={
            <div className="flex justify-end">
              <button
                type="button"
                onClick={closeDetailsModal}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          }
        >
          <div className="space-y-5">
            <div className="rounded-2xl bg-blue-50 p-4 dark:bg-blue-500/10">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                Tracking Number
              </p>
              <p className="mt-1 break-all text-xl font-bold text-blue-800 dark:text-blue-300">
                {selectedShipment.trackingNumber ??
                  selectedShipment.tracking_number ??
                  selectedShipment.id}
              </p>
              <span
                className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(selectedShipment.status)}`}
              >
                {formatStatus(selectedShipment.status)}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <DetailItem
                icon={<Package size={17} />}
                label="Shipment ID"
                value={selectedShipment.id}
              />
              <DetailItem
                icon={<CalendarDays size={17} />}
                label="Created Date"
                value={formatDate(
                  selectedShipment.createdAt ??
                    selectedShipment.created_at,
                )}
              />
              <DetailItem
                icon={<UsersIcon />}
                label="Sender"
                value={selectedShipment.senderName || '—'}
              />
              <DetailItem
                icon={<UsersIcon />}
                label="Receiver"
                value={selectedShipment.receiverName || '—'}
              />
              <DetailItem
                icon={<MapPin size={17} />}
                label="Destination City"
                value={selectedShipment.destinationCity || '—'}
              />
              <DetailItem
                icon={<Scale size={17} />}
                label="Parcel Weight"
                value={
                  selectedShipment.weight != null
                    ? `${selectedShipment.weight} kg`
                    : '—'
                }
              />
              <DetailItem
                icon={<Truck size={17} />}
                label="Delivery Type"
                value={
                  selectedShipment.deliveryType
                    ? formatStatus(selectedShipment.deliveryType)
                    : '—'
                }
              />
              <DetailItem
                icon={<Package size={17} />}
                label="Assigned Agent"
                value={selectedShipment.assignedAgentId || 'Not assigned'}
              />
            </div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  )
}

function UsersIcon() {
  return <Package size={17} />
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="mt-2 break-words text-sm font-semibold text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  )
}
