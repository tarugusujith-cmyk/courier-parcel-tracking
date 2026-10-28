import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className="inline-flex h-10 w-10 items-center justify-center
        rounded-xl border border-slate-200 bg-white text-slate-700
        transition-colors hover:bg-slate-100
        focus-visible:outline-2 focus-visible:outline-offset-2
        focus-visible:outline-blue-600
        dark:border-slate-700 dark:bg-slate-900
        dark:text-slate-100 dark:hover:bg-slate-800"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
