// Floating Demo Controls panel (CLAUDE.md Section 11). Toggle with the corner button or Ctrl+Shift+D.

import { useEffect, useState } from 'react'
import { FlaskConical, RotateCcw, X } from 'lucide-react'
import { useDemo } from '../../store/DemoStore'
import { ConfirmDialog } from '../ui/Dialog'

function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 py-1.5">
      <input type="checkbox" className="mt-1 h-4 w-4 accent-accent-700" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
    </label>
  )
}

export function DemoControls() {
  const { flags, setFlags, resetDemo } = useDemo()
  const [open, setOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])
  const u = flags.unavailable
  const active = flags.slow || u.scan || u.verify || u.purge || u.email || flags.saveFailure || flags.notifyFailure || flags.purgePartial
  return (
    <div className="no-print fixed bottom-4 right-4 z-40">
      {open ? (
        <div className="w-80 rounded-lg border border-slate-300 bg-white p-4 shadow-2xl" role="region" aria-label="Demo Controls">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2 font-semibold">
              <FlaskConical className="h-4 w-4 text-accent-700" /> Demo Controls
            </span>
            <button onClick={() => setOpen(false)} aria-label="Close Demo Controls" className="rounded p-1 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mb-2 text-xs text-slate-500">Force alternate courses during the demo. Ctrl+Shift+D toggles this panel.</p>
          <Toggle label="Slow service" hint={'Shows "taking longer than expected" dialogs'} checked={flags.slow} onChange={(v) => setFlags({ slow: v })} />
          <div className="mt-2 text-xs font-semibold uppercase text-slate-500">Service unavailable</div>
          <Toggle label="Scanning service" checked={u.scan} onChange={(v) => setFlags({ unavailable: { ...u, scan: v } })} />
          <Toggle label="Verification service" checked={u.verify} onChange={(v) => setFlags({ unavailable: { ...u, verify: v } })} />
          <Toggle label="Purge service" checked={u.purge} onChange={(v) => setFlags({ unavailable: { ...u, purge: v } })} />
          <Toggle label="Email service" hint="Phishing test sends" checked={u.email} onChange={(v) => setFlags({ unavailable: { ...u, email: v } })} />
          <div className="mt-2 text-xs font-semibold uppercase text-slate-500">One-shot failures</div>
          <Toggle label="Save failure" hint="Next save shows the could-not-be-saved dialog" checked={flags.saveFailure} onChange={(v) => setFlags({ saveFailure: v })} />
          <Toggle label="Notification failure" hint="Next notifying action reports failure" checked={flags.notifyFailure} onChange={(v) => setFlags({ notifyFailure: v })} />
          <Toggle label="Partial purge failure" hint="UC18 9A1 / 13A2" checked={flags.purgePartial} onChange={(v) => setFlags({ purgePartial: v })} />
          <div className="mt-2 border-t pt-2">
            <Toggle label="Keep data in this browser" hint="Saves the mock store to localStorage" checked={flags.persist} onChange={(v) => setFlags({ persist: v })} />
            <button onClick={() => setConfirmReset(true)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
              <RotateCcw className="h-4 w-4" /> Reset demo data
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-lg ${active ? 'border-yellow-400 bg-yellow-50 text-yellow-900' : 'border-slate-300 bg-white text-slate-700'}`}>
          <FlaskConical className="h-4 w-4" /> Demo Controls{active ? ' (active)' : ''}
        </button>
      )}
      <ConfirmDialog
        open={confirmReset}
        title="Reset demo data"
        message="Restore all seeded data? Anything created during this demo will be lost."
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetDemo()
          setConfirmReset(false)
        }}
      />
    </div>
  )
}
