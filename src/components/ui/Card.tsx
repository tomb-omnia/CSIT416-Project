import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, type LucideIcon } from 'lucide-react'

export function Card({ children, className = '', title, actions }: { children: ReactNode; className?: string; title?: ReactNode; actions?: ReactNode }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  )
}

export function PageHeader({ title, subtitle, back, actions, uc }: { title: string; subtitle?: ReactNode; back?: { to: string; label: string }; actions?: ReactNode; uc?: string }) {
  return (
    <div className="mb-6">
      {back && (
        <Link to={back.to} className="mb-2 inline-flex items-center gap-1 text-sm text-accent-700 hover:underline">
          <ChevronLeft className="h-4 w-4" aria-hidden /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {title}
            {uc && <span className="ml-3 align-middle rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">{uc}</span>}
          </h1>
          {subtitle && <p className="mt-1 text-slate-600">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}

export interface Tile {
  to: string
  label: string
  description: string
  icon: LucideIcon
  badge?: number
}
export function TileGrid({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {tiles.map((t) => (
        <Link key={t.to + t.label} to={t.to} className="group relative flex gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-accent-500 hover:shadow">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-accent-50 text-accent-700">
            <t.icon className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <div className="font-semibold text-slate-900 group-hover:text-accent-700">{t.label}</div>
            <div className="mt-0.5 text-sm text-slate-600">{t.description}</div>
          </div>
          {!!t.badge && <span className="absolute right-3 top-3 rounded-full bg-accent-700 px-2 py-0.5 text-xs font-semibold text-white">{t.badge}</span>}
        </Link>
      ))}
    </div>
  )
}

export function EmptyState({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'error' }) {
  return <div className={`rounded-md border border-dashed px-4 py-8 text-center ${tone === 'error' ? 'border-red-300 text-red-700' : 'border-slate-300 text-slate-500'}`}>{children}</div>
}

export function DetailList({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
      {items.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="font-medium text-slate-500">{k}</dt>
          <dd className="text-slate-900">{v}</dd>
        </div>
      ))}
    </dl>
  )
}
