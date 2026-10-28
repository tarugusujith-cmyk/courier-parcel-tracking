
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Eye,
  LoaderCircle,
  MapPin,
  Package,
  Search,
  Truck,
  X,
} from 'lucide-react'
import { api } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
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
  | string

interface Shipment {
  id: string
  trackingNumber?: string
  senderName?: string
  receiverName?: string
  senderAddress?: string
  receiverAddress?: string
  originBranchId?: string
  destinationBranchId?: string
  originBranch?: string
  destinationBranch?: string
  assignedAgentId?: string
  deliveryAgentId?: string
  agentId?: string
  status: ShipmentStatus
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

interface TrackingEvent {
  id: string
  shipmentId: string
  status?: ShipmentStatus
  location?: string
  description?: string
  remarks?: string
  timestamp?: string
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'shipment_created', label: 'Shipment Created' },
  { value: 'branch_received', label: 'Branch Received' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'destination_branch', label: 'Destination Branch' },
  { value: 'agent_assigned', label: 'Agent Assigned' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'failed_delivery', label: 'Failed Delivery' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'return_to_sender', label: 'Return to Sender' },
]

const STATUS_STYLES: Record<string, string> = {
  shipment_created:
    'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/20',
  branch_received:
    'bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-400/20',
  in_transit:
    'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20',
  destination_branch:
    'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-400/20',
  agent_assigned:
    'bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-500/10 dark:text-purple-300 dark:ring-purple-400/20',
  out_for_delivery:
    'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20',
  delivered:
    'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20',
  failed_delivery:
    'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/20',
  cancelled:
    'bg-gray-100 text-gray-700 ring-gray-500/20 dark:bg-gray-700/60 dark:text-gray-300 dark:ring-gray-400/20',
  return_to_sender:
    'bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-400/20',
}

function formatStatus(status?: string) {
  if (!status) return 'Unknown'

  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatDate(value?: string) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatusBadge({ status }: { status?: string }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        STATUS_STYLES[status ?? ''] ??
        'bg-gray-100 text-gray-700 ring-gray-500/20 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-500/30'
      }`}
    >
      {formatStatus(status)}
    </span>
  )
}

function getEventTime(event: TrackingEvent) {
  return event.timestamp || event.createdAt || event.updatedAt
}

export default function BranchTrackingPage() {
  const { user } = useAuth()

  const [shipments, setShipments] = useState<Shipment[]>([])
  const [trackingHistory, setTrackingHistory] = useState<TrackingEvent[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(
    null,
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [shipmentsResponse, historyResponse] = await Promise.all([
        api.get<Shipment[]>('/shipments'),
        api.get<TrackingEvent[]>('/trackingHistory'),
      ])

      setShipments(
        Array.isArray(shipmentsResponse.data) ? shipmentsResponse.data : [],
      )

      setTrackingHistory(
        Array.isArray(historyResponse.data) ? historyResponse.data : [],
      )
    } catch (err) {
      console.error('Failed to load branch tracking data:', err)
      setError(
        'Unable to load tracking information. Make sure JSON Server is running on port 5000.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // If the logged-in branch user has a branchId, show shipments
  // associated with that branch. If no branchId is available,
  // preserve the previous all-shipments behavior.
  const branchShipments = useMemo(() => {
    const branchId = user?.branchId

    if (!branchId) return shipments

    return shipments.filter(
      (shipment) =>
        shipment.originBranchId === branchId ||
        shipment.destinationBranchId === branchId,
    )
  }, [shipments, user])

  const filteredShipments = useMemo(() => {
    const query = search.trim().toLowerCase()

    return branchShipments.filter((shipment) => {
      const matchesSearch =
        !query ||
        [
          shipment.id,
          shipment.trackingNumber,
          shipment.senderName,
          shipment.receiverName,
          shipment.originBranch,
          shipment.destinationBranch,
          shipment.originBranchId,
          shipment.destinationBranchId,
        ].some((value) =>
          String(value ?? '')
            .toLowerCase()
            .includes(query),
        )

      const matchesStatus =
        statusFilter === 'all' || shipment.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [branchShipments, search, statusFilter])

  const summary = useMemo(() => {
    const count = (status: string) =>
      branchShipments.filter((shipment) => shipment.status === status).length

    return {
      total: branchShipments.length,
      inTransit: count('in_transit'),
      outForDelivery: count('out_for_delivery'),
      delivered: count('delivered'),
      failed: count('failed_delivery'),
    }
  }, [branchShipments])

  const selectedHistory = useMemo(() => {
    if (!selectedShipment) return []

    return trackingHistory
      .filter(
        (event) =>
          String(event.shipmentId) === String(selectedShipment.id),
      )
      .sort((a, b) => {
        const timeA = getEventTime(a)
          ? new Date(getEventTime(a)!).getTime()
          : 0
        const timeB = getEventTime(b)
          ? new Date(getEventTime(b)!).getTime()
          : 0

        return timeB - timeA
      })
  }, [selectedShipment, trackingHistory])

  // Close the modal with Escape.
  useEffect(() => {
    if (!selectedShipment) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedShipment(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedShipment])

  const modal =
    selectedShipment && typeof document !== 'undefined'
      ? createPortal(
        <div
  className="fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden bg-black/65 p-4"
  onMouseDown={(event) => {
    if (event.target === event.currentTarget) {
      setSelectedShipment(null)
    }
  }}
>
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="tracking-modal-title"
              className="relative z-[100000] flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5 dark:border-gray-700">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Activity size={16} />
                    Shipment tracking history
                  </div>

                  <h2
                    id="tracking-modal-title"
                    className="break-words text-xl font-bold text-gray-900 dark:text-white"
                  >
                    {selectedShipment.trackingNumber ||
                      selectedShipment.id}
                  </h2>

                  <div className="mt-3">
                    <StatusBadge status={selectedShipment.status} />
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="Close tracking history"
                  onClick={() => setSelectedShipment(null)}
                  className="shrink-0 rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                >
                  <X size={21} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Sender
                    </p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {selectedShipment.senderName || 'Not available'}
                    </p>
                    {selectedShipment.senderAddress && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {selectedShipment.senderAddress}
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Receiver
                    </p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {selectedShipment.receiverName || 'Not available'}
                    </p>
                    {selectedShipment.receiverAddress && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {selectedShipment.receiverAddress}
                      </p>
                    )}
                  </div>
                </div>

                <h3 className="mb-5 font-semibold text-gray-900 dark:text-white">
                  Tracking timeline
                </h3>

                {selectedHistory.length > 0 ? (
                  <div className="space-y-0">
                    {selectedHistory.map((event, index) => (
                      <div
                        key={event.id}
                        className="relative flex gap-4 pb-7 last:pb-0"
                      >
                        {index < selectedHistory.length - 1 && (
                          <div className="absolute bottom-0 left-[15px] top-8 w-px bg-gray-200 dark:bg-gray-700" />
                        )}

                        <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                          <CheckCircle2 size={17} />
                        </div>

                        <div className="min-w-0 flex-1 pt-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {formatStatus(event.status)}
                            </p>
                            {event.status && (
                              <StatusBadge status={event.status} />
                            )}
                          </div>

                          {event.description && (
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                              {event.description}
                            </p>
                          )}

                          {event.remarks && (
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              {event.remarks}
                            </p>
                          )}

                          {event.location && (
                            <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                              <MapPin size={14} />
                              {event.location}
                            </p>
                          )}

                          <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                            <Clock size={13} />
                            {formatDate(getEventTime(event))}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-300 px-5 py-10 text-center dark:border-gray-700">
                    <Package
                      size={30}
                      className="mx-auto mb-3 text-gray-400"
                    />
                    <p className="font-medium text-gray-700 dark:text-gray-200">
                      No tracking history yet
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Tracking events will appear here when they are recorded.
                    </p>
                    <div className="mt-4">
                      <StatusBadge status={selectedShipment.status} />
                    </div>
                  </div>
                )}

                <div className="mt-6 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/70">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Shipment created
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                    <CalendarDays size={15} />
                    {formatDate(selectedShipment.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex justify-end border-t border-gray-200 px-6 py-4 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setSelectedShipment(null)}
                  className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </section>
          </div>,
          document.body,
        )
      : null

  return (
    <DashboardLayout>
      <div className="min-h-screen space-y-6 bg-gray-50/60 p-4 sm:p-6 dark:bg-gray-950">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="mb-1 text-sm font-medium text-indigo-600 dark:text-indigo-400">
              Branch operations
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              Shipment Tracking
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Monitor shipment progress and review tracking events.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 sm:self-auto"
          >
            <Activity size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Could not load shipments</p>
              <p className="mt-1">{error}</p>
              <button
                type="button"
                onClick={() => void loadData()}
                className="mt-2 font-semibold underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Shipments
              </span>
              <span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                <Package size={20} />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">
              {summary.total}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Shipments associated with this branch
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                In Transit
              </span>
              <span className="rounded-xl bg-sky-50 p-2.5 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300">
                <Truck size={20} />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">
              {summary.inTransit}
            </p>
            <p className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <ArrowUpRight size={14} />
              Currently moving between locations
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Out for Delivery
              </span>
              <span className="rounded-xl bg-amber-50 p-2.5 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
                <MapPin size={20} />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">
              {summary.outForDelivery}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              With delivery agents
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Delivered
              </span>
              <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                <CheckCircle2 size={20} />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">
              {summary.delivered}
            </p>
            <p className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <ArrowDownRight size={14} />
              Successfully completed
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 p-5 dark:border-gray-800">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Shipment records
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Search a shipment and open its tracking timeline.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative min-w-0 sm:w-72">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search tracking number..."
                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                  aria-label="Filter by shipment status"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="rounded-lg bg-gray-100 px-2.5 py-1.5 dark:bg-gray-800">
                {filteredShipments.length} result
                {filteredShipments.length === 1 ? '' : 's'}
              </span>
              {summary.failed > 0 && (
                <span className="rounded-lg bg-red-50 px-2.5 py-1.5 text-red-700 dark:bg-red-500/10 dark:text-red-300">
                  {summary.failed} failed delivery
                  {summary.failed === 1 ? '' : 'ies'}
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              <LoaderCircle size={21} className="animate-spin" />
              Loading shipment records...
            </div>
          ) : filteredShipments.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <Package
                size={35}
                className="mx-auto mb-3 text-gray-300 dark:text-gray-600"
              />
              <p className="font-semibold text-gray-800 dark:text-gray-200">
                No shipments found
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Try another search term or status filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-gray-50 dark:bg-gray-800/70">
                  <tr className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <th className="px-5 py-4 font-semibold">Tracking ID</th>
                    <th className="px-5 py-4 font-semibold">Sender</th>
                    <th className="px-5 py-4 font-semibold">Receiver</th>
                    <th className="px-5 py-4 font-semibold">Route</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Created</th>
                    <th className="px-5 py-4 text-right font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredShipments.map((shipment) => (
                    <tr
                      key={shipment.id}
                      className="transition hover:bg-gray-50/80 dark:hover:bg-gray-800/40"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-indigo-600 dark:text-indigo-400">
                          {shipment.trackingNumber || shipment.id}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          ID: {shipment.id}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-800 dark:text-gray-200">
                          {shipment.senderName || '—'}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-800 dark:text-gray-200">
                          {shipment.receiverName || '—'}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {shipment.originBranch ||
                            shipment.originBranchId ||
                            'Origin'}
                        </p>
                        <p className="my-1 text-xs text-gray-400">to</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {shipment.destinationBranch ||
                            shipment.destinationBranchId ||
                            'Destination'}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={shipment.status} />
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(shipment.createdAt)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedShipment(shipment)}
                          className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                        >
                          <Eye size={15} />
                          Track
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 px-5 py-4 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <span>
              Showing {filteredShipments.length} of {branchShipments.length}{' '}
              shipments
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={13} />
              Read-only tracking view
            </span>
          </div>
        </div>
      </div>

      {modal}
    </DashboardLayout>
  )
}
