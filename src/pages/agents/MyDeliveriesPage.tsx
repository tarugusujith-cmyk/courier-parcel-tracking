
import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  Package,
  MapPin,
  Phone,
  CheckCircle2,
  Clock3,
  Truck,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import DashboardLayout from '../../components/ui/dashboard/DashboardLayout'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'

type Shipment = {
  id: string
  trackingNumber?: string
  senderName?: string
  receiverName?: string
  receiverPhone?: string
  receiverAddress?: string
  destinationAddress?: string
  destinationBranchName?: string
  status: string
  assignedAgentId?: string
  deliveryAgentId?: string
  agentId?: string
  assignedTo?: string
  customerId?: string
  updatedAt?: string
}

type DeliveryAgent = {
  id: string
  userId?: string
  name?: string
  email?: string
}

const deliveryStatuses = [
  'agent_assigned',
  'out_for_delivery',
  'delivered',
  'failed_delivery',
] as const

function formatStatus(status: string) {
  return status.replaceAll('_', ' ').replace(/\b\w/g, (char) =>
    char.toUpperCase(),
  )
}

function statusStyle(status: string) {
  switch (status) {
    case 'delivered':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
    case 'out_for_delivery':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
    case 'failed_delivery':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
    default:
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
  }
}

export default function MyDeliveriesPage() {
  const { user } = useAuth()
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [agents, setAgents] = useState<DeliveryAgent[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadDeliveries = async () => {
    setLoading(true)
    setError('')

    try {
      const [shipmentResponse, agentResponse] = await Promise.all([
        api.get<Shipment[]>('/shipments'),
        api.get<DeliveryAgent[]>('/deliveryAgents'),
      ])

      setShipments(shipmentResponse.data)
      setAgents(agentResponse.data)
    } catch {
      setError(
        'Could not load deliveries. Check that JSON Server is running on port 5000.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDeliveries()
  }, [])

  const currentAgent = useMemo(() => {
  const email = user?.email?.toLowerCase()

  return agents.find(
    (agent) =>
      agent.id === user?.agentId ||
      agent.userId === user?.id ||
      (!!email && agent.email?.toLowerCase() === email),
  )
}, [agents, user])

const myDeliveries = useMemo(() => {
  const agentIds = [
    currentAgent?.id,
    user?.agentId,
    user?.id,
  ].filter((value): value is string => Boolean(value))

  return shipments.filter((shipment) => {
    const assignedIds = [
      shipment.assignedAgentId,
      shipment.deliveryAgentId,
      shipment.agentId,
      shipment.assignedTo,
    ].filter((value): value is string => Boolean(value))

    return agentIds.some((id) => assignedIds.includes(id))
  })
}, [shipments, currentAgent, user])

  const filteredDeliveries = useMemo(() => {
    const term = search.trim().toLowerCase()

    return myDeliveries.filter((shipment) => {
      const matchesSearch = [
        shipment.trackingNumber,
        shipment.id,
        shipment.receiverName,
        shipment.receiverPhone,
        shipment.receiverAddress,
        shipment.destinationAddress,
      ].some((value) => value?.toLowerCase().includes(term))

      const matchesStatus =
        statusFilter === 'all' || shipment.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [myDeliveries, search, statusFilter])

  const updateStatus = async (
    shipment: Shipment,
    nextStatus: string,
  ) => {
    if (!deliveryStatuses.includes(nextStatus as (typeof deliveryStatuses)[number])) {
      return
    }

    if (
      nextStatus === 'delivered' &&
      !window.confirm('Confirm that this parcel has been delivered?')
    ) {
      return
    }

    setUpdatingId(shipment.id)
    setError('')
    setNotice('')

    try {
      const updatedAt = new Date().toISOString()

      await api.patch(`/shipments/${shipment.id}`, {
        status: nextStatus,
        updatedAt,
      })

      try {
        await api.post('/trackingHistory', {
          shipmentId: shipment.id,
          trackingNumber: shipment.trackingNumber ?? shipment.id,
          status: nextStatus,
          location: shipment.destinationAddress ?? 'Delivery location',
          description: `Delivery status updated to ${formatStatus(nextStatus)}.`,
          timestamp: updatedAt,
          updatedBy: user?.id ?? user?.email ?? 'delivery_agent',
        })
      } catch {
        // The shipment update has succeeded; history can be repaired separately.
        setNotice(
          'Shipment status updated, but tracking history could not be saved.',
        )
        await loadDeliveries()
        return
      }

      setNotice(`Shipment status changed to ${formatStatus(nextStatus)}.`)
      await loadDeliveries()
    } catch {
      setError('Could not update the shipment status. Please try again.')
    } finally {
      setUpdatingId(null)
    }
  }

  const countByStatus = (status: string) =>
    myDeliveries.filter((shipment) => shipment.status === status).length

  return (
    <DashboardLayout>
      <main className="min-w-0 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
              Delivery operations
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
              My Deliveries
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              View your assigned parcels and update delivery progress.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadDeliveries()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:self-auto"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {notice && (
          <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
            {notice}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Assigned deliveries',
              value: myDeliveries.length,
              icon: Package,
              color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300',
            },
            {
              label: 'Out for delivery',
              value: countByStatus('out_for_delivery'),
              icon: Truck,
              color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300',
            },
            {
              label: 'Delivered',
              value: countByStatus('delivered'),
              icon: CheckCircle2,
              color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300',
            },
            {
              label: 'Failed deliveries',
              value: countByStatus('failed_delivery'),
              icon: Clock3,
              color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-300',
            },
          ].map((item) => {
            const Icon = item.icon

            return (
              <article
                key={item.label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {item.label}
                  </p>
                  <span className={`rounded-xl p-2.5 ${item.color}`}>
                    <Icon size={19} />
                  </span>
                </div>
                <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">
                  {item.value}
                </p>
              </article>
            )
          })}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search tracking number, receiver or address..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              aria-label="Filter deliveries by status"
            >
              <option value="all">All statuses</option>
              <option value="agent_assigned">Agent assigned</option>
              <option value="out_for_delivery">Out for delivery</option>
              <option value="delivered">Delivered</option>
              <option value="failed_delivery">Failed delivery</option>
            </select>
          </div>
        </section>

        <section className="space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              Loading your deliveries...
            </div>
          ) : filteredDeliveries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
              <Package size={36} className="mx-auto text-slate-400" />
              <h2 className="mt-4 font-semibold text-slate-900 dark:text-white">
                No deliveries found
              </h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Try another search or check whether shipments have been assigned to your agent account.
              </p>
            </div>
          ) : (
            filteredDeliveries.map((shipment) => (
              <article
                key={shipment.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-6"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {shipment.trackingNumber ?? shipment.id}
                      </span>
                      <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyle(shipment.status)}`}>
                        {formatStatus(shipment.status)}
                      </span>
                    </div>

                    <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                      {shipment.receiverName || 'Receiver not specified'}
                    </h2>

                    <div className="mt-3 space-y-2 text-sm text-slate-500 dark:text-slate-400">
                      <p className="flex items-start gap-2">
                        <MapPin size={16} className="mt-0.5 shrink-0" />
                        <span>
                          {shipment.destinationAddress ||
                            shipment.receiverAddress ||
                            shipment.destinationBranchName ||
                            'Destination not specified'}
                        </span>
                      </p>
                      {shipment.receiverPhone && (
                        <p className="flex items-center gap-2">
                          <Phone size={16} />
                          {shipment.receiverPhone}
                        </p>
                      )}
                      <p>
                        Sender: {shipment.senderName || 'Not specified'}
                      </p>
                    </div>
                  </div>

                  <div className="w-full lg:w-60">
                    <label
                      htmlFor={`status-${shipment.id}`}
                      className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                    >
                      Update delivery status
                    </label>
                    <select
                      id={`status-${shipment.id}`}
                      value={shipment.status}
                      disabled={updatingId === shipment.id || shipment.status === 'delivered'}
                      onChange={(event) =>
                        void updateStatus(shipment, event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {!deliveryStatuses.includes(
                        shipment.status as (typeof deliveryStatuses)[number],
                      ) && (
                        <option value={shipment.status}>
                          {formatStatus(shipment.status)}
                        </option>
                      )}
                      <option value="agent_assigned">Agent assigned</option>
                      <option value="out_for_delivery">Out for delivery</option>
                      <option value="delivered">Delivered</option>
                      <option value="failed_delivery">Failed delivery</option>
                    </select>
                    {updatingId === shipment.id && (
                      <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                        Saving status...
                      </p>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      </main>
    </DashboardLayout>
  )
}
