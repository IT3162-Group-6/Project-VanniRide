import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import MapArt from '../../components/MapArt';
import StatusBadge from '../../components/StatusBadge';
import { adminApi } from '../../services/api';
import { useAppState } from '../../context/AppState';

export default function RideDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useAppState();
  const [ride, setRide] = useState(null);
  const [payment, setPayment] = useState(null);
  const [rating, setRating] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatLoaded, setChatLoaded] = useState(false);
  const [chatReason, setChatReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [paymentDraft, setPaymentDraft] = useState({ amount: '', status: 'PENDING', reason: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([adminApi.rides(), adminApi.payments(), adminApi.ratings()])
      .then(([rides, payments, ratings]) => {
        const selectedRide = rides.find((item) => item.id === id);
        if (!selectedRide) throw new Error('Ride not found');
        const selectedPayment = payments.find((item) => item.rideId === id) || null;
        setRide(selectedRide);
        setPayment(selectedPayment);
        setRating(ratings.find((item) => item.rideId === id) || null);
        if (selectedPayment) {
          setPaymentDraft({ amount: String(selectedPayment.amount), status: selectedPayment.paymentStatus, reason: '' });
        }
      })
      .catch((requestError) => setError(requestError.message));
  }, [id]);

  async function viewConversation() {
    if (!chatReason.trim()) { setError('Enter the administrative reason for viewing this conversation.'); return; }
    try {
      setMessages(await adminApi.messages(id, chatReason.trim()));
      setChatLoaded(true); setError('');
    } catch (requestError) { setError(requestError.message); }
  }

  async function forceCancel() {
    if (!cancelReason.trim()) { setError('Enter a reason for force-cancelling this ride.'); return; }
    try {
      const updated = await adminApi.forceCancel(ride.id, cancelReason.trim());
      setRide((current) => ({ ...current, ...updated, customer: current.customer, rider: current.rider }));
      setCancelReason(''); setError(''); showToast('Ride force-cancelled by administrator');
    } catch (requestError) { setError(requestError.message); }
  }

  async function correctPayment() {
    if (!paymentDraft.reason.trim()) { setError('Enter the audit reason for this payment correction.'); return; }
    const amount = Number(paymentDraft.amount);
    if (!Number.isFinite(amount) || amount < 0) { setError('Enter a valid non-negative payment amount.'); return; }
    try {
      const updated = await adminApi.correctPayment(payment.id, {
        amount,
        paymentStatus: paymentDraft.status,
        reason: paymentDraft.reason.trim(),
      });
      setPayment(updated);
      setPaymentDraft((current) => ({ ...current, reason: '' }));
      setError(''); showToast('Payment correction saved');
    } catch (requestError) { setError(requestError.message); }
  }

  if (error && !ride) return <div className="alert alert-error">{error}</div>;
  if (!ride) return <p className="muted">Loading…</p>;

  const open = ['pending', 'accepted', 'ontheway', 'picked'].includes(ride.status);

  return (
    <div className="request-layout">
      <div>
        <div className="card">
          <div className="card-head"><h3>{ride.code}</h3><StatusBadge status={ride.status} /></div>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="route-block">
            <div className="route-point"><span className="dot dot-start" /><div><b>{ride.pickup}</b><span>Pickup</span></div></div>
            <div className="route-point"><span className="dot dot-end" /><div><b>{ride.dropoff}</b><span>Drop-off</span></div></div>
          </div>

          <div className="kv">
            <div><span>Type</span><b style={{ textTransform: 'capitalize' }}>{ride.type}{ride.deliveryCategory ? ` · ${ride.deliveryCategory.toLowerCase()}` : ''}</b></div>
            <div><span>Customer</span><b>{ride.customer ? `${ride.customer.name} (${ride.customer.email})` : ride.customerId}</b></div>
            <div><span>Rider</span><b>{ride.rider ? `${ride.rider.name}${ride.rider.vehicle ? ` · ${ride.rider.vehicle}` : ''}` : 'Unassigned'}</b></div>
            <div><span>Distance</span><b>{ride.distanceKm} km</b></div>
            <div><span>Cash payment</span><b>{payment ? `${payment.paymentStatus} · LKR ${Number(payment.amount).toFixed(2)}` : 'Not created'}</b></div>
            <div><span>Created</span><b>{new Date(ride.createdAt).toLocaleString()}</b></div>
            {rating && <div><span>Rating</span><b>{rating.rating}★{rating.review ? ` · ${rating.review}` : ''}</b></div>}
          </div>

          <div className="fare-total"><span>Stored fare</span><span>LKR {Number(ride.fare).toFixed(2)}</span></div>

          {open && <div className="admin-action-panel">
            <label className="field-label">Administrator cancellation reason</label>
            <input value={cancelReason} maxLength={500} onChange={(event) => setCancelReason(event.target.value)} placeholder="Required for the audit log" />
            <button className="btn btn-outline btn-block" onClick={forceCancel}>Force-cancel this ride</button>
          </div>}

          <button className="btn btn-ghost" style={{ marginTop: 18 }} onClick={() => navigate('/admin/rides')}><Icon name="back" /> Back</button>
        </div>

        {payment && ride.status === 'completed' && <div className="card" style={{ marginTop: 18 }}>
          <div className="card-head"><h3>Payment correction</h3></div>
          <div className="admin-form-grid">
            <div className="field"><label>Amount</label><input type="number" min="0" step="0.01" value={paymentDraft.amount} onChange={(event) => setPaymentDraft({ ...paymentDraft, amount: event.target.value })} /></div>
            <div className="field"><label>Status</label><select value={paymentDraft.status} onChange={(event) => setPaymentDraft({ ...paymentDraft, status: event.target.value })}><option value="PENDING">Pending</option><option value="PAID">Paid</option></select></div>
          </div>
          <div className="field"><label>Correction reason</label><input maxLength={500} value={paymentDraft.reason} onChange={(event) => setPaymentDraft({ ...paymentDraft, reason: event.target.value })} placeholder="Required for the audit log" /></div>
          <button className="btn btn-outline" onClick={correctPayment}>Save payment correction</button>
        </div>}

        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-head"><h3>Conversation log {chatLoaded ? `(${messages.length})` : ''}</h3></div>
          {!chatLoaded && <>
            <p className="muted">Conversation access is audited. State why the chat must be viewed.</p>
            <div className="field"><label>Access reason</label><input maxLength={500} value={chatReason} onChange={(event) => setChatReason(event.target.value)} placeholder="e.g. Reviewing a lost-item request" /></div>
            <button className="btn btn-outline" onClick={viewConversation}>View conversation</button>
          </>}
          {chatLoaded && messages.length === 0 && <p className="muted">No messages were exchanged for this ride.</p>}
          {messages.map((message) => (
            <div key={message.id} className="log-row">
              <b>{message.sender?.name || 'Unknown participant'} <small>({message.sender?.role?.toLowerCase() || 'unknown'})</small></b>
              <span>{message.text}</span>
              <time>{new Date(message.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
            </div>
          ))}
        </div>
      </div>

      <div className="map-box"><MapArt from={ride.pickup} to={ride.dropoff} /></div>
    </div>
  );
}
