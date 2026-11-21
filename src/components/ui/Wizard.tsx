// <Wizard> step indicator for long sequential flows (UC1, UC15, UC21, UC32).

import { Check } from 'lucide-react'

export function Steps({ steps, current, done }: { steps: string[]; current: number; done?: (i: number) => boolean }) {
  return (
    <ol className="mb-6 flex flex-wrap items-center gap-2 text-sm" aria-label="Progress">
      {steps.map((s, i) => {
        const isDone = done ? done(i) : i < current
        const active = i === current
        return (
          <li key={s} className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${
                isDone ? 'border-green-600 bg-green-600 text-white' : active ? 'border-accent-700 bg-accent-700 text-white' : 'border-slate-300 bg-white text-slate-500'
              }`}
              aria-current={active ? 'step' : undefined}
            >
              {isDone ? <Check className="h-4 w-4" aria-label="done" /> : i + 1}
            </span>
            <span className={active ? 'font-semibold text-slate-900' : 'text-slate-600'}>{s}</span>
            {i < steps.length - 1 && <span className="mx-1 h-px w-6 bg-slate-300" aria-hidden />}
          </li>
        )
      })}
    </ol>
  )
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div>
      {label && (
        <div className="mb-1 flex justify-between text-xs text-slate-600">
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-accent-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
