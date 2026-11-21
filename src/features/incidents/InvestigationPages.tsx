// [EXTRAPOLATED] pending team spec
// UC27 Investigate Phishing Incident: list, new case, case page.

import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Ban, Lock, Megaphone, Plus, Target, Trash2, X } from 'lucide-react'
import { useDemo, useMe, pushAudit, pushNotification } from '../../store/DemoStore'
import { Card, PageHeader } from '../../components/ui/Card'
import { Button, LinkButton } from '../../components/ui/Button'
import { Banner } from '../../components/ui/Banner'
import { DataTable } from '../../components/ui/DataTable'
import { SeverityChip, StatusBadge } from '../../components/ui/StatusBadge'
import { ConfirmDialog, ValidationSummaryDialog } from '../../components/ui/Dialog'
import { PlainInput, PlainSelect, SelectField, TextArea, TextField } from '../../components/ui/RequirementField'
import { useForm } from '../../components/ui/useForm'
import * as V from '../../lib/validators'
import { fmtDate, fmtDateTime, nowIso } from '../../lib/dates'
import { caseId, uid } from '../../lib/ids'
import { defang } from '../../store/mockRules'
import { reportType } from '../email-defense/MyReportsPage'
import type { CaseStatus, DemoState, Investigation, Severity } from '../../store/types'

const SEVERITIES: Severity[] = ['Low', 'Medium', 'High', 'Critical']

function addTimeline(s: DemoState, id: string, by: string, text: string, auto = true) {
  s.investigations.find((c) => c.id === id)?.timeline.push({ id: uid('t'), at: nowIso(), by, text, auto })
}

export function InvestigationListPage() {
  const { state } = useDemo()
  const nav = useNavigate()
  return (
    <>
      <PageHeader
        title="Investigations"
        uc="UC27 (extrapolated)"
        subtitle="Phishing incident cases linking reports, indicators, and response actions."
        actions={
          <LinkButton to="/security/investigations/new">
            <Plus className="h-4 w-4" /> New Investigation
          </LinkButton>
        }
      />
      <DataTable
        rows={state.investigations}
        rowKey={(c) => c.id}
        onRowClick={(c) => nav(`/security/investigations/${c.id}`)}
        empty="No investigations yet."
        initialSort={{ key: 'o', dir: 'desc' }}
        columns={[
          { key: 'id', header: 'Case ID', render: (c) => <span className="font-mono text-accent-700">{c.id}</span>, sort: (c) => c.id },
          { key: 't', header: 'Title', render: (c) => c.title, sort: (c) => c.title },
          { key: 's', header: 'Severity', render: (c) => <SeverityChip severity={c.severity} />, sort: (c) => SEVERITIES.indexOf(c.severity) },
          { key: 'st', header: 'Status', render: (c) => <StatusBadge status={c.status} />, sort: (c) => c.status },
          { key: 'r', header: 'Linked reports', render: (c) => c.reportIds.length, sort: (c) => c.reportIds.length },
          { key: 'a', header: 'Assigned officer', render: (c) => c.assignedTo },
          { key: 'o', header: 'Opened', render: (c) => fmtDate(c.openedAt), sort: (c) => c.openedAt },
        ]}
      />
    </>
  )
}

export function NewInvestigationPage() {
  const { state, mutate, toast } = useDemo()
  const me = useMe()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const rep = state.reports.find((r) => r.id === params.get('report'))
  const form = useForm({
    title: rep ? (rep.kind === 'email' ? `Phishing email: ${rep.subject}` : `${rep.incidentType} scam reported by ${rep.reporter}`) : '',
    severity: 'Medium' as Severity,
    description: rep ? (rep.kind === 'email' ? `Opened from report ${rep.id}. Sender ${rep.sender}.` : `Opened from report ${rep.id}. ${rep.description}`) : '',
  })
  const errors = { title: V.lengthBetween('Title', form.values.title, 5, 100), description: V.lengthBetween('Description', form.values.description, 20, 1500) }
  const create = () => {
    if (!form.submit(errors, { title: 'Title', description: 'Description' })) return
    const id = caseId()
    mutate((s) => {
      const c: Investigation = {
        id, title: form.values.title.trim(), severity: form.values.severity, description: form.values.description.trim(), status: 'Open', assignedTo: me.username, openedAt: nowIso(),
        reportIds: rep ? [rep.id] : [], affectedUsers: rep ? [{ username: rep.reporter, relation: 'Reported' }] : [], timeline: [],
        indicators: rep?.kind === 'email' ? [{ id: uid('i'), kind: 'Sender', value: rep.sender }, { id: uid('i'), kind: 'Domain', value: rep.sender.split('@')[1] ?? '' }] : rep?.kind === 'incident' && rep.phone ? [{ id: uid('i'), kind: 'Phone', value: rep.phone }] : [],
      }
      s.investigations.unshift(c)
      addTimeline(s, id, me.username, rep ? `Investigation opened from report ${rep.id}.` : 'Investigation opened.')
      pushAudit(s, me, 'Investigation Opened', id, { newValue: c.title })
    })
    toast(`Investigation ${id} opened.`)
    nav(`/security/investigations/${id}`)
  }
  return (
    <>
      <PageHeader title="New Investigation" uc="UC27 (extrapolated)" back={{ to: '/security/investigations', label: 'Investigations' }} />
      <Card>
        <div className="max-w-2xl">
          {rep && <Banner tone="info" className="mb-5" title={`Linked report: ${rep.id} (${reportType(rep)})`} />}
          <TextField name="title" label="Title" value={form.values.title} onChange={(e) => form.set('title', e.target.value)} status={form.status('title', errors.title)} base="Enter a title between 5 and 100 characters." error={errors.title} />
          <SelectField name="severity" label="Severity" value={form.values.severity} onChange={(e) => form.set('severity', e.target.value as Severity)} status="neutral" base="">
            {SEVERITIES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </SelectField>
          <TextArea name="description" label="Description" rows={4} value={form.values.description} onChange={(e) => form.set('description', e.target.value)} status={form.status('description', errors.description)} base="Describe the incident in 20 to 1,500 characters." error={errors.description} />
          <Button onClick={create}>Open Investigation</Button>
        </div>
      </Card>
      <ValidationSummaryDialog items={form.summary?.items ?? null} onClose={form.closeSummary} />
    </>
  )
}

export function InvestigationCasePage() {
  const { caseId: id } = useParams()
  const { state, mutate, toast } = useDemo()
  const me = useMe()
  const nav = useNavigate()
  const c = state.investigations.find((x) => x.id === id)
  const [repId, setRepId] = useState('')
  const [repErr, setRepErr] = useState<string | null>(null)
  const [ind, setInd] = useState({ kind: 'Domain' as Investigation['indicators'][number]['kind'], value: '' })
  const [aff, setAff] = useState({ username: '', relation: 'Received' as Investigation['affectedUsers'][number]['relation'] })
  const noteForm = useForm({ note: '' })
  const noteErr = V.lengthBetween('Note', noteForm.values.note, 20, 1500)
  const closeForm = useForm({ resolution: '' })
  const resErr = V.lengthBetween('Resolution summary', closeForm.values.resolution, 50, 1500)
  const [closing, setClosing] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)

  if (!c)
    return (
      <>
        <PageHeader title="Investigation" back={{ to: '/security/investigations', label: 'Investigations' }} />
        <Banner tone="error" title="This investigation could not be found." />
      </>
    )
  const closed = c.status === 'Closed'
  const upd = (fn: (x: Investigation, s: DemoState) => void) =>
    mutate((s) => {
      const x = s.investigations.find((y) => y.id === c.id)
      if (x) fn(x, s)
    })

  const linkReport = () => {
    const err = V.reportIdSearch(repId)
    if (err) return setRepErr(err)
    if (!state.reports.some((r) => r.id === repId.trim())) return setRepErr('No report found with that Report ID.')
    if (c.reportIds.includes(repId.trim())) return setRepErr('This report is already linked.')
    upd((x, s) => {
      x.reportIds.push(repId.trim())
      addTimeline(s, c.id, me.username, `Report ${repId.trim()} linked.`)
    })
    setRepId('')
    setRepErr(null)
  }
  const firstDomain = c.indicators.find((i) => i.kind === 'Domain')?.value ?? ''
  const firstSender = c.indicators.find((i) => i.kind === 'Sender')?.value ?? ''

  const requestRemedial = () => {
    const users = c.affectedUsers.filter((u) => u.relation === 'Clicked').map((u) => u.username)
    const list = users.length ? users : c.affectedUsers.map((u) => u.username)
    upd((_, s) => {
      // ASSUMPTION: officers cannot assign training (UC22 belongs to the Training Coordinator),
      // so this action sends a request to Training Coordinators with the users prefilled.
      pushNotification(s, s.users.filter((u) => u.role === 'trainer').map((u) => u.username), `Remedial training requested for ${list.join(', ')} (case ${c.id}).`, `/training/remedial?users=${list.join(',')}`)
      addTimeline(s, c.id, me.username, `Remedial training requested for ${list.join(', ')}.`)
    })
    toast('Request sent to Training Coordinators.')
  }

  const doClose = () => {
    setConfirmClose(false)
    upd((x, s) => {
      x.status = 'Closed'
      x.resolution = closeForm.values.resolution.trim()
      addTimeline(s, c.id, me.username, `Investigation closed. ${x.resolution}`)
      const reporters: string[] = []
      s.reports.forEach((r) => {
        if (x.reportIds.includes(r.id) && !r.status.startsWith('Resolved')) {
          r.status = 'Resolved'
          reporters.push(r.reporter)
        }
      })
      pushNotification(s, reporters, `The investigation into a report you submitted is complete. Thank you for using Phishguard.`, '/my-reports')
      pushAudit(s, me, 'Investigation Closed', c.id, { oldValue: c.status, newValue: 'Closed' })
    })
    setClosing(false)
    toast(`Investigation ${c.id} closed.`)
  }

  const section = 'mb-6'
  return (
    <>
      <PageHeader title={`${c.id}: ${c.title}`} uc="UC27 (extrapolated)" back={{ to: '/security/investigations', label: 'Investigations' }} subtitle={`Opened ${fmtDateTime(c.openedAt)} · Assigned to ${c.assignedTo}`} actions={<><SeverityChip severity={c.severity} /><StatusBadge status={c.status} /></>} />
      {closed && <Banner tone="success" className="mb-6" title="Investigation closed">{c.resolution}</Banner>}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <Card className={section} title="Summary">
            <p className="text-slate-700">{c.description}</p>
            {!closed && (
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <label htmlFor="case-status" className="font-medium">
                  Status
                </label>
                <PlainSelect id="case-status" className="w-40" value={c.status} onChange={(e) => upd((x, s) => { x.status = e.target.value as CaseStatus; addTimeline(s, c.id, me.username, `Status changed to ${e.target.value}.`) })}>
                  {['Open', 'In Progress', 'Contained'].map((s) => <option key={s}>{s}</option>)}
                </PlainSelect>
                <label htmlFor="case-sev" className="font-medium">
                  Severity
                </label>
                <PlainSelect id="case-sev" className="w-32" value={c.severity} onChange={(e) => upd((x, s) => { x.severity = e.target.value as Severity; addTimeline(s, c.id, me.username, `Severity changed to ${e.target.value}.`) })}>
                  {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
                </PlainSelect>
              </div>
            )}
          </Card>
          <Card className={section} title={`Linked reports (${c.reportIds.length})`}>
            <ul className="mb-3 divide-y text-sm">
              {c.reportIds.map((rid) => {
                const r = state.reports.find((x) => x.id === rid)
                return (
                  <li key={rid} className="flex items-center justify-between py-2">
                    <span>
                      <span className="font-mono">{rid}</span> · {r ? reportType(r) : 'Unknown'} · reported by {r?.reporter}
                    </span>
                    {r && <StatusBadge status={r.status} />}
                  </li>
                )
              })}
              {c.reportIds.length === 0 && <li className="py-2 text-slate-500">No linked reports.</li>}
            </ul>
            {!closed && (
              <div>
                <div className="flex gap-2">
                  <PlainInput aria-label="Report ID to link" placeholder="8-digit Report ID" value={repId} onChange={(e) => { setRepId(e.target.value); setRepErr(null) }} invalid={!!repErr} className="max-w-xs" />
                  <Button variant="secondary" onClick={linkReport}>Link report</Button>
                </div>
                {repErr && <p className="mt-1 text-sm text-red-700">{repErr}</p>}
              </div>
            )}
          </Card>
          <Card className={section} title="Indicators">
            <ul className="mb-3 space-y-1 text-sm">
              {c.indicators.map((i) => (
                <li key={i.id} className="flex items-center justify-between rounded bg-slate-50 px-3 py-1.5">
                  <span>
                    <span className="mr-2 text-xs font-semibold uppercase text-slate-500">{i.kind}</span>
                    <span className="font-mono">{i.kind === 'Phone' ? i.value : defang(i.value)}</span>
                  </span>
                  {!closed && (
                    <button aria-label={`Remove ${i.value}`} onClick={() => upd((x) => { x.indicators = x.indicators.filter((y) => y.id !== i.id) })}>
                      <X className="h-4 w-4 text-slate-500" />
                    </button>
                  )}
                </li>
              ))}
              {c.indicators.length === 0 && <li className="text-slate-500">No indicators yet.</li>}
            </ul>
            {!closed && (
              <div className="flex flex-wrap gap-2">
                <PlainSelect aria-label="Indicator type" className="w-32" value={ind.kind} onChange={(e) => setInd({ ...ind, kind: e.target.value as typeof ind.kind })}>
                  {['Sender', 'Domain', 'URL', 'Phone'].map((k) => <option key={k}>{k}</option>)}
                </PlainSelect>
                <PlainInput aria-label="Indicator value" className="max-w-xs" value={ind.value} onChange={(e) => setInd({ ...ind, value: e.target.value })} />
                <Button variant="secondary" disabled={!ind.value.trim()} onClick={() => { upd((x, s) => { x.indicators.push({ id: uid('i'), kind: ind.kind, value: ind.value.trim() }); addTimeline(s, c.id, me.username, `${ind.kind} indicator added.`) }); setInd({ ...ind, value: '' }) }}>
                  Add indicator
                </Button>
              </div>
            )}
          </Card>
          <Card className={section} title="Affected users">
            <ul className="mb-3 space-y-1 text-sm">
              {c.affectedUsers.map((u) => (
                <li key={u.username + u.relation} className="flex justify-between rounded bg-slate-50 px-3 py-1.5">
                  <span>{state.users.find((x) => x.username === u.username)?.name ?? u.username}</span>
                  <StatusBadge status={u.relation} tone={u.relation === 'Clicked' ? 'red' : u.relation === 'Reported' ? 'green' : 'neutral'} />
                </li>
              ))}
            </ul>
            {!closed && (
              <div className="flex flex-wrap gap-2">
                <PlainSelect aria-label="User" className="w-56" value={aff.username} onChange={(e) => setAff({ ...aff, username: e.target.value })}>
                  <option value="">Choose a user</option>
                  {state.users.filter((u) => u.role === 'general').map((u) => <option key={u.username} value={u.username}>{u.name}</option>)}
                </PlainSelect>
                <PlainSelect aria-label="Relation" className="w-36" value={aff.relation} onChange={(e) => setAff({ ...aff, relation: e.target.value as typeof aff.relation })}>
                  {['Received', 'Clicked', 'Reported'].map((k) => <option key={k}>{k}</option>)}
                </PlainSelect>
                <Button variant="secondary" disabled={!aff.username} onClick={() => { upd((x, s) => { x.affectedUsers.push({ ...aff }); addTimeline(s, c.id, me.username, `${aff.username} added as ${aff.relation.toLowerCase()}.`) }); setAff({ ...aff, username: '' }) }}>
                  Add user
                </Button>
              </div>
            )}
          </Card>
          <Card title="Timeline">
            <ol className="relative mb-4 space-y-4 border-l border-slate-200 pl-5">
              {[...c.timeline].reverse().map((t) => (
                <li key={t.id}>
                  <span className={`absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full ${t.auto ? 'bg-slate-300' : 'bg-accent-600'}`} aria-hidden />
                  <div className="text-xs text-slate-500">
                    {fmtDateTime(t.at)} · {t.by} {t.auto ? '' : '· note'}
                  </div>
                  <div className="text-sm">{t.text}</div>
                </li>
              ))}
            </ol>
            {!closed && (
              <>
                <TextArea name="note" label="Add a note" rows={3} value={noteForm.values.note} onChange={(e) => noteForm.set('note', e.target.value)} status={noteForm.status('note', noteErr)} base="Enter a note between 20 and 1,500 characters." error={noteErr} />
                <Button variant="secondary" onClick={() => { if (!noteForm.submit({ note: noteErr })) return; upd((_, s) => addTimeline(s, c.id, me.username, noteForm.values.note.trim(), false)); noteForm.reset({ note: '' }) }}>
                  Add Note
                </Button>
              </>
            )}
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Actions">
            <div className="grid gap-2">
              <Button variant="secondary" disabled={closed} onClick={() => nav(`/security/purge?${firstSender ? `sender=${encodeURIComponent(firstSender)}` : `domain=${encodeURIComponent(firstDomain)}`}`)}>
                <Trash2 className="h-4 w-4" /> Purge Emails
              </Button>
              <Button variant="secondary" disabled={closed || !firstDomain} onClick={() => nav(`/security/blocklist?add=${encodeURIComponent(firstDomain)}`)}>
                <Ban className="h-4 w-4" /> Block Domain
              </Button>
              <Button variant="secondary" disabled={closed || c.affectedUsers.length === 0} onClick={requestRemedial}>
                <Target className="h-4 w-4" /> Request Remedial Training
              </Button>
              <Button variant="secondary" disabled={closed} onClick={() => nav(`/security/bulletins/new?case=${c.id}`)}>
                <Megaphone className="h-4 w-4" /> Publish Bulletin
              </Button>
            </div>
          </Card>
          {!closed && (
            <Card title="Close investigation">
              {!closing ? (
                <Button variant="danger" className="w-full" onClick={() => setClosing(true)}>
                  <Lock className="h-4 w-4" /> Close Investigation
                </Button>
              ) : (
                <>
                  <TextArea name="resolution" label="Resolution summary" rows={5} value={closeForm.values.resolution} onChange={(e) => closeForm.set('resolution', e.target.value)} status={closeForm.status('resolution', resErr)} base="Summarize the resolution in 50 to 1,500 characters." error={resErr} counter={{ value: closeForm.values.resolution.length, max: 1500 }} />
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setClosing(false)}>Cancel</Button>
                    <Button variant="danger" onClick={() => closeForm.submit({ resolution: resErr }) && setConfirmClose(true)}>Close Investigation</Button>
                  </div>
                </>
              )}
            </Card>
          )}
        </div>
      </div>
      <ValidationSummaryDialog items={noteForm.summary?.items ?? closeForm.summary?.items ?? null} onClose={() => { noteForm.closeSummary(); closeForm.closeSummary() }} />
      <ConfirmDialog open={confirmClose} title="Close investigation" message={`Close ${c.id}? Linked reports will be marked Resolved and reporters notified.`} onCancel={() => setConfirmClose(false)} onConfirm={doClose} />
    </>
  )
}
