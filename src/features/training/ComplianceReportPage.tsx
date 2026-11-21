// UC14 Generate Compliance Report. "Download PDF" opens the browser print dialog on a
// print-styled view of the report (simulated PDF; see CLAUDE.md Section 2).

import { useState } from 'react'
import { Download } from 'lucide-react'
import { useDemo, useMe, pushAudit } from '../../store/DemoStore'
import { Card, PageHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Banner } from '../../components/ui/Banner'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { FieldGroup, SelectField } from '../../components/ui/RequirementField'
import { ValidationSummaryDialog } from '../../components/ui/Dialog'
import { SimpleBarChart } from '../../components/ui/SimpleBarChart'
import { useForm } from '../../components/ui/useForm'
import { endOfDay, fmtDate, fmtDateTime, isPastDeadline, nowIso, parseDateInput, toDateInput } from '../../lib/dates'
import { uid } from '../../lib/ids'
import type { Assignment } from '../../store/types'

const TYPES = ['Training Completion', 'Overdue Assignments', 'Assessment Scores', 'Full Compliance Summary']

export default function ComplianceReportPage() {
  const { state, mutate, toast } = useDemo()
  const me = useMe()
  const today = new Date()
  const form = useForm({ type: '', start: toDateInput(new Date(today.getTime() - 90 * 86_400_000)), end: toDateInput(today), groups: [] as string[] })
  const v = form.values
  const s = parseDateInput(v.start)
  const e = parseDateInput(v.end)
  const errors = {
    type: v.type ? (TYPES.includes(v.type) ? null : 'Invalid Report Type') : 'Select Report Type',
    dates: !v.start || !v.end ? 'Date Required' : !s || !e ? 'Invalid Date' : s > e ? 'Invalid Date Range' : null,
    groups: v.groups.length ? null : 'Select Users or Groups',
  }
  const [report, setReport] = useState<{ id: string; at: string; type: string; rows: Assignment[] } | null>(null)
  const [noRecords, setNoRecords] = useState(false)

  const generate = () => {
    setNoRecords(false)
    if (!form.submit(errors, { type: 'Report type', dates: 'Date range', groups: 'Users or groups' })) return
    const members = new Set(v.groups.flatMap((g) => state.groups.find((x) => x.id === g)?.members ?? []))
    const rows = state.assignments.filter((a) => members.has(a.username) && new Date(a.assignedAt) >= s! && new Date(a.assignedAt) <= endOfDay(e!))
    if (rows.length === 0) {
      setReport(null)
      return setNoRecords(true)
    }
    const id = `RPT-${uid('').slice(1, 7).toUpperCase()}`
    mutate((st) => {
      st.complianceReports.unshift({ id, at: nowIso(), by: me.username, type: v.type })
      pushAudit(st, me, 'Compliance Report Generated', id, { newValue: v.type })
    })
    setReport({ id, at: nowIso(), type: v.type, rows })
  }

  const rows = report?.rows ?? []
  const completed = rows.filter((a) => a.status === 'Completed')
  const overdue = rows.filter((a) => a.status !== 'Completed' && isPastDeadline(a.deadline))
  const scored = completed.filter((a) => a.score !== null)
  const avg = scored.length ? Math.round(scored.reduce((n, a) => n + (a.score ?? 0), 0) / scored.length) : null
  const rate = rows.length ? Math.round((completed.length / rows.length) * 100) : 0
  const byModule = state.modules
    .map((m) => {
      const r = rows.filter((a) => a.moduleId === m.id)
      return { name: m.title.replace('Security Awareness: ', '').replace('Remedial: ', ''), value: r.length ? Math.round((r.filter((a) => a.status === 'Completed').length / r.length) * 100) : -1 }
    })
    .filter((x) => x.value >= 0)
  const tableRows = report?.type === 'Overdue Assignments' ? overdue : report?.type === 'Assessment Scores' ? completed : rows

  return (
    <>
      <PageHeader title="Compliance Report" uc="UC14" back={{ to: '/training/manage', label: 'Training Management' }} subtitle="Training progress, completion status, and assessment scores." />
      <Card className="no-print">
        <div className="grid gap-x-6 md:grid-cols-3">
          <SelectField name="type" label="Report type" value={v.type} onChange={(ev) => form.set('type', ev.target.value)} status={form.status('type', errors.type)} base="Select a report type" error={errors.type}>
            <option value="">Choose a type</option>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </SelectField>
          <FieldGroup name="dates" label="Date range (assignment date)" status={form.status('dates', errors.dates)} base="Enter a start and end date" error={errors.dates}>
            <div className="flex gap-2">
              <input id="f-dates" type="date" aria-label="Start date" value={v.start} onChange={(ev) => form.set('start', ev.target.value)} onBlur={() => form.touch('dates')} className="w-full rounded-md border border-slate-300 px-2 py-2" />
              <input type="date" aria-label="End date" value={v.end} onChange={(ev) => { form.set('end', ev.target.value); form.touch('dates') }} className="w-full rounded-md border border-slate-300 px-2 py-2" />
            </div>
          </FieldGroup>
          <FieldGroup name="groups" label="Users or groups" status={form.status('groups', errors.groups)} base="Select users or groups" error={errors.groups}>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2">
              {state.groups.map((g, i) => (
                <label key={g.id} className="flex items-center gap-2 text-sm">
                  <input id={i === 0 ? 'f-groups' : undefined} type="checkbox" className="h-4 w-4 accent-accent-700" checked={v.groups.includes(g.id)} onChange={(ev) => form.set('groups', ev.target.checked ? [...v.groups, g.id] : v.groups.filter((x) => x !== g.id))} />
                  {g.name} <span className="text-slate-400">({g.members.length})</span>
                </label>
              ))}
            </div>
          </FieldGroup>
        </div>
        <Button onClick={generate}>Generate Report</Button>
        {noRecords && <Banner tone="warning" className="mt-4" title="No Records Found" />}
      </Card>

      {report && (
        <div className="mt-6 space-y-6">
          <Banner tone="success" className="no-print" title="Report Generated successfully" action={<Button variant="secondary" onClick={() => { window.print(); toast('Report Generated successfully') }}><Download className="h-4 w-4" /> Download PDF</Button>} />
          <Card title={`${report.type} report`} actions={<span className="text-xs text-slate-500">{report.id} · {fmtDateTime(report.at)} · {fmtDate(s!.toISOString())} to {fmtDate(e!.toISOString())}</span>}>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div><div className="text-2xl font-semibold">{rows.length}</div><div className="text-sm text-slate-600">Assignments</div></div>
              <div><div className="text-2xl font-semibold text-green-700">{rate}%</div><div className="text-sm text-slate-600">Completion rate</div></div>
              <div><div className={`text-2xl font-semibold ${overdue.length ? 'text-red-700' : ''}`}>{overdue.length}</div><div className="text-sm text-slate-600">Overdue assignments</div></div>
              <div><div className="text-2xl font-semibold">{avg === null ? '-' : `${avg}%`}</div><div className="text-sm text-slate-600">Average assessment score</div></div>
            </div>
            <h3 className="mb-1 mt-6 text-sm font-semibold text-slate-700">Completion rate by module</h3>
            <SimpleBarChart label="Completion rate" unit="%" data={byModule} />
          </Card>
          <DataTable
            rows={tableRows}
            rowKey={(a) => a.id}
            empty="No records for this report type."
            initialSort={{ key: 'u', dir: 'asc' }}
            rowClassName={(a) => (a.status !== 'Completed' && isPastDeadline(a.deadline) ? 'bg-red-50' : '')}
            columns={[
              { key: 'u', header: 'User', render: (a) => state.users.find((x) => x.username === a.username)?.name ?? a.username, sort: (a) => a.username },
              { key: 'm', header: 'Module', render: (a) => state.modules.find((x) => x.id === a.moduleId)?.title, sort: (a) => a.moduleId },
              { key: 's', header: 'Status', render: (a) => <span className="flex gap-1"><StatusBadge status={a.status} />{a.status !== 'Completed' && isPastDeadline(a.deadline) && <StatusBadge status="Overdue" />}</span>, sort: (a) => a.status },
              { key: 'd', header: 'Deadline', render: (a) => fmtDate(a.deadline), sort: (a) => a.deadline ?? '' },
              { key: 'c', header: 'Completed', render: (a) => fmtDate(a.completedAt) },
              { key: 'sc', header: 'Score', render: (a) => (a.score === null ? '-' : `${a.score}%`), sort: (a) => a.score ?? -1 },
            ]}
          />
        </div>
      )}
      <ValidationSummaryDialog items={form.summary?.items ?? null} onClose={form.closeSummary} />
    </>
  )
}
