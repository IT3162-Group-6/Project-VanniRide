import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import MapArt from '../../components/MapArt';
import StatusBadge from '../../components/StatusBadge';
import { useAppState } from '../../context/AppState';
import { useAuth } from '../../context/AuthContext';
import { ridesApi } from '../../services/api';

export default function RequestDetails() {
  const { id } = useParams();
  const { showToast } = useAppState();
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [ride, setRide] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    ridesApi.get(id).then(setRide).catch((e) => setError(e.message));
  }, [id]);

  async function accept() {
    setBusy(true);
    try {
      await ridesApi.accept(ride.id);
      try { await refresh(); } catch { /* the accepted ride remains authoritative */ }
      showToast('Request accepted — head to the pickup point');
      navigate('/rider/active');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!ride) return <p className="muted">Loading…</p>;

  return (
    <div className="request-layout">
      <div className="card">
        <div className="card-head">
          <h3>Request #{ride.id.slice(-6)}</h3>
          <StatusBadge status={ride.status} />
        </div>

        <div className="route-block">
          <div className="route-point"><span className="dot dot-start" /><div><b>{ride.pickup}</b><span>Pickup</span></div></div>
          {ride.via && <div className="route-point"><span className="dot" /><div><b>{ride.via}</b><span>Via</span></div></div>}
          <div className="route-point"><span className="dot dot-end" /><div><b>{ride.dropoff}</b><span>Drop-off</span></div></div>
        </div>

        <div className="kv">
          <div><span>Type</span><b style={{ textTransform: 'capitalize' }}>{ride.type}</b></div>
          <div><span>Customer</span><b>{ride.customer?.name}</b></div>
          <div><span>Distance</span><b>{ride.distanceKm} km</b></div>
          <div><span>Category</span><b>{ride.deliveryCategory || 'Transport'}</b></div>
          <div><span>Payment</span><b>Cash</b></div>
        </div>

        <label className="field-label" style={{ marginTop: 18 }}>Fare</label>
        <div className="fare-total"><span>Cash fare</span><span>LKR {Number(ride.fare).toFixed(2)}</span></div>

        <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/rider/requests')}><Icon name="back" /> Back</button>
          <button className="btn btn-primary btn-block" onClick={accept} disabled={busy || ride.status !== 'pending'}>
            {ride.status === 'pending' ? (busy ? 'Accepting…' : 'Accept Request') : 'Already taken'}
          </button>
        </div>
      </div>
      <div className="map-box"><MapArt from={ride.pickup} to={ride.dropoff} /></div>
    </div>
  );
}
