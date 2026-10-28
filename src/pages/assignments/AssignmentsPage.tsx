import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  LoaderCircle,
  MapPin,
  Package,
  RefreshCw,
  Search,
  Truck,
  UserRound,
  X,
} from 'lucide-react'
import api from '../../services/api'

import DashboardLayout from '../../components/ui/dashboard/DashboardLayout'

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

type AgentAvailability = 'available' | 'busy' | 'unavailable'

interface ShipmentRecord {
  id: string
  trackingNumber?: string
  senderName?: string
  receiverName?: string
  destinationCity?: string
  destinationAddress?: string
  deliveryType?: 'standard' | 'express' | 'same_day'
  status: ShipmentStatus
  assignedAgentId?: string
  originBranchId?: string
  currentBranchId?: string
  destinationBranchId?: string
  createdAt?: string
}

interface AgentRecord {
  id: string
  name: string
  email?: string
  phone?: string
  branchId?: string
  vehicleNumber?: string
  vehicleType?: 'bike' | 'van' | 'truck'
  availability: AgentAvailability
}

interface BranchRecord {
  id: string
  name: string
  code?: string
  city?: string
}

const terminalStatuses: ShipmentStatus[] = [
  'delivered',
  'cancelled',
  'returned_to_sender',
]

const statusLabels: Record<ShipmentStatus, string> = {
  shipment_created: 'Shipment created',
  branch_received: 'Branch received',
  processing: 'Processing',
  in_transit: 'In transit',
  arrived_at_destination: 'At destination branch',
  agent_assigned: 'Agent assigned',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  delivery_failed: 'Delivery failed',
  cancelled: 'Cancelled',
  returned_to_sender: 'Returned to sender',
}

const statusStyles: Record<ShipmentStatus, string> = {
  shipment_created: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  branch_received: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  processing: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
  in_transit: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',
  arrived_at_destination: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300',
  agent_assigned: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  out_for_delivery: 'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300',
  delivered: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  delivery_failed: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  returned_to_sender: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
}

function formatStatus(status: ShipmentStatus) {
  return statusLabels[status] ?? status.replaceAll('_', ' ')
}

function formatDate(value?: string) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getDeliveryTypeLabel(value?: ShipmentRecord['deliveryType']) {
  if (!value) return 'Standard'
  return value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

export default function AssignmentsPage() {
  const [shipments, setShipments] = useState<ShipmentRecord[]>([])
  const [agents, setAgents] = useState<AgentRecord[]>([])
  const [branches, setBranches] = useState<BranchRecord[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [agentFilter, setAgentFilter] = useState('all')
  const [selectedAgents, setSelectedAgents] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [savingShipmentId, setSavingShipmentId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [shipmentResponse, agentResponse, branchResponse] = await Promise.all([
        api.get<ShipmentRecord[]>('/shipments'),
        api.get<AgentRecord[]>('/deliveryAgents'),
        api.get<BranchRecord[]>('/branches'),
      ])

      setShipments(shipmentResponse.data)
      setAgents(agentResponse.data)
      setBranches(branchResponse.data)
    } catch {
      setError('Unable to load assignment data. Check that JSON Server is running on port 5000.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const branchNames = useMemo(
    () => Object.fromEntries(branches.map((branch) => [branch.id, branch.name])),
    [branches],
  )

  const assignableShipments = useMemo(
    () => shipments.filter((shipment) => !terminalStatuses.includes(shipment.status)),
    [shipments],
  )

  const filteredShipments = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return assignableShipments.filter((shipment) => {
      const matchesSearch =
        !normalizedSearch ||
        shipment.trackingNumber?.toLowerCase().includes(normalizedSearch) ||
        shipment.id.toLowerCase().includes(normalizedSearch) ||
        shipment.receiverName?.toLowerCase().includes(normalizedSearch) ||
        shipment.senderName?.toLowerCase().includes(normalizedSearch) ||
        shipment.destinationCity?.toLowerCase().includes(normalizedSearch)

      const matchesStatus = statusFilter === 'all' || shipment.status === statusFilter
      const matchesAgent =
        agentFilter === 'all' ||
        (agentFilter === 'unassigned'
          ? !shipment.assignedAgentId
          : shipment.assignedAgentId === agentFilter)

      return Boolean(matchesSearch && matchesStatus && matchesAgent)
    })
  }, [assignableShipments, searchTerm, statusFilter, agentFilter])

  const availableAgents = agents.filter((agent) => agent.availability === 'available')
  const assignedCount = assignableShipments.filter((shipment) => shipment.assignedAgentId).length
  const unassignedCount = assignableShipments.length - assignedCount
  const busyCount = agents.filter((agent) => agent.availability === 'busy').length

  const handleAssign = async (shipment: ShipmentRecord) => {
    const agentId = selectedAgents[shipment.id]

    if (!agentId) {
      setError('Choose an available delivery agent before assigning the shipment.')
      setSuccess('')
      return
    }

    const agent = agents.find((item) => item.id === agentId)

    if (!agent || agent.availability !== 'available') {
      setError('This agent is no longer available. Refresh the data and choose another agent.')
      setSuccess('')
      return
    }

    setSavingShipmentId(shipment.id)
    setError('')
    setSuccess('')

    try {
      await api.patch(`/shipments/${shipment.id}`, {
        assignedAgentId: agent.id,
        status: 'agent_assigned',
      })

      try {
        await api.patch(`/deliveryAgents/${agent.id}`, {
          availability: 'busy',
        })
      } catch {
        await loadData()
        setError(
          'The shipment was assigned, but the agent availability could not be updated. Refresh the data and check the agent record.',
        )
        return
      }

      setSuccess(`${shipment.trackingNumber || shipment.id} assigned to ${agent.name}.`)
      setSelectedAgents((current) => {
        const next = { ...current }
        delete next[shipment.id]
        return next
      })

      await loadData()
    } catch {
      setError('Assignment failed. Please try again.')
    } finally {
      setSavingShipmentId(null)
    }
  }

  return (
    <DashboardLayout>
    <div className="min-h-full space-y-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
            <ClipboardList size={16} />
            Operations
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Delivery Assignments</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Assign active shipments to available delivery agents and review current allocation.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          disabled={loading}
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:self-auto"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError('')} aria-label="Dismiss error">
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300"
        >
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <span className="flex-1">{success}</span>
          <button type="button" onClick={() => setSuccess('')} aria-label="Dismiss success">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={<Package size={19} />}
          label="Active shipments"
          value={loading ? '—' : String(assignableShipments.length)}
          note="Awaiting final delivery or closure"
          iconClass="bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300"
        />
        <SummaryCard
          icon={<ClipboardList size={19} />}
          label="Assigned"
          value={loading ? '—' : String(assignedCount)}
          note="Active shipments with an agent"
          iconClass="bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300"
        />
        <SummaryCard
          icon={<AlertCircle size={19} />}
          label="Unassigned"
          value={loading ? '—' : String(unassignedCount)}
          note="Need an available delivery agent"
          iconClass="bg-orange-50 text-orange-600 dark:bg-orange-950/60 dark:text-orange-300"
        />
        <SummaryCard
          icon={<Truck size={19} />}
          label="Busy agents"
          value={loading ? '—' : String(busyCount)}
          note={`${availableAgents.length} agent${availableAgents.length === 1 ? '' : 's'} currently available`}
          iconClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative block min-w-0 flex-1">
            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search tracking number, recipient, shipment ID..."
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[390px]">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by shipment status"
              className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="all">All active statuses</option>
              {Object.entries(statusLabels)
                .filter(([status]) => !terminalStatuses.includes(status as ShipmentStatus))
                .map(([status, label]) => (
                  <option key={status} value={status}>
                    {label}
                  </option>
                ))}
            </select>

            <select
              value={agentFilter}
              onChange={(event) => setAgentFilter(event.target.value)}
              aria-label="Filter by assignment"
              className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="all">All assignments</option>
              <option value="unassigned">Unassigned only</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-1 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="font-semibold">Active shipment queue</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Select an available agent to assign or reassign a shipment.
            </p>
          </div>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {loading ? 'Loading…' : `${filteredShipments.length} result${filteredShipments.length === 1 ? '' : 's'}`}
          </span>
        </div>

        {loading ? (
          <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-slate-500 dark:text-slate-400">
            <LoaderCircle size={20} className="animate-spin" />
            Loading assignment data...
          </div>
        ) : filteredShipments.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
            <div className="mb-3 rounded-2xl bg-slate-100 p-3 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <Package size={24} />
            </div>
            <h3 className="font-semibold">No active shipments found</h3>
            <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
              Try changing the filters or create a shipment to begin assigning deliveries.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/70 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Shipment</th>
                    <th className="px-5 py-3.5 font-semibold">Destination</th>
                    <th className="px-5 py-3.5 font-semibold">Status</th>
                    <th className="px-5 py-3.5 font-semibold">Current agent</th>
                    <th className="px-5 py-3.5 font-semibold">Assign agent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredShipments.map((shipment) => {
                    const currentAgent = agents.find((agent) => agent.id === shipment.assignedAgentId)
                    const selectedAgentId = selectedAgents[shipment.id] ?? ''
                    const isSaving = savingShipmentId === shipment.id

                    return (
                      <tr key={shipment.id} className="align-top transition hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {shipment.trackingNumber || shipment.id}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {shipment.senderName || 'Sender'} <ArrowRight size={11} className="mx-1 inline" />{' '}
                            {shipment.receiverName || 'Recipient'}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {getDeliveryTypeLabel(shipment.deliveryType)} · {formatDate(shipment.createdAt)}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="flex items-center gap-1.5 font-medium">
                            <MapPin size={14} className="shrink-0 text-slate-400" />
                            {shipment.destinationCity || 'Destination not set'}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {branchNames[shipment.destinationBranchId || ''] || 'Destination branch not set'}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[shipment.status]}`}>
                            {formatStatus(shipment.status)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {currentAgent ? (
                            <div className="flex items-center gap-2.5">
                              <Avatar name={currentAgent.name} />
                              <div>
                                <p className="font-medium">{currentAgent.name}</p>
                                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                  {currentAgent.vehicleNumber || currentAgent.vehicleType || 'Delivery agent'}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">Not assigned</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex min-w-[245px] items-center gap-2">
                            <select
                              value={selectedAgentId}
                              onChange={(event) =>
                                setSelectedAgents((current) => ({
                                  ...current,
                                  [shipment.id]: event.target.value,
                                }))
                              }
                              disabled={isSaving || availableAgents.length === 0}
                              aria-label={`Choose agent for ${shipment.trackingNumber || shipment.id}`}
                              className="min-h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:disabled:bg-slate-800"
                            >
                              <option value="">
                                {availableAgents.length ? 'Select available agent' : 'No available agents'}
                              </option>
                              {availableAgents.map((agent) => (
                                <option key={agent.id} value={agent.id}>
                                  {agent.name} · {agent.vehicleType || 'vehicle'}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => void handleAssign(shipment)}
                              disabled={!selectedAgentId || isSaving}
                              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isSaving ? <LoaderCircle size={14} className="animate-spin" /> : 'Assign'}
                            </button>
                          </div>
                          {availableAgents.length === 0 && (
                            <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                              Mark an agent as available on the Agents page first.
                            </p>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-3 md:hidden">
              {filteredShipments.map((shipment) => {
                const currentAgent = agents.find((agent) => agent.id === shipment.assignedAgentId)
                const selectedAgentId = selectedAgents[shipment.id] ?? ''
                const isSaving = savingShipmentId === shipment.id

                return (
                  <article
                    key={shipment.id}
                    className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-all font-semibold">{shipment.trackingNumber || shipment.id}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {shipment.senderName || 'Sender'} → {shipment.receiverName || 'Recipient'}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${statusStyles[shipment.status]}`}>
                        {formatStatus(shipment.status)}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Destination</p>
                        <p className="mt-1 flex items-center gap-1 font-medium">
                          <MapPin size={13} className="shrink-0 text-slate-400" />
                          <span className="break-words">{shipment.destinationCity || 'Not set'}</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Current agent</p>
                        <p className="mt-1 font-medium">{currentAgent?.name || 'Not assigned'}</p>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                      <label className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Assign delivery agent
                      </label>
                      <select
                        value={selectedAgentId}
                        onChange={(event) =>
                          setSelectedAgents((current) => ({
                            ...current,
                            [shipment.id]: event.target.value,
                          }))
                        }
                        disabled={isSaving || availableAgents.length === 0}
                        aria-label={`Choose agent for ${shipment.trackingNumber || shipment.id}`}
                        className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:disabled:bg-slate-800"
                      >
                        <option value="">
                          {availableAgents.length ? 'Select available agent' : 'No available agents'}
                        </option>
                        {availableAgents.map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.name} · {agent.vehicleType || 'vehicle'}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => void handleAssign(shipment)}
                        disabled={!selectedAgentId || isSaving}
                        className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSaving ? (
                          <>
                            <LoaderCircle size={16} className="animate-spin" />
                            Assigning...
                          </>
                        ) : (
                          <>
                            <UserRound size={16} />
                            Assign shipment
                          </>
                        )}
                      </button>
                      {availableAgents.length === 0 && (
                        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                          No agents are available. Update an agent's availability on the Agents page.
                        </p>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/60 dark:bg-blue-950/20 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-white p-2 text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-300">
            <Truck size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Assignment rules</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
              <li>• Only agents marked as available can be selected.</li>
              <li>• Assigning a shipment changes its status to “Agent assigned”.</li>
              <li>• The selected agent is marked as busy after a successful assignment.</li>
              <li>• Delivered, cancelled, and returned shipments are excluded from this queue.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
    </DashboardLayout>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  note,
  iconClass,
}: {
  icon: ReactNode
  label: string
  value: string
  note: string
  iconClass: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${iconClass}`}>{icon}</div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{note}</p>
    </div>
  )
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
      {initials || 'DA'}
    </div>
  )
}
