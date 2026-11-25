// DemoStore: one React context holding all mock data, the mock session, Demo Controls flags,
// and toasts. Feature code changes data with mutate(draft => { ... }) which works on a clone.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createSeed, DEMO_ACCOUNTS } from './seed'
import type { DemoFlags, DemoState, Role, User } from './types'
import { uid } from '../lib/ids'
import { nowIso } from '../lib/dates'

const STORAGE_KEY = 'phishguard-demo-v1'
const FLAGS_KEY = 'phishguard-demo-flags-v1'

export type ServiceOp = 'scan' | 'verify' | 'purge' | 'email'
export type SimOp = ServiceOp | 'save' | 'notify'
export type SimOutcome = 'ok' | 'unavailable' | 'failed' | 'partial'

export interface Toast {
  id: string
  text: string
  tone: 'success' | 'error' | 'info'
}

interface Ctx {
  state: DemoState
  mutate: (fn: (draft: DemoState) => void) => void
  me: User | null
  login: (username: string) => void
  logout: () => void
  switchRole: (role: Role) => void
  flags: DemoFlags
  setFlags: (f: Partial<DemoFlags>) => void
  resetDemo: () => void
  simulate: (op: SimOp, opts?: { onSlow?: () => void; slowAfterMs?: number }) => Promise<SimOutcome>
  toasts: Toast[]
  toast: (text: string, tone?: Toast['tone']) => void
  dismissToast: (id: string) => void
}

const DemoContext = createContext<Ctx | null>(null)

const defaultFlags: DemoFlags = {
  slow: false,
  unavailable: { scan: false, verify: false, purge: false, email: false, forms: false },
  saveFailure: false,
  notifyFailure: false,
  purgePartial: false,
  persist: false,
}

function loadFlags(): DemoFlags {
  try {
    const raw = localStorage.getItem(FLAGS_KEY)
    if (raw) return { ...defaultFlags, ...JSON.parse(raw), saveFailure: false, notifyFailure: false }
  } catch {
    /* ignore */
  }
  return defaultFlags
}

function loadState(persist: boolean): DemoState {
  if (persist) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return JSON.parse(raw) as DemoState
    } catch {
      /* ignore */
    }
  }
  return createSeed()
}

// ---- Draft helpers (call inside mutate) ----
export function pushAudit(
  s: DemoState,
  actor: User | null,
  eventType: string,
  target: string,
  extra: { oldValue?: string; newValue?: string; result?: 'Success' | 'Failure' } = {},
) {
  s.audit.unshift({
    id: `AUD-${Math.floor(6000 + Math.random() * 90000)}`,
    time: nowIso(),
    eventType,
    actor: actor?.username ?? 'system',
    actorRole: actor?.role ?? 'general',
    ip: '10.0.4.27',
    target,
    result: extra.result ?? 'Success',
    oldValue: extra.oldValue,
    newValue: extra.newValue,
    flagged: false,
  })
}

export function pushNotification(s: DemoState, to: string | string[], text: string, link?: string) {
  const list = Array.isArray(to) ? to : [to]
  for (const t of list) s.notifications.unshift({ id: uid('N'), to: t, text, at: nowIso(), read: false, link })
}

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [flags, setFlagsState] = useState<DemoFlags>(loadFlags)
  const [state, setState] = useState<DemoState>(() => loadState(flags.persist))
  const [session, setSession] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('phishguard-session')
    } catch {
      return null
    }
  })
  const [toasts, setToasts] = useState<Toast[]>([])
  const flagsRef = useRef(flags)
  flagsRef.current = flags

  useEffect(() => {
    try {
      localStorage.setItem(FLAGS_KEY, JSON.stringify(flags))
      if (flags.persist) localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* storage may be unavailable; the demo still works in memory */
    }
  }, [state, flags])

  useEffect(() => {
    try {
      if (session) sessionStorage.setItem('phishguard-session', session)
      else sessionStorage.removeItem('phishguard-session')
    } catch {
      /* ignore */
    }
  }, [session])

  const mutate = useCallback((fn: (d: DemoState) => void) => {
    setState((prev) => {
      const next = structuredClone(prev)
      fn(next)
      return next
    })
  }, [])

  const setFlags = useCallback((f: Partial<DemoFlags>) => setFlagsState((p) => ({ ...p, ...f })), [])

  const toast = useCallback((text: string, tone: Toast['tone'] = 'success') => {
    const id = uid('t')
    setToasts((t) => [...t, { id, text, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000)
  }, [])
  const dismissToast = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  /** The single place feature code reads Demo Controls flags (CLAUDE.md Section 11). */
  const simulate = useCallback(async (op: SimOp, opts: { onSlow?: () => void; slowAfterMs?: number } = {}): Promise<SimOutcome> => {
    const f = flagsRef.current
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
    if (op === 'save') {
      await wait(350)
      if (f.saveFailure) {
        setFlagsState((p) => ({ ...p, saveFailure: false }))
        return 'failed'
      }
      return 'ok'
    }
    if (op === 'notify') {
      if (f.notifyFailure) {
        setFlagsState((p) => ({ ...p, notifyFailure: false }))
        return 'failed'
      }
      return 'ok'
    }
    // Long-running service call. Normal: ~1.8 s. Slow service: shows the "longer" dialog then finishes.
    if (f.slow) {
      await wait(opts.slowAfterMs ?? 1500)
      opts.onSlow?.()
      await wait(3000)
    } else {
      await wait(1800)
    }
    if (f.unavailable[op]) return 'unavailable'
    if (op === 'purge' && f.purgePartial) return 'partial'
    return 'ok'
  }, [])

  const login = useCallback(
    (username: string) => {
      setSession(username)
      mutate((s) => {
        const u = s.users.find((x) => x.username === username)
        if (u) u.lastLogin = nowIso()
        s.activity.unshift({ id: `LOG-${Math.floor(30000 + Math.random() * 60000)}`, username, type: 'Login', time: nowIso(), status: 'Success', ip: '10.0.4.27' })
      })
    },
    [mutate],
  )
  const logout = useCallback(() => setSession(null), [])
  const switchRole = useCallback((role: Role) => setSession(DEMO_ACCOUNTS[role]), [])

  const resetDemo = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    setState(createSeed())
    toast('Demo data has been reset.', 'info')
  }, [toast])

  const me = useMemo(() => state.users.find((u) => u.username === session) ?? null, [state.users, session])

  const value = useMemo<Ctx>(
    () => ({ state, mutate, me, login, logout, switchRole, flags, setFlags, resetDemo, simulate, toasts, toast, dismissToast }),
    [state, mutate, me, login, logout, switchRole, flags, setFlags, resetDemo, simulate, toasts, toast, dismissToast],
  )
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}

export function useDemo() {
  const c = useContext(DemoContext)
  if (!c) throw new Error('useDemo must be used inside DemoStoreProvider')
  return c
}

/** Convenience: the logged-in user, asserted non-null (routes are guarded). */
export function useMe(): User {
  const { me } = useDemo()
  if (!me) throw new Error('Not logged in')
  return me
}
