// User Dashboard (General User landing page).

import { Link } from 'react-router-dom'
import { HeartPulse, Link2, Mail, Paperclip, Phone, UserCheck, Megaphone } from 'lucide-react'
import { useDemo, useMe } from '../../store/DemoStore'
import { Card, PageHeader, TileGrid } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Banner } from '../../components/ui/Banner'
import { fmtDate, fmtDateTime, isPastDeadline } from '../../lib/dates'
import { LinkButton } from '../../components/ui/Button'

export function activeBannerBulletins(bulletins: ReturnType<typeof useDemo>['state']['bulletins']) {
  return bulletins.filter((b) => b.banner && !b.retired && new Date(b.expiresAt).getTime() > Date.now())
}

export default function UserDashboard() {
  const { state } = useDemo()
  const me = useMe()
  const banners = activeBannerBulletins(state.bulletins)
  const assigned = state.assignments.filter((a) => a.username === me.username && a.status !== 'Completed')
  const notes = state.notifications.filter((n) => n.to === me.username).slice(0, 4)
  const pendingAck = state.advisories.filter((a) => a.status === 'Published' && a.requireAck && !a.acks.includes(me.username))

  return (
    <>
      {banners.map((b) => (
        <Banner key={b.id} tone="warning" className="mb-4" title={`Active bulletin: ${b.headline}`} action={<Link to={`/bulletins#${b.id}`} className="whitespace-nowrap text-sm font-medium underline">Read bulletin</Link>}>
          {b.lookFor}
        </Banner>
      ))}
      {pendingAck.map((a) => (
        <Banner key={a.id} tone="info" className="mb-4" title={`Advisory requires your acknowledgment: ${a.title}`} action={<Link to={`/advisories/${a.id}`} className="whitespace-nowrap text-sm font-medium underline">Open advisory</Link>} />
      ))}
      <PageHeader title={`Welcome back, ${me.name.split(' ')[0]}`} subtitle="Your training, reports, and quick security tools." />

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Quick actions</h2>
      <TileGrid
        tiles={[
          { to: '/report/email', label: 'Report Suspicious Email', description: 'Send a suspicious email to the security team.', icon: Mail },
          { to: '/report/phone-text', label: 'Report Phone/Text Incident', description: 'Report a scam call or text message.', icon: Phone },
          { to: '/scan/link', label: 'Scan Link', description: 'Check a link before you open it.', icon: Link2 },
          { to: '/scan/attachment', label: 'Scan Attachment', description: 'Check a file before you open it.', icon: Paperclip },
          { to: '/verify-sender', label: 'Verify Email Sender', description: 'Check whether a sender is legitimate.', icon: UserCheck },
          { to: '/checkup', label: 'Personal Security Checkup', description: 'Score your security habits.', icon: HeartPulse },
        ]}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Assigned training" actions={<LinkButton to="/my-training" variant="ghost">View all</LinkButton>}>
          {assigned.length === 0 ? (
            <p className="text-slate-500">You have no outstanding training. Nice work.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {assigned.map((a) => {
                const m = state.modules.find((x) => x.id === a.moduleId)
                const overdue = isPastDeadline(a.deadline)
                return (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <Link to={`/my-training/${a.moduleId}`} className="font-medium text-accent-700 hover:underline">
                        {m?.title}
                      </Link>
                      <div className={`text-sm ${overdue ? 'font-medium text-red-700' : 'text-slate-500'}`}>
                        {a.deadline ? `${overdue ? 'Overdue, was due' : 'Due'} ${fmtDate(a.deadline)}` : 'No deadline'}
                      </div>
                    </div>
                    <StatusBadge status={a.status} />
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
        <Card title="Recent notifications" actions={<LinkButton to="/notifications" variant="ghost">All</LinkButton>}>
          {notes.length === 0 ? (
            <p className="text-slate-500">No notifications.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {notes.map((n) => (
                <li key={n.id}>
                  <div className={n.read ? 'text-slate-600' : 'font-medium'}>{n.text}</div>
                  <div className="text-xs text-slate-500">{fmtDateTime(n.at)}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <div className="mt-6 text-sm text-slate-600">
        <Megaphone className="mr-1 inline h-4 w-4" aria-hidden /> See all <Link to="/bulletins" className="text-accent-700 underline">bulletins</Link> and{' '}
        <Link to="/advisories" className="text-accent-700 underline">advisories</Link>.
      </div>
    </>
  )
}
