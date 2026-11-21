// UC21 Create Phishing Test (list + form) and the awareness landing page shown to recipients who click.

import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BarChart3, ExternalLink, Plus, ShieldCheck } from 'lucide-react'
import { useDemo, useMe, pushAudit } from '../../store/DemoStore'
import { Card, PageHeader } from '../../components/ui/Card'
import { Button, LinkButton } from '../../components/ui/Button'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { ConfirmDialog, MessageDialog, ValidationSummaryDialog } from '../../components/ui/Dialog'
import { FieldGroup, TextField } from '../../components/ui/RequirementField'
import { Steps } from '../../components/ui/Wizard'
import { useForm } from '../../components/ui/useForm'
import * as V from '../../lib/validators'
import { REQ } from '../../lib/validators'
import { fmtDateTime, nowIso, toDateTimeInput } from '../../lib/dates'
import { Logo } from '../../components/layout/AppShell'
import type { PhishingTest } from '../../store/types'

export function PhishingTestListPage() {
  const { state } = useDemo()
  const me = useMe()
  const nav = useNavigate()
  const recipients = (t: PhishingTest) => new Set(t.groupIds.flatMap((g) => state.groups.find((x) => x.id === g)?.members ?? [])).size
  return (
    <>
      <PageHeader
        title="Phishing Tests"
        uc="UC21"
        subtitle="Simulated phishing emails that measure and improve security awareness."
        actions={
          me.role === 'officer' && (
            <LinkButton to="/phishing-tests/new">
              <Plus className="h-4 w-4" /> Create Phishing Test
            </LinkButton>
          )
        }
      />
      <DataTable
        rows={state.tests}
        rowKey={(t) => t.id}
        empty="No phishing tests yet."
        initialSort={{ key: 'send', dir: 'desc' }}
        onRowClick={(t) => t.status === 'Sent' && nav(`/phishing-tests/${t.id}/results`)}
        columns={[
          { key: 'name', header: 'Test name', render: (t) => <span className="font-medium">{t.name}</span>, sort: (t) => t.name },
          { key: 'tpl', header: 'Template', render: (t) => state.templates.find((x) => x.id === t.templateId)?.name },
          { key: 'rec', header: 'Recipients', render: recipients },
          { key: 'send', header: 'Send time', render: (t) => fmtDateTime(t.sendAt), sort: (t) => t.sendAt },
          { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} />, sort: (t) => t.status },
          {
            key: 'act',
            header: <span className="sr-only">Actions</span>,
            render: (t) =>
              t.status === 'Sent' ? (
                <span className="flex gap-3 text-sm">
                  <Link to={`/phishing-tests/${t.id}/results`} className="inline-flex items-center gap-1 text-accent-700 hover:underline" onClick={(e) => e.stopPropagation()}>
                    <BarChart3 className="h-3.5 w-3.5" /> Results
                  </Link>
                  <Link to={`/aware/${t.id}`} className="inline-flex items-center gap-1 text-accent-700 hover:underline" onClick={(e) => e.stopPropagation()}>
                    <ExternalLink className="h-3.5 w-3.5" /> Landing page
                  </Link>
                </span>
              ) : null,
          },
        ]}
      />
    </>
  )
}

export function CreatePhishingTestPage() {
  const { state, mutate, simulate, toast } = useDemo()
  const me = useMe()
  const nav = useNavigate()
  const form = useForm({ name: '', templateId: '', subject: '', groupIds: [] as string[], mode: 'now' as 'now' | 'schedule', sendAt: '' })
  const v = form.values
  const activeMembers = (ids: string[]) => new Set(ids.flatMap((g) => state.groups.find((x) => x.id === g)?.members ?? []).filter((u) => state.users.find((x) => x.username === u)?.status === 'Active'))
  const recipients = activeMembers(v.groupIds)
  const errors = {
    name: V.testName(v.name, state.tests.map((t) => t.name)),
    templateId: v.templateId ? null : 'Please select a template.',
    subject: V.testSubject(v.subject),
    groupIds: v.groupIds.length === 0 ? 'Select at least one user group' : recipients.size === 0 ? 'The selected groups contain no active users.' : null,
    sendAt: v.mode === 'now' ? null : V.sendTime(v.sendAt),
  }
  const order = ['name', 'templateId', 'subject', 'groupIds', 'sendAt'] as const
  const firstFail = order.findIndex((k) => errors[k])
  const reached = firstFail === -1 ? order.length : firstFail
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [dialog, setDialog] = useState<null | 'failed' | 'draft'>(null)
  const tpl = state.templates.find((t) => t.id === v.templateId)

  const launch = () => {
    if (!form.submit(errors, { name: 'Test name', templateId: 'Template', subject: 'Subject line', groupIds: 'Recipients', sendAt: 'Send time' })) return
    setConfirm(true)
  }
  const create = async () => {
    setBusy(true)
    const saved = await simulate('save')
    if (saved !== 'ok') {
      setBusy(false)
      setConfirm(false)
      return setDialog('failed')
    }
    const emailOk = v.mode === 'now' ? (await simulate('email')) === 'ok' : true
    setBusy(false)
    setConfirm(false)
    const id = `PT-${Math.floor(400 + Math.random() * 500)}`
    const status: PhishingTest['status'] = !emailOk ? 'Draft' : v.mode === 'now' ? 'Sent' : 'Scheduled'
    mutate((s) => {
      s.tests.unshift({
        id, name: v.name.trim(), templateId: v.templateId, subject: v.subject, groupIds: v.groupIds, status,
        sendAt: v.mode === 'now' ? nowIso() : new Date(v.sendAt).toISOString(), createdBy: me.username, createdAt: nowIso(),
        results: status === 'Sent' ? [...recipients].map((u) => ({ username: u, received: true, opened: false, clicked: false, reported: false })) : [], summaries: [],
      })
      pushAudit(s, me, 'Phishing Test Created', v.name.trim(), { newValue: `${status}, ${recipients.size} recipients` })
    })
    if (!emailOk) return setDialog('draft')
    toast(v.mode === 'now' ? `${recipients.size} recipients have received the test.` : `Phishing test created. ${recipients.size} recipients will receive the test.`)
    nav('/phishing-tests')
  }

  return (
    <>
      <PageHeader title="Create Phishing Test" uc="UC21" back={{ to: '/phishing-tests', label: 'Phishing Tests' }} />
      <Steps steps={['Name', 'Template', 'Subject', 'Recipients', 'Send time']} current={Math.min(reached, 4)} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <TextField name="name" label="Test name" value={v.name} onChange={(e) => form.set('name', e.target.value)} status={form.status('name', errors.name)} base={REQ.testName} error={errors.name} counter={{ value: v.name.length, max: 60 }} />
          {(reached >= 1 || form.touched.templateId) && (
            <FieldGroup name="templateId" label="Template" status={form.status('templateId', errors.templateId)} base={REQ.template} error={errors.templateId}>
              <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-labelledby="l-templateId">
                {state.templates.map((t, i) => (
                  <button
                    key={t.id}
                    id={i === 0 ? 'f-templateId' : undefined}
                    role="radio"
                    aria-checked={v.templateId === t.id}
                    onClick={() => {
                      form.set('templateId', t.id)
                      form.set('subject', t.subject)
                    }}
                    className={`rounded-md border-2 px-3 py-2 text-left ${v.templateId === t.id ? 'border-accent-600 bg-accent-50' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-slate-500">From: {t.fromName}</div>
                  </button>
                ))}
              </div>
            </FieldGroup>
          )}
          {(reached >= 2 || form.touched.subject) && <TextField name="subject" label="Subject line" value={v.subject} onChange={(e) => form.set('subject', e.target.value)} status={form.status('subject', errors.subject)} base={REQ.testSubject} error={errors.subject} counter={{ value: v.subject.length, max: 150 }} />}
          {(reached >= 3 || form.touched.groupIds) && (
            <FieldGroup name="groupIds" label="Recipients (user groups)" status={form.status('groupIds', errors.groupIds)} base={REQ.groups} error={errors.groupIds} hint={`Total recipients: ${recipients.size} active users`}>
              <div className="grid gap-1 sm:grid-cols-2">
                {state.groups.map((g, i) => {
                  const act = activeMembers([g.id]).size
                  return (
                    <label key={g.id} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-slate-50">
                      <input
                        id={i === 0 ? 'f-groupIds' : undefined}
                        type="checkbox"
                        className="h-4 w-4 accent-accent-700"
                        checked={v.groupIds.includes(g.id)}
                        onChange={(e) => form.set('groupIds', e.target.checked ? [...v.groupIds, g.id] : v.groupIds.filter((x) => x !== g.id))}
                      />
                      {g.name} <span className="text-xs text-slate-500">({act} active)</span>
                    </label>
                  )
                })}
              </div>
            </FieldGroup>
          )}
          {(reached >= 4 || form.touched.sendAt) && (
            <FieldGroup name="sendAt" label="Send time" status={v.mode === 'now' ? (form.touched.mode ? 'ok' : 'neutral') : form.status('sendAt', errors.sendAt)} base={REQ.sendTime} error={errors.sendAt}>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2">
                  <input type="radio" name="mode" className="h-4 w-4 accent-accent-700" checked={v.mode === 'now'} onChange={() => form.set('mode', 'now')} /> Send Now
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="mode" className="h-4 w-4 accent-accent-700" checked={v.mode === 'schedule'} onChange={() => form.set('mode', 'schedule')} /> Schedule
                </label>
                {v.mode === 'schedule' && (
                  <input id="f-sendAt" type="datetime-local" min={toDateTimeInput(new Date())} value={v.sendAt} onChange={(e) => form.set('sendAt', e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5" aria-label="Scheduled date and time" />
                )}
              </div>
            </FieldGroup>
          )}
          <Button onClick={launch}>Launch Test</Button>
        </Card>
        <Card title="Template preview">
          {tpl ? (
            <div className="text-sm">
              <div className="text-slate-500">From: {tpl.fromName}</div>
              <div className="font-semibold">{v.subject || tpl.subject}</div>
              <p className="mt-3 text-slate-700">{tpl.body}</p>
              <span className="mt-3 inline-block rounded bg-accent-700 px-3 py-1.5 text-white">Open link</span>
              <p className="mt-4 text-xs text-slate-500">Marked internally as a test. No credentials or personal data are collected. Clicking shows the awareness page.</p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Select a template to preview it.</p>
          )}
        </Card>
      </div>
      <ValidationSummaryDialog items={form.summary?.items ?? null} onClose={form.closeSummary} />
      <ConfirmDialog
        open={confirm}
        busy={busy}
        title="Launch phishing test?"
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        onCancel={() => setConfirm(false)}
        onConfirm={create}
        message={
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-slate-500">Test name</dt>
            <dd>{v.name}</dd>
            <dt className="text-slate-500">Template</dt>
            <dd>{tpl?.name}</dd>
            <dt className="text-slate-500">Recipients</dt>
            <dd>{recipients.size}</dd>
            <dt className="text-slate-500">Send time</dt>
            <dd>{v.mode === 'now' ? 'Now' : fmtDateTime(v.sendAt)}</dd>
          </dl>
        }
      />
      <MessageDialog open={dialog === 'failed'} onClose={() => setDialog(null)} tone="error" title="Not created" message="The phishing test could not be created. Please try again." />
      <MessageDialog open={dialog === 'draft'} onClose={() => nav('/phishing-tests')} tone="warning" title="Saved as draft" message="The test was saved as a draft but could not be sent. Please try again later." />
    </>
  )
}

/** Public page a recipient sees after clicking a test link (no login required). */
export function AwarenessLandingPage() {
  const { testId } = useParams()
  const { state } = useDemo()
  const t = state.tests.find((x) => x.id === testId)
  const tpl = t && state.templates.find((x) => x.id === t.templateId)
  return (
    <div className="min-h-screen bg-gradient-to-b from-accent-50 to-white px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <Logo />
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <ShieldCheck className="h-10 w-10 text-accent-700" aria-hidden />
          <h1 className="mt-3 text-2xl font-semibold">This was a simulated phishing test</h1>
          <p className="mt-2 text-slate-700">
            Don't worry. The email{tpl ? ` "${t?.subject}"` : ''} was sent by your organization's security team to help everyone practice spotting phishing. No information was collected.
          </p>
          <h2 className="mt-6 font-semibold">Signs you could have spotted</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-slate-700">
            <li>An unexpected request with a deadline or a threat.</li>
            <li>A sender or link domain that does not match the real organization.</li>
            <li>Link text that differs from where the link actually goes (hover to check).</li>
          </ul>
          <h2 className="mt-6 font-semibold">Next time</h2>
          <p className="mt-1 text-slate-700">Don't click. Use Report Suspicious Email in PhishGuard so the team can protect others.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <LinkButton to="/kb/KB-101">Read: How to Spot a Phishing Email</LinkButton>
            <LinkButton to="/login" variant="secondary">
              Go to PhishGuard
            </LinkButton>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">Prototype: this click would be recorded against test {testId}.</p>
      </div>
    </div>
  )
}
