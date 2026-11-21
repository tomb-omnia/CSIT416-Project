// Deterministic mock rules standing in for real scanning, verification, and scoring.
// Nothing here contacts a network service (CLAUDE.md Section 2).

import type { BlockedDomain, VerifyResult } from './types'

export const SHORTENERS = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'rb.gy', 'cutt.ly']
/** Seeded lookalike fragments of legitimate brands / the organization. */
export const LOOKALIKES = ['paypa1', 'rnicrosoft', 'micros0ft', 'montclair-edu', 'montc1air', 'g00gle', 'app1e', 'arnazon', 'office365-login']
/** Domains that "do not exist" for UC31 5A1. */
export const NONEXISTENT_TLDS = ['.invalid', '.test', '.example', '.zz']
export const KNOWN_BAD_FILES = ['invoice_2024.zip', 'payroll_update.docx', 'urgent_wire.html', 'scan_0042.pdf']

const isBlocked = (host: string, blocklist: BlockedDomain[]) =>
  blocklist.some((b) => host === b.domain || host.endsWith('.' + b.domain))

export interface LinkVerdict {
  verdict: 'Safe' | 'Malicious'
  detail: string
}
export function scanLink(url: string, blocklist: BlockedDomain[]): LinkVerdict {
  let host = ''
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return { verdict: 'Malicious', detail: 'The link could not be parsed.' }
  }
  if (isBlocked(host, blocklist)) return { verdict: 'Malicious', detail: `${host} is on the organization's Domain Blocklist.` }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return { verdict: 'Malicious', detail: 'The link points to a raw IP address instead of a domain name.' }
  if (SHORTENERS.includes(host)) return { verdict: 'Malicious', detail: `${host} is a URL shortener that hides the real destination.` }
  const look = LOOKALIKES.find((l) => host.includes(l))
  if (look) return { verdict: 'Malicious', detail: `The domain imitates a trusted brand ("${look}").` }
  return { verdict: 'Safe', detail: 'No known phishing indicators were found for this link.' }
}

export interface FileVerdict {
  verdict: 'Safe' | 'Malicious' | 'Password-protected'
  detail: string
}
export function scanFile(name: string): FileVerdict {
  const lower = name.toLowerCase()
  const parts = lower.split('.')
  if (KNOWN_BAD_FILES.includes(lower)) return { verdict: 'Malicious', detail: 'This file matches a known malware signature.' }
  if (lower.includes('protected') || lower.includes('encrypted'))
    return {
      verdict: 'Password-protected',
      detail: 'This file is password-protected or encrypted and could not be scanned. Treat it as suspicious and do not open it.',
    }
  if (parts.length > 2 && ['exe', 'bat', 'js', 'scr'].includes(parts[parts.length - 1]))
    return { verdict: 'Malicious', detail: 'The file uses a double extension to disguise an executable.' }
  const ext = parts[parts.length - 1]
  if (['exe', 'bat', 'js'].includes(ext)) return { verdict: 'Malicious', detail: `.${ext} files can run code on your computer and are treated as malicious when received by email.` }
  return { verdict: 'Safe', detail: 'No malware signatures, macros, scripts, or blocked links were found.' }
}

export interface SenderVerdict {
  result: VerifyResult
  detail: string
}
export function verifySender(email: string, blocklist: BlockedDomain[]): SenderVerdict {
  const domain = email.split('@')[1]?.toLowerCase() ?? ''
  if (isBlocked(domain, blocklist))
    return { result: 'Known Malicious Sender', detail: 'Known Malicious Sender. This domain has been flagged for suspicious activity.' }
  if (NONEXISTENT_TLDS.some((t) => domain.endsWith(t)) || domain.startsWith('nx-'))
    return { result: 'Suspicious Sender', detail: 'Suspicious Sender. Email domain could not be found.' }
  if (LOOKALIKES.some((l) => domain.includes(l)))
    return { result: 'Suspicious Sender', detail: 'Suspicious Sender. Possible impersonation detected.' }
  // ASSUMPTION: free or newly seen mail providers have no reputation records in the mock.
  if (['protonmail.com', 'mail.ru', 'yandex.com', 'tutanota.com'].includes(domain) || domain.endsWith('.xyz'))
    return { result: 'Unable to Verify', detail: 'Available information is insufficient to determine the sender\'s reputation.' }
  return { result: 'No Known threats detected', detail: 'The domain exists, has a valid mail exchange record, and has no record of phishing activity.' }
}

/** Defang an indicator for safe display, e.g. hxxp://evil[.]com */
export const defang = (v: string) => v.replace(/^http/i, 'hxxp').replace(/\./g, '[.]')
