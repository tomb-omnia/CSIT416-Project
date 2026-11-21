// Login (no UC; mock). Any username/password logs in as a General User. Demo buttons pick a role.

import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ShieldCheck, GraduationCap, ShieldAlert, User as UserIcon } from 'lucide-react'
import { useDemo } from '../../store/DemoStore'
import { DEMO_ACCOUNTS } from '../../store/seed'
import { ROLE_LABEL, type Role } from '../../store/types'
import { HOME } from '../../components/layout/nav'
import { Button } from '../../components/ui/Button'
import { Banner } from '../../components/ui/Banner'
import { AuthLayout } from './AuthLayout'

const roleIcons = { general: UserIcon, trainer: GraduationCap, officer: ShieldAlert, admin: ShieldCheck }

export default function LoginPage() {
  const { login, state } = useDemo()
  const nav = useNavigate()
  const loc = useLocation()
  const flash = (loc.state as { flash?: string } | null)?.flash
  const [username, setUsername] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !pw) return setErr('Enter your username and password.')
    // ASSUMPTION: a username registered as a General User (e.g. via UC1) logs in as that account;
    // anything else logs in as the demo General User, per CLAUDE.md Section 6.
    const match = state.users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.role === 'general' && u.status === 'Active')
    login(match?.username ?? DEMO_ACCOUNTS.general)
    nav(HOME.general)
  }
  const demo = (r: Role) => {
    login(DEMO_ACCOUNTS[r])
    nav(HOME[r])
  }

  return (
    <AuthLayout title="Sign in" subtitle="Cybersecurity compliance, education, and phishing defense.">
      {flash && <Banner tone="success" className="mb-5" title={flash} />}
      <form onSubmit={submit} noValidate>
        <label htmlFor="login-user" className="block text-sm font-medium">
          Username
        </label>
        <input id="login-user" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1 mb-4 block w-full rounded-md border border-slate-300 px-3 py-2" />
        <label htmlFor="login-pw" className="block text-sm font-medium">
          Password
        </label>
        <input id="login-pw" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" />
        {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
        <Button type="submit" className="mt-5 w-full">
          Log In
        </Button>
      </form>
      <div className="mt-4 flex flex-wrap justify-between gap-2 text-sm">
        <Link to="/register" className="font-medium text-accent-700 hover:underline">
          Register
        </Link>
        <Link to="/reset" className="font-medium text-accent-700 hover:underline">
          Forgot Username or Password/Reset Password?
        </Link>
      </div>

      <div className="mt-8 rounded-lg border border-dashed border-accent-200 bg-accent-50/60 p-4">
        <div className="mb-1 text-sm font-semibold text-accent-900">Demo sign-in</div>
        <p className="mb-3 text-xs text-slate-600">Prototype only: jump straight in as any actor.</p>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(ROLE_LABEL) as Role[]).map((r) => {
            const Icon = roleIcons[r]
            return (
              <Button key={r} variant="secondary" onClick={() => demo(r)} className="justify-start">
                <Icon className="h-4 w-4 text-accent-700" aria-hidden /> {ROLE_LABEL[r]}
              </Button>
            )
          })}
        </div>
      </div>
    </AuthLayout>
  )
}
