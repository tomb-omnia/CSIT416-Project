// UC34 Conduct Access Review: list (/admin/access-review) and account review (/admin/access-review/:username).

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, Search } from 'lucide-react'
import { useDemo, useMe, pushAudit } from '../../store/DemoStore'
import { Card, DetailList, PageHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Banner } from '../../components/ui/Banner'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { FieldGroup, PlainInput, PlainSelect, TextArea } from '../../components/ui/RequirementField'
import { ConfirmDialog, MessageDialog, ValidationSummaryDialog } from '../../components/ui/Dialog'
import { useForm } from '../../components/ui/useForm'
import * as V from '../../lib/validators'
import { REQ } from '../../lib/validators'
import { fmtDateTime, nowIso } from '../../lib/dates'
import { ROLE_LABEL, type Role } from '../../store/types'

export const PERMISSIONS: Record<Role, string[]> = {
  general: ['Complete assigned training and simulations', 'Report suspicious emails and phone/text incidents', 'Scan links and attachments', 'Verify email senders', 'Search the Knowledge Base and submit articles', 'Generate own training certificates'],
  trainer: ['Create and edit training modules', 'Assign training, remedial, and awareness modules', 'Manage completion deadlines', 'Manage the question bank', 'Generate compliance reports', 'View phishing test results'],
  officer: ['Classify reported emails', 'Review incoming incidents and run investigations', 'Purge emails from organizational inboxes', 'Manage the domain blocklist', 'Create phishing tests', 'Approve Knowledge Base articles', 'Publish bulletins and advisories'],
  admin: ['Manage user accounts and roles', 'Configure security policies', 'Review and export the audit log', 'Conduct access reviews', 'Monitor system activity logs'],
}

const daysSince = (iso: string | null) => (iso ? (Date.now() - new Date(iso).getTime()) / 86_400_000 : Infinity)

export function AccessReviewListPage() {
  const { state } = useDemo()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [login, setLogin] = useState('')
  const qt = q.trim().toLowerCase()
  const emailErr = qt.includes('@') && !V.isEmail(qt) ? 'Invalid Email Address. Please Enter a Valid Email Address.' : null
  const rows = emailErr
    ? []
    : state.users.filter((u) => {
        const d = daysSince(u.lastLogin)
        return (
          (!qt || u.username.toLowerCase().includes(qt) || u.email.toLowerCase() === qt || (!qt.includes('@') && u.email.toLowerCase().includes(qt))) &&
          (!role || u.role === role) &&
          (!status || u.status === status) &&
          (!login || (login === '30' ? d <= 30 : login === '90' ? d > 30 && d <= 90 : login === 'old' ? d > 90 && d !== Infinity : d === Infinity))
        )
      })
  const filtering = !!(qt || role || status || login)
  return (
    <>
      <PageHeader title="Conduct Access Review" uc="UC34" subtitle="Check that every account has the right level of access." />
      <div className="mb-4 grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <label htmlFor="ar-q" className="mb-1 block text-xs font-medium text-slate-600">Search by username or email</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden />
            <PlainInput id="ar-q" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} invalid={!!emailErr} />
          </div>
          {emailErr && <p className="mt-1 text-sm text-red-700">{emailErr}</p>}
        </div>
        <div>
          <label htmlFor="ar-role" className="mb-1 block text-xs font-medium text-slate-600">Role</label>
          <PlainSelect id="ar-role" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">All roles</option>
            {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </PlainSelect>
        </div>
        <div>
          <label htmlFor="ar-status" className="mb-1 block text-xs font-medium text-slate-600">Status</label>
          <PlainSelect id="ar-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option>Active</option>
            <option>Locked</option>
            <option>Deactivated</option>
          </PlainSelect>
        </div>
        <div>
          <label htmlFor="ar-login" className="mb-1 block text-xs font-medium text-slate-600">Last login</label>
          <PlainSelect id="ar-login" value={login} onChange={(e) => setLogin(e.target.value)}>
            <option value="">Any time</option>
            <option value="30">Within 30 days</option>
            <option value="90">30 to 90 days ago</option>
            <option value="old">Over 90 days ago</option>
            <option value="never">Never</option>
          </PlainSelect>
        </div>
      </div>
      <DataTable
        rows={rows}
        rowKey={(u) => u.username}
        onRowClick={(u) => nav(`/admin/access-review/${u.username}`)}
        empty={state.users.length === 0 ? 'No User Accounts Available for Review.' : filtering ? 'No User Accounts Found Matching Your Search.' : 'No User Accounts Available for Review.'}
        initialSort={{ key: 'u', dir: 'asc' }}
        columns={[
          { key: 'u', header: 'Username', render: (u) => <span className="font-medium text-accent-700">{u.username}</span>, sort: (u) => u.username.toLowerCase() },
          { key: 'r', header: 'Role', render: (u) => ROLE_LABEL[u.role], sort: (u) => u.role },
          { key: 's', header: 'Account status', render: (u) => <StatusBadge status={u.status} />, sort: (u) => u.status },
          { key: 'l', header: 'Last login', render: (u) => fmtDateTime(u.lastLogin), sort: (u) => u.lastLogin ?? '' },
          { key: 'rv', header: 'Review status', render: (u) => <StatusBadge status={u.accessReview} />, sort: (u) => u.accessReview },
        ]}
      />
    </>
  )
}

const CLASSES = [
  { v: 'Access Approved', d: 'Account has the appropriate permissions.' },
  { v: 'Access Modification Required', d: 'Account has permissions that should be changed.' },
  { v: 'Further Investigation Required', d: 'Account requires additional examination.' },
]

export function AccessReviewDetailPage() {
  const { username } = useParams()
  const { state, mutate, simulate } = useDemo()
  const me = useMe()
  const nav = useNavigate()
  const u = state.users.find((x) => x.username === username)
  const form = useForm({ cls: '', notes: '' })
  const errors = { cls: form.values.cls ? null : 'Please Select an Access Review Classification.', notes: V.reviewNotesUC34(form.values.notes) }
  const [dialog, setDialog] = useState<null | 'locked' | 'confirm' | 'failed'>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const back = { to: '/admin/access-review', label: 'Conduct Access Review' }

  if (!u)
    return (
      <>
        <PageHeader title="Access Review" back={back} />
        <Banner tone="error" title="User Account Unavailable. Please Refresh the Account List." />
      </>
    )
  const mine = u.accessReview === 'Under Review' && u.reviewLockedBy === me.username
  const recent = state.activity.filter((a) => a.username === u.username).slice(0, 6)

  const begin = () => {
    if (u.accessReview === 'Under Review' && u.reviewLockedBy && u.reviewLockedBy !== me.username) return setDialog('locked')
    mutate((s) => {
      const x = s.users.find((y) => y.username === u.username)
      if (x) {
        x.accessReview = 'Under Review'
        x.reviewLockedBy = me.username
      }
    })
  }
  const submit = () => {
    if (!form.submit(errors, { cls: 'Classification', notes: 'Review Notes' })) return
    setDialog('confirm')
  }
  const confirm = async () => {
    setBusy(true)
    const r = await simulate('save')
    setBusy(false)
    if (r !== 'ok') return setDialog('failed')
    const status = form.values.cls === 'Access Approved' ? 'Completed' : 'Action Required'
    mutate((s) => {
      const x = s.users.find((y) => y.username === u.username)
      if (x) {
        x.accessReview = status
        x.reviewLockedBy = undefined
        x.accessReviewNotes = { classification: form.values.cls, notes: form.values.notes, by: me.username, at: nowIso() }
      }
      pushAudit(s, me, 'Access Review Completed', u.username, { oldValue: 'Under Review', newValue: `${status} (${form.values.cls})` })
    })
    setDialog(null)
    setDone(true)
  }

  if (done)
    return (
      <>
        <PageHeader title={`Access Review: ${u.username}`} uc="UC34" back={back} />
        <Card>
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600" aria-hidden />
            <p className="mt-3 text-lg font-semibold text-green-800">Access Review Submitted Successfully.</p>
            <Button className="mt-6" onClick={() => nav('/admin/access-review')}>Done</Button>
          </div>
        </Card>
      </>
    )

  return (
    <>
      <PageHeader title={`Access Review: ${u.username}`} uc="UC34" back={back} actions={<StatusBadge status={u.accessReview} />} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card title="Account">
            <DetailList items={[['Name', u.name], ['Username', u.username], ['Email', u.email], ['Role', ROLE_LABEL[u.role]], ['Account status', <StatusBadge status={u.status} />], ['Last login', fmtDateTime(u.lastLogin)]]} />
          </Card>
          <Card title={`Permissions of ${ROLE_LABEL[u.role]}`}>
            <ul className="list-disc space-y-1 pl-5 text-sm">{PERMISSIONS[u.role].map((p) => <li key={p}>{p}</li>)}</ul>
          </Card>
          <Card title="Recent access activity">
            {recent.length === 0 ? <p className="text-sm text-slate-500">No recent activity.</p> : (
              <ul className="space-y-1 text-sm">
                {recent.map((a) => (
                  <li key={a.id} className="flex justify-between gap-2">
                    <span>{a.type}</span>
                    <span className="text-slate-500">{fmtDateTime(a.time)} <StatusBadge status={a.status} /></span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <Card title="Review">
          {u.accessReviewNotes && !mine && (
            <Banner tone="info" className="mb-4" title={`Last review: ${u.accessReviewNotes.classification}`}>
              By {u.accessReviewNotes.by} on {fmtDateTime(u.accessReviewNotes.at)}. {u.accessReviewNotes.notes}
            </Banner>
          )}
          {!mine ? (
            <>
              {u.accessReview === 'Under Review' && u.reviewLockedBy && <p className="mb-3 text-sm text-slate-600">Review in progress by {u.reviewLockedBy}.</p>}
              <Button onClick={begin}>Begin Access Review</Button>
            </>
          ) : (
            <>
              <FieldGroup name="cls" label="Access review classification" status={form.status('cls', errors.cls)} base="Select the appropriate access review classification." error={errors.cls}>
                <div className="space-y-2">
                  {CLASSES.map((c, i) => (
                    <label key={c.v} className={`flex cursor-pointer gap-3 rounded-md border px-3 py-2 ${form.values.cls === c.v ? 'border-accent-600 bg-accent-50' : 'border-slate-200'}`}>
                      <input id={i === 0 ? 'f-cls' : undefined} type="radio" name="cls" className="mt-1 h-4 w-4 accent-accent-700" checked={form.values.cls === c.v} onChange={() => form.set('cls', c.v)} />
                      <span>
                        <span className="font-medium">{c.v}</span>
                        <span className="block text-xs text-slate-600">{c.d}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </FieldGroup>
              <TextArea name="notes" label="Review Notes" rows={6} value={form.values.notes} onChange={(e) => form.set('notes', e.target.value)} status={form.status('notes', errors.notes)} base={REQ.reviewNotes} error={errors.notes} counter={{ value: form.values.notes.length, max: 1500 }} />
              <Button onClick={submit}>Submit Access Review</Button>
            </>
          )}
        </Card>
      </div>
      <ValidationSummaryDialog title="Access Review Incomplete. Please Complete All Required Fields." items={form.summary?.items ?? null} onClose={form.closeSummary} />
      <MessageDialog open={dialog === 'locked'} onClose={() => setDialog(null)} tone="warning" title="Review unavailable" message="This Account Is Currently Being Reviewed by Another Administrator." />
      <ConfirmDialog open={dialog === 'confirm'} busy={busy} message="Are you sure you want to submit this access review?" onCancel={() => setDialog(null)} onConfirm={confirm} />
      <MessageDialog open={dialog === 'failed'} onClose={() => setDialog(null)} tone="error" title="Access Review Could Not Be Saved. Please Try Again." />
    </>
  )
}
