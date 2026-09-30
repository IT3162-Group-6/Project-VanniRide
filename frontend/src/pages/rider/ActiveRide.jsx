import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import MapArt from '../../components/MapArt';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { useAppState } from '../../context/AppState';
import { ridesApi, RIDE_STATUS } from '../../services/api';

const NEXT = {
  [RIDE_STATUS.ACCEPTED]: { to: RIDE_STATUS.ONTHEWAY, label: 'Start heading to pickup' },
  [RIDE_STATUS.ONTHEWAY]: { to: RIDE_STATUS.PICKED, label: 'Confirm pickup' },
  [RIDE_STATUS.PICKED]: { to: RIDE_STATUS.COMPLETED, label: 'Complete ride' },
};

export default function ActiveRide() {
  const { user, refresh } = useAuth();
  const { showToast } = useAppState();
  const navigate = useNavigate();
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ridesApi.active({ riderId: user.id }).then(setRide).finally(() => setLoading(false));
  }, [user.id]);

  async function advance() {
    const step = NEXT[ride.status];
    const updated = await ridesApi.updateStatus(ride.id, step.to);
    showToast(step.to === RIDE_STATUS.COMPLETED ? 'Ride completed — earnings added' : 'Status updated');
    if (step.to === RIDE_STATUS.COMPLETED) {
      await refresh();
      setRide(null);
      navigate('/rider/history');
      return;
    }
    setRide(updated);
  }

  async function cancel() {
    await ridesApi.cancel(ride.id);
    showToast('Ride cancelled');
    setRide(null);
  }

  if (loading) return <p className="muted">Loading…</p>;

  if (!ride) {
    return (
      <div className="card">
        <div className="empty">
          <div className="fi"><Icon name="route" /></div>
          <b>No active ride</b>
          <p>Accept a request to start a trip.</p>
          <button className="btn btn-primary" onClick={() => navigate('/rider/requests')}>Browse requests</button>
        </div>
      </div>
    );
  }

  const step = NEXT[ride.status];

  return (
    <div className="request-layout">
      <div className="card">
        <div className="card-head">
          <h3>Active Ride · {ride.code}</h3>
          <StatusBadge status={ride.status} />
        </div>

        <div className="route-block">
          <div className="route-point"><span className="dot dot-start" /><div><b>{ride.pickup}</b><span>Pickup</span></div></div>
          <div className="route-point"><span className="dot dot-end" /><div><b>{ride.dropoff}</b><span>Drop-off</span></div></div>
        </div>

        <div className="rider-card">
          <div className="avatar" style={{ background: 'var(--mint-100)', color: 'var(--green-700)' }}>
            {ride.customer?.name?.[0]}
          </div>
          <div><b>{ride.customer?.name}</b><span>{ride.customer?.phone}</span></div>
          <Link to="/rider/chat" className="icon-btn" aria-label="Chat"><Icon name="chat" /></Link>
          <a href={`tel:${ride.customer?.phone}`} className="icon-btn icon-btn-call" aria-label="Call"><Icon name="phone" /></a>
        </div>

        <div className="kv" style={{ marginTop: 16 }}>
          <div><span>Distance</span><b>{ride.distanceKm} km</b></div>
          <div><span>Payment</span><b style={{ textTransform: 'capitalize' }}>{ride.payment}</b></div>
          {ride.note && <div><span>Note</span><b>{ride.note}</b></div>}
        </div>
        <div className="fare-total"><span>You earn</span><span>LKR {ride.fare.toFixed(2)}</span></div>

        {step && (
          <button className="btn btn-primary btn-block" style={{ marginTop: 18 }} onClick={advance}>
            {step.label}
          </button>
        )}
        {ride.status !== RIDE_STATUS.PICKED && (
          <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={cancel}>Cancel ride</button>
        )}
      </div>
      <div className="map-box"><MapArt from={ride.pickup} to={ride.dropoff} /></div>
    </div>
  );
}
