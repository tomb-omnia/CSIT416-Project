// UC12 Complete Learning Modules (list) and UC33 entry point (completed GREEN, incomplete RED).

import { Link } from 'react-router-dom'
import { Award, CheckCircle2, Circle, Inbox } from 'lucide-react'
import { useDemo, useMe } from '../../store/DemoStore'
import { Card, EmptyState, PageHeader } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { LinkButton } from '../../components/ui/Button'
import { ProgressBar } from '../../components/ui/Wizard'
import { fmtDate, isPastDeadline } from '../../lib/dates'

export default function MyTrainingPage() {
  const { state } = useDemo()
  const me = useMe()
  const mine = state.assignments.filter((a) => a.username === me.username)
  const order = { 'In Progress': 0, 'Not Started': 1, Completed: 2 }
  mine.sort((a, b) => order[a.status] - order[b.status])
  return (
    <>
      <PageHeader title="My Training" uc="UC12, UC33" subtitle="Your assigned cybersecurity training modules." actions={<LinkButton to="/my-certificates" variant="secondary"><Award className="h-4 w-4" /> My Certificates</LinkButton>} />
      {mine.length === 0 ? (
        <EmptyState>No Completed Training Modules Available. You have no assigned training yet.</EmptyState>
      ) : (
        <div className="space-y-3">
          {mine.map((a) => {
            const m = state.modules.find((x) => x.id === a.moduleId)
            if (!m) return null
            const done = a.status === 'Completed'
            const overdue = !done && isPastDeadline(a.deadline)
            const cert = state.certificates.find((c) => c.assignmentId === a.id)
            return (
              <div key={a.id} className={`flex flex-wrap items-center gap-4 rounded-lg border-l-4 border-y border-r bg-white p-4 shadow-sm ${done ? 'border-l-green-600' : 'border-l-red-600'} border-slate-200`}>
                {done ? <CheckCircle2 className="h-6 w-6 text-green-600" aria-label="Completed" /> : <Circle className="h-6 w-6 text-red-600" aria-label="Incomplete" />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/my-training/${m.id}`} className="font-semibold text-slate-900 hover:text-accent-700 hover:underline">
                      {m.title}
                    </Link>
                    <StatusBadge status={a.status} />
                    {overdue && <StatusBadge status="Overdue" />}
                    {cert && <StatusBadge status="Issued" />}
                  </div>
                  <div className="mt-0.5 text-sm text-slate-600">
                    {m.kind === 'remedial' ? 'Remedial' : m.kind === 'awareness' ? 'Security awareness' : 'General'} · {m.estMinutes} min ·{' '}
                    {done ? `Completed ${fmtDate(a.completedAt)}` : a.deadline ? `Due ${fmtDate(a.deadline)}` : 'No deadline'}
                  </div>
                  {!done && (
                    <div className="mt-2 max-w-xs">
                      <ProgressBar value={(a.sectionsDone / m.sections.length) * 100} />
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {done ? (
                    <>
                      <LinkButton to={`/my-training/${m.id}`} variant="secondary">
                        Review
                      </LinkButton>
                      <LinkButton to={`/my-training/${m.id}/certificate`}>{cert ? 'View Certificate' : 'Generate Certificate'}</LinkButton>
                    </>
                  ) : (
                    <LinkButton to={`/my-training/${m.id}`}>{a.status === 'Not Started' ? 'Start' : 'Continue'}</LinkButton>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      <Card className="mt-8" title="Practice">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Inbox className="h-6 w-6 text-accent-700" aria-hidden />
            <div>
              <div className="font-semibold">Inbox Analysis Simulation</div>
              <div className="text-sm text-slate-600">Sort a simulated inbox into phishing and legitimate emails.</div>
            </div>
          </div>
          <LinkButton to="/my-training/inbox-sim">Open simulation</LinkButton>
        </div>
      </Card>
    </>
  )
}
