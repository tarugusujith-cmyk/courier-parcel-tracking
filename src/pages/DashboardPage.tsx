
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Package,
  RefreshCw,
  TrendingUp,
  Truck,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import DashboardLayout from '../components/ui/dashboard/DashboardLayout'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

interface ShipmentRecord {
  id: string | number
  trackingNumber?: string
  tracking_number?: string
  status?: string
  createdAt?: string
  created_at?: string
  receiverName?: string
  destinationCity?: string
  customerId?: string | number
  senderCustomerId?: string | number
  senderName?: string
  assignedAgentId?: string | number
  originBranchId?: string | number
  destinationBranchId?: string | number
  currentBranchId?: string | number
}

interface PaymentRecord {
  id: string | number
  shipmentId?: string | number
  amount?: number | string
  status?: string
  createdAt?: string
  date?: string
}

interface StatCardData {
  title: string
  value: string | number
  description: string
  icon: LucideIcon
  iconColor: string
  iconBackground: string
}

const STATUS_LABELS: Record<string, string> = {
  shipment_created: 'Shipment Created',
  branch_received: 'Branch Received',
  processing: 'Processing',
  in_transit: 'In Transit',
  arrived_at_destination: 'Destination Branch',
  agent_assigned: 'Agent Assigned',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  delivery_failed: 'Failed Delivery',
  cancelled: 'Cancelled',
  returned_to_sender: 'Returned to Sender',
  return_initiated: 'Return Initiated',
}

const STATUS_COLORS: Record<string, string> = {
  shipment_created: '#94a3b8',
  branch_received: '#8b5cf6',
  processing: '#a78bfa',
  in_transit: '#3b82f6',
  arrived_at_destination: '#06b6d4',
  agent_assigned: '#f59e0b',
  out_for_delivery: '#f97316',
  delivered: '#10b981',
  delivery_failed: '#f43f5e',
  cancelled: '#64748b',
  returned_to_sender: '#dc2626',
  return_initiated: '#e11d48',
}

const STATUS_ORDER = Object.keys(STATUS_LABELS)

function getDate(shipment: ShipmentRecord): Date | null {
  const value = shipment.createdAt ?? shipment.created_at
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
  }).format(date)
}

function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(date)
}

function isInRange(date: Date, start: Date, end: Date): boolean {
  return date >= start && date < end
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor,
  iconBackground,
}: StatCardData) {
  return (
    <article className="dashboard-stat-card min-w-0 p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          {title}
        </p>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBackground}`}>
          <Icon size={20} className={iconColor} />
        </span>
      </div>
      <p className="mt-4 break-words text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </article>
  )
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <section className="dashboard-chart-card min-w-0 p-5 sm:p-6">
      <h2 className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      {children}
    </section>
  )
}

function EmptyChart({ message = 'No data available' }: { message?: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center text-sm text-slate-400 dark:text-slate-500">
      {message}
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [shipments, setShipments] = useState<ShipmentRecord[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [shipmentResponse, paymentResponse] = await Promise.all([
        api.get<ShipmentRecord[]>('/shipments'),
        api.get<PaymentRecord[]>('/payments'),
      ])

      setShipments(Array.isArray(shipmentResponse.data) ? shipmentResponse.data : [])
      setPayments(Array.isArray(paymentResponse.data) ? paymentResponse.data : [])
    } catch {
      setError('Unable to load dashboard data. Check that JSON Server is running on port 5000.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const visibleShipments = useMemo(() => {
    const role = String(user?.role ?? 'customer').toLowerCase()
    if (role === 'admin') return shipments

    if (role === 'customer') {
      return shipments.filter((shipment) => {
        const customerId = user?.customerId
        const idMatches =
          customerId != null &&
          (String(shipment.customerId ?? '') === String(customerId) ||
            String(shipment.senderCustomerId ?? '') === String(customerId))
        const nameMatches =
          Boolean(user?.name) &&
          String(shipment.senderName ?? '').toLowerCase() ===
            String(user?.name ?? '').toLowerCase()
        return idMatches || nameMatches
      })
    }

    if (role === 'delivery_agent') {
      return shipments.filter(
        (shipment) =>
          String(shipment.assignedAgentId ?? '') === String(user?.agentId ?? ''),
      )
    }

    if (role === 'branch_staff') {
      const branchId = String(user?.branchId ?? '')
      if (!branchId) return []
      return shipments.filter(
        (shipment) =>
          String(shipment.currentBranchId ?? '') === branchId ||
          String(shipment.originBranchId ?? '') === branchId ||
          String(shipment.destinationBranchId ?? '') === branchId,
      )
    }

    return shipments
  }, [shipments, user])

  const visiblePayments = useMemo(() => {
    if (String(user?.role ?? '').toLowerCase() === 'admin') return payments
    const shipmentIds = new Set(visibleShipments.map((shipment) => String(shipment.id)))
    return payments.filter(
      (payment) =>
        payment.shipmentId != null &&
        shipmentIds.has(String(payment.shipmentId)),
    )
  }, [payments, user, visibleShipments])

  const countStatus = (...statuses: string[]) =>
    visibleShipments.filter((shipment) =>
      statuses.includes(String(shipment.status ?? '').toLowerCase()),
    ).length

  const paidRevenue = visiblePayments
    .filter((payment) => String(payment.status ?? '').toLowerCase() === 'paid')
    .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0)

  const stats = useMemo<StatCardData[]>(() => {
    const role = String(user?.role ?? 'customer').toLowerCase()

    const card = (
      title: string,
      value: string | number,
      description: string,
      icon: LucideIcon,
      color: string,
      background: string,
    ): StatCardData => ({
      title,
      value,
      description,
      icon,
      iconColor: color,
      iconBackground: background,
    })

    if (role === 'admin') {
      return [
        card('Total Shipments', visibleShipments.length, 'All registered shipments', Package, 'text-blue-700 dark:text-blue-300', 'bg-blue-100 dark:bg-blue-950/60'),
        card('In Transit', countStatus('in_transit'), 'Shipments on the move', Truck, 'text-violet-700 dark:text-violet-300', 'bg-violet-100 dark:bg-violet-950/60'),
        card('Delivered', countStatus('delivered'), 'Successfully delivered', CheckCircle2, 'text-emerald-700 dark:text-emerald-300', 'bg-emerald-100 dark:bg-emerald-950/60'),
        card('Pending', countStatus('shipment_created', 'branch_received', 'processing', 'arrived_at_destination', 'agent_assigned'), 'Awaiting the next update', Clock3, 'text-amber-700 dark:text-amber-300', 'bg-amber-100 dark:bg-amber-950/60'),
        card('Paid Revenue', formatCurrency(paidRevenue), 'Based on recorded payments marked Paid', Wallet, 'text-emerald-700 dark:text-emerald-300', 'bg-emerald-100 dark:bg-emerald-950/60'),
        card('Out for Delivery', countStatus('out_for_delivery'), 'Shipments with an agent en route', TrendingUp, 'text-cyan-700 dark:text-cyan-300', 'bg-cyan-100 dark:bg-cyan-950/60'),
        card('Failed / Cancelled', countStatus('delivery_failed', 'cancelled'), 'Shipments needing attention or review', AlertCircle, 'text-rose-700 dark:text-rose-300', 'bg-rose-100 dark:bg-rose-950/60'),
      ]
    }

    if (role === 'branch_staff') {
      return [
        card("Today's Shipments", visibleShipments.filter((shipment) => {
          const date = getDate(shipment)
          const today = new Date()
          return date != null && date.toDateString() === today.toDateString()
        }).length, 'Created today', Package, 'text-blue-700 dark:text-blue-300', 'bg-blue-100 dark:bg-blue-950/60'),
        card('In Transit', countStatus('in_transit'), 'Shipments on the move', Truck, 'text-violet-700 dark:text-violet-300', 'bg-violet-100 dark:bg-violet-950/60'),
        card('Pending Assignments', countStatus('arrived_at_destination', 'branch_received', 'processing'), 'Awaiting the next step', Clock3, 'text-amber-700 dark:text-amber-300', 'bg-amber-100 dark:bg-amber-950/60'),
        card('Delivered', countStatus('delivered'), 'Successfully completed', CheckCircle2, 'text-emerald-700 dark:text-emerald-300', 'bg-emerald-100 dark:bg-emerald-950/60'),
      ]
    }

    if (role === 'delivery_agent') {
      return [
        card('Assigned Shipments', visibleShipments.length, 'Shipments assigned to you', Package, 'text-blue-700 dark:text-blue-300', 'bg-blue-100 dark:bg-blue-950/60'),
        card('Out for Delivery', countStatus('out_for_delivery'), 'Deliveries in progress', Truck, 'text-violet-700 dark:text-violet-300', 'bg-violet-100 dark:bg-violet-950/60'),
        card('Delivered', countStatus('delivered'), 'Successfully completed', CheckCircle2, 'text-emerald-700 dark:text-emerald-300', 'bg-emerald-100 dark:bg-emerald-950/60'),
        card('Failed', countStatus('delivery_failed'), 'Require follow-up', AlertCircle, 'text-rose-700 dark:text-rose-300', 'bg-rose-100 dark:bg-rose-950/60'),
      ]
    }

    return [
      card('My Shipments', visibleShipments.length, 'Shipments associated with you', Package, 'text-blue-700 dark:text-blue-300', 'bg-blue-100 dark:bg-blue-950/60'),
      card('In Transit', countStatus('in_transit', 'branch_received', 'processing'), 'On the way to the destination', Truck, 'text-violet-700 dark:text-violet-300', 'bg-violet-100 dark:bg-violet-950/60'),
      card('Upcoming Delivery', countStatus('agent_assigned', 'out_for_delivery'), 'Preparing for delivery', Clock3, 'text-amber-700 dark:text-amber-300', 'bg-amber-100 dark:bg-amber-950/60'),
      card('Delivered', countStatus('delivered'), 'Successfully delivered', CheckCircle2, 'text-emerald-700 dark:text-emerald-300', 'bg-emerald-100 dark:bg-emerald-950/60'),
    ]
  }, [user, visibleShipments, paidRevenue])

  const statusData = useMemo(() => {
    const counts = new Map<string, number>()
    visibleShipments.forEach((shipment) => {
      const status = String(shipment.status ?? '').toLowerCase()
      counts.set(status, (counts.get(status) ?? 0) + 1)
    })
    return STATUS_ORDER
      .map((status) => ({
        status,
        label: STATUS_LABELS[status],
        value: counts.get(status) ?? 0,
        color: STATUS_COLORS[status],
      }))
      .filter((item) => item.value > 0)
  }, [visibleShipments])

  const totalStatus = statusData.reduce((sum, item) => sum + item.value, 0)
  const donutBackground = useMemo(() => {
    if (!totalStatus) return 'conic-gradient(#e2e8f0 0deg 360deg)'
    let degree = 0
    const parts = statusData.map((item) => {
      const start = degree
      degree += (item.value / totalStatus) * 360
      return `${item.color} ${start}deg ${degree}deg`
    })
    return `conic-gradient(${parts.join(', ')})`
  }, [statusData, totalStatus])

  const weeklyData = useMemo(() => {
    const today = new Date()
    const start = new Date(today)
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - 6)

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      const next = new Date(date)
      next.setDate(date.getDate() + 1)

      return {
        label: new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(date),
        count: visibleShipments.filter((shipment) => {
          const created = getDate(shipment)
          return created ? isInRange(created, date, next) : false
        }).length,
      }
    })
  }, [visibleShipments])

  const monthlyData = useMemo(() => {
    const today = new Date()
    return Array.from({ length: 6 }, (_, index) => {
      const start = new Date(today.getFullYear(), today.getMonth() - 5 + index, 1)
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
      const monthlyShipments = visibleShipments.filter((shipment) => {
        const date = getDate(shipment)
        return date ? isInRange(date, start, end) : false
      })
      const ids = new Set(monthlyShipments.map((shipment) => String(shipment.id)))
      const revenue = visiblePayments
        .filter((payment) =>
          String(payment.status ?? '').toLowerCase() === 'paid' &&
          payment.shipmentId != null &&
          ids.has(String(payment.shipmentId)),
        )
        .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0)

      return {
        label: formatMonth(start),
        shipments: monthlyShipments.length,
        revenue,
      }
    })
  }, [visiblePayments, visibleShipments])

  const maxWeekly = Math.max(1, ...weeklyData.map((item) => item.count))
  const maxMonthly = Math.max(1, ...monthlyData.map((item) => item.shipments))

  const heading =
    user?.role === 'admin'
      ? 'Dashboard Overview'
      : user?.role === 'branch_staff'
        ? 'Branch Dashboard'
        : user?.role === 'delivery_agent'
          ? 'Delivery Dashboard'
          : 'Customer Dashboard'

  return (
    <DashboardLayout>
      <section className="relative space-y-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
              QuickShip Workspace
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              {heading}
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Monitor shipments, deliveries and daily operations.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadDashboard()}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:self-auto"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh data
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 7 }, (_, index) => (
              <div key={index} className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => <StatCard key={stat.title} {...stat} />)}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <ChartCard title="Shipment Status" subtitle="Current distribution of all shipments">
            <div className="mt-6 flex flex-col items-center gap-7 sm:flex-row sm:justify-around">
              <div
                className="relative flex h-44 w-44 shrink-0 items-center justify-center rounded-full"
                style={{ background: donutBackground }}
                role="img"
                aria-label={`Shipment status distribution: ${totalStatus} shipments`}
              >
                <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white dark:bg-slate-900">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">{totalStatus}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Shipments</span>
                </div>
              </div>

              <div className="grid w-full grid-cols-1 gap-3 sm:max-w-xs">
                {STATUS_ORDER.map((status) => {
                  const item = statusData.find((entry) => entry.status === status)
                  return (
                    <div key={status} className="flex items-center justify-between gap-3 text-xs">
                      <span className="flex min-w-0 items-center gap-2 text-slate-600 dark:text-slate-300">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />
                        <span className="truncate">{STATUS_LABELS[status]}</span>
                      </span>
                      <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{item?.value ?? 0}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </ChartCard>

          <ChartCard title="Weekly Shipments" subtitle="Shipments created over the last seven days">
            {visibleShipments.length === 0 ? <EmptyChart /> : (
              <div className="mt-6">
                <div className="flex h-48 items-end gap-2 border-b border-slate-200 px-1 dark:border-slate-700 sm:gap-4">
                  {weeklyData.map((item) => (
                    <div key={item.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{item.count}</span>
                      <div className="w-full max-w-10 rounded-t-lg bg-blue-500 transition-all duration-300" style={{ height: `${Math.max(4, (item.count / maxWeekly) * 130)}px` }} />
                      <span className="pb-2 text-xs text-slate-500 dark:text-slate-400">{item.label}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">Daily shipment creation</p>
              </div>
            )}
          </ChartCard>
        </div>

        <ChartCard title="Shipment Trends" subtitle="Monthly shipment creation over the last six months">
          {visibleShipments.length === 0 ? <EmptyChart /> : (
            <div className="mt-6">
              <div className="flex h-52 items-end gap-2 border-b border-slate-200 px-1 dark:border-slate-700 sm:gap-5">
                {monthlyData.map((item) => (
                  <div key={item.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" title={`${item.label}: ${item.shipments} shipments; revenue ${formatCurrency(item.revenue)}`}>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{item.shipments}</span>
                    <div className="w-full max-w-14 rounded-t-lg bg-indigo-500 transition-all duration-300 dark:bg-indigo-400" style={{ height: `${Math.max(4, (item.shipments / maxMonthly) * 145)}px` }} />
                    <span className="pb-2 text-xs text-slate-500 dark:text-slate-400">{item.label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Hover over a bar to view its shipment count and paid revenue.</p>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Recent Shipments" subtitle="Latest shipment records from your accessible shipments">
          {loading ? <EmptyChart message="Loading shipments..." /> : visibleShipments.length === 0 ? <EmptyChart message="No shipments found yet" /> : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    <th className="px-3 py-3 font-semibold">Tracking ID</th>
                    <th className="px-3 py-3 font-semibold">Recipient</th>
                    <th className="px-3 py-3 font-semibold">Destination</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visibleShipments.slice().sort((first, second) =>
                    (getDate(second)?.getTime() ?? 0) - (getDate(first)?.getTime() ?? 0),
                  ).slice(0, 6).map((shipment) => {
                    const status = String(shipment.status ?? '').toLowerCase()
                    const created = getDate(shipment)
                    return (
                      <tr key={shipment.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                        <td className="px-3 py-4 font-semibold text-slate-900 dark:text-white">
                          {shipment.trackingNumber ?? shipment.tracking_number ?? `QS-${shipment.id}`}
                        </td>
                        <td className="px-3 py-4 text-slate-600 dark:text-slate-300">{shipment.receiverName ?? '—'}</td>
                        <td className="px-3 py-4 text-slate-600 dark:text-slate-300">{shipment.destinationCity ?? '—'}</td>
                        <td className="px-3 py-4">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {STATUS_LABELS[status] ?? (status.replace(/_/g, ' ') || 'Unknown')}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-slate-500 dark:text-slate-400">{created ? formatDate(created) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>
      </section>
    </DashboardLayout>
  )
}
