// UC8 Create Training Modules

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowUp, CheckCircle2, Plus, Trash2 } from 'lucide-react'
import { useDemo, useMe, pushAudit } from '../../store/DemoStore'
import { Card, PageHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { FieldGroup, SelectField, TextArea, TextField } from '../../components/ui/RequirementField'
import { MessageDialog, ValidationSummaryDialog } from '../../components/ui/Dialog'
import { useForm } from '../../components/ui/useForm'
import * as V from '../../lib/validators'
import { REQ } from '../../lib/validators'
import { moduleId } from '../../lib/ids'
import { nowIso } from '../../lib/dates'
import type { ModuleKind, ModuleSection } from '../../store/types'

export default function CreateModulePage() {
  const { state, mutate, simulate } = useDemo()
  const me = useMe()
  const nav = useNavigate()
  const form = useForm({ title: '', description: '', kind: 'general' as ModuleKind, estMinutes: '15', certifiable: true, sections: [] as ModuleSection[] })
  const v = form.values
  const errors = { title: V.moduleTitle(v.title), description: V.moduleDescription(v.description), sections: V.moduleContent(v.sections) }
  const [openQuiz, setOpenQuiz] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [created, setCreated] = useState<string | null>(null)
  const showMissing = !!form.touched.sections

  const setSec = (i: number, patch: Partial<ModuleSection>) => form.set('sections', v.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  const move = (i: number, d: number) => {
    const arr = [...v.sections]
    ;[arr[i], arr[i + d]] = [arr[i + d], arr[i]]
    form.set('sections', arr)
  }

  const create = async () => {
    if (!form.submit(errors, { title: 'Module title', description: 'Description', sections: 'Training content' })) return
    setBusy(true)
    const r = await simulate('save')
    setBusy(false)
    if (r !== 'ok') return setFailed(true)
    const id = moduleId()
    mutate((s) => {
      s.modules.push({ id, title: v.title.trim(), description: v.description.trim(), kind: v.kind, estMinutes: Number(v.estMinutes) || 15, sections: v.sections, certifiable: v.certifiable, available: true, createdBy: me.username, createdAt: nowIso() })
      pushAudit(s, me, 'Module Created', id, { newValue: v.title.trim() })
    })
    setCreated(id)
  }

  if (created)
    return (
      <>
        <PageHeader title="Create Training Module" uc="UC8" />
        <Card>
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600" aria-hidden />
            <p className="mt-3 text-lg font-semibold text-green-800">Training module created successfully. Module ID: {created}</p>
            <Button className="mt-6" onClick={() => nav('/training/manage')}>
              Done
            </Button>
          </div>
        </Card>
      </>
    )

  return (
    <>
      <PageHeader title="Create Training Module" uc="UC8" back={{ to: '/training/manage', label: 'Training Management' }} />
      <Card>
        <div className="max-w-3xl">
          <TextField name="title" label="Module title" value={v.title} onChange={(e) => form.set('title', e.target.value)} status={form.status('title', errors.title)} base={REQ.moduleTitle} error={errors.title} counter={{ value: v.title.length, max: 100 }} />
          <TextArea name="description" label="Description" rows={3} value={v.description} onChange={(e) => form.set('description', e.target.value)} status={form.status('description', errors.description)} base={REQ.moduleDesc} error={errors.description} counter={{ value: v.description.length, max: 500 }} />
          <div className="grid gap-x-4 md:grid-cols-3">
            {/* ASSUMPTION: type, time, and certification are needed by UC12, UC22, UC23, UC33 though UC8 does not list them. */}
            <SelectField name="kind" label="Module type" value={v.kind} onChange={(e) => form.set('kind', e.target.value as ModuleKind)} status="neutral">
              <option value="general">General</option>
              <option value="awareness">Security awareness</option>
              <option value="remedial">Remedial</option>
            </SelectField>
            <TextField name="estMinutes" label="Estimated minutes" type="number" min={1} max={240} value={v.estMinutes} onChange={(e) => form.set('estMinutes', e.target.value)} status="neutral" />
            <FieldGroup name="certifiable" label="Certificate" status="neutral" base="">
              <label className="flex items-center gap-2 py-2">
                <input id="f-certifiable" type="checkbox" className="h-4 w-4 accent-accent-700" checked={v.certifiable} onChange={(e) => form.set('certifiable', e.target.checked)} /> Offers a certificate
              </label>
            </FieldGroup>
          </div>
        </div>
        <FieldGroup name="sections" label="Training content" status={form.status('sections', errors.sections)} base={REQ.moduleContent} error={errors.sections}>
          <div className="space-y-4">
            {v.sections.map((s, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-semibold">Section {i + 1}</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" aria-label="Move down" disabled={i === v.sections.length - 1} onClick={() => move(i, 1)}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" aria-label="Remove section" onClick={() => form.set('sections', v.sections.filter((_, j) => j !== i))}>
                      <Trash2 className="h-4 w-4 text-red-700" />
                    </Button>
                  </div>
                </div>
                <label htmlFor={i === 0 ? 'f-sections' : `sec-h-${i}`} className="mb-1 block text-sm font-medium">Heading</label>
                <input id={i === 0 ? 'f-sections' : `sec-h-${i}`} value={s.heading} onChange={(e) => setSec(i, { heading: e.target.value })} className={`mb-3 block w-full rounded-md border bg-white px-3 py-2 ${showMissing && !s.heading.trim() ? 'border-red-600' : 'border-slate-300'}`} />
                <label htmlFor={`sec-b-${i}`} className="mb-1 block text-sm font-medium">Content</label>
                <textarea id={`sec-b-${i}`} rows={4} value={s.body} onChange={(e) => setSec(i, { body: e.target.value })} className={`block w-full rounded-md border bg-white px-3 py-2 ${showMissing && !s.body.trim() ? 'border-red-600' : 'border-slate-300'}`} />
                <div className="mt-3">
                  <button type="button" className="text-sm text-accent-700 hover:underline" onClick={() => setOpenQuiz(openQuiz === i ? null : i)} aria-expanded={openQuiz === i}>
                    Knowledge check: {s.questionIds.length ? `${s.questionIds.length} question(s)` : 'none (optional)'}
                  </button>
                  {openQuiz === i && (
                    <div className="mt-2 max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-white p-2">
                      {state.questions.map((q) => (
                        <label key={q.id} className="flex items-start gap-2 px-1 py-1 text-sm">
                          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-accent-700" checked={s.questionIds.includes(q.id)} onChange={(e) => setSec(i, { questionIds: e.target.checked ? [...s.questionIds, q.id] : s.questionIds.filter((x) => x !== q.id) })} />
                          <span>
                            <span className="font-mono text-xs text-slate-500">{q.id}</span> {q.text}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <Button variant="secondary" onClick={() => form.set('sections', [...v.sections, { heading: '', body: '', questionIds: [] }])}>
              <Plus className="h-4 w-4" /> Add section
            </Button>
          </div>
        </FieldGroup>
        <Button onClick={create} loading={busy}>
          Create Module
        </Button>
      </Card>
      <ValidationSummaryDialog items={form.summary?.items ?? null} onClose={form.closeSummary} />
      <MessageDialog open={failed} onClose={() => setFailed(false)} tone="error" title="Module Could Not Be Saved. Please Try Again" />
    </>
  )
}
