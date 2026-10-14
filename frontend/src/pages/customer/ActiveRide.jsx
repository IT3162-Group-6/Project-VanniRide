import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import ActiveRequestMap from '../../components/ActiveRequestMap';
import DeliveryDetailsDisplay from '../../components/DeliveryDetailsDisplay';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/authStore';
import { useAppState } from '../../context/appStateStore';
import { useRealtimeEvent, useRideRoom } from '../../context/realtimeHooks';
import { ridesApi, RIDE_STATUS } from '../../services/api';

const progressFlow = (isDelivery) => [
  { key: RIDE_STATUS.PENDING, label: 'Requested', sub: 'Waiting for a rider to accept', time: 'requestedAt' },
  { key: RIDE_STATUS.ACCEPTED, label: 'Accepted', sub: 'A rider accepted your request', time: 'acceptedAt' },
  { key: RIDE_STATUS.ONTHEWAY, label: 'Arrived', sub: 'Rider reached the pickup point', time: 'arrivedAt' },
  { key: RIDE_STATUS.PICKED, label: isDelivery ? 'Picked up' : 'Started', sub: isDelivery ? 'Your delivery is on the way' : 'Your trip is in progress', time: 'startedAt' },
  { key: RIDE_STATUS.COMPLETED, label: 'Completed', sub: isDelivery ? 'Your delivery has arrived' : 'You reached your destination', time: 'completedAt' },
];

function formatTime(value) {
  if (!value) return '--:--';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ActiveRide() {
  const { user } = useAuth();
  const { showToast } = useAppState();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedRideId = searchParams.get('rideId');
  const [ride, setRide] = useState(null);
  const [payment, setPayment] = useState(null);
  const [allowance, setAllowance] = useState(null);
  const [cancellationRequest, setCancellationRequest] = useState(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [rides, currentAllowance] = await Promise.all([
        ridesApi.list({ customerId: user.id }),
        ridesApi.cancellationAllowance(),
      ]);
      const activeRides = rides.filter((item) =>
        ['pending', 'accepted', 'ontheway', 'picked'].includes(item.status)
      );
      const selectedRide = rides.find((item) => item.id === selectedRideId);
      const currentRide =
        (selectedRide?.status === RIDE_STATUS.COMPLETED ? selectedRide : null) ||
        activeRides.find((item) => item.id === selectedRideId) ||
        activeRides[0] ||
        null;
      setRide(currentRide);
      setAllowance(currentAllowance);
      if (!currentRide) {
        setPayment(null);
        setCancellationRequest(null);
        return;
      }
      const [currentPayment, pendingCancellation] = await Promise.all([
        ridesApi.payment(currentRide.id),
        currentRide.apiStatus === 'STARTED'
          ? ridesApi.getCancellationRequest(currentRide.id)
          : Promise.resolve(null),
      ]);
      setPayment(currentPayment);
      setCancellationRequest(pendingCancellation);
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [selectedRideId, user.id]);

  useEffect(() => {
    const initial = setTimeout(() => void load(), 0);
    const timer = setInterval(() => void load(), 20000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [load]);

  useRideRoom(ride?.id || selectedRideId);
  useRealtimeEvent('ride_status_changed', (event) => {
    if (!ride || event.rideId === ride.id || event.rideId === selectedRideId) void load();
  });
  useRealtimeEvent('cancellation_requested', (event) => {
    if (event.rideId === ride?.id) void load();
  });
  useRealtimeEvent('cancellation_resolved', (event) => {
    if (event.rideId === ride?.id) void load();
  });

  async function cancelRide() {
    if (!reason.trim()) {
      setError('Enter a reason before requesting cancellation.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await ridesApi.cancelWithReason(ride.id, reason.trim());
      setAllowance(result.cancellationAllowance || allowance);
      setReason('');
      if (result.cancellationRequest) {
        setCancellationRequest(result.cancellationRequest);
        showToast('Waiting up to 15 minutes for the rider to respond.');
      } else {
        await load();
        showToast('Request cancelled');
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function respondToCancellation(decision) {
    setBusy(true);
    setError('');
    try {
      const result = await ridesApi.respondToCancellation(ride.id, decision);
      setCancellationRequest(null);
      setAllowance(result.cancellationAllowance || allowance);
      showToast(result.message);
      if (result.ride?.status === RIDE_STATUS.CANCELLED) {
        await load();
      } else {
        await load();
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="muted">Loading…</p>;

  if (!ride) {
    return (
      <div className="card">
        {error && <div className="alert alert-error">{error}</div>}
        <div className="empty">
          <div className="fi"><Icon name="route" /></div>
          <b>Nothing to track right now</b>
          <p>Create a ride or delivery request first. Its rider, route, status, and cancellation options will appear here.</p>
          <button className="btn btn-primary" onClick={() => navigate('/customer/request')}>Request a ride</button>
        </div>
      </div>
    );
  }

  const isDelivery = ride.type === 'delivery';
  const flow = progressFlow(isDelivery);
  const currentIndex = flow.findIndex((item) => item.key === ride.status);
  const canInitiateCancellation = ['REQUESTED', 'ACCEPTED', 'STARTED'].includes(ride.apiStatus);
  const mustRespond = cancellationRequest?.respondingUserId === user.id;

  return (
    <div className="request-layout">
      <div>
        <div className="track-banner">
          <Icon name={ride.status === RIDE_STATUS.PENDING ? 'clock' : 'check'} />
          <div>
            {ride.status === RIDE_STATUS.PENDING
              ? 'Looking for a rider'
              : ride.status === RIDE_STATUS.COMPLETED
                ? `${isDelivery ? 'Delivery' : 'Ride'} completed`
                : `${isDelivery ? 'Delivery' : 'Ride'} in progress`}
            <span>{ride.pickup} → {ride.dropoff}</span>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Track {isDelivery ? 'Delivery' : 'Ride'} · #{ride.id.slice(-6)}</h3>
            <StatusBadge status={ride.status} />
          </div>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="timeline">
            {flow.map((item, index) => (
              <div key={item.key} className={`timeline-item ${index < currentIndex ? 'done' : ''} ${index === currentIndex ? 'active' : ''}`}>
                <div className="timeline-dot">{index < currentIndex && <Icon name="check" size={12} />}</div>
                <div className="timeline-body"><b>{item.label}</b><span>{item.sub}</span></div>
                <time className="timeline-time">{index <= currentIndex ? formatTime(ride[item.time]) : '--:--'}</time>
              </div>
            ))}
          </div>

          {ride.rider ? (
            <div className="rider-card">
              <div className="avatar" style={{ background: 'var(--mint-100)', color: 'var(--green-700)' }}>{ride.rider.name[0]}</div>
              <div><b>{ride.rider.name}</b><span>Assigned rider · {ride.rider.phone}</span></div>
              <Link to={`/customer/chat?rideId=${ride.id}`} className="icon-btn" aria-label="Chat"><Icon name="chat" /></Link>
              <a href={`tel:${ride.rider.phone}`} className="icon-btn icon-btn-call" aria-label="Call"><Icon name="phone" /></a>
            </div>
          ) : (
            <p className="muted" style={{ marginTop: 14 }}>Waiting for an available rider to accept this request. We will notify you as soon as one does.</p>
          )}

          <DeliveryDetailsDisplay ride={ride} />

          <div className="fare-row" style={{ marginTop: 16 }}><span>Distance</span><span>{ride.distanceKm} km</span></div>
          <div className="fare-row"><span>Payment</span><span>Cash · {payment?.status || 'pending'}</span></div>
          <div className="fare-total"><span>Fare</span><span>LKR {Number(ride.fare).toFixed(2)}</span></div>

          {cancellationRequest ? (
            <div className="cancellation-panel">
              <b>Cancellation confirmation pending</b>
              <p>{cancellationRequest.reason}</p>
              <span>Automatic cancellation at {new Date(cancellationRequest.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              {mustRespond ? (
                <div className="cancellation-actions">
                  <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => respondToCancellation('CANCEL')}>Cancel trip</button>
                  <button className="btn btn-outline btn-sm" disabled={busy} onClick={() => respondToCancellation('RESUME')}>Resume trip</button>
                </div>
              ) : <p className="muted">Waiting for the rider to confirm or resume.</p>}
            </div>
          ) : canInitiateCancellation && (
            <div className="cancellation-panel">
              <div className="field">
                <label>Cancellation reason</label>
                <input value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} placeholder="Explain why you need to cancel" />
              </div>
              <button className="btn btn-ghost btn-block" disabled={busy || allowance?.remaining === 0} onClick={cancelRide}>
                {busy ? 'Submitting…' : 'Request cancellation'}
              </button>
              <span>{allowance ? `${allowance.remaining} of ${allowance.limit} cancellations remaining this hour` : ''}</span>
            </div>
          )}
        </div>
      </div>
      <div className="map-box" aria-label="Pickup and destination map">
        <ActiveRequestMap pickup={ride.pickupLocation} destination={ride.destination} />
      </div>
    </div>
  );
}
