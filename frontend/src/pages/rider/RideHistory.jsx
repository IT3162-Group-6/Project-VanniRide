import { useEffect, useState } from 'react';
import Icon from '../../components/Icon';
import RideCard from '../../components/RideCard';
import { useAuth } from '../../context/AuthContext';
import { riderApi, ridesApi } from '../../services/api';
import { useAppState } from '../../context/AppState';

export default function RideHistory() {
  const { user } = useAuth();
  const { showToast } = useAppState();
  const [rides, setRides] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([ridesApi.history(), riderApi.earnings()])
      .then(([history, result]) => { setRides(history.rides); setEarnings(result.summary); })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [user.id]);

  const completed = rides.filter((r) => r.status === 'completed');
  async function confirm(rideId) {
    try {
      const payment = await ridesApi.confirmCashPayment(rideId);
      setRides((current) => current.map((ride) => ride.id === rideId ? { ...ride, payment } : ride));
      const result = await riderApi.earnings(); setEarnings(result.summary);
      showToast('Cash payment confirmed');
    } catch (requestError) { setError(requestError.message); }
  }

  return (
    <>
      <div className="stat-grid">
        <div className="stat-card"><span>Trips</span><b>{rides.length}</b></div>
        <div className="stat-card"><span>Completed</span><b>{completed.length}</b></div>
        <div className="stat-card"><span>Confirmed earnings</span><b>LKR {Number(earnings?.totalEarnings || 0).toLocaleString()}</b></div>
        <div className="stat-card"><span>Pending cash</span><b>LKR {Number(earnings?.pendingReceiptAmount || 0).toLocaleString()}</b></div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Your Rides</h3></div>
        {error && <div className="alert alert-error">{error}</div>}
        {loading && <p className="muted">Loading…</p>}
        {!loading && rides.map((r) => <RideCard key={r.id} ride={r} person="customer" actions={r.status === 'completed' && r.payment?.status === 'pending' ? <button className="btn btn-outline btn-sm" onClick={() => confirm(r.id)}>Confirm cash</button> : null} />)}
        {!loading && rides.length === 0 && (
          <div className="empty">
            <div className="fi"><Icon name="clock" /></div>
            <b>No rides yet</b>
            <p>Completed trips and their earnings will be listed here.</p>
          </div>
        )}
      </div>
    </>
  );
}
