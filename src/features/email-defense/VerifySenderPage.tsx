// UC31 Verify Email Sender, plus Verification History.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react'
import { useDemo, useMe } from '../../store/DemoStore'
import * as V from '../../lib/validators'
import { REQ } from '../../lib/validators'
import { useForm } from '../../components/ui/useForm'
import { TextField } from '../../components/ui/RequirementField'
import { Dialog, MessageDialog } from '../../components/ui/Dialog'
import { Button } from '../../components/ui/Button'
import { Card, PageHeader } from '../../components/ui/Card'
import { Banner, Spinner } from '../../components/ui/Banner'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { verifySender, type SenderVerdict } from '../../store/mockRules'
import { uid } from '../../lib/ids'
import { fmtDateTime, nowIso } from '../../lib/dates'
import { SlowDialog } from './ScanPages'
import type { VerifyResult } from '../../store/types'

const toneOf = (r: VerifyResult) => (r === 'No Known threats detected' ? 'green' : r === 'Unable to Verify' ? 'yellow' : 'red')

export function VerifySenderPage() {
  const { state, mutate, simulate } = useDemo()
  const me = useMe()
  const nav = useNavigate()
  const form = useForm({ email: '' })
  const err = V.verifyEmail(form.values.email)
  const [busy, setBusy] = useState(false)
  const [slow, setSlow] = useState(false)
  const [result, setResult] = useState<(SenderVerdict & { email: string }) | null>(null)
  const [dialog, setDialog] = useState<null | 'unavailable' | 'lost'>(null)
  const [saveFailed, setSaveFailed] = useState(false)

  const verify = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (err) {
      form.submit({ email: err })
      document.getElementById('f-email')?.focus()
      return
    }
    setResult(null)
    setSaveFailed(false)
    setBusy(true)
    const out = await simulate('verify', { onSlow: () => setSlow(true) })
    setSlow(false)
    setBusy(false)
    if (!navigator.onLine) return setDialog('lost')
    if (out === 'unavailable') return setDialog('unavailable')
    const email = form.values.email.trim()
    const r = verifySender(email, state.blocklist)
    setResult({ ...r, email })
    if ((await simulate('save')) !== 'ok') return setSaveFailed(true)
    mutate((s) => s.verifications.unshift({ id: uid('V'), username: me.username, email, result: r.result, detail: r.detail, at: nowIso() }))
  }

  const t = result ? toneOf(result.result) : null
  return (
    <>
      <PageHeader title="Verify Email Sender" uc="UC31" subtitle="Check whether a sender's address shows signs of phishing." />
      <Card>
        <form onSubmit={verify} noValidate className="max-w-2xl">
          <TextField name="email" label="Sender's email address" placeholder="name@domain.com" value={form.values.email} onChange={(e) => form.set('email', e.target.value)} status={form.status('email', err)} base={REQ.verifyEmail} error={err} disabled={busy} />
          <div className="flex items-center gap-4">
            <Button type="submit" disabled={busy}>
              Verify Sender
            </Button>
            {busy && <Spinner label="Verifying Email Sender Please Wait…" />}
          </div>
        </form>
        {saveFailed && <Banner tone="warning" className="mt-6" title="Verification Complete. Unable to Save Verification History." />}
        {result && t && (
          <div className={`mt-6 rounded-lg border-2 p-5 ${t === 'green' ? 'border-green-600 bg-green-50' : t === 'red' ? 'border-red-600 bg-red-50' : 'border-yellow-500 bg-yellow-50'}`}>
            <div className={`flex items-center gap-2 text-lg font-bold ${t === 'green' ? 'text-green-800' : t === 'red' ? 'text-red-800' : 'text-yellow-900'}`}>
              {t === 'green' ? <ShieldCheck className="h-6 w-6" /> : t === 'red' ? <ShieldAlert className="h-6 w-6" /> : <ShieldQuestion className="h-6 w-6" />}
              {result.result}
            </div>
            <p className="mt-1 font-mono text-sm">{result.email}</p>
            <p className="mt-2 text-sm text-slate-700">{result.detail}</p>
            <Button variant="secondary" className="mt-4" onClick={() => nav('/home')}>
              Done
            </Button>
          </div>
        )}
        <p className="mt-6 text-xs text-slate-500">
          Demo tips: blocklisted domains are Known Malicious; lookalikes (paypa1, rnicrosoft) and missing domains (anything.invalid) are Suspicious; *.xyz and free webmail are Unable to Verify.
        </p>
      </Card>
      <SlowDialog open={slow} text="Verifying Email Sender Please Wait…" />
      <Dialog
        open={dialog === 'unavailable'}
        onClose={() => setDialog(null)}
        tone="error"
        title="Service unavailable"
        footer={
          <>
            <Button variant="secondary" onClick={() => nav('/home')}>
              Return to dashboard
            </Button>
            <Button
              onClick={() => {
                setDialog(null)
                verify()
              }}
            >
              Retry
            </Button>
          </>
        }
      >
        Verification Service Temporarily Unavailable. Please try again later.
      </Dialog>
      <MessageDialog open={dialog === 'lost'} onClose={() => setDialog(null)} tone="error" title="Connection lost" message="Verification Incomplete. Connection Lost. Please Try Again." />
    </>
  )
}

export function VerificationHistoryPage() {
  const { state } = useDemo()
  const me = useMe()
  const rows = state.verifications.filter((s) => s.username === me.username)
  return (
    <>
      <PageHeader title="Verification History" subtitle="Senders you have verified (UC31)." />
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        empty="You have not verified any senders yet."
        initialSort={{ key: 'at', dir: 'desc' }}
        columns={[
          { key: 'at', header: 'Date/time', render: (r) => fmtDateTime(r.at), sort: (r) => r.at },
          { key: 'email', header: 'Sender', render: (r) => <span className="font-mono text-xs">{r.email}</span>, sort: (r) => r.email },
          { key: 'result', header: 'Result', render: (r) => <StatusBadge status={r.result} tone={toneOf(r.result)} />, sort: (r) => r.result },
          { key: 'detail', header: 'Explanation', render: (r) => <span className="text-slate-600">{r.detail}</span> },
        ]}
      />
    </>
  )
}
