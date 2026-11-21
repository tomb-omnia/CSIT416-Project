// UC12 Complete Learning Modules: module player.

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useDemo, useMe, pushNotification } from '../../store/DemoStore'
import { Card, PageHeader } from '../../components/ui/Card'
import { Button, LinkButton } from '../../components/ui/Button'
import { Banner } from '../../components/ui/Banner'
import { ProgressBar } from '../../components/ui/Wizard'
import { MessageDialog } from '../../components/ui/Dialog'
import { RichText } from '../../components/ui/RichText'
import { nowIso, fmtDate } from '../../lib/dates'

export default function ModulePlayerPage() {
  const { moduleId } = useParams()
  const { state, mutate, simulate } = useDemo()
  const me = useMe()
  const nav = useNavigate()
  const m = state.modules.find((x) => x.id === moduleId)
  const a = state.assignments.find((x) => x.moduleId === moduleId && x.username === me.username)
  const [idx, setIdx] = useState(() => (a && a.status !== 'Completed' ? Math.min(a.sectionsDone, (m?.sections.length ?? 1) - 1) : 0))
  const [reviewed, setReviewed] = useState<Record<number, boolean>>({})
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)

  // 5A1: opening a module marks it In Progress, so leaving mid-way keeps that status.
  useEffect(() => {
    if (a && a.status === 'Not Started')
      mutate((s) => {
        const x = s.assignments.find((y) => y.id === a.id)
        if (x) x.status = 'In Progress'
      })
  }, [a, mutate])

  if (!m) return <Blocked title="Module Not Found" />
  if (!a) return <Blocked title="Access Denied" detail="This module is not assigned to you." />
  if (!m.available) return <Blocked title="Training Module Unavailable" />

  const total = m.sections.length
  const sec = m.sections[idx]
  const questions = sec.questionIds.map((q) => state.questions.find((x) => x.id === q)).filter((q): q is NonNullable<typeof q> => !!q)
  const quizDone = questions.every((q) => answers[q.id] === q.correct)
  const sectionDone = !!reviewed[idx] && quizDone
  const completed = a.status === 'Completed'

  const saveProgress = async (n: number) => {
    setBusy(true)
    const r = await simulate('save')
    setBusy(false)
    if (r !== 'ok') {
      setError('Progress Could Not Be Saved')
      return false
    }
    mutate((s) => {
      const x = s.assignments.find((y) => y.id === a.id)
      if (x && x.status !== 'Completed') {
        x.sectionsDone = Math.max(x.sectionsDone, n)
        x.status = 'In Progress'
      }
    })
    return true
  }

  const next = async () => {
    if (!sectionDone) return
    if (completed || (await saveProgress(idx + 1))) setIdx(idx + 1)
  }

  const finish = async () => {
    if (!sectionDone) return setError('Training Incomplete')
    setBusy(true)
    const r = await simulate('save')
    setBusy(false)
    if (r !== 'ok') return setError('Completion Update Failed. Please Try Again')
    mutate((s) => {
      const x = s.assignments.find((y) => y.id === a.id)
      if (x) {
        x.status = 'Completed'
        x.sectionsDone = total
        x.completedAt = nowIso()
        x.score = 100
      }
      pushNotification(s, a.assignedBy, `${me.username} completed "${m.title}".`, '/training/reports')
    })
    setFinished(true)
  }

  if (finished)
    return (
      <>
        <PageHeader title={m.title} back={{ to: '/my-training', label: 'My Training' }} uc="UC12" />
        <Card>
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600" aria-hidden />
            <p className="mt-3 text-lg font-semibold text-green-800">training module completed successfully</p>
            <div className="mt-6 flex gap-3">
              <Button onClick={() => nav('/home')}>Done</Button>
              {m.certifiable && (
                <LinkButton to={`/my-training/${m.id}/certificate`} variant="secondary">
                  Generate Certificate
                </LinkButton>
              )}
            </div>
          </div>
        </Card>
      </>
    )

  return (
    <>
      <PageHeader
        title={m.title}
        uc="UC12"
        back={{ to: '/my-training', label: 'My Training' }}
        subtitle={m.description}
        actions={completed && m.certifiable ? <LinkButton to={`/my-training/${m.id}/certificate`}>Generate Certificate</LinkButton> : undefined}
      />
      {completed && <Banner tone="success" className="mb-4" title={`Completed ${fmtDate(a.completedAt)}`}>You are reviewing a completed module.</Banner>}
      <div className="mb-4">
        <ProgressBar value={((completed ? total : idx) / total) * 100} label={`Section ${idx + 1} of ${total}`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <ol className="space-y-1 text-sm">
          {m.sections.map((s, i) => {
            const unlocked = completed || i <= Math.max(a.sectionsDone, idx)
            return (
              <li key={i}>
                <button
                  disabled={!unlocked}
                  onClick={() => setIdx(i)}
                  className={`w-full rounded-md px-3 py-2 text-left ${i === idx ? 'bg-accent-50 font-semibold text-accent-800' : unlocked ? 'hover:bg-slate-100' : 'cursor-not-allowed text-slate-400'}`}
                >
                  {i + 1}. {s.heading}
                </button>
              </li>
            )
          })}
        </ol>
        <Card title={sec.heading}>
          <RichText source={sec.body} />
          <div className="mt-6 space-y-4 border-t pt-5">
            <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Required activities</div>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4 accent-accent-700" checked={!!reviewed[idx]} onChange={(e) => setReviewed({ ...reviewed, [idx]: e.target.checked })} />
              I have reviewed this section
            </label>
            {!reviewed[idx] && <p className="text-sm text-slate-600">Please Review This Section</p>}
            {questions.map((q) => {
              const picked = answers[q.id]
              return (
                <fieldset key={q.id} className="rounded-md border border-slate-200 p-4">
                  <legend className="px-1 font-medium">Knowledge check: {q.text}</legend>
                  <div className="mt-2 space-y-1.5">
                    {q.choices.map((c, ci) => (
                      <label key={ci} className="flex items-center gap-2">
                        <input type="radio" name={q.id} className="h-4 w-4 accent-accent-700" checked={picked === ci} onChange={() => setAnswers({ ...answers, [q.id]: ci })} />
                        {c}
                      </label>
                    ))}
                  </div>
                  {picked !== undefined &&
                    (picked === q.correct ? (
                      <p className="mt-2 flex items-center gap-1 text-sm text-green-700">
                        <CheckCircle2 className="h-4 w-4" /> Correct
                      </p>
                    ) : (
                      <p className="mt-2 flex items-center gap-1 text-sm text-red-700">
                        <XCircle className="h-4 w-4" /> Not quite. Try again.
                      </p>
                    ))}
                </fieldset>
              )
            })}
            {!sectionDone && reviewed[idx] && <p className="text-sm text-slate-600">Complete All Required Activities</p>}
          </div>
          <div className="mt-6 flex justify-between">
            <Button variant="secondary" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>
              Back
            </Button>
            {idx < total - 1 ? (
              <Button disabled={!sectionDone} loading={busy} onClick={next}>
                Next
              </Button>
            ) : completed ? (
              <LinkButton to="/my-training">Done</LinkButton>
            ) : (
              <Button variant="success" disabled={!sectionDone} loading={busy} onClick={finish}>
                Finish Module
              </Button>
            )}
          </div>
        </Card>
      </div>
      <MessageDialog open={!!error} onClose={() => setError(null)} tone="error" title={error ?? ''} />
    </>
  )
}

function Blocked({ title, detail }: { title: string; detail?: string }) {
  return (
    <>
      <PageHeader title="My Training" back={{ to: '/my-training', label: 'My Training' }} />
      <Banner tone="error" title={title}>
        {detail}
      </Banner>
    </>
  )
}
