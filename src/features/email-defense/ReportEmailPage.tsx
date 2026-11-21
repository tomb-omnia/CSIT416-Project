// UC15 Report Suspicious Email

import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { useDemo, useMe, pushNotification } from '../../store/DemoStore'
import * as V from '../../lib/validators'
import { REQ } from '../../lib/validators'
import { useForm } from '../../components/ui/useForm'
import { TextArea, TextField } from '../../components/ui/RequirementField'
import { MessageDialog, ValidationSummaryDialog } from '../../components/ui/Dialog'
import { Button, LinkButton } from '../../components/ui/Button'
import { Card, PageHeader } from '../../components/ui/Card'
import { Steps } from '../../components/ui/Wizard'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { reportId } from '../../lib/ids'
import { nowIso } from '../../lib/dates'
import { scanLink } from '../../store/mockRules'
import type { EmailReport } from '../../store/types'

export default function ReportEmailPage() {
  const { state, mutate, simulate } = useDemo()
  const me = useMe()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const form = useForm({ sender: params.get('sender') ?? '', subject: params.get('subject') ?? '', content: params.get('content') ?? '' })
  const v = form.values
  const errors = { sender: V.senderEmail(v.sender), subject: V.subjectLine(v.subject), content: V.emailContent(v.content) }
  const prefilled = !!(params.get('sender') || params.get('content'))
  const [step, setStep] = useState(prefilled ? 2 : 0)
  const [dialog, setDialog] = useState<null | 'duplicate' | 'failed'>(null)
  const [done, setDone] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.submit(errors, { sender: 'Sender email', subject: 'Subject line', content: 'Email header and body' })) {
      const first = errors.sender ? 0 : errors.subject ? 1 : 2
      setStep((s) => Math.max(s, first))
      return
    }
    const dup = state.reports.some((r) => r.kind === 'email' && r.reporter === me.username && r.sender.toLowerCase() === v.sender.trim().toLowerCase() && r.subject.trim().toLowerCase() === v.subject.trim().toLowerCase())
    if (dup) return setDialog('duplicate')
    setBusy(true)
    const res = await simulate('save')
    setBusy(false)
    if (res !== 'ok') return setDialog('failed')
    const id = reportId(state.reports.map((r) => r.id))
    const urls = v.content.match(/https?:\/\/[^\s"'<>]+/g) ?? []
    const domain = v.sender.split('@')[1]?.toLowerCase() ?? ''
    const malicious = urls.some((u) => scanLink(u, state.blocklist).verdict === 'Malicious') || state.blocklist.some((b) => b.domain === domain)
    const report: EmailReport = {
      kind: 'email', id, reporter: me.username, sender: v.sender.trim(), subject: v.subject, content: v.content, submittedAt: nowIso(), status: 'Pending Review',
      scan: malicious ? 'Malicious' : urls.length ? 'Suspicious' : 'Clean',
    }
    mutate((s) => {
      s.reports.push(report)
      pushNotification(s, s.users.filter((u) => u.role === 'officer').map((u) => u.username), `New reported email ${id} is pending review.`, '/security/reports')
    })
    setDone(id)
  }

  if (done)
    return (
      <>
        <PageHeader title="Report Suspicious Email" uc="UC15" />
        <Card>
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600" aria-hidden />
            <p className="mt-3 text-lg font-semibold text-green-800">Report submitted successfully. Your Report ID is {done}.</p>
            <div className="mt-2">
              <StatusBadge status="Pending Review" />
            </div>
            <div className="mt-6 flex gap-3">
              <Button onClick={() => nav('/home')}>Done</Button>
              <LinkButton to="/my-reports" variant="secondary">
                View My Reports
              </LinkButton>
            </div>
          </div>
        </Card>
      </>
    )

  const next = (to: number) => setStep((s) => Math.max(s, to))
  return (
    <>
      <PageHeader title="Report Suspicious Email" uc="UC15" subtitle="Send an email you think is phishing to the Cybersecurity team for review." />
      <Steps steps={['Sender', 'Subject', 'Header and body', 'Submit']} current={step} done={(i) => (i === 0 ? !errors.sender : i === 1 ? !errors.subject : i === 2 ? !errors.content : false)} />
      <Card>
        <form onSubmit={submit} noValidate className="max-w-2xl">
          <TextField name="sender" label="Sender's email address" placeholder="name@domain.com" value={v.sender} onChange={(e) => form.set('sender', e.target.value)} status={form.status('sender', errors.sender)} base={REQ.sender} error={errors.sender} />
          {step === 0 && (
            <Button disabled={!!errors.sender} onClick={() => next(1)}>
              Next
            </Button>
          )}
          {step >= 1 && (
            <TextField name="subject" label="Email subject line" value={v.subject} onChange={(e) => form.set('subject', e.target.value)} status={form.status('subject', errors.subject)} base={REQ.subject} error={errors.subject} counter={{ value: v.subject.length, max: 100 }} />
          )}
          {step === 1 && (
            <Button disabled={!!errors.subject} onClick={() => next(2)}>
              Next
            </Button>
          )}
          {step >= 2 && (
            <>
              <TextArea
                name="content"
                label="Full email header and body"
                rows={10}
                className="font-mono text-sm"
                placeholder={'From: ...\nTo: ...\nSubject: ...\n\nMessage body...'}
                value={v.content}
                onChange={(e) => form.set('content', e.target.value)}
                status={form.status('content', errors.content)}
                base={REQ.emailContent}
                error={errors.content}
                counter={{ value: v.content.length, max: 1500 }}
                hint="In most mail apps, use Show original or View source to copy the full header."
              />
              <Button type="submit" loading={busy}>
                Submit
              </Button>
            </>
          )}
        </form>
      </Card>
      <ValidationSummaryDialog items={form.summary?.items ?? null} onClose={form.closeSummary} />
      <MessageDialog open={dialog === 'duplicate'} onClose={() => setDialog(null)} tone="info" title="Already reported" message="This email has already been reported. Our team is aware of the issue and is working on a resolution." />
      <MessageDialog open={dialog === 'failed'} onClose={() => setDialog(null)} tone="error" title="Submission failed" message="We were unable to submit your report. Please try again." />
    </>
  )
}
