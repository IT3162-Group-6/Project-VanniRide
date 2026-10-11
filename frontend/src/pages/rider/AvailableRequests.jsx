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
  const [changingId, setChangingId] = useState(null);

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

  async function setIgnored(ride, ignored) {
    setChangingId(ride.id);
    try {
      if (ignored) await ridesApi.ignore(ride.id);
      else await ridesApi.restore(ride.id);
      setRides((current) => {
        const updated = current.map((item) =>
          item.id === ride.id
            ? { ...item, ignored, ignoredAt: ignored ? new Date().toISOString() : null }
            : item
        );
        return updated.sort((left, right) => Number(left.ignored) - Number(right.ignored));
      });
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setChangingId(null);
    }
  }

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
        <RideCard
          key={r.id}
          ride={r}
          person="customer"
          to={`/rider/requests/${r.id}`}
          muted={r.ignored}
          actions={(
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setIgnored(r, !r.ignored)}
              disabled={changingId === r.id}
            >
              {changingId === r.id ? 'Saving…' : r.ignored ? 'Restore' : 'Ignore'}
            </button>
          )}
        />
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
