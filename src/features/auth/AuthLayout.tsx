import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../../components/layout/AppShell'
import { DemoControls } from '../../components/layout/DemoControls'
import { Toasts } from '../../components/ui/Banner'

export function AuthLayout({ title, subtitle, children, uc }: { title: string; subtitle?: string; children: ReactNode; uc?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-accent-50 to-slate-50 px-4 py-10">
      <div className="mb-6">
        <Logo to="/login" />
      </div>
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          {title}
          {uc && <span className="ml-3 align-middle rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">{uc}</span>}
        </h1>
        {subtitle && <p className="mt-1 text-slate-600">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      <p className="mt-6 text-center text-xs text-slate-500">
        Non-functional prototype using simulated data. <Link to="/about" className="underline">About this prototype</Link>
      </p>
      <DemoControls />
      <Toasts />
    </div>
  )
}
