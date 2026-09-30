import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import MapArt from '../../components/MapArt';
import StatusBadge from '../../components/StatusBadge';
import { ridesApi, chatApi, estimateFare } from '../../services/api';
import { useAppState } from '../../context/AppState';

export default function RideDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useAppState();
  const [ride, setRide] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    ridesApi.get(id).then(async (r) => {
      setRide(r);
      setMessages(await chatApi.list(r.id));
    }).catch((e) => setError(e.message));
  }, [id]);

  async function forceCancel() {
    const updated = await ridesApi.cancel(ride.id);
    setRide(updated);
    showToast('Ride cancelled by admin');
  }

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!ride) return <p className="muted">Loading…</p>;

  const breakdown = estimateFare(ride.distanceKm);
  const open = ['pending', 'accepted', 'ontheway', 'picked'].includes(ride.status);

  return (
    <div className="request-layout">
      <div>
        <div className="card">
          <div className="card-head">
            <h3>{ride.code}</h3>
            <StatusBadge status={ride.status} />
          </div>

          <div className="route-block">
            <div className="route-point"><span className="dot dot-start" /><div><b>{ride.pickup}</b><span>Pickup</span></div></div>
            {ride.via && <div className="route-point"><span className="dot" /><div><b>{ride.via}</b><span>Via</span></div></div>}
            <div className="route-point"><span className="dot dot-end" /><div><b>{ride.dropoff}</b><span>Drop-off</span></div></div>
          </div>

          <div className="kv">
            <div><span>Type</span><b style={{ textTransform: 'capitalize' }}>{ride.type}</b></div>
            <div><span>Customer</span><b>{ride.customer?.name} ({ride.customer?.email})</b></div>
            <div><span>Rider</span><b>{ride.rider ? `${ride.rider.name} · ${ride.rider.vehicle}` : 'Unassigned'}</b></div>
            <div><span>Distance</span><b>{ride.distanceKm} km</b></div>
            <div><span>Payment</span><b style={{ textTransform: 'capitalize' }}>{ride.payment}</b></div>
            <div><span>Created</span><b>{new Date(ride.createdAt).toLocaleString()}</b></div>
            {ride.rating && <div><span>Rating</span><b>{ride.rating}★</b></div>}
            {ride.note && <div><span>Note</span><b>{ride.note}</b></div>}
          </div>

          <label className="field-label" style={{ marginTop: 18 }}>Fare breakdown</label>
          <div className="fare-row"><span>Base</span><span>LKR {breakdown.base.toFixed(2)}</span></div>
          <div className="fare-row"><span>Distance</span><span>LKR {breakdown.distanceCost.toFixed(2)}</span></div>
          <div className="fare-row"><span>Demand</span><span>LKR {breakdown.demand.toFixed(2)}</span></div>
          <div className="fare-total"><span>Total</span><span>LKR {ride.fare.toFixed(2)}</span></div>

          <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
            <button className="btn btn-ghost" onClick={() => navigate('/admin/rides')}><Icon name="back" /> Back</button>
            {open && <button className="btn btn-outline btn-block" onClick={forceCancel}>Cancel this ride</button>}
          </div>
        </div>

        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-head"><h3>Conversation log ({messages.length})</h3></div>
          {messages.length === 0 && <p className="muted">No messages exchanged for this ride.</p>}
          {messages.map((m) => (
            <div key={m.id} className="log-row">
              <b>{m.senderId === ride.customerId ? ride.customer?.name : ride.rider?.name || 'Rider'}</b>
              <span>{m.text}</span>
              <time>{new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
            </div>
          ))}
        </div>
      </div>

      <div className="map-box"><MapArt from={ride.pickup} to={ride.dropoff} /></div>
    </div>
  );
}
