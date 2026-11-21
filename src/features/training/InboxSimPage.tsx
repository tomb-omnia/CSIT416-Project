// UC13 Complete Inbox Analysis Simulation

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Paperclip, CheckCircle2, XCircle, Mail, LogOut } from 'lucide-react'
import { useDemo, useMe } from '../../store/DemoStore'
import { Card, PageHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Banner } from '../../components/ui/Banner'
import { ConfirmDialog, MessageDialog } from '../../components/ui/Dialog'
import { uid } from '../../lib/ids'
import { nowIso, fmtDateTime } from '../../lib/dates'

type Answer = 'Phishing' | 'Legitimate'
const PASS = 70

export default function InboxSimPage() {
  const { state, mutate, simulate } = useDemo()
  const me = useMe()
  const nav = useNavigate()
  const emails = state.simEmails
  const [stage, setStage] = useState<'intro' | 'inbox' | 'results'>('intro')
  const [sel, setSel] = useState(emails[0]?.id ?? '')
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [incomplete, setIncomplete] = useState(false)
  const [confirmExit, setConfirmExit] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const past = state.simResults.filter((r) => r.username === me.username)

  const start = () => {
    if (emails.length === 0) return setError('No Emails Available')
    setAnswers({})
    setIncomplete(false)
    setSel(emails[0].id)
    setStage('inbox')
  }

  const submit = async () => {
    if (emails.some((e) => !answers[e.id])) return setIncomplete(true)
    setBusy(true)
    const r = await simulate('save')
    setBusy(false)
    if (r !== 'ok') return setError('Results Could Not Be Saved. Please Try Again')
    mutate((s) => s.simResults.unshift({ id: uid('SIM'), username: me.username, at: nowIso(), score }))
    setStage('results')
  }

  const correct = emails.filter((e) => answers[e.id] === (e.isPhishing ? 'Phishing' : 'Legitimate'))
  const score = emails.length ? Math.round((correct.length / emails.length) * 100) : 0

  if (stage === 'intro')
    return (
      <>
        <PageHeader title="Inbox Analysis Simulation" uc="UC13" back={{ to: '/my-training', label: 'My Training' }} />
        <Card>
          <div className="max-w-2xl space-y-3">
            <p>You will see a simulated inbox with {emails.length} emails. Open each one and decide whether it is <strong>Phishing</strong> or <strong>Legitimate</strong>.</p>
            <ul className="list-disc space-y-1 pl-6 text-slate-700">
              <li>Read the sender's full address, not just the name.</li>
              <li>Hover over (or focus) links to reveal where they really go.</li>
              <li>Watch for urgency, secrecy, unexpected attachments, and double file extensions.</li>
            </ul>
            <p className="text-sm text-slate-600">Nothing in the simulation is real. Links and attachments cannot be opened.</p>
            <Button onClick={start}>Start Simulation</Button>
          </div>
          {past.length > 0 && (
            <div className="mt-6 border-t pt-4 text-sm">
              <div className="font-semibold">Previous attempts</div>
              <ul className="mt-1 text-slate-600">
                {past.slice(0, 5).map((p) => (
                  <li key={p.id}>
                    {fmtDateTime(p.at)}: {p.score}%
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
        <MessageDialog open={!!error} onClose={() => setError(null)} tone="error" title={error ?? ''} />
      </>
    )

  if (stage === 'results') {
    const wrong = emails.filter((e) => !correct.includes(e))
    const pass = score >= PASS
    return (
      <>
        <PageHeader title="Simulation results" uc="UC13" />
        <Card>
          <div className={`text-center text-4xl font-bold ${pass ? 'text-green-700' : 'text-red-700'}`}>{score}%</div>
          <p className="mt-1 text-center text-slate-600">
            {correct.length} of {emails.length} emails identified correctly. {pass ? 'Well done.' : `A score of ${PASS}% or higher is recommended. Review the explanations and try again.`}
          </p>
          {wrong.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 font-semibold">Incorrect answers</h3>
              <ul className="space-y-3">
                {wrong.map((e) => (
                  <li key={e.id} className="rounded-md border border-red-200 bg-red-50 p-3">
                    <div className="flex items-center gap-2 font-medium text-red-800">
                      <XCircle className="h-4 w-4" aria-hidden /> {e.subject}
                    </div>
                    <div className="text-sm text-slate-700">
                      You said {answers[e.id]}. It is {e.isPhishing ? 'Phishing' : 'Legitimate'}. {e.explanation}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={() => nav('/home')}>Done</Button>
            {!pass && (
              <Button variant="secondary" onClick={start}>
                Retry simulation
              </Button>
            )}
          </div>
        </Card>
      </>
    )
  }

  const cur = emails.find((e) => e.id === sel)!
  const answered = Object.keys(answers).length
  return (
    <>
      <PageHeader
        title="Inbox Analysis Simulation"
        uc="UC13"
        subtitle={`${answered} of ${emails.length} classified`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmExit(true)}>
              <LogOut className="h-4 w-4" /> Exit
            </Button>
            <Button onClick={submit} loading={busy}>
              Submit
            </Button>
          </>
        }
      />
      {incomplete && emails.some((e) => !answers[e.id]) && <Banner tone="error" className="mb-4" title="Simulation Incomplete">Unanswered emails are highlighted in red.</Banner>}
      <div className="grid overflow-hidden rounded-lg border border-slate-200 bg-white lg:grid-cols-[340px_1fr]">
        <ul className="max-h-[70vh] overflow-y-auto border-r border-slate-200" aria-label="Simulated inbox">
          {emails.map((e) => {
            const missing = incomplete && !answers[e.id]
            return (
              <li key={e.id}>
                <button
                  onClick={() => setSel(e.id)}
                  className={`block w-full border-b border-l-4 px-4 py-3 text-left ${sel === e.id ? 'bg-accent-50' : 'hover:bg-slate-50'} ${missing ? 'border-l-red-600 bg-red-50' : 'border-l-transparent'} border-b-slate-100`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{e.fromName}</span>
                    <span className="shrink-0 text-xs text-slate-500">{e.received}</span>
                  </div>
                  <div className="truncate text-sm">{e.subject}</div>
                  <div className="mt-1 text-xs">
                    {answers[e.id] ? (
                      <span className="inline-flex items-center gap-1 text-slate-600">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Marked {answers[e.id]}
                      </span>
                    ) : (
                      <span className={missing ? 'font-medium text-red-700' : 'text-slate-400'}>{missing ? 'Not answered' : 'Unread'}</span>
                    )}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
        <article className="p-6">
          <h2 className="text-xl font-semibold">{cur.subject}</h2>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-slate-400" aria-hidden />
            <span className="font-medium">{cur.fromName}</span>
            <span className="font-mono text-slate-600">&lt;{cur.from}&gt;</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">To: {me.email} · {cur.received}</div>
          <div className="mt-5 whitespace-pre-line leading-relaxed">{cur.body}</div>
          {cur.links.length > 0 && (
            <div className="mt-4 space-y-1">
              {cur.links.map((l) => (
                <div key={l.text} className="group relative inline-block">
                  <span tabIndex={0} className="cursor-help text-accent-700 underline" aria-describedby={`tip-${cur.id}`}>
                    {l.text}
                  </span>
                  <span id={`tip-${cur.id}`} role="tooltip" className="pointer-events-none absolute left-0 top-full z-10 mt-1 hidden whitespace-nowrap rounded bg-slate-900 px-2 py-1 font-mono text-xs text-white group-focus-within:block group-hover:block">
                    Actual destination: {l.href}
                  </span>
                </div>
              ))}
            </div>
          )}
          {cur.attachments.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {cur.attachments.map((a) => (
                <span key={a} className="inline-flex items-center gap-1 rounded border border-slate-300 bg-slate-50 px-2 py-1 font-mono text-xs">
                  <Paperclip className="h-3.5 w-3.5" aria-hidden /> {a}
                </span>
              ))}
            </div>
          )}
          <div className="mt-8 flex flex-wrap gap-3 border-t pt-5" role="radiogroup" aria-label="Classification">
            {(['Phishing', 'Legitimate'] as Answer[]).map((ans) => (
              <button
                key={ans}
                role="radio"
                aria-checked={answers[cur.id] === ans}
                onClick={() => {
                  setAnswers({ ...answers, [cur.id]: ans })
                  const nextUn = emails.find((e) => e.id !== cur.id && !answers[e.id])
                  if (nextUn) setTimeout(() => setSel(nextUn.id), 250)
                }}
                className={`rounded-md border-2 px-5 py-2 font-medium ${answers[cur.id] === ans ? 'border-accent-700 bg-accent-700 text-white' : 'border-slate-300 hover:border-accent-500'}`}
              >
                {ans}
              </button>
            ))}
          </div>
        </article>
      </div>
      <ConfirmDialog open={confirmExit} title="Exit simulation" message="Are You Sure You Want to Exit?" onCancel={() => setConfirmExit(false)} onConfirm={() => nav('/my-training')} />
      <MessageDialog open={!!error} onClose={() => setError(null)} tone="error" title={error ?? ''} />
    </>
  )
}
