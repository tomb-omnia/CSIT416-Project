// UC22 Assign Remedial Training and UC23 Assign Security Awareness Training (shared flow).

import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Clock } from 'lucide-react'
import { useDemo, useMe, pushAudit, pushNotification } from '../../store/DemoStore'
import { Card, PageHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Banner } from '../../components/ui/Banner'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Steps } from '../../components/ui/Wizard'
import { PlainInput, TextField } from '../../components/ui/RequirementField'
import { MessageDialog } from '../../components/ui/Dialog'
import * as V from '../../lib/validators'
import { assignmentId } from '../../lib/ids'
import { fmtDate, nowIso, toDateInput } from '../../lib/dates'
import type { ModuleKind } from '../../store/types'

const COPY: Record<'remedial' | 'awareness', { title: string; uc: string; success: string }> = {
  remedial: { title: 'Assign Remedial Training', uc: 'UC22', success: 'Remedial Training Successfully Assigned.' },
  // ASSUMPTION: UC23 gives no success text; mirror UC22.
  awareness: { title: 'Assign Security Awareness Training', uc: 'UC23', success: 'Security Awareness Training Successfully Assigned.' },
}

export default function TargetedAssignPage({ kind }: { kind: Extract<ModuleKind, 'remedial' | 'awareness'> }) {
  const { state, mutate, simulate } = useDemo()
  const me = useMe()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const copy = COPY[kind]
  const pre = (params.get('users') ?? '').split(',').filter((u) => state.users.some((x) => x.username === u))
  const [users, setUsers] = useState<string[]>(pre)
  const [focus, setFocus] = useState<string | null>(pre[0] ?? null)
  const [moduleId, setModuleId] = useState('')
  const [deadline, setDeadline] = useState('')
  const [step, setStep] = useState(0)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [dialog, setDialog] = useState<string | null>(null)
  const [done, setDone] = useState<{ count: number; notified: boolean } | null>(null)
  const [q, setQ] = useState('')

  const modules = state.modules.filter((m) => m.kind === kind && m.available)
  const general = state.users.filter((u) => u.role === 'general')
  const lastTest = (u: string) => {
    const t = state.tests.find((x) => x.status === 'Sent' && x.results.some((r) => r.username === u))
    return t?.results.find((r) => r.username === u)
  }
  const inactive = users.filter((u) => state.users.find((x) => x.username === u)?.status !== 'Active')
  const already = users.filter((u) => !inactive.includes(u) && state.assignments.some((a) => a.username === u && a.moduleId === moduleId && a.status !== 'Completed'))
  const eligible = users.filter((u) => !inactive.includes(u) && !already.includes(u))
  const mod = state.modules.find((m) => m.id === moduleId)
  const deadlineErr = V.futureDeadline(deadline, false)

  const next = () => {
    if (step === 0 && users.length === 0) return setErr('Select at least one user before continuing.')
    if (step === 1 && !moduleId) return setErr('Select a training module before continuing.')
    if (step === 2 && deadlineErr) return setErr(deadlineErr)
    setErr(null)
    setStep(step + 1)
  }
  const assign = async () => {
    if (eligible.length === 0) return setErr('No eligible users remain. Change the selected users or module.')
    setBusy(true)
    if ((await simulate('save')) !== 'ok') {
      setBusy(false)
      return setDialog('The assignment could not be saved. Please try again.')
    }
    const notified = (await simulate('notify')) === 'ok'
    setBusy(false)
    mutate((s) => {
      for (const u of eligible)
        s.assignments.push({ id: assignmentId(), moduleId, username: u, assignedAt: nowIso(), assignedBy: me.username, deadline: deadline ? new Date(`${deadline}T23:59:00`).toISOString() : null, status: 'Not Started', sectionsDone: 0, completedAt: null, score: null })
      if (notified) pushNotification(s, eligible, `New ${kind === 'remedial' ? 'remedial' : 'security awareness'} training assigned: ${mod!.title}`, '/my-training')
      pushAudit(s, me, kind === 'remedial' ? 'Remedial Training Assigned' : 'Awareness Training Assigned', mod!.title, { newValue: eligible.join(', ') })
    })
    setDone({ count: eligible.length, notified })
  }

  if (done)
    return (
      <>
        <PageHeader title={copy.title} uc={copy.uc} />
        <Card>
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600" aria-hidden />
            <p className="mt-3 text-lg font-semibold text-green-800">{copy.success}</p>
            <p className="text-slate-600">{done.count} user(s) assigned {mod?.title}.</p>
            {!done.notified && <Banner tone="warning" className="mt-4" title="The assignment was saved, but the notification was unsuccessful." />}
            <Button className="mt-6" onClick={() => nav('/training/manage')}>Done</Button>
          </div>
        </Card>
      </>
    )

  const focusUser = focus ? state.users.find((u) => u.username === focus) : null
  const shown = general.filter((u) => !q || u.name.toLowerCase().includes(q.toLowerCase()) || u.username.includes(q.toLowerCase()))
  return (
    <>
      <PageHeader title={copy.title} uc={copy.uc} back={{ to: '/training/manage', label: 'Training Management' }} />
      <Steps steps={['Users', 'Module', 'Deadline', 'Review']} current={step} />
      {err && <Banner tone="error" className="mb-4" title={err} />}
      {step === 0 && (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <Card title={`Select users (${users.length} selected)`}>
            <PlainInput aria-label="Filter users" placeholder="Filter users" value={q} onChange={(e) => setQ(e.target.value)} className="mb-3" />
            <div className="overflow-hidden rounded-md border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="px-3 py-2"><span className="sr-only">Select</span></th>
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2">Training</th>
                    <th className="px-3 py-2">Last phishing test</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((u) => {
                    const t = lastTest(u.username)
                    const asg = state.assignments.filter((a) => a.username === u.username)
                    const failed = t?.clicked
                    return (
                      <tr key={u.username} className={`border-t border-slate-100 ${failed ? 'bg-red-50' : ''} ${focus === u.username ? 'outline outline-2 -outline-offset-2 outline-accent-500' : ''}`} onClick={() => setFocus(u.username)}>
                        <td className="px-3 py-2">
                          <input type="checkbox" aria-label={`Select ${u.name}`} className="h-4 w-4 accent-accent-700" checked={users.includes(u.username)} onChange={(e) => setUsers(e.target.checked ? [...users, u.username] : users.filter((x) => x !== u.username))} />
                        </td>
                        <td className="px-3 py-2">
                          {u.name} {u.status !== 'Active' && <StatusBadge status={u.status} />}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {asg.filter((a) => a.status === 'Completed').length}/{asg.length} complete
                        </td>
                        <td className="px-3 py-2">{t ? (failed ? <span className="font-semibold text-red-700">Failed (clicked)</span> : t.reported ? <span className="text-green-700">Reported</span> : 'No action') : <span className="text-slate-400">None</span>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-500">Rows highlighted in red failed their most recent phishing test. Select a row to view history.</p>
          </Card>
          <Card title="Training history">
            {focusUser ? (
              <>
                <div className="font-semibold">{focusUser.name}</div>
                <div className="mb-3 text-sm text-slate-500">{focusUser.group} · {focusUser.status}</div>
                <ul className="space-y-2 text-sm">
                  {state.assignments.filter((a) => a.username === focusUser.username).map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2">
                      <span>{state.modules.find((m) => m.id === a.moduleId)?.title}</span>
                      <StatusBadge status={a.status} />
                    </li>
                  ))}
                  {state.assignments.every((a) => a.username !== focusUser.username) && <li className="text-slate-500">No training history.</li>}
                </ul>
              </>
            ) : (
              <p className="text-sm text-slate-500">Select a user to see previous results and incomplete assignments.</p>
            )}
          </Card>
        </div>
      )}
      {step === 1 && (
        <Card title="Select a module">
          {modules.length === 0 ? (
            <Banner tone="warning" title={`No ${kind === 'remedial' ? 'remedial' : 'security awareness'} training modules are available.`} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2" role="radiogroup">
              {modules.map((m) => (
                <button key={m.id} role="radio" aria-checked={moduleId === m.id} onClick={() => setModuleId(m.id)} className={`rounded-lg border-2 p-4 text-left ${moduleId === m.id ? 'border-accent-600 bg-accent-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <div className="font-semibold">{m.title}</div>
                  <p className="mt-1 text-sm text-slate-600">{m.description}</p>
                  <div className="mt-2 flex items-center gap-1 text-xs text-slate-500"><Clock className="h-3.5 w-3.5" /> About {m.estMinutes} minutes</div>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}
      {step === 2 && (
        <Card title="Deadline (optional)">
          <div className="max-w-sm">
            <TextField name="deadline" label="Completion deadline" type="date" min={toDateInput(new Date())} value={deadline} onChange={(e) => setDeadline(e.target.value)} status={!deadline ? 'neutral' : deadlineErr ? 'error' : 'ok'} base="Leave blank for no deadline, or select a future date." error={deadlineErr} />
          </div>
        </Card>
      )}
      {step === 3 && (
        <Card title="Review assignment">
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium text-slate-500">Module</div>
              <div className="font-semibold">{mod?.title}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500">Deadline</div>
              <div>{deadline ? fmtDate(new Date(`${deadline}T23:59:00`).toISOString()) : 'No deadline'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500">Users who will be assigned ({eligible.length})</div>
              <div>{eligible.map((u) => state.users.find((x) => x.username === u)?.name).join(', ') || 'None'}</div>
            </div>
            {already.length > 0 && <Banner tone="info" title="Already assigned">{already.join(', ')} already {already.length === 1 ? 'has' : 'have'} this training assigned and will be skipped. You can continue with the remaining users.</Banner>}
            {inactive.length > 0 && <Banner tone="warning" title="Inactive accounts excluded">{inactive.join(', ')} {inactive.length === 1 ? 'is' : 'are'} inactive and will not receive the assignment.</Banner>}
          </div>
        </Card>
      )}
      <div className="mt-6 flex justify-between">
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => nav('/training/manage')}>Cancel</Button>
          {step > 0 && <Button variant="secondary" onClick={() => { setErr(null); setStep(step - 1) }}>Back</Button>}
        </div>
        {step < 3 ? <Button onClick={next}>Next</Button> : <Button onClick={assign} loading={busy}>Assign Training</Button>}
      </div>
      <MessageDialog open={!!dialog} onClose={() => setDialog(null)} tone="error" title={dialog ?? ''} />
    </>
  )
}
