// UC3 Manage User Account

import { useState } from 'react'
import { Search, Trash2, UserCog, UserMinus, UserPlus } from 'lucide-react'
import { useDemo, useMe, pushAudit, pushNotification } from '../../store/DemoStore'
import { Card, DetailList, PageHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { PlainInput, PlainSelect } from '../../components/ui/RequirementField'
import { ConfirmDialog, CredentialConfirmDialog } from '../../components/ui/Dialog'
import { fmtDateTime } from '../../lib/dates'
import { ROLE_LABEL, type Role, type User } from '../../store/types'

type Action = { kind: 'role'; newRole: Role } | { kind: 'delete' } | { kind: 'deactivate' } | { kind: 'reactivate' }
const ASSIGNABLE: Role[] = ['general', 'trainer', 'officer'] // Section 9: Site Administrator is not offered

export default function UsersPage() {
  const { state, mutate, toast } = useDemo()
  const me = useMe()
  const [q, setQ] = useState('')
  const [applied, setApplied] = useState('')
  const [sel, setSel] = useState<string | null>(null)
  const [newRole, setNewRole] = useState<Role | ''>('')
  const [action, setAction] = useState<Action | null>(null)
  const [step, setStep] = useState<'confirm' | 'cred' | null>(null)

  const others = state.users.filter((u) => u.username !== me.username) // the actor's own account is not returned
  const rows = others.filter((u) => !applied || u.username.toLowerCase().includes(applied.toLowerCase()) || u.email.toLowerCase().includes(applied.toLowerCase()))
  const user = state.users.find((u) => u.username === sel)

  const start = (a: Action) => {
    setAction(a)
    setStep(a.kind === 'role' || a.kind === 'delete' ? 'confirm' : 'cred')
  }
  const cancel = () => {
    setAction(null)
    setStep(null)
  }
  const apply = () => {
    if (!user || !action) return
    const u = user.username
    mutate((s) => {
      const x = s.users.find((y) => y.username === u)
      if (!x) return
      if (action.kind === 'role') {
        pushAudit(s, me, 'Role Changed', u, { oldValue: ROLE_LABEL[x.role], newValue: ROLE_LABEL[action.newRole] })
        pushNotification(s, u, `Your role has been changed from ${ROLE_LABEL[x.role]} to ${ROLE_LABEL[action.newRole]}.`)
        x.role = action.newRole
      } else if (action.kind === 'deactivate') {
        pushAudit(s, me, 'Account Deactivated', u, { oldValue: x.status, newValue: 'Deactivated' })
        x.status = 'Deactivated'
      } else if (action.kind === 'reactivate') {
        pushAudit(s, me, 'Account Reactivated', u, { oldValue: x.status, newValue: 'Active' })
        x.status = 'Active'
      } else {
        pushAudit(s, me, 'Account Deleted', u, { oldValue: `${ROLE_LABEL[x.role]}, ${x.status}`, newValue: 'Deleted' })
        s.users = s.users.filter((y) => y.username !== u)
      }
    })
    toast(action.kind === 'role' ? `Role updated for ${u}.` : action.kind === 'delete' ? `${u} was deleted. Active sessions were ended.` : action.kind === 'deactivate' ? `${u} was deactivated. Active sessions were ended.` : `${u} was reactivated with their previous role.`)
    if (action.kind === 'delete') setSel(null)
    setNewRole('')
    cancel()
  }

  const actionBtn = (label: string, Icon: typeof UserCog, enabled: boolean, onClick: () => void, variant: 'secondary' | 'danger' = 'secondary') => (
    <Button variant={variant} disabled={!enabled} onClick={onClick} className="justify-start">
      <Icon className="h-4 w-4" /> {label}
    </Button>
  )

  const credMessage = (u: User, a: Action) =>
    a.kind === 'deactivate' ? 'Are you sure you want to deactivate this account' :
    // ASSUMPTION: the document's 6A3 prompt repeats "deactivate"; "reactivate" is used here as the evident intent.
    a.kind === 'reactivate' ? 'Are you sure you want to reactivate this account' :
    a.kind === 'delete' ? `Re-enter your password to delete ${u.username}.` :
    `Re-enter your password to change the role of ${u.username}.`

  return (
    <>
      <PageHeader title="User Management" uc="UC3" subtitle="Find an account to change its role or status." />
      <form className="mb-4 flex max-w-xl gap-2" onSubmit={(e) => { e.preventDefault(); setApplied(q.trim()) }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden />
          <PlainInput aria-label="Search by username or email" placeholder="Search by username or email" value={q} onChange={(e) => { setQ(e.target.value); if (!e.target.value) setApplied('') }} className="pl-9" />
        </div>
        <Button type="submit">Search</Button>
      </form>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <DataTable
          rows={rows}
          rowKey={(u) => u.username}
          onRowClick={(u) => { setSel(u.username); setNewRole('') }}
          selectedKey={sel}
          empty={`0 account(s) match ${applied}`}
          initialSort={{ key: 'u', dir: 'asc' }}
          columns={[
            { key: 'u', header: 'Username', render: (u) => <span className="font-medium">{u.username}</span>, sort: (u) => u.username },
            { key: 'e', header: 'Email', render: (u) => u.email, sort: (u) => u.email },
            { key: 'r', header: 'Role', render: (u) => ROLE_LABEL[u.role], sort: (u) => u.role },
            { key: 's', header: 'Status', render: (u) => <StatusBadge status={u.status} />, sort: (u) => u.status },
            { key: 'l', header: 'Last login', render: (u) => fmtDateTime(u.lastLogin), sort: (u) => u.lastLogin ?? '' },
          ]}
        />
        <Card title="Account details">
          {!user ? (
            <p className="text-sm text-slate-500">Select an account to see details and actions.</p>
          ) : (
            <>
              <DetailList items={[['Name', user.name], ['Username', user.username], ['Email', user.email], ['Role', ROLE_LABEL[user.role]], ['Status', <StatusBadge status={user.status} />], ['Last login', fmtDateTime(user.lastLogin)]]} />
              <div className="mt-5 space-y-3">
                <div className="rounded-md border border-slate-200 p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><UserCog className="h-4 w-4" /> Manage Roles</div>
                  <div className="flex gap-2">
                    <PlainSelect aria-label="New role" value={newRole} onChange={(e) => setNewRole(e.target.value as Role)}>
                      <option value="">Choose a role</option>
                      {ASSIGNABLE.filter((r) => r !== user.role).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                    </PlainSelect>
                    <Button disabled={!newRole} onClick={() => newRole && start({ kind: 'role', newRole })}>Change</Button>
                  </div>
                </div>
                <div className="grid gap-2">
                  {actionBtn('Reactivate Account', UserPlus, user.status !== 'Active', () => start({ kind: 'reactivate' }))}
                  {actionBtn('Deactivate Account', UserMinus, user.status !== 'Deactivated', () => start({ kind: 'deactivate' }))}
                  {actionBtn('Delete Account', Trash2, true, () => start({ kind: 'delete' }), 'danger')}
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
      {user && action && (
        <>
          <ConfirmDialog
            open={step === 'confirm'}
            danger={action.kind === 'delete'}
            title={action.kind === 'delete' ? 'Delete account' : 'Change role'}
            message={action.kind === 'role' ? `Change the role of ${user.username} from ${ROLE_LABEL[user.role]} to ${ROLE_LABEL[action.newRole]}?` : `Are you sure that you want to delete ${user.username}?`}
            onCancel={cancel}
            onConfirm={() => setStep('cred')}
          />
          <CredentialConfirmDialog open={step === 'cred'} message={credMessage(user, action)} onCancel={cancel} onConfirm={apply} />
        </>
      )}
    </>
  )
}
