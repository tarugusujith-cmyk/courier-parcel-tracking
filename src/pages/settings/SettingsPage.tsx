import { useEffect, useState, type FormEvent } from 'react'
import {
  Building2,
  Bell,
  ShieldCheck,
  UserRound,
  Save,
  LoaderCircle,
  CheckCircle2,
} from 'lucide-react'
import DashboardLayout from '../../components/ui/dashboard/DashboardLayout'
import api from '../../services/api'

interface AppSettings {
  id?: string | number
  companyName: string
  supportEmail: string
  phone: string
  address: string
  adminName: string
  adminEmail: string
  shipmentNotifications: boolean
  deliveryNotifications: boolean
  paymentNotifications: boolean
}

const defaultSettings: AppSettings = {
  companyName: 'QuickShip',
  supportEmail: 'support@quickship.com',
  phone: '',
  address: '',
  adminName: '',
  adminEmail: '',
  shipmentNotifications: true,
  deliveryNotifications: true,
  paymentNotifications: true,
}

type Section = 'general' | 'profile' | 'notifications' | 'security'

export default function SettingsPage() {
  const [section, setSection] = useState<Section>('general')
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [settingsId, setSettingsId] = useState<string | number | undefined>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    let active = true

    async function loadSettings() {
      try {
        const response = await api.get<AppSettings[]>('/settings')

        if (!active) return

        const existing = response.data[0]

        if (existing) {
          setSettings({ ...defaultSettings, ...existing })
          setSettingsId(existing.id)
        }
      } catch {
        if (active) {
          setError(
            'Could not load settings. Check that JSON Server is running and /settings exists in db.json.',
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadSettings()

    return () => {
      active = false
    }
  }, [])

  const updateSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => {
    setSettings((previous) => ({ ...previous, [key]: value }))
    setMessage('')
    setError('')
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    try {
      if (settingsId !== undefined) {
        await api.patch(`/settings/${settingsId}`, settings)
      } else {
        const response = await api.post('/settings', settings)
        setSettingsId(response.data.id)
      }

      setMessage('Settings saved successfully.')
    } catch {
      setError('Unable to save settings. Please check your JSON Server API.')
    } finally {
      setSaving(false)
    }
  }

  function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setError('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all password fields.')
      return
    }

    if (newPassword.length < 8) {
      setError('The new password must contain at least 8 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('The new password and confirmation do not match.')
      return
    }

    setError(
      'Password changes are not connected to the authentication API yet. Do not use this form to change a real account password.',
    )
  }

  const sections = [
    { id: 'general', label: 'General', icon: Building2 },
    { id: 'profile', label: 'Admin Profile', icon: UserRound },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: ShieldCheck },
  ] as const

  const inputClass =
    'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'

  const labelClass =
    'block text-sm font-medium text-slate-700 dark:text-slate-200'

  return (
    <DashboardLayout>
      <div className="min-w-0 space-y-6 pb-8">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Admin / Settings
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Settings
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Manage your company information, account preferences and security.
          </p>
        </div>

        {message && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            <CheckCircle2 size={18} />
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <nav
            aria-label="Settings sections"
            className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950 lg:flex-col"
          >
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setSection(id)
                  setMessage('')
                  setError('')
                }}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                  section === id
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900'
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>

          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
            {loading ? (
              <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-slate-500">
                <LoaderCircle className="animate-spin" size={20} />
                Loading settings...
              </div>
            ) : section === 'security' ? (
              <form onSubmit={changePassword} className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Security
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Password validation for your administrator account.
                  </p>
                </div>

                <div>
                  <label className={labelClass}>Current password</label>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>New password</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Use at least 8 characters.
                  </p>
                </div>

                <div>
                  <label className={labelClass}>Confirm new password</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Validate password
                </button>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This demo form does not change the stored account password.
                  A secure password-update API must be implemented separately.
                </p>
              </form>
            ) : (
              <form onSubmit={saveSettings} className="space-y-6">
                {section === 'general' && (
                  <>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        General settings
                      </h2>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Update your courier company details.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>Company name</label>
                        <input
                          required
                          value={settings.companyName}
                          onChange={(e) => updateSetting('companyName', e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Support email</label>
                        <input
                          required
                          type="email"
                          value={settings.supportEmail}
                          onChange={(e) => updateSetting('supportEmail', e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Contact number</label>
                        <input
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]{10}"
                          maxLength={10}
                          title="Enter a 10-digit phone number"
                          value={settings.phone}
                          onChange={(e) =>
                            updateSetting('phone', e.target.value.replace(/\D/g, '').slice(0, 10))
                          }
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Office address</label>
                        <input
                          value={settings.address}
                          onChange={(e) => updateSetting('address', e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </>
                )}

                {section === 'profile' && (
                  <>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Admin profile
                      </h2>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Maintain the contact information shown for the administrator.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>Full name</label>
                        <input
                          required
                          value={settings.adminName}
                          onChange={(e) => updateSetting('adminName', e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Email address</label>
                        <input
                          required
                          type="email"
                          value={settings.adminEmail}
                          onChange={(e) => updateSetting('adminEmail', e.target.value.toLowerCase())}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </>
                )}

                {section === 'notifications' && (
                  <>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Notification preferences
                      </h2>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Choose which types of alerts you want enabled.
                      </p>
                    </div>

                    {([
                      ['shipmentNotifications', 'Shipment updates', 'Alerts when a shipment is created or its status changes.'],
                      ['deliveryNotifications', 'Delivery alerts', 'Alerts for assignments, failed deliveries and completed deliveries.'],
                      ['paymentNotifications', 'Payment alerts', 'Alerts for payment updates and transaction status changes.'],
                    ] as const).map(([key, title, description]) => (
                      <label
                        key={key}
                        className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                      >
                        <span>
                          <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
                            {title}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {description}
                          </span>
                        </span>
                        <input
                          type="checkbox"
                          checked={settings[key]}
                          onChange={(e) => updateSetting(key, e.target.checked)}
                          className="mt-1 size-4 accent-blue-600"
                        />
                      </label>
                    ))}
                  </>
                )}

                <div className="flex justify-end border-t border-slate-200 pt-5 dark:border-slate-800">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <LoaderCircle className="animate-spin" size={17} />
                    ) : (
                      <Save size={17} />
                    )}
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  )
}
