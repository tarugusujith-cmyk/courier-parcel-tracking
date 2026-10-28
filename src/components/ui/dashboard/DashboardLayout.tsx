import { useState, type ReactNode } from 'react'
import DashboardHeader from './DashboardHeader'
import DashboardSidebar from './DashboardSidebar'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  function handleSidebarToggle() {
    if (window.innerWidth < 1024) {
      setMobileSidebarOpen((previous) => !previous)
    } else {
      setSidebarCollapsed((previous) => !previous)
    }
  }

  function closeMobileSidebar() {
    setMobileSidebarOpen(false)
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Sidebar starts at the top-left edge */}
      <DashboardSidebar
        isOpen={mobileSidebarOpen}
        isCollapsed={sidebarCollapsed}
        onClose={closeMobileSidebar}
      />

      {/* Header and page content occupy the remaining space */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardHeader
          onMenuClick={handleSidebarToggle}
          sidebarCollapsed={sidebarCollapsed}
        />

        <main className="dashboard-main-scroll min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
