
import { useState, type SyntheticEvent } from 'react'
import { Link } from 'react-router-dom'

import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

import { ArrowLeft, Mail, Send } from 'lucide-react'
import AuthLayout from '../../components/ui/auth/AuthLayout'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(
  event: SyntheticEvent<HTMLFormElement>
) {
  event.preventDefault()
  setMessage('')
  setError('')

  const normalizedEmail = email.trim().toLowerCase()
  const emailPattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/

  if (!emailPattern.test(normalizedEmail)) {
    setError('Please enter a valid email address.')
    return
  }

  try {
    const response = await api.get('/users', {
      params: { email: normalizedEmail },
    })

    if (response.data.length === 0) {
      setError('No account was found with this email address.')
      return
    }

    navigate(
      `/reset-password?email=${encodeURIComponent(normalizedEmail)}`
    )
  } catch {
    setError(
      'Unable to connect to the server. Please try again.'
    )
  }
}
  return (
    <AuthLayout
      heading="Forgot password?"
      description="Enter your registered email address to get help recovering your account."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="forgot-email"
            className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-200"
          >
            Email address
          </label>

          <div className="flex items-center gap-3 rounded-xl border border-white/70 bg-white/75 px-4 transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 dark:border-white/10 dark:bg-slate-950/40">
            <Mail size={19} className="shrink-0 text-slate-400" />

            <input
              id="forgot-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value.toLowerCase())
                setMessage('')
                setError('')
              }}
              placeholder="you@example.com"
              className="min-w-0 flex-1 bg-transparent py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
              required
            />
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
          >
            {error}
          </p>
        )}

        {message && (
          <p
            role="status"
            className="rounded-xl border border-blue-200 bg-blue-50/90 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-200"
          >
            {message}
          </p>
        )}

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-700 px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <Send size={17} />
          Request password help
        </button>

        <div className="text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-800 transition hover:text-blue-500 dark:text-blue-300"
          >
            <ArrowLeft size={16} />
            Back to sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}
