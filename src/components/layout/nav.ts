import {
  Ban,
  BarChart3,
  Bell,
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  FileSearch,
  FileText,
  FilePlus2,
  Fish,
  FolderSearch,
  GraduationCap,
  History,
  Inbox,
  Info,
  LayoutDashboard,
  Link2,
  ListChecks,
  Mail,
  Megaphone,
  MessageSquareWarning,
  Paperclip,
  PenSquare,
  Phone,
  ScrollText,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Trash2,
  UserCheck,
  Users,
  Activity,
  Award,
  Flag,
  HeartPulse,
  Target,
  type LucideIcon,
} from 'lucide-react'
import type { Role } from '../../store/types'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}
export interface NavSection {
  title: string
  items: NavItem[]
}

export const HOME: Record<Role, string> = {
  general: '/home',
  trainer: '/training/manage',
  officer: '/security',
  admin: '/admin',
}

const shared: NavSection = {
  title: 'Resources',
  items: [
    { to: '/kb', label: 'Knowledge Base', icon: BookOpen, end: true },
    { to: '/bulletins', label: 'Bulletins', icon: Megaphone },
    { to: '/advisories', label: 'Advisories', icon: ShieldAlert },
    { to: '/notifications', label: 'Notifications', icon: Bell },
    { to: '/about', label: 'About', icon: Info },
  ],
}
const writing: NavSection = {
  title: 'Contribute',
  items: [
    { to: '/kb/new', label: 'Write Article', icon: PenSquare },
    { to: '/kb/my-articles', label: 'My Articles', icon: FileText },
  ],
}

export const NAV: Record<Role, NavSection[]> = {
  general: [
    { title: 'Home', items: [{ to: '/home', label: 'Dashboard', icon: LayoutDashboard }] },
    {
      title: 'Training',
      items: [
        { to: '/my-training', label: 'My Training', icon: GraduationCap, end: true },
        { to: '/my-training/inbox-sim', label: 'Inbox Simulation', icon: Inbox },
        { to: '/my-certificates', label: 'My Certificates', icon: Award },
        { to: '/checkup', label: 'Security Checkup', icon: HeartPulse, end: true },
      ],
    },
    {
      title: 'Report and Scan',
      items: [
        { to: '/report/email', label: 'Report Email', icon: Mail },
        { to: '/report/phone-text', label: 'Report Phone/Text', icon: Phone },
        { to: '/my-reports', label: 'My Reports', icon: ClipboardList },
        { to: '/scan/link', label: 'Scan Link', icon: Link2 },
        { to: '/scan/attachment', label: 'Scan Attachment', icon: Paperclip },
        { to: '/verify-sender', label: 'Verify Sender', icon: UserCheck },
        { to: '/scan-history', label: 'Scan History', icon: History },
        { to: '/verification-history', label: 'Verification History', icon: History },
      ],
    },
    writing,
    shared,
  ],
  trainer: [
    {
      title: 'Training',
      items: [
        { to: '/training/manage', label: 'Training Management', icon: LayoutDashboard },
        { to: '/training/modules/new', label: 'Create Module', icon: FilePlus2 },
        { to: '/training/assign', label: 'Assign Training', icon: ClipboardCheck },
        { to: '/training/remedial', label: 'Remedial Training', icon: Target },
        { to: '/training/awareness', label: 'Awareness Training', icon: ShieldCheck },
        { to: '/training/deadlines', label: 'Manage Deadlines', icon: CalendarClock },
        { to: '/training/questions', label: 'Question Bank', icon: ListChecks },
        { to: '/training/reports', label: 'Compliance Report', icon: BarChart3 },
        { to: '/phishing-tests/results', label: 'Phishing Test Results', icon: Fish },
      ],
    },
    writing,
    shared,
  ],
  officer: [
    {
      title: 'Security',
      items: [
        { to: '/security', label: 'Security Console', icon: LayoutDashboard, end: true },
        { to: '/security/reports', label: 'Reported Emails', icon: MessageSquareWarning },
        { to: '/security/incidents', label: 'Incoming Incidents', icon: Siren },
        { to: '/security/investigations', label: 'Investigations', icon: FolderSearch },
        { to: '/security/purge', label: 'Purge Emails', icon: Trash2 },
        { to: '/security/blocklist', label: 'Domain Blocklist', icon: Ban },
        { to: '/phishing-tests', label: 'Phishing Tests', icon: Fish, end: true },
        { to: '/kb/pending', label: 'Pending Articles', icon: FileSearch },
        { to: '/security/bulletins/new', label: 'Publish Bulletin', icon: Megaphone },
        { to: '/security/advisories/new', label: 'Publish Advisory', icon: ShieldAlert },
      ],
    },
    writing,
    shared,
  ],
  admin: [
    {
      title: 'Administration',
      items: [
        { to: '/admin', label: 'Admin Dashboard', icon: LayoutDashboard, end: true },
        { to: '/admin/users', label: 'User Management', icon: Users },
        { to: '/admin/policies', label: 'Security Policies', icon: Settings2 },
        { to: '/admin/audit', label: 'Audit Log', icon: ScrollText, end: true },
        { to: '/admin/audit/flagged', label: 'Flagged Audit Entries', icon: Flag },
        { to: '/admin/access-review', label: 'Access Review', icon: UserCheck },
        { to: '/admin/activity', label: 'Activity Logs', icon: Activity },
      ],
    },
    { title: 'Resources', items: shared.items },
  ],
}
