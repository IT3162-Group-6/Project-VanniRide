import { statusClass, statusLabel } from '../utils/status';

export default function StatusBadge({ status }) {
  return <span className={`status-pill ${statusClass(status)}`}>{statusLabel(status)}</span>;
}
