// UC11 Manage Question Bank

import { useState } from 'react'
import { CheckCircle2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useDemo, useMe, pushAudit } from '../../store/DemoStore'
import { Card, PageHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { DataTable } from '../../components/ui/DataTable'
import { FieldGroup, PlainInput, TextArea, TextField } from '../../components/ui/RequirementField'
import { ConfirmDialog, MessageDialog, ValidationSummaryDialog } from '../../components/ui/Dialog'
import { useForm } from '../../components/ui/useForm'
import * as V from '../../lib/validators'
import { questionId } from '../../lib/ids'
import type { Question } from '../../store/types'

const blank = { text: '', topic: '', choices: ['', ''], correct: null as number | null }

export default function QuestionBankPage() {
  const { state, mutate, simulate } = useDemo()
  const me = useMe()
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [saved, setSaved] = useState(false)
  const [del, setDel] = useState<Question | null>(null)
  const [failed, setFailed] = useState(false)
  const [q, setQ] = useState('')
  const form = useForm(blank)
  const v = form.values
  const errors = { text: V.questionText(v.text), choices: V.answerChoices(v.choices), correct: V.correctAnswer(v.correct, v.choices.length) }

  const open = (x: Question | null) => {
    form.reset(x ? { text: x.text, topic: x.topic, choices: [...x.choices], correct: x.correct } : blank)
    setSaved(false)
    setEditing(x ? x.id : 'new')
  }
  const save = async () => {
    if (!form.submit(errors, { text: 'Question', choices: 'Answer choices', correct: 'Correct answer' })) return
    if ((await simulate('save')) !== 'ok') return setFailed(true)
    const id = editing === 'new' ? questionId() : editing!
    mutate((s) => {
      const data = { id, text: v.text.trim(), topic: v.topic.trim() || 'General', choices: v.choices.map((c) => c.trim()), correct: v.correct! }
      const i = s.questions.findIndex((x) => x.id === id)
      if (i >= 0) s.questions[i] = data
      else s.questions.push(data)
      pushAudit(s, me, editing === 'new' ? 'Question Added' : 'Question Edited', id)
    })
    setSaved(true)
  }
  const rows = state.questions.filter((x) => !q || x.text.toLowerCase().includes(q.toLowerCase()) || x.topic.toLowerCase().includes(q.toLowerCase()))

  return (
    <>
      <PageHeader title="Question Bank" uc="UC11" back={{ to: '/training/manage', label: 'Training Management' }} subtitle="Questions used in module knowledge checks and assessments." actions={<Button onClick={() => open(null)}><Plus className="h-4 w-4" /> Add Question</Button>} />
      {editing && (
        <Card className="mb-6" title={editing === 'new' ? 'Add Question' : `Edit ${editing}`} actions={<Button size="sm" variant="ghost" aria-label="Close" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>}>
          {saved ? (
            <div className="flex flex-col items-center py-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" aria-hidden />
              <p className="mt-2 font-semibold text-green-800">Question Saved</p>
              <Button className="mt-4" onClick={() => setEditing(null)}>Done</Button>
            </div>
          ) : (
            <div className="max-w-3xl">
              <TextArea name="text" label="Question" rows={2} value={v.text} onChange={(e) => form.set('text', e.target.value)} status={form.status('text', errors.text)} base="Enter the question (at least 10 characters)." error={errors.text} />
              <TextField name="topic" label="Topic (optional)" value={v.topic} onChange={(e) => form.set('topic', e.target.value)} status="neutral" />
              <FieldGroup name="choices" label="Answer choices" status={form.status('choices', errors.choices) === 'error' || form.status('correct', errors.correct) === 'error' ? 'error' : form.status('choices', errors.choices)} base="Enter 2 to 6 answer choices and select the correct one." error={errors.choices ?? errors.correct}>
                <div className="space-y-2">
                  {v.choices.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="radio" name="correct" aria-label={`Mark choice ${i + 1} correct`} id={i === 0 ? 'f-correct' : undefined} className="h-4 w-4 accent-green-700" checked={v.correct === i} onChange={() => form.set('correct', i)} />
                      <PlainInput id={i === 0 ? 'f-choices' : undefined} aria-label={`Choice ${i + 1}`} value={c} onChange={(e) => form.set('choices', v.choices.map((x, j) => (j === i ? e.target.value : x)))} />
                      <Button size="sm" variant="ghost" aria-label={`Remove choice ${i + 1}`} disabled={v.choices.length <= 2} onClick={() => { form.set('choices', v.choices.filter((_, j) => j !== i)); if (v.correct !== null) form.set('correct', v.correct === i ? null : v.correct > i ? v.correct - 1 : v.correct) }}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button size="sm" variant="secondary" disabled={v.choices.length >= 6} onClick={() => form.set('choices', [...v.choices, ''])}>
                    <Plus className="h-3.5 w-3.5" /> Add choice
                  </Button>
                </div>
              </FieldGroup>
              <div className="flex gap-2">
                <Button onClick={save}>Save Question</Button>
                <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </Card>
      )}
      <div className="mb-3 max-w-sm">
        <PlainInput aria-label="Search questions" placeholder="Search questions or topics" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <DataTable
        rows={rows}
        rowKey={(x) => x.id}
        empty="No questions found."
        initialSort={{ key: 'id', dir: 'asc' }}
        columns={[
          { key: 'id', header: 'ID', render: (x) => <span className="font-mono text-xs">{x.id}</span>, sort: (x) => x.id },
          { key: 't', header: 'Question', render: (x) => x.text, sort: (x) => x.text },
          { key: 'topic', header: 'Topic', render: (x) => x.topic, sort: (x) => x.topic },
          { key: 'a', header: 'Correct answer', render: (x) => <span className="text-slate-600">{x.choices[x.correct]}</span> },
          {
            key: 'act',
            header: <span className="sr-only">Actions</span>,
            render: (x) => (
              <div className="flex gap-1">
                <Button size="sm" variant="secondary" onClick={() => open(x)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                <Button size="sm" variant="secondary" onClick={() => setDel(x)}><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
              </div>
            ),
          },
        ]}
      />
      <ValidationSummaryDialog items={form.summary?.items ?? null} onClose={form.closeSummary} />
      <ConfirmDialog
        open={!!del}
        danger
        title="Delete question"
        message={`Delete question ${del?.id}? It will no longer be available for future quizzes.`}
        onCancel={() => setDel(null)}
        onConfirm={() => {
          const id = del!.id
          mutate((s) => {
            s.questions = s.questions.filter((x) => x.id !== id)
            s.modules.forEach((m) => m.sections.forEach((sec) => (sec.questionIds = sec.questionIds.filter((x) => x !== id))))
            pushAudit(s, me, 'Question Deleted', id)
          })
          setDel(null)
        }}
      />
      <MessageDialog open={failed} onClose={() => setFailed(false)} tone="error" title="Save Failed. Please Try Again" />
    </>
  )
}
