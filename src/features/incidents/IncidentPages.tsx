// UC30 Review Incoming Incidents: list (/security/incidents) and detail (/security/incidents/:id).

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, FolderSearch, Search } from 'lucide-react'
import { useDemo, useMe, pushAudit, pushNotification } from '../../store/DemoStore'
import { Card, DetailList, PageHeader } from '../../components/ui/Card'
import { Button, LinkButton } from '../../components/ui/Button'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { ConfirmDialog, MessageDialog, ValidationSummaryDialog } from '../../components/ui/Dialog'
import { FieldGroup, PlainInput, PlainSelect, TextArea } from '../../components/ui/RequirementField'
import { Banner } from '../../components/ui/Banner'
import * as V from '../../lib/validators'
import { REQ } from '../../lib/validators'
import { endOfDay, fmtDateTime, nowIso, parseDateInput } from '../../lib/dates'
import { useForm } from '../../components/ui/useForm'
import type { IncidentReport } from '../../store/types'

export function IncidentListPage() {
  const { state } = useDemo()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const all = state.reports.filter((r): r is IncidentReport => r.kind === 'incident')
  const qt = q.trim()
  const idErr = /^\d+$/.test(qt) ? V.reportIdSearch(qt) : null
  const f = parseDateInput(from)
  const t = parseDateInput(to)
  const rows = idErr
    ? []
    : all.filter(
        (r) =>
          (!qt || r.id === qt || r.reporter.toLowerCase().includes(qt.toLowerCase())) &&
          (!type || r.incidentType === type) &&
          (!status || r.status === status) &&
          (!f || new Date(r.submittedAt) >= f) &&
          (!t || new Date(r.submittedAt) <= endOfDay(t)),
      )
  const filtering = !!(qt || type || status || from || to)

  return (
    <>
      <PageHeader title="Incoming Incidents" uc="UC30" subtitle="Phone and text phishing incidents reported by users." />
      <div className="mb-4 grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
        <div>
          <label htmlFor="inc-q" className="mb-1 block text-xs font-medium text-slate-600">
            Search by Report ID or username
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden />
            <PlainInput id="inc-q" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} invalid={!!idErr} />
          </div>
          {idErr && <p className="mt-1 text-sm text-red-700">{idErr}</p>}
        </div>
        <div>
          <label htmlFor="inc-type" className="mb-1 block text-xs font-medium text-slate-600">Type</label>
          <PlainSelect id="inc-type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All</option>
            <option>Phone Call</option>
            <option>Text Message</option>
          </PlainSelect>
        </div>
        <div>
          <label htmlFor="inc-status" className="mb-1 block text-xs font-medium text-slate-600">Status</label>
          <PlainSelect id="inc-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option>Pending Review</option>
            <option>Under Review</option>
            <option>Resolved</option>
          </PlainSelect>
        </div>
        <div>
          <label htmlFor="inc-from" className="mb-1 block text-xs font-medium text-slate-600">From</label>
          <PlainInput id="inc-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label htmlFor="inc-to" className="mb-1 block text-xs font-medium text-slate-600">To</label>
          <PlainInput id="inc-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        onRowClick={(r) => nav(`/security/incidents/${r.id}`)}
        empty={all.length === 0 ? 'No incoming incidents are currently available.' : filtering ? 'No incidents found matching your search.' : 'No incoming incidents are currently available.'}
        initialSort={{ key: 'date', dir: 'desc' }}
        columns={[
          { key: 'id', header: 'Report ID', render: (r) => <span className="font-mono text-accent-700">{r.id}</span>, sort: (r) => r.id },
          { key: 'type', header: 'Type', render: (r) => r.incidentType, sort: (r) => r.incidentType },
          { key: 'date', header: 'Submitted', render: (r) => fmtDateTime(r.submittedAt), sort: (r) => r.submittedAt },
          { key: 'rep', header: 'Reporter', render: (r) => r.reporter, sort: (r) => r.reporter },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} />, sort: (r) => r.status },
        ]}
      />
    </>
  )
}

type Cls = NonNullable<IncidentReport['classification']>
const CLASSES: { v: Cls; d: string }[] = [
  { v: 'Confirmed Phishing', d: 'The incident is definitely a phishing attempt.' },
  { v: 'Not Phishing', d: 'The incident is determined to not be a phishing attempt.' },
  { v: 'Needs further investigation', d: 'Additional information or investigation is needed.' },
]

export function IncidentDetailPage() {
  const { id } = useParams()
  const { state, mutate, simulate } = useDemo()
  const me = useMe()
  const nav = useNavigate()
  const r = state.reports.find((x): x is IncidentReport => x.kind === 'incident' && x.id === id)
  const form = useForm({ notes: r?.notes ?? '', cls: (r?.classification ?? '') as Cls | '' })
  const [dialog, setDialog] = useState<null | 'locked' | 'confirm' | 'failed'>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<Cls | null>(null)
  const back = { to: '/security/incidents', label: 'Incoming Incidents' }

  if (!r)
    return (
      <>
        <PageHeader title="Incident" back={back} />
        <Banner tone="error" title="Incident report unavailable. Please refresh the incident list." />
      </>
    )

  const errors = { notes: V.reviewNotesUC30(form.values.notes), cls: form.values.cls ? null : 'Please select an incident classification before submitting.' }
  const mine = r.status === 'Under Review' && r.reviewer === me.username

  const begin = () => {
    if (r.lockedByOther) return setDialog('locked')
    mutate((s) => {
      const x = s.reports.find((y) => y.id === r.id)
      if (x && x.kind === 'incident') {
        x.status = 'Under Review'
        x.reviewer = me.username
        x.reviewStartedAt = nowIso()
      }
    })
  }
  const submit = () => {
    if (!form.submit(errors, { notes: 'Review Notes', cls: 'Classification' })) return
    setDialog('confirm')
  }
  const confirm = async () => {
    setBusy(true)
    const res = await simulate('save')
    setBusy(false)
    if (res !== 'ok') return setDialog('failed')
    const cls = form.values.cls as Cls
    const newStatus = cls === 'Needs further investigation' ? 'Under Review' : 'Resolved'
    mutate((s) => {
      const x = s.reports.find((y) => y.id === r.id)
      if (x && x.kind === 'incident') {
        x.status = newStatus
        x.classification = cls
        x.notes = form.values.notes
        x.reviewer = me.username
      }
      pushAudit(s, me, 'Incident Reviewed', r.id, { oldValue: r.status, newValue: `${newStatus} (${cls})` })
      pushNotification(s, r.reporter, `Your incident report (${r.id}) status has been updated to ${newStatus}.`, '/my-reports')
    })
    setDialog(null)
    setDone(cls)
  }

  if (done)
    return (
      <>
        <PageHeader title={`Incident ${r.id}`} uc="UC30" back={back} />
        <Card>
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600" aria-hidden />
            <p className="mt-3 text-lg font-semibold text-green-800">Incident Review Submitted Successfully. Report ID: {r.id}.</p>
            <div className="mt-6 flex gap-3">
              <Button onClick={() => nav('/security/incidents')}>Done</Button>
              {done === 'Needs further investigation' && (
                <LinkButton to={`/security/investigations/new?report=${r.id}`} variant="secondary">
                  <FolderSearch className="h-4 w-4" /> Open Investigation
                </LinkButton>
              )}
            </div>
          </div>
        </Card>
      </>
    )

  return (
    <>
      <PageHeader title={`Incident ${r.id}`} uc="UC30" back={back} subtitle={`${r.incidentType} reported by ${r.reporter}`} actions={<StatusBadge status={r.status} />} />
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <Card title="Incident information">
          <DetailList
            items={[
              ['Type', r.incidentType],
              ['Phone number', r.phone ?? 'Unknown/Blocked Number'],
              ['Occurred', fmtDateTime(r.occurredAt)],
              ['Submitted', fmtDateTime(r.submittedAt)],
              ['Reporter', r.reporter],
              ['Description', <p className="whitespace-pre-wrap">{r.description}</p>],
              ['Supporting evidence', r.evidence ?? 'None provided'],
              ['Reviewer', r.reviewer ? `${r.reviewer}${r.reviewStartedAt ? `, since ${fmtDateTime(r.reviewStartedAt)}` : ''}` : r.lockedByOther ? `${r.lockedByOther} (in progress)` : 'Unassigned'],
            ]}
          />
        </Card>
        <Card title="Review">
          {r.status === 'Resolved' ? (
            <div className="space-y-2 text-sm">
              <p>
                Classification: <strong>{r.classification}</strong>
              </p>
              <p className="whitespace-pre-wrap text-slate-700">{r.notes}</p>
            </div>
          ) : r.status === 'Pending Review' || (r.status === 'Under Review' && !mine) ? (
            <>
              <p className="mb-4 text-sm text-slate-600">Examine the report, then begin a review to record your findings.</p>
              {r.status === 'Under Review' && !mine ? (
                <Banner tone="info" title={`Under review by ${r.reviewer}.`} />
              ) : (
                <Button onClick={begin}>Begin Review</Button>
              )}
            </>
          ) : (
            <>
              <TextArea name="notes" label="Review Notes" rows={6} value={form.values.notes} onChange={(e) => form.set('notes', e.target.value)} status={form.status('notes', errors.notes)} base={REQ.reviewNotes} error={errors.notes} counter={{ value: form.values.notes.length, max: 1500 }} />
              <FieldGroup name="cls" label="Incident classification" status={form.status('cls', errors.cls)} base="Select the appropriate incident classification" error={errors.cls}>
                <div className="space-y-2" role="radiogroup" aria-labelledby="l-cls">
                  {CLASSES.map((c, i) => (
                    <label key={c.v} className={`flex cursor-pointer gap-3 rounded-md border px-3 py-2 ${form.values.cls === c.v ? 'border-accent-600 bg-accent-50' : 'border-slate-200'}`}>
                      <input id={i === 0 ? 'f-cls' : undefined} type="radio" name="cls" className="mt-1 h-4 w-4 accent-accent-700" checked={form.values.cls === c.v} onChange={() => form.set('cls', c.v)} />
                      <span>
                        <span className="font-medium">{c.v}</span>
                        <span className="block text-xs text-slate-600">{c.d}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </FieldGroup>
              <Button onClick={submit}>Submit Review</Button>
            </>
          )}
        </Card>
      </div>
      <ValidationSummaryDialog items={form.summary?.items ?? null} onClose={form.closeSummary} />
      <MessageDialog open={dialog === 'locked'} onClose={() => setDialog(null)} tone="warning" title="Review unavailable" message="This incident is currently being reviewed by another cybersecurity officer." />
      <ConfirmDialog open={dialog === 'confirm'} busy={busy} message="Are you sure you want to submit this incident review?" onCancel={() => setDialog(null)} onConfirm={confirm} />
      <MessageDialog open={dialog === 'failed'} onClose={() => setDialog(null)} tone="error" title="Not saved" message="Incident review could not be saved. Please try again." />
    </>
  )
}
