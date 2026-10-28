import { useCallback, useEffect, useState } from 'react'
import {
  Search,
  Package,
  MapPin,
  Clock,
  CheckCircle2,
  Truck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import DashboardLayout from '../../components/ui/dashboard/DashboardLayout'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../services/api'

type Shipment = {
  id: string
  trackingNumber?: string
  senderName?: string
  receiverName?: string
  receiverPhone?: string
  receiverAddress?: string
  destinationAddress?: string
  originBranchName?: string
  destinationBranchName?: string
  status: string
  assignedAgentId?: string
  deliveryAgentId?: string
  agentId?: string
  assignedTo?: string
  createdAt?: string
  updatedAt?: string
}

type TrackingEvent = {
  id: string
  shipmentId?: string
  trackingNumber?: string
  status: string
  location?: string
  description?: string
  remarks?: string
  timestamp?: string
  createdAt?: string
}

const statusLabels: Record<string, string> = {
  shipment_created: 'Shipment Created',
  branch_received: 'Branch Received',
  in_transit: 'In Transit',
  destination_branch: 'Destination Branch',
  agent_assigned: 'Agent Assigned',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  failed_delivery: 'Failed Delivery',
  cancelled: 'Cancelled',
  returned_to_sender: 'Returned to Sender',
}

function formatStatus(status: string) {
  return statusLabels[status] ?? status.replace(/_/g, ' ')
}

function formatDate(value?: string) {
  if (!value) return 'Date unavailable'

  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleString()
}

export default function AgentTrackingPage() {
  const { user } = useAuth()

  const [shipments, setShipments] = useState<Shipment[]>([])
  const [events, setEvents] = useState<TrackingEvent[]>([])
  const [trackingNumber, setTrackingNumber] = useState('')
  const [searchedShipment, setSearchedShipment] =
    useState<Shipment | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [shipmentResponse, eventResponse] = await Promise.all([
        api.get<Shipment[]>('/shipments'),
        api.get<TrackingEvent[]>('/trackingHistory'),
      ])

      setShipments(shipmentResponse.data)
      setEvents(eventResponse.data)
    } catch {
      setError(
        'Unable to load tracking information. Make sure JSON Server is running.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const searchShipment = () => {
    const query = trackingNumber.trim().toLowerCase()

    setError('')
    setSearchedShipment(null)

    if (!query) {
      setError('Please enter a tracking number.')
      return
    }

    const shipment = shipments.find(
      (item) =>
        item.trackingNumber?.toLowerCase() === query ||
        item.id.toLowerCase() === query,
    )

    if (!shipment) {
      setError('No shipment found for this tracking number.')
      return
    }

    const agentIds = [user?.agentId, user?.id].filter(
      (value): value is string => Boolean(value),
    )

    const assignedIds = [
      shipment.assignedAgentId,
      shipment.deliveryAgentId,
      shipment.agentId,
      shipment.assignedTo,
    ].filter((value): value is string => Boolean(value))

    if (
      agentIds.length > 0 &&
      !agentIds.some((id) => assignedIds.includes(id))
    ) {
      setError('This shipment is not assigned to your delivery account.')
      return
    }

    setSearchedShipment(shipment)
  }

  const shipmentEvents = searchedShipment
    ? events
        .filter(
          (event) =>
            event.shipmentId === searchedShipment.id ||
            (!!searchedShipment.trackingNumber &&
              event.trackingNumber === searchedShipment.trackingNumber),
        )
        .sort((a, b) => {
          const dateA = new Date(
            a.timestamp ?? a.createdAt ?? '',
          ).getTime()
          const dateB = new Date(
            b.timestamp ?? b.createdAt ?? '',
          ).getTime()

          return dateB - dateA
        })
    : []

  const currentStatus = searchedShipment
    ? formatStatus(searchedShipment.status)
    : ''

  return (
    <DashboardLayout>
      <div className="min-h-full space-y-6 text-slate-900 dark:text-white">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            Parcel Tracking
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Search assigned shipments and review their tracking history.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-3 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
              <Search size={22} />
            </div>
            <div>
              <h2 className="font-semibold">Find a parcel</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Enter a tracking number to see the latest status.
              </p>
            </div>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              searchShipment()
            }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              value={trackingNumber}
              onChange={(event) => setTrackingNumber(event.target.value)}
              placeholder="Enter tracking number"
              className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-blue-950"
            />

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              <Search size={18} />
              Search
            </button>

            <button
              type="button"
              onClick={() => void loadData()}
              disabled={loading}
              aria-label="Refresh tracking data"
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <RefreshCw size={18} />
              <span className="sm:hidden">Refresh</span>
            </button>
          </form>

          {error && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
            >
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}
        </section>

        {loading && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Loading tracking data...
          </p>
        )}

        {!searchedShipment && !loading && !error && (
          <section className="rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center dark:border-slate-700">
            <Package
              size={42}
              className="mx-auto mb-3 text-slate-400"
            />
            <h2 className="font-semibold">Ready to track</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Search using a shipment tracking number to view its details.
            </p>
          </section>
        )}

        {searchedShipment && (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-blue-100 p-3 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                    <Package size={24} />
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Tracking number
                    </p>
                    <h2 className="mt-1 break-all text-xl font-bold">
                      {searchedShipment.trackingNumber ??
                        searchedShipment.id}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      Updated {formatDate(searchedShipment.updatedAt)}
                    </p>
                  </div>
                </div>

                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  <Truck size={16} />
                  {currentStatus}
                </span>
              </div>

              <div className="mt-6 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2 dark:border-slate-700">
                <div className="flex items-start gap-3">
                  <MapPin
                    size={19}
                    className="mt-1 shrink-0 text-slate-400"
                  />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Sender
                    </p>
                    <p className="font-medium">
                      {searchedShipment.senderName ?? 'Not available'}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {searchedShipment.originBranchName ?? 'Origin branch'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin
                    size={19}
                    className="mt-1 shrink-0 text-emerald-500"
                  />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Receiver
                    </p>
                    <p className="font-medium">
                      {searchedShipment.receiverName ?? 'Not available'}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {searchedShipment.receiverPhone ?? 'Phone not available'}
                    </p>
                    <p className="mt-1 break-words text-sm text-slate-500 dark:text-slate-400">
                      {searchedShipment.receiverAddress ??
                        searchedShipment.destinationAddress ??
                        'Destination address not available'}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {searchedShipment.destinationBranchName ??
                        'Destination branch'}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-6 flex items-center gap-3">
                <Clock size={21} className="text-blue-600" />
                <div>
                  <h2 className="text-lg font-semibold">
                    Tracking history
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Recorded updates for this shipment.
                  </p>
                </div>
              </div>

              {shipmentEvents.length === 0 ? (
                <div className="rounded-xl bg-slate-50 p-5 text-center dark:bg-slate-800/60">
                  <Clock
                    size={28}
                    className="mx-auto mb-2 text-slate-400"
                  />
                  <p className="font-medium">No tracking events recorded</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Tracking events will appear here when they are added to
                    the trackingHistory resource.
                  </p>
                </div>
              ) : (
                <div className="relative ml-2 space-y-6 border-l-2 border-slate-200 pl-6 dark:border-slate-700">
                  {shipmentEvents.map((item, index) => (
                    <div key={item.id} className="relative">
                      <span className="absolute -left-[34px] flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 ring-4 ring-white dark:bg-blue-900 dark:ring-slate-900">
                        {index === 0 ? (
                          <CheckCircle2
                            size={14}
                            className="text-blue-600 dark:text-blue-300"
                          />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-slate-400" />
                        )}
                      </span>

                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                        <div>
                          <h3 className="font-semibold">
                            {formatStatus(item.status)}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {item.description ??
                              item.remarks ??
                              'Shipment status updated'}
                          </p>
                          {item.location && (
                            <p className="mt-1 flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                              <MapPin size={14} />
                              {item.location}
                            </p>
                          )}
                        </div>

                        <time className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(item.timestamp ?? item.createdAt)}
                        </time>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
