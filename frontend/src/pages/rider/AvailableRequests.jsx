import { useCallback, useEffect, useState } from 'react';
import Icon from '../../components/Icon';
import RideCard from '../../components/RideCard';
import { ridesApi } from '../../services/api';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'ride', label: 'Rides' },
  { key: 'delivery', label: 'Deliveries' },
];

export default function AvailableRequests() {
  const [rides, setRides] = useState([]);
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    ridesApi.list({ available: true })
      .then((items) => { setRides(items); setError(''); })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const initial = setTimeout(load, 0);
    const timer = setInterval(load, 5000);
    return () => { clearTimeout(initial); clearInterval(timer); };
  }, [load]);

  const shown = tab === 'all' ? rides : rides.filter((r) => r.type === tab);

  return (
    <div className="card">
      <div className="card-head"><h3>Available Requests</h3></div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {loading && <p className="muted">Loading…</p>}
      {!loading && shown.map((r) => (
        <RideCard key={r.id} ride={r} person="customer" to={`/rider/requests/${r.id}`} />
      ))}
      {!loading && shown.length === 0 && (
        <div className="empty">
          <div className="fi"><Icon name="list" /></div>
          <b>No open requests</b>
          <p>New ride and delivery requests from students will appear here.</p>
        </div>
      )}
    </div>
  );
}
