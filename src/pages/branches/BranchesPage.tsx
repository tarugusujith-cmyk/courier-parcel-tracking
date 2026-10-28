import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Dispatch, FormEvent, ReactNode, SetStateAction } from 'react'
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Eye,
  LoaderCircle,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { api } from '../../services/api'
import DashboardLayout from '../../components/ui/dashboard/DashboardLayout'
type BranchStatus = 'active' | 'inactive'
interface Branch {
  id: string
  name: string
  code: string
  address: string
  city: string
  contact: string
  manager: string
  status: BranchStatus
}
type BranchForm = Omit<Branch, 'id'>
const emptyForm: BranchForm = {
  name: '',
  code: '',
  address: '',
  city: '',
  contact: '',
  manager: '',
  status: 'active',
}
const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500'
const labelClass =
  'mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300'
function getErrorMessage(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }
  return 'Something went wrong. Please try again.'
}
function createBranchId(): string {
  return `BR${Date.now().toString().slice(-6)}`
}
function StatusBadge({ status }: { status: BranchStatus }) {
  const active = status === 'active'
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1',
        'text-xs font-semibold capitalize',
        active
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
      ].join(' ')}
    >
      <span
        className={[
          'h-1.5 w-1.5 rounded-full',
          active ? 'bg-emerald-500' : 'bg-slate-400',
        ].join(' ')}
      />
      {status}
    </span>
  )
}
function Modal({
  title,
  subtitle,
  onClose,
  children,
  size = 'max-w-2xl',
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  size?: string
}) {
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`my-auto flex max-h-[92dvh] w-full ${size} flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900`}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X size={19} />
          </button>
        </header>
        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {children}
        </div>
      </section>
    </div>,
    document.body,
  )
}
function BranchFormFields({
  form,
  setForm,
  errors,
}: {
  form: BranchForm
  setForm: Dispatch<SetStateAction<BranchForm>>
  errors: Partial<Record<keyof BranchForm, string>>
}) {
  function update<K extends keyof BranchForm>(
    field: K,
    value: BranchForm[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }))
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label className={labelClass} htmlFor="branch-name">
          Branch name *
        </label>
        <input
          id="branch-name"
          className={inputClass}
          value={form.name}
          onChange={(event) => update('name', event.target.value)}
          placeholder="e.g. Chennai Central"
          maxLength={80}
        />
        {errors.name && (
          <p className="mt-1 text-xs text-rose-600">{errors.name}</p>
        )}
      </div>
      <div>
        <label className={labelClass} htmlFor="branch-code">
          Branch code *
        </label>
        <input
          id="branch-code"
          className={inputClass}
          value={form.code}
          onChange={(event) =>
            update('code', event.target.value.toUpperCase().replace(/\s/g, ''))
          }
          placeholder="e.g. CHN01"
          maxLength={12}
        />
        {errors.code && (
          <p className="mt-1 text-xs text-rose-600">{errors.code}</p>
        )}
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass} htmlFor="branch-address">
          Address *
        </label>
        <input
          id="branch-address"
          className={inputClass}
          value={form.address}
          onChange={(event) => update('address', event.target.value)}
          placeholder="Street address"
          maxLength={150}
        />
        {errors.address && (
          <p className="mt-1 text-xs text-rose-600">{errors.address}</p>
        )}
      </div>
      <div>
        <label className={labelClass} htmlFor="branch-city">
          City *
        </label>
        <input
          id="branch-city"
          className={inputClass}
          value={form.city}
          onChange={(event) => update('city', event.target.value)}
          placeholder="e.g. Chennai"
          maxLength={60}
        />
        {errors.city && (
          <p className="mt-1 text-xs text-rose-600">{errors.city}</p>
        )}
      </div>
      <div>
        <label className={labelClass} htmlFor="branch-contact">
          Contact number *
        </label>
        <input
          id="branch-contact"
          className={inputClass}
          type="tel"
          inputMode="numeric"
          value={form.contact}
          onChange={(event) =>
            update('contact', event.target.value.replace(/\D/g, '').slice(0, 10))
          }
          placeholder="10-digit mobile number"
          maxLength={10}
        />
        {errors.contact && (
          <p className="mt-1 text-xs text-rose-600">{errors.contact}</p>
        )}
      </div>
      <div>
        <label className={labelClass} htmlFor="branch-manager">
          Branch manager *
        </label>
        <input
          id="branch-manager"
          className={inputClass}
          value={form.manager}
          onChange={(event) => update('manager', event.target.value)}
          placeholder="Manager name"
          maxLength={80}
        />
        {errors.manager && (
          <p className="mt-1 text-xs text-rose-600">{errors.manager}</p>
        )}
      </div>
      <div>
        <label className={labelClass} htmlFor="branch-status">
          Status
        </label>
        <div className="relative">
          <select
            id="branch-status"
            className={`${inputClass} appearance-none pr-10`}
            value={form.status}
            onChange={(event) =>
              update('status', event.target.value as BranchStatus)
            }
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>
      </div>
    </div>
  )
}
export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modal, setModal] = useState<'create' | 'edit' | 'view' | 'delete' | null>(
    null,
  )
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [form, setForm] = useState<BranchForm>(emptyForm)
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof BranchForm, string>>
  >({})
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [noticeError, setNoticeError] = useState(false)
  const loadBranches = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get<Branch[]>('/branches')
      setBranches(response.data)
    } catch {
      setError(
        'Unable to load branches. Check that JSON Server is running on port 5000.',
      )
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void loadBranches()
  }, [loadBranches])
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 3500)
    return () => window.clearTimeout(timer)
  }, [notice])
  const filteredBranches = useMemo(() => {
    const query = search.trim().toLowerCase()
    return branches.filter((branch) => {
      const matchesSearch = [
        branch.name,
        branch.code,
        branch.city,
        branch.manager,
      ].some((value) => String(value ?? '').toLowerCase().includes(query))
      const matchesStatus =
        statusFilter === 'all' || branch.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [branches, search, statusFilter])
  const activeCount = branches.filter((branch) => branch.status === 'active').length
  const inactiveCount = branches.length - activeCount
  const citiesCount = new Set(
    branches.map((branch) => branch.city.trim().toLowerCase()).filter(Boolean),
  ).size
  function openCreate() {
    setSelectedBranch(null)
    setForm(emptyForm)
    setFormErrors({})
    setModal('create')
  }
  function openEdit(branch: Branch) {
    setSelectedBranch(branch)
    setForm({
      name: branch.name ?? '',
      code: branch.code ?? '',
      address: branch.address ?? '',
      city: branch.city ?? '',
      contact: branch.contact ?? '',
      manager: branch.manager ?? '',
      status: branch.status === 'inactive' ? 'inactive' : 'active',
    })
    setFormErrors({})
    setModal('edit')
  }
  function validateForm(): boolean {
    const errors: Partial<Record<keyof BranchForm, string>> = {}
    if (!form.name.trim()) errors.name = 'Branch name is required.'
    if (!form.code.trim()) {
      errors.code = 'Branch code is required.'
    } else if (!/^[A-Z0-9-]{3,12}$/.test(form.code.trim())) {
      errors.code = 'Use 3–12 uppercase letters, numbers, or hyphens.'
    }
    if (!form.address.trim()) errors.address = 'Address is required.'
    if (!form.city.trim()) errors.city = 'City is required.'
    if (!form.manager.trim()) errors.manager = 'Manager name is required.'
    if (!/^\d{10}$/.test(form.contact)) {
      errors.contact = 'Enter a valid 10-digit contact number.'
    }
    const duplicateCode = branches.some(
      (branch) =>
        branch.code.trim().toLowerCase() === form.code.trim().toLowerCase() &&
        branch.id !== selectedBranch?.id,
    )
    if (duplicateCode) {
      errors.code = 'This branch code is already in use.'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }
  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validateForm()) return
    setSaving(true)
    const payload: BranchForm = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      address: form.address.trim(),
      city: form.city.trim(),
      contact: form.contact.trim(),
      manager: form.manager.trim(),
      status: form.status,
    }
    try {
      if (modal === 'edit' && selectedBranch) {
        await api.patch(`/branches/${encodeURIComponent(selectedBranch.id)}`, payload)
        setNotice('Branch updated successfully.')
      } else {
        await api.post('/branches', {
          id: createBranchId(),
          ...payload,
        })
        setNotice('Branch created successfully.')
      }
      setNoticeError(false)
      setModal(null)
      setSelectedBranch(null)
      await loadBranches()
    } catch (saveError) {
      setNoticeError(true)
      setNotice(
        `Unable to save branch. ${getErrorMessage(saveError)}`,
      )
    } finally {
      setSaving(false)
    }
  }
  async function handleDelete() {
    if (!selectedBranch) return
    setSaving(true)
    try {
      await api.delete(`/branches/${encodeURIComponent(selectedBranch.id)}`)
      setNotice('Branch deleted successfully.')
      setNoticeError(false)
      setModal(null)
      setSelectedBranch(null)
      await loadBranches()
    } catch (deleteError) {
      setNoticeError(true)
      setNotice(`Unable to delete branch. ${getErrorMessage(deleteError)}`)
    } finally {
      setSaving(false)
    }
  }
  function closeModal() {
    if (saving) return
    setModal(null)
    setSelectedBranch(null)
    setFormErrors({})
  }
  return (
    <DashboardLayout>
      <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Building2 size={16} />
            <span>Management</span>
            <span>/</span>
            <span className="text-blue-600 dark:text-blue-400">Branches</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Branch Management
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage branch locations, contact details, and operational status.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
        >
          <Plus size={18} />
          Add Branch
        </button>
      </div>
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total branches"
          value={branches.length}
          detail="All registered locations"
          icon={<Building2 size={21} />}
          iconClass="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
        />
        <SummaryCard
          label="Active branches"
          value={activeCount}
          detail="Currently operational"
          icon={<CheckCircle2 size={21} />}
          iconClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
        />
        <SummaryCard
          label="Inactive branches"
          value={inactiveCount}
          detail="Not currently operational"
          icon={<CircleAlert size={21} />}
          iconClass="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
        />
        <SummaryCard
          label="Cities covered"
          value={citiesCount}
          detail="Unique branch cities"
          icon={<MapPin size={21} />}
          iconClass="bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
        />
      </div>
      {/* Table panel */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="font-bold">All branches</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {filteredBranches.length} of {branches.length} branches
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 sm:w-64">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                aria-label="Search branches"
                className={`${inputClass} pl-9`}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, code, city..."
              />
            </div>
            <div className="relative sm:w-40">
              <select
                aria-label="Filter by branch status"
                className={`${inputClass} appearance-none pr-9`}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>
        </div>
        {error && (
          <div className="m-4 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300 sm:flex-row sm:items-center sm:justify-between">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void loadBranches()}
              className="shrink-0 font-semibold underline underline-offset-4"
            >
              Retry
            </button>
          </div>
        )}
        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-slate-500 dark:text-slate-400">
            <LoaderCircle size={20} className="animate-spin" />
            Loading branches...
          </div>
        ) : !error && filteredBranches.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <Building2 size={25} />
            </span>
            <h3 className="mt-4 font-semibold">No branches found</h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              Try another search or status filter, or add a new branch.
            </p>
            {search || statusFilter !== 'all' ? (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setStatusFilter('all')
                }}
                className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Clear filters
              </button>
            ) : (
              <button
                type="button"
                onClick={openCreate}
                className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Add your first branch
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-4 font-semibold">Branch</th>
                  <th className="px-5 py-4 font-semibold">Code</th>
                  <th className="px-5 py-4 font-semibold">City</th>
                  <th className="px-5 py-4 font-semibold">Contact</th>
                  <th className="px-5 py-4 font-semibold">Manager</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredBranches.map((branch) => (
                  <tr
                    key={branch.id}
                    className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                          <Building2 size={19} />
                        </span>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {branch.name}
                          </p>
                          <p className="mt-0.5 max-w-48 truncate text-xs text-slate-500 dark:text-slate-400">
                            {branch.address || 'No address provided'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {branch.code}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                      {branch.city || '—'}
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                      {branch.contact || '—'}
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                      {branch.manager || '—'}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={branch.status === 'inactive' ? 'inactive' : 'active'} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <ActionButton
                          label="View branch"
                          onClick={() => {
                            setSelectedBranch(branch)
                            setModal('view')
                          }}
                        >
                          <Eye size={17} />
                        </ActionButton>
                        <ActionButton
                          label="Edit branch"
                          onClick={() => openEdit(branch)}
                        >
                          <Pencil size={17} />
                        </ActionButton>
                        <ActionButton
                          label="Delete branch"
                          danger
                          onClick={() => {
                            setSelectedBranch(branch)
                            setModal('delete')
                          }}
                        >
                          <Trash2 size={17} />
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {/* Create and edit modal */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal
          title={modal === 'create' ? 'Add new branch' : 'Edit branch'}
          subtitle={
            modal === 'create'
              ? 'Enter the details for the new QuickShip branch.'
              : `Update the details for ${selectedBranch?.name ?? 'this branch'}.`
          }
          onClose={closeModal}
        >
          <form onSubmit={handleSave} noValidate>
            <BranchFormFields
              form={form}
              setForm={setForm}
              errors={formErrors}
            />
            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 dark:border-slate-800 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={closeModal}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && <LoaderCircle size={16} className="animate-spin" />}
                {modal === 'create' ? 'Create branch' : 'Save changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {/* View details modal */}
      {modal === 'view' && selectedBranch && (
        <Modal
          title="Branch details"
          subtitle="Branch information and operational status."
          onClose={closeModal}
          size="max-w-xl"
        >
          <div className="mb-5 flex items-center gap-4 rounded-2xl bg-blue-50 p-4 dark:bg-blue-500/10">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <Building2 size={27} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="break-words text-lg font-bold text-slate-900 dark:text-white">
                {selectedBranch.name}
              </h3>
              <p className="mt-1 font-mono text-sm text-slate-500 dark:text-slate-400">
                {selectedBranch.code} · {selectedBranch.id}
              </p>
            </div>
            <StatusBadge status={selectedBranch.status === 'inactive' ? 'inactive' : 'active'} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailItem label="Branch ID" value={selectedBranch.id} />
            <DetailItem label="Branch code" value={selectedBranch.code} />
            <DetailItem label="Branch name" value={selectedBranch.name} />
            <DetailItem label="City" value={selectedBranch.city} />
            <DetailItem label="Contact number" value={selectedBranch.contact} />
            <DetailItem label="Branch manager" value={selectedBranch.manager} />
            <div className="sm:col-span-2">
              <DetailItem label="Address" value={selectedBranch.address} />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => openEdit(selectedBranch)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Pencil size={16} />
              Edit branch
            </button>
          </div>
        </Modal>
      )}
      {/* Delete confirmation modal */}
      {modal === 'delete' && selectedBranch && (
        <Modal
          title="Delete branch?"
          subtitle="This action cannot be undone."
          onClose={closeModal}
          size="max-w-md"
        >
          <div className="flex gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
              <Trash2 size={21} />
            </span>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">
                {selectedBranch.name}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Are you sure you want to delete this branch? Any existing
                shipment or agent references will not be automatically updated.
                Check those records before deleting a branch in active use.
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={closeModal}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleDelete()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {saving && <LoaderCircle size={16} className="animate-spin" />}
              Delete branch
            </button>
          </div>
        </Modal>
      )}
      {/* Toast notification */}
      {notice && (
        <div
          role="status"
          className={[
            'fixed bottom-5 right-5 z-[120] flex max-w-[calc(100vw-2.5rem)] items-start gap-3 rounded-xl border px-4 py-3 shadow-xl',
            noticeError
              ? 'border-rose-200 bg-white text-rose-700 dark:border-rose-900 dark:bg-slate-900 dark:text-rose-300'
              : 'border-emerald-200 bg-white text-emerald-700 dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-300',
          ].join(' ')}
        >
          {noticeError ? <CircleAlert size={19} /> : <CheckCircle2 size={19} />}
          <p className="text-sm font-medium">{notice}</p>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setNotice('')}
            className="ml-2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
    </DashboardLayout>
  )
}
function SummaryCard({
  label,
  value,
  detail,
  icon,
  iconClass,
}: {
  label: string
  value: number
  detail: string
  icon: ReactNode
  iconClass: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {value}
          </p>
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}>
          {icon}
        </span>
      </div>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        {detail}
      </p>
    </div>
  )
}
function ActionButton({
  label,
  onClick,
  children,
  danger = false,
}: {
  label: string
  onClick: () => void
  children: ReactNode
  danger?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={[
        'rounded-lg p-2 transition',
        danger
          ? 'text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400'
          : 'text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10 dark:hover:text-blue-400',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
function DetailItem({ label, value }: { label: string; value?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-100 p-3.5 dark:border-slate-800">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">
        {value?.trim() || 'Not provided'}
      </p>
       </div>
  )
}
