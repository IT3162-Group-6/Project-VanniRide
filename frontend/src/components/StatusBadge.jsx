const MAP = {
  pending:   { label: 'Pending',    cls: 'status-pending' },
  accepted:  { label: 'Accepted',   cls: 'status-ontheway' },
  ontheway:  { label: 'On the way', cls: 'status-ontheway' },
  picked:    { label: 'Picked up',  cls: 'status-ontheway' },
  completed: { label: 'Completed',  cls: 'status-completed' },
  delivered: { label: 'Delivered',  cls: 'status-delivered' },
  cancelled: { label: 'Cancelled',  cls: 'status-cancelled' },
  active:    { label: 'Active',     cls: 'status-completed' },
  suspended: { label: 'Suspended',  cls: 'status-cancelled' },
};

export function statusLabel(status) { return MAP[status]?.label || status; }
export function statusClass(status) { return MAP[status]?.cls || 'status-pending'; }

export default function StatusBadge({ status }) {
  return <span className={`status-pill ${statusClass(status)}`}>{statusLabel(status)}</span>;
}
