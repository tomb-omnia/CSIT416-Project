// UC24 Analyze Phishing Test Results (Training Coordinator and Cybersecurity Officer).

import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { FileBarChart, Target } from 'lucide-react'
import { useDemo, useMe, pushAudit } from '../../store/DemoStore'
import { Card, EmptyState, PageHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { PlainSelect } from '../../components/ui/RequirementField'
import { MessageDialog } from '../../components/ui/Dialog'
import { Banner } from '../../components/ui/Banner'
import { SimpleBarChart } from '../../components/ui/SimpleBarChart'
import { fmtDate, fmtDateTime, nowIso } from '../../lib/dates'
import { uid } from '../../lib/ids'
import type { TestResult } from '../../store/types'

const outcome = (r: TestResult) => (r.clicked ? 'Failed' : r.reported ? 'Reported' : r.opened ? 'Opened, no action' : r.received ? 'Did not open' : 'Not received')

export function TestResultsIndex() {
  const { state } = useDemo()
  const sent = state.tests.filter((t) => t.status === 'Sent')
  if (sent.length === 0)
    return (
      <>
        <PageHeader title="Phishing Test Results" uc="UC24" />
        <EmptyState>No phishing test results are available. No tests have been completed yet.</EmptyState>
      </>
    )
  return <Navigate to={`/phishing-tests/${sent[0].id}/results`} replace />
}

export default function TestResultsPage() {
  const { id } = useParams()
  const { state, mutate, simulate } = useDemo()
  const me = useMe()
  const nav = useNavigate()
  const [filter, setFilter] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const sent = state.tests.filter((t) => t.status === 'Sent')
  const t = state.tests.find((x) => x.id === id)

  const picker = (
    <div className="w-72">
      <label htmlFor="test-pick" className="sr-only">
        Select a phishing test
      </label>
      <PlainSelect id="test-pick" value={id} onChange={(e) => nav(`/phishing-tests/${e.target.value}/results`)}>
        {sent.map((x) => (
          <option key={x.id} value={x.id}>
            {x.name} ({fmtDate(x.sendAt)})
          </option>
        ))}
      </PlainSelect>
    </div>
  )
  if (!t || t.status !== 'Sent')
    return (
      <>
        <PageHeader title="Phishing Test Results" uc="UC24" actions={picker} />
        <Banner tone="error" title="Results Unavailable">Select a test that has been sent. The results for this test could not be retrieved.</Banner>
      </>
    )

  const res = t.results
  const n = res.length
  const counts = { received: res.filter((r) => r.received).length, opened: res.filter((r) => r.opened).length, clicked: res.filter((r) => r.clicked).length, reported: res.filter((r) => r.reported).length }
  const failRate = n ? Math.round((counts.clicked / n) * 100) : 0
  const failed = res.filter((r) => r.clicked).map((r) => r.username)
  const rows = res.filter((r) => !filter || outcome(r) === filter)

  const summarize = async () => {
    setBusy(true)
    const r = await simulate('save')
    setBusy(false)
    if (r !== 'ok') return setError('The summary could not be generated or saved. Please try again.')
    const text = `${n} users received the test. ${counts.opened} opened it (${Math.round((counts.opened / Math.max(1, n)) * 100)}%), ${counts.clicked} clicked the link (failure rate ${failRate}%), and ${counts.reported} reported it (${Math.round((counts.reported / Math.max(1, n)) * 100)}%). ${failed.length ? `Users needing additional training: ${failed.join(', ')}.` : 'No users failed the test.'}`
    mutate((s) => {
      s.tests.find((x) => x.id === t.id)?.summaries.unshift({ id: uid('SUM'), at: nowIso(), by: me.username, failureRate: failRate, text })
      pushAudit(s, me, 'Test Analysis Saved', t.name, { newValue: `Failure rate ${failRate}%` })
    })
  }

  const stat = (label: string, v: number, tone?: 'red' | 'green') => (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className={`text-2xl font-semibold ${tone === 'red' ? 'text-red-700' : tone === 'green' ? 'text-green-700' : ''}`}>{v}</div>
      <div className="text-sm text-slate-600">
        {label} {n > 0 && <span className="text-slate-400">({Math.round((v / n) * 100)}%)</span>}
      </div>
    </div>
  )

  return (
    <>
      <PageHeader
        title="Phishing Test Results"
        uc="UC24"
        subtitle={`${t.name} · sent ${fmtDateTime(t.sendAt)} · subject "${t.subject}"`}
        actions={
          <>
            {picker}
            <Button onClick={summarize} loading={busy}>
              <FileBarChart className="h-4 w-4" /> Generate Summary
            </Button>
          </>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stat('Received', counts.received)}
        {stat('Opened', counts.opened)}
        {stat('Clicked / interacted', counts.clicked, 'red')}
        {stat('Reported', counts.reported, 'green')}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card title="Recipients at each stage">
          <SimpleBarChart label="Recipients" data={[{ name: 'Received', value: counts.received }, { name: 'Opened', value: counts.opened }, { name: 'Clicked', value: counts.clicked }, { name: 'Reported', value: counts.reported }]} />
        </Card>
        <Card title="Summary">
          {t.summaries.length === 0 ? (
            <p className="text-sm text-slate-500">No summary yet. Select Generate Summary to calculate failure rates and save the analysis.</p>
          ) : (
            <div className="space-y-3">
              {t.summaries.map((s, i) => (
                <div key={s.id} className={i === 0 ? '' : 'border-t pt-3 text-slate-500'}>
                  <div className="text-xs text-slate-500">
                    Saved {fmtDateTime(s.at)} by {s.by}
                  </div>
                  <div className="text-lg font-semibold">
                    Failure rate: <span className={s.failureRate > 25 ? 'text-red-700' : 'text-green-700'}>{s.failureRate}%</span>
                  </div>
                  <p className="text-sm">{s.text}</p>
                </div>
              ))}
            </div>
          )}
          {me.role === 'trainer' && failed.length > 0 && (
            <Button className="mt-4" variant="secondary" onClick={() => nav(`/training/remedial?users=${failed.join(',')}`)}>
              <Target className="h-4 w-4" /> Assign Remedial Training ({failed.length})
            </Button>
          )}
        </Card>
      </div>
      <Card className="mt-6" title="Individual results" actions={
        <PlainSelect aria-label="Filter results" value={filter} onChange={(e) => setFilter(e.target.value)} className="w-48">
          <option value="">All users</option>
          <option>Failed</option>
          <option>Reported</option>
          <option>Opened, no action</option>
          <option>Did not open</option>
        </PlainSelect>
      }>
        {failed.length === 0 && <Banner tone="success" className="mb-4" title="No users failed this test." />}
        <DataTable
          rows={rows}
          rowKey={(r) => r.username}
          empty="No users match this filter."
          rowClassName={(r) => (r.clicked ? 'bg-red-50' : '')}
          columns={[
            { key: 'u', header: 'User', render: (r) => state.users.find((u) => u.username === r.username)?.name ?? r.username, sort: (r) => r.username },
            { key: 'g', header: 'Group', render: (r) => state.users.find((u) => u.username === r.username)?.group },
            { key: 'o', header: 'Opened', render: (r) => (r.opened ? 'Yes' : 'No') },
            { key: 'c', header: 'Clicked', render: (r) => (r.clicked ? <span className="font-semibold text-red-700">Yes</span> : 'No') },
            { key: 'r', header: 'Reported', render: (r) => (r.reported ? 'Yes' : 'No') },
            { key: 's', header: 'Outcome', render: (r) => <StatusBadge status={outcome(r)} tone={r.clicked ? 'red' : r.reported ? 'green' : 'neutral'} />, sort: outcome },
          ]}
        />
      </Card>
      <MessageDialog open={!!error} onClose={() => setError(null)} tone="error" title="Summary failed" message={error} />
    </>
  )
}
