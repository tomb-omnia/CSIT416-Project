// <RequirementField> family: inputs with a requirement message directly below (CLAUDE.md 5.1).
// BLACK = untouched, GREEN = all checks pass, RED = a check fails (shown with an icon, never color alone).

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { CheckCircle2, Circle, XCircle } from 'lucide-react'
import type { FieldStatus } from './useForm'

export function RequirementMessage({ status, base, error, id }: { status: FieldStatus; base: string; error?: string | null; id?: string }) {
  const text = status === 'error' && error ? error : base
  if (!text) return null
  const tone = status === 'error' ? 'text-red-700' : status === 'ok' ? 'text-green-700' : 'text-slate-900'
  const Icon = status === 'error' ? XCircle : status === 'ok' ? CheckCircle2 : Circle
  return (
    <p id={id} className={`mt-1.5 flex items-start gap-1.5 text-sm ${tone}`} aria-live="polite">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>
        <span className="sr-only">{status === 'error' ? 'Requirement not met: ' : status === 'ok' ? 'Requirement met: ' : 'Requirement: '}</span>
        {text}
      </span>
    </p>
  )
}

const inputCls = (status: FieldStatus) =>
  `block w-full rounded-md border bg-white px-3 py-2 text-[15px] shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:bg-slate-100 ${
    status === 'error' ? 'border-red-600 ring-red-200 focus:ring-red-300' : status === 'ok' ? 'border-green-600 focus:ring-green-200' : 'border-slate-300 focus:border-accent-500 focus:ring-accent-200'
  }`

interface Common {
  name: string
  label: ReactNode
  status: FieldStatus
  base?: string
  error?: string | null
  hint?: ReactNode
  counter?: { value: number; max: number }
}

function Wrapper({ name, label, status, base = '', error, hint, counter, children }: Common & { children: ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label htmlFor={`f-${name}`} className="block text-sm font-medium text-slate-800">
          {label}
        </label>
        {counter && (
          <span className={`text-xs ${counter.value > counter.max ? 'text-red-700' : 'text-slate-500'}`}>
            {counter.value.toLocaleString()} / {counter.max.toLocaleString()}
          </span>
        )}
      </div>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      <RequirementMessage id={`m-${name}`} status={status} base={base} error={error} />
    </div>
  )
}

export function TextField({ name, label, status, base, error, hint, counter, className = '', ...input }: Common & Omit<InputHTMLAttributes<HTMLInputElement>, 'name'>) {
  return (
    <Wrapper {...{ name, label, status, base, error, hint, counter }}>
      <input id={`f-${name}`} name={name} aria-invalid={status === 'error'} aria-describedby={`m-${name}`} className={`${inputCls(status)} ${className}`} {...input} />
    </Wrapper>
  )
}

export function TextArea({ name, label, status, base, error, hint, counter, className = '', ...input }: Common & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'name'>) {
  return (
    <Wrapper {...{ name, label, status, base, error, hint, counter }}>
      <textarea id={`f-${name}`} name={name} rows={5} aria-invalid={status === 'error'} aria-describedby={`m-${name}`} className={`${inputCls(status)} ${className}`} {...input} />
    </Wrapper>
  )
}

export function SelectField({ name, label, status, base, error, hint, children, ...input }: Common & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'name'>) {
  return (
    <Wrapper {...{ name, label, status, base, error, hint }}>
      <select id={`f-${name}`} name={name} aria-invalid={status === 'error'} aria-describedby={`m-${name}`} className={inputCls(status)} {...input}>
        {children}
      </select>
    </Wrapper>
  )
}

/** Wrapper for custom controls (radio groups, checkbox lists, editors). The control should use id `f-${name}` on its first focusable element. */
export function FieldGroup({ name, label, status, base, error, hint, children }: Common & { children: ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-1 text-sm font-medium text-slate-800" id={`l-${name}`}>
        {label}
      </div>
      <div className={`rounded-md ${status === 'error' ? 'ring-2 ring-red-600 ring-offset-2' : ''}`}>{children}</div>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      <RequirementMessage id={`m-${name}`} status={status} base={base ?? ''} error={error} />
    </div>
  )
}

/** Plain input for filters and search bars (no requirement message). */
export function PlainInput(props: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  const { invalid, className = '', ...rest } = props
  return <input {...rest} className={`${inputCls(invalid ? 'error' : 'neutral')} ${className}`} />
}
export function PlainSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = '', ...rest } = props
  return <select {...rest} className={`${inputCls('neutral')} ${className}`} />
}
