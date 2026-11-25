// Pure validation functions, one per field rule. Each returns null when the value passes,
// otherwise the full RED requirement text to display. Base (BLACK/GREEN) texts live in REQ.
// Strings are copied from "CSIT 416 - PhishGuard Use Cases.docx"; do not paraphrase.

import { endOfDay, parseDateInput } from './dates'

export type Result = string | null

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/
const DOMAIN_RE = /^(?=.{4,253}$)([A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/

export const isEmail = (v: string) => EMAIL_RE.test(v.trim())
export const emailDomain = (v: string) => v.trim().split('@')[1]?.toLowerCase() ?? ''
export const isDomain = (v: string) => DOMAIN_RE.test(v)
const append = (base: string, suffix: string) => `${base} ${suffix}`

export const REQ = {
  // UC1 / UC2
  username: 'Enter a username between 2 to 20 characters long. Only enter alphanumeric characters with the exception of: - _',
  regEmail: 'Enter your organizational email address. Only email addresses from approved organization domains are accepted.',
  password: (min: number) => `Enter a password between ${min} to 50 characters long. Spaces are not allowed`,
  confirm: 'Re-enter your password. Both entries must match.',
  // ASSUMPTION: UC2 gives no base text for the recovery email field.
  recoverEmail: 'Enter your organizational email address.',
  // UC5
  auditRange: 'Select a date range of up to 90 days. The end date can NOT be the future.',
  // UC6
  comment: 'Comments must be between 1 to 1,000 characters.',
  // UC8
  moduleTitle: 'Enter a module title between 5-100 characters',
  moduleDesc: 'Enter a description between 20-500 characters',
  // ASSUMPTION: UC8 gives no base text for the content field.
  moduleContent: 'Add at least one training section. Each section needs a heading and content.',
  // UC15
  sender: 'Enter the sender’s email address',
  subject: 'Enter the email subject line (maximum 100 characters)',
  emailContent: 'Paste the full email header and body (50-1,500 characters)',
  // UC16 / UC17
  link: 'Paste the complete link here',
  file: 'Select a file up to 25 MB (ZIP files are accepted)',
  // UC18
  purgeCriteria: 'Enter one of the following: sender address, domain, subject keyword, or date range',
  purgeSelect: 'Select at least 1 email',
  purgeReason: 'Enter a reason for the purge (must be between 20-150 characters)',
  purgeConfirm: 'Type PURGE in all caps to confirm',
  // UC19
  classification: 'Select a classification for this report',
  classNotes: 'Optional: Enter notes (maximum 300 characters)',
  // UC20
  domain: 'Enter the domain name in the format ‘examplesite.com’',
  blockReason: 'Enter a reason for blocking this domain (50–150 characters)',
  // UC21
  testName: 'Enter a unique test name (3–60 characters)',
  template: 'Select a template',
  testSubject: 'Enter a subject line (1–150 characters)',
  groups: 'Select at least one user group',
  sendTime: 'Enter a date and time within the next 90 days',
  // UC29
  phone: 'Enter the phone number associated with the suspicious incident',
  // ASSUMPTION: UC29 gives no base text for type or date/time.
  incidentType: 'Select the type of incident',
  incidentDate: 'Enter the date and time the incident occurred',
  incidentDesc: 'Describe the suspicious incident using between 20 and 1500 characters.',
  // UC30 / UC34 / UC35
  reviewNotes: 'Enter your findings using between 20 and 1500 characters.',
  // UC31
  verifyEmail: 'Enter the sender’s full email address.',
}

// ---------- UC1 Register / UC2 Reset ----------
export function username(v: string, taken: string[]): Result {
  const s: string[] = []
  if (v.length > 20) s.push('TOO LONG')
  if (v.length < 2) s.push('TOO SHORT')
  if (/[^A-Za-z0-9_-]/.test(v)) s.push('INVALID CHARACTERS')
  if (taken.some((t) => t.toLowerCase() === v.toLowerCase())) s.push('ALREADY IN USE')
  return s.length ? append(REQ.username, s.join(' ')) : null
}

export function registrationEmail(v: string, taken: string[], approved: string[]): Result {
  if (!isEmail(v)) return append(REQ.regEmail, 'INVALID EMAIL FORMAT')
  if (taken.some((t) => t.toLowerCase() === v.trim().toLowerCase()))
    return append(REQ.regEmail, 'This email is already in use')
  if (!approved.includes(emailDomain(v)))
    return append(REQ.regEmail, 'This email is not approved. Use your organizational email address.')
  return null
}

export function password(v: string, min: number): Result {
  const s: string[] = []
  if (v.length < min) s.push('TOO SHORT')
  if (v.length > 50) s.push('TOO LONG')
  if (/\s/.test(v)) s.push('SPACES NOT ALLOWED')
  return s.length ? append(REQ.password(min), s.join(' ')) : null
}

export const confirmPassword = (v: string, pw: string): Result =>
  v.length > 0 && v === pw ? null : append(REQ.confirm, 'PASSWORDS DO NOT MATCH')

export const recoverEmail = (v: string): Result => (isEmail(v) ? null : append(REQ.recoverEmail, 'INVALID EMAIL FORMAT'))

// ---------- UC4 Security Policies ----------
export function wholeInRange(v: string, min: number, max: number): Result {
  const n = Number(v)
  if (v.trim() === '' || !Number.isInteger(n) || n < min || n > max) return `Enter a value between ${min} and ${max}.`
  return null
}
// ASSUMPTION: UC4 lists the domain checks but gives no message text for them.
export function approvedDomain(v: string, list: string[]): Result {
  const d = v.trim().toLowerCase()
  if (!isDomain(d)) return 'Invalid domain format.'
  if (list.includes(d)) return 'This domain is already on the list.'
  return null
}

// ---------- UC5 Audit log filters ----------
export function auditDateRange(start: string, end: string): Result {
  const s = parseDateInput(start)
  const e = parseDateInput(end)
  if (!s || !e) return null // empty range means "no date filter"
  if (s > e) return 'START DATE MUST BE ON OR BEFORE END DATE.'
  if (e > endOfDay(new Date())) return 'END DATE CANNOT BE IN THE FUTURE.'
  if ((e.getTime() - s.getTime()) / 86_400_000 > 90) return 'DATE RANGE CANNOT EXCEED 90 DAYS.'
  return null
}
export const auditUsername = (v: string): Result =>
  v === '' || (/^[A-Za-z0-9_-]+$/.test(v) && v.length >= 2 && v.length <= 25) ? null : 'INVALID USERNAME.'

// ---------- UC6 Comments ----------
// Tiny mock list for the profanity check (prototype only).
export const BLACKLIST = ['darn', 'heck', 'crud', 'dang']
export function comment(v: string): Result {
  if (v.trim().length === 0 || v.length > 1000) return 'Please write between 2 to 1,000 characters'
  const words = v.toLowerCase().split(/[^a-z]+/)
  if (words.some((w) => BLACKLIST.includes(w))) return 'Submission of blacklisted words is not allowed.'
  return null
}

// ---------- UC8 Create module ----------
export function moduleTitle(v: string): Result {
  if (v.trim() === '') return 'Module Title Required'
  if (v.trim().length < 5) return 'Title Must Contain at Least 5 Characters'
  if (v.length > 100) return 'Title Cannot Exceed 100 Characters'
  return null
}
export function moduleDescription(v: string): Result {
  if (v.trim() === '') return 'Module Description Required'
  if (v.trim().length < 20) return 'Description Must Contain at Least 20 Characters'
  if (v.length > 500) return 'Description Cannot Exceed 500 Characters'
  return null
}
export function moduleContent(sections: { heading: string; body: string }[]): Result {
  if (sections.length === 0) return 'At Least One Training Section Is Required'
  if (sections.every((s) => !s.heading.trim() && !s.body.trim())) return 'Training Content Required'
  if (sections.some((s) => !s.heading.trim() || !s.body.trim())) return 'Please Complete All Required Content Fields'
  return null
}

// ---------- UC9 / UC10 / UC22 / UC23 Deadlines ----------
export function futureDeadline(v: string, required: boolean, emptyMsg = 'Completion Deadline Required'): Result {
  if (!v) return required ? emptyMsg : null
  const d = parseDateInput(v)
  if (!d) return 'Invalid Date Format'
  if (endOfDay(d).getTime() <= Date.now() || d < new Date(new Date().toDateString())) return 'Invalid Deadline. Please Select a Future Date'
  return null
}

// ---------- UC11 Question bank ----------
export function questionText(v: string): Result {
  if (v.trim() === '') return 'Question Required'
  if (v.trim().length < 10) return 'Question Too Short'
  return null
}
// ASSUMPTION: UC11 gives no message for the 2 to 6 answer choices rule.
export const answerChoices = (choices: string[]): Result => {
  const filled = choices.filter((c) => c.trim())
  return filled.length < 2 || filled.length > 6 || filled.length !== choices.length
    ? 'Enter between 2 and 6 answer choices'
    : null
}
export const correctAnswer = (i: number | null, n: number): Result => (i === null || i < 0 || i >= n ? 'Select Correct Answer' : null)

// ---------- UC15 Report suspicious email ----------
export const senderEmail = (v: string): Result => (isEmail(v) ? null : 'Invalid email format. Please enter a valid email address.')
export function subjectLine(v: string): Result {
  if (v.length === 0) return 'This field is required.'
  if (v.length > 100) return 'The subject line must not exceed 100 characters.'
  return null
}
export const emailContent = (v: string): Result =>
  v.length < 50 || v.length > 1500 ? 'The header and body must be between 50 and 1,500 characters.' : null

// ---------- UC16 Scan link ----------
export function link(v: string): Result {
  const t = v.trim()
  if (!/^https?:\/\//i.test(t)) return 'Invalid URL format. The link must begin with http:// or https://.'
  if (t.length > 1000) return 'The link exceeds the 1,000-character limit.'
  try {
    const u = new URL(t)
    if (!u.hostname.includes('.') && !/^\d+\.\d+\.\d+\.\d+$/.test(u.hostname)) throw new Error()
    if (/\s/.test(t) || t.length < 10) throw new Error()
  } catch {
    return 'The link is not a valid URL. Please check it and try again.'
  }
  return null
}

// ---------- UC17 Scan attachment ----------
export const SUPPORTED_EXT = ['.exe', '.zip', '.bat', '.js', '.html', '.docx', '.pdf']
export function attachment(f: { name: string; size: number } | null): Result {
  if (!f || f.size === 0) return 'Please select a file to continue.'
  if (f.size > 25 * 1024 * 1024) return 'The file exceeds the 25 MB limit.'
  const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase()
  if (!SUPPORTED_EXT.includes(ext)) return append(REQ.file, 'Unsupported file type. Please select a supported format.')
  return null
}

// ---------- UC18 Purge ----------
export function purgeCriteria(c: { sender: string; domain: string; keyword: string; start: string; end: string }): Result {
  if (!c.sender.trim() && !c.domain.trim() && !c.keyword.trim() && !c.start && !c.end) return 'Enter at least one search criterion'
  const s = parseDateInput(c.start)
  const e = parseDateInput(c.end)
  if (s && e && s > e) return 'The start date must be before the end date'
  return null
}
export function purgeReason(v: string): Result {
  if (v.trim().length < 20) return 'The reason must be at least 20 characters'
  if (v.length > 150) return 'The reason must not exceed 150 characters'
  return null
}

// ---------- UC19 Classify ----------
export const classificationNotes = (v: string): Result => (v.length > 300 ? 'Notes must not exceed 300 characters.' : null)

// ---------- UC20 Blocklist ----------
export function blockDomain(v: string, list: string[]): Result {
  const d = v.trim().toLowerCase()
  if (/^[a-z]+:\/\//i.test(v.trim())) return 'Remove any protocol prefix (such as http://) from the domain.'
  if (d.length < 4) return 'The domain must be at least 4 characters.'
  if (d.length > 253) return 'The domain must not exceed 253 characters.'
  if (/\s/.test(v) || !isDomain(d)) return 'Invalid domain format. Please try again.'
  if (list.includes(d)) return 'This domain is already on the blocklist.'
  return null
}
export function blockReason(v: string): Result {
  if (v.trim().length < 50) return 'The reason must be at least 50 characters'
  if (v.length > 150) return 'The reason must not exceed 150 characters'
  return null
}

// ---------- UC21 Phishing test ----------
export function testName(v: string, taken: string[]): Result {
  if (v.trim().length < 3) return 'The test name must be at least 3 characters.'
  if (v.length > 60) return 'The test name must not exceed 60 characters.'
  if (taken.some((t) => t.toLowerCase() === v.trim().toLowerCase())) return 'This test name is already in use.'
  return null
}
export function testSubject(v: string): Result {
  if (v.trim().length === 0) return 'A subject line is required.'
  if (v.length > 150) return 'The subject line must not exceed 150 characters.'
  return null
}
export function sendTime(v: string): Result {
  const d = new Date(v)
  if (!v || isNaN(d.getTime()) || d.getTime() <= Date.now()) return 'The date and time must be in the future.'
  if (d.getTime() > Date.now() + 90 * 86_400_000) return 'The date and time must be within the next 90 days.'
  return null
}

// ---------- UC29 Phone/Text ----------
export const phoneDigits = (v: string) => v.replace(/[\s().+-]/g, '').replace(/^1(?=\d{10}$)/, '')
export function phone(v: string, unknown: boolean): Result {
  if (unknown) return null
  const d = phoneDigits(v)
  return /^\d{10}$/.test(d) ? null : 'Invalid Phone Number. Please enter a valid 10-digit phone number.'
}
export function incidentDateTime(v: string): Result {
  if (!v) return 'Date and time are required.' // ASSUMPTION: no doc text for empty date/time
  const d = new Date(v)
  if (isNaN(d.getTime())) return 'Date and time are required.'
  if (d.getTime() > Date.now()) return 'Invalid Date or Time. Incident date cannot be in the future.'
  return null
}
export function incidentDescription(v: string): Result {
  if (v.trim().length < 20) return 'Description Too Short Please enter at least 20 characters.'
  if (v.length > 1500) return 'Description Too Long. Maximum 1500 characters allowed.'
  return null
}

// ---------- UC30 / UC34 / UC35 review notes ----------
export function reviewNotesUC30(v: string): Result {
  if (v.trim().length < 20) return 'Review Notes Too Short. Please enter at least 20 characters.'
  if (v.length > 1500) return 'Review Notes Too Long. Maximum 1500 characters allowed.'
  return null
}
export function reviewNotesUC34(v: string): Result {
  if (v.trim().length < 20) return 'Review Notes Too Short. Please Enter at Least 20 Characters.'
  if (v.length > 1500) return 'Review Notes Too Long. Maximum 1500 Characters Allowed.'
  return null
}
export const reportIdSearch = (v: string): Result => (/^\d{8}$/.test(v.trim()) ? null : 'Invalid Report ID. Please enter an 8-digit Report ID.')

export function activityDateRange(start: string, end: string): Result {
  const s = parseDateInput(start)
  const e = parseDateInput(end)
  if ((s && s > endOfDay(new Date())) || (e && e > endOfDay(new Date()))) return 'Invalid Date. Activity Date Cannot Be in the Future.'
  if (s && e && s > e) return 'Invalid Date Range. Start Date Cannot Be After End Date.'
  return null
}

// ---------- UC31 Verify sender ----------
export function verifyEmail(v: string): Result {
  if (v.length === 0) return 'Email address Required. Please enter a sender\'s email address.'
  if (/\s/.test(v)) return 'Email Address Cannot Contain Spaces.'
  if (v.length > 254) return 'Email Address Too Long. Maximum 254 characters allowed.'
  if (!isEmail(v)) return 'Invalid Email Format. Please enter a valid email address.'
  return null
}

// ---------- Generic (UC25 to UC28) ----------
export function lengthBetween(label: string, v: string, min: number, max: number): Result {
  if (v.trim().length < min || v.length > max) return `${label} must be between ${min.toLocaleString()} and ${max.toLocaleString()} characters.`
  return null
}
export function optionalUrl(v: string): Result {
  if (!v.trim()) return null
  try {
    const u = new URL(v.trim())
    if (!/^https?:$/.test(u.protocol)) throw new Error()
    return null
  } catch {
    return 'Enter a valid URL starting with http:// or https://.'
  }
}
