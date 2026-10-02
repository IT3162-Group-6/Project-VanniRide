import { useEffect, useMemo, useState } from 'react';
import Icon from '../../components/Icon';
import RideCard from '../../components/RideCard';
import { ridesApi } from '../../services/api';
import { useAppState } from '../../context/AppState';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function RideHistory() {
  const { showToast } = useAppState();
  const [rides, setRides] = useState([]);
  const [summary, setSummary] = useState(null);
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState({});

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

  async function submitRating(rideId) {
    const draft = drafts[rideId] || {};
    if (!draft.rating) { setError('Choose a rating from 1 to 5.'); return; }
    try {
      const rating = await ridesApi.rate(rideId, { rating: Number(draft.rating), review: draft.review || '' });
      setRides((current) => current.map((ride) => ride.id === rideId ? { ...ride, rating } : ride));
      showToast('Rider rating submitted'); setError('');
    } catch (requestError) { setError(requestError.message); }
  }

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
          {ride.status === 'completed' && ride.rider && !ride.rating && (
            <div className="rating-panel">
              <label>Rate your rider</label>
              <div className="rating-stars">{[1,2,3,4,5].map((value)=><button type="button" key={value} className={(drafts[ride.id]?.rating||0)>=value?'selected':''} onClick={()=>setDrafts({...drafts,[ride.id]:{...drafts[ride.id],rating:value}})}>★</button>)}</div>
              <input placeholder="Optional review" maxLength={1000} value={drafts[ride.id]?.review||''} onChange={(event)=>setDrafts({...drafts,[ride.id]:{...drafts[ride.id],review:event.target.value}})}/>
              <button className="btn btn-outline btn-sm" onClick={()=>submitRating(ride.id)}>Submit rating</button>
            </div>
          )}
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
