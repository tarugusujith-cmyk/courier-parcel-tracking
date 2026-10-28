
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
  X,
} from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'

interface DashboardHeaderProps {
  onMenuClick: () => void
  sidebarCollapsed: boolean
}

export default function DashboardHeader({
  onMenuClick,
  sidebarCollapsed,
}: DashboardHeaderProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [darkMode, setDarkMode] = useState(() =>
    document.documentElement.classList.contains('dark'),
  )
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  // Close dropdowns when the user presses Escape.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setNotificationOpen(false)
        setProfileOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  function handleLogout() {
    setProfileOpen(false)
    setNotificationOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const query = search.trim()
    if (!query) return

    const role = String(user?.role ?? 'customer')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_')

    const basePath =
      role === 'admin'
        ? '/admin/shipments'
        : role === 'branch_staff'
          ? '/branch/shipments'
          : role === 'delivery_agent'
            ? '/agent/shipments'
            : '/customer/shipments'

    setProfileOpen(false)
    setNotificationOpen(false)

    navigate(`${basePath}?search=${encodeURIComponent(query)}`)
  }

  const userName = user?.name ?? 'User'
  const userInitial = userName.charAt(0).toUpperCase()

  const roleName = String(user?.role ?? 'user')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())

  return (
    <header className="relative z-30 flex h-[72px] w-full shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900 sm:gap-3 sm:px-5 lg:px-6">
      {/* Sidebar toggle */}
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Toggle sidebar"
        aria-expanded={!sidebarCollapsed}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <Menu size={21} />
      </button>

      {/* Search */}
      <form
        onSubmit={handleSearchSubmit}
        className="min-w-0 flex-1"
        role="search"
      >
        <div className="relative max-w-xl">
          <Search
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search shipments..."
            aria-label="Search shipments and tracking IDs"
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-blue-400 sm:h-11 sm:pr-4"
          />
        </div>
      </form>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        {/* Dark / light mode */}
        <button
          type="button"
          onClick={() => setDarkMode((previous) => !previous)}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 sm:h-10 sm:w-10"
        >
          {darkMode ? <Sun size={19} /> : <Moon size={19} />}
        </button>

        {/* Responsive notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setNotificationOpen((previous) => !previous)
              setProfileOpen(false)
            }}
            aria-label="Notifications"
            aria-expanded={notificationOpen}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 sm:h-10 sm:w-10"
          >
            <Bell size={19} />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
          </button>

          {notificationOpen && (
            <>
              {/* Mobile backdrop */}
              <button
                type="button"
                aria-label="Close notifications"
                onClick={() => setNotificationOpen(false)}
                className="fixed inset-0 z-[90] cursor-default bg-black/30 sm:bg-transparent"
              />

              {/* Popup */}
              <section
                role="dialog"
                aria-label="Notifications"
                className="fixed left-1/2 top-[80px] z-[100] w-[calc(100vw-24px)] max-w-sm -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-96 sm:translate-x-0"
              >
                {/* Popup header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 dark:border-slate-800 sm:px-5">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Notifications
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Stay updated on your shipments
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setNotificationOpen(false)}
                    aria-label="Close notification popup"
                    className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Notification content */}
                <div className="max-h-[min(60vh,420px)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="flex flex-col items-center px-5 py-10 text-center sm:py-12">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                      <Bell size={25} />
                    </div>

                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      You&apos;re all caught up!
                    </p>

                    <p className="mt-1.5 max-w-[240px] text-xs leading-5 text-slate-500 dark:text-slate-400">
                      You have no new notifications. Shipment updates will
                      appear here when available.
                    </p>
                  </div>
                </div>

                {/* Popup footer */}
                <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
                  <button
                    type="button"
                    onClick={() => setNotificationOpen(false)}
                    className="w-full rounded-xl bg-slate-50 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    Close notifications
                  </button>
                </div>
              </section>
            </>
          )}
        </div>

        {/* User profile */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setProfileOpen((previous) => !previous)
              setNotificationOpen(false)
            }}
            aria-label="Open user menu"
            aria-expanded={profileOpen}
            className="flex items-center gap-1.5 rounded-xl p-1 transition hover:bg-slate-100 dark:hover:bg-slate-800 sm:gap-3 sm:px-2 sm:py-1.5"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {userInitial}
            </span>

            <span className="hidden min-w-0 text-left sm:block">
              <span className="block max-w-32 truncate text-sm font-semibold text-slate-900 dark:text-white">
                {userName}
              </span>

              <span className="block text-xs text-slate-500 dark:text-slate-400">
                {roleName}
              </span>
            </span>

            <ChevronDown
              size={16}
              className="hidden text-slate-400 sm:block"
            />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-12 z-[110] w-48 max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {userName}
                </p>

                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {user?.email ?? ''}
                </p>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
