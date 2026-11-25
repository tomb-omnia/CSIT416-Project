// Shared types for the in-memory demo store. No backend exists; see CLAUDE.md Section 2.

export type Role = 'general' | 'trainer' | 'officer' | 'admin'
export const ROLE_LABEL: Record<Role, string> = {
  general: 'General User',
  trainer: 'Training Coordinator',
  officer: 'Cybersecurity Officer',
  admin: 'Site Administrator',
}

export type AccountStatus = 'Active' | 'Locked' | 'Deactivated'
export type AccessReviewStatus = 'Not Reviewed' | 'Under Review' | 'Completed' | 'Action Required'

export interface User {
  username: string
  name: string
  email: string
  role: Role
  status: AccountStatus
  lastLogin: string | null
  group: string
  accessReview: AccessReviewStatus
  /** Set when another (fictional) administrator holds the review lock (UC34 7A1). */
  reviewLockedBy?: string
  accessReviewNotes?: { classification: string; notes: string; by: string; at: string }
}

export interface Policies {
  minPasswordLength: number
  failedAttempts: number
  inactivityMonths: number
  sessionTimeoutMinutes: number
  approvedDomains: string[]
}

export interface AuditEntry {
  id: string
  time: string
  eventType: string
  actor: string
  actorRole: string
  ip: string
  target: string
  oldValue?: string
  newValue?: string
  result: 'Success' | 'Failure'
  flagged: boolean
}

export interface ActivityLog {
  id: string
  username: string
  type: string
  time: string
  status: 'Success' | 'Failure'
  ip: string
  flag?: { reason: string; notes: string; by: string; at: string }
}

export type ArticleStatus = 'Draft' | 'Pending Review' | 'Awaiting Revision' | 'Published' | 'Rejected'
export interface Annotation {
  id: string
  text: string
  kind: 'highlight' | 'strike'
  note: string
}
export interface Article {
  id: string
  title: string
  category: string
  tags: string[]
  summary: string
  body: string
  author: string
  status: ArticleStatus
  submittedAt: string | null
  updatedAt: string
  publishedAt: string | null
  views: number
  submissionNotes: string
  ratings: Record<string, 'yes' | 'no'>
  comments: { id: string; user: string; at: string; text: string }[]
  review?: { annotations: Annotation[]; remark: string; by: string; at: string }
  rejection?: { comment: string; by: string; at: string }
  approvedBy?: string
}

export type ModuleKind = 'general' | 'remedial' | 'awareness'
export interface ModuleSection {
  heading: string
  body: string
  questionIds: string[]
}
export interface TrainingModule {
  id: string
  title: string
  description: string
  kind: ModuleKind
  estMinutes: number
  sections: ModuleSection[]
  certifiable: boolean
  available: boolean
  createdBy: string
  createdAt: string
}

export type AssignmentStatus = 'Not Started' | 'In Progress' | 'Completed'
export interface Assignment {
  id: string
  moduleId: string
  username: string
  assignedAt: string
  assignedBy: string
  deadline: string | null
  status: AssignmentStatus
  sectionsDone: number
  completedAt: string | null
  score: number | null
}

export interface Certificate {
  id: string
  username: string
  moduleId: string
  assignmentId: string
  completionDate: string
  issueDate: string
}

export interface Question {
  id: string
  text: string
  choices: string[]
  correct: number
  topic: string
}

export interface SimEmail {
  id: string
  fromName: string
  from: string
  subject: string
  received: string
  body: string
  links: { text: string; href: string }[]
  attachments: string[]
  isPhishing: boolean
  explanation: string
}

export interface SimResult {
  id: string
  username: string
  at: string
  score: number
}

export type ReportStatus =
  | 'Pending Review'
  | 'Under Review'
  | 'Resolved'
  | 'Resolved, email has been purged'
  | 'Classified - Phishing'
  | 'Classified - Spam'
  | 'Classified - Legitimate'

export interface EmailReport {
  kind: 'email'
  id: string
  reporter: string
  sender: string
  subject: string
  content: string
  submittedAt: string
  status: ReportStatus
  scan: 'Malicious' | 'Suspicious' | 'Clean'
  classifiedBy?: string
  classifiedAt?: string
  notes?: string
  /** Seeded concurrency alternate: another officer classifies it after the table loads (UC19 3A1). */
  conflict?: boolean
  phishingTestId?: string
}

export interface IncidentReport {
  kind: 'incident'
  id: string
  reporter: string
  incidentType: 'Phone Call' | 'Text Message'
  phone: string | null
  occurredAt: string
  description: string
  submittedAt: string
  status: ReportStatus
  reviewer?: string
  reviewStartedAt?: string
  classification?: 'Confirmed Phishing' | 'Not Phishing' | 'Needs further investigation'
  notes?: string
  /** Seeded concurrency alternate (UC30 7A1). */
  lockedByOther?: string
  evidence?: string
}

export type Report = EmailReport | IncidentReport

export interface ScanRecord {
  id: string
  username: string
  kind: 'Link' | 'Attachment'
  target: string
  verdict: 'Safe' | 'Malicious' | 'Password-protected'
  detail: string
  at: string
}

export type VerifyResult = 'No Known threats detected' | 'Suspicious Sender' | 'Known Malicious Sender' | 'Unable to Verify'
export interface VerificationRecord {
  id: string
  username: string
  email: string
  result: VerifyResult
  detail: string
  at: string
}

export interface BlockedDomain {
  domain: string
  reason: string
  blockedAt: string
  blockedBy: string
}

export interface MailboxEmail {
  id: string
  sender: string
  subject: string
  receivedAt: string
  inboxes: number
  recipients: string[]
  purged: boolean
}

export interface PhishingTemplate {
  id: string
  name: string
  subject: string
  fromName: string
  body: string
}

export interface UserGroup {
  id: string
  name: string
  members: string[]
}

export interface TestResult {
  username: string
  received: boolean
  opened: boolean
  clicked: boolean
  reported: boolean
}

export interface PhishingTest {
  id: string
  name: string
  templateId: string
  subject: string
  groupIds: string[]
  status: 'Scheduled' | 'Sent' | 'Draft'
  sendAt: string
  createdBy: string
  createdAt: string
  results: TestResult[]
  summaries: { id: string; at: string; by: string; failureRate: number; text: string }[]
}

export interface Bulletin {
  id: string
  headline: string
  threatType: string
  lookFor: string
  whatToDo: string
  sampleSender: string
  sampleSubject: string
  sampleLink: string
  expiresAt: string
  banner: boolean
  publishedAt: string
  publishedBy: string
  retired: boolean
  /** UC25 8A1: saved but not yet published. Only Cybersecurity Officers see drafts. */
  draft?: boolean
}

export type Severity = 'Low' | 'Medium' | 'High' | 'Critical'
export interface Advisory {
  id: string
  title: string
  severity: Severity
  audience: string[]
  summary: string
  details: string
  actions: string[]
  references: string[]
  effectiveDate: string
  status: 'Draft' | 'Published'
  requireAck: boolean
  acks: string[]
  publishedAt: string | null
  author: string
}

export type CaseStatus = 'Open' | 'In Progress' | 'Contained' | 'Closed'
export interface Investigation {
  id: string
  title: string
  severity: Severity
  description: string
  status: CaseStatus
  reportIds: string[]
  indicators: { id: string; kind: 'Sender' | 'Domain' | 'URL' | 'Phone'; value: string }[]
  affectedUsers: { username: string; relation: 'Received' | 'Clicked' | 'Reported' }[]
  timeline: { id: string; at: string; by: string; text: string; auto: boolean }[]
  assignedTo: string
  openedAt: string
  resolution?: string
}

export interface Notification {
  id: string
  to: string
  text: string
  at: string
  read: boolean
  link?: string
}

export interface CheckupResult {
  id: string
  username: string
  at: string
  score: number
  answers: Record<string, number>
  recommendations: string[]
}

export interface DemoFlags {
  slow: boolean
  /** `forms`: content forms and records fail to load (UC25 4A1, UC26 4A1, UC27 5A1, UC28 4A1). */
  unavailable: { scan: boolean; verify: boolean; purge: boolean; email: boolean; forms?: boolean }
  saveFailure: boolean
  notifyFailure: boolean
  purgePartial: boolean
  persist: boolean
}

export interface DemoState {
  users: User[]
  policies: Policies
  audit: AuditEntry[]
  activity: ActivityLog[]
  articles: Article[]
  modules: TrainingModule[]
  assignments: Assignment[]
  certificates: Certificate[]
  questions: Question[]
  simEmails: SimEmail[]
  simResults: SimResult[]
  reports: Report[]
  scans: ScanRecord[]
  verifications: VerificationRecord[]
  blocklist: BlockedDomain[]
  mailbox: MailboxEmail[]
  templates: PhishingTemplate[]
  groups: UserGroup[]
  tests: PhishingTest[]
  bulletins: Bulletin[]
  advisories: Advisory[]
  investigations: Investigation[]
  notifications: Notification[]
  checkups: CheckupResult[]
  complianceReports: { id: string; at: string; by: string; type: string }[]
}
