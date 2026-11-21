// Minimal rich text: a small markdown subset (## heading, **bold**, - list, [text](url)).
// Rendered to React elements (no innerHTML), so pasted content is never executed.

import { Fragment, useRef, useState, type ReactNode } from 'react'
import { Bold, Heading2, Link2, List } from 'lucide-react'

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(\*\*([^*]+)\*\*)|(\[([^\]]+)\]\(([^)\s]+)\))/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[2]) out.push(<strong key={`${keyBase}-${i++}`}>{m[2]}</strong>)
    else {
      const href = m[5]
      const safe = /^(https?:\/\/|#\/)/.test(href) ? href : '#'
      out.push(
        <a key={`${keyBase}-${i++}`} href={safe} className="text-accent-700 underline" {...(safe.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>
          {m[4]}
        </a>,
      )
    }
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function RichText({ source, className = '' }: { source: string; className?: string }) {
  const blocks = source.split(/\n{2,}/)
  return (
    <div className={`space-y-3 leading-relaxed ${className}`}>
      {blocks.map((b, bi) => {
        const lines = b.split('\n')
        const nodes: ReactNode[] = []
        let list: string[] = []
        const flush = () => {
          if (list.length)
            nodes.push(
              <ul key={`ul-${bi}-${nodes.length}`} className="list-disc space-y-1 pl-6">
                {list.map((l, li) => (
                  <li key={li}>{inline(l, `${bi}-${li}`)}</li>
                ))}
              </ul>,
            )
          list = []
        }
        lines.forEach((l, li) => {
          if (/^- /.test(l)) return list.push(l.slice(2))
          flush()
          if (/^## /.test(l))
            nodes.push(
              <h3 key={`h-${bi}-${li}`} className="pt-1 text-lg font-semibold text-slate-900">
                {inline(l.slice(3), `h${bi}${li}`)}
              </h3>,
            )
          else if (l.trim()) nodes.push(<p key={`p-${bi}-${li}`}>{inline(l, `p${bi}${li}`)}</p>)
        })
        flush()
        return <Fragment key={bi}>{nodes}</Fragment>
      })}
    </div>
  )
}

export function RichTextEditor({ id, value, onChange, invalid, rows = 12 }: { id: string; value: string; onChange: (v: string) => void; invalid?: boolean; rows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [preview, setPreview] = useState(false)
  const wrap = (before: string, after = '', placeholder = 'text') => {
    const t = ref.current
    if (!t) return
    const s = t.selectionStart
    const e = t.selectionEnd
    const sel = value.slice(s, e) || placeholder
    const next = value.slice(0, s) + before + sel + after + value.slice(e)
    onChange(next)
    requestAnimationFrame(() => {
      t.focus()
      t.setSelectionRange(s + before.length, s + before.length + sel.length)
    })
  }
  const linePrefix = (prefix: string) => {
    const t = ref.current
    if (!t) return
    const s = t.selectionStart
    const lineStart = value.lastIndexOf('\n', s - 1) + 1
    onChange(value.slice(0, lineStart) + prefix + value.slice(lineStart))
    requestAnimationFrame(() => t.focus())
  }
  const tb = 'rounded p-1.5 text-slate-700 hover:bg-slate-200'
  return (
    <div className={`overflow-hidden rounded-md border bg-white ${invalid ? 'border-red-600' : 'border-slate-300'}`}>
      <div className="flex items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1">
        <button type="button" className={tb} onClick={() => linePrefix('## ')} aria-label="Heading" title="Heading">
          <Heading2 className="h-4 w-4" />
        </button>
        <button type="button" className={tb} onClick={() => wrap('**', '**')} aria-label="Bold" title="Bold">
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" className={tb} onClick={() => linePrefix('- ')} aria-label="Bulleted list" title="Bulleted list">
          <List className="h-4 w-4" />
        </button>
        <button type="button" className={tb} onClick={() => wrap('[', '](https://)', 'link text')} aria-label="Link" title="Link">
          <Link2 className="h-4 w-4" />
        </button>
        <div className="ml-auto flex text-xs">
          <button type="button" onClick={() => setPreview(false)} className={`rounded px-2 py-1 ${!preview ? 'bg-white font-semibold shadow-sm' : ''}`}>
            Write
          </button>
          <button type="button" onClick={() => setPreview(true)} className={`rounded px-2 py-1 ${preview ? 'bg-white font-semibold shadow-sm' : ''}`}>
            Preview
          </button>
        </div>
      </div>
      {preview ? (
        <div className="min-h-[12rem] p-3">
          <RichText source={value || '_Nothing to preview._'} />
        </div>
      ) : (
        <textarea id={id} ref={ref} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className="block w-full resize-y p-3 font-mono text-sm focus:outline-none" />
      )}
    </div>
  )
}
