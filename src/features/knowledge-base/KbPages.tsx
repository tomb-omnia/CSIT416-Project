// UC6 Search for Knowledge Base Articles: portal (/kb) and article page (/kb/:articleId).

import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Clock, Eye, PenSquare, Search, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useDemo, useMe } from '../../store/DemoStore'
import { Card, EmptyState, PageHeader } from '../../components/ui/Card'
import { Button, LinkButton } from '../../components/ui/Button'
import { Banner } from '../../components/ui/Banner'
import { RichText } from '../../components/ui/RichText'
import { TextArea } from '../../components/ui/RequirementField'
import { useForm } from '../../components/ui/useForm'
import * as V from '../../lib/validators'
import { REQ } from '../../lib/validators'
import { fmtDate, fmtDateTime, nowIso } from '../../lib/dates'
import { uid } from '../../lib/ids'
import type { Article } from '../../store/types'

export const KB_CATEGORIES = ['Phishing', 'Account Security', 'Phone and Text', 'Devices', 'Reporting', 'Policies']

/** Simple keyword relevance: title x5, tags x3, summary x2, body x1. */
function score(a: Article, words: string[]) {
  let s = 0
  for (const w of words) {
    if (a.title.toLowerCase().includes(w)) s += 5
    if (a.tags.some((t) => t.toLowerCase().includes(w))) s += 3
    if (a.summary.toLowerCase().includes(w)) s += 2
    if (a.body.toLowerCase().includes(w)) s += 1
  }
  return s
}

function ArticleRow({ a }: { a: Article }) {
  return (
    <li className="py-4">
      <Link to={`/kb/${a.id}`} className="text-lg font-semibold text-accent-700 hover:underline">
        {a.title}
      </Link>
      <div className="mt-0.5 text-xs text-slate-500">
        {a.category} · Last updated {fmtDate(a.updatedAt)}
      </div>
      <p className="mt-1 text-slate-700">{a.summary}</p>
    </li>
  )
}

export function KbPortalPage() {
  const { state } = useDemo()
  const me = useMe()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const cat = params.get('cat') ?? ''
  const [input, setInput] = useState(q)
  const published = state.articles.filter((a) => a.status === 'Published')
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  const results = q
    ? published.map((a) => ({ a, s: score(a, words) })).filter((x) => x.s > 0).sort((x, y) => y.s - x.s).map((x) => x.a)
    : cat
      ? published.filter((a) => a.category === cat).sort((x, y) => (y.publishedAt ?? '').localeCompare(x.publishedAt ?? ''))
      : null
  const canWrite = me.role !== 'admin'

  return (
    <>
      <PageHeader title="Knowledge Base" uc="UC6" subtitle="Articles on phishing and staying secure." actions={canWrite && <LinkButton to="/kb/new" variant="secondary"><PenSquare className="h-4 w-4" /> Write Article</LinkButton>} />
      <form
        role="search"
        className="mb-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setParams(input.trim() ? { q: input.trim() } : {})
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
          <label htmlFor="kb-q" className="sr-only">
            Search articles
          </label>
          <input id="kb-q" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search by keyword, for example: attachments, MFA, text" className="block w-full rounded-md border border-slate-300 py-2.5 pl-9 pr-3" />
        </div>
        <Button type="submit">Search</Button>
      </form>
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav aria-label="Categories">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Categories</div>
          <ul className="space-y-0.5">
            {KB_CATEGORIES.map((c) => {
              const count = published.filter((a) => a.category === c).length
              return (
                <li key={c}>
                  <button
                    onClick={() => {
                      setInput('')
                      setParams({ cat: c })
                    }}
                    className={`flex w-full justify-between rounded-md px-2 py-1.5 text-left text-sm ${cat === c ? 'bg-accent-50 font-semibold text-accent-800' : 'hover:bg-slate-100'}`}
                  >
                    {c} <span className="text-slate-400">{count}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
        <div>
          {results ? (
            <Card
              title={q ? `Results for "${q}"` : `Category: ${cat}`}
              actions={
                <Button size="sm" variant="ghost" onClick={() => { setInput(''); setParams({}) }}>
                  Clear
                </Button>
              }
            >
              {results.length === 0 ? (
                <EmptyState>{q ? `No articles match ${q}. Try different keywords or browse by category.` : 'No published articles in this category yet.'}</EmptyState>
              ) : (
                <ul className="-my-4 divide-y divide-slate-100">
                  {results.map((a) => (
                    <ArticleRow key={a.id} a={a} />
                  ))}
                </ul>
              )}
            </Card>
          ) : (
            <div className="grid gap-6 xl:grid-cols-2">
              <Card title={<span className="flex items-center gap-2"><Eye className="h-4 w-4 text-slate-400" /> Most Viewed</span>}>
                <ul className="-my-4 divide-y divide-slate-100">
                  {[...published].sort((a, b) => b.views - a.views).slice(0, 3).map((a) => <ArticleRow key={a.id} a={a} />)}
                </ul>
              </Card>
              <Card title={<span className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-400" /> Recently Published</span>}>
                <ul className="-my-4 divide-y divide-slate-100">
                  {[...published].sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '')).slice(0, 3).map((a) => <ArticleRow key={a.id} a={a} />)}
                </ul>
              </Card>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export function ArticlePage() {
  const { articleId } = useParams()
  const { state, mutate, toast } = useDemo()
  const me = useMe()
  const a = state.articles.find((x) => x.id === articleId)
  const form = useForm({ comment: '' })
  const err = V.comment(form.values.comment)
  const [rateMsg, setRateMsg] = useState<string | null>(null)
  const counted = useRef(false)

  useEffect(() => {
    if (a?.status === 'Published' && !counted.current) {
      counted.current = true
      mutate((s) => {
        const x = s.articles.find((y) => y.id === a.id)
        if (x) x.views += 1
      })
    }
  }, [a?.id, a?.status, mutate])

  const back = { to: '/kb', label: 'Knowledge Base' }
  const canSee = a && (a.status === 'Published' || a.author === me.username || me.role === 'officer')
  if (!a || !canSee)
    return (
      <>
        <PageHeader title="Knowledge Base" back={back} />
        <Banner tone="error" title="This article is no longer available." />
      </>
    )

  const related = state.articles.filter((x) => x.id !== a.id && x.status === 'Published' && (x.category === a.category || x.tags.some((t) => a.tags.includes(t)))).slice(0, 4)
  const myRating = a.ratings[me.username]
  const yes = Object.values(a.ratings).filter((r) => r === 'yes').length

  const rate = (r: 'yes' | 'no') => {
    if (myRating) return setRateMsg('You have already rated this article.') // 7A2: refuse resubmission
    mutate((s) => {
      const x = s.articles.find((y) => y.id === a.id)
      if (x) x.ratings[me.username] = r
    })
    setRateMsg('Thanks for your feedback.')
  }
  const post = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.submit({ comment: err })) return
    mutate((s) => s.articles.find((y) => y.id === a.id)?.comments.push({ id: uid('c'), user: me.username, at: nowIso(), text: form.values.comment.trim() }))
    form.reset({ comment: '' })
    toast('Your comment has been posted.')
  }

  return (
    <>
      <PageHeader title={a.title} back={back} subtitle={`${a.category} · By ${a.author} · Last updated ${fmtDate(a.updatedAt)}`} />
      {a.status !== 'Published' && <Banner tone="warning" className="mb-4" title={`Not published: ${a.status}`}>Only the author and Cybersecurity Officers can see this article.</Banner>}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <Card>
            <p className="mb-4 text-lg text-slate-600">{a.summary}</p>
            <RichText source={a.body} />
            <div className="mt-6 flex flex-wrap gap-2">
              {a.tags.map((t) => (
                <Link key={t} to={`/kb?q=${encodeURIComponent(t)}`} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700 hover:bg-slate-200">
                  #{t}
                </Link>
              ))}
            </div>
          </Card>
          {a.status === 'Published' && (
            <Card>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium">Was this article helpful?</span>
                <Button size="sm" variant={myRating === 'yes' ? 'primary' : 'secondary'} onClick={() => rate('yes')} aria-pressed={myRating === 'yes'}>
                  <ThumbsUp className="h-4 w-4" /> Yes
                </Button>
                <Button size="sm" variant={myRating === 'no' ? 'primary' : 'secondary'} onClick={() => rate('no')} aria-pressed={myRating === 'no'}>
                  <ThumbsDown className="h-4 w-4" /> No
                </Button>
                <span className="text-sm text-slate-500">{yes} found this helpful</span>
              </div>
              {rateMsg && <p className="mt-2 text-sm text-slate-600">{rateMsg}</p>}
            </Card>
          )}
          {a.status === 'Published' && (
            <Card title={`Comments (${a.comments.length})`}>
              <ul className="mb-6 space-y-4">
                {a.comments.map((c) => (
                  <li key={c.id} className="rounded-md bg-slate-50 p-3">
                    <div className="text-sm">
                      <span className="font-medium">{c.user}</span> <span className="text-slate-500">· {fmtDateTime(c.at)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap">{c.text}</p>
                  </li>
                ))}
                {a.comments.length === 0 && <li className="text-sm text-slate-500">No comments yet.</li>}
              </ul>
              <form onSubmit={post} noValidate>
                <TextArea name="comment" label="Add a comment" rows={3} value={form.values.comment} onChange={(e) => form.set('comment', e.target.value)} status={form.status('comment', err)} base={REQ.comment} error={err} counter={{ value: form.values.comment.length, max: 1000 }} />
                <Button type="submit">Post Comment</Button>
              </form>
            </Card>
          )}
        </div>
        <aside>
          <Card title="Related articles">
            {related.length === 0 ? (
              <p className="text-sm text-slate-500">None yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {related.map((r) => (
                  <li key={r.id}>
                    <Link to={`/kb/${r.id}`} className="text-accent-700 hover:underline">
                      {r.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </>
  )
}
