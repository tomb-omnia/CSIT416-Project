// UC19 Classify Reported Emails: queue (/security/reports) and detail (/security/reports/:id).

import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Ban, FolderSearch, Trash2, XCircle } from 'lucide-react'
import { useDemo, useMe, pushAudit, pushNotification } from '../../store/DemoStore'
import { Card, DetailList, PageHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Dialog, MessageDialog, ValidationSummaryDialog } from '../../components/ui/Dialog'
import { FieldGroup, RequirementMessage } from '../../components/ui/RequirementField'
import { Banner } from '../../components/ui/Banner'
import * as V from '../../lib/validators'
import { REQ } from '../../lib/validators'
import { fmtDateTime, nowIso } from '../../lib/dates'
import { defang } from '../../store/mockRules'
import type { EmailReport } from '../../store/types'

export function ReportQueuePage() {
  const { state, mutate } = useDemo()
  const nav = useNavigate()
  const [tab, setTab] = useState<'pending' | 'history'>('pending')
  const [conflict, setConflict] = useState<string | null>(null)
  const emails = state.reports.filter((r): r is EmailReport => r.kind === 'email')
  const pending = emails.filter((r) => r.status === 'Pending Review')
  const history = emails.filter((r) => r.status !== 'Pending Review')

  const open = (r: EmailReport) => {
    if (r.conflict) return setConflict(r.id) // 3A1: another officer classified it after the table loaded
    nav(`/security/reports/${r.id}`)
  }
  const refresh = () => {
    mutate((s) => {
      const r = s.reports.find((x) => x.id === conflict)
      if (r && r.kind === 'email') {
        r.status = 'Classified - Phishing'
        r.classifiedBy = 'sbello'
        r.classifiedAt = nowIso()
        r.conflict = false
      }
    })
    setConflict(null)
  }

  return (
    <>
      <PageHeader title="Reported Emails Queue" uc="UC19" subtitle="Review reported emails and classify each as Phishing, Spam, or Legitimate." />
      <div className="mb-4 flex gap-1 border-b" role="tablist">
        {(['pending', 'history'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === t ? 'border-accent-700 text-accent-800' : 'border-transparent text-slate-600 hover:text-slate-900'}`}>
            {t === 'pending' ? `Pending Review (${pending.length})` : `Report History (${history.length})`}
          </button>
        ))}
      </div>
      {tab === 'pending' ? (
        <DataTable
          rows={pending}
          rowKey={(r) => r.id}
          onRowClick={open}
          empty="There are no reports pending review."
          initialSort={{ key: 'date', dir: 'asc' }}
          columns={[
            { key: 'id', header: 'Report ID', render: (r) => <span className="font-mono text-accent-700">{r.id}</span>, sort: (r) => r.id },
            { key: 'reporter', header: 'Reporter', render: (r) => r.reporter, sort: (r) => r.reporter },
            { key: 'sender', header: 'Sender', render: (r) => <span className="font-mono text-xs">{r.sender}</span>, sort: (r) => r.sender },
            { key: 'subject', header: 'Subject', render: (r) => r.subject },
            { key: 'date', header: 'Date reported', render: (r) => fmtDateTime(r.submittedAt), sort: (r) => r.submittedAt },
            { key: 'scan', header: 'Automated scan', render: (r) => <StatusBadge status={r.scan} />, sort: (r) => r.scan },
          ]}
        />
      ) : (
        <DataTable
          rows={history}
          rowKey={(r) => r.id}
          empty="No classified reports yet."
          initialSort={{ key: 'date', dir: 'desc' }}
          columns={[
            { key: 'id', header: 'Report ID', render: (r) => <span className="font-mono">{r.id}</span>, sort: (r) => r.id },
            { key: 'reporter', header: 'Reporter', render: (r) => r.reporter },
            { key: 'subject', header: 'Subject', render: (r) => r.subject },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'by', header: 'Classified by', render: (r) => (r.classifiedBy ? `${r.classifiedBy}, ${fmtDateTime(r.classifiedAt)}` : '-') },
            { key: 'date', header: 'Reported', render: (r) => fmtDateTime(r.submittedAt), sort: (r) => r.submittedAt },
          ]}
        />
      )}
      <MessageDialog open={!!conflict} onClose={refresh} tone="warning" title="Already classified" message="This report has already been classified. Please refresh the page." okLabel="Ok" />
    </>
  )
}

type Cls = 'Phishing' | 'Spam' | 'Legitimate'

export function ClassifyReportPage() {
  const { id } = useParams()
  const { state, mutate, simulate, toast } = useDemo()
  const me = useMe()
  const nav = useNavigate()
  const r = state.reports.find((x): x is EmailReport => x.kind === 'email' && x.id === id)
  const [cls, setCls] = useState<Cls | null>(null)
  const [clsTouched, setClsTouched] = useState(false)
  const [notes, setNotes] = useState('')
  const [notesOpen, setNotesOpen] = useState(true)
  const [summary, setSummary] = useState<string[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [followUp, setFollowUp] = useState(false)

  if (!r) return (<><PageHeader title="Classify Report" back={{ to: '/security/reports', label: 'Reported Emails Queue' }} /><Banner tone="error" title="Unable to load report details. Please try again later." /></>)
  if (r.status !== 'Pending Review' && !followUp)
    return (
      <>
        <PageHeader title={`Report ${r.id}`} uc="UC19" back={{ to: '/security/reports', label: 'Reported Emails Queue' }} />
        <Banner tone="info" title={`This report is ${r.status}.`}>Classified by {r.classifiedBy} on {fmtDateTime(r.classifiedAt)}.</Banner>
      </>
    )

  const notesErr = V.classificationNotes(notes)
  const clsErr = cls ? null : 'Please select a classification.'
  const urls = r.content.match(/https?:\/\/[^\s"'<>]+/g) ?? []
  const domain = r.sender.split('@')[1] ?? ''

  const save = async () => {
    setClsTouched(true)
    const fails = [clsErr, notesErr].filter((x): x is string => !!x)
    if (fails.length) return setSummary(fails)
    setBusy(true)
    const res = await simulate('save')
    if (res !== 'ok') {
      setBusy(false)
      return setError(true)
    }
    const notified = (await simulate('notify')) === 'ok'
    setBusy(false)
    mutate((s) => {
      const x = s.reports.find((y) => y.id === r.id)
      if (x && x.kind === 'email') {
        x.status = `Classified - ${cls!}`
        x.classifiedBy = me.username
        x.classifiedAt = nowIso()
        x.notes = notes
      }
      pushAudit(s, me, 'Report Classified', r.id, { oldValue: 'Pending Review', newValue: `Classified - ${cls}` })
      if (notified) pushNotification(s, r.reporter, `Your report (${r.id}) has been reviewed and classified as ${cls}. Thank you for using Phishguard.`, '/my-reports')
    })
    // 11A3: classification still saves; the failed notification is recorded and retried.
    if (!notified) toast('Classification saved. The reporter could not be notified; the notification will be retried.', 'error')
    else toast(`Report ${r.id} classified as ${cls}.`)
    if (cls === 'Phishing') setFollowUp(true)
    else nav('/security/reports')
  }

  return (
    <>
      <PageHeader title={`Report ${r.id}`} uc="UC19" back={{ to: '/security/reports', label: 'Reported Emails Queue' }} subtitle={`Reported by ${r.reporter} on ${fmtDateTime(r.submittedAt)}`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card title="Report details">
            <DetailList
              items={[
                ['Sender', <span className="font-mono">{r.sender}</span>],
                ['Subject', r.subject],
                ['Automated scan', <StatusBadge status={r.scan} />],
                ['Links found', urls.length ? <ul className="font-mono text-xs">{urls.map((u) => <li key={u}>{defang(u)}</li>)}</ul> : 'None'],
                ['Attachments', 'None'],
                ['Reporter comments', 'None provided'],
              ]}
            />
          </Card>
          <Card title="Header and body">
            <pre className="whitespace-pre-wrap break-words rounded-md bg-slate-50 p-4 font-mono text-xs leading-relaxed">{r.content}</pre>
          </Card>
        </div>
        <Card title="Classification">
          <FieldGroup name="cls" label="Classification" status={clsTouched ? (clsErr ? 'error' : 'ok') : cls ? 'ok' : 'neutral'} base={REQ.classification} error={clsErr}>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-labelledby="l-cls">
              {(['Phishing', 'Spam', 'Legitimate'] as Cls[]).map((c, i) => (
                <button
                  key={c}
                  id={i === 0 ? 'f-cls' : undefined}
                  role="radio"
                  aria-checked={cls === c}
                  onClick={() => {
                    setCls(c)
                    setClsTouched(true)
                  }}
                  className={`rounded-md border-2 px-2 py-2 text-sm font-medium ${cls === c ? (c === 'Phishing' ? 'border-red-600 bg-red-600 text-white' : c === 'Spam' ? 'border-yellow-500 bg-yellow-400 text-yellow-950' : 'border-green-600 bg-green-600 text-white') : 'border-slate-300 hover:border-slate-400'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </FieldGroup>
          {notesOpen ? (
            <div className="mb-4">
              <label htmlFor="f-notes" className="mb-1 block text-sm font-medium">
                Notes
              </label>
              <textarea id="f-notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} className={`block w-full rounded-md border px-3 py-2 text-sm ${notesErr ? 'border-red-600' : 'border-slate-300'}`} />
              <div className="flex items-start justify-between gap-2">
                <RequirementMessage status={notesErr ? 'error' : notes ? 'ok' : 'neutral'} base={REQ.classNotes} error={notesErr} />
                <span className={`mt-1.5 text-xs ${notesErr ? 'text-red-700' : 'text-slate-500'}`}>{notes.length}/300</span>
              </div>
              <Button size="sm" variant="secondary" className="mt-2" disabled={!!notesErr} onClick={() => setNotesOpen(false)}>
                Save
              </Button>
            </div>
          ) : (
            <div className="mb-4 rounded-md bg-slate-50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">Notes</span>
                <button className="text-accent-700 hover:underline" onClick={() => setNotesOpen(true)}>
                  Edit
                </button>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-slate-700">{notes || 'No notes.'}</p>
            </div>
          )}
          <div className="rounded-md border border-slate-200 p-3 text-sm">
            <div className="font-medium">Review</div>
            <p className="text-slate-600">
              Classification: <strong>{cls ?? 'None selected'}</strong>
            </p>
          </div>
          <Button className="mt-4 w-full" onClick={save} loading={busy}>
            Save Classification
          </Button>
        </Card>
      </div>
      <ValidationSummaryDialog items={summary} onClose={() => { setSummary(null); document.getElementById(clsErr ? 'f-cls' : 'f-notes')?.focus() }} />
      <MessageDialog open={error} onClose={() => setError(false)} tone="error" title="Not saved" message="The classification could not be saved. Please try again." okLabel="Ok" />
      <Dialog
        open={followUp}
        onClose={() => nav('/security/reports')}
        tone="warning"
        title="Classified as Phishing. What next?"
        footer={
          <Button variant="secondary" onClick={() => nav('/security/reports')}>
            <XCircle className="h-4 w-4" /> Ignore this email
          </Button>
        }
      >
        <div className="grid gap-2">
          <Button variant="danger" onClick={() => nav(`/security/purge?sender=${encodeURIComponent(r.sender)}&keyword=${encodeURIComponent(r.subject)}`)}>
            <Trash2 className="h-4 w-4" /> Purge this email
          </Button>
          <Button variant="secondary" onClick={() => nav(`/security/blocklist?add=${encodeURIComponent(domain)}`)}>
            <Ban className="h-4 w-4" /> Block the sender domain
          </Button>
        </div>
        <p className="mt-4 text-sm text-slate-600">
          <FolderSearch className="mr-1 inline h-4 w-4" aria-hidden />
          You can also <Link className="text-accent-700 underline" to={`/security/investigations/new?report=${r.id}`}>open an investigation</Link> for this report.
        </p>
      </Dialog>
    </>
  )
}
