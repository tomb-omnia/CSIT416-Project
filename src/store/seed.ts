// All mock data for the prototype. Names are fictional. Dates are relative to "now" so
// filters like the UC5 90-day range always have something to show.

import { daysAgo, daysAhead } from '../lib/dates'
import type {
  ActivityLog,
  Advisory,
  Article,
  Assignment,
  AuditEntry,
  BlockedDomain,
  Bulletin,
  Certificate,
  CheckupResult,
  DemoState,
  Investigation,
  MailboxEmail,
  Notification,
  PhishingTemplate,
  PhishingTest,
  Question,
  Report,
  Role,
  SimEmail,
  TrainingModule,
  User,
  UserGroup,
} from './types'

// Small deterministic PRNG so generated logs look the same on every reset.
function prng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}
const pick = <T,>(r: () => number, arr: T[]) => arr[Math.floor(r() * arr.length)]

/** The account each Demo sign-in button / RoleSwitcher entry logs in as. */
export const DEMO_ACCOUNTS: Record<Role, string> = {
  general: 'jmorales',
  trainer: 'tnguyen',
  officer: 'rokafor',
  admin: 'cbrennan',
}

function u(username: string, name: string, role: Role, status: User['status'], lastLoginDays: number | null, group: string, domain = 'montclair.edu'): User {
  return {
    username,
    name,
    email: `${username}@${domain}`,
    role,
    status,
    lastLogin: lastLoginDays === null ? null : daysAgo(lastLoginDays, 3),
    group,
    accessReview: 'Not Reviewed',
  }
}

function users(): User[] {
  const list = [
    u('jmorales', 'Jamie Morales', 'general', 'Active', 0, 'Finance'),
    u('bfinch', 'Blair Finch', 'general', 'Active', 1, 'Finance'),
    u('ctorres', 'Corey Torres', 'general', 'Active', 2, 'Human Resources'),
    u('dyamamoto', 'Devon Yamamoto', 'general', 'Active', 5, 'IT'),
    u('eokoro', 'Emery Okoro', 'general', 'Locked', 12, 'Finance'),
    u('fbaxter', 'Frankie Baxter', 'general', 'Deactivated', 140, 'Archived Interns'),
    u('glindqvist', 'Gale Lindqvist', 'general', 'Active', 3, 'Student Workers'),
    u('hsato', 'Harper Sato', 'general', 'Active', 8, 'Human Resources'),
    u('imensah', 'Indigo Mensah', 'general', 'Active', 20, 'Student Workers'),
    u('lquill', 'Lane Quill', 'general', 'Active', 30, 'IT', 'example.org'),
    u('tnguyen', 'Taylor Nguyen', 'trainer', 'Active', 0, 'Training Office'),
    u('kwhitlock', 'Kendall Whitlock', 'trainer', 'Active', 4, 'Training Office'),
    u('rokafor', 'Riley Okafor', 'officer', 'Active', 0, 'Security Operations'),
    u('sbello', 'Sam Bello', 'officer', 'Active', 1, 'Security Operations'),
    u('cbrennan', 'Casey Brennan', 'admin', 'Active', 0, 'IT Administration'),
    u('mvance', 'Morgan Vance', 'admin', 'Active', 2, 'IT Administration'),
  ]
  // Seeded conflict for UC34 7A1.
  const h = list.find((x) => x.username === 'hsato')!
  h.accessReview = 'Under Review'
  h.reviewLockedBy = 'mvance'
  list.find((x) => x.username === 'eokoro')!.accessReview = 'Action Required'
  list.find((x) => x.username === 'bfinch')!.accessReview = 'Completed'
  return list
}

function groups(us: User[]): UserGroup[] {
  const by = (g: string) => us.filter((x) => x.group === g).map((x) => x.username)
  return [
    { id: 'G-ALL', name: 'All General Users', members: us.filter((x) => x.role === 'general').map((x) => x.username) },
    { id: 'G-FIN', name: 'Finance', members: by('Finance') },
    { id: 'G-HR', name: 'Human Resources', members: by('Human Resources') },
    { id: 'G-IT', name: 'IT', members: by('IT') },
    { id: 'G-SW', name: 'Student Workers', members: by('Student Workers') },
    { id: 'G-ARC', name: 'Archived Interns', members: by('Archived Interns') },
  ]
}

const questions: Question[] = [
  { id: 'Q-0001', topic: 'Phishing', text: 'Which sign most strongly suggests an email is phishing?', choices: ['It comes from a coworker', 'The link text and actual URL do not match', 'It has a signature block', 'It was sent during business hours'], correct: 1 },
  { id: 'Q-0002', topic: 'Phishing', text: 'What should you do with a suspicious email at work?', choices: ['Forward it to friends', 'Reply asking if it is real', 'Report it with PhishGuard', 'Delete it and forget it'], correct: 2 },
  { id: 'Q-0003', topic: 'Passwords', text: 'Which password practice is the safest?', choices: ['Reuse one strong password', 'Use a password manager with unique passwords', 'Write passwords on a sticky note', 'Change one character each month'], correct: 1 },
  { id: 'Q-0004', topic: 'MFA', text: 'Why does multi-factor authentication help?', choices: ['It makes passwords longer', 'A stolen password alone is not enough to log in', 'It hides your username', 'It encrypts your email'], correct: 1 },
  { id: 'Q-0005', topic: 'Domains', text: 'Which domain is a lookalike of montclair.edu?', choices: ['montclair.edu', 'mail.montclair.edu', 'montc1air.edu', 'it.montclair.edu'], correct: 2 },
  { id: 'Q-0006', topic: 'Attachments', text: 'Which attachment name is most suspicious?', choices: ['agenda.pdf', 'invoice.pdf.exe', 'notes.docx', 'photo.jpg'], correct: 1 },
  { id: 'Q-0007', topic: 'Smishing', text: 'A text says your package is held and asks for a fee. What is it most likely?', choices: ['A real delivery notice', 'A smishing attempt', 'A software update', 'A coupon'], correct: 1 },
  { id: 'Q-0008', topic: 'Vishing', text: 'A caller claiming to be IT asks for your password. You should:', choices: ['Give it if they know your name', 'Hang up and call IT using a known number', 'Give only half of it', 'Email it instead'], correct: 1 },
  { id: 'Q-0009', topic: 'Devices', text: 'Why install operating system updates promptly?', choices: ['They change the wallpaper', 'They patch known security holes', 'They free disk space', 'They are required by law'], correct: 1 },
  { id: 'Q-0010', topic: 'Browsing', text: 'What does a padlock icon in the browser guarantee?', choices: ['The site is trustworthy', 'The connection is encrypted, not that the site is safe', 'The site is run by your employer', 'Nothing at all'], correct: 1 },
  { id: 'Q-0011', topic: 'Phishing', text: 'An urgent email from the "CEO" asks for gift cards. The best response is:', choices: ['Buy them quickly', 'Verify through a separate channel and report it', 'Reply with questions', 'Ignore all CEO emails forever'], correct: 1 },
  { id: 'Q-0012', topic: 'Reporting', text: 'After you report a phishing email, where can you check its status?', choices: ['My Reports', 'Spam folder', 'Browser history', 'Nowhere'], correct: 0 },
]

const modules: TrainingModule[] = [
  {
    id: 'MOD-1001', title: 'Phishing Fundamentals', kind: 'general', estMinutes: 20, certifiable: true, available: true, createdBy: 'tnguyen', createdAt: daysAgo(200),
    description: 'Learn what phishing is, how attackers craft convincing messages, and the habits that keep you safe.',
    sections: [
      { heading: 'What is phishing?', body: 'Phishing is a social engineering attack where someone pretends to be a trusted person or organization to trick you into sharing information, clicking a link, or opening a file.\n\nMost phishing arrives by email, but attackers also use text messages (smishing) and phone calls (vishing).', questionIds: [] },
      { heading: 'Common warning signs', body: 'Watch for urgency ("act within 24 hours"), unexpected attachments, sender addresses that almost match a real domain, and links whose visible text differs from where they really go.\n\nHover over a link before clicking to reveal the real destination.', questionIds: ['Q-0001'] },
      { heading: 'What to do', body: 'Do not click, reply, or open attachments. Use "Report Suspicious Email" in PhishGuard so the Cybersecurity team can review it and protect others.', questionIds: ['Q-0002'] },
    ],
  },
  {
    id: 'MOD-1002', title: 'Security Awareness: Passwords and MFA', kind: 'awareness', estMinutes: 15, certifiable: true, available: true, createdBy: 'tnguyen', createdAt: daysAgo(180),
    description: 'Build strong, unique passwords and understand how multi-factor authentication protects your account.',
    sections: [
      { heading: 'Strong, unique passwords', body: 'Use a long passphrase for each account and never reuse passwords. A password manager makes this easy.', questionIds: ['Q-0003'] },
      { heading: 'Multi-factor authentication', body: 'MFA adds a second step such as an app prompt or a code. Even if your password leaks, an attacker cannot log in without the second factor.', questionIds: ['Q-0004'] },
    ],
  },
  {
    id: 'MOD-1003', title: 'Security Awareness: Safe Browsing and Devices', kind: 'awareness', estMinutes: 15, certifiable: true, available: true, createdBy: 'kwhitlock', createdAt: daysAgo(150),
    description: 'Keep your devices updated and browse safely by understanding what the padlock icon really means.',
    sections: [
      { heading: 'Keep devices updated', body: 'Updates fix security holes that attackers actively exploit. Turn on automatic updates and restart when prompted.', questionIds: ['Q-0009'] },
      { heading: 'Browse with care', body: 'The padlock only means the connection is encrypted. Phishing sites can have a padlock too, so always check the domain name.', questionIds: ['Q-0010'] },
      { heading: 'Lock your screen', body: 'Lock your screen whenever you step away. Use a PIN or password on every phone, tablet, and laptop.', questionIds: [] },
    ],
  },
  {
    id: 'MOD-1004', title: 'Remedial: Spotting Lookalike Domains', kind: 'remedial', estMinutes: 10, certifiable: true, available: true, createdBy: 'tnguyen', createdAt: daysAgo(120),
    description: 'Short refresher for users who clicked a simulated phishing link. Focuses on lookalike domains and link hovering.',
    sections: [
      { heading: 'Lookalike domains', body: 'Attackers swap letters that look alike: "l" becomes "1", "m" becomes "rn", "o" becomes "0". Read the domain slowly from right to left.', questionIds: ['Q-0005'] },
      { heading: 'Dangerous attachments', body: 'Double extensions such as invoice.pdf.exe hide programs. Scan any unexpected attachment with PhishGuard before opening it.', questionIds: ['Q-0006'] },
    ],
  },
  {
    id: 'MOD-1005', title: 'Remedial: Phone and Text Scams', kind: 'remedial', estMinutes: 10, certifiable: false, available: true, createdBy: 'kwhitlock', createdAt: daysAgo(90),
    description: 'Short refresher on smishing and vishing for users who engaged with a phone or text scam.',
    sections: [
      { heading: 'Smishing', body: 'Scam texts often claim a package, bank, or toll problem and push you to a link. Do not tap it; go to the official site directly.', questionIds: ['Q-0007'] },
      { heading: 'Vishing', body: 'Callers may spoof caller ID. Hang up and call back using a number you already trust. Report the call in PhishGuard.', questionIds: ['Q-0008'] },
    ],
  },
]

function assignments(): Assignment[] {
  const a = (id: string, moduleId: string, username: string, status: Assignment['status'], deadlineDays: number | null, sectionsDone: number, completedDays: number | null = null, score: number | null = null): Assignment => ({
    id, moduleId, username, status, sectionsDone,
    assignedAt: daysAgo(40), assignedBy: 'tnguyen',
    deadline: deadlineDays === null ? null : deadlineDays >= 0 ? daysAhead(deadlineDays) : daysAgo(-deadlineDays),
    completedAt: completedDays === null ? null : daysAgo(completedDays), score,
  })
  return [
    a('ASG-10001', 'MOD-1001', 'jmorales', 'Completed', 10, 3, 25, 100),
    a('ASG-10002', 'MOD-1002', 'jmorales', 'Completed', 12, 2, 6, 100),
    a('ASG-10003', 'MOD-1003', 'jmorales', 'In Progress', 7, 1),
    a('ASG-10004', 'MOD-1004', 'jmorales', 'Not Started', 14, 0),
    a('ASG-10005', 'MOD-1001', 'bfinch', 'Completed', 10, 3, 20, 92),
    a('ASG-10006', 'MOD-1001', 'ctorres', 'In Progress', 3, 1),
    a('ASG-10007', 'MOD-1001', 'dyamamoto', 'Not Started', -4, 0),
    a('ASG-10008', 'MOD-1002', 'glindqvist', 'Not Started', 21, 0),
    a('ASG-10009', 'MOD-1004', 'imensah', 'In Progress', -2, 1),
    a('ASG-10010', 'MOD-1005', 'ctorres', 'Not Started', null, 0),
    a('ASG-10011', 'MOD-1003', 'hsato', 'Completed', 5, 3, 3, 85),
    a('ASG-10012', 'MOD-1002', 'lquill', 'Not Started', -10, 0),
  ]
}

const certificates: Certificate[] = [
  { id: 'CERT-480211', username: 'jmorales', moduleId: 'MOD-1001', assignmentId: 'ASG-10001', completionDate: daysAgo(25), issueDate: daysAgo(24) },
]

const simEmails: SimEmail[] = [
  { id: 'S1', fromName: 'IT Help Desk', from: 'helpdesk@montc1air.edu', subject: 'Your mailbox is 98% full - action required', received: '9:02 AM', isPhishing: true,
    body: 'Dear user,\n\nYour mailbox has exceeded its limit. To avoid losing email, validate your account within 24 hours using the link below.\n\nIT Help Desk',
    links: [{ text: 'https://montclair.edu/mailbox', href: 'http://montc1air-mail.support/verify' }], attachments: [],
    explanation: 'The sender domain is "montc1air.edu" (number 1 instead of letter l), it creates urgency, and the link text does not match its real destination.' },
  { id: 'S2', fromName: 'Payroll Office', from: 'payroll@montclair.edu', subject: 'Reminder: Direct deposit changes close Friday', received: '9:40 AM', isPhishing: false,
    body: 'Hello,\n\nA reminder that changes to direct deposit for the next pay period must be made in the employee portal by Friday. No action is needed if your details are unchanged.\n\nPayroll Office',
    links: [{ text: 'https://portal.montclair.edu', href: 'https://portal.montclair.edu' }], attachments: [],
    explanation: 'Legitimate: correct domain, no request for credentials in email, and the link matches its destination.' },
  { id: 'S3', fromName: 'PayPal', from: 'service@paypa1-secure.com', subject: 'Unusual sign-in activity on your account', received: '10:15 AM', isPhishing: true,
    body: 'We noticed a login from a new device. If this was not you, confirm your identity immediately or your account will be suspended.',
    links: [{ text: 'Confirm identity', href: 'http://paypa1-secure.com/login' }], attachments: [],
    explanation: '"paypa1-secure.com" is a lookalike domain and the message threatens suspension to rush you.' },
  { id: 'S4', fromName: 'Dana from Facilities', from: 'facilities@montclair.edu', subject: 'Building B elevator maintenance Tuesday', received: '11:00 AM', isPhishing: false,
    body: 'Hi all,\n\nThe Building B elevator will be out of service Tuesday from 8 to 11 AM for scheduled maintenance. Please use the east stairwell.\n\nThanks,\nFacilities',
    links: [], attachments: [],
    explanation: 'Legitimate: informational, correct domain, no links or requests.' },
  { id: 'S5', fromName: 'Accounts Payable', from: 'ap-invoices@vendor-billing.xyz', subject: 'Overdue invoice #44821', received: '11:47 AM', isPhishing: true,
    body: 'Please see the attached overdue invoice and process payment today to avoid late fees.',
    links: [], attachments: ['invoice_44821.pdf.exe'],
    explanation: 'The attachment has a double extension (.pdf.exe), meaning it is a program disguised as a PDF.' },
  { id: 'S6', fromName: 'Training Office', from: 'training@montclair.edu', subject: 'New module assigned: Passwords and MFA', received: '1:05 PM', isPhishing: false,
    body: 'You have been assigned a new security awareness module. Open PhishGuard and go to My Training to begin.',
    links: [{ text: 'https://phishguard.montclair.edu/my-training', href: 'https://phishguard.montclair.edu/my-training' }], attachments: [],
    explanation: 'Legitimate: expected internal notice, correct domain, link matches its destination.' },
  { id: 'S7', fromName: 'President\'s Office', from: 'president.office@gmail-mail.co', subject: 'Quick favor - are you at your desk?', received: '1:30 PM', isPhishing: true,
    body: 'I need you to purchase four $100 gift cards for a staff appreciation event. Send me the codes by email. Keep this confidential.',
    links: [], attachments: [],
    explanation: 'Executive impersonation from an outside domain, asking for gift cards and secrecy.' },
  { id: 'S8', fromName: 'Microsoft 365', from: 'no-reply@rnicrosoft-support.net', subject: 'Password expires today', received: '2:12 PM', isPhishing: true,
    body: 'Your password expires today. Keep your current password by signing in below.',
    links: [{ text: 'Keep my password', href: 'http://rnicrosoft-support.net/keep' }], attachments: [],
    explanation: '"rnicrosoft" uses "rn" to imitate "m". The domain is on the organization blocklist.' },
  { id: 'S9', fromName: 'Library Services', from: 'library@montclair.edu', subject: 'Your requested book is ready for pickup', received: '3:20 PM', isPhishing: false,
    body: 'The item you requested is available at the circulation desk for the next 7 days.',
    links: [], attachments: [],
    explanation: 'Legitimate: expected, informational, correct domain.' },
]

function reports(): Report[] {
  return [
    { kind: 'email', id: '40318822', reporter: 'bfinch', sender: 'support@rnicrosoft-support.net', subject: 'Password expires today', content: 'Received: from mail.rnicrosoft-support.net\nFrom: Microsoft 365 <no-reply@rnicrosoft-support.net>\nSubject: Password expires today\n\nYour password expires today. Keep your current password by signing in at http://rnicrosoft-support.net/keep', submittedAt: daysAgo(6), status: 'Pending Review', scan: 'Malicious' },
    { kind: 'email', id: '40318907', reporter: 'ctorres', sender: 'hr-benefits@montclair-edu.co', subject: 'Open enrollment: confirm your benefits', content: 'From: HR Benefits <hr-benefits@montclair-edu.co>\nSubject: Open enrollment: confirm your benefits\n\nConfirm your benefits selections before Friday at http://montclair-edu.co/benefits or coverage will lapse.', submittedAt: daysAgo(5), status: 'Pending Review', scan: 'Malicious' },
    { kind: 'email', id: '40319015', reporter: 'dyamamoto', sender: 'deals@shopping-weekly.com', subject: 'This week only: 70% off electronics', content: 'From: Shopping Weekly <deals@shopping-weekly.com>\nSubject: This week only: 70% off electronics\n\nHuge savings on laptops and headphones. Click to see deals. Unsubscribe at the bottom.', submittedAt: daysAgo(4), status: 'Pending Review', scan: 'Clean' },
    { kind: 'email', id: '40319120', reporter: 'glindqvist', sender: 'registrar@montclair.edu', subject: 'Spring registration opens Monday', content: 'From: Registrar <registrar@montclair.edu>\nSubject: Spring registration opens Monday\n\nRegistration for spring opens Monday at 8 AM in the student portal. Check your time ticket.', submittedAt: daysAgo(3), status: 'Pending Review', scan: 'Clean' },
    { kind: 'email', id: '40319233', reporter: 'hsato', sender: 'ceo.office@gmail-mail.co', subject: 'Quick favor - are you at your desk?', content: 'From: President <ceo.office@gmail-mail.co>\nSubject: Quick favor - are you at your desk?\n\nI need four $100 gift cards for an event. Send the codes by email and keep this confidential.', submittedAt: daysAgo(2), status: 'Pending Review', scan: 'Suspicious', conflict: true },
    { kind: 'email', id: '40319341', reporter: 'jmorales', sender: 'billing@docs-share-portal.info', subject: 'Shared document: Q3 budget.xlsx', content: 'From: Docs Share <billing@docs-share-portal.info>\nSubject: Shared document: Q3 budget.xlsx\n\nA document has been shared with you. Sign in with your work email to view: http://docs-share-portal.info/view', submittedAt: daysAgo(1), status: 'Pending Review', scan: 'Malicious' },
    { kind: 'email', id: '40317764', reporter: 'jmorales', sender: 'promo@newsletter-hub.com', subject: 'Your weekly digest', content: 'From: Newsletter Hub <promo@newsletter-hub.com>\nSubject: Your weekly digest\n\nHere are this week\'s top stories and offers from our partners.', submittedAt: daysAgo(18), status: 'Classified - Spam', scan: 'Clean', classifiedBy: 'sbello', classifiedAt: daysAgo(17) },
    { kind: 'incident', id: '52044710', reporter: 'jmorales', incidentType: 'Text Message', phone: '(973) 555-0142', occurredAt: daysAgo(9), description: 'USPS: Your package is on hold due to an unpaid fee of $1.99. Pay now at hxxp://usps-redelivery-fee[.]top to avoid return.', submittedAt: daysAgo(9), status: 'Resolved', reviewer: 'sbello', classification: 'Confirmed Phishing', notes: 'Known smishing campaign impersonating USPS. Domain added to watch list.' },
    { kind: 'incident', id: '52044893', reporter: 'bfinch', incidentType: 'Phone Call', phone: '(201) 555-0199', occurredAt: daysAgo(3), description: 'Caller said they were from the IT help desk and needed my password to fix a mailbox problem. They knew my name and department.', submittedAt: daysAgo(3), status: 'Pending Review', evidence: 'Caller ID showed "MSU IT". Call lasted about 4 minutes.' },
    { kind: 'incident', id: '52044951', reporter: 'imensah', incidentType: 'Text Message', phone: null, occurredAt: daysAgo(2), description: 'Text from unknown number: Your Montclair account is locked. Reply with your NetID and password to unlock it immediately.', submittedAt: daysAgo(2), status: 'Pending Review', lockedByOther: 'sbello', evidence: 'Screenshot described by reporter; sender number hidden.' },
    { kind: 'incident', id: '52045008', reporter: 'ctorres', incidentType: 'Phone Call', phone: '(862) 555-0110', occurredAt: daysAgo(1), description: 'Automated call claiming my student loan forgiveness was approved and asking me to press 1 to speak to an agent about a processing fee.', submittedAt: daysAgo(1), status: 'Pending Review' },
  ]
}

const blocklist: BlockedDomain[] = [
  { domain: 'rnicrosoft-support.net', reason: 'Impersonates Microsoft 365 password expiry notices to harvest staff credentials across multiple departments.', blockedAt: daysAgo(60), blockedBy: 'rokafor' },
  { domain: 'secure-paypa1-login.com', reason: 'Lookalike PayPal domain hosting a credential harvesting page reported by several users in the Finance group.', blockedAt: daysAgo(45), blockedBy: 'sbello' },
  { domain: 'montclair-edu.co', reason: 'Lookalike of the university domain used in a fake benefits enrollment campaign targeting HR and Finance staff.', blockedAt: daysAgo(30), blockedBy: 'rokafor' },
  { domain: 'free-gift-cards.xyz', reason: 'Gift card scam domain linked to executive impersonation emails asking employees to buy gift cards urgently.', blockedAt: daysAgo(14), blockedBy: 'sbello' },
  { domain: 'docs-share-portal.info', reason: 'Fake document sharing portal that asks users to sign in with their work email and password to view a file.', blockedAt: daysAgo(7), blockedBy: 'rokafor' },
]

function mailbox(): MailboxEmail[] {
  const m = (id: string, sender: string, subject: string, days: number, recipients: string[]): MailboxEmail => ({ id, sender, subject, receivedAt: daysAgo(days, 2), inboxes: recipients.length, recipients, purged: false })
  return [
    m('M1', 'no-reply@rnicrosoft-support.net', 'Password expires today', 6, ['bfinch@montclair.edu', 'jmorales@montclair.edu', 'ctorres@montclair.edu', 'dyamamoto@montclair.edu', 'hsato@montclair.edu', 'imensah@montclair.edu', 'glindqvist@montclair.edu']),
    m('M2', 'support@rnicrosoft-support.net', 'Password expires today', 6, ['bfinch@montclair.edu', 'eokoro@montclair.edu', 'lquill@example.org']),
    m('M3', 'hr-benefits@montclair-edu.co', 'Open enrollment: confirm your benefits', 5, ['ctorres@montclair.edu', 'hsato@montclair.edu', 'jmorales@montclair.edu', 'bfinch@montclair.edu']),
    m('M4', 'billing@docs-share-portal.info', 'Shared document: Q3 budget.xlsx', 1, ['jmorales@montclair.edu', 'bfinch@montclair.edu', 'eokoro@montclair.edu', 'dyamamoto@montclair.edu', 'ctorres@montclair.edu']),
    m('M5', 'ceo.office@gmail-mail.co', 'Quick favor - are you at your desk?', 2, ['hsato@montclair.edu', 'ctorres@montclair.edu']),
    m('M6', 'deals@shopping-weekly.com', 'This week only: 70% off electronics', 4, ['dyamamoto@montclair.edu', 'glindqvist@montclair.edu', 'imensah@montclair.edu']),
    m('M7', 'alerts@usps-redelivery-fee.top', 'Package delivery failed', 9, ['jmorales@montclair.edu', 'imensah@montclair.edu']),
  ]
}

const templates: PhishingTemplate[] = [
  { id: 'T1', name: 'Mailbox Quota Warning', fromName: 'IT Help Desk', subject: 'Your mailbox is almost full', body: 'Your mailbox has reached 98% of its limit. Click below to request more storage within 24 hours.' },
  { id: 'T2', name: 'Shared Document', fromName: 'Docs Share', subject: 'A document has been shared with you', body: 'A colleague shared "Budget Review.xlsx" with you. Sign in to view the document.' },
  { id: 'T3', name: 'Package Delivery', fromName: 'Delivery Notice', subject: 'Delivery attempt failed', body: 'We could not deliver your package. Confirm your address to reschedule delivery.' },
  { id: 'T4', name: 'Payroll Update', fromName: 'Payroll', subject: 'Action required: verify direct deposit', body: 'Our payroll system was upgraded. Verify your direct deposit information to avoid a delay in pay.' },
]

function tests(us: User[]): PhishingTest[] {
  const general = us.filter((x) => x.role === 'general' && x.status === 'Active').map((x) => x.username)
  const outcome: Record<string, [boolean, boolean, boolean]> = {
    jmorales: [true, false, true], bfinch: [true, true, false], ctorres: [true, false, true], dyamamoto: [true, true, false],
    glindqvist: [false, false, false], hsato: [true, false, true], imensah: [true, true, false], lquill: [true, false, false],
  }
  return [
    { id: 'PT-301', name: 'Q3 Mailbox Quota Test', templateId: 'T1', subject: 'Your mailbox is almost full', groupIds: ['G-ALL'], status: 'Sent', sendAt: daysAgo(21), createdBy: 'rokafor', createdAt: daysAgo(23),
      results: general.map((un) => ({ username: un, received: true, opened: outcome[un]?.[0] ?? false, clicked: outcome[un]?.[1] ?? false, reported: outcome[un]?.[2] ?? false })), summaries: [] },
    { id: 'PT-302', name: 'Finance Payroll Lure', templateId: 'T4', subject: 'Action required: verify direct deposit', groupIds: ['G-FIN'], status: 'Scheduled', sendAt: daysAhead(5), createdBy: 'rokafor', createdAt: daysAgo(2), results: [], summaries: [] },
    { id: 'PT-303', name: 'Package Delivery Draft', templateId: 'T3', subject: 'Delivery attempt failed', groupIds: ['G-SW'], status: 'Draft', sendAt: daysAhead(12), createdBy: 'sbello', createdAt: daysAgo(1), results: [], summaries: [] },
  ]
}

function articles(): Article[] {
  const base = { ratings: {}, comments: [], submissionNotes: '' }
  return [
    { ...base, id: 'KB-101', title: 'How to Spot a Phishing Email', category: 'Phishing', tags: ['email', 'phishing', 'basics'], author: 'rokafor', status: 'Published', views: 412, submittedAt: daysAgo(120), updatedAt: daysAgo(30), publishedAt: daysAgo(118),
      summary: 'Five quick checks you can do on any email before you click a link or open an attachment.',
      body: '## Check the sender\nLook at the full address, not just the display name. Lookalike domains such as **montc1air.edu** are a common trick.\n\n## Hover before you click\nHover over links to see the real destination. If the text and the destination differ, do not click.\n\n## Watch for urgency\n- Threats to close your account\n- Deadlines measured in hours\n- Requests for secrecy\n\n## When in doubt\nUse [Report Suspicious Email](#/report/email) so the security team can review it.',
      comments: [{ id: 'c1', user: 'bfinch', at: daysAgo(20), text: 'The hover tip caught one for me last week. Thanks!' }] },
    { ...base, id: 'KB-102', title: 'Setting Up Multi-Factor Authentication', category: 'Account Security', tags: ['mfa', 'passwords', 'account'], author: 'sbello', status: 'Published', views: 298, submittedAt: daysAgo(100), updatedAt: daysAgo(60), publishedAt: daysAgo(98),
      summary: 'Step-by-step instructions for turning on MFA for your university account using an authenticator app.',
      body: '## Why MFA matters\nA stolen password alone is not enough to log in when MFA is on.\n\n## Steps\n- Install an authenticator app on your phone\n- Sign in to the account security page\n- Choose **Add sign-in method** and scan the QR code\n- Enter the six-digit code to confirm\n\n## Lost your phone?\nContact the IT Help Desk to reset your MFA method.' },
    { ...base, id: 'KB-103', title: 'Smishing: Scam Text Messages', category: 'Phone and Text', tags: ['sms', 'smishing', 'mobile'], author: 'rokafor', status: 'Published', views: 175, submittedAt: daysAgo(70), updatedAt: daysAgo(15), publishedAt: daysAgo(68),
      summary: 'How scam texts work, the most common lures right now, and how to report them.',
      body: '## Common lures\n- Package delivery fees\n- Bank account locks\n- Toll road balances\n\n## What to do\nDo not tap links or reply. Report the text using **Report Phone/Text Incident** in PhishGuard, then delete it.' },
    { ...base, id: 'KB-104', title: 'Creating Strong Passphrases', category: 'Account Security', tags: ['passwords', 'passphrase'], author: 'tnguyen', status: 'Published', views: 233, submittedAt: daysAgo(50), updatedAt: daysAgo(50), publishedAt: daysAgo(49),
      summary: 'Long, memorable passphrases beat short complex passwords. Here is how to make one.',
      body: '## Use four or more random words\nA phrase like **lantern-orbit-maple-quartz** is long and easy to remember.\n\n## Never reuse\nEach account needs its own passphrase. A password manager keeps track for you.' },
    { ...base, id: 'KB-105', title: 'Safe Handling of Email Attachments', category: 'Phishing', tags: ['attachments', 'malware', 'email'], author: 'sbello', status: 'Published', views: 141, submittedAt: daysAgo(20), updatedAt: daysAgo(10), publishedAt: daysAgo(19),
      summary: 'Which attachment types are risky, what double extensions are, and how to scan a file first.',
      body: '## Risky file types\n.exe, .bat, .js, and macro-enabled documents can run code.\n\n## Double extensions\nA file named **invoice.pdf.exe** is a program pretending to be a PDF.\n\n## Scan first\nUse [Scan Attachment](#/scan/attachment) before opening anything unexpected.' },
    { ...base, id: 'KB-106', title: 'Recognizing Voice Phishing Calls', category: 'Phone and Text', tags: ['vishing', 'phone'], author: 'tnguyen', status: 'Pending Review', views: 0, submittedAt: daysAgo(4), updatedAt: daysAgo(4), publishedAt: null,
      submissionNotes: 'Based on the recent help desk impersonation calls. Please check the call-back advice.',
      summary: 'Callers pretending to be IT or a bank use pressure tactics. Learn the signs and how to respond.',
      body: '## Signs of a vishing call\n- The caller asks for a password or MFA code\n- They create urgency or fear\n- Caller ID shows a trusted name\n\n## How to respond\nHang up and call back using a number you already trust. IT will never ask for your password.' },
    { ...base, id: 'KB-107', title: 'Using Public Wi-Fi Safely', category: 'Devices', tags: ['wifi', 'travel', 'vpn'], author: 'ctorres', status: 'Pending Review', views: 0, submittedAt: daysAgo(2), updatedAt: daysAgo(2), publishedAt: null,
      submissionNotes: 'First article! Happy to make changes.',
      summary: 'Coffee shop and airport networks can be risky. A few habits keep your data safe on the go.',
      body: '## Use the VPN\nConnect to the university VPN before doing any work on public Wi-Fi.\n\n## Avoid sensitive tasks\nSkip banking and password changes on open networks.\n\n## Forget the network\nRemove public networks from your saved list so your device does not rejoin automatically.' },
    { ...base, id: 'KB-108', title: 'What Happens After You Report an Email', category: 'Reporting', tags: ['reporting', 'process'], author: 'jmorales', status: 'Awaiting Revision', views: 0, submittedAt: daysAgo(8), updatedAt: daysAgo(6), publishedAt: null,
      submissionNotes: 'Wrote this after asking about my own report.',
      summary: 'A plain explanation of the review process for reported emails and what each status means.',
      body: '## Pending Review\nYour report is in the queue for the Cybersecurity team.\n\n## Classified\nThe team marks it as Phishing, Spam, or Legitimate and you get a notification. This usually takes 5 minutes.\n\n## Resolved\nIf the email was purged, every copy has been removed from inboxes.',
      review: { by: 'rokafor', at: daysAgo(6), remark: 'Good start. Please remove the time estimate since review times vary, and add a line about checking My Reports.',
        annotations: [{ id: 'a1', text: 'This usually takes 5 minutes.', kind: 'strike', note: 'Review times vary; do not promise a time.' }, { id: 'a2', text: 'Pending Review', kind: 'highlight', note: 'Mention that status is visible in My Reports.' }] } },
  ]
}

function audit(us: User[]): AuditEntry[] {
  const r = prng(42)
  const types = ['Login', 'Failed Login', 'Account Deactivated', 'Account Reactivated', 'Role Changed', 'Policy Changed', 'Password Reset', 'Account Created', 'Domain Blocked', 'Email Purged']
  const admins = ['cbrennan', 'mvance']
  const out: AuditEntry[] = []
  for (let i = 0; i < 70; i++) {
    const type = pick(r, types)
    const target = pick(r, us).username
    const actor = ['Login', 'Failed Login', 'Password Reset'].includes(type) ? target : type === 'Domain Blocked' || type === 'Email Purged' ? pick(r, ['rokafor', 'sbello']) : pick(r, admins)
    const actorUser = us.find((x) => x.username === actor)
    const e: AuditEntry = {
      id: `AUD-${String(5000 + i)}`,
      time: daysAgo(Math.floor(r() * 120), Math.floor(r() * 23)),
      eventType: type,
      actor,
      actorRole: actorUser ? actorUser.role : 'general',
      ip: `10.${Math.floor(r() * 50)}.${Math.floor(r() * 255)}.${Math.floor(r() * 255)}`,
      target: type === 'Policy Changed' ? 'Session Timeout' : type === 'Domain Blocked' ? pick(r, blocklist).domain : target,
      result: type === 'Failed Login' ? 'Failure' : 'Success',
      flagged: false,
    }
    if (type === 'Role Changed') { e.oldValue = 'General User'; e.newValue = 'Training Coordinator' }
    if (type === 'Policy Changed') { e.oldValue = '30 minutes'; e.newValue = '60 minutes' }
    if (type === 'Account Deactivated') { e.oldValue = 'Active'; e.newValue = 'Deactivated' }
    if (type === 'Account Reactivated') { e.oldValue = 'Deactivated'; e.newValue = 'Active' }
    out.push(e)
  }
  out[3].flagged = true
  return out.sort((a, b) => b.time.localeCompare(a.time))
}

function activity(us: User[]): ActivityLog[] {
  const r = prng(7)
  const types = ['Login', 'Logout', 'Failed Login', 'Password Reset', 'Page Access', 'Unauthorized Access Attempt', 'File Download', 'Settings Change']
  const out: ActivityLog[] = []
  for (let i = 0; i < 70; i++) {
    const type = pick(r, types)
    out.push({
      id: `LOG-${String(20000 + i)}`,
      username: pick(r, us).username,
      type,
      time: daysAgo(Math.floor(r() * 120), Math.floor(r() * 23)),
      status: type === 'Failed Login' || type === 'Unauthorized Access Attempt' ? 'Failure' : r() < 0.08 ? 'Failure' : 'Success',
      ip: r() < 0.1 ? '' : `${Math.floor(r() * 200) + 20}.${Math.floor(r() * 255)}.${Math.floor(r() * 255)}.${Math.floor(r() * 255)}`,
    })
  }
  // A cluster of failures to make flagging obvious, and one already flagged record (UC35 10A2).
  for (let i = 0; i < 4; i++) out.push({ id: `LOG-${20100 + i}`, username: 'eokoro', type: 'Failed Login', time: daysAgo(12, i), status: 'Failure', ip: '185.220.101.44' })
  out.push({ id: 'LOG-20110', username: 'lquill', type: 'Unauthorized Access Attempt', time: daysAgo(6, 4), status: 'Failure', ip: '45.83.64.12',
    flag: { reason: 'Unauthorized Access Attempt', notes: 'Attempted to open /admin/users from an external IP. Account owner contacted.', by: 'mvance', at: daysAgo(5) } })
  return out.sort((a, b) => b.time.localeCompare(a.time))
}

const bulletins: Bulletin[] = [
  { id: 'BUL-12', headline: 'Fake benefits enrollment emails targeting staff', threatType: 'Email', publishedAt: daysAgo(3), publishedBy: 'rokafor', expiresAt: daysAhead(11), banner: true, retired: false,
    lookFor: 'Emails from "HR Benefits" asking you to confirm benefit selections at a link outside montclair.edu, often with a Friday deadline.',
    whatToDo: 'Do not click the link. Report the email with Report Suspicious Email. Enrollment is only done in the official employee portal.',
    sampleSender: 'hr-benefits@montclair-edu.co', sampleSubject: 'Open enrollment: confirm your benefits', sampleLink: 'http://montclair-edu.co/benefits' },
  { id: 'BUL-09', headline: 'USPS package fee text messages', threatType: 'Text/SMS', publishedAt: daysAgo(40), publishedBy: 'sbello', expiresAt: daysAgo(20), banner: true, retired: false,
    lookFor: 'Texts claiming a package is on hold for a small unpaid fee with a link to a non-USPS website.',
    whatToDo: 'Do not tap the link. Report the text with Report Phone/Text Incident and delete it.',
    sampleSender: '(973) 555-0142', sampleSubject: '', sampleLink: 'http://usps-redelivery-fee.top' },
]

const advisories: Advisory[] = [
  { id: 'ADV-21', title: 'Critical browser update required', severity: 'Critical', audience: ['All Users'], status: 'Published', requireAck: true, acks: ['bfinch', 'tnguyen'], publishedAt: daysAgo(4), author: 'rokafor', effectiveDate: daysAgo(4),
    summary: 'A vulnerability in older browser versions is being actively exploited. All users must update their browser this week.',
    details: '## What is affected\nChrome, Edge, and Firefox versions released before this month.\n\n## Why it matters\nVisiting a malicious page could let an attacker run code on your computer without any clicks.',
    actions: ['Open your browser settings and install the latest update', 'Restart the browser after updating', 'Contact the IT Help Desk if the update fails'],
    references: ['https://www.cisa.gov/known-exploited-vulnerabilities-catalog'] },
  { id: 'ADV-18', title: 'Change to password policy', severity: 'Low', audience: ['All Users'], status: 'Published', requireAck: false, acks: [], publishedAt: daysAgo(35), author: 'sbello', effectiveDate: daysAgo(30),
    summary: 'The minimum password length for new and reset passwords is now 10 characters.',
    details: '## What changed\nNew passwords and resets must be at least 10 characters long.\n\n## Existing passwords\nYour current password keeps working until your next reset.',
    actions: ['Use a passphrase of four or more words next time you reset'], references: [] },
]

const investigations: Investigation[] = [
  { id: 'CASE-0417', title: 'Microsoft 365 password expiry campaign', severity: 'High', status: 'In Progress', assignedTo: 'rokafor', openedAt: daysAgo(6),
    description: 'Multiple staff received lookalike Microsoft 365 emails from rnicrosoft-support.net asking them to keep their password. At least one user clicked.',
    reportIds: ['40318822'],
    indicators: [{ id: 'i1', kind: 'Sender', value: 'no-reply@rnicrosoft-support.net' }, { id: 'i2', kind: 'Domain', value: 'rnicrosoft-support.net' }, { id: 'i3', kind: 'URL', value: 'http://rnicrosoft-support.net/keep' }],
    affectedUsers: [{ username: 'bfinch', relation: 'Reported' }, { username: 'dyamamoto', relation: 'Clicked' }, { username: 'jmorales', relation: 'Received' }],
    timeline: [
      { id: 't1', at: daysAgo(6), by: 'rokafor', text: 'Investigation opened from report 40318822.', auto: true },
      { id: 't2', at: daysAgo(6), by: 'rokafor', text: 'Indicators added: sender, domain, URL.', auto: true },
      { id: 't3', at: daysAgo(5), by: 'rokafor', text: 'Confirmed with dyamamoto that credentials were entered; password reset forced by IT.', auto: false },
    ] },
]

function notifications(): Notification[] {
  return [
    { id: 'N1', to: 'jmorales', text: 'New training assigned: Remedial: Spotting Lookalike Domains', at: daysAgo(2), read: false, link: '/my-training' },
    { id: 'N2', to: 'jmorales', text: 'Your report (40317764) has been reviewed and classified as Spam. Thank you for using Phishguard.', at: daysAgo(17), read: true, link: '/my-reports' },
    { id: 'N3', to: 'jmorales', text: 'Your article "What Happens After You Report an Email" needs revision.', at: daysAgo(6), read: false, link: '/kb/my-articles' },
    { id: 'N4', to: 'rokafor', text: '2 articles are pending review.', at: daysAgo(2), read: false, link: '/kb/pending' },
    { id: 'N5', to: 'tnguyen', text: 'Phishing test "Q3 Mailbox Quota Test" has results ready to analyze.', at: daysAgo(14), read: false, link: '/phishing-tests/PT-301/results' },
    { id: 'N6', to: 'cbrennan', text: 'Repeated failed logins detected for eokoro.', at: daysAgo(12), read: false, link: '/admin/activity' },
  ]
}

const checkups: CheckupResult[] = [
  { id: 'CHK-1', username: 'jmorales', at: daysAgo(45), score: 63, answers: {}, recommendations: ['Enable multi-factor authentication on all accounts that support it.', 'Install operating system and app updates promptly.'] },
]

export function createSeed(): DemoState {
  const us = users()
  return {
    users: us,
    policies: { minPasswordLength: 10, failedAttempts: 5, inactivityMonths: 6, sessionTimeoutMinutes: 30, approvedDomains: ['montclair.edu', 'example.org'] },
    audit: audit(us),
    activity: activity(us),
    articles: articles(),
    modules: structuredClone(modules),
    assignments: assignments(),
    certificates: structuredClone(certificates),
    questions: structuredClone(questions),
    simEmails: structuredClone(simEmails),
    simResults: [],
    reports: reports(),
    scans: [
      { id: 'SC1', username: 'jmorales', kind: 'Link', target: 'https://portal.montclair.edu', verdict: 'Safe', detail: 'No known phishing indicators were found for this link.', at: daysAgo(10) },
      { id: 'SC2', username: 'jmorales', kind: 'Attachment', target: 'invoice_44821.pdf.exe', verdict: 'Malicious', detail: 'The file uses a double extension to disguise an executable.', at: daysAgo(8) },
    ],
    verifications: [{ id: 'V1', username: 'jmorales', email: 'payroll@montclair.edu', result: 'No Known threats detected', detail: 'The domain exists, has a valid mail exchange record, and has no record of phishing activity.', at: daysAgo(11) }],
    blocklist: structuredClone(blocklist),
    mailbox: mailbox(),
    templates: structuredClone(templates),
    groups: groups(us),
    tests: tests(us),
    bulletins: structuredClone(bulletins),
    advisories: structuredClone(advisories),
    investigations: structuredClone(investigations),
    notifications: notifications(),
    checkups: structuredClone(checkups),
    complianceReports: [],
  }
}
