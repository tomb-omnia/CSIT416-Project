// UC18 Purge Malicious Emails. Search runs over simulated organizational mailboxes (seed data).

import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useDemo, useMe, pushAudit, pushNotification } from '../../store/DemoStore'
import { Card, PageHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { RequirementMessage, TextArea } from '../../components/ui/RequirementField'
import { Dialog, MessageDialog, TypeToConfirmDialog, ValidationSummaryDialog } from '../../components/ui/Dialog'
import { DataTable } from '../../components/ui/DataTable'
import { Spinner } from '../../components/ui/Banner'
import * as V from '../../lib/validators'
import { REQ } from '../../lib/validators'
import { endOfDay, fmtDateTime, parseDateInput } from '../../lib/dates'
import type { MailboxEmail } from '../../store/types'

export default function PurgePage() {
  const { state, mutate, simulate, toast } = useDemo()
  const me = useMe()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [c, setC] = useState({ sender: params.get('sender') ?? '', domain: params.get('domain') ?? '', keyword: params.get('keyword') ?? '', start: '', end: '' })
  const [cTouched, setCTouched] = useState(false)
  const [results, setResults] = useState<MailboxEmail[] | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [reason, setReason] = useState('')
  const [reasonTouched, setReasonTouched] = useState(false)
  const [summary, setSummary] = useState<string[] | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [dialog, setDialog] = useState<null | 'none' | 'unavailable' | 'done' | 'partial'>(null)
  const [retryFailed, setRetryFailed] = useState(false)
  const [doneMsg, setDoneMsg] = useState('')

  const cErr = V.purgeCriteria(c)
  const reasonErr = V.purgeReason(reason)
  const sel = useMemo(() => (results ?? []).filter((r) => selected.includes(r.id)), [results, selected])
  const totalInboxes = sel.reduce((n, r) => n + r.inboxes, 0)
  const failedInboxes = sel.flatMap((r) => r.recipients).slice(0, 2)

  const search = () => {
    setCTouched(true)
    if (cErr) return
    const s = parseDateInput(c.start)
    const e = parseDateInput(c.end)
    const out = state.mailbox.filter((m) => {
      if (m.purged) return false
      if (c.sender && !m.sender.toLowerCase().includes(c.sender.trim().toLowerCase())) return false
      if (c.domain && !m.sender.toLowerCase().endsWith('@' + c.domain.trim().toLowerCase().replace(/^@/, ''))) return false
      if (c.keyword && !m.subject.toLowerCase().includes(c.keyword.trim().toLowerCase())) return false
      const t = new Date(m.receivedAt)
      if (s && t < s) return false
      if (e && t > endOfDay(e)) return false
      return true
    })
    setResults(out)
    setSelected([])
    if (out.length === 0) setDialog('none')
  }

  const startPurge = () => {
    setReasonTouched(true)
    const fails = [cErr, selected.length ? null : 'Select at least 1 email', reasonErr].filter((x): x is string => !!x)
    if (fails.length) return setSummary(fails)
    setConfirm(true)
  }

  const doPurge = async () => {
    setBusy(true)
    const res = await simulate('purge')
    setBusy(false)
    setConfirm(false)
    if (res === 'unavailable') return setDialog('unavailable')
    const isPartial = res === 'partial'
    const ids = sel.map((x) => x.id)
    const purgedPairs = sel.map((x) => `${x.sender}|${x.subject}`.toLowerCase())
    mutate((s) => {
      s.mailbox.forEach((m) => ids.includes(m.id) && (m.purged = true))
      const resolved: string[] = []
      s.reports.forEach((r) => {
        if (r.kind === 'email' && purgedPairs.includes(`${r.sender}|${r.subject}`.toLowerCase()) && r.status !== 'Resolved, email has been purged') {
          r.status = 'Resolved, email has been purged'
          resolved.push(r.reporter)
        }
      })
      pushAudit(s, me, 'Email Purged', `criteria: ${[c.sender, c.domain, c.keyword, c.start && `${c.start} to ${c.end}`].filter(Boolean).join(', ')}`, {
        newValue: `${sel.length} emails, ${totalInboxes} inboxes. Reason: ${reason}`,
        result: isPartial ? 'Failure' : 'Success',
      })
      if (resolved.length) pushNotification(s, resolved, 'An email you reported was confirmed malicious and has been purged from all inboxes. Thank you for using Phishguard.', '/my-reports')
    })
    setDoneMsg(`Purge complete. ${sel.length} emails were removed from ${totalInboxes} mailboxes`)
    setDialog(isPartial ? 'partial' : 'done')
  }

  const cStatus = !cTouched ? 'neutral' : cErr ? 'error' : 'ok'
  const inp = (k: keyof typeof c, label: string, type = 'text', ph = '') => (
    <div>
      <label htmlFor={`f-${k}`} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={`f-${k}`}
        type={type}
        placeholder={ph}
        value={c[k]}
        onChange={(e) => {
          setC({ ...c, [k]: e.target.value })
          setCTouched(true)
        }}
        className={`block w-full rounded-md border px-3 py-2 ${cStatus === 'error' ? 'border-red-600' : cStatus === 'ok' ? 'border-green-600' : 'border-slate-300'}`}
      />
    </div>
  )

  return (
    <>
      <PageHeader title="Purge Malicious Emails" uc="UC18" subtitle="Find a malicious email across organizational inboxes and remove every copy." />
      <Card title="1. Search criteria">
        <div className="grid gap-4 md:grid-cols-3">
          {inp('sender', 'Sender address', 'text', 'attacker@domain.com')}
          {inp('domain', 'Domain', 'text', 'domain.com')}
          {inp('keyword', 'Subject keyword')}
          {inp('start', 'Received from', 'date')}
          {inp('end', 'Received to', 'date')}
        </div>
        <RequirementMessage status={cStatus} base={REQ.purgeCriteria} error={cErr} />
        <Button className="mt-4" onClick={search}>
          <Search className="h-4 w-4" /> Search
        </Button>
      </Card>

      {results && results.length > 0 && (
        <Card className="mt-6" title="2. Select emails to purge" actions={<Button size="sm" variant="secondary" onClick={() => setSelected(selected.length === results.length ? [] : results.map((r) => r.id))}>{selected.length === results.length ? 'Clear selection' : 'Select All'}</Button>}>
          <DataTable
            rows={results}
            rowKey={(r) => r.id}
            empty=""
            onRowClick={(r) => setSelected((s) => (s.includes(r.id) ? s.filter((x) => x !== r.id) : [...s, r.id]))}
            selectedKey={null}
            rowClassName={(r) => (selected.includes(r.id) ? 'bg-accent-50' : '')}
            columns={[
              { key: 'chk', header: <span className="sr-only">Select</span>, render: (r) => <input type="checkbox" aria-label={`Select ${r.subject}`} className="h-4 w-4 accent-accent-700" checked={selected.includes(r.id)} readOnly /> },
              { key: 'sender', header: 'Sender', render: (r) => <span className="font-mono text-xs">{r.sender}</span>, sort: (r) => r.sender },
              { key: 'subject', header: 'Subject', render: (r) => r.subject, sort: (r) => r.subject },
              { key: 'date', header: 'Date received', render: (r) => fmtDateTime(r.receivedAt), sort: (r) => r.receivedAt },
              { key: 'inboxes', header: 'Inboxes reached', render: (r) => r.inboxes, sort: (r) => r.inboxes },
            ]}
          />
          <div className="mt-3 flex items-center justify-between">
            <RequirementMessage status={selected.length ? 'ok' : 'neutral'} base={REQ.purgeSelect} />
            <div className="text-sm font-medium">
              {sel.length} emails selected · {totalInboxes} inboxes affected
            </div>
          </div>
        </Card>
      )}

      {results && results.length > 0 && (
        <Card className="mt-6" title="3. Reason and purge">
          <TextArea name="reason" label="Reason for the purge" rows={3} value={reason} onChange={(e) => { setReason(e.target.value); setReasonTouched(true) }} status={!reasonTouched ? 'neutral' : reasonErr ? 'error' : 'ok'} base={REQ.purgeReason} error={reasonErr} counter={{ value: reason.length, max: 150 }} />
          <Button variant="danger" disabled={selected.length === 0} onClick={startPurge}>
            Purge
          </Button>
        </Card>
      )}

      <ValidationSummaryDialog items={summary} onClose={() => { setSummary(null); document.getElementById(cErr ? 'f-sender' : 'f-reason')?.focus() }} />
      <TypeToConfirmDialog
        open={confirm}
        word="PURGE"
        busy={busy}
        onCancel={() => setConfirm(false)}
        onConfirm={doPurge}
        message={
          <>
            <p>
              This will permanently remove <strong>{sel.length} emails</strong> from <strong>{totalInboxes} inboxes</strong>.
            </p>
            {busy && <div className="mt-3"><Spinner label="Purging…" /></div>}
          </>
        }
      />
      <MessageDialog open={dialog === 'none'} onClose={() => setDialog(null)} title="No results" message="No matching emails were found" />
      <MessageDialog open={dialog === 'unavailable'} onClose={() => setDialog(null)} tone="error" title="Purge unsuccessful" message="Purge unsuccessful. The service is currently unavailable. Please try again later." okLabel="Ok" />
      <MessageDialog open={dialog === 'done'} onClose={() => { toast(doneMsg); nav('/security') }} tone="success" title="Purge complete" message={doneMsg} />
      <Dialog
        open={dialog === 'partial'}
        onClose={() => nav('/security')}
        tone="warning"
        title="Purge partially complete"
        footer={
          <>
            <Button variant="secondary" onClick={() => nav('/security')}>
              Close
            </Button>
            <Button onClick={() => setRetryFailed(true)}>Try Again</Button>
          </>
        }
      >
        <p>Purge partially complete. The purge failed for the following inboxes: {failedInboxes.join(', ')}</p>
        {retryFailed && <p className="mt-3 font-medium text-red-700">Retry failed. Please try again later.</p>}
      </Dialog>
    </>
  )
}
