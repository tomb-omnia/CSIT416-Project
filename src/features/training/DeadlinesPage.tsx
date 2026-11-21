// UC10 Manage Training Completion Deadlines

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { useDemo, useMe, pushAudit, pushNotification } from '../../store/DemoStore'
import { Card, DetailList, PageHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { PlainSelect, RequirementMessage, TextField } from '../../components/ui/RequirementField'
import { MessageDialog, ValidationSummaryDialog } from '../../components/ui/Dialog'
import { useForm } from '../../components/ui/useForm'
import * as V from '../../lib/validators'
import { fmtDate, isPastDeadline, toDateInput } from '../../lib/dates'

export default function DeadlinesPage() {
  const { state, mutate, simulate } = useDemo()
  const me = useMe()
  const nav = useNavigate()
  const form = useForm({ assignment: '', deadline: '' })
  const v = form.values
  const [mod, setMod] = useState('')
  const [stage, setStage] = useState<'form' | 'confirm' | 'done'>('form')
  const [failed, setFailed] = useState(false)
  const [notifyFailed, setNotifyFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const a = state.assignments.find((x) => x.id === v.assignment)
  const errors = {
    assignment: v.assignment ? null : 'Please Select a Training Assignment',
    // ASSUMPTION: UC10 does not forbid past dates; reuse UC9's future-date rule for consistency.
    deadline: V.futureDeadline(v.deadline, true, 'Deadline Required'),
  }
  const rows = state.assignments.filter((x) => x.status !== 'Completed' && (!mod || x.moduleId === mod))
  const newIso = v.deadline ? new Date(`${v.deadline}T23:59:00`).toISOString() : null

  const update = () => {
    if (!form.submit(errors, { assignment: 'Training assignment', deadline: 'New deadline' })) return
    setStage('confirm')
  }
  const confirm = async () => {
    setBusy(true)
    const r = await simulate('save')
    if (r !== 'ok') {
      setBusy(false)
      setStage('form')
      return setFailed(true)
    }
    const notified = (await simulate('notify')) === 'ok'
    setBusy(false)
    const title = state.modules.find((m) => m.id === a!.moduleId)?.title
    mutate((s) => {
      const x = s.assignments.find((y) => y.id === a!.id)
      if (x) x.deadline = newIso
      if (notified) pushNotification(s, a!.username, `The deadline for "${title}" is now ${fmtDate(newIso)}.`, '/my-training')
      pushAudit(s, me, 'Deadline Changed', `${a!.username}: ${title}`, { oldValue: fmtDate(a!.deadline), newValue: fmtDate(newIso) })
    })
    setNotifyFailed(!notified)
    setStage('done')
  }

  if (stage === 'done')
    return (
      <>
        <PageHeader title="Manage Deadlines" uc="UC10" />
        <Card>
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600" aria-hidden />
            <p className="mt-3 text-lg font-semibold text-green-800">{notifyFailed ? 'Deadline Updated Successfully, but Some Notifications Could Not Be Sent' : 'Training Deadline Updated Successfully'}</p>
            <Button className="mt-6" onClick={() => nav('/training/manage')}>Done</Button>
          </div>
        </Card>
      </>
    )

  if (stage === 'confirm' && a)
    return (
      <>
        <PageHeader title="Confirm deadline change" uc="UC10" />
        <Card>
          <DetailList items={[['User', a.username], ['Module', state.modules.find((m) => m.id === a.moduleId)?.title], ['Original deadline', fmtDate(a.deadline)], ['New deadline', <strong>{fmtDate(newIso)}</strong>]]} />
          <div className="mt-6 flex gap-3">
            <Button onClick={confirm} loading={busy}>Confirm</Button>
            <Button variant="secondary" disabled={busy} onClick={() => { form.set('deadline', ''); setStage('form') }}>Cancel</Button>
          </div>
        </Card>
      </>
    )

  return (
    <>
      <PageHeader title="Manage Deadlines" uc="UC10" back={{ to: '/training/manage', label: 'Training Management' }} subtitle="Select an assignment, then choose a new completion deadline." />
      <div className="mb-3 w-72">
        <PlainSelect aria-label="Filter by module" value={mod} onChange={(e) => setMod(e.target.value)}>
          <option value="">All modules</option>
          {state.modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
        </PlainSelect>
      </div>
      <div id="f-assignment" tabIndex={-1}>
        <DataTable
          rows={rows}
          rowKey={(x) => x.id}
          empty="No open assignments."
          selectedKey={v.assignment}
          onRowClick={(x) => form.set('assignment', x.id)}
          initialSort={{ key: 'd', dir: 'asc' }}
          columns={[
            { key: 'sel', header: <span className="sr-only">Selected</span>, render: (x) => <input type="radio" readOnly aria-label={`Select ${x.id}`} className="h-4 w-4 accent-accent-700" checked={v.assignment === x.id} /> },
            { key: 'u', header: 'User', render: (x) => state.users.find((u) => u.username === x.username)?.name, sort: (x) => x.username },
            { key: 'm', header: 'Module', render: (x) => state.modules.find((m) => m.id === x.moduleId)?.title, sort: (x) => x.moduleId },
            { key: 's', header: 'Status', render: (x) => <StatusBadge status={x.status} /> },
            { key: 'd', header: 'Current deadline', render: (x) => <span className={isPastDeadline(x.deadline) ? 'font-medium text-red-700' : ''}>{x.deadline ? fmtDate(x.deadline) : 'None'}{isPastDeadline(x.deadline) ? ' (overdue)' : ''}</span>, sort: (x) => x.deadline ?? '9' },
          ]}
        />
      </div>
      <RequirementMessage status={form.status('assignment', errors.assignment)} base="Select a training assignment" error={errors.assignment} />
      <Card className="mt-6">
        <div className="max-w-md">
          <TextField name="deadline" label="New completion deadline" type="date" min={toDateInput(new Date())} value={v.deadline} onChange={(e) => form.set('deadline', e.target.value)} status={form.status('deadline', errors.deadline)} base="Select a new completion deadline" error={errors.deadline} />
          <Button onClick={update}>Update Deadline</Button>
        </div>
      </Card>
      <ValidationSummaryDialog items={form.summary?.items ?? null} onClose={form.closeSummary} />
      <MessageDialog open={failed} onClose={() => setFailed(false)} tone="error" title="Deadline Could Not Be Updated. Please Try Again" />
    </>
  )
}
