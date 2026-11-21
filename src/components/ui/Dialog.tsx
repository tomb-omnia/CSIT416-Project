// Dialog primitives built on the native <dialog> element: showModal() makes the rest of the
// page inert (focus stays inside) and Escape closes it.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { Button } from './Button'

export function Dialog({ open, onClose, title, children, footer, wide, tone }: { open: boolean; onClose: () => void; title: ReactNode; children?: ReactNode; footer?: ReactNode; wide?: boolean; tone?: 'error' | 'success' | 'warning' | 'info' }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  const Icon = tone === 'error' ? XCircle : tone === 'success' ? CheckCircle2 : tone === 'warning' ? AlertTriangle : tone === 'info' ? Info : null
  const toneCls = tone === 'error' ? 'text-red-700' : tone === 'success' ? 'text-green-700' : tone === 'warning' ? 'text-yellow-700' : 'text-accent-700'
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      className={`w-[calc(100%-2rem)] rounded-lg border border-slate-200 bg-white p-0 text-slate-800 shadow-xl ${wide ? 'max-w-3xl' : 'max-w-lg'}`}
      aria-labelledby="dialog-title"
    >
      {open && (
        <div>
          <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
            {Icon && <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${toneCls}`} aria-hidden />}
            <h2 id="dialog-title" className={`text-lg font-semibold ${tone === 'error' ? 'text-red-700' : 'text-slate-900'}`}>
              {title}
            </h2>
          </div>
          {children && <div className="max-h-[65vh] overflow-y-auto px-5 py-4">{children}</div>}
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">{footer ?? <Button onClick={onClose}>OK</Button>}</div>
        </div>
      )}
    </dialog>
  )
}

/** Simple message dialog with a single OK button. */
export function MessageDialog({ open, onClose, title, message, tone = 'info', okLabel = 'OK' }: { open: boolean; onClose: () => void; title: string; message?: ReactNode; tone?: 'error' | 'success' | 'warning' | 'info'; okLabel?: string }) {
  return (
    <Dialog open={open} onClose={onClose} title={title} tone={tone} footer={<Button onClick={onClose}>{okLabel}</Button>}>
      {message}
    </Dialog>
  )
}

/** CLAUDE.md 5.2: lists failing requirements in RED. */
export function ValidationSummaryDialog({ items, onClose, title = 'Please correct the following' }: { items: string[] | null; onClose: () => void; title?: string }) {
  return (
    <Dialog open={!!items} onClose={onClose} title={title} tone="error">
      <ul className="space-y-2">
        {items?.map((t) => (
          <li key={t} className="flex gap-2 text-red-700">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> <span>{t}</span>
          </li>
        ))}
      </ul>
    </Dialog>
  )
}

/** CLAUDE.md 5.3 ConfirmDialog. Cancel keeps all entered data (the caller just closes it). */
export function ConfirmDialog({ open, onConfirm, onCancel, title = 'Please confirm', message, confirmLabel = 'YES', cancelLabel = 'NO', danger, children, busy }: { open: boolean; onConfirm: () => void; onCancel: () => void; title?: string; message: ReactNode; confirmLabel?: string; cancelLabel?: string; danger?: boolean; children?: ReactNode; busy?: boolean }) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      tone={danger ? 'warning' : 'info'}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-[15px]">{message}</div>
      {children}
    </Dialog>
  )
}

/** UC18: type PURGE in all caps to enable Confirm. */
export function TypeToConfirmDialog({ open, word, onConfirm, onCancel, message, busy, title = 'Confirm purge' }: { open: boolean; word: string; onConfirm: () => void; onCancel: () => void; message: ReactNode; busy?: boolean; title?: string }) {
  const [v, setV] = useState('')
  const [touched, setTouched] = useState(false)
  const close = () => {
    setV('')
    setTouched(false)
    onCancel()
  }
  const match = v === word
  const submit = () => {
    if (match && !busy) onConfirm()
  }
  return (
    <Dialog
      open={open}
      onClose={close}
      title={title}
      tone="warning"
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={submit} disabled={!match} loading={busy}>
            Confirm
          </Button>
        </>
      }
    >
      <div className="mb-4">{message}</div>
      <label htmlFor="type-confirm" className="block text-sm font-medium">
        Confirmation
      </label>
      <input
        id="type-confirm"
        autoFocus
        value={v}
        disabled={busy}
        onChange={(e) => {
          setV(e.target.value)
          setTouched(true)
        }}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        className={`mt-1 block w-full rounded-md border px-3 py-2 font-mono ${touched && !match ? 'border-red-600' : match ? 'border-green-600' : 'border-slate-300'}`}
      />
      <p className={`mt-1.5 text-sm ${touched && !match ? 'text-red-700' : match ? 'text-green-700' : 'text-slate-900'}`}>
        {touched && !match ? 'The confirmation text does not match. Type PURGE to continue.' : 'Type PURGE in all caps to confirm'}
      </p>
    </Dialog>
  )
}

/** UC3: re-enter the admin password. Prototype accepts any non-empty value except the literal "wrong". */
export function CredentialConfirmDialog({ open, onConfirm, onCancel, message, busy }: { open: boolean; onConfirm: () => void; onCancel: () => void; message: ReactNode; busy?: boolean }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const close = () => {
    setPw('')
    setErr(null)
    onCancel()
  }
  const submit = () => {
    if (!pw) return setErr('Password is required.')
    if (pw === 'wrong') return setErr('Incorrect password. Please try again.')
    setPw('')
    setErr(null)
    onConfirm()
  }
  return (
    <Dialog
      open={open}
      onClose={close}
      title="Confirm your credentials"
      tone="warning"
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy}>
            Save
          </Button>
        </>
      }
    >
      <div className="mb-4">{message}</div>
      <label htmlFor="cred-pw" className="block text-sm font-medium">
        Your administrator password
      </label>
      <input
        id="cred-pw"
        type="password"
        autoFocus
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        className={`mt-1 block w-full rounded-md border px-3 py-2 ${err ? 'border-red-600' : 'border-slate-300'}`}
      />
      {err ? <p className="mt-1.5 text-sm text-red-700">{err}</p> : <p className="mt-1.5 text-xs text-slate-500">Prototype: any password works except "wrong".</p>}
    </Dialog>
  )
}
