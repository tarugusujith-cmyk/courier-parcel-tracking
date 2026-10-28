
import type { ReactNode } from 'react'
import { Package, ShieldCheck, Truck } from 'lucide-react'
import ThemeToggle from '../ThemeToggle'

interface AuthLayoutProps {
  children: ReactNode
  heading: string
  description: string
}

export default function AuthLayout({
  children,
  heading,
  description,
}: AuthLayoutProps) {
  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-white">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/images/delivery-truck.jfif')",
        }}
      />

      {/* Image overlay */}
      <div className="absolute inset-0 bg-slate-950/25" />

      {/* Decorative glow */}
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-sky-400/30 blur-3xl" />
      <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-blue-600/30 blur-3xl" />

      {/* Top navigation */}
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-4 sm:px-8 lg:px-12">
        <a href="/login" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/30">
            <Package size={25} />
          </span>

          <span>
            <span className="block text-lg font-extrabold tracking-tight text-white sm:text-xl">
              QuickShip
            </span>
            <span className="block text-xs text-white/75">
              Courier &amp; Parcel Tracking
            </span>
          </span>
        </a>

        <ThemeToggle />
      </header>

      {/* Main content */}
     <section className="relative z-10 grid h-full min-h-0 grid-cols-1 items-center overflow-hidden px-3 pb-2 pt-16 sm:px-6 sm:pt-14 lg:grid-cols-2 lg:gap-6 lg:px-10 lg:pt-14 xl:gap-10 xl:px-12">
        {/* Branding panel: hidden on small screens */}
        <div className="hidden max-w-xl text-white lg:block">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm backdrop-blur-xl">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Fast, safe and reliable deliveries
          </div>

        <h1 className="text-4xl font-black leading-tight xl:text-6xl">
  Every parcel.
  <br />
  Every journey.
  <br />
  <span className="text-sky-300">Delivered with care.</span>
</h1>

          <p className="mt-5 max-w-md text-base leading-7 text-white/80">
            Manage shipments, follow deliveries in real time, and keep every
            package moving with QuickShip.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-lg">
              <Truck size={21} className="text-sky-300" />
              <span className="text-sm">Live tracking</span>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-lg">
              <ShieldCheck size={21} className="text-sky-300" />
              <span className="text-sm">Secure delivery</span>
            </div>
          </div>
        </div>

        {/* Glass form card */}
        <div className="mx-auto flex w-full max-w-md items-center lg:justify-self-end">
       <div className="w-full rounded-2xl border border-white/40 bg-white/30 p-3 shadow-2xl shadow-slate-950/20 backdrop-blur-xl sm:p-4 lg:p-4 xl:p-5 dark:border-white/15 dark:bg-slate-900/20">
            <div className="mb-2">
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                {heading}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-900 dark:text-slate-300">
                {description}
              </p>
            </div>

            {children}

            <p className="mt-3 text-center text-xs text-slate-900 dark:text-slate-400">
              © {new Date().getFullYear()} QuickShip. All rights reserved.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
