import { useEffect, useState } from 'react';
import Icon from '../../components/Icon';
import RideCard from '../../components/RideCard';
import { useAuth } from '../../context/AuthContext';
import { ridesApi } from '../../services/api';

export default function RideHistory() {
  const { user } = useAuth();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ridesApi.list({ riderId: user.id }).then(setRides).finally(() => setLoading(false));
  }, [user.id]);

  const completed = rides.filter((r) => r.status === 'completed');
  const earned = completed.reduce((s, r) => s + r.fare, 0);

  return (
    <>
      <div className="stat-grid">
        <div className="stat-card"><span>Trips</span><b>{rides.length}</b></div>
        <div className="stat-card"><span>Completed</span><b>{completed.length}</b></div>
        <div className="stat-card"><span>Earned</span><b>LKR {earned.toLocaleString()}</b></div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Your Rides</h3></div>
        {loading && <p className="muted">Loading…</p>}
        {!loading && rides.map((r) => <RideCard key={r.id} ride={r} person="customer" />)}
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
