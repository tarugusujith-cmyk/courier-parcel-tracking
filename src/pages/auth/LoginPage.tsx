
import { useState, type SyntheticEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from 'lucide-react'
import { useAuth, getDashboardPath } from '../../contexts/AuthContext'
import AuthLayout from '../../components/ui/auth/AuthLayout'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) {
    return <Navigate to={getDashboardPath(user.role)} replace />
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const normalizedEmail = email.trim().toLowerCase()

    const emailPattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/

    if (normalizedEmail !== 'abc@123' && !emailPattern.test(normalizedEmail)) {
      setError('Please enter a valid email address.')
      return
    }

    if (password.length < 8) {
      setError('Password must contain at least 8 characters.')
      return
    }

    setSubmitting(true)

    try {
      await login(normalizedEmail, password)

      const session = localStorage.getItem('quickship-user')

      if (!session) {
        throw new Error('Unable to create your session. Please try again.')
      }

      const loggedInUser = JSON.parse(session)
      navigate(getDashboardPath(loggedInUser.role), { replace: true })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to sign in. Please check your credentials.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      heading="Welcome back"
      description="Sign in to manage your shipments and keep every delivery moving."
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-200"
          >
            Email address
          </label>

          <div className="flex items-center gap-3 rounded-xl border border-white/70 bg-white/75 px-4 transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 dark:border-white/10 dark:bg-slate-950/40">
            <Mail size={19} className="shrink-0 text-slate-400" />
            <input
              id="email"
              name="email"
              type="text"
              autoComplete="username"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value.toLowerCase())
              }
              placeholder="you@example.com"
              className="min-w-0 flex-1 bg-transparent py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
              required
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label
              htmlFor="password"
              className="text-sm font-semibold text-slate-900 dark:text-slate-200"
            >
              Password
            </label>

            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-blue-800 transition hover:text-blue-500 dark:text-blue-300"
            >
              Forgot password?
            </Link>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-white/70 bg-white/75 px-4 transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 dark:border-white/10 dark:bg-slate-950/40">
            <LockKeyhole size={19} className="shrink-0 text-slate-400" />

            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="min-w-0 flex-1 bg-transparent py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
              required
            />

            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="shrink-0 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-900 dark:text-slate-300">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-blue-600"
          />
          Remember me
        </label>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Signing in...' : 'Sign in securely'}
          {!submitting && (
            <ArrowRight
              size={18}
              className="transition-transform group-hover:translate-x-1"
            />
          )}
        </button>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-900 dark:text-slate-300">
          <ShieldCheck
            size={16}
            className="text-emerald-900 dark:text-emerald-400"
          />
          Secure access to your QuickShip account
        </div>
      </form>

      <div className="mt-4 border-t border-slate-200/70 pt-5 text-center dark:border-white/10">
        <p className="text-sm text-slate-900 dark:text-slate-300">
          New to QuickShip?{' '}
          <Link
            to="/signup"
            className="font-bold text-blue-800 hover:text-blue-500 dark:text-blue-300"
          >
            Create an account
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
