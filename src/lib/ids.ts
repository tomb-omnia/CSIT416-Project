// ID helpers. Report IDs are 8-digit numeric strings (UC15, UC29, UC30).

export function reportId(existing: string[] = []): string {
  for (;;) {
    const id = String(10000000 + Math.floor(Math.random() * 90000000))
    if (!existing.includes(id)) return id
  }
}

function rand(n: number) {
  return Math.floor(Math.random() * 10 ** n)
    .toString()
    .padStart(n, '0')
}

export const moduleId = () => `MOD-${rand(4)}`
export const certId = () => `CERT-${rand(6)}`
export const caseId = () => `CASE-${rand(4)}`
export const questionId = () => `Q-${rand(4)}`
export const assignmentId = () => `ASG-${rand(5)}`
export const uid = (prefix = 'id') => `${prefix}-${Math.random().toString(36).slice(2, 10)}`
