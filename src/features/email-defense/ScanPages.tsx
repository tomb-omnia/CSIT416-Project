// UC16 Scan Link, UC17 Scan Attachments, plus Scan History.

import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileUp, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react'
import { useDemo, useMe } from '../../store/DemoStore'
import * as V from '../../lib/validators'
import { REQ, SUPPORTED_EXT } from '../../lib/validators'
import { useForm } from '../../components/ui/useForm'
import { FieldGroup, TextField } from '../../components/ui/RequirementField'
import { Dialog, MessageDialog, ValidationSummaryDialog } from '../../components/ui/Dialog'
import { Button } from '../../components/ui/Button'
import { Card, PageHeader } from '../../components/ui/Card'
import { Spinner } from '../../components/ui/Banner'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { scanFile, scanLink } from '../../store/mockRules'
import { uid } from '../../lib/ids'
import { fmtDateTime, nowIso } from '../../lib/dates'
import type { ScanRecord } from '../../store/types'

export function SlowDialog({ open, text = 'The scan is taking longer than expected. Please wait…' }: { open: boolean; text?: string }) {
  return (
    <Dialog open={open} onClose={() => {}} title="Please wait" tone="info" footer={<span className="text-sm text-slate-500">This message closes when the operation completes.</span>}>
      <Spinner label={text} />
    </Dialog>
  )
}

// ---------------- UC16 ----------------
export function ScanLinkPage() {
  const { state, mutate, simulate } = useDemo()
  const me = useMe()
  const nav = useNavigate()
  const form = useForm({ link: '' })
  const err = V.link(form.values.link)
  const [scanning, setScanning] = useState(false)
  const [slow, setSlow] = useState(false)
  const [result, setResult] = useState<{ url: string; verdict: 'Safe' | 'Malicious'; detail: string } | null>(null)
  const [dialog, setDialog] = useState<null | 'required' | 'unavailable' | 'lost' | 'verdict'>(null)

  const scan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (err) {
      form.submit({ link: err })
      return setDialog('required')
    }
    const url = form.values.link.trim()
    setResult(null)
    setScanning(true)
    const out = await simulate('scan', { onSlow: () => setSlow(true) })
    setSlow(false)
    setScanning(false)
    if (!navigator.onLine) return setDialog('lost')
    if (out === 'unavailable') return setDialog('unavailable')
    const r = scanLink(url, state.blocklist)
    setResult({ url, ...r })
    setDialog('verdict')
    mutate((s) => s.scans.unshift({ id: uid('SC'), username: me.username, kind: 'Link', target: url, verdict: r.verdict, detail: r.detail, at: nowIso() }))
  }

  const reportHref = (url: string) => `/report/email?content=${encodeURIComponent(`Suspicious link found in an email:\n${url}\n\n(Paste the full email header and body here.)`)}`

  return (
    <>
      <PageHeader title="Scan Link" uc="UC16" subtitle="Check a link for phishing and malicious indicators before you visit it." />
      <Card>
        <form onSubmit={scan} noValidate className="max-w-2xl">
          <TextField name="link" label="Link" placeholder="https://" value={form.values.link} onChange={(e) => form.set('link', e.target.value)} status={form.status('link', err)} base={REQ.link} error={err} disabled={scanning} />
          <div className="flex items-center gap-4">
            <Button type="submit" disabled={scanning}>
              {scanning ? 'Scanning…' : 'Scan Link'}
            </Button>
            {scanning && <Spinner label="Scanning…" />}
          </div>
        </form>
        {result && (
          <div className={`mt-6 rounded-lg border-2 p-5 ${result.verdict === 'Safe' ? 'border-green-600 bg-green-50' : 'border-red-600 bg-red-50'}`}>
            <div className={`flex items-center gap-2 text-lg font-bold ${result.verdict === 'Safe' ? 'text-green-800' : 'text-red-800'}`}>
              {result.verdict === 'Safe' ? <ShieldCheck className="h-6 w-6" aria-hidden /> : <ShieldAlert className="h-6 w-6" aria-hidden />}
              {result.verdict === 'Safe' ? 'SAFE LINK' : 'MALICIOUS LINK - DO NOT OPEN'}
            </div>
            <p className={`mt-2 break-all font-mono text-sm ${result.verdict === 'Safe' ? 'text-green-800' : 'text-red-800'}`}>{result.url}</p>
            <p className="mt-2 text-sm text-slate-700">{result.detail}</p>
            <div className="mt-4 flex gap-3">
              {result.verdict === 'Malicious' && (
                <Button variant="danger" onClick={() => nav(reportHref(result.url))}>
                  Report Link/Email
                </Button>
              )}
              <Button variant="secondary" onClick={() => nav('/home')}>
                Done
              </Button>
            </div>
          </div>
        )}
        <p className="mt-6 text-xs text-slate-500">
          Demo tips: links on the Domain Blocklist, raw IP hosts (http://192.168.4.20/login), shorteners (https://bit.ly/x), and lookalikes (https://paypa1-account.com) are malicious.
        </p>
      </Card>
      <SlowDialog open={slow} />
      <MessageDialog open={dialog === 'required'} onClose={() => { setDialog(null); document.getElementById('f-link')?.focus() }} tone="error" title="Scan not started" message={<span className="text-red-700">Link is required</span>} />
      <MessageDialog open={dialog === 'unavailable'} onClose={() => setDialog(null)} tone="error" title="Service unavailable" message="The service is temporarily unavailable. Please try again later." okLabel="Ok" />
      <MessageDialog open={dialog === 'lost'} onClose={() => setDialog(null)} tone="error" title="Scan incomplete" message={<span className="text-red-700">Scan incomplete: the connection was lost. Please try again.</span>} />
      <MessageDialog
        open={dialog === 'verdict'}
        onClose={() => setDialog(null)}
        tone={result?.verdict === 'Safe' ? 'success' : 'error'}
        title={result?.verdict === 'Safe' ? 'SAFE LINK' : 'MALICIOUS LINK - DO NOT OPEN'}
        message={result?.detail}
      />
    </>
  )
}

// ---------------- UC17 ----------------
type FileMeta = { name: string; size: number }
const SAMPLES: FileMeta[] = [
  { name: 'quarterly_report.pdf', size: 482_113 },
  { name: 'invoice.pdf.exe', size: 98_304 },
  { name: 'protected_payroll.zip', size: 1_204_211 },
  { name: 'payroll_update.docx', size: 64_220 },
  { name: 'site_backup.zip', size: 31 * 1024 * 1024 },
  { name: 'notes.txt', size: 1_024 },
]

export function ScanAttachmentPage() {
  const { mutate, simulate } = useDemo()
  const me = useMe()
  const nav = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<FileMeta | null>(null)
  const [touched, setTouched] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [slow, setSlow] = useState(false)
  const [result, setResult] = useState<{ name: string; verdict: ScanRecord['verdict']; detail: string } | null>(null)
  const [dialog, setDialog] = useState<null | 'missing' | 'unavailable' | 'protected'>(null)
  const err = V.attachment(file)
  const status = !touched ? 'neutral' : err ? 'error' : 'ok'

  const choose = (f: FileMeta | null) => {
    setFile(f)
    setTouched(true)
    setResult(null)
  }
  const discard = () => {
    // "The file uploaded by the actor is deleted": we only ever held the name and size in memory.
    setFile(null)
    setTouched(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const scan = async () => {
    if (err) {
      setTouched(true)
      return setDialog('missing')
    }
    const f = file!
    setScanning(true)
    const out = await simulate('scan', { onSlow: () => setSlow(true), slowAfterMs: 2000 })
    setSlow(false)
    setScanning(false)
    if (out === 'unavailable') {
      discard()
      return setDialog('unavailable')
    }
    const r = scanFile(f.name)
    setResult({ name: f.name, ...r })
    if (r.verdict === 'Password-protected') setDialog('protected')
    mutate((s) => s.scans.unshift({ id: uid('SC'), username: me.username, kind: 'Attachment', target: f.name, verdict: r.verdict, detail: r.detail, at: nowIso() }))
    discard()
  }

  const tone = result?.verdict === 'Safe' ? 'green' : result?.verdict === 'Malicious' ? 'red' : 'yellow'
  return (
    <>
      <PageHeader title="Scan Attachment" uc="UC17" subtitle="Check a file for malware before you open it. Files never leave your browser in this prototype." />
      <Card>
        <div className="max-w-2xl">
          <FieldGroup name="file" label="File to scan" status={status} base={REQ.file} error={err}>
            <div className={`flex flex-wrap items-center gap-3 rounded-md border border-dashed p-4 ${status === 'error' ? 'border-red-600' : 'border-slate-300'}`}>
              <FileUp className="h-6 w-6 text-slate-400" aria-hidden />
              <input
                id="f-file"
                ref={inputRef}
                type="file"
                accept={SUPPORTED_EXT.join(',')}
                disabled={scanning}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  choose(f ? { name: f.name, size: f.size } : null)
                }}
                className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent-50 file:px-3 file:py-1.5 file:font-medium file:text-accent-800"
              />
              {file && (
                <span className="text-sm text-slate-600">
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              )}
            </div>
          </FieldGroup>
          <p className="-mt-3 mb-4 text-xs text-slate-500">Supported: {SUPPORTED_EXT.join(', ')}</p>
          <div className="flex items-center gap-4">
            <Button onClick={scan} disabled={scanning}>
              {scanning ? 'Scanning…' : 'Scan Attachment'}
            </Button>
            {scanning && <Spinner label="Scanning…" />}
          </div>
          <div className="mt-6 rounded-md bg-slate-50 p-3">
            <div className="mb-2 text-xs font-semibold uppercase text-slate-500">Demo sample files</div>
            <div className="flex flex-wrap gap-2">
              {SAMPLES.map((s) => (
                <Button key={s.name} size="sm" variant="secondary" disabled={scanning} onClick={() => choose(s)}>
                  {s.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
        {result && (
          <div className={`mt-6 rounded-lg border-2 p-5 ${tone === 'green' ? 'border-green-600 bg-green-50' : tone === 'red' ? 'border-red-600 bg-red-50' : 'border-yellow-500 bg-yellow-50'}`}>
            <div className={`flex items-center gap-2 text-lg font-bold ${tone === 'green' ? 'text-green-800' : tone === 'red' ? 'text-red-800' : 'text-yellow-900'}`}>
              {tone === 'green' ? <ShieldCheck className="h-6 w-6" /> : tone === 'red' ? <ShieldAlert className="h-6 w-6" /> : <ShieldQuestion className="h-6 w-6" />}
              {result.verdict === 'Safe' ? 'SAFE' : result.verdict === 'Malicious' ? 'MALICIOUS' : 'COULD NOT BE SCANNED'}
            </div>
            <p className="mt-1 font-mono text-sm">{result.name}</p>
            <p className="mt-2 text-sm text-slate-700">{result.detail}</p>
            <p className="mt-2 text-xs text-slate-500">The file has been discarded.</p>
            <Button variant="secondary" className="mt-4" onClick={() => nav('/home')}>
              Done
            </Button>
          </div>
        )}
      </Card>
      <SlowDialog open={slow} />
      <ValidationSummaryDialog items={dialog === 'missing' ? [err ?? ''] : null} onClose={() => { setDialog(null); document.getElementById('f-file')?.focus() }} />
      <MessageDialog open={dialog === 'unavailable'} onClose={() => setDialog(null)} tone="error" title="Service unavailable" message="Scanning is temporarily unavailable. Please try again later." okLabel="Ok" />
      <MessageDialog open={dialog === 'protected'} onClose={() => setDialog(null)} tone="warning" title="File could not be scanned" message="This file is password-protected or encrypted and could not be scanned. Treat it as suspicious and do not open it." />
    </>
  )
}

export function ScanHistoryPage() {
  const { state } = useDemo()
  const me = useMe()
  const rows = state.scans.filter((s) => s.username === me.username)
  return (
    <>
      <PageHeader title="Scan History" subtitle="Links and attachments you have scanned (UC16, UC17)." />
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        empty="You have not scanned anything yet."
        initialSort={{ key: 'at', dir: 'desc' }}
        columns={[
          { key: 'at', header: 'Date/time', render: (r) => fmtDateTime(r.at), sort: (r) => r.at },
          { key: 'kind', header: 'Type', render: (r) => r.kind, sort: (r) => r.kind },
          { key: 'target', header: 'Link or file', render: (r) => <span className="break-all font-mono text-xs">{r.target}</span> },
          { key: 'verdict', header: 'Result', render: (r) => <StatusBadge status={r.verdict} />, sort: (r) => r.verdict },
          { key: 'detail', header: 'Explanation', render: (r) => <span className="text-slate-600">{r.detail}</span> },
        ]}
      />
    </>
  )
}
