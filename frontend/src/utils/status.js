const STATUS = {
  pending: { label: 'Pending', cls: 'status-pending' },
  accepted: { label: 'Accepted', cls: 'status-ontheway' },
  ontheway: { label: 'On the way', cls: 'status-ontheway' },
  picked: { label: 'Picked up', cls: 'status-ontheway' },
  completed: { label: 'Completed', cls: 'status-completed' },
  delivered: { label: 'Delivered', cls: 'status-delivered' },
  cancelled: { label: 'Cancelled', cls: 'status-cancelled' },
  active: { label: 'Active', cls: 'status-completed' },
  suspended: { label: 'Suspended', cls: 'status-cancelled' },
};

export const statusLabel = (status) => STATUS[status]?.label || status;
export const statusClass = (status) => STATUS[status]?.cls || 'status-pending';
