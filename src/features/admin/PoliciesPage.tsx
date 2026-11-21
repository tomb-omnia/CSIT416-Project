// UC4 Manage Security Policies. Approved domains feed UC1 email validation.

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useDemo, useMe, pushAudit } from '../../store/DemoStore'
import { Card, PageHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Banner } from '../../components/ui/Banner'
import { PlainInput, RequirementMessage, TextField } from '../../components/ui/RequirementField'
import { Dialog, MessageDialog, ValidationSummaryDialog } from '../../components/ui/Dialog'
import { useForm } from '../../components/ui/useForm'
import * as V from '../../lib/validators'

const fmtMinutes = (m: number) => (m % 60 === 0 ? `${m / 60} hour${m === 60 ? '' : 's'}` : `${m} minutes`)

export default function PoliciesPage() {
  const { state, mutate, simulate, toast } = useDemo()
  const me = useMe()
  const p = state.policies
  const initial = { minPasswordLength: String(p.minPasswordLength), failedAttempts: String(p.failedAttempts), inactivityMonths: String(p.inactivityMonths), sessionTimeoutMinutes: String(p.sessionTimeoutMinutes), approvedDomains: [...p.approvedDomains] }
  const form = useForm(initial)
  const v = form.values
  const [newDomain, setNewDomain] = useState('')
  const [domainErr, setDomainErr] = useState<string | null>(null)
  const [removedWarning, setRemovedWarning] = useState(false)
  const [review, setReview] = useState(false)
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)

  const errors = {
    minPasswordLength: V.wholeInRange(v.minPasswordLength, 8, 20),
    failedAttempts: V.wholeInRange(v.failedAttempts, 5, 10),
    inactivityMonths: V.wholeInRange(v.inactivityMonths, 3, 12),
    sessionTimeoutMinutes: V.wholeInRange(v.sessionTimeoutMinutes, 15, 1440),
    approvedDomains: v.approvedDomains.length ? null : 'At least one approved domain is required.',
  }
  const changes: [string, string, string][] = []
  if (Number(v.minPasswordLength) !== p.minPasswordLength) changes.push(['Minimum Password Length', `${p.minPasswordLength}`, v.minPasswordLength])
  if (Number(v.failedAttempts) !== p.failedAttempts) changes.push(['Failed login attempts before deactivation', `${p.failedAttempts}`, v.failedAttempts])
  if (Number(v.inactivityMonths) !== p.inactivityMonths) changes.push(['Months of inactivity before deactivation', `${p.inactivityMonths}`, v.inactivityMonths])
  if (Number(v.sessionTimeoutMinutes) !== p.sessionTimeoutMinutes) changes.push(['Session Timeout', fmtMinutes(p.sessionTimeoutMinutes), fmtMinutes(Number(v.sessionTimeoutMinutes))])
  if (v.approvedDomains.join(',') !== p.approvedDomains.join(',')) changes.push(['Approved Registration Domains', p.approvedDomains.join(', '), v.approvedDomains.join(', ') || '(none)'])

  const addDomain = () => {
    const err = V.approvedDomain(newDomain, v.approvedDomains)
    setDomainErr(err)
    if (err) return
    form.set('approvedDomains', [...v.approvedDomains, newDomain.trim().toLowerCase()])
    setNewDomain('')
  }
  const removeDomain = (d: string) => {
    form.set('approvedDomains', v.approvedDomains.filter((x) => x !== d))
    setRemovedWarning(true)
  }
  const saveClick = () => {
    if (!form.submit(errors, { minPasswordLength: 'Minimum Password Length', failedAttempts: 'Failed login attempts', inactivityMonths: 'Months of inactivity', sessionTimeoutMinutes: 'Session Timeout (minutes)', approvedDomains: 'Approved Registration Domains' })) return
    if (changes.length === 0) return toast('No changes to save.', 'info')
    setReview(true)
  }
  const confirm = async () => {
    setBusy(true)
    const r = await simulate('save')
    setBusy(false)
    setReview(false)
    if (r !== 'ok') return setFailed(true)
    mutate((s) => {
      s.policies = { minPasswordLength: Number(v.minPasswordLength), failedAttempts: Number(v.failedAttempts), inactivityMonths: Number(v.inactivityMonths), sessionTimeoutMinutes: Number(v.sessionTimeoutMinutes), approvedDomains: v.approvedDomains }
      changes.forEach(([k, o, n]) => pushAudit(s, me, 'Policy Changed', k, { oldValue: o, newValue: n }))
    })
    setRemovedWarning(false)
    form.reset({ ...v })
    toast('Security policies updated successfully.')
  }

  const num = (name: keyof typeof errors, label: string, min: number, max: number, unit: string) => (
    <TextField name={name} label={label} type="number" min={min} max={max} step={1} value={v[name] as string} onChange={(e) => form.set(name, e.target.value as never)} status={form.status(name, errors[name])} base={`Allowed range: ${min} to ${max} ${unit}.`} error={errors[name]} className="max-w-[10rem]" />
  )

  return (
    <>
      <PageHeader title="Security Policies" uc="UC4" subtitle="Changes apply immediately to new logins, active sessions, registrations, and password changes." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Password Policy">{num('minPasswordLength', 'Minimum Password Length', 8, 20, 'characters')}</Card>
        <Card title="Automated Account Deactivation">
          {num('failedAttempts', 'Failed login attempts before deactivation', 5, 10, 'attempts')}
          {num('inactivityMonths', 'Months of no login activity before deactivation', 3, 12, 'months')}
        </Card>
        <Card title="Session Timeout">
          {num('sessionTimeoutMinutes', 'Session Timeout (minutes)', 15, 1440, 'minutes (15 minutes to 24 hours)')}
          {!errors.sessionTimeoutMinutes && <p className="-mt-3 text-sm text-slate-600">Currently {fmtMinutes(Number(v.sessionTimeoutMinutes))}.</p>}
        </Card>
        <Card title="Approved Registration Domains">
          <ul id="f-approvedDomains" tabIndex={-1} className="mb-3 space-y-1">
            {v.approvedDomains.map((d) => (
              <li key={d} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-1.5">
                <span className="font-mono text-sm">{d}</span>
                <Button size="sm" variant="ghost" onClick={() => removeDomain(d)} aria-label={`Remove ${d}`}>
                  <X className="h-4 w-4" /> Remove
                </Button>
              </li>
            ))}
          </ul>
          {errors.approvedDomains && form.touched.approvedDomains && <p className="mb-2 text-sm font-medium text-red-700">{errors.approvedDomains}</p>}
          {removedWarning && !errors.approvedDomains && <Banner tone="warning" className="mb-3" title="Users with this domain will no longer be able to register. Existing accounts are not affected." />}
          <div className="flex gap-2">
            <PlainInput aria-label="Domain to add" placeholder="newdomain.edu" value={newDomain} onChange={(e) => { setNewDomain(e.target.value); setDomainErr(null) }} onKeyDown={(e) => e.key === 'Enter' && addDomain()} invalid={!!domainErr} />
            <Button variant="secondary" onClick={addDomain}><Plus className="h-4 w-4" /> Add</Button>
          </div>
          <RequirementMessage status={domainErr ? 'error' : 'neutral'} base="Enter a domain such as example.edu." error={domainErr} />
        </Card>
      </div>
      <div className="mt-6 flex items-center gap-3">
        <Button onClick={saveClick}>Save Policies</Button>
        <Button variant="secondary" disabled={changes.length === 0} onClick={() => { form.reset(initial); setRemovedWarning(false) }}>Discard changes</Button>
        <span className="text-sm text-slate-500">{changes.length} pending change(s)</span>
      </div>
      <ValidationSummaryDialog items={form.summary?.items ?? null} onClose={form.closeSummary} />
      <Dialog
        open={review}
        onClose={() => setReview(false)}
        title="Review policy changes"
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setReview(false)} disabled={busy}>Cancel</Button>
            <Button onClick={confirm} loading={busy}>OK</Button>
          </>
        }
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-1">Setting</th>
              <th className="py-1">Old value</th>
              <th className="py-1">New value</th>
            </tr>
          </thead>
          <tbody>
            {changes.map(([k, o, n]) => (
              <tr key={k} className="border-t">
                <td className="py-2 font-medium">{k}</td>
                <td className="py-2 text-slate-500 line-through">{o}</td>
                <td className="py-2 font-semibold">{n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Dialog>
      <MessageDialog open={failed} onClose={() => setFailed(false)} tone="error" title="Security policies could not be saved. Please try again." />
    </>
  )
}
