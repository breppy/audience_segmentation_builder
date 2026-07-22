import type { SegmentStatus } from '../types';

const STATUS_LABELS: Record<SegmentStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  feasibility_review: 'DevIT Review',
  building: 'Building',
  locked: 'Locked',
  active: 'Active',
  retired: 'Retired',
  on_hold: 'On Hold',
};

const STATUS_CLASS: Record<SegmentStatus, string> = {
  draft: 'badge-draft',
  pending_approval: 'badge-pending',
  feasibility_review: 'badge-review',
  building: 'badge-building',
  locked: 'badge-locked',
  active: 'badge-active',
  retired: 'badge-retired',
  on_hold: 'badge-hold',
};

export function StatusBadge({ status }: { status: SegmentStatus }) {
  return (
    <span className={`badge ${STATUS_CLASS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
