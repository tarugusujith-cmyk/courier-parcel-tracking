import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  MapPin,
  Package,
  RefreshCw,
  Search,
  Truck,
} from 'lucide-react'
import DashboardLayout from '../../components/ui/dashboard/DashboardLayout'
import api from '../../services/api'

type ShipmentStatus =
  | 'shipment_created'
  | 'branch_received'
  | 'processing'
  | 'in_transit'
  | 'arrived_at_destination'
  | 'agent_assigned'
  | 'out_for_delivery'
  | 'delivered'
  | 'delivery_failed'
  | 'cancelled'
  | 'returned_to_sender'

type Shipment = {
  id: string
  trackingNumber: string
  senderName?: string
  receiverName?: string
  customerId?: string
  senderCustomerId?: string
  destinationCity?: string
  originBranchId?: string
  destinationBranchId?: string
  currentBranchId?: string
  assignedAgentId?: string
  weight?: number
  deliveryType?: 'standard' | 'express' | 'same_day'
  status: ShipmentStatus
  createdAt: string
}

type Branch = { id: string; name: string; city: string }
type DeliveryAgent = { id: string; name: string; phone?: string; vehicleNumber?: string }
type TrackingEvent = {
  id: string
  shipmentId: string
  status: ShipmentStatus
  description?: string
  location?: string
  timestamp?: string
  createdAt?: string
}

const statusLabels: Record<ShipmentStatus, string> = {
  shipment_created: 'Shipment Created',
  branch_received: 'Branch Received',
  processing: 'Processing',
  in_transit: 'In Transit',
  arrived_at_destination: 'Arrived at Destination',
  agent_assigned: 'Agent Assigned',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  delivery_failed: 'Delivery Failed',
  cancelled: 'Cancelled',
  returned_to_sender: 'Returned to Sender',
}

const journey: ShipmentStatus[] = [
  'shipment_created',
  'branch_received',
  'processing',
  'in_transit',
  'arrived_at_destination',
  'agent_assigned',
  'out_for_delivery',
  'delivered',
]

const formatDate = (value?: string) => {
  if (!value) return 'Not recorded'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not recorded'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const formatShortDate = (value?: string) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function statusTone(status: ShipmentStatus) {
  if (status === 'delivered') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
  if (status === 'delivery_failed' || status === 'cancelled' || status === 'returned_to_sender') {
    return 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
  }
  if (status === 'out_for_delivery') return 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400'
  return 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
}

export default function TrackingPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [agents, setAgents] = useState<DeliveryAgent[]>([])
  const [history, setHistory] = useState<TrackingEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [activeTrackingNumber, setActiveTrackingNumber] = useState('')
  const [searchMessage, setSearchMessage] = useState('')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')

    try {
      const [shipmentResponse, branchResponse, agentResponse, historyResponse] = await Promise.all([
        api.get<Shipment[]>('/shipments'),
        api.get<Branch[]>('/branches'),
        api.get<DeliveryAgent[]>('/deliveryAgents'),
        api.get<TrackingEvent[]>('/trackingHistory'),
      ])

      setShipments(shipmentResponse.data)
      setBranches(branchResponse.data)
      setAgents(agentResponse.data)
      setHistory(historyResponse.data)

      if (!activeTrackingNumber && shipmentResponse.data.length > 0) {
        setActiveTrackingNumber(shipmentResponse.data[0].trackingNumber)
        setSearchInput(shipmentResponse.data[0].trackingNumber)
      }
    } catch {
      setLoadError('Unable to load tracking data. Make sure JSON Server is running on port 5000.')
    } finally {
      setIsLoading(false)
    }
  }, [activeTrackingNumber])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const selectedShipment = useMemo(
    () => shipments.find((shipment) => shipment.trackingNumber === activeTrackingNumber),
    [shipments, activeTrackingNumber],
  )

  const filteredHistory = useMemo(() => {
    if (!selectedShipment) return []
    return history
      .filter((event) => event.shipmentId === selectedShipment.id)
      .sort((a, b) => {
        const aDate = new Date(a.timestamp ?? a.createdAt ?? 0).getTime()
        const bDate = new Date(b.timestamp ?? b.createdAt ?? 0).getTime()
        return bDate - aDate
      })
  }, [history, selectedShipment])

  const originBranch = branches.find((branch) => branch.id === selectedShipment?.originBranchId)
  const destinationBranch = branches.find((branch) => branch.id === selectedShipment?.destinationBranchId)
  const currentBranch = branches.find((branch) => branch.id === selectedShipment?.currentBranchId)
  const assignedAgent = agents.find((agent) => agent.id === selectedShipment?.assignedAgentId)
  const isTerminal = selectedShipment
    ? ['delivered', 'delivery_failed', 'cancelled', 'returned_to_sender'].includes(selectedShipment.status)
    : false
  const currentJourneyIndex = selectedShipment ? journey.indexOf(selectedShipment.status) : -1

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = searchInput.trim().toLowerCase()

    if (!query) {
      setActiveTrackingNumber('')
      setSearchMessage('Please enter a tracking number to track your parcel.')
      return
    }

    const match = shipments.find(
      (shipment) => shipment.trackingNumber.trim().toLowerCase() === query,
    )

    if (match) {
      setActiveTrackingNumber(match.trackingNumber)
      setSearchInput(match.trackingNumber)
      setSearchMessage('')
      return
    }

    setActiveTrackingNumber('')
    setSearchMessage(`No parcel found for tracking number “${searchInput.trim()}”. Please check the number and try again.`)
  }

  return (
    <DashboardLayout>
      <main className="min-w-0 space-y-6 text-slate-900 dark:text-slate-100">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Operations / Tracking</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Shipment Tracking</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Follow a parcel’s journey from booking to final delivery.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <RefreshCw size={16} /> Refresh data
          </button>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <Search size={20} />
            </div>
            <div>
              <h2 className="font-semibold">Track your shipment</h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Enter the exact tracking number to view the latest status.</p>
            </div>
          </div>
          <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
            <label className="relative block min-w-0 flex-1">
              <span className="sr-only">Tracking number</span>
              <Package size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="e.g. QS202610001"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
              Track parcel <ArrowRight size={16} />
            </button>
          </form>
          {searchMessage && (
            <p
              role="alert"
              aria-live="polite"
              className={`mt-3 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${
                searchMessage.startsWith('No parcel found')
                  ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300'
                  : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300'
              }`}
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{searchMessage}</span>
            </p>
          )}
          {!isLoading && shipments.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="mr-1 self-center text-xs font-medium text-slate-500 dark:text-slate-400">Recent tracking IDs:</span>
              {shipments.slice(0, 4).map((shipment) => (
                <button
                  key={shipment.id}
                  type="button"
                  onClick={() => {
                    setSearchInput(shipment.trackingNumber)
                    setActiveTrackingNumber(shipment.trackingNumber)
                    setSearchMessage('')
                  }}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${activeTrackingNumber === shipment.trackingNumber ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-500/10 dark:text-blue-300' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                >
                  {shipment.trackingNumber}
                </button>
              ))}
            </div>
          )}
        </section>

        {loadError && (
          <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <p>{loadError}</p>
            <button type="button" onClick={() => void loadData()} className="font-semibold underline">Retry</button>
          </div>
        )}

        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <RefreshCw size={18} className="animate-spin" /> Loading shipment tracking…
          </div>
        ) : selectedShipment ? (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <InfoCard icon={<Package size={19} />} label="Tracking number" value={selectedShipment.trackingNumber} accent="blue" />
              <InfoCard icon={<Clock3 size={19} />} label="Booked on" value={formatShortDate(selectedShipment.createdAt)} accent="violet" />
              <InfoCard icon={<MapPin size={19} />} label="Current location" value={currentBranch?.city ?? currentBranch?.name ?? selectedShipment.destinationCity ?? 'Not recorded'} accent="amber" />
              <InfoCard icon={<Truck size={19} />} label="Delivery type" value={selectedShipment.deliveryType ? selectedShipment.deliveryType.replace('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : 'Not recorded'} accent="emerald" />
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <h2 className="text-lg font-bold">Delivery journey</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Status updates recorded for this shipment.</p>
                  </div>
                  <span className={`inline-flex w-fit items-center rounded-full px-3 py-1.5 text-xs font-semibold ${statusTone(selectedShipment.status)}`}>
                    {statusLabels[selectedShipment.status] ?? selectedShipment.status}
                  </span>
                </div>

                {isTerminal && selectedShipment.status !== 'delivered' ? (
                  <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                    <p className="font-semibold">{statusLabels[selectedShipment.status]}</p>
                    <p className="mt-1">This shipment has reached a final status. Review the tracking history below for recorded updates.</p>
                  </div>
                ) : null}

                <div className="mt-6">
                  {journey.map((status, index) => {
                    const completed = currentJourneyIndex >= index || selectedShipment.status === 'delivered'
                    const isCurrent = selectedShipment.status === status
                    return (
                      <div key={status} className="relative flex gap-4 pb-6 last:pb-0">
                        {index < journey.length - 1 && (
                          <span className={`absolute left-[15px] top-8 h-[calc(100%-1rem)] w-0.5 ${completed && currentJourneyIndex > index ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
                        )}
                        <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${isCurrent ? 'border-blue-600 bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-950' : completed ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900'}`}>
                          {completed ? <CheckCircle2 size={17} /> : <span className="text-xs font-semibold">{index + 1}</span>}
                        </span>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                            <p className={`text-sm font-semibold ${isCurrent ? 'text-blue-700 dark:text-blue-300' : completed ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>{statusLabels[status]}</p>
                            {isCurrent && <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Current status</span>}
                          </div>
                          {isCurrent && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Last known update: {formatDate(selectedShipment.createdAt)}</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {filteredHistory.length > 0 ? (
                  <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
                    <h3 className="font-semibold">Tracking history</h3>
                    <div className="mt-3 space-y-4">
                      {filteredHistory.map((event) => (
                        <div key={event.id} className="flex gap-3">
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col justify-between gap-1 sm:flex-row">
                              <p className="text-sm font-semibold">{statusLabels[event.status] ?? event.status}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(event.timestamp ?? event.createdAt)}</p>
                            </div>
                            {event.description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{event.description}</p>}
                            {event.location && <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400"><MapPin size={13} />{event.location}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mt-5 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                    No separate tracking events have been recorded yet. The timeline shows the shipment’s current status from the shipment record.
                  </p>
                )}
              </div>

              <div className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h2 className="text-lg font-bold">Shipment details</h2>
                  <div className="mt-4 space-y-4">
                    <DetailRow label="Sender" value={selectedShipment.senderName || 'Not provided'} />
                    <DetailRow label="Receiver" value={selectedShipment.receiverName || 'Not provided'} />
                    <DetailRow label="Weight" value={selectedShipment.weight != null ? `${selectedShipment.weight} kg` : 'Not recorded'} />
                    <DetailRow label="Created" value={formatDate(selectedShipment.createdAt)} />
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h2 className="text-lg font-bold">Route information</h2>
                  <div className="mt-4 space-y-4">
                    <RoutePoint label="Origin branch" name={originBranch?.name ?? 'Not assigned'} city={originBranch?.city} isOrigin />
                    <div className="ml-4 h-5 border-l-2 border-dashed border-slate-300 dark:border-slate-700" />
                    <RoutePoint label="Destination branch" name={destinationBranch?.name ?? selectedShipment.destinationCity ?? 'Not provided'} city={destinationBranch?.city ?? selectedShipment.destinationCity} />
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center gap-2">
                    <Truck size={19} className="text-blue-600 dark:text-blue-400" />
                    <h2 className="text-lg font-bold">Delivery agent</h2>
                  </div>
                  {assignedAgent ? (
                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                        {assignedAgent.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold">{assignedAgent.name}</p>
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{assignedAgent.phone || 'Phone not provided'}</p>
                        {assignedAgent.vehicleNumber && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Vehicle: {assignedAgent.vehicleNumber}</p>}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">No delivery agent has been assigned to this shipment.</p>
                  )}
                </section>
              </div>
            </section>
          </>
        ) : !isLoading && !loadError ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center dark:border-slate-700 dark:bg-slate-900">
            <div className="rounded-full bg-slate-100 p-3 text-slate-500 dark:bg-slate-800 dark:text-slate-300"><Search size={24} /></div>
            <h2 className="mt-3 font-semibold">No matching shipment</h2>
            <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">Enter a valid tracking number or select one of the recent tracking IDs above.</p>
          </div>
        ) : null}
      </main>
    </DashboardLayout>
  )
}

function InfoCard({ icon, label, value, accent }: { icon: ReactNode; label: string; value: string; accent: 'blue' | 'violet' | 'amber' | 'emerald' }) {
  const accentStyles = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 break-words text-lg font-bold tracking-tight">{value}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${accentStyles[accent]}`}>{icon}</div>
      </div>
    </article>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0 dark:border-slate-800">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="max-w-[60%] break-words text-right text-sm font-semibold">{value}</p>
    </div>
  )
}

function RoutePoint({ label, name, city, isOrigin = false }: { label: string; name: string; city?: string; isOrigin?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isOrigin ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'}`}>
        <MapPin size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-0.5 break-words text-sm font-semibold">{name}</p>
        {city && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{city}</p>}
      </div>
    </div>
  )
}
