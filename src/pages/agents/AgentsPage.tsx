import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  Activity,
  Bike,
  Building2,
  Check,
  ChevronDown,
  Edit2,
  Eye,
  Mail,
  MapPin,
  MoreHorizontal,
  Package,
  Phone,
  Plus,
  Search,
  Trash2,
  Truck,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import api from '../../services/api'
import DashboardLayout from '../../components/ui/dashboard/DashboardLayout'
import type { Branch, DeliveryAgent } from '../../types'

type AgentForm = Omit<DeliveryAgent, 'id'>
type ShipmentRecord = {
  id: string
  assignedAgentId?: string
  status?: string
}
type ToastState = {
  message: string
  type: 'success' | 'error'
} | null

const emptyForm: AgentForm = {
  name: '',
  email: '',
  phone: '',
  branchId: '',
  vehicleNumber: '',
  vehicleType: 'bike',
  availability: 'available',
}

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
const labelClass =
  'mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300'

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<DeliveryAgent[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [shipments, setShipments] = useState<ShipmentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [availabilityFilter, setAvailabilityFilter] = useState('all')
  const [modal, setModal] = useState<'add' | 'edit' | 'view' | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<DeliveryAgent | null>(null)
  const [form, setForm] = useState<AgentForm>(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeliveryAgent | null>(null)
  const [toast, setToast] = useState<ToastState>(null)

  const notify = useCallback(
    (message: string, type: 'success' | 'error' = 'success') => {
      setToast({ message, type })
      window.setTimeout(() => setToast(null), 3000)
    },
    [],
  )

  const loadData = useCallback(async () => {
    setLoading(true)

    try {
      const [agentResponse, branchResponse, shipmentResponse] = await Promise.all([
        api.get<DeliveryAgent[]>('/deliveryAgents'),
        api.get<Branch[]>('/branches'),
        api.get<ShipmentRecord[]>('/shipments'),
      ])

      setAgents(Array.isArray(agentResponse.data) ? agentResponse.data : [])
      setBranches(Array.isArray(branchResponse.data) ? branchResponse.data : [])
      setShipments(
        Array.isArray(shipmentResponse.data) ? shipmentResponse.data : [],
      )
    } catch {
      notify(
        'Could not load delivery agents. Check that JSON Server is running.',
        'error',
      )
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const getBranchName = useCallback(
    (branchId: string) =>
      branches.find((branch) => branch.id === branchId)?.name ??
      'Unassigned branch',
    [branches],
  )

  const getActiveShipmentCount = useCallback(
    (agentId: string) =>
      shipments.filter(
        (shipment) =>
          shipment.assignedAgentId === agentId &&
          !['delivered', 'cancelled', 'returned_to_sender'].includes(
            shipment.status ?? '',
          ),
      ).length,
    [shipments],
  )

  const filteredAgents = useMemo(() => {
    const term = search.trim().toLowerCase()

    return agents.filter((agent) => {
      const searchableValues = [
        agent.name,
        agent.email,
        agent.phone,
        agent.vehicleNumber,
        getBranchName(agent.branchId),
      ]

      const matchesSearch =
        !term ||
        searchableValues.some((value) => value.toLowerCase().includes(term))
      const matchesAvailability =
        availabilityFilter === 'all' ||
        agent.availability === availabilityFilter

      return matchesSearch && matchesAvailability
    })
  }, [agents, search, availabilityFilter, getBranchName])

  const stats = useMemo(
    () => ({
      total: agents.length,
      available: agents.filter((agent) => agent.availability === 'available')
        .length,
      busy: agents.filter((agent) => agent.availability === 'busy').length,
      unavailable: agents.filter(
        (agent) => agent.availability === 'unavailable',
      ).length,
    }),
    [agents],
  )

  function openAddModal() {
    setSelectedAgent(null)
    setForm(emptyForm)
    setErrors({})
    setModal('add')
  }

  function openEditModal(agent: DeliveryAgent) {
    setSelectedAgent(agent)
    setForm({
      name: agent.name,
      email: agent.email,
      phone: agent.phone,
      branchId: agent.branchId,
      vehicleNumber: agent.vehicleNumber,
      vehicleType: agent.vehicleType,
      availability: agent.availability,
    })
    setErrors({})
    setModal('edit')
  }

  function openViewModal(agent: DeliveryAgent) {
    setSelectedAgent(agent)
    setModal('view')
  }

  function closeModal() {
    setModal(null)
    setSelectedAgent(null)
    setErrors({})
  }

  function validateForm() {
    const nextErrors: Record<string, string> = {}

    if (!/^[A-Za-z][A-Za-z .'-]{1,59}$/.test(form.name.trim())) {
      nextErrors.name = 'Enter a valid name using letters only.'
    }

    if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(form.email.trim())) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (!/^\d{10}$/.test(form.phone.trim())) {
      nextErrors.phone = 'Phone number must contain exactly 10 digits.'
    }

    if (!form.branchId) {
      nextErrors.branchId = 'Select a branch.'
    }

    if (!/^[A-Za-z0-9 -]{3,20}$/.test(form.vehicleNumber.trim())) {
      nextErrors.vehicleNumber = 'Enter a valid vehicle number.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!validateForm()) return

    setSaving(true)

    const payload: AgentForm = {
      ...form,
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      vehicleNumber: form.vehicleNumber.trim().toUpperCase(),
    }

    try {
      if (modal === 'edit' && selectedAgent) {
        await api.patch(`/deliveryAgents/${selectedAgent.id}`, payload)
        notify('Delivery agent updated successfully.')
      } else {
        await api.post('/deliveryAgents', {
          ...payload,
          id: `AG${Date.now().toString().slice(-6)}`,
        })
        notify('Delivery agent added successfully.')
      }

      closeModal()
      await loadData()
    } catch {
      notify('Could not save the delivery agent. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return

    if (getActiveShipmentCount(deleteTarget.id) > 0) {
      notify(
        'This agent has active shipments. Reassign them before deleting.',
        'error',
      )
      setDeleteTarget(null)
      return
    }

    try {
      await api.delete(`/deliveryAgents/${deleteTarget.id}`)
      notify('Delivery agent deleted successfully.')
      setDeleteTarget(null)
      await loadData()
    } catch {
      notify('Could not delete this delivery agent.', 'error')
    }
  }

  async function handleAvailabilityChange(
    agent: DeliveryAgent,
    availability: DeliveryAgent['availability'],
  ) {
    try {
      await api.patch(`/deliveryAgents/${agent.id}`, { availability })
      setAgents((currentAgents) =>
        currentAgents.map((item) =>
          item.id === agent.id ? { ...item, availability } : item,
        ),
      )
      notify(`${agent.name}'s availability updated.`)
    } catch {
      notify('Could not update availability.', 'error')
    }
  }

  function getAvailabilityClass(availability: DeliveryAgent['availability']) {
    if (availability === 'available') {
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
    }

    if (availability === 'busy') {
      return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
    }

    return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
  }

  function getVehicleIcon(vehicleType: DeliveryAgent['vehicleType']) {
    return vehicleType === 'bike' ? <Bike size={17} /> : <Truck size={17} />
  }

  function renderAgentForm() {
    return (
      <form onSubmit={handleSubmit} noValidate className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="agent-name">
              Full name
            </label>
            <input
              id="agent-name"
              className={fieldClass}
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              placeholder="e.g. Rahul Menon"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">{errors.name}</p>
            )}
          </div>
          <div>
            <label className={labelClass} htmlFor="agent-email">
              Email address
            </label>
            <input
              id="agent-email"
              type="email"
              className={fieldClass}
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
              placeholder="agent@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email}</p>
            )}
          </div>
          <div>
            <label className={labelClass} htmlFor="agent-phone">
              Phone number
            </label>
            <input
              id="agent-phone"
              inputMode="numeric"
              maxLength={10}
              className={fieldClass}
              value={form.phone}
              onChange={(event) =>
                setForm({
                  ...form,
                  phone: event.target.value.replace(/\D/g, '').slice(0, 10),
                })
              }
              placeholder="10-digit mobile number"
            />
            {errors.phone && (
              <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
            )}
          </div>
          <div>
            <label className={labelClass} htmlFor="agent-branch">
              Assigned branch
            </label>
            <select
              id="agent-branch"
              className={fieldClass}
              value={form.branchId}
              onChange={(event) =>
                setForm({ ...form, branchId: event.target.value })
              }
            >
              <option value="">Select a branch</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            {errors.branchId && (
              <p className="mt-1 text-xs text-red-500">{errors.branchId}</p>
            )}
          </div>
          <div>
            <label className={labelClass} htmlFor="agent-vehicle-type">
              Vehicle type
            </label>
            <select
              id="agent-vehicle-type"
              className={fieldClass}
              value={form.vehicleType}
              onChange={(event) =>
                setForm({
                  ...form,
                  vehicleType: event.target.value as AgentForm['vehicleType'],
                })
              }
            >
              <option value="bike">Bike</option>
              <option value="van">Van</option>
              <option value="truck">Truck</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="agent-vehicle-number">
              Vehicle number
            </label>
            <input
              id="agent-vehicle-number"
              className={fieldClass}
              value={form.vehicleNumber}
              onChange={(event) =>
                setForm({
                  ...form,
                  vehicleNumber: event.target.value.toUpperCase(),
                })
              }
              placeholder="e.g. TN01AB1234"
            />
            {errors.vehicleNumber && (
              <p className="mt-1 text-xs text-red-500">
                {errors.vehicleNumber}
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="agent-availability">
              Availability
            </label>
            <select
              id="agent-availability"
              className={fieldClass}
              value={form.availability}
              onChange={(event) =>
                setForm({
                  ...form,
                  availability: event.target.value as AgentForm['availability'],
                })
              }
            >
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
          <button
            type="button"
            onClick={closeModal}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              'Saving...'
            ) : (
              <>
                <Check size={16} />
                {modal === 'edit' ? 'Save changes' : 'Add agent'}
              </>
            )}
          </button>
        </div>
      </form>
    )
  }

  function renderAgentDetails(agent: DeliveryAgent) {
    const details = [
      {
        label: 'Email address',
        value: agent.email,
        icon: <Mail size={17} />,
      },
      {
        label: 'Phone number',
        value: agent.phone,
        icon: <Phone size={17} />,
      },
      {
        label: 'Assigned branch',
        value: getBranchName(agent.branchId),
        icon: <Building2 size={17} />,
      },
      {
        label: 'Vehicle',
        value: `${capitalize(agent.vehicleType)} · ${agent.vehicleNumber}`,
        icon: getVehicleIcon(agent.vehicleType),
      },
      {
        label: 'Active shipments',
        value: String(getActiveShipmentCount(agent.id)),
        icon: <Package size={17} />,
      },
    ]

    return (
      <div className="space-y-5 p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-lg font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
            {getInitials(agent.name)}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {agent.name}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Agent ID: {agent.id}
            </p>
            <span
              className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getAvailabilityClass(agent.availability)}`}
            >
              {capitalize(agent.availability)}
            </span>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {details.map((item) => (
            <div
              key={item.label}
              className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/70"
            >
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                {item.icon}
                <span className="text-xs font-medium">{item.label}</span>
              </div>
              <p className="mt-2 break-words text-sm font-semibold text-slate-900 dark:text-white">
                {item.value}
              </p>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={closeModal}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => openEditModal(agent)}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Edit agent
          </button>
        </div>
      </div>
    )
  }

  const modalContent = modal
    ? createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal()
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="agent-modal-title"
            className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <div>
                <h2
                  id="agent-modal-title"
                  className="text-lg font-semibold text-slate-900 dark:text-white"
                >
                  {modal === 'add'
                    ? 'Add delivery agent'
                    : modal === 'edit'
                      ? 'Edit delivery agent'
                      : 'Delivery agent details'}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {modal === 'view'
                    ? 'Review profile and assignment details.'
                    : 'Complete the fields below to save the agent profile.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close modal"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={19} />
              </button>
            </div>
            {modal === 'view' && selectedAgent
              ? renderAgentDetails(selectedAgent)
              : renderAgentForm()}
          </section>
        </div>,
        document.body,
      )
    : null

  const statCards = [
    {
      label: 'Total agents',
      value: stats.total,
      icon: <Users size={19} />,
      tint: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
    },
    {
      label: 'Available',
      value: stats.available,
      icon: <Check size={19} />,
      tint:
        'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    },
    {
      label: 'Busy',
      value: stats.busy,
      icon: <Activity size={19} />,
      tint:
        'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    },
    {
      label: 'Unavailable',
      value: stats.unavailable,
      icon: <UserRound size={19} />,
      tint:
        'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    },
  ]

  function renderAvailabilitySelect(agent: DeliveryAgent) {
    return (
      <select
        aria-label={`Availability for ${agent.name}`}
        className={`rounded-full border-0 px-3 py-1.5 text-xs font-semibold outline-none ${getAvailabilityClass(agent.availability)}`}
        value={agent.availability}
        onChange={(event) =>
          void handleAvailabilityChange(
            agent,
            event.target.value as DeliveryAgent['availability'],
          )
        }
      >
        <option value="available">Available</option>
        <option value="busy">Busy</option>
        <option value="unavailable">Unavailable</option>
      </select>
    )
  }

  function renderDesktopTable() {
    return (
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[850px] text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Agent</th>
              <th className="px-5 py-3.5 font-semibold">Branch</th>
              <th className="px-5 py-3.5 font-semibold">Vehicle</th>
              <th className="px-5 py-3.5 font-semibold">
                Active shipments
              </th>
              <th className="px-5 py-3.5 font-semibold">Availability</th>
              <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredAgents.map((agent) => (
              <tr
                key={agent.id}
                className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                      {getInitials(agent.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {agent.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {agent.email}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {agent.phone}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <MapPin size={15} className="text-slate-400" />
                    {getBranchName(agent.branchId)}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    {getVehicleIcon(agent.vehicleType)}
                    <div>
                      <p>{capitalize(agent.vehicleType)}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {agent.vehicleNumber}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
                    <Package size={15} className="text-slate-400" />
                    {getActiveShipmentCount(agent.id)}
                  </span>
                </td>
                <td className="px-5 py-4">
                  {renderAvailabilitySelect(agent)}
                </td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => openViewModal(agent)}
                      title="View agent"
                      aria-label={`View ${agent.name}`}
                      className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
                    >
                      <Eye size={17} />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(agent)}
                      title="Edit agent"
                      aria-label={`Edit ${agent.name}`}
                      className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-500/10 dark:hover:text-amber-300"
                    >
                      <Edit2 size={17} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(agent)}
                      title="Delete agent"
                      aria-label={`Delete ${agent.name}`}
                      className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
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
    )
  }

  function renderMobileCards() {
    return (
      <div className="divide-y divide-slate-100 dark:divide-slate-800 md:hidden">
        {filteredAgents.map((agent) => (
          <article key={agent.id} className="space-y-3 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                {getInitials(agent.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900 dark:text-white">
                  {agent.name}
                </p>
                <p className="break-all text-xs text-slate-500 dark:text-slate-400">
                  {agent.email}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {agent.phone}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openViewModal(agent)}
                aria-label={`View ${agent.name}`}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <MoreHorizontal size={19} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Branch
                </p>
                <p className="mt-1 font-medium text-slate-800 dark:text-slate-200">
                  {getBranchName(agent.branchId)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Vehicle
                </p>
                <p className="mt-1 flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                  {getVehicleIcon(agent.vehicleType)}
                  {agent.vehicleNumber}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Active shipments
                </p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                  {getActiveShipmentCount(agent.id)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
                <label
                  htmlFor={`mobile-status-${agent.id}`}
                  className="text-xs text-slate-500 dark:text-slate-400"
                >
                  Availability
                </label>
                <div className="mt-1">{renderAvailabilitySelect(agent)}</div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => openEditModal(agent)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                <Edit2 size={14} />
                Edit
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(agent)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 dark:border-red-900/60"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="min-w-0 space-y-6 pb-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Users size={16} />
              <span>Operations</span>
              <span>/</span>
              <span className="text-slate-800 dark:text-slate-200">
                Delivery agents
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Delivery Agents
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage delivery teams, vehicles, and agent availability.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={18} />
            Add agent
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-sm">
                  {stat.label}
                </span>
                <span className={`rounded-xl p-2 ${stat.tint}`}>
                  {stat.icon}
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">
                All delivery agents
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {filteredAgents.length}{' '}
                {filteredAgents.length === 1 ? 'agent' : 'agents'} found
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  aria-label="Search agents"
                  className={`${fieldClass} pl-9 sm:w-64`}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search agents..."
                />
              </div>
              <div className="relative">
                <select
                  aria-label="Filter by availability"
                  className={`${fieldClass} appearance-none pr-9 sm:w-44`}
                  value={availabilityFilter}
                  onChange={(event) =>
                    setAvailabilityFilter(event.target.value)
                  }
                >
                  <option value="all">All availability</option>
                  <option value="available">Available</option>
                  <option value="busy">Busy</option>
                  <option value="unavailable">Unavailable</option>
                </select>
                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              Loading delivery agents...
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-16 text-center">
              <div className="rounded-2xl bg-slate-100 p-4 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <Users size={26} />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
                No agents found
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Try changing your search or add a delivery agent.
              </p>
              <button
                type="button"
                onClick={openAddModal}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
              >
                <Plus size={16} />
                Add agent
              </button>
            </div>
          ) : (
            <>
              {renderDesktopTable()}
              {renderMobileCards()}
            </>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Agent records are stored in JSON Server. Active shipment counts
          exclude delivered, cancelled, and returned shipments.
        </p>
      </div>
      {modalContent}
      {deleteTarget &&
        createPortal(
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-agent-title"
              className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10">
                <Trash2 size={22} />
              </div>
              <h2
                id="delete-agent-title"
                className="mt-4 text-lg font-semibold text-slate-900 dark:text-white"
              >
                Delete delivery agent?
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                This will remove{' '}
                <strong className="text-slate-700 dark:text-slate-200">
                  {deleteTarget.name}
                </strong>{' '}
                from delivery agent records. Agents with active shipments
                cannot be deleted. This action cannot be undone.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Delete agent
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
      {toast &&
        createPortal(
          <div
            role="status"
            className={`fixed right-4 top-4 z-[120] flex max-w-sm items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl ${
              toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
            }`}
          >
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => setToast(null)}
            >
              <X size={16} />
            </button>
          </div>,
          document.body,
        )}
    </DashboardLayout>
  )
}
