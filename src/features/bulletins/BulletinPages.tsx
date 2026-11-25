// UC25 Publish Phishing/Scam Bulletin Notice: /bulletins (all roles) and /security/bulletins/new (CSO).
// The team spec (Joshua Draft) asks for title, description, review, publish. Threat type, samples,
// expiration, dashboard banner, and Retire are prototype extras kept from the earlier extrapolation.

import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Eye, Megaphone, PenSquare } from 'lucide-react'
import { useDemo, useMe, pushAudit, pushNotification } from '../../store/DemoStore'
import { Card, EmptyState, PageHeader } from '../../components/ui/Card'
import { Button, LinkButton } from '../../components/ui/Button'
import { Banner } from '../../components/ui/Banner'
import { LoadGate } from '../../components/ui/LoadGate'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { ConfirmDialog, MessageDialog, ValidationSummaryDialog } from '../../components/ui/Dialog'
import { FieldGroup, SelectField, TextArea, TextField } from '../../components/ui/RequirementField'
import { useForm } from '../../components/ui/useForm'
import * as V from '../../lib/validators'
import { daysAhead, endOfDay, fmtDate, nowIso, parseDateInput, toDateInput } from '../../lib/dates'
import { defang } from '../../store/mockRules'
import type { Bulletin } from '../../store/types'

const THREATS = ['Email', 'Text/SMS', 'Phone', 'Social Media', 'Other']
const isActive = (b: Bulletin) => !b.draft && !b.retired && new Date(b.expiresAt).getTime() > Date.now()

function BulletinCard({ b, onRetire }: { b: Bulletin; onRetire?: () => void }) {
  const active = isActive(b)
  return (
    <article id={b.id} className={`scroll-mt-20 rounded-lg border bg-white p-5 shadow-sm ${active ? 'border-l-4 border-yellow-400 border-l-yellow-500' : 'border-slate-200'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <AlertTriangle className="h-4 w-4 text-yellow-600" aria-hidden /> {b.threatType} scam alert
          </div>
          <h2 className="mt-1 text-lg font-semibold">{b.headline}</h2>
          <div className="text-xs text-slate-500">
            Published {fmtDate(b.publishedAt)} by {b.publishedBy} · {active ? `Expires ${fmtDate(b.expiresAt)}` : b.retired ? 'Retired' : `Expired ${fmtDate(b.expiresAt)}`}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={active ? 'Active' : b.retired ? 'Retired' : 'Expired'} />
          {active && onRetire && (
            <Button size="sm" variant="secondary" onClick={onRetire}>
              Retire Bulletin
            </Button>
          )}
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold">What to look for</h3>
          <p className="mt-1 text-slate-700">{b.lookFor}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">What to do</h3>
          <p className="mt-1 text-slate-700">{b.whatToDo}</p>
        </div>
      </div>
      {(b.sampleSender || b.sampleSubject || b.sampleLink) && (
        <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm">
          <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Sample (defanged, do not visit)</div>
          {b.sampleSender && <div>Sender: <span className="font-mono">{defang(b.sampleSender)}</span></div>}
          {b.sampleSubject && <div>Subject: {b.sampleSubject}</div>}
          {b.sampleLink && <div>Link: <span className="font-mono">{defang(b.sampleLink)}</span></div>}
        </div>
      )}
    </article>
  )
}

export function BulletinsPage() {
  const { state, mutate } = useDemo()
  const me = useMe()
  const [retire, setRetire] = useState<Bulletin | null>(null)
  const sorted = [...state.bulletins].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  const active = sorted.filter(isActive)
  const archived = sorted.filter((b) => !b.draft && !isActive(b))
  const officer = me.role === 'officer'
  const drafts = officer ? state.bulletins.filter((b) => b.draft) : []
  return (
    <>
      <PageHeader
        title="Bulletins"
        uc="UC25"
        subtitle="Short, urgent alerts about active phishing and scam campaigns."
        actions={
          <>
            <LinkButton to="/advisories" variant="secondary">Advisories</LinkButton>
            {officer && <LinkButton to="/security/bulletins/new"><Megaphone className="h-4 w-4" /> Publish Bulletin</LinkButton>}
          </>
        }
      />
      {drafts.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Drafts</h2>
          <ul className="mb-8 divide-y rounded-lg border border-slate-200 bg-white">
            {drafts.map((b) => (
              <li key={b.id}>
                <Link to={`/security/bulletins/edit/${b.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                  <span>
                    <span className="font-medium text-accent-700">{b.headline}</span>
                    <span className="ml-2 text-xs text-slate-500">Saved {fmtDate(b.publishedAt)} by {b.publishedBy}</span>
                  </span>
                  <StatusBadge status="Draft" />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Active</h2>
      <div className="space-y-4">
        {active.length === 0 ? <EmptyState>No active bulletins.</EmptyState> : active.map((b) => <BulletinCard key={b.id} b={b} onRetire={officer ? () => setRetire(b) : undefined} />)}
      </div>
      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">Archived</h2>
      <div className="space-y-4 opacity-90">{archived.length === 0 ? <EmptyState>No archived bulletins.</EmptyState> : archived.map((b) => <BulletinCard key={b.id} b={b} />)}</div>
      <ConfirmDialog
        open={!!retire}
        title="Retire bulletin"
        message={`Retire "${retire?.headline}"? It will be removed from dashboards and moved to the archive.`}
        onCancel={() => setRetire(null)}
        onConfirm={() => {
          const id = retire!.id
          mutate((s) => {
            const b = s.bulletins.find((x) => x.id === id)
            if (b) b.retired = true
            pushAudit(s, me, 'Bulletin Retired', id)
          })
          setRetire(null)
        }}
      />
    </>
  )
}

export function NewBulletinPage() {
  const { state, mutate, simulate, toast } = useDemo()
  const me = useMe()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const { id: draftId } = useParams()
  const existing = state.bulletins.find((b) => b.id === draftId && b.draft)
  const kase = state.investigations.find((c) => c.id === params.get('case'))
  const form = useForm(
    existing
      ? { headline: existing.headline, threatType: existing.threatType, lookFor: existing.lookFor, whatToDo: existing.whatToDo, sampleSender: existing.sampleSender, sampleSubject: existing.sampleSubject, sampleLink: existing.sampleLink, expires: existing.expiresAt.slice(0, 10), banner: existing.banner }
      : {
          headline: kase ? kase.title : '',
          threatType: 'Email',
          lookFor: kase ? kase.description : '',
          whatToDo: '',
          sampleSender: kase?.indicators.find((i) => i.kind === 'Sender')?.value ?? '',
          sampleSubject: '',
          sampleLink: kase?.indicators.find((i) => i.kind === 'URL')?.value ?? '',
          expires: toDateInput(new Date(daysAhead(14))),
          banner: true,
        },
  )
  const v = form.values
  const exp = parseDateInput(v.expires)
  const errors = {
    headline: V.lengthBetween('Headline', v.headline, 5, 100),
    lookFor: V.lengthBetween('What to look for', v.lookFor, 20, 1000),
    whatToDo: V.lengthBetween('What to do', v.whatToDo, 20, 1000),
    sampleLink: V.optionalUrl(v.sampleLink),
    expires: !exp ? 'Select an expiration date.' : endOfDay(exp).getTime() <= Date.now() ? 'The expiration date must be in the future.' : exp.getTime() > Date.now() + 30 * 86_400_000 ? 'The expiration date must be within 30 days.' : null,
  }
  const [preview, setPreview] = useState(false)
  const [confirm, setConfirm] = useState(false)
  // Holds which action failed so "Try Again" repeats it (UC25 10A1, 10A2).
  const [failed, setFailed] = useState<'publish' | 'draft' | null>(null)

  const draft: Bulletin = { id: 'preview', headline: v.headline, threatType: v.threatType, lookFor: v.lookFor, whatToDo: v.whatToDo, sampleSender: v.sampleSender, sampleSubject: v.sampleSubject, sampleLink: v.sampleLink, expiresAt: exp ? endOfDay(exp).toISOString() : nowIso(), banner: v.banner, publishedAt: nowIso(), publishedBy: me.username, retired: false }

  const newId = () => `BUL-${Math.floor(20 + Math.random() * 900)}`

  /** UC25 8A1: save without publishing. `canceled` is the Cancel-on-review path. */
  const saveDraft = async (canceled = false) => {
    // ASSUMPTION: like advisory and article drafts, a bulletin draft only needs a valid headline.
    if (!form.submit({ headline: errors.headline }, { headline: 'Headline' })) return setPreview(false)
    if ((await simulate('save')) !== 'ok') return setFailed('draft')
    const id = existing?.id ?? newId()
    mutate((s) => {
      s.bulletins = s.bulletins.filter((b) => b.id !== id)
      s.bulletins.unshift({ ...draft, id, draft: true, publishedAt: nowIso() })
    })
    toast(canceled ? 'Publication canceled. The bulletin was saved as a draft.' : 'Draft saved.')
    nav('/bulletins')
  }

  const publish = async () => {
    setConfirm(false)
    if ((await simulate('save')) !== 'ok') return setFailed('publish')
    const notified = (await simulate('notify')) === 'ok'
    const id = existing?.id ?? newId()
    mutate((s) => {
      s.bulletins = s.bulletins.filter((b) => b.id !== id)
      s.bulletins.unshift({ ...draft, id })
      if (notified) pushNotification(s, s.users.filter((u) => u.status === 'Active').map((u) => u.username), `New scam bulletin: ${v.headline}`, `/bulletins#${id}`)
      pushAudit(s, me, 'Bulletin Published', id, { newValue: v.headline })
      if (kase) s.investigations.find((c) => c.id === kase.id)?.timeline.push({ id: `t-${id}`, at: nowIso(), by: me.username, text: `Bulletin ${id} published.`, auto: true })
    })
    toast(notified ? 'Bulletin published.' : 'Bulletin published, but Some Notifications Could Not Be Sent.', notified ? 'success' : 'error')
    nav('/bulletins')
  }

  if (draftId && !existing)
    return (
      <>
        <PageHeader title="Edit Draft Bulletin" back={{ to: '/bulletins', label: 'Bulletins' }} />
        <Banner tone="error" title="This draft is no longer available." />
      </>
    )

  return (
    <>
      <PageHeader title={existing ? 'Edit Draft Bulletin' : 'Publish Bulletin'} uc="UC25" back={{ to: '/bulletins', label: 'Bulletins' }} subtitle="A short, urgent alert about an active campaign targeting the organization." actions={<Button variant="secondary" onClick={() => setPreview((p) => !p)}>{preview ? <><PenSquare className="h-4 w-4" /> Edit</> : <><Eye className="h-4 w-4" /> Preview</>}</Button>} />
      <LoadGate what="bulletin creation form">
      {kase && <Banner tone="info" className="mb-4" title={`Prefilled from investigation ${kase.id}`} />}
      {preview ? (
        <>
          {v.banner && <Banner tone="warning" className="mb-4" title={`Active bulletin: ${v.headline || 'Headline'}`}>{v.lookFor}</Banner>}
          <BulletinCard b={draft} />
          <div className="mt-6 flex gap-3">
            <Button onClick={() => form.submit(errors) ? setConfirm(true) : setPreview(false)}>Publish Bulletin</Button>
            <Button variant="secondary" onClick={() => setPreview(false)}>Back to edit</Button>
            {/* UC25 8A1: canceling before publishing saves the bulletin as a draft. */}
            <Button variant="ghost" onClick={() => saveDraft(true)}>Cancel</Button>
          </div>
        </>
      ) : (
        <Card>
          <div className="max-w-3xl">
            <TextField name="headline" label="Headline" value={v.headline} onChange={(e) => form.set('headline', e.target.value)} status={form.status('headline', errors.headline)} base="Enter a headline between 5 and 100 characters." error={errors.headline} counter={{ value: v.headline.length, max: 100 }} />
            <SelectField name="threatType" label="Threat type" value={v.threatType} onChange={(e) => form.set('threatType', e.target.value)} status="neutral" base="">
              {THREATS.map((t) => <option key={t}>{t}</option>)}
            </SelectField>
            <TextArea name="lookFor" label="What to look for" rows={3} value={v.lookFor} onChange={(e) => form.set('lookFor', e.target.value)} status={form.status('lookFor', errors.lookFor)} base="Describe the warning signs in 20 to 1,000 characters." error={errors.lookFor} counter={{ value: v.lookFor.length, max: 1000 }} />
            <TextArea name="whatToDo" label="What to do" rows={3} value={v.whatToDo} onChange={(e) => form.set('whatToDo', e.target.value)} status={form.status('whatToDo', errors.whatToDo)} base="Tell users what to do in 20 to 1,000 characters." error={errors.whatToDo} counter={{ value: v.whatToDo.length, max: 1000 }} />
            <fieldset className="mb-5 rounded-md border border-slate-200 p-4">
              <legend className="px-1 text-sm font-medium">Sample (optional, shown defanged)</legend>
              <div className="grid gap-x-4 md:grid-cols-3">
                <TextField name="sampleSender" label="Sender" value={v.sampleSender} onChange={(e) => form.set('sampleSender', e.target.value)} status="neutral" />
                <TextField name="sampleSubject" label="Subject" value={v.sampleSubject} onChange={(e) => form.set('sampleSubject', e.target.value)} status="neutral" />
                <TextField name="sampleLink" label="Link" value={v.sampleLink} onChange={(e) => form.set('sampleLink', e.target.value)} status={form.status('sampleLink', errors.sampleLink)} error={errors.sampleLink} />
              </div>
            </fieldset>
            <TextField name="expires" label="Expiration date" type="date" min={toDateInput(new Date())} value={v.expires} onChange={(e) => form.set('expires', e.target.value)} status={form.status('expires', errors.expires)} base="Choose a future date within 30 days." error={errors.expires} />
            <FieldGroup name="banner" label="Dashboard banner" status="neutral" base="">
              <label className="flex items-center gap-2">
                <input id="f-banner" type="checkbox" className="h-4 w-4 accent-accent-700" checked={v.banner} onChange={(e) => form.set('banner', e.target.checked)} />
                Show as a banner on every user's dashboard until it expires or is retired
              </label>
            </FieldGroup>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => saveDraft()}>Save Draft</Button>
              <Button variant="secondary" onClick={() => setPreview(true)}>Preview</Button>
              <Button onClick={() => form.submit(errors, { headline: 'Headline', lookFor: 'What to look for', whatToDo: 'What to do', sampleLink: 'Sample link', expires: 'Expiration date' }) && setConfirm(true)}>Publish Bulletin</Button>
              {/* UC25 3A1: cancel discards the changes and returns to bulletin management. */}
              <Button variant="ghost" onClick={() => nav('/bulletins')}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}
      </LoadGate>
      <ValidationSummaryDialog items={form.summary?.items ?? null} onClose={form.closeSummary} />
      <ConfirmDialog open={confirm} title="Publish bulletin" message="Publish this bulletin to all users?" onCancel={() => setConfirm(false)} onConfirm={publish} />
      <MessageDialog
        open={!!failed}
        onClose={() => setFailed(null)}
        onRetry={() => { const f = failed; setFailed(null); if (f === 'draft') saveDraft(); else publish() }}
        tone="error"
        title={failed === 'draft' ? 'The bulletin was not saved. Please try again.' : 'Bulletin could not be published. Please try again.'}
      />
    </>
  )
}
