
import { useState, type SyntheticEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react'
import AuthLayout from '../../components/ui/auth/AuthLayout'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setError('')

    if (password.length < 8) {
      setError('Password must contain at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    // Demo only: this does not update the database.
    setMessage(
      'Password validation successful. A secure password reset service is required to save your new password.',
    )
  }

  const inputClass =
    'min-w-0 w-full bg-transparent py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white'

  const fieldClass =
    'flex items-center gap-2.5 rounded-lg border border-white/70 bg-white/75 px-3 transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 dark:border-white/10 dark:bg-slate-950/40'

  return (
    <AuthLayout
      heading="Reset your password"
      description="Choose a strong new password to keep your QuickShip account secure."
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label
            htmlFor="new-password"
            className="mb-1 block text-sm font-semibold text-slate-900 dark:text-slate-200"
          >
            New password
          </label>

          <div className={fieldClass}>
            <LockKeyhole size={17} className="shrink-0 text-slate-400" />

            <input
              id="new-password"
              name="newPassword"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setError('')
                setMessage('')
              }}
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
              className="shrink-0 text-slate-500 transition hover:text-blue-600"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="confirm-new-password"
            className="mb-1 block text-sm font-semibold text-slate-900 dark:text-slate-200"
          >
            Confirm new password
          </label>

          <div className={fieldClass}>
            <LockKeyhole size={17} className="shrink-0 text-slate-400" />

            <input
              id="confirm-new-password"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value)
                setError('')
                setMessage('')
              }}
              placeholder="Re-enter your new password"
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
            className="rounded-lg border border-red-200 bg-red-50/90 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
          >
            {error}
          </p>
        )}

        {message && (
          <p
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
          >
            {message}
          </p>
        )}

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <ShieldCheck size={17} />
          Validate new password
        </button>

        <div className="pt-1 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-800 transition hover:text-blue-500 dark:text-blue-300"
          >
            <ArrowLeft size={15} />
            Back to sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}
