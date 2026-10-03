import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import RideCard from '../../components/RideCard';
import RiderArt from '../../components/RiderArt';
import { useAuth } from '../../context/AuthContext';
import { useAppState } from '../../context/AppState';
import { ratingApi, riderApi, ridesApi } from '../../services/api';

export default function RiderDashboard() {
  const { user, setRiderAvailability } = useAuth();
  const { showToast } = useAppState();
  const navigate = useNavigate();
  const [available, setAvailable] = useState([]);
  const [mine, setMine] = useState([]);
  const [active, setActive] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [rating, setRating] = useState(null);
  const [error, setError] = useState('');
  const approved = user.riderProfile?.approvalStatus === 'approved';
  const riderBusy = user.riderProfile?.availabilityStatus === 'busy';

  useEffect(() => {
    Promise.all([
      approved && user.online ? ridesApi.list({ available: true }) : Promise.resolve([]),
      ridesApi.history(),
      riderApi.earnings(),
      ratingApi.forRider(user.id),
    ]).then(([openRides, history, earningsResult, ratingResult]) => {
      setAvailable(openRides);
      setMine(history.rides);
      setActive(history.rides.find((ride) => ['accepted', 'ontheway', 'picked'].includes(ride.status)) || null);
      setEarnings(earningsResult.summary);
      setRating(ratingResult.summary);
    }).catch((requestError) => setError(requestError.message));
  }, [approved, user.id, user.online]);

  const completed = mine.filter((r) => r.status === 'completed');

  async function toggleOnline() {
    const next = !user.online;
    try {
      await setRiderAvailability(next);
    } catch (requestError) {
      setError(requestError.message);
      return;
    }
    showToast(next ? "You're online — requests will appear" : "You're offline");
  }

  return (
    <>
      <div className="greeting-card">
        <div>
          <h2>Hi {user.name.split(' ')[0]}!</h2>
          <p>{riderBusy ? 'You are currently handling a ride.' : user.online ? 'You are online and receiving requests.' : 'You are offline right now.'}</p>
          <button disabled={!approved || riderBusy} className={`btn ${user.online ? 'btn-outline' : 'btn-primary'} btn-sm`} style={{ marginTop: 12 }} onClick={toggleOnline}>
            {riderBusy ? 'Busy' : user.online ? 'Go offline' : 'Go online'}
          </button>
        </div>
        <div className="greeting-side">
          <span className={`online-dot ${user.online ? 'on' : ''}`} />
          <div className="greeting-art"><RiderArt /></div>
        </div>
      </div>

      {!approved && <div className="alert alert-error">Rider approval is {user.riderProfile?.approvalStatus || 'pending'}. You can update your vehicle profile while waiting.</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="stat-grid">
        <div className="stat-card"><span>Confirmed earnings</span><b>LKR {Number(earnings?.totalEarnings || 0).toLocaleString()}</b></div>
        <div className="stat-card"><span>Completed rides</span><b>{completed.length}</b></div>
        <div className="stat-card"><span>Rating</span><b>{rating?.averageRating ? `${rating.averageRating}★` : '—'}</b></div>
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
