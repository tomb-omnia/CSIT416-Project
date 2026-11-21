// UC2 Reset Password: step 1 (request recovery link) and step 2 (/reset/new, choose new password).

import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Inbox, MailCheck } from 'lucide-react'
import { useDemo, pushAudit } from '../../store/DemoStore'
import * as V from '../../lib/validators'
import { REQ } from '../../lib/validators'
import { useForm } from '../../components/ui/useForm'
import { TextField } from '../../components/ui/RequirementField'
import { ValidationSummaryDialog } from '../../components/ui/Dialog'
import { Button } from '../../components/ui/Button'
import { Banner } from '../../components/ui/Banner'
import { AuthLayout } from './AuthLayout'

export function ResetRequestPage() {
  const { toast } = useDemo()
  const nav = useNavigate()
  const form = useForm({ email: '' })
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const err = V.recoverEmail(form.values.email)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.submit({ email: err }, { email: 'Organizational Email' })) return
    // 4A2: always report success, whether or not an account matches (security behavior).
    setSentTo(form.values.email.trim())
    setCooldown(45)
  }

  return (
    <AuthLayout title="Reset Password" uc="UC2" subtitle="We will send a recovery link to your organizational email.">
      {!sentTo ? (
        <form onSubmit={submit} noValidate>
          <TextField name="email" label="Organizational Email" type="email" value={form.values.email} onChange={(e) => form.set('email', e.target.value)} status={form.status('email', err)} base={REQ.recoverEmail} error={err} />
          <Button type="submit" className="w-full">
            Recover Account
          </Button>
        </form>
      ) : (
        <div className="space-y-5">
          <Banner tone="success" title="Email sent!">
            If an active account uses {sentTo}, a recovery link is on its way.
          </Banner>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Inbox className="h-4 w-4" aria-hidden /> Check your inbox (simulated)
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-3 text-sm">
              <div className="font-medium">PhishGuard Account Recovery</div>
              <div className="text-slate-500">To: {sentTo}</div>
              <p className="mt-2">Select the link below to choose a new password. This link expires in 30 minutes.</p>
              <Button className="mt-3" onClick={() => nav(`/reset/new?email=${encodeURIComponent(sentTo)}`)}>
                <MailCheck className="h-4 w-4" aria-hidden /> Open recovery link
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-slate-600">Did not receive it?</span>
            <Button
              variant="secondary"
              disabled={cooldown > 0}
              onClick={() => {
                setCooldown(45)
                toast('Email sent!')
              }}
            >
              {cooldown > 0 ? `Resend Link (${cooldown}s)` : 'Resend Link'}
            </Button>
          </div>
        </div>
      )}
      <p className="mt-6 text-center text-sm">
        <Link to="/login" className="text-accent-700 hover:underline">
          Back to login
        </Link>
      </p>
    </AuthLayout>
  )
}

export function ResetNewPasswordPage() {
  const { state, mutate } = useDemo()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const form = useForm({ password: '', confirm: '' })
  const minPw = Math.max(10, state.policies.minPasswordLength)
  const errors = { password: V.password(form.values.password, minPw), confirm: V.confirmPassword(form.values.confirm, form.values.password) }
  const email = params.get('email') ?? ''

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.submit(errors, { password: 'New Password', confirm: 'Confirm Password' })) return
    const user = state.users.find((u) => u.email.toLowerCase() === email.toLowerCase())
    if (user) mutate((s) => pushAudit(s, user, 'Password Reset', user.username))
    nav('/login', { state: { flash: 'Password Reset Successful.' } })
  }

  return (
    <AuthLayout title="Choose a New Password" uc="UC2" subtitle={email ? `Resetting the password for ${email}.` : undefined}>
      <form onSubmit={submit} noValidate>
        <TextField name="password" label="New Password" type="password" autoComplete="new-password" value={form.values.password} onChange={(e) => form.set('password', e.target.value)} status={form.status('password', errors.password)} base={REQ.password(minPw)} error={errors.password} />
        <TextField name="confirm" label="Confirm Password" type="password" autoComplete="new-password" value={form.values.confirm} onChange={(e) => form.set('confirm', e.target.value)} status={form.status('confirm', errors.confirm)} base={REQ.confirm} error={errors.confirm} />
        <Button type="submit" className="w-full">
          Reset Password
        </Button>
      </form>
      <ValidationSummaryDialog items={form.summary?.items ?? null} onClose={form.closeSummary} />
    </AuthLayout>
  )
}
