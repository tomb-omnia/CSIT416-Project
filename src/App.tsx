// Router: public auth pages, a public awareness landing page, and role-guarded app routes.

import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useDemo } from './store/DemoStore'
import type { Role } from './store/types'
import { AppShell } from './components/layout/AppShell'
import { HOME } from './components/layout/nav'
import LoginPage from './features/auth/LoginPage'
import RegisterPage from './features/auth/RegisterPage'
import { ResetNewPasswordPage, ResetRequestPage } from './features/auth/ResetPage'
import { AboutPage, AccessDenied, NotFound, NotificationsPage, NotInPrototype } from './features/misc/MiscPages'
import UserDashboard from './features/dashboards/UserDashboard'
import { AdminDashboard, SecurityConsole, TrainingManagement } from './features/dashboards/RoleDashboards'
import ReportEmailPage from './features/email-defense/ReportEmailPage'
import MyReportsPage from './features/email-defense/MyReportsPage'
import { ScanAttachmentPage, ScanHistoryPage, ScanLinkPage } from './features/email-defense/ScanPages'
import { VerificationHistoryPage, VerifySenderPage } from './features/email-defense/VerifySenderPage'
import { ClassifyReportPage, ReportQueuePage } from './features/email-defense/ReportQueuePage'
import PurgePage from './features/email-defense/PurgePage'
import BlocklistPage from './features/email-defense/BlocklistPage'
import ReportPhoneTextPage from './features/incidents/ReportPhoneTextPage'
import { IncidentDetailPage, IncidentListPage } from './features/incidents/IncidentPages'
import { InvestigationCasePage, InvestigationListPage, NewInvestigationPage } from './features/incidents/InvestigationPages'
import MyTrainingPage from './features/training/MyTrainingPage'
import ModulePlayerPage from './features/training/ModulePlayerPage'
import InboxSimPage from './features/training/InboxSimPage'
import { CertificatePrintPage, GenerateCertificatePage, MyCertificatesPage } from './features/training/CertificatePages'
import CreateModulePage from './features/training/CreateModulePage'
import AssignTrainingPage from './features/training/AssignTrainingPage'
import DeadlinesPage from './features/training/DeadlinesPage'
import QuestionBankPage from './features/training/QuestionBankPage'
import TargetedAssignPage from './features/training/TargetedAssignPage'
import ComplianceReportPage from './features/training/ComplianceReportPage'
import { AwarenessLandingPage, CreatePhishingTestPage, PhishingTestListPage } from './features/phishing-tests/PhishingTestPages'
import TestResultsPage, { TestResultsIndex } from './features/phishing-tests/TestResultsPage'
import { ArticlePage, KbPortalPage } from './features/knowledge-base/KbPages'
import { ArticleEditorPage, MyArticlesPage } from './features/knowledge-base/ArticleEditorPages'
import { PendingArticlesPage, ReviewArticlePage } from './features/knowledge-base/PendingArticlesPages'
import { BulletinsPage, NewBulletinPage } from './features/bulletins/BulletinPages'
import { AdvisoriesPage, AdvisoryEditorPage, AdvisoryPage } from './features/bulletins/AdvisoryPages'
import { CheckupHistoryPage, CheckupPage } from './features/checkup/CheckupPages'
import UsersPage from './features/admin/UsersPage'
import PoliciesPage from './features/admin/PoliciesPage'
import { AuditLogPage, FlaggedAuditPage } from './features/admin/AuditPages'
import { AccessReviewDetailPage, AccessReviewListPage } from './features/admin/AccessReviewPages'
import { ActivityDetailPage, ActivityListPage } from './features/admin/ActivityPages'

const G: Role[] = ['general']
const TC: Role[] = ['trainer']
const CSO: Role[] = ['officer']
const SA: Role[] = ['admin']
const WRITERS: Role[] = ['general', 'trainer', 'officer'] // UC26 actors

function Guard({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { me } = useDemo()
  if (!me) return null
  return roles.includes(me.role) ? <>{children}</> : <AccessDenied allowed={roles} />
}

function RequireLogin({ children }: { children: ReactNode }) {
  const { me } = useDemo()
  const loc = useLocation()
  return me ? <>{children}</> : <Navigate to="/login" replace state={{ from: loc.pathname }} />
}

export default function App() {
  const { me } = useDemo()
  const r = (roles: Role[], el: ReactNode) => <Guard roles={roles}>{el}</Guard>
  return (
    <Routes>
      <Route path="/login" element={me ? <Navigate to={HOME[me.role]} replace /> : <LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/reset" element={<ResetRequestPage />} />
      <Route path="/reset/new" element={<ResetNewPasswordPage />} />
      <Route path="/aware/:testId" element={<AwarenessLandingPage />} />
      <Route path="/print/certificate/:certId" element={<RequireLogin>{r(G, <CertificatePrintPage />)}</RequireLogin>} />
      {!me && <Route path="/about" element={<AboutPage />} />}

      <Route element={<RequireLogin><AppShell /></RequireLogin>}>
        <Route path="/" element={<Navigate to={me ? HOME[me.role] : '/login'} replace />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/not-in-prototype" element={<NotInPrototype />} />

        {/* General User */}
        <Route path="/home" element={r(G, <UserDashboard />)} />
        <Route path="/my-training" element={r(G, <MyTrainingPage />)} />
        <Route path="/my-training/inbox-sim" element={r(G, <InboxSimPage />)} />
        <Route path="/my-training/:moduleId" element={r(G, <ModulePlayerPage />)} />
        <Route path="/my-training/:moduleId/certificate" element={r(G, <GenerateCertificatePage />)} />
        <Route path="/my-certificates" element={r(G, <MyCertificatesPage />)} />
        <Route path="/report/email" element={r(G, <ReportEmailPage />)} />
        <Route path="/report/phone-text" element={r(G, <ReportPhoneTextPage />)} />
        <Route path="/my-reports" element={r(G, <MyReportsPage />)} />
        <Route path="/scan/link" element={r(G, <ScanLinkPage />)} />
        <Route path="/scan/attachment" element={r(G, <ScanAttachmentPage />)} />
        <Route path="/scan-history" element={r(G, <ScanHistoryPage />)} />
        <Route path="/verify-sender" element={r(G, <VerifySenderPage />)} />
        <Route path="/verification-history" element={r(G, <VerificationHistoryPage />)} />
        <Route path="/checkup" element={r(G, <CheckupPage />)} />
        <Route path="/checkup/history" element={r(G, <CheckupHistoryPage />)} />

        {/* Knowledge Base (shared) */}
        <Route path="/kb" element={<KbPortalPage />} />
        <Route path="/kb/new" element={r(WRITERS, <ArticleEditorPage />)} />
        <Route path="/kb/edit/:id" element={r(WRITERS, <ArticleEditorPage />)} />
        <Route path="/kb/my-articles" element={r(WRITERS, <MyArticlesPage />)} />
        <Route path="/kb/pending" element={r(CSO, <PendingArticlesPage />)} />
        <Route path="/kb/pending/:id" element={r(CSO, <ReviewArticlePage />)} />
        <Route path="/kb/:articleId" element={<ArticlePage />} />

        {/* Bulletins and advisories (shared view, CSO publish) */}
        <Route path="/bulletins" element={<BulletinsPage />} />
        <Route path="/advisories" element={<AdvisoriesPage />} />
        <Route path="/advisories/:id" element={<AdvisoryPage />} />
        <Route path="/security/bulletins/new" element={r(CSO, <NewBulletinPage />)} />
        <Route path="/security/advisories/new" element={r(CSO, <AdvisoryEditorPage key="new" />)} />
        <Route path="/security/advisories/edit/:id" element={r(CSO, <AdvisoryEditorPage />)} />

        {/* Training Coordinator */}
        <Route path="/training/manage" element={r(TC, <TrainingManagement />)} />
        <Route path="/training/modules/new" element={r(TC, <CreateModulePage />)} />
        <Route path="/training/assign" element={r(TC, <AssignTrainingPage />)} />
        <Route path="/training/deadlines" element={r(TC, <DeadlinesPage />)} />
        <Route path="/training/questions" element={r(TC, <QuestionBankPage />)} />
        <Route path="/training/remedial" element={r(TC, <TargetedAssignPage key="remedial" kind="remedial" />)} />
        <Route path="/training/awareness" element={r(TC, <TargetedAssignPage key="awareness" kind="awareness" />)} />
        <Route path="/training/reports" element={r(TC, <ComplianceReportPage />)} />

        {/* Phishing tests */}
        <Route path="/phishing-tests" element={r([...CSO, ...TC], <PhishingTestListPage />)} />
        <Route path="/phishing-tests/new" element={r(CSO, <CreatePhishingTestPage />)} />
        <Route path="/phishing-tests/results" element={r([...CSO, ...TC], <TestResultsIndex />)} />
        <Route path="/phishing-tests/:id/results" element={r([...CSO, ...TC], <TestResultsPage />)} />

        {/* Cybersecurity Officer */}
        <Route path="/security" element={r(CSO, <SecurityConsole />)} />
        <Route path="/security/reports" element={r(CSO, <ReportQueuePage />)} />
        <Route path="/security/reports/:id" element={r(CSO, <ClassifyReportPage />)} />
        <Route path="/security/incidents" element={r(CSO, <IncidentListPage />)} />
        <Route path="/security/incidents/:id" element={r(CSO, <IncidentDetailPage />)} />
        <Route path="/security/investigations" element={r(CSO, <InvestigationListPage />)} />
        <Route path="/security/investigations/new" element={r(CSO, <NewInvestigationPage />)} />
        <Route path="/security/investigations/:caseId" element={r(CSO, <InvestigationCasePage />)} />
        <Route path="/security/purge" element={r(CSO, <PurgePage />)} />
        <Route path="/security/blocklist" element={r(CSO, <BlocklistPage />)} />

        {/* Site Administrator */}
        <Route path="/admin" element={r(SA, <AdminDashboard />)} />
        <Route path="/admin/users" element={r(SA, <UsersPage />)} />
        <Route path="/admin/policies" element={r(SA, <PoliciesPage />)} />
        <Route path="/admin/audit" element={r(SA, <AuditLogPage />)} />
        <Route path="/admin/audit/flagged" element={r(SA, <FlaggedAuditPage />)} />
        <Route path="/admin/access-review" element={r(SA, <AccessReviewListPage />)} />
        <Route path="/admin/access-review/:username" element={r(SA, <AccessReviewDetailPage />)} />
        <Route path="/admin/activity" element={r(SA, <ActivityListPage />)} />
        <Route path="/admin/activity/:id" element={r(SA, <ActivityDetailPage />)} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
