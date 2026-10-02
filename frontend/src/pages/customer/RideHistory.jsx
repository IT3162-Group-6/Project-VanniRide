import { useEffect, useMemo, useState } from 'react';
import Icon from '../../components/Icon';
import RideCard from '../../components/RideCard';
import { useAuth } from '../../context/AuthContext';
import { ridesApi } from '../../services/api';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function RideHistory() {
  const { user } = useAuth();
  const [rides, setRides] = useState([]);
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ridesApi.list({ customerId: user.id }).then(setRides).finally(() => setLoading(false));
  }, [user.id]);

  const shown = useMemo(
    () => (tab === 'all' ? rides : rides.filter((r) => r.status === tab)),
    [rides, tab],
  );

  return (
    <div className="card">
      <div className="card-head"><h3>Ride History</h3></div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="muted">Loading…</p>}
      {!loading && shown.map((r) => <RideCard key={r.id} ride={r} person="rider" />)}
      {!loading && shown.length === 0 && (
        <div className="empty">
          <div className="fi"><Icon name="list" /></div>
          <b>Nothing here yet</b>
          <p>Your past rides and deliveries will show up in this list.</p>
        </div>
      )}
    </div>
  );
}
