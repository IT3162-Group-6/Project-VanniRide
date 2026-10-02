import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import MapArt from '../../components/MapArt';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { useAppState } from '../../context/AppState';
import { ridesApi, RIDE_STATUS } from '../../services/api';

const NEXT = {
  [RIDE_STATUS.ACCEPTED]: { to: RIDE_STATUS.ONTHEWAY, label: 'Mark rider arrived' },
  [RIDE_STATUS.ONTHEWAY]: { to: RIDE_STATUS.PICKED, label: 'Start trip' },
  [RIDE_STATUS.PICKED]: { to: RIDE_STATUS.COMPLETED, label: 'Complete ride' },
};

export default function ActiveRide() {
  const { user } = useAuth();
  const { showToast } = useAppState();
  const navigate = useNavigate();
  const [ride, setRide] = useState(null);
  const [payment, setPayment] = useState(null);
  const [request, setRequest] = useState(null);
  const [allowance, setAllowance] = useState(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ridesApi.active({ riderId: user.id }).then(async (activeRide) => {
      setRide(activeRide);
      if (activeRide) {
        const [cash, limit, pending] = await Promise.all([
          ridesApi.payment(activeRide.id),
          ridesApi.cancellationAllowance(),
          activeRide.apiStatus === 'STARTED' ? ridesApi.getCancellationRequest(activeRide.id) : null,
        ]);
        setPayment(cash); setAllowance(limit); setRequest(pending);
      }
    }).catch((requestError) => setError(requestError.message)).finally(() => setLoading(false));
  }, [user.id]);

  async function advance() {
    setBusy(true); setError('');
    try {
      const step = NEXT[ride.status];
      const updated = await ridesApi.updateStatus(ride.id, step.to);
      setRide(updated);
      showToast(step.to === RIDE_STATUS.COMPLETED ? 'Ride completed — confirm the cash receipt' : 'Status updated');
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  async function confirmCash() {
    setBusy(true); setError('');
    try {
      const paid = await ridesApi.confirmCashPayment(ride.id);
      setPayment(paid); showToast('Cash payment confirmed');
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  async function cancel() {
    if (!reason.trim()) { setError('Enter a cancellation reason.'); return; }
    setBusy(true); setError('');
    try {
      const result = await ridesApi.cancelWithReason(ride.id, reason.trim());
      setAllowance(result.cancellationAllowance || allowance);
      if (result.cancellationRequest) { setRequest(result.cancellationRequest); showToast('Waiting for customer confirmation'); }
      else { setRide(null); showToast('Ride cancelled'); }
      setReason('');
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  async function respond(decision) {
    setBusy(true); setError('');
    try {
      const result = await ridesApi.respondToCancellation(ride.id, decision);
      setRequest(null); showToast(result.message);
      if (result.ride?.status === RIDE_STATUS.CANCELLED) setRide(null);
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  if (loading) return <p className="muted">Loading…</p>;
  if (!ride) return <div className="card">{error && <div className="alert alert-error">{error}</div>}<div className="empty"><div className="fi"><Icon name="route" /></div><b>No active ride</b><p>Accept a request to start a trip.</p><button className="btn btn-primary" onClick={() => navigate('/rider/requests')}>Browse requests</button></div></div>;

  const step = NEXT[ride.status];
  const canCancel = ['ACCEPTED', 'STARTED'].includes(ride.apiStatus);
  const mustRespond = request?.respondingUserId === user.id;
  return (
    <div className="request-layout"><div className="card">
      <div className="card-head"><h3>Active Ride · #{ride.id.slice(-6)}</h3><StatusBadge status={ride.status} /></div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="route-block"><div className="route-point"><span className="dot dot-start"/><div><b>{ride.pickup}</b><span>Pickup</span></div></div><div className="route-point"><span className="dot dot-end"/><div><b>{ride.dropoff}</b><span>Drop-off</span></div></div></div>
      <div className="rider-card"><div className="avatar">{ride.customer?.name?.[0]}</div><div><b>{ride.customer?.name}</b><span>{ride.customer?.phone}</span></div><Link to="/rider/chat" className="icon-btn"><Icon name="chat" /></Link><a href={`tel:${ride.customer?.phone}`} className="icon-btn"><Icon name="phone" /></a></div>
      <div className="kv" style={{marginTop:16}}><div><span>Distance</span><b>{ride.distanceKm} km</b></div><div><span>Payment</span><b>Cash · {payment?.status || 'pending'}</b></div></div>
      <div className="fare-total"><span>Fare</span><span>LKR {Number(ride.fare).toFixed(2)}</span></div>
      {step && <button className="btn btn-primary btn-block" disabled={busy || Boolean(request)} onClick={advance}>{step.label}</button>}
      {ride.status === RIDE_STATUS.COMPLETED && payment?.status !== 'paid' && <button className="btn btn-primary btn-block" disabled={busy} onClick={confirmCash}>Confirm cash received</button>}
      {request ? <div className="cancellation-panel"><b>Cancellation confirmation pending</b><p>{request.reason}</p>{mustRespond ? <div className="cancellation-actions"><button className="btn btn-primary btn-sm" disabled={busy} onClick={() => respond('CANCEL')}>Cancel trip</button><button className="btn btn-outline btn-sm" disabled={busy} onClick={() => respond('RESUME')}>Resume trip</button></div> : <span>Waiting for the customer; auto-cancels after 15 minutes.</span>}</div> : canCancel && <div className="cancellation-panel"><div className="field"><label>Cancellation reason</label><input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500}/></div><button className="btn btn-ghost btn-block" disabled={busy || allowance?.remaining === 0} onClick={cancel}>Request cancellation</button><span>{allowance ? `${allowance.remaining} of ${allowance.limit} remaining this hour` : ''}</span></div>}
    </div><div className="map-box"><MapArt from={ride.pickup} to={ride.dropoff}/></div></div>
  );
}
