import { useEffect, useMemo, useState } from 'react';
import Icon from '../../components/Icon';
import RideCard from '../../components/RideCard';
import { ridesApi } from '../../services/api';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function RideHistory() {
  const [rides, setRides] = useState([]);
  const [summary, setSummary] = useState(null);
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    ridesApi.history()
      .then((history) => {
        setRides(history.rides);
        setSummary(history.summary);
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  const shown = useMemo(
    () => (tab === 'all' ? rides : rides.filter((r) => r.status === tab)),
    [rides, tab],
  );

  return (
    <div className="card">
      <div className="card-head"><h3>Ride History</h3></div>

      {summary && (
        <div className="fare-summary history-summary">
          <div><span>Cash paid</span><b>LKR {Number(summary.payments.totalPaidAmount).toFixed(2)}</b></div>
          <div><span>Pending payments</span><b>{summary.payments.pending}</b></div>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="muted">Loading…</p>}
      {!loading && shown.map((ride) => (
        <div key={ride.id} className="history-entry">
          <RideCard ride={ride} person="rider" />
          <div className="history-entry-meta">
            <span>
              Cash: {ride.payment ? ride.payment.status : 'unavailable'}
              {ride.payment ? ` · LKR ${Number(ride.payment.amount).toFixed(2)}` : ''}
            </span>
            {ride.cancellation && <span>Cancelled: {ride.cancellation.reason}</span>}
            {ride.rating && <span>Your rating: {ride.rating.rating}★</span>}
          </div>
        </div>
      ))}
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
