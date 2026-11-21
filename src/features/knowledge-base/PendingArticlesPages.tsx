// UC7 Approve Knowledge Base Articles: pending list (/kb/pending) and review (/kb/pending/:id).

import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, Highlighter, Strikethrough, Trash2, Undo2, X } from 'lucide-react'
import { useDemo, useMe, pushAudit, pushNotification } from '../../store/DemoStore'
import { Card, PageHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Banner } from '../../components/ui/Banner'
import { DataTable } from '../../components/ui/DataTable'
import { ConfirmDialog } from '../../components/ui/Dialog'
import { RichText } from '../../components/ui/RichText'
import { fmtDate, nowIso } from '../../lib/dates'
import { uid } from '../../lib/ids'
import { AnnotatedText, AnnotationNotes } from './ArticleEditorPages'
import type { Annotation } from '../../store/types'

export function PendingArticlesPage() {
  const { state } = useDemo()
  const nav = useNavigate()
  const rows = state.articles.filter((a) => a.status === 'Pending Review')
  return (
    <>
      <PageHeader title="Pending Articles" uc="UC7" subtitle="Knowledge Base submissions waiting for review, oldest first." />
      <DataTable
        rows={rows}
        rowKey={(a) => a.id}
        onRowClick={(a) => nav(`/kb/pending/${a.id}`)}
        empty="No articles are pending review."
        initialSort={{ key: 'd', dir: 'asc' }}
        columns={[
          { key: 't', header: 'Article name', render: (a) => <span className="font-medium text-accent-700">{a.title}</span>, sort: (a) => a.title },
          { key: 's', header: 'Short description', render: (a) => <span className="text-slate-600">{a.summary}</span> },
          { key: 'a', header: 'Author', render: (a) => a.author, sort: (a) => a.author },
          { key: 'c', header: 'Category', render: (a) => a.category, sort: (a) => a.category },
          { key: 'd', header: 'Date submitted', render: (a) => fmtDate(a.submittedAt), sort: (a) => a.submittedAt ?? '' },
        ]}
      />
    </>
  )
}

export function ReviewArticlePage() {
  const { id } = useParams()
  const { state, mutate, toast } = useDemo()
  const me = useMe()
  const nav = useNavigate()
  const a = state.articles.find((x) => x.id === id)
  const [mode, setMode] = useState<'view' | 'revise' | 'reject'>('view')
  const [confirm, setConfirm] = useState<null | 'approve' | 'revise' | 'reject'>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [selection, setSelection] = useState('')
  const [note, setNote] = useState('')
  const [remark, setRemark] = useState('')
  const textRef = useRef<HTMLDivElement>(null)
  const back = { to: '/kb/pending', label: 'Pending Articles' }

  if (!a || a.status !== 'Pending Review')
    return (
      <>
        <PageHeader title="Review Article" back={back} />
        <Banner tone="info" title={a ? `This article is ${a.status}.` : 'This article is no longer available.'} />
      </>
    )

  const capture = () => {
    const sel = window.getSelection()
    if (!sel || !textRef.current || !textRef.current.contains(sel.anchorNode)) return
    setSelection(sel.toString().trim())
  }
  const annotate = (kind: Annotation['kind']) => {
    if (!selection) return
    setAnnotations([...annotations, { id: uid('an'), text: selection, kind, note: note.trim() }])
    setSelection('')
    setNote('')
    window.getSelection()?.removeAllRanges()
  }

  const finish = () => {
    const kind = confirm
    setConfirm(null)
    mutate((s) => {
      const x = s.articles.find((y) => y.id === a.id)
      if (!x) return
      if (kind === 'approve') {
        x.status = 'Published'
        x.publishedAt = nowIso()
        x.updatedAt = nowIso()
        x.approvedBy = me.username
        pushNotification(s, a.author, `Your article, ${a.title} has been approved and published.`, `/kb/${a.id}`)
        pushAudit(s, me, 'Article Published', a.title)
      } else if (kind === 'revise') {
        x.status = 'Awaiting Revision'
        x.review = { annotations, remark, by: me.username, at: nowIso() }
        pushNotification(s, a.author, `Your article "${a.title}" needs revision.`, `/kb/edit/${a.id}`)
        pushAudit(s, me, 'Article Revision Requested', a.title)
      } else {
        x.status = 'Rejected'
        x.rejection = { comment: remark, by: me.username, at: nowIso() }
        pushNotification(s, a.author, `Your article "${a.title}" was rejected.${remark ? ` Reason: ${remark}` : ''}`, '/kb/my-articles')
        pushAudit(s, me, 'Article Rejected', a.title)
      }
    })
    toast(kind === 'approve' ? 'Article published.' : kind === 'revise' ? 'Revision requested.' : 'Article rejected.')
    nav('/kb/pending')
  }

  const remarkBox = (label: string) => (
    <div className="mt-4">
      <label htmlFor="f-remark" className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <textarea id="f-remark" rows={4} maxLength={5000} value={remark} onChange={(e) => setRemark(e.target.value)} className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      <div className="mt-1 text-right text-xs text-slate-500">{remark.length.toLocaleString()} / 5,000</div>
    </div>
  )

  return (
    <>
      <PageHeader title={`Review: ${a.title}`} uc="UC7" back={back} subtitle={`${a.category} · Submitted by ${a.author} on ${fmtDate(a.submittedAt)}`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card title={mode === 'revise' ? 'Annotate the article' : 'Article as users will see it'}>
          {mode === 'revise' ? (
            <>
              <p className="mb-3 text-sm text-slate-600">Select text below, optionally add a note, then choose Highlight or Strikethrough.</p>
              <div ref={textRef} onMouseUp={capture} onKeyUp={capture} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <AnnotatedText text={a.body} annotations={annotations} />
              </div>
            </>
          ) : (
            <>
              <p className="mb-4 text-lg text-slate-600">{a.summary}</p>
              <RichText source={a.body} />
              <div className="mt-4 flex flex-wrap gap-2">
                {a.tags.map((t) => (
                  <span key={t} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs">
                    #{t}
                  </span>
                ))}
              </div>
            </>
          )}
        </Card>
        <div className="space-y-6">
          <Card title="Author's submission notes">
            <p className="text-sm text-slate-700">{a.submissionNotes || 'No notes provided.'}</p>
          </Card>
          <Card title="Decision">
            {mode === 'view' && (
              <div className="grid gap-2">
                <Button variant="success" onClick={() => setConfirm('approve')}>
                  <Check className="h-4 w-4" /> Approve
                </Button>
                <Button variant="secondary" onClick={() => setMode('revise')}>
                  <Highlighter className="h-4 w-4" /> Request Revision
                </Button>
                <Button variant="danger" onClick={() => setMode('reject')}>
                  <X className="h-4 w-4" /> Reject
                </Button>
              </div>
            )}
            {mode === 'revise' && (
              <>
                <div className="rounded-md border border-slate-200 p-3 text-sm">
                  <div className="text-xs font-semibold uppercase text-slate-500">Selected text</div>
                  <p className="mt-1 min-h-[1.5rem] font-mono">{selection || <span className="text-slate-400">Nothing selected</span>}</p>
                  <label htmlFor="an-note" className="mt-2 block text-xs font-medium">
                    Margin note (optional)
                  </label>
                  <input id="an-note" value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 block w-full rounded border border-slate-300 px-2 py-1" />
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="secondary" disabled={!selection} onClick={() => annotate('highlight')}>
                      <Highlighter className="h-3.5 w-3.5" /> Highlight
                    </Button>
                    <Button size="sm" variant="secondary" disabled={!selection} onClick={() => annotate('strike')}>
                      <Strikethrough className="h-3.5 w-3.5" /> Strikethrough
                    </Button>
                  </div>
                </div>
                {annotations.length > 0 && (
                  <div className="mt-3">
                    <AnnotationNotes annotations={annotations} />
                    <Button size="sm" variant="ghost" className="mt-1" onClick={() => setAnnotations(annotations.slice(0, -1))}>
                      <Undo2 className="h-3.5 w-3.5" /> Undo last
                    </Button>
                  </div>
                )}
                {remarkBox('Remark (optional, up to 5,000 characters)')}
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" onClick={() => { setMode('view'); setAnnotations([]); setRemark('') }}>
                    Back
                  </Button>
                  <Button onClick={() => setConfirm('revise')}>Confirm</Button>
                </div>
              </>
            )}
            {mode === 'reject' && (
              <>
                {remarkBox('Reason for rejection (up to 5,000 characters)')}
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" onClick={() => { setMode('view'); setRemark('') }}>
                    Back
                  </Button>
                  <Button variant="danger" onClick={() => setConfirm('reject')}>
                    <Trash2 className="h-4 w-4" /> Confirm
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
      <ConfirmDialog
        open={!!confirm}
        title={confirm === 'approve' ? 'Publish article' : confirm === 'revise' ? 'Request revision' : 'Reject article'}
        message={confirm === 'approve' ? `Publish ${a.title} to the Knowledge Base?` : confirm === 'revise' ? `Return ${a.title} to the author for revision?` : `Reject ${a.title}?`}
        danger={confirm === 'reject'}
        onCancel={() => setConfirm(null)}
        onConfirm={finish}
      />
    </>
  )
}
