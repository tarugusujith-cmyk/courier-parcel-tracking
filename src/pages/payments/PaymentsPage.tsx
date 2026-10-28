
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  LoaderCircle,
  RefreshCw,
  Search,
  Wallet,
  X,
} from 'lucide-react'
import DashboardLayout from '../../components/ui/dashboard/DashboardLayout'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'

type PaymentStatus = 'paid' | 'pending' | 'failed'

interface Payment {
  id: string
  shipmentId: string
  amount: number
  status: PaymentStatus
  createdAt: string
  method?: string
  transactionId?: string
}

interface Shipment {
  id: string
  trackingNumber?: string
  senderName?: string
  receiverName?: string
  customerId?: string
  senderCustomerId?: string
  status?: string
}

const statusStyles: Record<PaymentStatus, string> = {
  paid: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  failed: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(value?: string) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStatusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export default function PaymentsPage() {
  const { user } = useAuth()

  const role = String(user?.role ?? '').toLowerCase()
  const isAdmin = role === 'admin'
  const isCustomer = role === 'customer'

  const [payments, setPayments] = useState<Payment[]>([])
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [savingPaymentId, setSavingPaymentId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [paymentResponse, shipmentResponse] = await Promise.all([
        api.get<Payment[]>('/payments'),
        api.get<Shipment[]>('/shipments'),
      ])

      setPayments(
        Array.isArray(paymentResponse.data) ? paymentResponse.data : [],
      )
      setShipments(
        Array.isArray(shipmentResponse.data) ? shipmentResponse.data : [],
      )
    } catch {
      setError(
        'Unable to load payments. Check that JSON Server is running on port 5000.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const shipmentMap = useMemo(
    () => new Map(shipments.map((shipment) => [String(shipment.id), shipment])),
    [shipments],
  )

  // Customers can only see payments linked to their own shipments.
  // Admin can see all payment records.
  const visiblePayments = useMemo(() => {
    if (isAdmin) return payments
    if (!isCustomer) return []

    const customerId = String(user?.customerId ?? '')
    const customerName = String(user?.name ?? '').trim().toLowerCase()

    const ownedShipmentIds = new Set(
      shipments
        .filter((shipment) => {
          const matchesCustomerId =
            customerId !== '' &&
            (String(shipment.customerId ?? '') === customerId ||
              String(shipment.senderCustomerId ?? '') === customerId)

          const matchesCustomerName =
            customerName !== '' &&
            String(shipment.senderName ?? '').trim().toLowerCase() ===
              customerName

          return matchesCustomerId || matchesCustomerName
        })
        .map((shipment) => String(shipment.id)),
    )

    return payments.filter((payment) =>
      ownedShipmentIds.has(String(payment.shipmentId)),
    )
  }, [payments, shipments, isAdmin, isCustomer, user])

  const filteredPayments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return visiblePayments.filter((payment) => {
      const shipment = shipmentMap.get(String(payment.shipmentId))

      const matchesSearch =
        !query ||
        String(payment.id).toLowerCase().includes(query) ||
        String(payment.shipmentId).toLowerCase().includes(query) ||
        String(shipment?.trackingNumber ?? '').toLowerCase().includes(query) ||
        String(shipment?.senderName ?? '').toLowerCase().includes(query) ||
        String(shipment?.receiverName ?? '').toLowerCase().includes(query)

      const matchesStatus =
        statusFilter === 'all' || payment.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [visiblePayments, searchTerm, statusFilter, shipmentMap])

  // Summary values use the same role-filtered records as the table.
  const totals = useMemo(() => {
    const paidPayments = visiblePayments.filter(
      (payment) => payment.status === 'paid',
    )
    const pendingPayments = visiblePayments.filter(
      (payment) => payment.status === 'pending',
    )
    const failedPayments = visiblePayments.filter(
      (payment) => payment.status === 'failed',
    )

    return {
      revenue: paidPayments.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0,
      ),
      paidCount: paidPayments.length,
      pendingAmount: pendingPayments.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0,
      ),
      pendingCount: pendingPayments.length,
      failedCount: failedPayments.length,
      failedAmount: failedPayments.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0,
      ),
    }
  }, [visiblePayments])

  const markAsPaid = async (payment: Payment) => {
    // Only Admin can perform this action.
    if (!isAdmin || payment.status !== 'pending' || savingPaymentId) return

    const confirmed = window.confirm(
      `Mark payment ${payment.id} as paid? Confirm that the payment was received before continuing.`,
    )

    if (!confirmed) return

    setSavingPaymentId(payment.id)
    setError('')
    setSuccess('')

    try {
      await api.patch(`/payments/${payment.id}`, {
        status: 'paid',
      })

      setPayments((current) =>
        current.map((item) =>
          item.id === payment.id ? { ...item, status: 'paid' } : item,
        ),
      )

      setSuccess(`Payment ${payment.id} has been marked as paid.`)
    } catch {
      setError(`Unable to update payment ${payment.id}. Please try again.`)
    } finally {
      setSavingPaymentId(null)
    }
  }

  if (!isAdmin && !isCustomer) {
    return (
      <DashboardLayout>
        <div className="rounded-2xl border border-rose-200 bg-white p-6 text-slate-900 dark:border-rose-900 dark:bg-slate-900 dark:text-slate-100">
          <h1 className="text-xl font-bold">Access restricted</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            This Payments page is available to Admin and Customer accounts.
          </p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="min-h-full space-y-6 text-slate-900 dark:text-slate-100">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
              <CreditCard size={17} />
              {isAdmin ? 'Finance & Operations' : 'My Account'}
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {isAdmin ? 'Payments' : 'My Payments'}
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              {isAdmin
                ? 'Review shipment payments, monitor outstanding amounts, and manage payment records.'
                : 'View payment records and payment statuses for your shipments.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:self-auto"
          >
            <RefreshCw
              size={16}
              className={loading ? 'animate-spin' : ''}
            />
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
            <button
              type="button"
              onClick={() => setError('')}
              aria-label="Dismiss error"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {success && isAdmin && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300"
          >
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span className="flex-1">{success}</span>
            <button
              type="button"
              onClick={() => setSuccess('')}
              aria-label="Dismiss success"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title={isAdmin ? 'Total revenue' : 'Amount paid'}
            value={formatCurrency(totals.revenue)}
            note={
              isAdmin
                ? 'All recorded paid payments'
                : 'Payments recorded as paid for your shipments'
            }
            icon={<Wallet size={20} />}
            iconClass="bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300"
          />

          <SummaryCard
            title="Paid payments"
            value={loading ? '—' : String(totals.paidCount)}
            note="Successfully recorded payments"
            icon={<CheckCircle2 size={20} />}
            iconClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300"
          />

          <SummaryCard
            title="Pending amount"
            value={formatCurrency(totals.pendingAmount)}
            note={`${totals.pendingCount} pending payment${totals.pendingCount === 1 ? '' : 's'}`}
            icon={<Clock3 size={20} />}
            iconClass="bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300"
          />

          <SummaryCard
            title="Failed payments"
            value={loading ? '—' : String(totals.failedCount)}
            note={`${formatCurrency(totals.failedAmount)} recorded as failed`}
            icon={<CircleDollarSign size={20} />}
            iconClass="bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300"
          />
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-4 dark:border-slate-800 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <label className="relative block min-w-0 flex-1">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search payment, tracking number, sender..."
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter payments by status"
                className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="all">All payment statuses</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="font-semibold">Payment records</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {isAdmin
                  ? 'Review and manage payment statuses.'
                  : 'Review the payment details for your shipments.'}
              </p>
            </div>

            <span className="text-sm text-slate-500 dark:text-slate-400">
              {loading
                ? 'Loading…'
                : `${filteredPayments.length} result${filteredPayments.length === 1 ? '' : 's'}`}
            </span>
          </div>

          {loading ? (
            <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-slate-500 dark:text-slate-400">
              <LoaderCircle size={20} className="animate-spin" />
              Loading payment records…
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
              <div className="mb-3 rounded-2xl bg-slate-100 p-3 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <CreditCard size={24} />
              </div>
              <h3 className="font-semibold">No payments found</h3>
              <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try changing your search or payment status filter.'
                  : isCustomer
                    ? 'No payment records are linked to your shipments yet.'
                    : 'Payment records will appear here when they are added to the system.'}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/70 dark:text-slate-400">
                    <tr>
                      <th className="px-5 py-3.5 font-semibold">Payment</th>
                      <th className="px-5 py-3.5 font-semibold">Shipment</th>
                      <th className="px-5 py-3.5 font-semibold">
                        Customer / Recipient
                      </th>
                      <th className="px-5 py-3.5 font-semibold">Date</th>
                      <th className="px-5 py-3.5 font-semibold">Amount</th>
                      <th className="px-5 py-3.5 font-semibold">Status</th>
                      {isAdmin && (
                        <th className="px-5 py-3.5 font-semibold">Action</th>
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredPayments.map((payment) => {
                      const shipment = shipmentMap.get(
                        String(payment.shipmentId),
                      )
                      const saving = savingPaymentId === payment.id

                      return (
                        <tr
                          key={payment.id}
                          className="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                        >
                          <td className="px-5 py-4">
                            <p className="font-semibold">{payment.id}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {payment.method || 'Payment record'}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-medium">
                              {shipment?.trackingNumber || payment.shipmentId}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              ID: {payment.shipmentId}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-medium">
                              {shipment?.senderName || 'Customer not linked'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              To: {shipment?.receiverName || '—'}
                            </p>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-slate-600 dark:text-slate-300">
                            {formatDate(payment.createdAt)}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 font-semibold">
                            {formatCurrency(Number(payment.amount || 0))}
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge status={payment.status} />
                          </td>

                          {isAdmin && (
                            <td className="px-5 py-4">
                              {payment.status === 'pending' ? (
                                <button
                                  type="button"
                                  onClick={() => void markAsPaid(payment)}
                                  disabled={saving || savingPaymentId !== null}
                                  className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {saving && (
                                    <LoaderCircle
                                      size={14}
                                      className="animate-spin"
                                    />
                                  )}
                                  Mark paid
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400">
                                  —
                                </span>
                              )}
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 p-3 md:hidden">
                {filteredPayments.map((payment) => {
                  const shipment = shipmentMap.get(
                    String(payment.shipmentId),
                  )
                  const saving = savingPaymentId === payment.id

                  return (
                    <article
                      key={payment.id}
                      className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-all font-semibold">
                            {payment.id}
                          </p>
                          <p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">
                            {shipment?.trackingNumber || payment.shipmentId}
                          </p>
                        </div>
                        <StatusBadge status={payment.status} />
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Amount
                          </p>
                          <p className="mt-1 font-semibold">
                            {formatCurrency(Number(payment.amount || 0))}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Date
                          </p>
                          <p className="mt-1">
                            {formatDate(payment.createdAt)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Sender
                          </p>
                          <p className="mt-1 break-words">
                            {shipment?.senderName || 'Not linked'}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Recipient
                          </p>
                          <p className="mt-1 break-words">
                            {shipment?.receiverName || '—'}
                          </p>
                        </div>
                      </div>

                      {isAdmin && payment.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => void markAsPaid(payment)}
                          disabled={saving || savingPaymentId !== null}
                          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {saving ? (
                            <LoaderCircle
                              size={16}
                              className="animate-spin"
                            />
                          ) : (
                            <CheckCircle2 size={16} />
                          )}
                          Mark as paid
                        </button>
                      )}
                    </article>
                  )
                })}
              </div>
            </>
          )}
        </section>

        <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-200">
          <p className="font-semibold">Payment information</p>
          <p className="mt-1 leading-6 text-blue-800/80 dark:text-blue-200/80">
            {isAdmin
              ? 'Payment statuses are stored in JSON Server. Mark a payment as paid only after confirming receipt. This page does not process real payments.'
              : 'These records show payment statuses stored in QuickShip. Online payment processing is not connected to this page.'}
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}

function SummaryCard({
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
          <p className="mt-2 break-words text-xl font-bold tracking-tight sm:text-2xl">
            {value}
          </p>
        </div>
        <div className={`shrink-0 rounded-xl p-2.5 ${iconClass}`}>
          {icon}
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {note}
      </p>
    </div>
  )
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
        statusStyles[status] ??
        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
      }`}
    >
      {getStatusLabel(status)}
    </span>
  )
}
