// UC35 Monitor System Activity Logs: list (/admin/activity) and detail (/admin/activity/:id).

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, Flag, Search } from 'lucide-react'
import { useDemo, useMe, pushAudit } from '../../store/DemoStore'
import { Card, DetailList, PageHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Banner } from '../../components/ui/Banner'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { FieldGroup, PlainInput, PlainSelect, TextArea } from '../../components/ui/RequirementField'
import { ConfirmDialog, MessageDialog, ValidationSummaryDialog } from '../../components/ui/Dialog'
import { useForm } from '../../components/ui/useForm'
import * as V from '../../lib/validators'
import { REQ } from '../../lib/validators'
import { endOfDay, fmtDateTime, nowIso, parseDateInput } from '../../lib/dates'

const REASONS = ['Suspicious Login Activity', 'Repeated Failed Login Attempts', 'Unauthorized Access Attempt', 'Other Suspicious Activity']

export function ActivityListPage() {
  const { state } = useDemo()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const dateErr = V.activityDateRange(from, to)
  const types = Array.from(new Set(state.activity.map((a) => a.type))).sort()
  const f = parseDateInput(from)
  const t = parseDateInput(to)
  const qt = q.trim().toLowerCase()
  const rows = dateErr
    ? []
    : state.activity.filter(
        (a) =>
          (!qt || a.username.toLowerCase().includes(qt) || a.id.toLowerCase() === qt) &&
          (!type || a.type === type) &&
          (!status || (status === 'Flagged' ? !!a.flag : a.status === status)) &&
          (!f || new Date(a.time) >= f) &&
          (!t || new Date(a.time) <= endOfDay(t)),
      )
  const filtering = !!(qt || type || status || from || to)
  return (
    <>
      <PageHeader title="System Activity Logs" uc="UC35" subtitle="Find suspicious behavior, failed logins, and unauthorized access attempts." />
      <div className="mb-4 grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
        <div>
          <label htmlFor="ac-q" className="mb-1 block text-xs font-medium text-slate-600">Search by username or Log ID</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden />
            <PlainInput id="ac-q" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div>
          <label htmlFor="ac-type" className="mb-1 block text-xs font-medium text-slate-600">Activity type</label>
          <PlainSelect id="ac-type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            {types.map((x) => <option key={x}>{x}</option>)}
          </PlainSelect>
        </div>
        <div>
          <label htmlFor="ac-status" className="mb-1 block text-xs font-medium text-slate-600">Status</label>
          <PlainSelect id="ac-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option>Success</option>
            <option>Failure</option>
            <option>Flagged</option>
          </PlainSelect>
        </div>
        <div>
          <label htmlFor="ac-from" className="mb-1 block text-xs font-medium text-slate-600">From</label>
          <PlainInput id="ac-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} invalid={!!dateErr} />
        </div>
        <div>
          <label htmlFor="ac-to" className="mb-1 block text-xs font-medium text-slate-600">To</label>
          <PlainInput id="ac-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} invalid={!!dateErr} />
        </div>
      </div>
      {dateErr && <p className="-mt-2 mb-3 text-sm font-medium text-red-700">{dateErr}</p>}
      <DataTable
        rows={rows}
        rowKey={(a) => a.id}
        onRowClick={(a) => nav(`/admin/activity/${a.id}`)}
        empty={state.activity.length === 0 ? 'No System Activity Logs Available.' : filtering ? 'No Activity Logs Found Matching Your Search.' : 'No System Activity Logs Available.'}
        initialSort={{ key: 't', dir: 'desc' }}
        rowClassName={(a) => (a.status === 'Failure' ? 'bg-red-50/40' : '')}
        columns={[
          { key: 'id', header: 'Log ID', render: (a) => <span className="font-mono text-accent-700">{a.id}</span>, sort: (a) => a.id },
          { key: 'u', header: 'Username', render: (a) => a.username, sort: (a) => a.username },
          { key: 'ty', header: 'Activity type', render: (a) => a.type, sort: (a) => a.type },
          { key: 't', header: 'Date/time', render: (a) => fmtDateTime(a.time), sort: (a) => a.time },
          { key: 's', header: 'Status', render: (a) => <span className="flex gap-1"><StatusBadge status={a.status} />{a.flag && <StatusBadge status="Flagged for Investigation" />}</span>, sort: (a) => a.status },
        ]}
      />
    </>
  )
}

export function ActivityDetailPage() {
  const { id } = useParams()
  const { state, mutate, simulate } = useDemo()
  const me = useMe()
  const nav = useNavigate()
  const a = state.activity.find((x) => x.id === id)
  const form = useForm({ reason: '', notes: '' })
  const errors = { reason: form.values.reason ? (REASONS.includes(form.values.reason) ? null : 'Please Select a Reason for Flagging This Activity.') : 'Please Select a Reason for Flagging This Activity.', notes: V.reviewNotesUC34(form.values.notes) }
  const [flagging, setFlagging] = useState(false)
  const [dialog, setDialog] = useState<null | 'confirm' | 'failed' | 'already'>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const back = { to: '/admin/activity', label: 'System Activity Logs' }

  if (!a)
    return (
      <>
        <PageHeader title="Activity" back={back} />
        <Banner tone="error" title="Activity Log Unavailable. Please Refresh the Activity List." />
      </>
    )

  const confirm = async () => {
    setBusy(true)
    const r = await simulate('save')
    setBusy(false)
    if (r !== 'ok') return setDialog('failed')
    mutate((s) => {
      const x = s.activity.find((y) => y.id === a.id)
      if (x) x.flag = { reason: form.values.reason, notes: form.values.notes, by: me.username, at: nowIso() }
      pushAudit(s, me, 'Activity Flagged', a.id, { newValue: form.values.reason })
    })
    setDialog(null)
    setDone(true)
  }

  if (done)
    return (
      <>
        <PageHeader title={`Activity ${a.id}`} uc="UC35" back={back} />
        <Card>
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600" aria-hidden />
            <p className="mt-3 text-lg font-semibold text-green-800">System Activity Flagged Successfully.</p>
            <Button className="mt-6" onClick={() => nav('/admin/activity')}>Done</Button>
          </div>
        </Card>
      </>
    )

  return (
    <>
      <PageHeader title={`Activity ${a.id}`} uc="UC35" back={back} actions={a.flag && <StatusBadge status="Flagged for Investigation" />} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Details">
          <DetailList items={[['Log ID', <span className="font-mono">{a.id}</span>], ['Username', a.username], ['Activity type', a.type], ['Date/time', new Date(a.time).toLocaleString()], ['IP address', a.ip || 'Not available'], ['Result', <StatusBadge status={a.status === 'Success' ? 'Success' : 'Failure'} />]]} />
          <Button variant="secondary" className="mt-6" onClick={() => nav('/admin/activity')}>Back to Activity Logs</Button>
        </Card>
        <Card title="Flag for investigation">
          {a.flag && !flagging ? (
            <Banner tone="warning" title="This Activity Has Already Been Flagged for Investigation.">
              {a.flag.reason}, flagged by {a.flag.by} on {fmtDateTime(a.flag.at)}. {a.flag.notes}
            </Banner>
          ) : !flagging ? (
            <Button onClick={() => (a.flag ? setDialog('already') : setFlagging(true))}>
              <Flag className="h-4 w-4" /> Flag Activity
            </Button>
          ) : (
            <>
              <FieldGroup name="reason" label="Reason" status={form.status('reason', errors.reason)} base="Select a reason for flagging this activity." error={errors.reason}>
                <div className="space-y-1.5">
                  {REASONS.map((r, i) => (
                    <label key={r} className="flex items-center gap-2">
                      <input id={i === 0 ? 'f-reason' : undefined} type="radio" name="reason" className="h-4 w-4 accent-accent-700" checked={form.values.reason === r} onChange={() => form.set('reason', r)} />
                      {r}
                    </label>
                  ))}
                </div>
              </FieldGroup>
              <TextArea name="notes" label="Review Notes" rows={5} value={form.values.notes} onChange={(e) => form.set('notes', e.target.value)} status={form.status('notes', errors.notes)} base={REQ.reviewNotes} error={errors.notes} counter={{ value: form.values.notes.length, max: 1500 }} />
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setFlagging(false)}>Cancel</Button>
                <Button onClick={() => form.submit(errors, { reason: 'Reason', notes: 'Review Notes' }) && setDialog('confirm')}>Submit Flagged Activity</Button>
              </div>
            </>
          )}
        </Card>
      </div>
      <ValidationSummaryDialog items={form.summary?.items ?? null} onClose={form.closeSummary} />
      <ConfirmDialog open={dialog === 'confirm'} busy={busy} message="Are You Sure You Want to Flag This Activity for Further Investigation?" onCancel={() => setDialog(null)} onConfirm={confirm} />
      <MessageDialog open={dialog === 'failed'} onClose={() => setDialog(null)} tone="error" title="Unable to Flag System Activity. Please Try Again." />
      <MessageDialog open={dialog === 'already'} onClose={() => setDialog(null)} tone="warning" title="This Activity Has Already Been Flagged for Investigation." />
    </>
  )
}
