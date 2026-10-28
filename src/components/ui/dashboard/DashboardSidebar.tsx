import {
  BarChart3,
  Box,
  Building2,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  MapPin,
  Package,
  Settings,
  Tags,
  Truck,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'

interface DashboardSidebarProps {
  isOpen: boolean
  isCollapsed: boolean
  onClose: () => void
}

interface NavigationItem {
  label: string
  path: string
  icon: LucideIcon
}

const navigationByRole: Record<string, NavigationItem[]> = {
  admin: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Shipments', path: '/admin/shipments', icon: Package },
    { label: 'Assignments', path: '/admin/assignments', icon: ClipboardList },
    { label: 'Branches', path: '/admin/branches', icon: Building2 },
    { label: 'Delivery Agents', path: '/admin/agents', icon: Truck },
    { label: 'Customers', path: '/admin/customers', icon: Users },
    { label: 'Pricing', path: '/admin/pricing', icon: Tags },
    { label: 'Tracking', path: '/admin/tracking', icon: MapPin },
    { label: 'Reports', path: '/admin/reports', icon: BarChart3 },
    { label: 'Payments', path: '/admin/payments', icon: CreditCard },
    { label: 'Settings', path: '/admin/settings', icon: Settings },
  ],

  branch_staff: [
    { label: 'Dashboard', path: '/branch/dashboard', icon: LayoutDashboard },
    { label: 'Shipments', path: '/branch/shipments', icon: Package },
    { label: 'Assignments', path: '/branch/assignments', icon: ClipboardList },
    { label: 'Branches', path: '/branch/branches', icon: Building2 },
    { label: 'Delivery Agents', path: '/branch/agents', icon: Truck },
    { label: 'Tracking', path: '/branch/tracking', icon: MapPin },
  ],

  delivery_agent: [
    { label: 'Dashboard', path: '/agent/dashboard', icon: LayoutDashboard },
    { label: 'My Shipments', path: '/agent/shipments', icon: Package },
    { label: 'My Deliveries', path: '/agent/deliveries', icon: Truck },
    { label: 'Tracking', path: '/agent/tracking', icon: MapPin },
  ],

  customer: [
    { label: 'Dashboard', path: '/customer/dashboard', icon: LayoutDashboard },
    {
      label: 'Create Shipment',
      path: '/customer/create-shipment',
      icon: Package,
    },
    { label: 'My Shipments', path: '/customer/shipments', icon: FileText },
    { label: 'Track Parcel', path: '/customer/track', icon: MapPin },
    { label: 'Payments', path: '/customer/payments', icon: CreditCard },
  ],
}

function normalizeRole(role: unknown): string {
  return String(role ?? 'customer')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

export default function DashboardSidebar({
  isOpen,
  isCollapsed,
  onClose,
}: DashboardSidebarProps) {
  const { user } = useAuth()

  const role = normalizeRole(user?.role)
  const navigation = navigationByRole[role] ?? navigationByRole.customer

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={onClose}
          className="fixed inset-0 z-20 bg-slate-950/50 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        aria-label="Main navigation"
        className={[
          'fixed inset-y-0 left-0 z-30 m-0 flex flex-col',
          'border-r border-slate-200 bg-white text-slate-700',
          'transition-all duration-300',
          'dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200',
          'lg:relative lg:inset-y-auto lg:left-auto lg:h-full lg:shrink-0 lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          isCollapsed ? 'w-20' : 'w-64',
        ].join(' ')}
      >
        {/* QuickShip branding */}
        <div
          className={[
            'flex h-[72px] shrink-0 items-center gap-3',
            'border-b border-slate-200 px-4 dark:border-slate-800',
            isCollapsed ? 'justify-center px-2' : '',
          ].join(' ')}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
            <Box size={25} strokeWidth={2.2} />
          </span>

          {!isCollapsed && (
            <div className="min-w-0">
              <p className="truncate text-lg font-extrabold tracking-tight text-slate-950 dark:text-white">
                QuickShip
              </p>
              <p className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-400">
                Courier &amp; Parcel Tracking
              </p>
            </div>
          )}
        </div>

        {/* Role-based navigation */}
        <nav
          aria-label="Dashboard navigation"
          className="sidebar-no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-5"
        >
          {!isCollapsed && (
            <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Menu
            </p>
          )}

          <div className="space-y-1.5">
            {navigation.map(({ label, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                onClick={onClose}
                title={isCollapsed ? label : undefined}
                className={({ isActive }) =>
                  [
                    'group flex items-center gap-3 rounded-xl px-3 py-3',
                    'text-sm font-semibold transition-colors duration-200',
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 dark:bg-indigo-600'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
                    isCollapsed ? 'justify-center px-0' : '',
                  ].join(' ')
                }
              >
                <Icon size={20} strokeWidth={1.9} className="shrink-0" />

                {!isCollapsed && <span>{label}</span>}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Sidebar footer */}
        <footer className="shrink-0 border-t border-slate-200 px-3 py-3 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {!isCollapsed && `QuickShip © ${new Date().getFullYear()}`}
          {isCollapsed && '©'}
        </footer>
      </aside>
    </>
  )
}
