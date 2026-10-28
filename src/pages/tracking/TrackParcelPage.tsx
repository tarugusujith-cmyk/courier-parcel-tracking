
import { useState } from 'react'
import {
  Search,
  Package,
  MapPin,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Truck,
  AlertCircle,
  ArrowRight,
  UserRound,
  Phone,
  RotateCcw,
} from 'lucide-react'
import DashboardLayout from '../../components/ui/dashboard/DashboardLayout'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../services/api'

interface Shipment {
  id: string
  trackingNumber?: string
  tracking_number?: string
  customerId?: string
  customer_id?: string
  senderName?: string
  sender_name?: string
  senderPhone?: string
  sender_phone?: string
  senderAddress?: string
  sender_address?: string
  receiverName?: string
  receiver_name?: string
  receiverPhone?: string
  receiver_phone?: string
  receiverAddress?: string
  receiver_address?: string
  destinationCity?: string
  destination_city?: string
  originBranchId?: string
  origin_branch_id?: string
  destinationBranchId?: string
  destination_branch_id?: string
  currentBranchId?: string
  current_branch_id?: string
  weight?: number
  deliveryType?: string
  delivery_type?: string
  estimatedPrice?: number
  estimated_price?: number
  status: string
  createdAt?: string
  created_at?: string
  updatedAt?: string
  updated_at?: string
}

interface TrackingEvent {
  id: string
  shipmentId?: string
  shipment_id?: string
  trackingNumber?: string
  tracking_number?: string
  status: string
  location?: string
  description?: string
  remarks?: string
  timestamp?: string
  createdAt?: string
  created_at?: string
}

const stages = [
  { status: 'shipment_created', label: 'Shipment Created', icon: Package },
  { status: 'branch_received', label: 'Branch Received', icon: MapPin },
  { status: 'in_transit', label: 'In Transit', icon: Truck },
  { status: 'destination_branch', label: 'Destination Branch', icon: MapPin },
  { status: 'agent_assigned', label: 'Agent Assigned', icon: UserRound },
  { status: 'out_for_delivery', label: 'Out for Delivery', icon: Truck },
  { status: 'delivered', label: 'Delivered', icon: CheckCircle2 },
]

const failedStatuses = [
  'failed_delivery',
  'cancelled',
  'returned',
  'return_to_sender',
]

function readString(...values: unknown[]): string {
  const value = values.find(
    (item) => typeof item === 'string' && item.trim().length > 0,
  )
  return typeof value === 'string' ? value : ''
}

function formatStatus(status: string) {
  return status
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value?: string) {
  if (!value) return 'Not available'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function TrackParcelPage() {
  const { user } = useAuth()

  const [trackingNumber, setTrackingNumber] = useState('')
  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [events, setEvents] = useState<TrackingEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  const searchParcel = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const number = trackingNumber.trim()
    if (!number) {
      setError('Please enter a tracking number.')
      return
    }

    setLoading(true)
    setError('')
    setShipment(null)
    setEvents([])
    setSearched(true)

    try {
      const response = await api.get<Shipment[]>('/shipments')
      const found = response.data.find((item) => {
        const itemNumber = readString(
          item.trackingNumber,
          item.tracking_number,
        )

        return (
          itemNumber.toLowerCase() === number.toLowerCase() ||
          item.id.toLowerCase() === number.toLowerCase()
        )
      })

      if (!found) {
        setError('No shipment was found for this tracking number.')
        return
      }

      // Customers may only track their own shipments.
      if (
        user?.role === 'customer' &&
        readString(found.customerId, found.customer_id) !==
          String(user.customerId ?? '')
      ) {
        setError('This shipment does not belong to your account.')
        return
      }

      setShipment(found)

      try {
        const historyResponse =
          await api.get<TrackingEvent[]>('/trackingHistory')

        const matchingEvents = historyResponse.data
          .filter((item) => {
            const shipmentId = readString(
              item.shipmentId,
              item.shipment_id,
            )
            const eventTrackingNumber = readString(
              item.trackingNumber,
              item.tracking_number,
            )

            return (
              shipmentId === found.id ||
              eventTrackingNumber.toLowerCase() ===
                readString(
                  found.trackingNumber,
                  found.tracking_number,
                ).toLowerCase()
            )
          })
          .sort((a, b) => {
            const dateA = new Date(
              readString(a.timestamp, a.createdAt, a.created_at),
            ).getTime()
            const dateB = new Date(
              readString(b.timestamp, b.createdAt, b.created_at),
            ).getTime()
            return dateA - dateB
          })

        setEvents(matchingEvents)
      } catch {
        // Shipment details remain available if history is unavailable.
        setEvents([])
      }
    } catch {
      setError(
        'Unable to load shipment details. Please check that JSON Server is running.',
      )
    } finally {
      setLoading(false)
    }
  }

  const status = shipment?.status?.toLowerCase() ?? ''
  const isFailed = failedStatuses.includes(status)
  const currentStage = stages.findIndex((stage) => stage.status === status)

  const senderName = shipment
    ? readString(shipment.senderName, shipment.sender_name)
    : ''
  const senderPhone = shipment
    ? readString(shipment.senderPhone, shipment.sender_phone)
    : ''
  const senderAddress = shipment
    ? readString(shipment.senderAddress, shipment.sender_address)
    : ''
  const receiverName = shipment
    ? readString(shipment.receiverName, shipment.receiver_name)
    : ''
  const receiverPhone = shipment
    ? readString(shipment.receiverPhone, shipment.receiver_phone)
    : ''
  const receiverAddress = shipment
    ? readString(shipment.receiverAddress, shipment.receiver_address)
    : ''
  const trackingId = shipment
    ? readString(shipment.trackingNumber, shipment.tracking_number)
    : ''

  return (
    <DashboardLayout>
      <div className="min-h-full space-y-6 bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:p-6 lg:p-8">
        <div>
          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
            Customer Portal
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Track Your Parcel
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Enter your tracking number to view the latest shipment status.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
          <form
            onSubmit={searchParcel}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={trackingNumber}
                onChange={(event) => setTrackingNumber(event.target.value)}
                placeholder="Enter tracking number (e.g. QS202610001)"
                aria-label="Tracking number"
                className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Search size={17} />
              {loading ? 'Searching...' : 'Track Parcel'}
            </button>
          </form>

          {error && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
            >
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!searched && (
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              You can search using the tracking number provided when your
              shipment was created.
            </p>
          )}
        </section>

        {shipment && (
          <>
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-4 border-b border-slate-200 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Tracking number
                  </p>
                  <h2 className="mt-1 break-all text-xl font-bold">
                    {trackingId || shipment.id}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Created {formatDate(
                      readString(shipment.createdAt, shipment.created_at),
                    )}
                  </p>
                </div>
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  <Package size={16} />
                  {formatStatus(status)}
                </span>
              </div>

              <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Delivery service
                  </p>
                  <p className="mt-2 font-semibold">
                    {formatStatus(
                      readString(
                        shipment.deliveryType,
                        shipment.delivery_type,
                      ) || 'Standard',
                    )}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Parcel weight
                  </p>
                  <p className="mt-2 font-semibold">
                    {shipment.weight != null
                      ? `${shipment.weight} kg`
                      : 'Not available'}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Estimated price
                  </p>
                  <p className="mt-2 font-semibold">
                    {(shipment.estimatedPrice ?? shipment.estimated_price) != null
                      ? `₹${Number(
                          shipment.estimatedPrice ??
                            shipment.estimated_price,
                        ).toLocaleString('en-IN')}`
                      : 'Not available'}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <h2 className="text-lg font-bold">Shipment Journey</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Follow your parcel through each delivery stage.
              </p>

              {isFailed ? (
                <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                  <AlertCircle size={21} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">{formatStatus(status)}</p>
                    <p className="mt-1 text-sm">
                      Your parcel has entered this status. Please contact
                      customer support for further assistance.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-6">
                  {stages.map((stage, index) => {
                    const StageIcon = stage.icon
                    const completed = currentStage >= 0 && index <= currentStage
                    const current = index === currentStage

                    return (
                      <div key={stage.status} className="flex gap-4">
                        <div className="flex w-10 shrink-0 flex-col items-center">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full ${
                              completed
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                            }`}
                          >
                            {completed && index < currentStage ? (
                              <CheckCircle2 size={19} />
                            ) : (
                              <StageIcon size={19} />
                            )}
                          </div>
                          {index < stages.length - 1 && (
                            <div
                              className={`my-1 min-h-8 w-0.5 flex-1 ${
                                index < currentStage
                                  ? 'bg-indigo-600'
                                  : 'bg-slate-200 dark:bg-slate-700'
                              }`}
                            />
                          )}
                        </div>

                        <div className="flex-1 pb-7">
                          <p
                            className={`font-semibold ${
                              current
                                ? 'text-indigo-600 dark:text-indigo-400'
                                : completed
                                  ? 'text-slate-900 dark:text-slate-100'
                                  : 'text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            {stage.label}
                            {current && (
                              <span className="ml-2 rounded-full bg-indigo-50 px-2 py-1 text-xs dark:bg-indigo-950">
                                Current
                              </span>
                            )}
                          </p>
                          {current && (
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              Latest shipment status: {formatStatus(status)}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                    <UserRound size={20} />
                  </div>
                  <h2 className="font-bold">Sender Details</h2>
                </div>
                <div className="mt-5 space-y-3 text-sm">
                  <p className="font-semibold">{senderName || 'Not available'}</p>
                  <p className="flex items-start gap-2 text-slate-500 dark:text-slate-400">
                    <Phone size={16} className="mt-0.5 shrink-0" />
                    {senderPhone || 'Phone not available'}
                  </p>
                  <p className="flex items-start gap-2 text-slate-500 dark:text-slate-400">
                    <MapPin size={16} className="mt-0.5 shrink-0" />
                    {senderAddress || 'Address not available'}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
                    <MapPin size={20} />
                  </div>
                  <h2 className="font-bold">Receiver Details</h2>
                </div>
                <div className="mt-5 space-y-3 text-sm">
                  <p className="font-semibold">
                    {receiverName || 'Not available'}
                  </p>
                  <p className="flex items-start gap-2 text-slate-500 dark:text-slate-400">
                    <Phone size={16} className="mt-0.5 shrink-0" />
                    {receiverPhone || 'Phone not available'}
                  </p>
                  <p className="flex items-start gap-2 text-slate-500 dark:text-slate-400">
                    <MapPin size={16} className="mt-0.5 shrink-0" />
                    {receiverAddress || 'Address not available'}
                  </p>
                  {shipment.destinationCity && (
                    <p className="text-slate-500 dark:text-slate-400">
                      Destination: {shipment.destinationCity}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold">Tracking History</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Recorded updates for this shipment.
                  </p>
                </div>
                <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold dark:bg-slate-800">
                  {events.length} {events.length === 1 ? 'event' : 'events'}
                </span>
              </div>

              {events.length === 0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
                  <Clock3 className="mx-auto text-slate-400" size={26} />
                  <p className="mt-3 font-medium">No tracking updates yet</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Additional tracking events will appear here when recorded.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-0">
                  {events.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-3 border-l-2 border-indigo-200 py-3 pl-4 dark:border-indigo-900"
                    >
                      <div className="-ml-[23px] mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-indigo-600 bg-white dark:bg-slate-900" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">
                          {formatStatus(item.status)}
                        </p>
                        {item.location && (
                          <p className="mt-1 flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                            <MapPin size={14} />
                            {item.location}
                          </p>
                        )}
                        {(item.description || item.remarks) && (
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            {item.description || item.remarks}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-slate-400">
                          {formatDate(
                            readString(
                              item.timestamp,
                              item.createdAt,
                              item.created_at,
                            ),
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShipment(null)
                  setEvents([])
                  setTrackingNumber('')
                  setError('')
                  setSearched(false)
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <RotateCcw size={16} />
                Track Another Parcel
                <ArrowRight size={15} />
              </button>
            </div>
          </>
        )}

        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <CalendarDays size={19} className="mt-0.5 shrink-0" />
          <p>
            Tracking updates depend on the shipment information recorded by
            QuickShip staff and delivery agents.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}
