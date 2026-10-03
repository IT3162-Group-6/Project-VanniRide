import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import RiderArt from '../../components/RiderArt';
import RideCard from '../../components/RideCard';
import { useAuth } from '../../context/AuthContext';
import { ridesApi } from '../../services/api';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rides, setRides] = useState([]);
  const [activeRides, setActiveRides] = useState([]);
  const [summary, setSummary] = useState(null);
  const [allowance, setAllowance] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    Promise.all([ridesApi.history(), ridesApi.cancellationAllowance()])
      .then(([history, cancellationAllowance]) => {
        if (!alive) return;
        setRides(history.rides);
        setSummary(history.summary);
        setAllowance(cancellationAllowance);
        setActiveRides(
          history.rides.filter((ride) =>
            ['pending', 'accepted', 'ontheway', 'picked'].includes(ride.status)
          )
        );
      })
      .catch((requestError) => alive && setError(requestError.message));
    return () => { alive = false; };
  }, [user.id]);

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const completed = rides.filter((r) => r.status === 'completed');

  return (
    <>
      <div className="greeting-card">
        <div>
          <h2>{greet}, {user.name.split(' ')[0]}!</h2>
          <p>Where will you go today?</p>
        </div>
        <div className="greeting-art"><RiderArt /></div>
      </div>

      <div className="action-tiles">
        <button className="action-tile" onClick={() => navigate('/customer/request?type=ride')}>
          <div className="fi"><Icon name="car" /></div>
          <div><b>Ride</b><span>Book a ride</span></div>
        </button>
        <button className="action-tile" onClick={() => navigate('/customer/request?type=delivery')}>
          <div className="fi"><Icon name="package" /></div>
          <div><b>Delivery</b><span>Send a delivery</span></div>
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {activeRides.map((active) => (
        <div key={active.id} className="track-banner" style={{ cursor: 'pointer' }} onClick={() => navigate(`/customer/active?rideId=${active.id}`)}>
          <Icon name={active.type === 'delivery' ? 'package' : 'route'} />
          <div>
            {active.type === 'delivery' ? 'Delivery' : 'Ride'} in progress
            <span>{active.pickup} → {active.dropoff} · tap to track</span>
          </div>
        </div>
      ))}

      <div className="stat-grid">
        <div className="stat-card"><span>Total rides</span><b>{summary?.rides.total ?? rides.length}</b></div>
        <div className="stat-card"><span>Completed</span><b>{summary?.rides.completed ?? completed.length}</b></div>
        <div className="stat-card"><span>Cash paid</span><b>LKR {Number(summary?.payments.totalPaidAmount || 0).toFixed(2)}</b></div>
      </div>

      <div className="dash-grid">
        <div className="card">
          <div className="card-head"><h3>Recent Requests</h3><Link to="/customer/history">View All</Link></div>
          {rides.slice(0, 4).map((r) => (
            <RideCard
              key={r.id}
              ride={r}
              person="rider"
              to={['pending', 'accepted', 'ontheway', 'picked'].includes(r.status) ? `/customer/active?rideId=${r.id}` : '/customer/history'}
            />
          ))}
          {rides.length === 0 && <p className="muted">No requests yet.</p>}
        </div>

        <div>
          <div className="card wallet-card">
            <div className="card-head"><h3>Cancellation Allowance</h3></div>
            <b>{allowance ? `${allowance.remaining} of ${allowance.limit}` : '—'}</b>
            <p className="muted" style={{ margin: '0 0 12px' }}>Remaining in the rolling one-hour window</p>
            <div className="fare-row"><span>Pending cash payments</span><span>{summary?.payments.pending ?? 0}</span></div>
            <Link to="/customer/history" className="btn btn-primary btn-block btn-sm" style={{ marginTop: 12 }}>View payment history</Link>
          </div>
          <div className="card" style={{ marginTop: 18 }}>
            <div className="card-head"><h3>Quick Links</h3></div>
            <div className="quick-links">
              <Link to="/customer/request"><Icon name="plus" size={16} /> New Request</Link>
              <Link to="/customer/active"><Icon name="pin" size={16} /> Track Active Ride</Link>
              <Link to="/customer/chat"><Icon name="chat" size={16} /> Message Rider</Link>
              <Link to="/customer/history"><Icon name="clock" size={16} /> Ride History</Link>
            </div>
          </div>
          <div className="promo-card">
            <div>
              <h4>Become a Rider</h4>
              <p>Earn money by riding for the community.</p>
              <Link to="/register">Join Now →</Link>
            </div>
            <div className="promo-art"><RiderArt /></div>
          </div>
        </div>
      </div>
    </>
  );
}
