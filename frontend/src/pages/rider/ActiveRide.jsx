import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import ActiveRequestMap from '../../components/ActiveRequestMap';
import DeliveryDetailsDisplay from '../../components/DeliveryDetailsDisplay';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/authStore';
import { useAppState } from '../../context/appStateStore';
import { useRealtimeEvent, useRideRoom } from '../../context/realtimeHooks';
import { ridesApi, RIDE_STATUS } from '../../services/api';
import { riderNavigation } from '../../utils/googleMaps';

const nextStep = (status, isDelivery) => ({
  [RIDE_STATUS.ACCEPTED]: { to: RIDE_STATUS.ONTHEWAY, label: 'I have arrived at pickup' },
  [RIDE_STATUS.ONTHEWAY]: { to: RIDE_STATUS.PICKED, label: isDelivery ? 'Confirm parcel picked up' : 'Start ride' },
  [RIDE_STATUS.PICKED]: { to: RIDE_STATUS.COMPLETED, label: isDelivery ? 'Complete delivery' : 'Complete ride' },
}[status]);

export default function ActiveRide() {
  const { user, refresh } = useAuth();
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
  const activeRideRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const activeRide = await ridesApi.active({ riderId: user.id });
      if (!activeRide) {
        if (activeRideRef.current) void refresh().catch(() => {});
        activeRideRef.current = null;
        setRide((current) => current?.status === RIDE_STATUS.COMPLETED ? current : null);
        setRequest(null);
        setError('');
        return;
      }
      activeRideRef.current = activeRide.id;
      setRide(activeRide);
        const [cash, limit, pending] = await Promise.all([
          ridesApi.payment(activeRide.id),
          ridesApi.cancellationAllowance(),
          activeRide.apiStatus === 'STARTED' ? ridesApi.getCancellationRequest(activeRide.id) : null,
        ]);
        setPayment(cash); setAllowance(limit); setRequest(pending);
      setError('');
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, [refresh, user.id]);

  useEffect(() => {
    const initial = setTimeout(() => void load(), 0);
    const timer = setInterval(() => void load(), 20000);
    return () => { clearTimeout(initial); clearInterval(timer); };
  }, [load]);

  useRideRoom(ride?.id);
  useRealtimeEvent('ride_status_changed', (event) => {
    if (event.riderId === user.id || event.rideId === ride?.id) void load();
  });
  useRealtimeEvent('cancellation_requested', (event) => {
    if (event.rideId === ride?.id) void load();
  });
  useRealtimeEvent('cancellation_resolved', (event) => {
    if (event.rideId === ride?.id) void load();
  });

  async function advance() {
    setBusy(true); setError('');
    try {
      const step = nextStep(ride.status, ride.type === 'delivery');
      const updated = await ridesApi.updateStatus(ride.id, step.to);
      setRide(updated);
      if (step.to === RIDE_STATUS.COMPLETED) void refresh().catch(() => {});
      showToast(step.to === RIDE_STATUS.COMPLETED ? 'Request completed — confirm the cash receipt' : 'Status updated');
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
      else { setRide(null); void refresh().catch(() => {}); showToast('Ride cancelled'); }
      setReason('');
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  async function respond(decision) {
    setBusy(true); setError('');
    try {
      const result = await ridesApi.respondToCancellation(ride.id, decision);
      setRequest(null); showToast(result.message);
      if (result.ride?.status === RIDE_STATUS.CANCELLED) { setRide(null); void refresh().catch(() => {}); }
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  if (loading) return <p className="muted">Loading…</p>;
  if (!ride) return <div className="card">{error && <div className="alert alert-error">{error}</div>}<div className="empty"><div className="fi"><Icon name="route" /></div><b>You are not handling a request</b><p>Open Available Requests to accept a ride or delivery. It will then appear here with navigation and status controls.</p><button className="btn btn-primary" onClick={() => navigate('/rider/requests')}>View available requests</button></div></div>;

  const isDelivery = ride.type === 'delivery';
  const step = nextStep(ride.status, isDelivery);
  const canCancel = ['ACCEPTED', 'STARTED'].includes(ride.apiStatus);
  const mustRespond = request?.respondingUserId === user.id;
  const navigation = riderNavigation(ride);
  return (
    <div className="request-layout"><div className="card">
      <div className="card-head"><h3>Active {isDelivery ? 'Delivery' : 'Ride'} · #{ride.id.slice(-6)}</h3><StatusBadge status={ride.status} /></div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="route-block"><div className="route-point"><span className="dot dot-start"/><div><b>{ride.pickup}</b><span>Pickup</span></div></div><div className="route-point"><span className="dot dot-end"/><div><b>{ride.dropoff}</b><span>Drop-off</span></div></div></div>
      {navigation && (
        <div className="external-navigation">
          <div><Icon name="route" /><span><b>{navigation.label}</b><small>Opens turn-by-turn directions in Google Maps</small></span></div>
          <a className="btn btn-outline btn-sm" href={navigation.url} target="_blank" rel="noreferrer">Open Google Maps</a>
        </div>
      )}
      <div className="rider-card"><div className="avatar">{ride.customer?.name?.[0]}</div><div><b>{ride.customer?.name}</b><span>{ride.customer?.phone}</span></div><Link to="/rider/chat" className="icon-btn"><Icon name="chat" /></Link><a href={`tel:${ride.customer?.phone}`} className="icon-btn"><Icon name="phone" /></a></div>
      <DeliveryDetailsDisplay ride={ride} />
      <div className="kv" style={{marginTop:16}}><div><span>Distance</span><b>{ride.distanceKm} km</b></div><div><span>Payment</span><b>Cash · {payment?.status || 'pending'}</b></div></div>
      <div className="fare-total"><span>Fare</span><span>LKR {Number(ride.fare).toFixed(2)}</span></div>
      {step && <button className="btn btn-primary btn-block" disabled={busy || Boolean(request)} onClick={advance}>{step.label}</button>}
      {ride.status === RIDE_STATUS.COMPLETED && payment?.status !== 'paid' && <button className="btn btn-primary btn-block" disabled={busy} onClick={confirmCash}>Confirm cash received</button>}
      {request ? <div className="cancellation-panel"><b>Cancellation confirmation pending</b><p>{request.reason}</p>{mustRespond ? <div className="cancellation-actions"><button className="btn btn-primary btn-sm" disabled={busy} onClick={() => respond('CANCEL')}>Cancel trip</button><button className="btn btn-outline btn-sm" disabled={busy} onClick={() => respond('RESUME')}>Resume trip</button></div> : <span>Waiting for the customer; auto-cancels after 15 minutes.</span>}</div> : canCancel && <div className="cancellation-panel"><div className="field"><label>Cancellation reason</label><input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500}/></div><button className="btn btn-ghost btn-block" disabled={busy || allowance?.remaining === 0} onClick={cancel}>Request cancellation</button><span>{allowance ? `${allowance.remaining} of ${allowance.limit} remaining this hour` : ''}</span></div>}
    </div><div className="map-box" aria-label="Pickup and destination map"><ActiveRequestMap pickup={ride.pickupLocation} destination={ride.destination}/></div></div>
  );
}
