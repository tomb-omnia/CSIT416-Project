// Security Console (CSO), Training Management (TC), Administrator Dashboard (SA).

import { Activity, Ban, BarChart3, CalendarClock, ClipboardCheck, FilePlus2, FileSearch, Fish, Flag, FolderSearch, ListChecks, Megaphone, MessageSquareWarning, ScrollText, Settings2, ShieldAlert, ShieldCheck, Siren, Target, Trash2, UserCheck, Users } from 'lucide-react'
import { useDemo, useMe } from '../../store/DemoStore'
import { PageHeader, TileGrid } from '../../components/ui/Card'
import { isPastDeadline } from '../../lib/dates'

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: 'red' | 'green' }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className={`text-2xl font-semibold ${tone === 'red' ? 'text-red-700' : tone === 'green' ? 'text-green-700' : 'text-slate-900'}`}>{value}</div>
      <div className="text-sm text-slate-600">{label}</div>
    </div>
  )
}

export function SecurityConsole() {
  const { state } = useDemo()
  const me = useMe()
  const pendingEmails = state.reports.filter((r) => r.kind === 'email' && r.status === 'Pending Review').length
  const pendingInc = state.reports.filter((r) => r.kind === 'incident' && (r.status === 'Pending Review' || r.status === 'Under Review')).length
  const openCases = state.investigations.filter((c) => c.status !== 'Closed').length
  const pendingArticles = state.articles.filter((a) => a.status === 'Pending Review').length
  return (
    <>
      <PageHeader title="Security Console" subtitle={`Signed in as ${me.name}, Cybersecurity Officer.`} />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Emails pending review" value={pendingEmails} />
        <Stat label="Open incidents" value={pendingInc} />
        <Stat label="Active investigations" value={openCases} />
        <Stat label="Blocked domains" value={state.blocklist.length} />
      </div>
      <TileGrid
        tiles={[
          { to: '/security/reports', label: 'Reported Emails Queue', description: 'Classify emails reported by users (UC19).', icon: MessageSquareWarning, badge: pendingEmails },
          { to: '/security/incidents', label: 'Incoming Incidents', description: 'Review phone and text reports (UC30).', icon: Siren, badge: pendingInc },
          { to: '/security/investigations', label: 'Investigations', description: 'Track phishing incident cases (UC27).', icon: FolderSearch, badge: openCases },
          { to: '/security/purge', label: 'Purge Emails', description: 'Remove malicious emails from inboxes (UC18).', icon: Trash2 },
          { to: '/security/blocklist', label: 'Domain Blocklist', description: 'Add or remove blocked domains (UC20).', icon: Ban },
          { to: '/phishing-tests', label: 'Phishing Tests', description: 'Create and analyze simulated phishing tests (UC21, UC24).', icon: Fish },
          { to: '/kb/pending', label: 'Pending Articles', description: 'Approve Knowledge Base submissions (UC7).', icon: FileSearch, badge: pendingArticles },
          { to: '/bulletins', label: 'Bulletins and Advisories', description: 'Publish alerts and advisories (UC25, UC28).', icon: Megaphone },
          { to: '/security/advisories/new', label: 'New Advisory', description: 'Publish a formal security advisory (UC28).', icon: ShieldAlert },
        ]}
      />
    </>
  )
}

export function TrainingManagement() {
  const { state } = useDemo()
  const overdue = state.assignments.filter((a) => a.status !== 'Completed' && isPastDeadline(a.deadline)).length
  const done = state.assignments.filter((a) => a.status === 'Completed').length
  return (
    <>
      <PageHeader title="Training Management" subtitle="Create modules, assign training, and monitor compliance." />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Training modules" value={state.modules.length} />
        <Stat label="Assignments" value={state.assignments.length} />
        <Stat label="Completion rate" value={`${Math.round((done / Math.max(1, state.assignments.length)) * 100)}%`} tone="green" />
        <Stat label="Overdue" value={overdue} tone={overdue ? 'red' : undefined} />
      </div>
      <TileGrid
        tiles={[
          { to: '/training/modules/new', label: 'Create Module', description: 'Build a new training module (UC8).', icon: FilePlus2 },
          { to: '/training/assign', label: 'Assign Training', description: 'Assign a module to users (UC9).', icon: ClipboardCheck },
          { to: '/training/remedial', label: 'Assign Remedial Training', description: 'Follow up on failed phishing tests (UC22).', icon: Target },
          { to: '/training/awareness', label: 'Assign Security Awareness Training', description: 'Assign awareness modules (UC23).', icon: ShieldCheck },
          { to: '/training/deadlines', label: 'Manage Deadlines', description: 'Change completion deadlines (UC10).', icon: CalendarClock },
          { to: '/training/questions', label: 'Question Bank', description: 'Manage quiz questions (UC11).', icon: ListChecks },
          { to: '/training/reports', label: 'Compliance Report', description: 'Generate compliance reports (UC14).', icon: BarChart3 },
          { to: '/phishing-tests/results', label: 'Phishing Test Results', description: 'Analyze phishing test results (UC24).', icon: Fish },
        ]}
      />
    </>
  )
}

export function AdminDashboard() {
  const { state } = useDemo()
  const flagged = state.audit.filter((a) => a.flagged).length
  return (
    <>
      <PageHeader title="Administrator Dashboard" subtitle="Manage accounts, policies, and monitor platform activity." />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="User accounts" value={state.users.length} />
        <Stat label="Locked or deactivated" value={state.users.filter((u) => u.status !== 'Active').length} tone="red" />
        <Stat label="Flagged audit entries" value={flagged} />
        <Stat label="Failed logins (all time)" value={state.activity.filter((a) => a.type === 'Failed Login').length} />
      </div>
      <TileGrid
        tiles={[
          { to: '/admin/users', label: 'User Management', description: 'Roles, deactivation, and deletion (UC3).', icon: Users },
          { to: '/admin/policies', label: 'Security Policies', description: 'Passwords, lockout, sessions, domains (UC4).', icon: Settings2 },
          { to: '/admin/audit', label: 'Audit Log', description: 'Review and export audit entries (UC5).', icon: ScrollText },
          { to: '/admin/audit/flagged', label: 'Flagged Audit Entries', description: 'Entries flagged for follow-up (UC5).', icon: Flag, badge: flagged },
          { to: '/admin/access-review', label: 'Conduct Access Review', description: 'Review account access (UC34).', icon: UserCheck },
          { to: '/admin/activity', label: 'Monitor System Activity Logs', description: 'Spot suspicious activity (UC35).', icon: Activity },
        ]}
      />
    </>
  )
}
