import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { FormEvent, ReactNode } from 'react'
import { CheckCircle2, Eye, LoaderCircle, Mail, MapPin, Pencil, Phone, Plus, Search, Trash2, Users, X } from 'lucide-react'
import { api } from '../../services/api'
import DashboardLayout from '../../components/ui/dashboard/DashboardLayout'
interface Customer {
  id: string
  name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  pincode: string
}
interface Shipment {
  id: string
  customerId?: string
  senderCustomerId?: string
  status?: string
}
type CustomerForm = Omit<Customer, 'id'>
type ModalMode = 'add' | 'edit' | 'view'
const emptyForm: CustomerForm = { name: '', email: '', phone: '', address: '', city: '', state: '', pincode: '' }
const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500'
const labelClass = 'mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300'
function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') return error.message
  return 'Something went wrong. Please try again.'
}
function CustomerModal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])
  return createPortal(<div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section role="dialog" aria-modal="true" aria-label={title} className="relative z-[101] my-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"><div className="sticky top-0 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-900 sm:px-6"><div><h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>{subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}</div><button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={19} /></button></div><div className="p-5 sm:p-6">{children}</div></section></div>, document.body)
}
function Field({ label, value, onChange, error, type = 'text', required = false, placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; error?: string; type?: string; required?: boolean; placeholder?: string }) {
  return <div><label className={labelClass}>{label}{required && <span className="ml-1 text-rose-500">*</span>}</label><input className={`${inputClass} ${error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/10' : ''}`} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} />{error && <p className="mt-1 text-xs text-rose-500">{error}</p>}</div>
}
function CustomerStatus({ active }: { active: boolean }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}><span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />{active ? 'Registered' : 'No shipments'}</span>
}
export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<ModalMode | null>(null)
  const [selected, setSelected] = useState<Customer | null>(null)
  const [form, setForm] = useState<CustomerForm>(emptyForm)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CustomerForm, string>>>({})
  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [customerResponse, shipmentResponse] = await Promise.all([api.get<Customer[]>('/customers'), api.get<Shipment[]>('/shipments')])
      setCustomers(customerResponse.data)
      setShipments(shipmentResponse.data)
    } catch (loadError) {
      setError(getErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { void loadData() }, [loadData])
  const shipmentCount = useCallback((customer: Customer) => shipments.filter((shipment) => shipment.customerId === customer.id || shipment.senderCustomerId === customer.id).length, [shipments])
  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return customers
    return customers.filter((customer) => [customer.id, customer.name, customer.email, customer.phone, customer.city, customer.pincode].some((value) => (value || '').toLowerCase().includes(query)))
  }, [customers, search])
  const openAdd = () => { setSelected(null); setForm(emptyForm); setFormErrors({}); setError(''); setMode('add') }
  const openEdit = (customer: Customer) => { setSelected(customer); setForm({ name: customer.name, email: customer.email, phone: customer.phone, address: customer.address || '', city: customer.city || '', state: customer.state || '', pincode: customer.pincode || '' }); setFormErrors({}); setError(''); setMode('edit') }
  const openView = (customer: Customer) => { setSelected(customer); setMode('view') }
  const closeModal = () => { if (!saving) setMode(null) }
  const updateField = (field: keyof CustomerForm, value: string) => { setForm((current) => ({ ...current, [field]: field === 'email' ? value.toLowerCase().trimStart() : value })); setFormErrors((current) => ({ ...current, [field]: '' })) }
  const validateForm = () => {
    const errors: Partial<Record<keyof CustomerForm, string>> = {}
    if (!form.name.trim() || !/^[A-Za-z][A-Za-z .'-]*$/.test(form.name.trim())) errors.name = 'Enter a valid name using letters only.'
    if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(form.email.trim())) errors.email = 'Enter a valid email address.'
    if (!/^\d{10}$/.test(form.phone.trim())) errors.phone = 'Phone number must contain exactly 10 digits.'
    if (form.pincode.trim() && !/^\d{6}$/.test(form.pincode.trim())) errors.pincode = 'Pincode must contain 6 digits.'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validateForm()) return
    setSaving(true)
    setError('')
    setNotice('')
    const payload = { ...form, name: form.name.trim(), email: form.email.trim().toLowerCase(), phone: form.phone.trim(), address: form.address.trim(), city: form.city.trim(), state: form.state.trim(), pincode: form.pincode.trim() }
    try {
      if (mode === 'edit' && selected) {
        await api.patch(`/customers/${selected.id}`, payload)
        setNotice('Customer details updated successfully.')
      } else {
        const duplicate = customers.some((customer) => customer.email.toLowerCase() === payload.email)
        if (duplicate) { setFormErrors((current) => ({ ...current, email: 'A customer with this email already exists.' })); setSaving(false); return }
        await api.post('/customers', { id: `CU${Date.now().toString().slice(-6)}`, ...payload })
        setNotice('Customer added successfully.')
      }
      setMode(null)
      await loadData()
    } catch (saveError) {
      setError(getErrorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }
  const handleDelete = async (customer: Customer) => {
    const linkedShipments = shipmentCount(customer)
    const message = linkedShipments > 0 ? `${customer.name} has ${linkedShipments} shipment(s). Delete this customer profile anyway? Shipment records will remain.` : `Delete customer ${customer.name}? This action cannot be undone.`
    if (!window.confirm(message)) return
    setError('')
    setNotice('')
    try {
      await api.delete(`/customers/${customer.id}`)
      setCustomers((current) => current.filter((item) => item.id !== customer.id))
      setNotice('Customer profile deleted. Related users and shipment records were not changed.')
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
    }
  }
  return <DashboardLayout>
    <div className="min-w-0 space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-blue-600 dark:text-blue-400">Management</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Customers</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage customer profiles and review their shipment activity.</p></div><button type="button" onClick={openAdd} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20"><Plus size={18} /> Add customer</button></div>{notice && <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"><CheckCircle2 size={18} className="mt-0.5 shrink-0" />{notice}<button className="ml-auto" type="button" onClick={() => setNotice('')} aria-label="Dismiss message"><X size={16} /></button></div>}{error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">{error}<button className="ml-auto" type="button" onClick={() => setError('')} aria-label="Dismiss error"><X size={16} /></button></div>}<div className="grid grid-cols-1 gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><p className="text-sm text-slate-500 dark:text-slate-400">Total customers</p><span className="rounded-xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"><Users size={20} /></span></div><p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{customers.length}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><p className="text-sm text-slate-500 dark:text-slate-400">Customers with shipments</p><span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"><CheckCircle2 size={20} /></span></div><p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{customers.filter((customer) => shipmentCount(customer) > 0).length}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><p className="text-sm text-slate-500 dark:text-slate-400">Total linked shipments</p><span className="rounded-xl bg-violet-50 p-2.5 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"><MapPin size={20} /></span></div><p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{shipments.filter((shipment) => shipment.customerId || shipment.senderCustomerId).length}</p></div></div><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div><h2 className="font-semibold text-slate-900 dark:text-white">Customer directory</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{filteredCustomers.length} of {customers.length} customers</p></div><div className="relative w-full sm:max-w-xs"><Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, phone..." className={`${inputClass} pl-9`} aria-label="Search customers" /></div></div>{loading ? <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500 dark:text-slate-400">
        <LoaderCircle className="animate-spin" size={20} />
        Loading customers...
        </div> : filteredCustomers.length === 0 ? 
        <div className="p-12 text-center">
          <Users size={32} className="mx-auto text-slate-300 dark:text-slate-600" /><h3 className="mt-3 font-semibold text-slate-900 dark:text-white">No customers found</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Try another search or add a customer.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
          <tr>
            <th className="px-5 py-3.5 font-semibold">Customer</th>
            <th className="px-5 py-3.5 font-semibold">Contact</th>
            <th className="px-5 py-3.5 font-semibold">Location</th>
            <th className="px-5 py-3.5 font-semibold">Shipments</th>
            <th className="px-5 py-3.5 font-semibold">Activity</th>
            <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
            </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{filteredCustomers.map((customer) => <tr key={customer.id} className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
            <td className="px-5 py-4">
              <div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">{customer.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div><div><p className="font-semibold text-slate-900 dark:text-white">{customer.name}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{customer.id}</p></div></div></td><td className="px-5 py-4"><p className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <Mail size={14} className="shrink-0 text-slate-400" />{customer.email}</p><p className="mt-1.5 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><Phone size={14} className="shrink-0" />{customer.phone}</p></td><td className="px-5 py-4"><p className="text-sm text-slate-700 dark:text-slate-300">{customer.city || '—'}{customer.state ? `, ${customer.state}` : ''}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{customer.pincode || 'No pincode'}</p></td><td className="px-5 py-4"><span className="inline-flex min-w-8 items-center justify-center rounded-lg bg-blue-50 px-2.5 py-1.5 text-sm font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">{shipmentCount(customer)}</span></td><td className="px-5 py-4"><CustomerStatus active={shipmentCount(customer) > 0} />
              </td>
              <td className="px-5 py-4">
                <div className="flex justify-end gap-1">
                  <button type="button" 
                  onClick={() => openView(customer)} 
                  title="View customer" 
                  aria-label={`View ${customer.name}`}
                   className="rounded-lg p-2 text-slate-500 
                   hover:bg-slate-100 hover:text-blue-600 
                   dark:hover:bg-slate-800 dark:hover:text-blue-400">
                    <Eye size={17} />
                    </button>
                    
                    <button type="button" 
                    onClick={() => openEdit(customer)} 
                    title="Edit customer" 
                    aria-label={`Edit ${customer.name}`} 
                    className="rounded-lg p-2 text-slate-500 
                    hover:bg-slate-100 hover:text-blue-600 
                    dark:hover:bg-slate-800 dark:hover:text-blue-400">
                      <Pencil size={17} />
                      </button>
                      
                      <button type="button" 
                      onClick={() => void 
                        handleDelete(customer)} 
                        title="Delete customer" 
                        aria-label={`Delete ${customer.name}`} 
                        className="rounded-lg p-2 text-slate-500 
                        hover:bg-rose-50 hover:text-rose-600 
                        dark:hover:bg-rose-500/10 
                        dark:hover:text-rose-400">
                          <Trash2 size={17} />
                        </button>
                        
                        </div>
                        </td>
                        </tr>
                        )}
                        </tbody>
                        </table>
                        </div>
                        }
                        </section>
                        </div>
                        {mode && 
                        mode !== 'view' && 
                        <CustomerModal 
                        title={mode === 'add' ? 'Add customer' : 'Edit customer'} subtitle={mode === 'add' ? 'Create a new customer profile.' : `Update details for ${selected?.name || 'this customer'}.`} onClose={closeModal}><form onSubmit={(event) => void handleSubmit(event)} className="space-y-5" noValidate><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Field label="Full name" value={form.name} onChange={(value) => updateField('name', value)} error={formErrors.name} required placeholder="e.g. Sneha Iyer" /><Field label="Email address" type="email" value={form.email} onChange={(value) => updateField('email', value)} error={formErrors.email} required placeholder="name@example.com" />
                        <Field label="Phone number" 
                        value={form.phone} 
                        onChange={(value) => updateField('phone', value.replace(/\D/g, '').slice(0, 10))} error={formErrors.phone} required placeholder="10-digit phone number" /><Field label="Address" value={form.address} onChange={(value) => updateField('address', value)} placeholder="Street and building" />
                        <Field label="City" value={form.city} onChange={(value) => updateField('city', value)} placeholder="City" />
                        <Field label="State" 
                        value={form.state} 
                        onChange={(value) => updateField('state', value)} 
                        placeholder="State" />

                        <Field label="Pincode" 
                        value={form.pincode} 
                        onChange={(value) => updateField('pincode', value.replace(/\D/g, '').slice(0, 6))} error={formErrors.pincode} placeholder="6-digit pincode" /></div><div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:justify-end"><button type="button" onClick={closeModal} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button><button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{saving && <LoaderCircle size={16} className="animate-spin" />}{saving ? 'Saving...' : mode === 'add' ? 'Add customer' : 'Save changes'}</button></div></form></CustomerModal>}{mode === 'view' && selected && <CustomerModal title="Customer details" subtitle={`Customer ID: ${selected.id}`} onClose={closeModal}><div className="space-y-5"><div className="flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-lg font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">{selected.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div><div><h3 className="text-lg font-bold text-slate-900 dark:text-white">{selected.name}</h3><p className="text-sm text-slate-500 dark:text-slate-400">{selected.email}</p></div></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{[['Phone', selected.phone], ['Address', selected.address || 'Not provided'], ['City', selected.city || 'Not provided'], ['State', selected.state || 'Not provided'], ['Pincode', selected.pincode || 'Not provided'], ['Linked shipments', String(shipmentCount(selected))]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/70"><p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p><p className="mt-1.5 break-words text-sm font-semibold text-slate-900 dark:text-white">{value}</p></div>)}</div><div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800"><button type="button" onClick={closeModal} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Close</button><button type="button" onClick={() => openEdit(selected)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"><Pencil size={16} /> Edit customer</button></div></div></CustomerModal>}</DashboardLayout>
}
