// UC29 Report Phone/Text Phishing Incident

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, MessageSquare, PhoneCall } from 'lucide-react'
import { useDemo, useMe, pushNotification } from '../../store/DemoStore'
import * as V from '../../lib/validators'
import { REQ } from '../../lib/validators'
import { useForm } from '../../components/ui/useForm'
import { FieldGroup, TextArea, TextField } from '../../components/ui/RequirementField'
import { Dialog, MessageDialog, ValidationSummaryDialog } from '../../components/ui/Dialog'
import { Button, LinkButton } from '../../components/ui/Button'
import { Card, PageHeader } from '../../components/ui/Card'
import { reportId } from '../../lib/ids'
import { nowIso, toDateTimeInput } from '../../lib/dates'
import { StatusBadge } from '../../components/ui/StatusBadge'

type IncidentType = '' | 'Phone Call' | 'Text Message'

export default function ReportPhoneTextPage() {
  const { state, mutate, simulate } = useDemo()
  const me = useMe()
  const nav = useNavigate()
  const form = useForm({ type: '' as IncidentType, phone: '', unknown: false, when: '', description: '' })
  const v = form.values
  const errors = {
    type: v.type ? null : 'Please select an incident type.',
    phone: V.phone(v.phone, v.unknown),
    when: V.incidentDateTime(v.when),
    description: V.incidentDescription(v.description),
  }
  const [dialog, setDialog] = useState<null | 'duplicate' | 'failed'>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.submit(errors, { type: 'Incident type', phone: 'Phone number', when: 'Date and time', description: 'Description' })) return
    const phone = v.unknown ? null : v.phone.trim()
    const dup = state.reports.some(
      (r) => r.kind === 'incident' && r.reporter === me.username && r.incidentType === v.type && (r.phone ?? null) === phone && r.occurredAt.slice(0, 16) === new Date(v.when).toISOString().slice(0, 16) && r.description.trim() === v.description.trim(),
    )
    if (dup) return setDialog('duplicate')
    setBusy(true)
    const res = await simulate('save')
    setBusy(false)
    if (res !== 'ok') return setDialog('failed')
    const id = reportId(state.reports.map((r) => r.id))
    mutate((s) => {
      s.reports.push({ kind: 'incident', id, reporter: me.username, incidentType: v.type as 'Phone Call' | 'Text Message', phone, occurredAt: new Date(v.when).toISOString(), description: v.description, submittedAt: nowIso(), status: 'Pending Review' })
      pushNotification(s, s.users.filter((u) => u.role === 'officer').map((u) => u.username), `New ${v.type.toLowerCase()} incident ${id} is pending review.`, '/security/incidents')
    })
    setDone(id)
  }

  if (done)
    return (
      <>
        <PageHeader title="Report Phone/Text Phishing Incident" uc="UC29" />
        <Card>
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600" aria-hidden />
            <p className="mt-3 text-lg font-semibold text-green-800">Report Submitted Successfully. Your Report ID is {done}.</p>
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

  const typeBtn = (t: 'Phone Call' | 'Text Message', Icon: typeof PhoneCall, first?: boolean) => (
    <button
      type="button"
      id={first ? 'f-type' : undefined}
      role="radio"
      aria-checked={v.type === t}
      onClick={() => form.set('type', t)}
      className={`flex flex-1 items-center gap-3 rounded-lg border-2 px-4 py-3 text-left ${v.type === t ? 'border-accent-600 bg-accent-50' : 'border-slate-200 hover:border-slate-300'}`}
    >
      <Icon className="h-5 w-5 text-accent-700" aria-hidden />
      <span className="font-medium">{t}</span>
    </button>
  )

  return (
    <>
      <PageHeader title="Report Phone/Text Phishing Incident" uc="UC29" subtitle="Report a suspicious call or text message to the Cybersecurity team." />
      <Card>
        <form onSubmit={submit} noValidate className="max-w-2xl">
          <FieldGroup name="type" label="Incident type" status={form.status('type', errors.type)} base={REQ.incidentType} error={errors.type}>
            <div role="radiogroup" aria-labelledby="l-type" className="flex gap-3">
              {typeBtn('Phone Call', PhoneCall, true)}
              {typeBtn('Text Message', MessageSquare)}
            </div>
          </FieldGroup>
          {v.type && (
            <>
              <TextField
                name="phone"
                label="Phone number"
                type="tel"
                placeholder="(973) 555-0100"
                value={v.phone}
                disabled={v.unknown}
                onChange={(e) => form.set('phone', e.target.value)}
                status={form.status('phone', errors.phone)}
                base={REQ.phone}
                error={errors.phone}
              />
              <label className="-mt-3 mb-5 flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-accent-700" checked={v.unknown} onChange={(e) => form.set('unknown', e.target.checked)} />
                Unknown/Blocked Number
              </label>
              <TextField
                name="when"
                label="Date and time of the incident"
                type="datetime-local"
                max={toDateTimeInput(new Date())}
                value={v.when}
                onChange={(e) => form.set('when', e.target.value)}
                status={form.status('when', errors.when)}
                base={REQ.incidentDate}
                error={errors.when}
              />
              <TextArea
                name="description"
                label={v.type === 'Text Message' ? 'Paste the suspicious text message' : 'Describe what the caller said or requested'}
                rows={6}
                value={v.description}
                onChange={(e) => form.set('description', e.target.value)}
                status={form.status('description', errors.description)}
                base={REQ.incidentDesc}
                error={errors.description}
                counter={{ value: v.description.length, max: 1500 }}
              />
            </>
          )}
          <Button type="submit" loading={busy}>
            Submit Report
          </Button>
        </form>
      </Card>
      <ValidationSummaryDialog title="Report Incomplete. Please complete all required fields." items={form.summary?.items ?? null} onClose={form.closeSummary} />
      <Dialog
        open={dialog === 'duplicate'}
        onClose={() => setDialog(null)}
        tone="info"
        title="Already reported"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Return to form
            </Button>
            <Button onClick={() => nav('/my-reports')}>View My Reports</Button>
          </>
        }
      >
        This incident has already been reported.
      </Dialog>
      <MessageDialog open={dialog === 'failed'} onClose={() => setDialog(null)} tone="error" title="Submission failed" message="Report could not be submitted. Please try again." />
    </>
  )
}
