// My Reports: the user's UC15 email reports and UC29 phone/text reports.

import { useState } from 'react'
import { useDemo, useMe } from '../../store/DemoStore'
import { PageHeader } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { DetailList } from '../../components/ui/Card'
import { PlainSelect } from '../../components/ui/RequirementField'
import { fmtDateTime } from '../../lib/dates'
import { LinkButton } from '../../components/ui/Button'
import type { Report } from '../../store/types'

export const reportType = (r: Report) => (r.kind === 'email' ? 'Email' : r.incidentType)
export const reportClassification = (r: Report) => (r.kind === 'email' ? (r.status.startsWith('Classified - ') ? r.status.replace('Classified - ', '') : r.status.startsWith('Resolved, email') ? 'Phishing' : '-') : (r.classification ?? '-'))

export default function MyReportsPage() {
  const { state } = useDemo()
  const me = useMe()
  const [type, setType] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const rows = state.reports.filter((r) => r.reporter === me.username && (!type || reportType(r) === type))
  return (
    <>
      <PageHeader
        title="My Reports"
        subtitle="Track the status of emails and phone or text incidents you reported."
        actions={
          <>
            <LinkButton to="/report/email" variant="secondary">
              Report Email
            </LinkButton>
            <LinkButton to="/report/phone-text" variant="secondary">
              Report Phone/Text
            </LinkButton>
          </>
        }
      />
      <div className="mb-4 w-56">
        <label htmlFor="mr-type" className="sr-only">
          Filter by type
        </label>
        <PlainSelect id="mr-type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          <option>Email</option>
          <option>Phone Call</option>
          <option>Text Message</option>
        </PlainSelect>
      </div>
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        empty="You have not submitted any reports."
        initialSort={{ key: 'date', dir: 'desc' }}
        onRowClick={(r) => setOpen((o) => (o === r.id ? null : r.id))}
        selectedKey={open}
        expanded={(r) =>
          open === r.id ? (
            <DetailList
              items={
                r.kind === 'email'
                  ? [
                      ['Sender', r.sender],
                      ['Subject', r.subject],
                      ['Reviewed by', r.classifiedBy ? `${r.classifiedBy} on ${fmtDateTime(r.classifiedAt)}` : 'Not yet reviewed'],
                    ]
                  : [
                      ['Phone number', r.phone ?? 'Unknown/Blocked Number'],
                      ['Occurred', fmtDateTime(r.occurredAt)],
                      ['Description', r.description],
                      ['Reviewer', r.reviewer ?? 'Not yet reviewed'],
                    ]
              }
            />
          ) : null
        }
        columns={[
          { key: 'id', header: 'Report ID', render: (r) => <span className="font-mono">{r.id}</span>, sort: (r) => r.id },
          { key: 'type', header: 'Type', render: reportType, sort: reportType },
          { key: 'date', header: 'Submitted', render: (r) => fmtDateTime(r.submittedAt), sort: (r) => r.submittedAt },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} />, sort: (r) => r.status },
          { key: 'class', header: 'Classification', render: reportClassification },
        ]}
      />
    </>
  )
}
