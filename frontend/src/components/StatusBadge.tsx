import clsx from 'clsx';
import type { ApplicationStatus } from '@/types';


const FILL: Record<ApplicationStatus, 'gold' | 'brown' | 'outline'> = {
  DRAFT:                   'outline',
  SUBMITTED:               'outline',
  UNDER_REVIEW:            'outline',
  PENDING_ADDITIONAL_INFO: 'brown',
  REVIEWED:                'outline',
  APPROVED:                'gold',
  REJECTED:                'brown',
};

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  PENDING_ADDITIONAL_INFO: 'Awaiting info',
  REVIEWED: 'Reviewed',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

interface StatusBadgeProps {
  status: ApplicationStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const fill = FILL[status];
  return (
    <span
      data-testid={`status-badge-${status}`}
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase',
        fill === 'gold'    && 'bg-gold text-white',
        fill === 'brown'   && 'bg-brown text-white',
        fill === 'outline' && 'bg-white text-brown border border-brown',
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
