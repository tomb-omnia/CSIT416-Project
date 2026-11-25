// UC28 Publish Cyber Security Advisories: /advisories, /advisories/:id, /security/advisories/new and /edit/:id.
// The team spec (Joshua Draft) asks for title, threat details, recommended precautions, review, publish.
// Severity, audience, references, drafts, and acknowledgments are prototype extras kept from the
// earlier extrapolation.

import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, ExternalLink, Eye, PenSquare, Plus, ShieldAlert, X } from 'lucide-react'
import { useDemo, useMe, pushAudit, pushNotification } from '../../store/DemoStore'
import { Card, EmptyState, PageHeader } from '../../components/ui/Card'
import { Button, LinkButton } from '../../components/ui/Button'
import { Banner } from '../../components/ui/Banner'
import { LoadGate } from '../../components/ui/LoadGate'
import { SeverityChip, StatusBadge } from '../../components/ui/StatusBadge'
import { ConfirmDialog, MessageDialog, ValidationSummaryDialog } from '../../components/ui/Dialog'
import { FieldGroup, PlainInput, PlainSelect, TextArea, TextField } from '../../components/ui/RequirementField'
import { RichText, RichTextEditor } from '../../components/ui/RichText'
import { useForm } from '../../components/ui/useForm'
import * as V from '../../lib/validators'
import { fmtDate, nowIso, parseDateInput, toDateInput } from '../../lib/dates'
import type { Advisory, Role, Severity } from '../../store/types'

const SEVERITIES: Severity[] = ['Low', 'Medium', 'High', 'Critical']
const AUDIENCES: { label: string; roles: Role[] }[] = [
  { label: 'All Users', roles: ['general', 'trainer', 'officer', 'admin'] },
  { label: 'General Users', roles: ['general'] },
  { label: 'Training Coordinators', roles: ['trainer'] },
  { label: 'Cybersecurity Officers', roles: ['officer'] },
  { label: 'Site Administrators', roles: ['admin'] },
]

export function AdvisoriesPage() {
  const { state } = useDemo()
  const me = useMe()
  const [sev, setSev] = useState('')
  const [from, setFrom] = useState('')
  const officer = me.role === 'officer'
  const f = parseDateInput(from)
  const rows = state.advisories
    .filter((a) => (a.status === 'Published' || officer) && (!sev || a.severity === sev) && (!f || new Date(a.publishedAt ?? a.effectiveDate) >= f))
    .sort((a, b) => (b.publishedAt ?? '9').localeCompare(a.publishedAt ?? '9'))
  return (
    <>
      <PageHeader
        title="Security Advisories"
        uc="UC28"
        subtitle="Formal advisories about vulnerabilities, threats, and policy changes."
        actions={
          <>
            <LinkButton to="/bulletins" variant="secondary">Bulletins</LinkButton>
            {officer && <LinkButton to="/security/advisories/new"><Plus className="h-4 w-4" /> New Advisory</LinkButton>}
          </>
        }
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <div>
          <label htmlFor="adv-sev" className="mb-1 block text-xs font-medium text-slate-600">Severity</label>
          <PlainSelect id="adv-sev" className="w-40" value={sev} onChange={(e) => setSev(e.target.value)}>
            <option value="">All</option>
            {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
          </PlainSelect>
        </div>
        <div>
          <label htmlFor="adv-from" className="mb-1 block text-xs font-medium text-slate-600">Published since</label>
          <PlainInput id="adv-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyState>No advisories match these filters.</EmptyState>
      ) : (
        <div className="space-y-3">
          {rows.map((a) => (
            <Link key={a.id} to={a.status === 'Draft' ? `/security/advisories/edit/${a.id}` : `/advisories/${a.id}`} className="block rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-accent-500">
              <div className="flex flex-wrap items-center gap-2">
                <SeverityChip severity={a.severity} />
                {a.status === 'Draft' && <StatusBadge status="Draft" />}
                {a.requireAck && a.status === 'Published' && (a.acks.includes(me.username) ? <StatusBadge status="Acknowledged" tone="green" /> : <StatusBadge status="Acknowledgment required" tone="yellow" />)}
                <span className="text-xs text-slate-500">{a.publishedAt ? `Published ${fmtDate(a.publishedAt)}` : 'Not published'} · Effective {fmtDate(a.effectiveDate)}</span>
              </div>
              <h2 className="mt-2 text-lg font-semibold text-slate-900">{a.title}</h2>
              <p className="text-slate-600">{a.summary}</p>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}

function AdvisoryBody({ a }: { a: Advisory }) {
  return (
    <>
      <p className="text-lg text-slate-700">{a.summary}</p>
      <div className="mt-2 text-sm text-slate-500">Audience: {a.audience.join(', ')} · Effective {fmtDate(a.effectiveDate)}</div>
      <div className="mt-6">
        <RichText source={a.details} />
      </div>
      <h3 className="mt-6 text-lg font-semibold">Recommended actions</h3>
      <ul className="mt-2 space-y-1.5">
        {a.actions.filter(Boolean).map((x) => (
          <li key={x} className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-700" aria-hidden /> {x}
          </li>
        ))}
      </ul>
      {a.references.filter(Boolean).length > 0 && (
        <>
          <h3 className="mt-6 text-lg font-semibold">References</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {a.references.filter(Boolean).map((r) => (
              <li key={r}>
                <a href={r} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 break-all text-accent-700 underline">
                  {r} <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}

export function AdvisoryPage() {
  const { id } = useParams()
  const { state, mutate, toast } = useDemo()
  const me = useMe()
  const a = state.advisories.find((x) => x.id === id)
  if (!a || (a.status !== 'Published' && me.role !== 'officer'))
    return (
      <>
        <PageHeader title="Advisory" back={{ to: '/advisories', label: 'Advisories' }} />
        <Banner tone="error" title="This advisory is not available." />
      </>
    )
  const acked = a.acks.includes(me.username)
  return (
    <>
      <PageHeader title={a.title} uc="UC28" back={{ to: '/advisories', label: 'Advisories' }} actions={<SeverityChip severity={a.severity} />} subtitle={`Published ${fmtDate(a.publishedAt)} by ${a.author}`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Card>
          <AdvisoryBody a={a} />
        </Card>
        <div className="space-y-4">
          {a.requireAck && (
            <Card title="Acknowledgment">
              {acked ? (
                <p className="flex items-center gap-2 text-green-700"><CheckCircle2 className="h-4 w-4" /> You have acknowledged this advisory.</p>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => {
                    mutate((s) => s.advisories.find((x) => x.id === a.id)?.acks.push(me.username))
                    toast('Acknowledgment recorded.')
                  }}
                >
                  I have read this advisory
                </Button>
              )}
              {me.role === 'officer' && <p className="mt-3 text-sm text-slate-600">{a.acks.length} of {state.users.filter((u) => u.status === 'Active').length} active users have acknowledged.</p>}
            </Card>
          )}
          {me.role === 'officer' && (
            <LinkButton to={`/security/advisories/edit/${a.id}`} variant="secondary" className="w-full">
              <PenSquare className="h-4 w-4" /> Edit advisory
            </LinkButton>
          )}
        </div>
      </div>
    </>
  )
}

export function AdvisoryEditorPage() {
  const { id } = useParams()
  const { state, mutate, simulate, toast } = useDemo()
  const me = useMe()
  const nav = useNavigate()
  const existing = state.advisories.find((a) => a.id === id)
  const form = useForm({
    title: existing?.title ?? '',
    severity: existing?.severity ?? ('Medium' as Severity),
    audience: existing?.audience ?? ['All Users'],
    summary: existing?.summary ?? '',
    details: existing?.details ?? '',
    actions: existing?.actions ?? [''],
    references: existing?.references ?? [],
    effective: existing ? existing.effectiveDate.slice(0, 10) : toDateInput(new Date()),
    requireAck: existing?.requireAck ?? false,
  })
  const v = form.values
  const refErr = v.references.map(V.optionalUrl).find(Boolean) ?? null
  const errors = {
    title: V.lengthBetween('Title', v.title, 5, 120),
    audience: v.audience.length ? null : 'Select at least one audience.',
    summary: V.lengthBetween('Summary', v.summary, 20, 500),
    details: V.lengthBetween('Details', v.details, 20, 20000),
    actions: v.actions.some((x) => x.trim()) ? null : 'Add at least one recommended action.',
    references: refErr,
    effective: parseDateInput(v.effective) ? null : 'Select an effective date.',
  }
  const [preview, setPreview] = useState(false)
  const [confirm, setConfirm] = useState(false)
  // Holds the status of a failed save so "Try Again" repeats it (UC28 11A1, 11A2).
  const [failed, setFailed] = useState<Advisory['status'] | null>(null)
  const labels = { title: 'Title', audience: 'Audience', summary: 'Summary', details: 'Details', actions: 'Recommended actions', references: 'References', effective: 'Effective date' }

  const build = (status: Advisory['status']): Advisory => ({
    id: existing?.id ?? `ADV-${Math.floor(30 + Math.random() * 900)}`,
    title: v.title.trim(), severity: v.severity, audience: v.audience, summary: v.summary.trim(), details: v.details,
    actions: v.actions.map((x) => x.trim()).filter(Boolean), references: v.references.map((x) => x.trim()).filter(Boolean),
    effectiveDate: new Date(`${v.effective}T00:00:00`).toISOString(), status, requireAck: v.requireAck, acks: existing?.acks ?? [],
    publishedAt: status === 'Published' ? (existing?.publishedAt ?? nowIso()) : null, author: existing?.author ?? me.username,
  })
  const save = async (status: Advisory['status']) => {
    if ((await simulate('save')) !== 'ok') {
      setFailed(status)
      return false
    }
    const adv = build(status)
    const roles = AUDIENCES.filter((a) => v.audience.includes(a.label)).flatMap((a) => a.roles)
    const notified = status === 'Published' ? (await simulate('notify')) === 'ok' : true
    mutate((s) => {
      const i = s.advisories.findIndex((x) => x.id === adv.id)
      if (i >= 0) s.advisories[i] = adv
      else s.advisories.unshift(adv)
      if (status === 'Published') {
        if (notified) pushNotification(s, s.users.filter((u) => roles.includes(u.role) && u.status === 'Active').map((u) => u.username), `New ${adv.severity.toLowerCase()} severity advisory: ${adv.title}`, `/advisories/${adv.id}`)
        pushAudit(s, me, 'Advisory Published', adv.id, { newValue: adv.title })
      }
    })
    if (status === 'Published') {
      toast(notified ? 'Advisory published.' : 'Advisory published, but Some Notifications Could Not Be Sent.', notified ? 'success' : 'error')
      nav(`/advisories/${adv.id}`)
    } else {
      toast('Draft saved.')
      nav('/advisories')
    }
    return true
  }

  const listEditor = (key: 'actions' | 'references', label: string, placeholder: string) => (
    <div className="space-y-2">
      {v[key].map((x, i) => (
        <div key={i} className="flex gap-2">
          <PlainInput id={i === 0 ? `f-${key}` : undefined} aria-label={`${label} ${i + 1}`} placeholder={placeholder} value={x} onChange={(e) => form.set(key, v[key].map((y, j) => (j === i ? e.target.value : y)))} />
          <Button variant="ghost" aria-label={`Remove ${label} ${i + 1}`} onClick={() => form.set(key, v[key].filter((_, j) => j !== i))}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button size="sm" variant="secondary" onClick={() => form.set(key, [...v[key], ''])}>
        <Plus className="h-3.5 w-3.5" /> Add {label.toLowerCase()}
      </Button>
    </div>
  )

  return (
    <>
      <PageHeader
        title={existing ? 'Edit Advisory' : 'New Advisory'}
        uc="UC28"
        back={{ to: '/advisories', label: 'Advisories' }}
        subtitle="A formal advisory about a vulnerability, threat, or policy change."
        actions={<Button variant="secondary" onClick={() => setPreview((p) => !p)}>{preview ? <><PenSquare className="h-4 w-4" /> Edit</> : <><Eye className="h-4 w-4" /> Preview</>}</Button>}
      />
      <LoadGate what="advisory creation form">
      {preview ? (
        <Card title={<span className="flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> {v.title || 'Untitled advisory'} <SeverityChip severity={v.severity} /></span>}>
          <AdvisoryBody a={build('Draft')} />
        </Card>
      ) : (
        <Card>
          <div className="max-w-3xl">
            <TextField name="title" label="Title" value={v.title} onChange={(e) => form.set('title', e.target.value)} status={form.status('title', errors.title)} base="Enter a title between 5 and 120 characters." error={errors.title} counter={{ value: v.title.length, max: 120 }} />
            <FieldGroup name="severity" label="Severity" status="neutral" base="">
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="l-severity">
                {SEVERITIES.map((s) => (
                  <button key={s} role="radio" aria-checked={v.severity === s} onClick={() => form.set('severity', s)} className={`rounded-md border-2 p-1 ${v.severity === s ? 'border-accent-600' : 'border-transparent'}`}>
                    <SeverityChip severity={s} />
                  </button>
                ))}
              </div>
            </FieldGroup>
            <FieldGroup name="audience" label="Affected audience" status={form.status('audience', errors.audience)} base="Select who this advisory is for." error={errors.audience}>
              <div className="flex flex-wrap gap-4">
                {AUDIENCES.map((a, i) => (
                  <label key={a.label} className="flex items-center gap-2 text-sm">
                    <input id={i === 0 ? 'f-audience' : undefined} type="checkbox" className="h-4 w-4 accent-accent-700" checked={v.audience.includes(a.label)} onChange={(e) => form.set('audience', e.target.checked ? [...v.audience, a.label] : v.audience.filter((x) => x !== a.label))} />
                    {a.label}
                  </label>
                ))}
              </div>
            </FieldGroup>
            <TextArea name="summary" label="Summary" rows={3} value={v.summary} onChange={(e) => form.set('summary', e.target.value)} status={form.status('summary', errors.summary)} base="Summarize in 20 to 500 characters." error={errors.summary} counter={{ value: v.summary.length, max: 500 }} />
            <FieldGroup name="details" label="Details" status={form.status('details', errors.details)} base="Explain the issue. Use the toolbar for headings, bold, lists, and links." error={errors.details}>
              <RichTextEditor id="f-details" value={v.details} onChange={(x) => form.set('details', x)} rows={8} />
            </FieldGroup>
            <FieldGroup name="actions" label="Recommended actions" status={form.status('actions', errors.actions)} base="Add one or more checklist items." error={errors.actions}>
              {listEditor('actions', 'Action', 'For example: Update your browser')}
            </FieldGroup>
            <FieldGroup name="references" label="Reference links (optional)" status={form.status('references', errors.references)} base="Links must be valid URLs." error={errors.references}>
              {listEditor('references', 'Reference', 'https://')}
            </FieldGroup>
            <TextField name="effective" label="Effective date" type="date" value={v.effective} onChange={(e) => form.set('effective', e.target.value)} status={form.status('effective', errors.effective)} base="Select the date this advisory takes effect." error={errors.effective} />
            <label className="mb-6 flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4 accent-accent-700" checked={v.requireAck} onChange={(e) => form.set('requireAck', e.target.checked)} />
              Require acknowledgment ("I have read this advisory")
            </label>
          </div>
        </Card>
      )}
      </LoadGate>
      <div className="mt-6 flex gap-3">
        <Button variant="secondary" onClick={() => form.submit({ title: errors.title }, labels) && save('Draft')}>Save Draft</Button>
        {!preview && <Button variant="secondary" onClick={() => setPreview(true)}><Eye className="h-4 w-4" /> Preview</Button>}
        <Button onClick={() => { if (form.submit(errors, labels)) setConfirm(true); else setPreview(false) }}>Publish Advisory</Button>
        {/* UC28 3A1 / 9A1: cancel discards pending changes and returns to advisory management. */}
        <Button variant="ghost" onClick={() => nav('/advisories')}>Cancel</Button>
      </div>
      <ValidationSummaryDialog items={form.summary?.items ?? null} onClose={form.closeSummary} />
      <ConfirmDialog open={confirm} title="Publish advisory" message={`Publish "${v.title}" to ${v.audience.join(', ')}?`} onCancel={() => setConfirm(false)} onConfirm={() => { setConfirm(false); save('Published') }} />
      <MessageDialog
        open={!!failed}
        onClose={() => setFailed(null)}
        onRetry={() => { const st = failed!; setFailed(null); save(st) }}
        tone="error"
        title={failed === 'Published' ? 'Advisory could not be published. Please try again.' : 'Advisory was not saved. Please try again.'}
      />
    </>
  )
}
