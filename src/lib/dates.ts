const DAY = 86_400_000

export const daysAgo = (d: number, h = 0) => new Date(Date.now() - d * DAY - h * 3_600_000).toISOString()
export const daysAhead = (d: number) => new Date(Date.now() + d * DAY).toISOString()
export const nowIso = () => new Date().toISOString()

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
export function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
/** yyyy-mm-dd for <input type="date"> in local time. */
export function toDateInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
export function toDateTimeInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${toDateInput(d)}T${p(d.getHours())}:${p(d.getMinutes())}`
}
/** Parse a yyyy-mm-dd value as local midnight. */
export function parseDateInput(v: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null
  const d = new Date(`${v}T00:00:00`)
  return isNaN(d.getTime()) ? null : d
}
export function endOfDay(d: Date) {
  const e = new Date(d)
  e.setHours(23, 59, 59, 999)
  return e
}
export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY)
export const isPastDeadline = (iso: string | null) => !!iso && new Date(iso).getTime() < Date.now()
