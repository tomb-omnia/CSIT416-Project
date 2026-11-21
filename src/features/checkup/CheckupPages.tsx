// UC32 Complete Personal Security Checkup, plus Security Checkup History.

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { History } from 'lucide-react'
import { useDemo, useMe } from '../../store/DemoStore'
import { Card, PageHeader } from '../../components/ui/Card'
import { Button, LinkButton } from '../../components/ui/Button'
import { Banner } from '../../components/ui/Banner'
import { Steps } from '../../components/ui/Wizard'
import { ConfirmDialog, Dialog } from '../../components/ui/Dialog'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { uid } from '../../lib/ids'
import { fmtDateTime, nowIso } from '../../lib/dates'

interface Q {
  id: string
  text: string
  choices: { label: string; points: number }[]
  rec: string
}
const FREQ = [
  { label: 'Always', points: 3 },
  { label: 'Usually', points: 2 },
  { label: 'Rarely', points: 1 },
  { label: 'Never', points: 0 },
]
const GROUPS: { title: string; questions: Q[] }[] = [
  {
    title: 'Password security',
    questions: [
      { id: 'unique', text: 'Do you use unique passwords for different accounts?', choices: FREQ, rec: 'Use a unique password for every account so one leak cannot unlock the others.' },
      { id: 'manager', text: 'Do you use a password manager?', choices: [{ label: 'Yes, for all accounts', points: 3 }, { label: 'For some accounts', points: 2 }, { label: 'No, but I plan to', points: 1 }, { label: 'No', points: 0 }], rec: 'Start using a password manager to create and store strong passwords.' },
    ],
  },
  {
    title: 'Account protection',
    questions: [
      { id: 'mfa', text: 'Do you enable multi-factor authentication (MFA) where it is offered?', choices: FREQ, rec: 'Enable multi-factor authentication on all accounts that support it.' },
      { id: 'review', text: 'Do you regularly review your account security settings?', choices: [{ label: 'Monthly', points: 3 }, { label: 'A few times a year', points: 2 }, { label: 'Only after a problem', points: 1 }, { label: 'Never', points: 0 }], rec: 'Review your account security settings and recent sign-in activity regularly.' },
    ],
  },
  {
    title: 'Phishing awareness',
    questions: [
      { id: 'verify', text: 'Do you verify suspicious email addresses before responding?', choices: FREQ, rec: 'Take additional phishing awareness training and use Verify Email Sender on unfamiliar senders.' },
      { id: 'links', text: 'Do you avoid opening unfamiliar links and attachments?', choices: FREQ, rec: 'Take additional phishing awareness training and scan unfamiliar links and attachments first.' },
    ],
  },
  {
    title: 'Device security',
    questions: [
      { id: 'updates', text: 'Do you regularly update your operating system and applications?', choices: [{ label: 'Automatic updates are on', points: 3 }, { label: 'Within a week', points: 2 }, { label: 'When I remember', points: 1 }, { label: 'Rarely or never', points: 0 }], rec: 'Install operating system and app updates promptly, ideally automatically.' },
      { id: 'lock', text: 'Do you use screen locks and other security features on your devices?', choices: FREQ, rec: 'Turn on screen locks with a PIN or password on every device.' },
    ],
  },
]
const ALL = GROUPS.flatMap((g) => g.questions)
const MAX = ALL.length * 3

export const levelOf = (score: number) => (score >= 80 ? { label: 'Good Security Practices', tone: 'green' as const } : score >= 50 ? { label: 'Moderate Security Risk', tone: 'yellow' as const } : { label: 'High Security Risk', tone: 'red' as const })

export function CheckupPage() {
  const { mutate, simulate } = useDemo()
  const me = useMe()
  const nav = useNavigate()
  const [stage, setStage] = useState<'intro' | number | 'review' | 'result'>('intro')
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [missing, setMissing] = useState<string[]>([])
  const [cancel, setCancel] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ score: number; recs: string[] } | null>(null)

  const nextGroup = (g: number) => {
    const miss = GROUPS[g].questions.filter((q) => answers[q.id] === undefined).map((q) => q.id)
    setMissing(miss)
    if (miss.length) return
    setStage(g + 1 < GROUPS.length ? g + 1 : 'review')
  }

  const submit = async () => {
    const miss = ALL.filter((q) => answers[q.id] === undefined).map((q) => q.id)
    setMissing(miss)
    if (miss.length) return
    const pts = ALL.reduce((sum, q) => sum + q.choices[answers[q.id]].points, 0)
    const score = Math.round((pts / MAX) * 100)
    const recs = Array.from(new Set(ALL.filter((q) => q.choices[answers[q.id]].points <= 1).map((q) => q.rec)))
    setBusy(true)
    const r = await simulate('save')
    setBusy(false)
    if (r !== 'ok') return setError('Unable to Save Checkup Results. Please Try Again.')
    mutate((s) => s.checkups.unshift({ id: uid('CHK'), username: me.username, at: nowIso(), score, answers, recommendations: recs }))
    setResult({ score, recs })
    setStage('result')
  }

  const header = <PageHeader title="Personal Security Checkup" uc="UC32" actions={<LinkButton to="/checkup/history" variant="secondary"><History className="h-4 w-4" /> Checkup History</LinkButton>} />

  if (stage === 'intro')
    return (
      <>
        {header}
        <Card>
          <div className="max-w-2xl space-y-3">
            <p>This checkup evaluates your personal cybersecurity habits and gives you a score from 0 to 100 with recommendations.</p>
            <div className="flex gap-6 text-sm">
              <div>
                <div className="text-2xl font-semibold">{ALL.length}</div>
                <div className="text-slate-500">questions</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">3 min</div>
                <div className="text-slate-500">estimated time</div>
              </div>
            </div>
            <p className="text-sm text-slate-600">Covers password security, account protection, phishing awareness, and device security.</p>
            <Button onClick={() => setStage(0)}>Start Checkup</Button>
          </div>
        </Card>
      </>
    )

  if (stage === 'result' && result) {
    const lvl = levelOf(result.score)
    return (
      <>
        {header}
        <Banner tone="success" className="mb-6" title="Personal Security Checkup Completed Successfully. Your Results Have Been Saved." />
        <Card>
          <div className="text-center">
            <div className={`text-5xl font-bold ${lvl.tone === 'green' ? 'text-green-700' : lvl.tone === 'yellow' ? 'text-yellow-700' : 'text-red-700'}`}>{result.score}</div>
            <div className="mt-2">
              <StatusBadge status={lvl.label} tone={lvl.tone} />
            </div>
          </div>
          <h3 className="mt-6 font-semibold">Recommendations</h3>
          {result.recs.length === 0 ? (
            <p className="text-slate-600">No weaknesses found. Keep up the good habits.</p>
          ) : (
            <ul className="mt-2 list-disc space-y-1 pl-6">
              {result.recs.map((r) => (
                <li key={r}>
                  {r}
                  {r.includes('phishing awareness training') && (
                    <>
                      {' '}
                      <Link to="/my-training" className="text-accent-700 underline">
                        Go to My Training
                      </Link>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 flex justify-center">
            <Button onClick={() => nav('/home')}>Done</Button>
          </div>
        </Card>
      </>
    )
  }

  const stepIdx = stage === 'review' ? GROUPS.length : (stage as number)
  return (
    <>
      {header}
      <Steps steps={[...GROUPS.map((g) => g.title), 'Review']} current={stepIdx} />
      <Card>
        {stage === 'review' ? (
          <>
            <h2 className="mb-1 text-lg font-semibold">Review Answers</h2>
            {missing.length > 0 ? (
              <Banner tone="error" className="mb-4" title="Checkup Incomplete. Please Answer All Required Questions." />
            ) : (
              <p className={`mb-4 text-sm ${ALL.every((q) => answers[q.id] !== undefined) ? 'text-green-700' : 'text-slate-900'}`}>All questions must have exactly one answer.</p>
            )}
            <ul className="divide-y">
              {ALL.map((q) => {
                const g = GROUPS.findIndex((gr) => gr.questions.includes(q))
                const miss = missing.includes(q.id)
                return (
                  <li key={q.id} className={`flex flex-wrap items-center justify-between gap-2 py-3 ${miss ? '-mx-2 rounded bg-red-50 px-2' : ''}`}>
                    <div>
                      <div className={miss ? 'font-medium text-red-800' : ''}>{q.text}</div>
                      <div className="text-sm text-slate-600">{answers[q.id] !== undefined ? q.choices[answers[q.id]].label : <span className="text-red-700">Not answered</span>}</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => { setMissing([]); setStage(g) }}>
                      Change
                    </Button>
                  </li>
                )
              })}
            </ul>
            <div className="mt-6 flex justify-between">
              <Button variant="secondary" onClick={() => setCancel(true)}>
                Cancel
              </Button>
              <Button onClick={submit} loading={busy}>
                Submit Checkup
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 className="mb-4 text-lg font-semibold">{GROUPS[stage as number].title}</h2>
            {GROUPS[stage as number].questions.map((q) => {
              const miss = missing.includes(q.id)
              return (
                <fieldset key={q.id} className={`mb-5 rounded-md border p-4 ${miss ? 'border-red-600' : 'border-slate-200'}`}>
                  <legend className="px-1 font-medium">{q.text}</legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {q.choices.map((c, i) => (
                      <label key={c.label} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 ${answers[q.id] === i ? 'border-accent-600 bg-accent-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <input type="radio" name={q.id} className="h-4 w-4 accent-accent-700" checked={answers[q.id] === i} onChange={() => { setAnswers({ ...answers, [q.id]: i }); setMissing((m) => m.filter((x) => x !== q.id)) }} />
                        {c.label}
                      </label>
                    ))}
                  </div>
                  {miss && <p className="mt-2 text-sm text-red-700">Please Answer This Question Before Continuing.</p>}
                </fieldset>
              )
            })}
            <div className="flex flex-wrap justify-between gap-2">
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setCancel(true)}>
                  Cancel
                </Button>
                {(stage as number) > 0 && (
                  <Button variant="secondary" onClick={() => { setMissing([]); setStage((stage as number) - 1) }}>
                    Back
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => { setMissing([]); setStage('review') }}>
                  Review Answers
                </Button>
                <Button onClick={() => nextGroup(stage as number)}>Next</Button>
              </div>
            </div>
          </>
        )}
      </Card>
      <ConfirmDialog open={cancel} title="Cancel checkup" message="Are You Sure You Want to Cancel Your Security Checkup?" onCancel={() => setCancel(false)} onConfirm={() => nav('/home')} />
      <Dialog
        open={!!error}
        onClose={() => setError(null)}
        tone="error"
        title={error ?? ''}
        footer={
          <Button
            onClick={() => {
              setError(null)
              submit()
            }}
          >
            Retry
          </Button>
        }
      />
    </>
  )
}

export function CheckupHistoryPage() {
  const { state } = useDemo()
  const me = useMe()
  const rows = state.checkups.filter((c) => c.username === me.username)
  return (
    <>
      <PageHeader title="Security Checkup History" uc="UC32" back={{ to: '/checkup', label: 'Personal Security Checkup' }} />
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        empty="You have not completed a checkup yet."
        initialSort={{ key: 'at', dir: 'desc' }}
        columns={[
          { key: 'at', header: 'Completed', render: (r) => fmtDateTime(r.at), sort: (r) => r.at },
          { key: 'score', header: 'Score', render: (r) => <span className="font-semibold">{r.score}</span>, sort: (r) => r.score },
          { key: 'level', header: 'Level', render: (r) => { const l = levelOf(r.score); return <StatusBadge status={l.label} tone={l.tone} /> } },
          { key: 'recs', header: 'Recommendations', render: (r) => (r.recommendations.length ? <ul className="list-disc pl-4 text-slate-600">{r.recommendations.map((x) => <li key={x}>{x}</li>)}</ul> : 'None') },
        ]}
      />
    </>
  )
}
