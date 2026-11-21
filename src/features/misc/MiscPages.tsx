// Shared pages: Notifications, About, Not part of the prototype, Access denied, Not found.

import { Link } from 'react-router-dom'
import { Bell, Construction, Lock } from 'lucide-react'
import { useDemo, useMe } from '../../store/DemoStore'
import { Card, EmptyState, PageHeader } from '../../components/ui/Card'
import { Button, LinkButton } from '../../components/ui/Button'
import { fmtDateTime } from '../../lib/dates'
import { HOME } from '../../components/layout/nav'
import { ROLE_LABEL, type Role } from '../../store/types'

export function NotificationsPage() {
  const { state, mutate } = useDemo()
  const me = useMe()
  const mine = state.notifications.filter((n) => n.to === me.username)
  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Messages from PhishGuard about your reports, training, and security alerts."
        actions={
          <Button variant="secondary" onClick={() => mutate((s) => s.notifications.forEach((n) => n.to === me.username && (n.read = true)))}>
            Mark all read
          </Button>
        }
      />
      {mine.length === 0 ? (
        <EmptyState>You have no notifications.</EmptyState>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {mine.map((n) => (
            <li key={n.id} className={`flex items-start gap-3 px-5 py-4 ${n.read ? '' : 'bg-accent-50/40'}`}>
              <Bell className={`mt-0.5 h-4 w-4 shrink-0 ${n.read ? 'text-slate-400' : 'text-accent-700'}`} aria-hidden />
              <div className="flex-1">
                <div className={n.read ? 'text-slate-700' : 'font-medium text-slate-900'}>
                  {!n.read && <span className="sr-only">Unread: </span>}
                  {n.text}
                </div>
                <div className="text-xs text-slate-500">{fmtDateTime(n.at)}</div>
              </div>
              {n.link && (
                <Link
                  to={n.link}
                  className="text-sm text-accent-700 hover:underline"
                  onClick={() =>
                    mutate((s) => {
                      const x = s.notifications.find((y) => y.id === n.id)
                      if (x) x.read = true
                    })
                  }
                >
                  View
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

export function AboutPage() {
  const { me } = useDemo()
  return (
    <div className={me ? '' : 'mx-auto max-w-3xl px-4 py-10'}>
      <PageHeader title="About this prototype" back={me ? undefined : { to: '/login', label: 'Back to login' }} />
      <div className="space-y-5">
        <Card title="What this is">
          <p>
            PhishGuard is a cybersecurity compliance, education, and phishing defense platform designed by a CSIT 416 (IT Project Management) team at Montclair State University. This is the
            interactive, clickable prototype described in Section 5 of the team's Use Case Specification Document.
          </p>
          <p className="mt-3 font-medium">This is a non-functional prototype. All data is simulated and resets when the page is reloaded.</p>
          <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-slate-700">
            <li>No backend, database, real authentication, or email sending exists.</li>
            <li>Organizational email integration (required by UC15 to UC20) is simulated with seed data.</li>
            <li>Link, attachment, and sender verdicts come from simple deterministic mock rules.</li>
            <li>UC25, UC26, UC27, and UC28 are extrapolated pending the team's written specifications.</li>
            <li>Use the Demo Controls button (or Ctrl+Shift+D) to force slow, unavailable, and failure paths.</li>
          </ul>
        </Card>
        <Card title="Team">
          {/* Team member names removed for public sharing; add them back here if the team agrees. */}
          <p className="text-slate-700">Designed by a CSIT 416 project team.</p>
          <p className="mt-3 text-sm text-slate-500">CSIT 416, Montclair State University.</p>
        </Card>
      </div>
    </div>
  )
}

export function NotInPrototype() {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <Construction className="mx-auto mb-4 h-10 w-10 text-slate-400" aria-hidden />
      <h1 className="text-xl font-semibold">Not part of the prototype</h1>
      <p className="mt-2 text-slate-600">This destination exists in the full design but is not simulated in this prototype.</p>
      <LinkButton to="/" variant="secondary" className="mt-6">
        Back to dashboard
      </LinkButton>
    </div>
  )
}

export function AccessDenied({ allowed }: { allowed: Role[] }) {
  const { switchRole } = useDemo()
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <Lock className="mx-auto mb-4 h-10 w-10 text-red-600" aria-hidden />
      <h1 className="text-xl font-semibold text-red-700">Access Denied</h1>
      <p className="mt-2 text-slate-600">This page is available to: {allowed.map((r) => ROLE_LABEL[r]).join(', ')}.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {allowed.map((r) => (
          <Button key={r} variant="secondary" onClick={() => switchRole(r)}>
            Switch to {ROLE_LABEL[r]}
          </Button>
        ))}
      </div>
    </div>
  )
}

export function NotFound() {
  const { me } = useDemo()
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <LinkButton to={me ? HOME[me.role] : '/login'} variant="secondary" className="mt-6">
        Go home
      </LinkButton>
    </div>
  )
}
