
import { useState, type SyntheticEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Mail,
  Phone,
  User,
  LockKeyhole,
} from 'lucide-react'
import AuthLayout from '../../components/ui/auth/AuthLayout'
import api from '../../services/api'

export default function SignUpPage() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const normalizedName = name.trim()
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedPhone = phone.trim()

    if (!/^[a-zA-Z ]+$/.test(normalizedName)) {
      setError('Name must contain letters and spaces only.')
      return
    }

    if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(normalizedEmail)) {
      setError('Please enter a valid email address.')
      return
    }

    if (!/^\d{10}$/.test(normalizedPhone)) {
      setError('Phone number must contain exactly 10 digits.')
      return
    }

    if (password.length < 8) {
      setError('Password must contain at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)

    try {
      const existingUsers = await api.get('/users', {
        params: { email: normalizedEmail },
      })

      if (existingUsers.data.length > 0) {
        setError('An account with this email already exists.')
        return
      }

      const customersResponse = await api.get('/customers')
      const customerId = `CU${String(
        customersResponse.data.length + 1,
      ).padStart(3, '0')}`

      await api.post('/customers', {
        id: customerId,
        name: normalizedName,
        email: normalizedEmail,
        phone: normalizedPhone,
        address: '',
        city: '',
        state: '',
        pincode: '',
      })

      await api.post('/users', {
        id: `U${Date.now()}`,
        name: normalizedName,
        email: normalizedEmail,
        password,
        role: 'customer',
        status: 'active',
        customerId,
      })

      setSuccess('Account created successfully! Redirecting to sign in...')
      setTimeout(() => navigate('/login'), 1200)
    } catch {
      setError(
        'Unable to create your account. Please check that the server is running.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'min-w-0 w-full bg-transparent py-1.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white'

  const fieldClass =
    'flex items-center gap-2.5 rounded-lg border border-white/70 bg-white/75 px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 dark:border-white/10 dark:bg-slate-950/40'

  const labelClass =
    'mb-1 block text-xs font-semibold text-slate-900 dark:text-slate-200'

  return (
    <AuthLayout
      heading="Create your account"
      description="Join QuickShip to book parcels and track your deliveries."
    >
      <form onSubmit={handleSubmit} className="space-y-1.5">
        <div>
          <label htmlFor="name" className={labelClass}>
            Full name
          </label>
          <div className={fieldClass}>
            <User size={16} className="shrink-0 text-slate-400" />
            <input
              id="name"
              name="name"
              type="text"
              value={name}
              onChange={(event) => {
                const value = event.target.value
                if (/^[a-zA-Z ]*$/.test(value)) {
                  setName(value)
                }
              }}
              placeholder="Enter your full name"
              autoComplete="name"
              required
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="signup-email" className={labelClass}>
            Email address
          </label>
          <div className={fieldClass}>
            <Mail size={16} className="shrink-0 text-slate-400" />
            <input
              id="signup-email"
              name="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value.toLowerCase())
              }
              placeholder="you@example.com"
              autoComplete="email"
              required
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="phone" className={labelClass}>
            Phone number
          </label>
          <div className={fieldClass}>
            <Phone size={16} className="shrink-0 text-slate-400" />
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(event) => {
                const digits = event.target.value
                  .replace(/\D/g, '')
                  .slice(0, 10)
                setPhone(digits)
              }}
              placeholder="10-digit phone number"
              autoComplete="tel"
              required
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="signup-password" className={labelClass}>
            Password
          </label>
          <div className={fieldClass}>
            <LockKeyhole size={16} className="shrink-0 text-slate-400" />
            <input
              id="signup-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              minLength={8}
              required
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="shrink-0 text-slate-500 hover:text-blue-600"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirm-password" className={labelClass}>
            Confirm password
          </label>
          <div className={fieldClass}>
            <LockKeyhole size={16} className="shrink-0 text-slate-400" />
            <input
              id="confirm-password"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              minLength={8}
              required
              className={inputClass}
            />
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50/90 px-3 py-2 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300"
          >
            {error}
          </p>
        )}

        {success && (
          <p
            role="status"
            className="rounded-lg bg-emerald-50/90 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
          >
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="group flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-blue-700 px-4 py-2 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          {submitting ? 'Creating account...' : 'Create account'}
          {!submitting && (
            <ArrowRight
              size={17}
              className="transition-transform group-hover:translate-x-1"
            />
          )}
        </button>

        <div className="pt-1 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-800 hover:text-blue-500 dark:text-blue-300"
          >
            <ArrowLeft size={14} />
            Back to sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}
