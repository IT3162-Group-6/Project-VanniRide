import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../../components/StatusBadge';
import { adminApi } from '../../services/api';

const TABS = ['all', 'pending', 'ontheway', 'completed', 'cancelled'];
const when = (iso) => new Date(iso).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function Rides() {
  const navigate = useNavigate();
  const [rides, setRides] = useState([]);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');

  useEffect(() => { adminApi.rides().then(setRides); }, []);

  const shown = useMemo(() => rides
    .filter((r) => (tab === 'all' ? true : r.status === tab))
    .filter((r) => (r.code + r.pickup + r.dropoff + (r.customer?.name || '')).toLowerCase().includes(q.toLowerCase())),
  [rides, tab, q]);

  return (
    <div className="card">
      <div className="card-head"><h3>Rides ({rides.length})</h3></div>

      <div className="toolbar">
        <div className="tabs">
          {TABS.map((t) => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} style={{ textTransform: 'capitalize' }} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
        <input className="search-input" placeholder="Search code, route, customer…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Code</th><th>Route</th><th>Customer</th><th>Rider</th><th>Type</th><th>Fare</th><th>Status</th><th>Created</th></tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="row-link" onClick={() => navigate(`/admin/rides/${r.id}`)}>
                <td><b>{r.code}</b></td>
                <td>{r.pickup} → {r.dropoff}</td>
                <td>{r.customer?.name || '—'}</td>
                <td>{r.rider?.name || <span className="muted">Unassigned</span>}</td>
                <td style={{ textTransform: 'capitalize' }}>{r.type}</td>
                <td>LKR {r.fare.toFixed(2)}</td>
                <td><StatusBadge status={r.status} /></td>
                <td>{when(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <p className="muted">No rides match this filter.</p>}
      </div>
    </div>
  );
}
