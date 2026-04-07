import { cn } from '@/lib/utils';

type LoanStatus = 'pending' | 'approved' | 'rejected' | 'active' | 'closed' | 'defaulted';

const statusConfig: Record<LoanStatus, { label: string; className: string }> = {
  pending: { label: 'Pending Review', className: 'bg-warning/15 text-warning' },
  approved: { label: 'Approved', className: 'bg-success/15 text-success' },
  rejected: { label: 'Rejected', className: 'bg-destructive/15 text-destructive' },
  active: { label: 'Active', className: 'bg-info/15 text-info' },
  closed: { label: 'Closed', className: 'bg-muted text-muted-foreground' },
  defaulted: { label: 'Defaulted', className: 'bg-destructive/15 text-destructive' },
};

const LoanStatusBadge = ({ status }: { status: LoanStatus }) => {
  const config = statusConfig[status] || statusConfig.pending;
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', config.className)}>
      {config.label}
    </span>
  );
};

export default LoanStatusBadge;
