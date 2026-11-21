// UC1 Register Account

import { useNavigate } from 'react-router-dom'
import { useDemo, pushAudit } from '../../store/DemoStore'
import * as V from '../../lib/validators'
import { REQ } from '../../lib/validators'
import { useForm } from '../../components/ui/useForm'
import { TextField } from '../../components/ui/RequirementField'
import { ValidationSummaryDialog } from '../../components/ui/Dialog'
import { Button, LinkButton } from '../../components/ui/Button'
import { AuthLayout } from './AuthLayout'
import { nowIso } from '../../lib/dates'

export default function RegisterPage() {
  const { state, mutate } = useDemo()
  const nav = useNavigate()
  const form = useForm({ username: '', email: '', password: '', confirm: '' })
  const v = form.values
  // Section 9: UC1 rules (10 to 50); a UC4 minimum above 10 raises the floor.
  const minPw = Math.max(10, state.policies.minPasswordLength)
  const errors = {
    username: V.username(v.username, state.users.map((u) => u.username)),
    email: V.registrationEmail(v.email, state.users.map((u) => u.email), state.policies.approvedDomains),
    password: V.password(v.password, minPw),
    confirm: V.confirmPassword(v.confirm, v.password),
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.submit(errors, { username: 'Username', email: 'Organizational Email', password: 'Password', confirm: 'Confirm Password' })) return
    mutate((s) => {
      s.users.push({ username: v.username, name: v.username, email: v.email.trim().toLowerCase(), role: 'general', status: 'Active', lastLogin: null, group: 'Unassigned', accessReview: 'Not Reviewed' })
      s.groups.find((g) => g.id === 'G-ALL')?.members.push(v.username)
      pushAudit(s, null, 'Account Created', v.username, { newValue: 'General User' })
      s.activity.unshift({ id: `LOG-${Math.floor(40000 + Math.random() * 50000)}`, username: v.username, type: 'Account Created', time: nowIso(), status: 'Success', ip: '10.0.4.27' })
    })
    nav('/login', { state: { flash: 'Account Creation Successful! You may now log in' } })
  }

  return (
    <AuthLayout title="Register Account" uc="UC1" subtitle="Create a PhishGuard account with your organizational email.">
      <form onSubmit={submit} noValidate>
        <TextField name="username" label="Username" autoComplete="username" value={v.username} onChange={(e) => form.set('username', e.target.value)} status={form.status('username', errors.username)} base={REQ.username} error={errors.username} />
        <TextField name="email" label="Organizational Email" type="email" autoComplete="email" value={v.email} onChange={(e) => form.set('email', e.target.value)} status={form.status('email', errors.email)} base={REQ.regEmail} error={errors.email} hint={`Approved domains: ${state.policies.approvedDomains.join(', ')}`} />
        <TextField name="password" label="Password" type="password" autoComplete="new-password" value={v.password} onChange={(e) => form.set('password', e.target.value)} status={form.status('password', errors.password)} base={REQ.password(minPw)} error={errors.password} />
        <TextField name="confirm" label="Confirm Password" type="password" autoComplete="new-password" value={v.confirm} onChange={(e) => form.set('confirm', e.target.value)} status={form.status('confirm', errors.confirm)} base={REQ.confirm} error={errors.confirm} />
        <div className="flex gap-3">
          <Button type="submit" className="flex-1">
            Create Account
          </Button>
          <LinkButton to="/login" variant="secondary">
            Cancel
          </LinkButton>
        </div>
      </form>
      <ValidationSummaryDialog items={form.summary?.items ?? null} onClose={form.closeSummary} />
    </AuthLayout>
  )
}
