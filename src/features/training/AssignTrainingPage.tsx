// UC9 Assign Training

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { useDemo, useMe, pushAudit, pushNotification } from '../../store/DemoStore'
import { Card, DetailList, PageHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Banner } from '../../components/ui/Banner'
import { FieldGroup, PlainInput, SelectField, TextField } from '../../components/ui/RequirementField'
import { Dialog, MessageDialog, ValidationSummaryDialog } from '../../components/ui/Dialog'
import { useForm } from '../../components/ui/useForm'
import * as V from '../../lib/validators'
import { assignmentId } from '../../lib/ids'
import { fmtDate, nowIso, toDateInput } from '../../lib/dates'

export default function AssignTrainingPage() {
  const { state, mutate, simulate } = useDemo()
  const me = useMe()
  const nav = useNavigate()
  const form = useForm({ moduleId: '', users: [] as string[], deadline: '' })
  const v = form.values
  const [q, setQ] = useState('')
  const [stage, setStage] = useState<'form' | 'confirm' | 'done'>('form')
  const [busy, setBusy] = useState(false)
  const [dialog, setDialog] = useState<null | 'failed' | 'notfound'>(null)
  const [notifyFailed, setNotifyFailed] = useState(false)
  const mod = state.modules.find((m) => m.id === v.moduleId)
  const users = state.users.filter((u) => u.role === 'general')
  const inactive = v.users.filter((u) => state.users.find((x) => x.username === u)?.status !== 'Active')
  const ineligible = v.users.filter((u) => state.assignments.some((a) => a.username === u && a.moduleId === v.moduleId && a.status !== 'Completed'))
  const errors = {
    moduleId: !v.moduleId ? 'Please Select a Training Module' : mod && !mod.available ? 'Training Module Unavailable. Please Select Another Module' : null,
    users: v.users.length === 0 ? 'At Least One User Must Be Selected' : inactive.length ? 'Inactive User Account' : ineligible.length ? 'User Not Eligible for This Training' : null,
    deadline: V.futureDeadline(v.deadline, true),
  }

  const assign = () => {
    if (!form.submit(errors, { moduleId: 'Training module', users: 'Users', deadline: 'Completion deadline' })) return
    if (!mod) return setDialog('notfound')
    setStage('confirm')
  }
  const confirm = async () => {
    setBusy(true)
    const r = await simulate('save')
    if (r !== 'ok') {
      setBusy(false)
      return setDialog('failed')
    }
    const notified = (await simulate('notify')) === 'ok'
    setBusy(false)
    mutate((s) => {
      for (const u of v.users)
        s.assignments.push({ id: assignmentId(), moduleId: v.moduleId, username: u, assignedAt: nowIso(), assignedBy: me.username, deadline: new Date(`${v.deadline}T23:59:00`).toISOString(), status: 'Not Started', sectionsDone: 0, completedAt: null, score: null })
      if (notified) pushNotification(s, v.users, `New training assigned: ${mod!.title} (due ${fmtDate(new Date(`${v.deadline}T23:59:00`).toISOString())})`, '/my-training')
      pushAudit(s, me, 'Training Assigned', mod!.title, { newValue: v.users.join(', ') })
    })
    setNotifyFailed(!notified)
    setStage('done')
  }

  if (stage === 'done')
    return (
      <>
        <PageHeader title="Assign Training" uc="UC9" />
        <Card>
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600" aria-hidden />
            <p className="mt-3 text-lg font-semibold text-green-800">{notifyFailed ? 'Training Assigned Successfully, but Some Notifications Could Not Be Sent' : 'Training Assigned Successfully'}</p>
            <Button className="mt-6" onClick={() => nav('/training/manage')}>Done</Button>
          </div>
        </Card>
      </>
    )

  if (stage === 'confirm')
    return (
      <>
        <PageHeader title="Confirm assignment" uc="UC9" />
        <Card>
          <DetailList items={[['Module', mod?.title], ['Users', v.users.map((u) => state.users.find((x) => x.username === u)?.name ?? u).join(', ')], ['Deadline', fmtDate(new Date(`${v.deadline}T23:59:00`).toISOString())]]} />
          <div className="mt-6 flex gap-3">
            <Button onClick={confirm} loading={busy}>Confirm Assignment</Button>
            <Button variant="secondary" disabled={busy} onClick={() => setStage('form')}>Cancel</Button>
          </div>
        </Card>
        <MessageDialog open={dialog === 'failed'} onClose={() => setDialog(null)} tone="error" title="Training Assignment Failed. Please Try Again" />
      </>
    )

  const shown = users.filter((u) => !q || u.name.toLowerCase().includes(q.toLowerCase()) || u.username.includes(q.toLowerCase()))
  return (
    <>
      <PageHeader title="Assign Training" uc="UC9" back={{ to: '/training/manage', label: 'Training Management' }} />
      <Card>
        <div className="max-w-3xl">
          <SelectField name="moduleId" label="Training module" value={v.moduleId} onChange={(e) => form.set('moduleId', e.target.value)} status={form.status('moduleId', errors.moduleId)} base="Select a training module" error={errors.moduleId}>
            <option value="">Choose a module</option>
            {state.modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} ({m.estMinutes} min)
              </option>
            ))}
          </SelectField>
          <FieldGroup name="users" label={`Users (${v.users.length} selected)`} status={form.status('users', errors.users)} base="Select one or more users" error={errors.users}>
            <PlainInput aria-label="Filter users" placeholder="Filter by name or username" value={q} onChange={(e) => setQ(e.target.value)} className="mb-2" />
            <div className="max-h-72 overflow-y-auto rounded-md border border-slate-200">
              {shown.map((u, i) => {
                const sel = v.users.includes(u.username)
                const bad = sel && u.status !== 'Active'
                const dup = sel && ineligible.includes(u.username)
                return (
                  <label key={u.username} className={`flex items-center gap-3 border-b border-slate-100 px-3 py-2 ${bad || dup ? 'bg-red-50' : ''}`}>
                    <input id={i === 0 ? 'f-users' : undefined} type="checkbox" className="h-4 w-4 accent-accent-700" checked={sel} onChange={(e) => form.set('users', e.target.checked ? [...v.users, u.username] : v.users.filter((x) => x !== u.username))} />
                    <span className="flex-1">
                      {u.name} <span className="text-sm text-slate-500">({u.username}, {u.group})</span>
                    </span>
                    {u.status !== 'Active' && <span className={`text-sm ${bad ? 'font-semibold text-red-700' : 'text-slate-500'}`}>Inactive User Account</span>}
                    {dup && <span className="text-sm font-semibold text-red-700">User Not Eligible for This Training</span>}
                  </label>
                )
              })}
            </div>
          </FieldGroup>
          <TextField name="deadline" label="Completion deadline" type="date" min={toDateInput(new Date())} value={v.deadline} onChange={(e) => form.set('deadline', e.target.value)} status={form.status('deadline', errors.deadline)} base="Select a completion deadline" error={errors.deadline} />
          {mod && <Banner tone="info" className="mb-5" title={mod.title}>{mod.description}</Banner>}
          <Button onClick={assign}>Assign Training</Button>
        </div>
      </Card>
      <ValidationSummaryDialog items={form.summary?.items ?? null} onClose={form.closeSummary} />
      <Dialog open={dialog === 'notfound'} onClose={() => setDialog(null)} tone="error" title="Training Module Not Found" />
    </>
  )
}
