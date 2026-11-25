// UC26 Create Knowledge Base Article: editor (/kb/new, /kb/edit/:id) and My Articles (/kb/my-articles).
// The team spec (Joshua Draft) asks for title, content, category, review, submit. Tags, summary,
// submission notes, drafts, and the UC7 review loop are prototype extras kept from the earlier extrapolation.

import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Eye, PenSquare, X } from 'lucide-react'
import { useDemo, useMe, pushNotification } from '../../store/DemoStore'
import { Card, PageHeader } from '../../components/ui/Card'
import { Button, LinkButton } from '../../components/ui/Button'
import { Banner } from '../../components/ui/Banner'
import { LoadGate } from '../../components/ui/LoadGate'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { FieldGroup, SelectField, TextArea, TextField } from '../../components/ui/RequirementField'
import { MessageDialog, ValidationSummaryDialog } from '../../components/ui/Dialog'
import { RichText, RichTextEditor } from '../../components/ui/RichText'
import { useForm } from '../../components/ui/useForm'
import * as V from '../../lib/validators'
import { fmtDate, nowIso } from '../../lib/dates'
import { KB_CATEGORIES } from './KbPages'
import type { Annotation, Article } from '../../store/types'

/** Renders text with reviewer annotations (highlight / strikethrough + margin note). */
export function AnnotatedText({ text, annotations }: { text: string; annotations: Annotation[] }) {
  const parts: ReactNode[] = []
  let rest = text
  let key = 0
  const pending = [...annotations]
  while (rest.length) {
    let best: { i: number; a: Annotation } | null = null
    for (const a of pending) {
      const i = rest.indexOf(a.text)
      if (i >= 0 && (!best || i < best.i)) best = { i, a }
    }
    if (!best) {
      parts.push(rest)
      break
    }
    parts.push(rest.slice(0, best.i))
    const n = annotations.indexOf(best.a) + 1
    parts.push(
      best.a.kind === 'highlight' ? (
        <mark key={key++} className="rounded bg-yellow-200 px-0.5" title={best.a.note}>
          {best.a.text}
          <sup className="ml-0.5 font-semibold text-yellow-900">[{n}]</sup>
        </mark>
      ) : (
        <span key={key++} title={best.a.note}>
          <del className="text-red-700 decoration-2">{best.a.text}</del>
          <sup className="ml-0.5 font-semibold text-red-700">[{n}]</sup>
        </span>
      ),
    )
    rest = rest.slice(best.i + best.a.text.length)
    pending.splice(pending.indexOf(best.a), 1)
  }
  return <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">{parts}</div>
}

export function AnnotationNotes({ annotations }: { annotations: Annotation[] }) {
  return (
    <ol className="space-y-1 text-sm">
      {annotations.map((a, i) => (
        <li key={a.id}>
          <span className="font-semibold">[{i + 1}]</span> {a.kind === 'highlight' ? 'Highlight' : 'Strikethrough'}: "{a.text}" {a.note && <span className="text-slate-600">- {a.note}</span>}
        </li>
      ))}
    </ol>
  )
}

export function ArticleEditorPage() {
  const { id } = useParams()
  const { state, mutate, simulate, toast } = useDemo()
  const me = useMe()
  const nav = useNavigate()
  const existing = id ? state.articles.find((a) => a.id === id && a.author === me.username) : undefined
  const form = useForm({
    title: existing?.title ?? '',
    category: existing?.category ?? '',
    tags: existing?.tags ?? ([] as string[]),
    summary: existing?.summary ?? '',
    body: existing?.body ?? '',
    notes: existing?.submissionNotes ?? '',
  })
  const v = form.values
  const [tagInput, setTagInput] = useState('')
  // Holds the status of a failed save so "Try Again" repeats it (UC26 11A1).
  const [failed, setFailed] = useState<'Draft' | 'Pending Review' | null>(null)
  // UC26 step 8: the actor reviews the article details before submitting.
  const [reviewing, setReviewing] = useState(false)
  const errors = {
    title: V.lengthBetween('Title', v.title, 5, 100),
    category: v.category ? null : 'Select a category.',
    tags: v.tags.length > 5 ? 'Use up to 5 tags.' : null,
    summary: V.lengthBetween('Short summary', v.summary, 20, 300),
    body: V.lengthBetween('Body', v.body, 100, 20000),
    notes: v.notes.length > 1000 ? 'Submission notes must not exceed 1,000 characters.' : null,
  }

  if (id && !existing)
    return (
      <>
        <PageHeader title="Edit Article" back={{ to: '/kb/my-articles', label: 'My Articles' }} />
        <Banner tone="error" title="This article is no longer available." />
      </>
    )
  if (existing && !['Draft', 'Awaiting Revision'].includes(existing.status))
    return (
      <>
        <PageHeader title="Edit Article" back={{ to: '/kb/my-articles', label: 'My Articles' }} />
        <Banner tone="info" title={`This article is ${existing.status} and cannot be edited.`} />
      </>
    )

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/^#/, '')
    if (t && !v.tags.includes(t) && v.tags.length < 5) form.set('tags', [...v.tags, t])
    setTagInput('')
  }

  const persist = async (status: 'Draft' | 'Pending Review') => {
    const r = await simulate('save')
    if (r !== 'ok') {
      setFailed(status)
      return null
    }
    const artId = existing?.id ?? `KB-${Math.floor(200 + Math.random() * 700)}`
    mutate((s) => {
      const data = { title: v.title.trim(), category: v.category, tags: v.tags, summary: v.summary.trim(), body: v.body, submissionNotes: v.notes, status, updatedAt: nowIso(), submittedAt: status === 'Pending Review' ? nowIso() : null }
      const x = s.articles.find((a) => a.id === artId)
      if (x) Object.assign(x, data)
      else s.articles.push({ id: artId, author: me.username, views: 0, publishedAt: null, ratings: {}, comments: [], ...data } as Article)
      if (status === 'Pending Review') pushNotification(s, s.users.filter((u) => u.role === 'officer').map((u) => u.username), `New article pending review: "${v.title.trim()}"`, '/kb/pending')
    })
    return artId
  }

  const saveDraft = async () => {
    // ASSUMPTION: a draft only needs a valid title; full checks run on Submit for Review.
    if (!form.submit({ title: errors.title }, { title: 'Title' })) return
    if (await persist('Draft')) {
      toast('Draft saved.')
      nav('/kb/my-articles')
    }
  }
  const labels = { title: 'Title', category: 'Category', tags: 'Tags', summary: 'Short summary', body: 'Body', notes: 'Submission notes' }
  const review = () => {
    if (form.submit(errors, labels)) setReviewing(true)
  }
  const submit = async () => {
    if (!form.submit(errors, labels)) return setReviewing(false)
    if (await persist('Pending Review')) {
      toast('Article submitted for review.')
      nav('/kb/my-articles')
    }
  }

  return (
    <>
      <PageHeader title={existing ? 'Edit Article' : 'Write Article'} uc="UC26" back={{ to: '/kb/my-articles', label: 'My Articles' }} subtitle="Submitted articles are reviewed by a Cybersecurity Officer before publishing." />
      {existing?.status === 'Awaiting Revision' && existing.review && (
        <Card className="mb-6 border-yellow-300" title="Reviewer requested revisions">
          <p className="mb-3 text-sm">
            <span className="font-medium">{existing.review.by}</span> on {fmtDate(existing.review.at)}: {existing.review.remark}
          </p>
          <div className="rounded-md bg-slate-50 p-3">
            <AnnotatedText text={existing.body} annotations={existing.review.annotations} />
          </div>
          <div className="mt-3">
            <AnnotationNotes annotations={existing.review.annotations} />
          </div>
        </Card>
      )}
      <LoadGate what="article creation form">
      {reviewing ? (
        <Card title="Review your article">
          <p className="mb-4 text-sm text-slate-600">This is how the article will appear once published. Select Edit to make changes.</p>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{v.category}</div>
          <h2 className="mt-1 text-2xl font-semibold">{v.title}</h2>
          <p className="mt-2 text-slate-600">{v.summary}</p>
          {v.tags.length > 0 && <div className="mt-2 text-sm text-slate-500">{v.tags.map((t) => `#${t}`).join(' ')}</div>}
          <div className="mt-5 border-t pt-5">
            <RichText source={v.body} />
          </div>
          {v.notes && (
            <div className="mt-5 rounded-md bg-slate-50 p-3 text-sm">
              <span className="font-medium">Submission notes:</span> {v.notes}
            </div>
          )}
          <div className="mt-6 flex gap-3">
            <Button onClick={submit}>Submit for Review</Button>
            <Button variant="secondary" onClick={() => setReviewing(false)}>
              <PenSquare className="h-4 w-4" /> Edit
            </Button>
            <Button variant="ghost" onClick={() => nav('/kb/my-articles')}>Cancel</Button>
          </div>
        </Card>
      ) : (
      <Card>
        <TextField name="title" label="Title" value={v.title} onChange={(e) => form.set('title', e.target.value)} status={form.status('title', errors.title)} base="Enter a title between 5 and 100 characters." error={errors.title} counter={{ value: v.title.length, max: 100 }} />
        <div className="grid gap-x-6 md:grid-cols-2">
          <SelectField name="category" label="Category" value={v.category} onChange={(e) => form.set('category', e.target.value)} status={form.status('category', errors.category)} base="Select a category." error={errors.category}>
            <option value="">Choose a category</option>
            {KB_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </SelectField>
          <FieldGroup name="tags" label="Tags" status={form.status('tags', errors.tags)} base="Add up to 5 tags." error={errors.tags}>
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-300 bg-white px-2 py-1.5">
              {v.tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-sm">
                  #{t}
                  <button type="button" aria-label={`Remove tag ${t}`} onClick={() => form.set('tags', v.tags.filter((x) => x !== t))}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                id="f-tags"
                value={tagInput}
                disabled={v.tags.length >= 5}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault()
                    addTag()
                  }
                }}
                onBlur={addTag}
                placeholder={v.tags.length >= 5 ? '' : 'Type and press Enter'}
                className="min-w-[8rem] flex-1 border-0 py-0.5 text-sm focus:outline-none"
              />
            </div>
          </FieldGroup>
        </div>
        <TextArea name="summary" label="Short summary" rows={2} value={v.summary} onChange={(e) => form.set('summary', e.target.value)} status={form.status('summary', errors.summary)} base="Summarize the article in 20 to 300 characters." error={errors.summary} counter={{ value: v.summary.length, max: 300 }} />
        <FieldGroup name="body" label="Body" status={form.status('body', errors.body)} base="Write the article in 100 to 20,000 characters. Use the toolbar for headings, bold, lists, and links." error={errors.body} counter={{ value: v.body.length, max: 20000 }}>
          <RichTextEditor id="f-body" value={v.body} onChange={(x) => form.set('body', x)} invalid={form.status('body', errors.body) === 'error'} />
          <div className="mt-1 text-right text-xs text-slate-500">{v.body.length.toLocaleString()} / 20,000</div>
        </FieldGroup>
        <TextArea name="notes" label="Submission notes for the reviewer (optional)" rows={2} value={v.notes} onChange={(e) => form.set('notes', e.target.value)} status={form.status('notes', errors.notes)} base="Optional, up to 1,000 characters." error={errors.notes} counter={{ value: v.notes.length, max: 1000 }} />
        <div className="flex gap-3">
          <Button variant="secondary" onClick={saveDraft}>
            Save Draft
          </Button>
          <Button onClick={review}>
            <Eye className="h-4 w-4" /> Review Article
          </Button>
          {/* UC26 3A1 / 9A1: cancel discards the changes and returns to the knowledge base. */}
          <Button variant="ghost" onClick={() => nav('/kb/my-articles')}>Cancel</Button>
        </div>
      </Card>
      )}
      </LoadGate>
      <ValidationSummaryDialog items={form.summary?.items ?? null} onClose={form.closeSummary} />
      <MessageDialog
        open={!!failed}
        onClose={() => setFailed(null)}
        onRetry={() => { const st = failed; setFailed(null); if (st === 'Draft') saveDraft(); else submit() }}
        tone="error"
        title="Article could not be saved. Please try again."
      />
    </>
  )
}

export function MyArticlesPage() {
  const { state } = useDemo()
  const me = useMe()
  const nav = useNavigate()
  const mine = state.articles.filter((a) => a.author === me.username)
  return (
    <>
      <PageHeader title="My Articles" uc="UC26" subtitle="Knowledge Base articles you have written." actions={<LinkButton to="/kb/new"><PenSquare className="h-4 w-4" /> Write Article</LinkButton>} />
      <DataTable
        rows={mine}
        rowKey={(a) => a.id}
        empty="You have not written any articles yet."
        initialSort={{ key: 'u', dir: 'desc' }}
        onRowClick={(a) => nav(['Draft', 'Awaiting Revision'].includes(a.status) ? `/kb/edit/${a.id}` : `/kb/${a.id}`)}
        columns={[
          { key: 't', header: 'Title', render: (a) => <span className="font-medium text-accent-700">{a.title}</span>, sort: (a) => a.title },
          { key: 'c', header: 'Category', render: (a) => a.category },
          { key: 's', header: 'Status', render: (a) => <StatusBadge status={a.status} />, sort: (a) => a.status },
          { key: 'u', header: 'Last updated', render: (a) => fmtDate(a.updatedAt), sort: (a) => a.updatedAt },
          { key: 'n', header: 'Reviewer feedback', render: (a) => <span className="text-sm text-slate-600">{a.review?.remark ?? a.rejection?.comment ?? '-'}</span> },
        ]}
      />
    </>
  )
}
