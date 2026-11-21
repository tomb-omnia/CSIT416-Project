// AppShell: TopBar (logo, RoleSwitcher, NotificationBell, user menu) + role-filtered Sidebar.

import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Bell, LogOut, Menu, ShieldCheck, X } from 'lucide-react'
import { useDemo } from '../../store/DemoStore'
import { ROLE_LABEL, type Role } from '../../store/types'
import { HOME, NAV } from './nav'
import { fmtDateTime } from '../../lib/dates'
import { DemoControls } from './DemoControls'
import { Toasts } from '../ui/Banner'

export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2 font-semibold text-slate-900">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-700 text-white">
        <ShieldCheck className="h-5 w-5" aria-hidden />
      </span>
      <span className="text-lg">PhishGuard</span>
    </Link>
  )
}

function RoleSwitcher() {
  const { me, switchRole } = useDemo()
  const nav = useNavigate()
  if (!me) return null
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden text-slate-500 md:inline">Viewing as</span>
      <select
        aria-label="Switch demo role"
        value={me.role}
        onChange={(e) => {
          const r = e.target.value as Role
          switchRole(r)
          nav(HOME[r])
        }}
        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm font-medium"
      >
        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r]}
          </option>
        ))}
      </select>
    </label>
  )
}

function NotificationBell() {
  const { me, state, mutate } = useDemo()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const nav = useNavigate()
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  if (!me) return null
  const mine = state.notifications.filter((n) => n.to === me.username)
  const unread = mine.filter((n) => !n.read).length
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="relative rounded-md p-2 hover:bg-slate-100" aria-label={`Notifications, ${unread} unread`} aria-expanded={open}>
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-96 rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <span className="font-semibold">Notifications</span>
            <button className="text-xs text-accent-700 hover:underline" onClick={() => mutate((s) => s.notifications.forEach((n) => n.to === me.username && (n.read = true)))}>
              Mark all read
            </button>
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {mine.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-500">No notifications</li>}
            {mine.slice(0, 6).map((n) => (
              <li key={n.id}>
                <button
                  className={`block w-full px-4 py-3 text-left text-sm hover:bg-slate-50 ${n.read ? 'text-slate-600' : 'font-medium text-slate-900'}`}
                  onClick={() => {
                    mutate((s) => {
                      const x = s.notifications.find((y) => y.id === n.id)
                      if (x) x.read = true
                    })
                    setOpen(false)
                    if (n.link) nav(n.link)
                  }}
                >
                  {!n.read && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-accent-600" aria-label="unread" />}
                  {n.text}
                  <div className="mt-0.5 text-xs font-normal text-slate-500">{fmtDateTime(n.at)}</div>
                </button>
              </li>
            ))}
          </ul>
          <Link to="/notifications" onClick={() => setOpen(false)} className="block border-t px-4 py-2 text-center text-sm text-accent-700 hover:bg-slate-50">
            View all notifications
          </Link>
        </div>
      )}
    </div>
  )
}

function Sidebar({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="space-y-5 p-4">
      {NAV[role].map((sec) => (
        <div key={sec.title}>
          <div className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{sec.title}</div>
          <ul className="space-y-0.5">
            {sec.items.map((it) => (
              <li key={it.to}>
                <NavLink
                  to={it.to}
                  end={it.end}
                  onClick={onNavigate}
                  className={({ isActive }) => `flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm ${isActive ? 'bg-accent-50 font-semibold text-accent-800' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                  <it.icon className="h-4 w-4 shrink-0" aria-hidden />
                  {it.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

export function AppShell() {
  const { me, logout } = useDemo()
  const nav = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  if (!me) return null
  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-slate-200 bg-white px-4">
        <button className="rounded p-1.5 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen((o) => !o)} aria-label="Toggle menu">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <Logo to={HOME[me.role]} />
        <span className="hidden rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-900 sm:inline">Prototype, simulated data</span>
        <div className="ml-auto flex items-center gap-2">
          <RoleSwitcher />
          <NotificationBell />
          <div className="hidden text-right text-sm leading-tight md:block">
            <div className="font-medium">{me.name}</div>
            <div className="text-xs text-slate-500">
              {me.username} · {ROLE_LABEL[me.role]}
            </div>
          </div>
          <button
            onClick={() => {
              logout()
              nav('/login')
            }}
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </header>
      <div className="flex">
        <aside className={`no-print fixed inset-y-14 left-0 z-20 w-64 overflow-y-auto border-r border-slate-200 bg-white lg:sticky lg:top-14 lg:block lg:h-[calc(100vh-3.5rem)] ${mobileOpen ? 'block' : 'hidden'}`}>
          <Sidebar role={me.role} onNavigate={() => setMobileOpen(false)} />
        </aside>
        <main className="min-w-0 flex-1 px-6 py-8 lg:px-10">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
      <DemoControls />
      <Toasts />
    </div>
  )
}
