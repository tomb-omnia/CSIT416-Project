// UC20 Manage Domain Blocklist. The blocklist feeds the UC16, UC17, and UC31 mock rules.

import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search, Trash2 } from 'lucide-react'
import { useDemo, useMe, pushAudit } from '../../store/DemoStore'
import { PageHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { PlainInput, TextArea, TextField } from '../../components/ui/RequirementField'
import { ConfirmDialog, Dialog, MessageDialog } from '../../components/ui/Dialog'
import { DataTable } from '../../components/ui/DataTable'
import * as V from '../../lib/validators'
import { REQ } from '../../lib/validators'
import { fmtDate, nowIso } from '../../lib/dates'
import { useForm } from '../../components/ui/useForm'

export default function BlocklistPage() {
  const { state, mutate, simulate } = useDemo()
  const me = useMe()
  const [params, setParams] = useSearchParams()
  const prefill = params.get('add')
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(!!prefill)
  const [remove, setRemove] = useState<string | null>(null)
  const [dialog, setDialog] = useState<null | 'saved' | 'failed'>(null)
  const [busy, setBusy] = useState(false)
  const form = useForm({ domain: prefill ?? '', reason: '' })
  const list = state.blocklist.map((b) => b.domain)
  const errors = { domain: V.blockDomain(form.values.domain, list), reason: V.blockReason(form.values.reason) }

  const rows = state.blocklist.filter((b) => !q.trim() || b.domain.includes(q.trim().toLowerCase()) || b.reason.toLowerCase().includes(q.trim().toLowerCase()))

  const closeAdd = () => {
    setAdding(false)
    form.reset({ domain: '', reason: '' })
    if (prefill) setParams({})
  }

  const add = async () => {
    // 8A1: list the missed requirements in one dialog, then return to the first failing field.
    if (!form.submit(errors)) return
    setBusy(true)
    const r = await simulate('save')
    setBusy(false)
    if (r !== 'ok') return setDialog('failed')
    const domain = form.values.domain.trim().toLowerCase()
    mutate((s) => {
      s.blocklist.unshift({ domain, reason: form.values.reason.trim(), blockedAt: nowIso(), blockedBy: me.username })
      pushAudit(s, me, 'Domain Blocked', domain, { newValue: form.values.reason.trim() })
    })
    closeAdd()
    setDialog('saved')
  }

  const doRemove = () => {
    const d = remove!
    mutate((s) => {
      s.blocklist = s.blocklist.filter((b) => b.domain !== d)
      pushAudit(s, me, 'Domain Unblocked', d, { oldValue: 'Blocked', newValue: 'Removed' })
    })
    setRemove(null)
  }

  return (
    <>
      <PageHeader
        title="Domain Blocklist"
        uc="UC20"
        subtitle="Links, attachments, and senders from these domains are automatically treated as malicious."
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add Domain
          </Button>
        }
      />
      <div className="mb-4 max-w-md">
        <label htmlFor="bl-search" className="sr-only">
          Search domains
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden />
          <PlainInput id="bl-search" placeholder="Search domains" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" invalid={!!q && rows.length === 0} />
        </div>
        {q && rows.length === 0 && <p className="mt-1.5 text-sm font-medium text-red-700">No matching domains were found</p>}
      </div>
      <DataTable
        rows={rows}
        rowKey={(r) => r.domain}
        empty={q ? <span className="text-red-700">No matching domains were found</span> : 'The blocklist is empty.'}
        initialSort={{ key: 'date', dir: 'desc' }}
        columns={[
          { key: 'domain', header: 'Domain', render: (r) => <span className="font-mono">{r.domain}</span>, sort: (r) => r.domain },
          { key: 'reason', header: 'Reason', render: (r) => <span className="text-slate-700">{r.reason}</span> },
          { key: 'date', header: 'Date blocked', render: (r) => fmtDate(r.blockedAt), sort: (r) => r.blockedAt },
          { key: 'by', header: 'Blocked by', render: (r) => r.blockedBy, sort: (r) => r.blockedBy },
          {
            key: 'rm',
            header: <span className="sr-only">Actions</span>,
            render: (r) => (
              <Button size="sm" variant="secondary" onClick={() => setRemove(r.domain)}>
                <Trash2 className="h-3.5 w-3.5" /> Remove Domain
              </Button>
            ),
          },
        ]}
      />

      <Dialog
        open={adding}
        onClose={closeAdd}
        title="Add Domain"
        wide
        footer={
          <>
            <Button variant="secondary" onClick={closeAdd}>
              Cancel
            </Button>
            <Button onClick={add} loading={busy}>
              Add to Existing Blocklist
            </Button>
          </>
        }
      >
        <TextField name="domain" label="Domain name" placeholder="examplesite.com" value={form.values.domain} onChange={(e) => form.set('domain', e.target.value)} status={form.status('domain', errors.domain)} base={REQ.domain} error={errors.domain} />
        {(!errors.domain || form.touched.reason) && (
          <TextArea name="reason" label="Reason for blocking" rows={3} value={form.values.reason} onChange={(e) => form.set('reason', e.target.value)} status={form.status('reason', errors.reason)} base={REQ.blockReason} error={errors.reason} counter={{ value: form.values.reason.length, max: 150 }} />
        )}
      </Dialog>
      {/* 8A1 uses its own wording, so render the summary here instead of ValidationSummaryDialog. */}
      <Dialog open={!!form.summary} onClose={form.closeSummary} tone="error" title="Required information is missing">
        <p className="text-red-700">Required information is missing: {form.summary?.items.join('; ')}</p>
      </Dialog>
      <ConfirmDialog open={!!remove} title="Remove domain" message={`Are you sure you want to remove ${remove} from the blocklist?`} confirmLabel="Confirm" cancelLabel="Cancel" danger onCancel={() => setRemove(null)} onConfirm={doRemove} />
      <MessageDialog open={dialog === 'saved'} onClose={() => setDialog(null)} tone="success" title="Domain blocked" message="The domain has been blocked successfully." okLabel="Ok" />
      <MessageDialog open={dialog === 'failed'} onClose={() => setDialog(null)} tone="error" title="Not saved" message="Unable to save your changes. Please try again." />
    </>
  )
}
