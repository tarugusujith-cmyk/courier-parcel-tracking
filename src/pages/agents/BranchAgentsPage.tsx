import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Search,
  Users,
  Truck,
  Package,
  RefreshCw,
  Mail,
  Phone,
  MapPin,
  AlertCircle,
} from 'lucide-react'
import DashboardLayout from '../../components/ui/dashboard/DashboardLayout'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../services/api'

type DeliveryAgent = {
  id: string
  userId?: string
  name?: string
  email?: string
  phone?: string
  branchId?: string
  branchName?: string
  status?: string
  availability?: string
}

type Shipment = {
  id: string
  assignedAgentId?: string
  deliveryAgentId?: string
  agentId?: string
  assignedTo?: string
  status?: string
}

function formatStatus(status?: string) {
  return (status || 'unknown').replace(/_/g, ' ')
}

function getStatusStyle(status?: string) {
  const normalized = (status || '').toLowerCase()

  if (['active', 'available', 'online'].includes(normalized)) {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
  }

  if (['busy', 'on_delivery', 'on delivery'].includes(normalized)) {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
  }

  if (['inactive', 'unavailable', 'offline'].includes(normalized)) {
    return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
  }

  return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
}

export default function BranchAgentsPage() {
  const { user } = useAuth()

  const [agents, setAgents] = useState<DeliveryAgent[]>([])
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [agentResponse, shipmentResponse] = await Promise.all([
        api.get<DeliveryAgent[]>('/deliveryAgents'),
        api.get<Shipment[]>('/shipments'),
      ])

      setAgents(agentResponse.data)
      setShipments(shipmentResponse.data)
    } catch {
      setError(
        'Unable to load delivery agents. Please check that JSON Server is running.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const branchAgents = useMemo(() => {
    const branchId = user?.branchId

    // If a branch ID exists on the logged-in user, show that branch's agents.
    // If not, show all agents rather than accidentally hiding every agent.
    const scopedAgents = branchId
      ? agents.filter((agent) => agent.branchId === branchId)
      : agents

    return scopedAgents.filter((agent) => {
      const query = search.trim().toLowerCase()

      const matchesSearch =
        !query ||
        agent.id.toLowerCase().includes(query) ||
        (agent.name || '').toLowerCase().includes(query) ||
        (agent.email || '').toLowerCase().includes(query) ||
        (agent.phone || '').toLowerCase().includes(query)

      const agentStatus = (
        agent.status ||
        agent.availability ||
        'unknown'
      ).toLowerCase()

      const matchesStatus =
        statusFilter === 'all' ||
        agentStatus === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [agents, search, statusFilter, user])

  const getShipmentCount = (agent: DeliveryAgent) => {
    return shipments.filter((shipment) => {
      const assignedIds = [
        shipment.assignedAgentId,
        shipment.deliveryAgentId,
        shipment.agentId,
        shipment.assignedTo,
      ]

      return assignedIds.some(
        (id) => id === agent.id || id === agent.userId,
      )
    }).length
  }

  const activeCount = branchAgents.filter((agent) =>
    ['active', 'available', 'online'].includes(
      (agent.status || agent.availability || '').toLowerCase(),
    ),
  ).length

  const busyCount = branchAgents.filter((agent) =>
    ['busy', 'on_delivery', 'on delivery'].includes(
      (agent.status || agent.availability || '').toLowerCase(),
    ),
  ).length

  const assignedShipmentCount = shipments.filter((shipment) => {
    const agentIds = branchAgents.flatMap((agent) => [
      agent.id,
      agent.userId,
    ])

    return [
      shipment.assignedAgentId,
      shipment.deliveryAgentId,
      shipment.agentId,
      shipment.assignedTo,
    ].some((id) => Boolean(id) && agentIds.includes(id))
  }).length

  return (
    <DashboardLayout>
      <div className="min-h-full space-y-6 text-slate-900 dark:text-white">
        {/* Page heading */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              Delivery Agents
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              View delivery agents and monitor their assigned shipments.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Total Agents
              </p>
              <Users className="text-blue-600" size={21} />
            </div>
            <p className="mt-3 text-3xl font-bold">
              {branchAgents.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Active / Available
              </p>
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
            </div>
            <p className="mt-3 text-3xl font-bold">{activeCount}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Busy Agents
              </p>
              <Truck className="text-amber-500" size={21} />
            </div>
            <p className="mt-3 text-3xl font-bold">{busyCount}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Assigned Shipments
              </p>
              <Package className="text-violet-500" size={21} />
            </div>
            <p className="mt-3 text-3xl font-bold">
              {assignedShipmentCount}
            </p>
          </div>
        </div>

        {/* Search and filters */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, email, phone or agent ID..."
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-blue-950"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
              aria-label="Filter agents by status"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="on_delivery">On Delivery</option>
              <option value="inactive">Inactive</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        </section>

        {/* Error and loading states */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {loading && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Loading delivery agents...
          </p>
        )}

        {/* Agents list */}
        {!loading && !error && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Agent Directory</h2>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {branchAgents.length} agent
                {branchAgents.length === 1 ? '' : 's'}
              </span>
            </div>

            {branchAgents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center dark:border-slate-700">
                <Users
                  size={40}
                  className="mx-auto mb-3 text-slate-400"
                />
                <h3 className="font-semibold">No agents found</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Try changing your search or status filter.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {branchAgents.map((agent) => {
                  const status = agent.status || agent.availability || 'unknown'

                  return (
                    <article
                      key={agent.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            <Truck size={23} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate font-semibold">
                              {agent.name || 'Unnamed Agent'}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              ID: {agent.id}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusStyle(status)}`}
                        >
                          {formatStatus(status)}
                        </span>
                      </div>

                      <div className="mt-5 space-y-3">
                        <div className="flex min-w-0 items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                          <Mail size={16} className="shrink-0 text-slate-400" />
                          <span className="break-all">
                            {agent.email || 'Email not provided'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                          <Phone size={16} className="shrink-0 text-slate-400" />
                          <span>{agent.phone || 'Phone not provided'}</span>
                        </div>

                        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                          <MapPin size={16} className="shrink-0 text-slate-400" />
                          <span className="break-words">
                            {agent.branchName || agent.branchId || 'Branch not specified'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-700">
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                          <Package size={17} />
                          Assigned shipments
                        </div>
                        <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold dark:bg-slate-800">
                          {getShipmentCount(agent)}
                        </span>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </DashboardLayout>
  )
}
