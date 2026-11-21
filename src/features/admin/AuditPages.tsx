// UC5 Review Audit Log (/admin/audit) and Flagged Audit Entries (/admin/audit/flagged).
// Export downloads a real CSV built in the browser.

import { useState } from 'react'
import { Download, Flag } from 'lucide-react'
import { useDemo, useMe, pushAudit } from '../../store/DemoStore'
import { DetailList, PageHeader } from '../../components/ui/Card'
import { Button, LinkButton } from '../../components/ui/Button'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { PlainInput, PlainSelect, RequirementMessage } from '../../components/ui/RequirementField'
import * as V from '../../lib/validators'
import { REQ } from '../../lib/validators'
import { endOfDay, fmtDateTime, parseDateInput, toDateInput } from '../../lib/dates'
import { ROLE_LABEL, type AuditEntry, type Role } from '../../store/types'

function AuditTable({ rows, empty, onFlag }: { rows: AuditEntry[]; empty: string; onFlag?: (e: AuditEntry) => void }) {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <DataTable
      rows={rows}
      rowKey={(e) => e.id}
      empty={empty}
      initialSort={{ key: 't', dir: 'desc' }}
      onRowClick={(e) => setOpen((o) => (o === e.id ? null : e.id))}
      selectedKey={open}
      expanded={(e) =>
        open === e.id ? (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <DetailList
              items={[
                ['Date and time', new Date(e.time).toLocaleString()],
                ['Performed by', `${e.actor} (${ROLE_LABEL[e.actorRole as Role] ?? e.actorRole})`],
                ['IP address', e.ip],
                ['Event type', e.eventType],
                ['Affected account or setting', e.target],
                ['Old value', e.oldValue ?? '-'],
                ['New value', e.newValue ?? '-'],
                ['Result', <StatusBadge status={e.result} />],
              ]}
            />
            {onFlag &&
              (e.flagged ? (
                <StatusBadge status="Flagged" tone="red" />
              ) : (
                <Button variant="secondary" onClick={(ev) => { ev.stopPropagation(); onFlag(e) }}>
                  <Flag className="h-4 w-4" /> Flag Record
                </Button>
              ))}
          </div>
        ) : null
      }
      columns={[
        { key: 't', header: 'Time', render: (e) => fmtDateTime(e.time), sort: (e) => e.time },
        { key: 'ev', header: 'Event type', render: (e) => <span className="flex items-center gap-1.5">{e.flagged && <Flag className="h-3.5 w-3.5 text-red-600" aria-label="Flagged" />}{e.eventType}</span>, sort: (e) => e.eventType },
        { key: 'a', header: 'Performed by', render: (e) => e.actor, sort: (e) => e.actor },
        { key: 'tg', header: 'Affected account or setting', render: (e) => <span className="break-all">{e.target}</span> },
        { key: 'r', header: 'Result', render: (e) => <StatusBadge status={e.result} /> },
      ]}
    />
  )
}

export function AuditLogPage() {
  const { state, mutate, toast } = useDemo()
  const me = useMe()
  const [f, setF] = useState({ start: '', end: '', type: '', username: '' })
  const [applied, setApplied] = useState<typeof f | null>(null)
  const [touched, setTouched] = useState(false)
  const dateErr = V.auditDateRange(f.start, f.end)
  const userErr = V.auditUsername(f.username)
  const types = Array.from(new Set(state.audit.map((e) => e.eventType))).sort()
  const sorted = [...state.audit].sort((a, b) => b.time.localeCompare(a.time))

  let rows: AuditEntry[]
  let empty = 'No records match your query.'
  if (!applied) rows = sorted.slice(0, 50)
  else {
    const s = parseDateInput(applied.start)
    const e = parseDateInput(applied.end)
    rows = sorted.filter((x) => (!s || new Date(x.time) >= s) && (!e || new Date(x.time) <= endOfDay(e)) && (!applied.type || x.eventType === applied.type) && (!applied.username || x.actor.toLowerCase() === applied.username.toLowerCase() || x.target.toLowerCase() === applied.username.toLowerCase()))
    const known = state.users.some((u) => u.username.toLowerCase() === applied.username.toLowerCase()) || state.audit.some((x) => x.actor.toLowerCase() === applied.username.toLowerCase())
    if (applied.username && !known) {
      rows = []
      empty = `No account found with the username ${applied.username}.`
    }
  }

  const apply = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (dateErr || userErr) return
    setApplied({ ...f })
  }
  const exportCsv = () => {
    const times = rows.map((r) => r.time).sort()
    const start = applied?.start || (times[0] ? toDateInput(new Date(times[0])) : toDateInput(new Date()))
    const end = applied?.end || (times.length ? toDateInput(new Date(times[times.length - 1])) : toDateInput(new Date()))
    const esc = (v: string | undefined) => `"${(v ?? '').replace(/"/g, '""')}"`
    const csv = ['id,time,event_type,actor,actor_role,ip,target,old_value,new_value,result,flagged', ...rows.map((r) => [r.id, r.time, r.eventType, r.actor, r.actorRole, r.ip, r.target, r.oldValue, r.newValue, r.result, String(r.flagged)].map(esc).join(','))].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `audit_log_${start}_${end}.csv`
    a.click()
    URL.revokeObjectURL(url)
    mutate((s) => pushAudit(s, me, 'Audit Export', `audit_log_${start}_${end}.csv`, { newValue: `${rows.length} entries` }))
    toast(`Exported ${rows.length} entries.`)
  }
  const flag = (e: AuditEntry) => {
    mutate((s) => {
      const x = s.audit.find((y) => y.id === e.id)
      if (x) x.flagged = true
      pushAudit(s, me, 'Audit Entry Flagged', e.id)
    })
    toast('Record flagged and added to Flagged Audit Entries.')
  }

  const dStatus = !touched ? 'neutral' : dateErr ? 'error' : 'ok'
  return (
    <>
      <PageHeader
        title="Audit Log"
        uc="UC5"
        subtitle="Read-only log of administrative and security events."
        actions={
          <>
            <LinkButton to="/admin/audit/flagged" variant="secondary"><Flag className="h-4 w-4" /> Flagged Audit Entries</LinkButton>
            <Button onClick={exportCsv} disabled={rows.length === 0}><Download className="h-4 w-4" /> Export Entries</Button>
          </>
        }
      />
      <form onSubmit={apply} className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label htmlFor="au-start" className="mb-1 block text-xs font-medium text-slate-600">Start date</label>
            <PlainInput id="au-start" type="date" value={f.start} onChange={(e) => { setF({ ...f, start: e.target.value }); setTouched(true) }} invalid={dStatus === 'error'} />
          </div>
          <div>
            <label htmlFor="au-end" className="mb-1 block text-xs font-medium text-slate-600">End date</label>
            <PlainInput id="au-end" type="date" value={f.end} onChange={(e) => { setF({ ...f, end: e.target.value }); setTouched(true) }} invalid={dStatus === 'error'} />
          </div>
          <div>
            <label htmlFor="au-type" className="mb-1 block text-xs font-medium text-slate-600">Event type</label>
            <PlainSelect id="au-type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
              <option value="">All event types</option>
              {types.map((t) => <option key={t}>{t}</option>)}
            </PlainSelect>
          </div>
          <div>
            <label htmlFor="au-user" className="mb-1 block text-xs font-medium text-slate-600">Username</label>
            <PlainInput id="au-user" value={f.username} onChange={(e) => { setF({ ...f, username: e.target.value }); setTouched(true) }} invalid={touched && !!userErr} />
          </div>
        </div>
        <RequirementMessage status={dStatus} base={REQ.auditRange} error={dateErr} />
        {touched && userErr && <p className="mt-1 text-sm text-red-700">{userErr}</p>}
        <div className="mt-3 flex items-center gap-3">
          <Button type="submit">Apply Filter(s)</Button>
          {applied && <Button variant="ghost" onClick={() => { setApplied(null); setF({ start: '', end: '', type: '', username: '' }); setTouched(false) }}>Clear</Button>}
        </div>
      </form>
      <p className="mb-2 text-sm text-slate-600">{applied ? `Showing ${rows.length} records.` : `Showing the ${rows.length} most recent entries.`}</p>
      <AuditTable rows={rows} empty={empty} onFlag={flag} />
    </>
  )
}

export function FlaggedAuditPage() {
  const { state } = useDemo()
  return (
    <>
      <PageHeader title="Flagged Audit Entries" uc="UC5" back={{ to: '/admin/audit', label: 'Audit Log' }} subtitle="Audit records flagged for follow-up." />
      <AuditTable rows={state.audit.filter((e) => e.flagged)} empty="No audit entries have been flagged." />
    </>
  )
}
