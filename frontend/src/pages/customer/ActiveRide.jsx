import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import MapArt from '../../components/MapArt';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { useAppState } from '../../context/AppState';
import { ridesApi, RIDE_STATUS } from '../../services/api';

const FLOW = [
  { key: RIDE_STATUS.PENDING, label: 'Requested', sub: 'Waiting for a rider to accept' },
  { key: RIDE_STATUS.ACCEPTED, label: 'Accepted', sub: 'A rider accepted your request' },
  { key: RIDE_STATUS.ONTHEWAY, label: 'On the Way', sub: 'Rider is heading to pickup' },
  { key: RIDE_STATUS.PICKED, label: 'Picked Up', sub: 'Trip in progress' },
  { key: RIDE_STATUS.COMPLETED, label: 'Completed', sub: 'Thanks for riding with us' },
];

function stamp(createdAt, index) {
  const d = new Date(createdAt);
  d.setMinutes(d.getMinutes() + index * 3);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ActiveRide() {
  const { user } = useAuth();
  const { showToast } = useAppState();
  const navigate = useNavigate();
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    ridesApi.active({ customerId: user.id })
      .then(setRide)
      .finally(() => setLoading(false));
  }, [user.id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000); // poll for rider updates
    return () => clearInterval(t);
  }, [load]);

  async function cancelRide() {
    await ridesApi.cancel(ride.id);
    showToast('Request cancelled');
    setRide(null);
  }

  if (loading) return <p className="muted">Loading…</p>;

  if (!ride) {
    return (
      <div className="card">
        <div className="empty">
          <div className="fi"><Icon name="route" /></div>
          <b>No active ride</b>
          <p>When you book a ride or delivery, you can track it live here.</p>
          <button className="btn btn-primary" onClick={() => navigate('/customer/request')}>Request a ride</button>
        </div>
      </div>
    );
  }

  const currentIndex = FLOW.findIndex((s) => s.key === ride.status);

  return (
    <div className="request-layout">
      <div>
        <div className="track-banner">
          <Icon name={ride.status === RIDE_STATUS.PENDING ? 'clock' : 'check'} />
          <div>
            {ride.status === RIDE_STATUS.PENDING ? 'Looking for a rider' : 'Rider assigned'}
            <span>{ride.pickup} → {ride.dropoff}</span>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Track Request · {ride.code}</h3>
            <StatusBadge status={ride.status} />
          </div>

          <div className="timeline">
            {FLOW.map((s, i) => (
              <div key={s.key} className={`timeline-item ${i < currentIndex ? 'done' : ''} ${i === currentIndex ? 'active' : ''}`}>
                <div className="timeline-dot">{i < currentIndex && <Icon name="check" size={12} />}</div>
                <div className="timeline-body"><b>{s.label}</b><span>{s.sub}</span></div>
                <time className="timeline-time">{i <= currentIndex ? stamp(ride.createdAt, i) : '--:--'}</time>
              </div>
            ))}
          </div>

          {ride.rider ? (
            <div className="rider-card">
              <div className="avatar" style={{ background: 'var(--mint-100)', color: 'var(--green-700)' }}>
                {ride.rider.name[0]}
              </div>
              <div>
                <b>{ride.rider.name}</b>
                <span>{ride.rider.rating}★ · {ride.rider.vehicle}</span>
              </div>
              <Link to="/customer/chat" className="icon-btn" aria-label="Chat"><Icon name="chat" /></Link>
              <a href={`tel:${ride.rider.phone}`} className="icon-btn icon-btn-call" aria-label="Call"><Icon name="phone" /></a>
            </div>
          ) : (
            <p className="muted" style={{ marginTop: 14 }}>No rider yet — we'll notify you as soon as someone accepts.</p>
          )}

          <div className="fare-row" style={{ marginTop: 16 }}><span>Distance</span><span>{ride.distanceKm} km</span></div>
          <div className="fare-row"><span>Payment</span><span style={{ textTransform: 'capitalize' }}>{ride.payment}</span></div>
          <div className="fare-total"><span>Fare</span><span>LKR {ride.fare.toFixed(2)}</span></div>

          {[RIDE_STATUS.PENDING, RIDE_STATUS.ACCEPTED].includes(ride.status) && (
            <button className="btn btn-ghost btn-block" style={{ marginTop: 16 }} onClick={cancelRide}>
              Cancel request
            </button>
          )}
        </div>
      </div>
      <div className="map-box"><MapArt from={ride.pickup} to={ride.dropoff} /></div>
    </div>
  );
}
