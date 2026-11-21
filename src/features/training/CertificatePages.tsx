// UC33 Generate Training Certificates: generate page, My Certificates, and print view.
// "Download Certificate" opens a print-styled page (simulated PDF; use the browser's Save as PDF).

import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Award, Download, Printer, ShieldCheck } from 'lucide-react'
import { useDemo, useMe, pushAudit } from '../../store/DemoStore'
import { EmptyState, PageHeader } from '../../components/ui/Card'
import { Button, LinkButton } from '../../components/ui/Button'
import { Banner } from '../../components/ui/Banner'
import { MessageDialog } from '../../components/ui/Dialog'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { fmtDate, nowIso } from '../../lib/dates'
import { certId } from '../../lib/ids'

const ORG = 'Montclair State University, PhishGuard Security Awareness Program'

function CertificateCard({ name, module, completed, issued, id }: { name: string; module: string; completed: string; issued: string | null; id?: string }) {
  return (
    <div className="mx-auto max-w-2xl rounded-xl border-4 border-double border-accent-700 bg-white p-10 text-center shadow-sm print:shadow-none">
      <ShieldCheck className="mx-auto h-10 w-10 text-accent-700" aria-hidden />
      <div className="mt-2 text-sm font-semibold uppercase tracking-[0.2em] text-accent-800">Certificate of Completion</div>
      <p className="mt-6 text-slate-600">This certifies that</p>
      <p className="mt-1 text-3xl font-semibold text-slate-900">{name}</p>
      <p className="mt-4 text-slate-600">has successfully completed the training module</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{module}</p>
      <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-slate-500">Completion date</div>
          <div className="font-medium">{fmtDate(completed)}</div>
        </div>
        <div>
          <div className="text-slate-500">Issue date</div>
          <div className="font-medium">{issued ? fmtDate(issued) : 'On generation'}</div>
        </div>
      </div>
      <p className="mt-6 text-sm text-slate-600">Issued by {ORG}</p>
      {id && <p className="mt-1 font-mono text-xs text-slate-400">Certificate ID {id}</p>}
    </div>
  )
}

export function GenerateCertificatePage() {
  const { moduleId } = useParams()
  const { state, mutate, simulate } = useDemo()
  const me = useMe()
  const nav = useNavigate()
  const m = state.modules.find((x) => x.id === moduleId)
  const a = state.assignments.find((x) => x.moduleId === moduleId && x.username === me.username)
  const existing = a ? state.certificates.find((c) => c.assignmentId === a.id) : undefined
  const [generated, setGenerated] = useState<string | null>(null)
  const [canceled, setCanceled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const back = { to: '/my-training', label: 'My Training' }
  if (!m || !a) return (<><PageHeader title="Generate Certificate" uc="UC33" back={back} /><Banner tone="error" title="Unauthorized Certificate Request. Training Record Does Not Match Your Account." /></>)

  const generate = async () => {
    setBusy(true)
    const r = await simulate('save')
    setBusy(false)
    if (r !== 'ok') return setError('Unable to Save Training Certificate. Please Try Again.')
    const id = certId()
    mutate((s) => {
      s.certificates.push({ id, username: me.username, moduleId: m.id, assignmentId: a.id, completionDate: a.completedAt ?? nowIso(), issueDate: nowIso() })
      pushAudit(s, me, 'Certificate Issued', me.username, { newValue: `${m.title} (${id})` })
    })
    setGenerated(id)
  }

  let body
  if (generated || existing) {
    const id = generated ?? existing!.id
    body = (
      <>
        {generated ? <Banner tone="success" className="mb-6" title="Training Certificate Generated Successfully." /> : <Banner tone="info" className="mb-6" title="Certificate Already Issued. Please Access Your Existing Certificate Under My Certificates." />}
        <CertificateCard name={me.name} module={m.title} completed={a.completedAt!} issued={existing?.issueDate ?? nowIso()} id={id} />
        <div className="mt-6 flex justify-center gap-3">
          <LinkButton to={`/print/certificate/${id}`}>
            <Download className="h-4 w-4" /> Download Certificate
          </LinkButton>
          <LinkButton to="/my-certificates" variant="secondary">
            View My Certificates
          </LinkButton>
          <Button variant="ghost" onClick={() => nav('/home')}>
            Done
          </Button>
        </div>
      </>
    )
  } else if (a.status !== 'Completed') {
    body = <Banner tone="error" title="Training Module Incomplete. Please Complete All Required Sections Before Generating a Certificate." action={<LinkButton to={`/my-training/${m.id}`} variant="secondary">Continue module</LinkButton>} />
  } else if (!m.certifiable) {
    body = <Banner tone="warning" title="Certificate Unavailable. This Training Module Does Not Offer Certification." />
  } else if (canceled) {
    body = <Banner tone="info" title="Certificate Generation Canceled." action={<Button variant="secondary" onClick={() => setCanceled(false)}>Start over</Button>}>If the information was wrong, contact your Site Administrator to request a correction.</Banner>
  } else {
    body = (
      <>
        <Banner tone="success" className="mb-6" title="Training Requirements Satisfied. Certificate Available for Generation." />
        <p className="mb-3 text-center text-sm text-slate-600">Preview. Check your name, module, and dates before generating.</p>
        <CertificateCard name={me.name} module={m.title} completed={a.completedAt!} issued={null} />
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={generate} loading={busy}>
            <Award className="h-4 w-4" /> Confirm and Generate Certificate
          </Button>
          <Button variant="secondary" onClick={() => setCanceled(true)} disabled={busy}>
            Cancel
          </Button>
        </div>
      </>
    )
  }
  return (
    <>
      <PageHeader title={`Certificate: ${m.title}`} uc="UC33" back={back} />
      {body}
      <MessageDialog open={!!error} onClose={() => setError(null)} tone="error" title={error ?? ''} okLabel="Retry" />
    </>
  )
}

export function MyCertificatesPage() {
  const { state } = useDemo()
  const me = useMe()
  const mine = state.certificates.filter((c) => c.username === me.username)
  return (
    <>
      <PageHeader title="My Certificates" uc="UC33" subtitle="Certificates issued for completed training." />
      {mine.length === 0 ? (
        <EmptyState>
          No certificates yet. Complete a module in <Link to="/my-training" className="text-accent-700 underline">My Training</Link> to generate one.
        </EmptyState>
      ) : (
        <DataTable
          rows={mine}
          rowKey={(c) => c.id}
          empty=""
          columns={[
            { key: 'id', header: 'Certificate ID', render: (c) => <span className="font-mono">{c.id}</span> },
            { key: 'm', header: 'Training module', render: (c) => state.modules.find((m) => m.id === c.moduleId)?.title },
            { key: 'c', header: 'Completed', render: (c) => fmtDate(c.completionDate) },
            { key: 'i', header: 'Issued', render: (c) => fmtDate(c.issueDate) },
            { key: 's', header: 'Status', render: () => <StatusBadge status="Issued" /> },
            { key: 'a', header: '', render: (c) => <LinkButton to={`/print/certificate/${c.id}`} variant="secondary"><Download className="h-4 w-4" /> Download</LinkButton> },
          ]}
        />
      )}
    </>
  )
}

/** Print-styled certificate page standing in for a PDF download (simulated). */
export function CertificatePrintPage() {
  const { certId: id } = useParams()
  const { state } = useDemo()
  const c = state.certificates.find((x) => x.id === id)
  const u = c && state.users.find((x) => x.username === c.username)
  const m = c && state.modules.find((x) => x.id === c.moduleId)
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10 print:bg-white print:p-0">
      <div className="no-print mx-auto mb-6 flex max-w-2xl items-center justify-between">
        <Link to="/my-certificates" className="text-sm text-accent-700 hover:underline">
          Back to My Certificates
        </Link>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print or Save as PDF
        </Button>
      </div>
      {c && u && m ? <CertificateCard name={u.name} module={m.title} completed={c.completionDate} issued={c.issueDate} id={c.id} /> : <Banner tone="error" title="Certificate Download Failed. Please Try Again." />}
      <p className="no-print mt-4 text-center text-xs text-slate-500">Prototype: PDF generation is simulated with the browser's print dialog.</p>
    </div>
  )
}
