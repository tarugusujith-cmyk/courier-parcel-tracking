import { useState, type SyntheticEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  LockKeyhole,
  Eye,
  EyeOff,
  LogOut,
  ShieldCheck,
  Truck,
} from 'lucide-react'
import { useAuth, getDashboardPath } from '../../contexts/AuthContext'
import AuthLayout from '../../components/ui/auth/AuthLayout'

export default function LockScreenPage() {
  const { user, login, logout } = useAuth()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleUnlock(
    event: SyntheticEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setError('')

    if (!user?.email) {
      setError('Your session has expired. Please log in again.')
      return
    }

    if (!password) {
      setError('Please enter your password.')
      return
    }

    setLoading(true)

    try {
      await login(user.email, password)

      navigate(getDashboardPath(user.role), {
        replace: true,
      })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to unlock your screen. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  if (!user) {
    return (
      <AuthLayout
        heading="Session expired"
        description="Please log in to access your account."
      >
        <Link
          to="/login"
          className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          Go to Login
        </Link>
      </AuthLayout>
    )
  }

  const displayName = user.name || user.email.split('@')[0]

  return (
    <AuthLayout
      heading="Welcome back!"
      description="Your account is locked. Enter your password to continue."
    >
      <div className="mb-2 flex flex-col items-center text-center">
        <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-3xl font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
          {displayName.charAt(0).toUpperCase()}
        </div>

        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {displayName}
        </h2>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {user.email}
        </p>

        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          <LockKeyhole size={14} />
          Screen Locked
        </div>
      </div>

      <form onSubmit={handleUnlock} className="space-y-3">
        <div>
          <label
            htmlFor="lock-password"
            className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Password
          </label>

          <div className="relative">
            <LockKeyhole
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              id="lock-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-12 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              required
            />

            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ShieldCheck size={18} />
          {loading ? 'Unlocking...' : 'Unlock Screen'}
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <LogOut size={17} />
          Sign in with another account
        </button>
      </form>

     <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Truck size={15} />
        Courier & Parcel Tracking System
      </div>
    </AuthLayout>
  )
}
