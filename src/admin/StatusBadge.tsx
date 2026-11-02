import type { VersionStatus } from '../lib/database.types'

const TEXT: Record<VersionStatus, string> = {
  draft: 'Draft', approved: 'Live', superseded: 'Replaced', retired: 'Retired',
}

export function StatusBadge({ status }: { status: VersionStatus }) {
  return <span className={`badge badge--${status}`}>{TEXT[status]}</span>
}
