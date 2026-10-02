import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import RideCard from '../../components/RideCard';
import RiderArt from '../../components/RiderArt';
import { useAuth } from '../../context/AuthContext';
import { useAppState } from '../../context/AppState';
import { ridesApi } from '../../services/api';

export default function RiderDashboard() {
  const { user, updateUser } = useAuth();
  const { showToast } = useAppState();
  const navigate = useNavigate();
  const [available, setAvailable] = useState([]);
  const [mine, setMine] = useState([]);
  const [active, setActive] = useState(null);

  useEffect(() => {
    ridesApi.list({ available: true }).then(setAvailable);
    ridesApi.list({ riderId: user.id }).then(setMine);
    ridesApi.active({ riderId: user.id }).then(setActive);
  }, [user.id]);

  const completed = mine.filter((r) => r.status === 'completed');

  async function toggleOnline() {
    const next = !user.online;
    await updateUser({ online: next });
    showToast(next ? "You're online — requests will appear" : "You're offline");
  }

  return (
    <>
      <div className="greeting-card">
        <div>
          <h2>Hi {user.name.split(' ')[0]}!</h2>
          <p>{user.online ? 'You are online and receiving requests.' : 'You are offline right now.'}</p>
          <button className={`btn ${user.online ? 'btn-outline' : 'btn-primary'} btn-sm`} style={{ marginTop: 12 }} onClick={toggleOnline}>
            {user.online ? 'Go offline' : 'Go online'}
          </button>
        </div>
        <div className="greeting-side">
          <span className={`online-dot ${user.online ? 'on' : ''}`} />
          <div className="greeting-art"><RiderArt /></div>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card"><span>Earnings</span><b>LKR {Number(user.earnings || 0).toLocaleString()}</b></div>
        <div className="stat-card"><span>Completed rides</span><b>{completed.length}</b></div>
        <div className="stat-card"><span>Rating</span><b>{user.rating || 5}★</b></div>
        <div className="stat-card"><span>Open requests</span><b>{available.length}</b></div>
      </div>

      {active && (
        <div className="track-banner" style={{ cursor: 'pointer' }} onClick={() => navigate('/rider/active')}>
          <Icon name="route" />
          <div>Active ride<span>{active.pickup} → {active.dropoff} · tap to manage</span></div>
        </div>
      )}

      <div className="dash-grid">
        <div className="card">
          <div className="card-head"><h3>New Requests Nearby</h3><Link to="/rider/requests">View All</Link></div>
          {available.slice(0, 4).map((r) => (
            <RideCard key={r.id} ride={r} person="customer" to={`/rider/requests/${r.id}`} />
          ))}
          {available.length === 0 && <p className="muted">No open requests right now.</p>}
        </div>

        <div className="card">
          <div className="card-head"><h3>Your Recent Rides</h3><Link to="/rider/history">History</Link></div>
          {mine.slice(0, 4).map((r) => <RideCard key={r.id} ride={r} person="customer" />)}
          {mine.length === 0 && <p className="muted">You haven't taken any rides yet.</p>}
        </div>
      </div>
    </>
  );
}
