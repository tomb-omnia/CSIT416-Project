import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from 'lucide-react'
import { useDemo } from '../../store/DemoStore'

type Tone = 'success' | 'error' | 'warning' | 'info'
const cls: Record<Tone, string> = {
  success: 'border-green-300 bg-green-50 text-green-800',
  error: 'border-red-300 bg-red-50 text-red-800',
  warning: 'border-yellow-300 bg-yellow-50 text-yellow-900',
  info: 'border-accent-200 bg-accent-50 text-accent-900',
}
const icons = { success: CheckCircle2, error: XCircle, warning: AlertTriangle, info: Info }

export function Banner({ tone = 'info', children, title, action, className = '' }: { tone?: Tone; children?: ReactNode; title?: ReactNode; action?: ReactNode; className?: string }) {
  const Icon = icons[tone]
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-md border px-4 py-3 ${cls[tone]} ${className}`}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div className="flex-1">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className="text-sm">{children}</div>}
      </div>
      {action}
    </div>
  )
}

export function Spinner({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-slate-700" role="status">
      <Loader2 className="h-5 w-5 animate-spin text-accent-700" aria-hidden /> {label}
    </div>
  )
}

export function Toasts() {
  const { toasts, dismissToast } = useDemo()
  return (
    <div className="pointer-events-none fixed right-4 top-16 z-50 flex w-96 max-w-[calc(100%-2rem)] flex-col gap-2" aria-live="polite">
      {toasts.map((t) => {
        const tone: Tone = t.tone === 'success' ? 'success' : t.tone === 'error' ? 'error' : 'info'
        const Icon = icons[tone]
        return (
          <div key={t.id} className={`pointer-events-auto flex items-start gap-3 rounded-md border px-4 py-3 shadow-lg ${cls[tone]}`}>
            <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <div className="flex-1 text-sm font-medium">{t.text}</div>
            <button onClick={() => dismissToast(t.id)} aria-label="Dismiss" className="rounded p-0.5 hover:bg-black/5">
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
