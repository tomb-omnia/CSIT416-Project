// <StatusBadge>: GREEN = good/success, RED = failure/high risk, YELLOW = attention/moderate,
// neutral and accent for workflow states (CLAUDE.md 5.5). Text is always shown, so color is never the only signal.

import type { Severity } from '../../store/types'

type Tone = 'green' | 'red' | 'yellow' | 'neutral' | 'accent'
const toneCls: Record<Tone, string> = {
  green: 'bg-green-50 text-green-800 ring-green-600/30',
  red: 'bg-red-50 text-red-800 ring-red-600/30',
  yellow: 'bg-yellow-50 text-yellow-900 ring-yellow-600/40',
  neutral: 'bg-slate-100 text-slate-700 ring-slate-400/30',
  accent: 'bg-accent-50 text-accent-800 ring-accent-500/30',
}
const dotCls: Record<Tone, string> = { green: 'bg-green-600', red: 'bg-red-600', yellow: 'bg-yellow-500', neutral: 'bg-slate-400', accent: 'bg-accent-600' }

const MAP: Record<string, Tone> = {
  'Pending Review': 'neutral',
  'Under Review': 'accent',
  Resolved: 'green',
  'Resolved, email has been purged': 'green',
  'Classified - Phishing': 'red',
  'Classified - Spam': 'yellow',
  'Classified - Legitimate': 'green',
  Scheduled: 'accent',
  Sent: 'green',
  Draft: 'neutral',
  Published: 'green',
  'Awaiting Revision': 'yellow',
  Rejected: 'red',
  'Not Started': 'neutral',
  'In Progress': 'accent',
  Completed: 'green',
  Issued: 'green',
  Active: 'green',
  Locked: 'yellow',
  Deactivated: 'red',
  'Flagged for Investigation': 'red',
  'Action Required': 'yellow',
  'Not Reviewed': 'neutral',
  Open: 'accent',
  Contained: 'yellow',
  Closed: 'green',
  Success: 'green',
  Failure: 'red',
  Safe: 'green',
  Malicious: 'red',
  Suspicious: 'yellow',
  Clean: 'green',
  'Password-protected': 'yellow',
  Expired: 'neutral',
  Retired: 'neutral',
  Overdue: 'red',
  Inactive: 'red',
}

export function StatusBadge({ status, tone }: { status: string; tone?: Tone }) {
  const t = tone ?? MAP[status] ?? 'neutral'
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${toneCls[t]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotCls[t]}`} aria-hidden />
      {status}
    </span>
  )
}

const sevCls: Record<Severity, string> = {
  Low: 'bg-slate-100 text-slate-700 ring-slate-400/40',
  Medium: 'bg-yellow-50 text-yellow-900 ring-yellow-600/40',
  High: 'bg-red-50 text-red-800 ring-red-600/40',
  Critical: 'bg-red-700 text-white ring-red-800',
}
export function SeverityChip({ severity }: { severity: Severity }) {
  return <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset ${sevCls[severity]}`}>{severity}</span>
}
