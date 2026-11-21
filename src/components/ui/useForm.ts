// Form state shared by every validated form (CLAUDE.md 5.1 and 5.2).
// Components compute an `errors` object each render from pure validators, then:
//   - form.status(name, err) gives BLACK/GREEN/RED for the requirement message
//   - form.submit(errors, labels) rejects with a ValidationSummaryDialog when anything fails,
//     and on dismiss outlines failing fields (they are touched) and focuses the first one.

import { useCallback, useState } from 'react'

export type FieldStatus = 'neutral' | 'ok' | 'error'
export type Errors = Record<string, string | null | undefined>

export function useForm<T extends Record<string, unknown>>(initial: T) {
  const [values, setValues] = useState<T>(initial)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [summary, setSummary] = useState<{ items: string[]; focusId: string } | null>(null)

  const set = useCallback(<K extends keyof T>(name: K, v: T[K]) => {
    setValues((p) => ({ ...p, [name]: v }))
    setTouched((p) => (p[name as string] ? p : { ...p, [name as string]: true }))
  }, [])

  const touch = useCallback((name: string) => setTouched((p) => (p[name] ? p : { ...p, [name]: true })), [])

  const status = (name: string, err: string | null | undefined): FieldStatus => (!touched[name] ? 'neutral' : err ? 'error' : 'ok')

  /** Returns true when there are no errors. Otherwise opens the summary dialog. */
  const submit = (errors: Errors, labels: Record<string, string> = {}): boolean => {
    const failing = Object.entries(errors).filter(([, e]) => !!e)
    const all: Record<string, boolean> = {}
    Object.keys(errors).forEach((k) => (all[k] = true))
    setTouched((p) => ({ ...p, ...all }))
    if (failing.length === 0) return true
    setSummary({
      items: failing.map(([k, e]) => (labels[k] ? `${labels[k]}: ${e}` : (e as string))),
      focusId: `f-${failing[0][0]}`,
    })
    return false
  }

  const closeSummary = () => {
    const id = summary?.focusId
    setSummary(null)
    if (id) setTimeout(() => document.getElementById(id)?.focus(), 30)
  }

  const reset = (v: T = initial) => {
    setValues(v)
    setTouched({})
  }

  return { values, setValues, set, touch, touched, status, submit, summary, closeSummary, reset }
}

export type Form<T extends Record<string, unknown>> = ReturnType<typeof useForm<T>>
