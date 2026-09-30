import { useNavigate } from 'react-router-dom';
import Icon from './Icon';
import StatusBadge from './StatusBadge';

function when(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/**
 * One ride/delivery row. Used by customer, rider and admin lists.
 * `to`      – optional route to open on click
 * `person`  – 'rider' | 'customer' | null, which side to show under the title
 * `actions` – optional nodes rendered on the right
 */
export default function RideCard({ ride, to, person = null, actions = null }) {
  const navigate = useNavigate();
  const other = person === 'rider' ? ride.rider : person === 'customer' ? ride.customer : null;

  return (
    <div
      className={`req-row ${to ? 'req-row-link' : ''}`}
      onClick={to ? () => navigate(to) : undefined}
    >
      <div className="req-icon"><Icon name={ride.type === 'delivery' ? 'package' : 'car'} /></div>
      <div className="req-meta">
        <b>{ride.pickup} → {ride.dropoff}</b>
        <span>
          {ride.code} · {when(ride.createdAt)}
          {other ? ` · ${person === 'rider' ? 'Rider' : 'Customer'}: ${other.name}` : ''}
        </span>
      </div>
      <div className="req-right">
        <b className="req-fare">LKR {Number(ride.fare).toFixed(2)}</b>
        <StatusBadge status={ride.status} />
      </div>
      {actions ? <div className="req-actions" onClick={(e) => e.stopPropagation()}>{actions}</div> : null}
    </div>
  );
}
