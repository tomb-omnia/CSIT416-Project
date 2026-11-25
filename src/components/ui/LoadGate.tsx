// "Form / details cannot be loaded" alternate (UC25 4A1, UC26 4A1, UC27 5A1, UC28 4A1).
// Driven by the Demo Controls "Forms and records" flag. "Try Again" re-checks the flag, so the
// presenter can turn the flag off and then show recovery.

import { useState, type ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'
import { useDemo } from '../../store/DemoStore'
import { Banner } from './Banner'
import { Button } from './Button'

export function LoadGate({ what, children }: { what: string; children: ReactNode }) {
  const { flags } = useDemo()
  const [failed, setFailed] = useState(!!flags.unavailable.forms)
  if (!failed) return <>{children}</>
  return (
    <Banner
      tone="error"
      title={`The ${what} could not be loaded.`}
      action={
        <Button size="sm" variant="secondary" onClick={() => setFailed(!!flags.unavailable.forms)}>
          <RotateCcw className="h-4 w-4" /> Try Again
        </Button>
      }
    >
      Please try again.
    </Banner>
  )
}
