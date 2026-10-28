
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Download,
  LoaderCircle,
  Package,
  RefreshCw,
  Search,
  TrendingUp,
  X,
} from 'lucide-react'
import DashboardLayout from '../../components/ui/dashboard/DashboardLayout'
import api from '../../services/api'

interface Shipment {
  id: string
  trackingNumber?: string
  senderName?: string
  receiverName?: string
  destinationCity?: string
  status: string
  createdAt?: string
}

interface Payment {
  id: string
  shipmentId: string
  amount: number
  status: string
  createdAt?: string
}

interface StatusSummary {
  status: string
  label: string
  count: number
  color: string
  barColor: string
}

const shipmentStatusInfo: Record<
  string,
  { label: string; color: string; barColor: string }
> = {
  shipment_created: {
    label: 'Shipment created',
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    barColor: 'bg-slate-500',
  },
  branch_received: {
    label: 'Branch received',
    color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
    barColor: 'bg-blue-500',
  },
  in_transit: {
    label: 'In transit',
    color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300',
    barColor: 'bg-indigo-500',
  },
  agent_assigned: {
    label: 'Agent assigned',
    color: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
    barColor: 'bg-violet-500',
  },
  out_for_delivery: {
    label: 'Out for delivery',
    color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    barColor: 'bg-amber-500',
  },
  delivered: {
    label: 'Delivered',
    color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    barColor: 'bg-emerald-500',
  },
  failed_delivery: {
    label: 'Failed delivery',
    color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
    barColor: 'bg-rose-500',
  },
  delivery_failed: {
    label: 'Failed delivery',
    color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
    barColor: 'bg-rose-500',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    barColor: 'bg-gray-500',
  },
  returned_to_sender: {
    label: 'Returned to sender',
    color: 'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300',
    barColor: 'bg-orange-500',
  },
}

const paymentStatusInfo: Record<
  string,
  { label: string; barColor: string; color: string }
> = {
  paid: {
    label: 'Paid',
    barColor: 'bg-emerald-500',
    color: 'text-emerald-600 dark:text-emerald-400',
  },
  pending: {
    label: 'Pending',
    barColor: 'bg-amber-500',
    color: 'text-amber-600 dark:text-amber-400',
  },
  failed: {
    label: 'Failed',
    barColor: 'bg-rose-500',
    color: 'text-rose-600 dark:text-rose-400',
  },
}

const currency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)

const dateLabel = (value?: string) => {
  if (!value) return '—'

  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
}


const toCsvValue = (value: string | number | undefined | null): string => {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

export default function ReportsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [shipmentResponse, paymentResponse] = await Promise.all([
        api.get<Shipment[]>('/shipments'),
        api.get<Payment[]>('/payments'),
      ])

      setShipments(
        Array.isArray(shipmentResponse.data) ? shipmentResponse.data : [],
      )
      setPayments(
        Array.isArray(paymentResponse.data) ? paymentResponse.data : [],
      )
    } catch {
      setError(
        'Unable to load report data. Please check that JSON Server is running on port 5000.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const filteredShipments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return shipments.filter((shipment) => {
      const createdDate = shipment.createdAt
        ? new Date(shipment.createdAt)
        : null

      const matchesStart =
        !startDate ||
        (createdDate !== null &&
          !Number.isNaN(createdDate.getTime()) &&
          createdDate >= new Date(`${startDate}T00:00:00`))

      const matchesEnd =
        !endDate ||
        (createdDate !== null &&
          !Number.isNaN(createdDate.getTime()) &&
          createdDate <= new Date(`${endDate}T23:59:59.999`))

      const matchesStatus =
        statusFilter === 'all' || shipment.status === statusFilter

      const matchesSearch =
        !query ||
        shipment.id.toLowerCase().includes(query) ||
        (shipment.trackingNumber ?? '').toLowerCase().includes(query) ||
        (shipment.senderName ?? '').toLowerCase().includes(query) ||
        (shipment.receiverName ?? '').toLowerCase().includes(query) ||
        (shipment.destinationCity ?? '').toLowerCase().includes(query)

      return (
        matchesStart && matchesEnd && matchesStatus && matchesSearch
      )
    })
  }, [shipments, searchTerm, statusFilter, startDate, endDate])

  const filteredPayments = useMemo(() => {
    const shipmentIds = new Set(
      filteredShipments.map((shipment) => shipment.id),
    )

    return payments.filter((payment) => shipmentIds.has(payment.shipmentId))
  }, [payments, filteredShipments])

  const shipmentSummary = useMemo(() => {
    const total = filteredShipments.length
    const countStatus = (status: string) =>
      filteredShipments.filter((shipment) => shipment.status === status).length

    const delivered = countStatus('delivered')
    const failed =
      countStatus('failed_delivery') + countStatus('delivery_failed')
    const cancelled = countStatus('cancelled')
    const returned = countStatus('returned_to_sender')
    const active = total - delivered - failed - cancelled - returned

    return {
      total,
      delivered,
      failed,
      cancelled,
      returned,
      active,
      deliveryRate: total > 0 ? (delivered / total) * 100 : 0,
    }
  }, [filteredShipments])

  const paymentSummary = useMemo(() => {
    const paid = filteredPayments.filter(
      (payment) => payment.status === 'paid',
    )
    const pending = filteredPayments.filter(
      (payment) => payment.status === 'pending',
    )
    const failed = filteredPayments.filter(
      (payment) => payment.status === 'failed',
    )

    return {
      paidAmount: paid.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0,
      ),
      pendingAmount: pending.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0,
      ),
      failedAmount: failed.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0,
      ),
      paidCount: paid.length,
      pendingCount: pending.length,
      failedCount: failed.length,
      totalAmount: filteredPayments.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0,
      ),
    }
  }, [filteredPayments])

  const shipmentStatuses: StatusSummary[] = useMemo(() => {
    const counts = new Map<string, number>()

    filteredShipments.forEach((shipment) => {
      counts.set(shipment.status, (counts.get(shipment.status) ?? 0) + 1)
    })

    return Array.from(counts.entries())
      .map(([status, count]) => ({
        status,
        label: shipmentStatusInfo[status]?.label ?? status.replace(/_/g, ' '),
        count,
        color:
          shipmentStatusInfo[status]?.color ??
          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        barColor: shipmentStatusInfo[status]?.barColor ?? 'bg-slate-500',
      }))
      .sort((a, b) => b.count - a.count)
  }, [filteredShipments])

  const maxStatusCount = Math.max(
    1,
    ...shipmentStatuses.map((item) => item.count),
  )

const exportCsv = () => {
  const header: string[] = [
    'Shipment ID',
    'Tracking Number',
    'Sender',
    'Receiver',
    'Destination',
    'Shipment Status',
    'Created Date',
    'Payment ID',
    'Payment Amount (INR)',
    'Payment Status',
  ]

  const rows: (string | number | undefined)[][] = []

  filteredShipments.forEach((shipment) => {
    const shipmentPayments = filteredPayments.filter(
      (payment) => payment.shipmentId === shipment.id,
    )

    if (shipmentPayments.length === 0) {
      rows.push([
        shipment.id,
        shipment.trackingNumber ?? '',
        shipment.senderName ?? '',
        shipment.receiverName ?? '',
        shipment.destinationCity ?? '',
        shipment.status,
        shipment.createdAt ?? '',
        '',
        '',
        '',
      ])
      return
    }

    shipmentPayments.forEach((payment) => {
      rows.push([
        shipment.id,
        shipment.trackingNumber ?? '',
        shipment.senderName ?? '',
        shipment.receiverName ?? '',
        shipment.destinationCity ?? '',
        shipment.status,
        shipment.createdAt ?? '',
        payment.id,
        payment.amount,
        payment.status,
      ])
    })
  })

  const csvContent = [
    header.map(toCsvValue).join(','),
    ...rows.map((row) => row.map(toCsvValue).join(',')),
  ].join('\r\n')

  const blob = new Blob(['\uFEFF', csvContent], {
    type: 'text/csv;charset=utf-8;',
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `quickship-report-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`

  document.body.appendChild(link)
  link.click()
  link.remove()
    
  // Delay cleanup so the browser can start the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setStartDate('')
    setEndDate('')
  }

  return (
    <DashboardLayout>
      <div className="min-h-full space-y-6 text-slate-900 dark:text-slate-100">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
              <BarChart3 size={18} />
              Business intelligence
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Reports & Analytics
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Monitor shipment performance and payment activity across
              QuickShip.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadData()}
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw
                size={16}
                className={loading ? 'animate-spin' : ''}
              />
              Refresh
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={loading || filteredShipments.length === 0}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              aria-label="Dismiss error"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays size={18} className="text-blue-600 dark:text-blue-400" />
            <h2 className="font-semibold">Report filters</h2>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Start date
              </span>
              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(event) => setStartDate(event.target.value)}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                End date
              </span>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) => setEndDate(event.target.value)}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Shipment status
              </span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="all">All statuses</option>
                {Object.entries(shipmentStatusInfo).map(([value, info]) => (
                  <option key={value} value={value}>
                    {info.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Search shipments
              </span>
              <span className="relative block">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Tracking, name, city..."
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
                />
              </span>
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing {filteredShipments.length} of {shipments.length} shipments
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Clear filters
            </button>
          </div>
        </section>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <LoaderCircle size={22} className="animate-spin" />
            Loading report data…
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="Total shipments"
                value={String(shipmentSummary.total)}
                note="Shipments matching filters"
                icon={<Package size={20} />}
                iconClass="bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300"
              />
              <MetricCard
                title="Delivered"
                value={String(shipmentSummary.delivered)}
                note={`${shipmentSummary.deliveryRate.toFixed(1)}% delivery rate`}
                icon={<CheckCircle2 size={20} />}
                iconClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300"
              />
              <MetricCard
                title="Active shipments"
                value={String(shipmentSummary.active)}
                note="Not yet delivered or closed"
                icon={<Clock3 size={20} />}
                iconClass="bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300"
              />
              <MetricCard
                title="Paid revenue"
                value={currency(paymentSummary.paidAmount)}
                note={`${paymentSummary.paidCount} paid payment records`}
                icon={<TrendingUp size={20} />}
                iconClass="bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300"
              />
            </section>

            <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
                <div className="mb-5">
                  <h2 className="font-semibold">Shipment status breakdown</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Number of shipments by current status
                  </p>
                </div>

                {shipmentStatuses.length === 0 ? (
                  <EmptyChart message="No shipments match the selected filters." />
                ) : (
                  <div className="space-y-4">
                    {shipmentStatuses.map((item) => (
                      <div key={item.status}>
                        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                          <span className="text-slate-600 dark:text-slate-300">
                            {item.label}
                          </span>
                          <span className="font-semibold tabular-nums">
                            {item.count}
                            <span className="ml-2 text-xs font-normal text-slate-400">
                              {shipmentSummary.total
                                ? `${((item.count / shipmentSummary.total) * 100).toFixed(0)}%`
                                : '0%'}
                            </span>
                          </span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${item.barColor}`}
                            style={{
                              width: `${(item.count / maxStatusCount) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
                <div className="mb-5">
                  <h2 className="font-semibold">Payment overview</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Payment records associated with filtered shipments
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-950/30">
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">
                      Paid
                    </p>
                    <p className="mt-2 text-xl font-bold text-emerald-800 dark:text-emerald-200">
                      {currency(paymentSummary.paidAmount)}
                    </p>
                    <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/80">
                      {paymentSummary.paidCount} records
                    </p>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-4 dark:bg-amber-950/30">
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Pending
                    </p>
                    <p className="mt-2 text-xl font-bold text-amber-800 dark:text-amber-200">
                      {currency(paymentSummary.pendingAmount)}
                    </p>
                    <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-300/80">
                      {paymentSummary.pendingCount} records
                    </p>
                  </div>
                  <div className="rounded-xl bg-rose-50 p-4 dark:bg-rose-950/30">
                    <p className="text-sm text-rose-700 dark:text-rose-300">
                      Failed
                    </p>
                    <p className="mt-2 text-xl font-bold text-rose-800 dark:text-rose-200">
                      {currency(paymentSummary.failedAmount)}
                    </p>
                    <p className="mt-1 text-xs text-rose-700/80 dark:text-rose-300/80">
                      {paymentSummary.failedCount} records
                    </p>
                  </div>
                </div>

                <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Total recorded payment amount
                    </span>
                    <span className="text-lg font-bold">
                      {currency(paymentSummary.totalAmount)}
                    </span>
                  </div>

                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="flex h-full">
                      {paymentSummary.totalAmount > 0 && (
                        <>
                          <div
                            className="bg-emerald-500 transition-all"
                            style={{
                              width: `${(paymentSummary.paidAmount / paymentSummary.totalAmount) * 100}%`,
                            }}
                          />
                          <div
                            className="bg-amber-500 transition-all"
                            style={{
                              width: `${(paymentSummary.pendingAmount / paymentSummary.totalAmount) * 100}%`,
                            }}
                          />
                          <div
                            className="bg-rose-500 transition-all"
                            style={{
                              width: `${(paymentSummary.failedAmount / paymentSummary.totalAmount) * 100}%`,
                            }}
                          />
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
                    {Object.entries(paymentStatusInfo).map(([status, info]) => (
                      <span key={status} className="inline-flex items-center gap-1.5">
                        <span className={`size-2 rounded-full ${info.barColor}`} />
                        {info.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-1 border-b border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div>
                  <h2 className="font-semibold">Shipment report</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Detailed records matching the selected filters
                  </p>
                </div>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {filteredShipments.length} records
                </span>
              </div>

              {filteredShipments.length === 0 ? (
                <EmptyChart message="No shipments match the selected filters." />
              ) : (
                <>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[850px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/70 dark:text-slate-400">
                        <tr>
                          <th className="px-5 py-3.5 font-semibold">Tracking</th>
                          <th className="px-5 py-3.5 font-semibold">Sender</th>
                          <th className="px-5 py-3.5 font-semibold">Recipient</th>
                          <th className="px-5 py-3.5 font-semibold">Destination</th>
                          <th className="px-5 py-3.5 font-semibold">Created</th>
                          <th className="px-5 py-3.5 font-semibold">Status</th>
                          <th className="px-5 py-3.5 font-semibold">Payments</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredShipments.map((shipment) => {
                          const relatedPayments = filteredPayments.filter(
                            (payment) => payment.shipmentId === shipment.id,
                          )
                          const total = relatedPayments.reduce(
                            (sum, payment) =>
                              sum + Number(payment.amount || 0),
                            0,
                          )
                          const info = shipmentStatusInfo[shipment.status]

                          return (
                            <tr
                              key={shipment.id}
                              className="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                            >
                              <td className="px-5 py-4">
                                <p className="font-semibold">
                                  {shipment.trackingNumber || shipment.id}
                                </p>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  {shipment.id}
                                </p>
                              </td>
                              <td className="px-5 py-4">
                                {shipment.senderName || '—'}
                              </td>
                              <td className="px-5 py-4">
                                {shipment.receiverName || '—'}
                              </td>
                              <td className="px-5 py-4">
                                {shipment.destinationCity || '—'}
                              </td>
                              <td className="whitespace-nowrap px-5 py-4 text-slate-500 dark:text-slate-400">
                                {dateLabel(shipment.createdAt)}
                              </td>
                              <td className="px-5 py-4">
                                <span
                                  className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
                                    info?.color ??
                                    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                  }`}
                                >
                                  {info?.label ??
                                    shipment.status.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-5 py-4">
                                <p className="font-semibold">{currency(total)}</p>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  {relatedPayments.length} record(s)
                                </p>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-3 p-3 md:hidden">
                    {filteredShipments.map((shipment) => {
                      const relatedPayments = filteredPayments.filter(
                        (payment) => payment.shipmentId === shipment.id,
                      )
                      const total = relatedPayments.reduce(
                        (sum, payment) =>
                          sum + Number(payment.amount || 0),
                        0,
                      )
                      const info = shipmentStatusInfo[shipment.status]

                      return (
                        <article
                          key={shipment.id}
                          className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="break-all font-semibold">
                                {shipment.trackingNumber || shipment.id}
                              </p>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {shipment.id}
                              </p>
                            </div>
                            <span
                              className={`inline-flex shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                                info?.color ??
                                'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {info?.label ?? shipment.status.replace(/_/g, ' ')}
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Sender
                              </p>
                              <p className="mt-1 break-words">
                                {shipment.senderName || '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Recipient
                              </p>
                              <p className="mt-1 break-words">
                                {shipment.receiverName || '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Destination
                              </p>
                              <p className="mt-1 break-words">
                                {shipment.destinationCity || '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Created
                              </p>
                              <p className="mt-1">{dateLabel(shipment.createdAt)}</p>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                              Payment total
                            </span>
                            <span className="font-semibold">{currency(total)}</span>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </>
              )}
            </section>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SmallMetric
                label="Failed deliveries"
                value={String(shipmentSummary.failed)}
                detail="Shipment delivery failures"
                icon={<AlertCircle size={18} />}
                color="text-rose-600 dark:text-rose-400"
              />
              <SmallMetric
                label="Cancelled shipments"
                value={String(shipmentSummary.cancelled)}
                detail="Shipments marked cancelled"
                icon={<X size={18} />}
                color="text-slate-600 dark:text-slate-300"
              />
              <SmallMetric
                label="Returned shipments"
                value={String(shipmentSummary.returned)}
                detail="Returned to sender"
                icon={<CircleDollarSign size={18} />}
                color="text-orange-600 dark:text-orange-400"
              />
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

function MetricCard({
  title,
  value,
  note,
  icon,
  iconClass,
}: {
  title: string
  value: string
  note: string
  icon: React.ReactNode
  iconClass: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <p className="mt-2 break-words text-2xl font-bold tracking-tight">
            {value}
          </p>
        </div>
        <div className={`shrink-0 rounded-xl p-2.5 ${iconClass}`}>{icon}</div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {note}
      </p>
    </div>
  )
}

function SmallMetric({
  label,
  value,
  detail,
  icon,
  color,
}: {
  label: string
  value: string
  detail: string
  icon: React.ReactNode
  color: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className={`mt-0.5 ${color}`}>{icon}</div>
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-1 text-xl font-bold">{value}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {detail}
        </p>
      </div>
    </div>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center px-5 text-center">
      <BarChart3 size={26} className="mb-3 text-slate-400" />
      <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  )
}
