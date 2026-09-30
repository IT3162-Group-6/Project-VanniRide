import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import MapArt from '../../components/MapArt';
import { useAuth } from '../../context/AuthContext';
import { useAppState } from '../../context/AppState';
import { ridesApi, estimateFare } from '../../services/api';

const PICKUPS = ['Science Faculty', 'Main Gate', 'Hostel A', 'Library Junction'];
const DROPOFFS = ['Vavuniya Town', 'Bus Stand', 'Hospital', 'Hostel A'];

function StepDot({ n, current }) {
  const cls = n < current ? 'done' : n === current ? 'active' : '';
  return <div className={`step-dot ${cls}`}>{n < current ? <Icon name="check" size={14} /> : n}</div>;
}

export default function RequestRide() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useAppState();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    type: params.get('type') === 'delivery' ? 'delivery' : 'ride',
    pickup: PICKUPS[0],
    dropoff: DROPOFFS[0],
    via: '',
    payment: 'cash',
    note: '',
  });

  const distanceKm = useMemo(
    () => Number((3 + ((form.pickup.length + form.dropoff.length) % 9) + 0.2).toFixed(1)),
    [form.pickup, form.dropoff],
  );
  const etaMin = Math.round(distanceKm * 2.1);
  const fare = estimateFare(distanceKm);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function confirm() {
    setBusy(true);
    try {
      await ridesApi.create({ ...form, customerId: user.id, distanceKm, etaMin, fare: fare.total });
      showToast('Request sent — finding a rider…');
      setStep(3);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="stepper">
        <StepDot n={1} current={step} />
        <div className={`step-line ${step > 1 ? 'done' : ''}`}></div>
        <StepDot n={2} current={step} />
        <div className={`step-line ${step > 2 ? 'done' : ''}`}></div>
        <StepDot n={3} current={step} />
      </div>

      {step === 1 && (
        <div className="request-layout">
          <div className="card">
            <h3 style={{ marginBottom: 18 }}>Create {form.type === 'ride' ? 'Ride' : 'Delivery'} Request</h3>

            <label className="field-label">Request type</label>
            <div className="ride-type-grid">
              {[
                { v: 'ride', icon: 'bike', title: 'Ride', sub: 'Take me somewhere' },
                { v: 'delivery', icon: 'package', title: 'Delivery', sub: 'Move a parcel' },
              ].map((t) => (
                <div key={t.v} className={`ride-type ${form.type === t.v ? 'selected' : ''}`} onClick={() => setForm({ ...form, type: t.v })}>
                  <div className="fi" style={{ width: 34, height: 34 }}><Icon name={t.icon} /></div>
                  <div><b>{t.title}</b><span>{t.sub}</span></div>
                </div>
              ))}
            </div>

            <div className="field">
              <label>Pickup Location</label>
              <select value={form.pickup} onChange={set('pickup')}>
                {PICKUPS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Drop-off Location</label>
              <select value={form.dropoff} onChange={set('dropoff')}>
                {DROPOFFS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Add via location (optional)</label>
              <select value={form.via} onChange={set('via')}>
                <option value="">None</option>
                <option>Library Junction</option>
                <option>Main Gate</option>
              </select>
            </div>
            <div className="field">
              <label>Note for the rider (optional)</label>
              <input type="text" placeholder="e.g. 2 grocery bags" value={form.note} onChange={set('note')} />
            </div>

            <button className="btn btn-primary btn-block" onClick={() => setStep(2)}>Next: Fare Estimate</button>
          </div>
          <div className="map-box"><MapArt from={form.pickup} to={form.dropoff} /></div>
        </div>
      )}

      {step === 2 && (
        <div className="request-layout">
          <div className="card">
            <h3 style={{ marginBottom: 6 }}>Fare Estimate</h3>
            <div className="fare-summary" style={{ marginTop: 16 }}>
              <div><span>Distance</span><b>{distanceKm} km</b></div>
              <div><span>Estimated Time</span><b>{etaMin} mins</b></div>
            </div>

            <label className="field-label" style={{ marginTop: 18 }}>Fare Breakdown</label>
            <div className="fare-row"><span>Base Fare</span><span>LKR {fare.base.toFixed(2)}</span></div>
            <div className="fare-row"><span>Distance ({distanceKm} km)</span><span>LKR {fare.distanceCost.toFixed(2)}</span></div>
            <div className="fare-row"><span>Demand Charge</span><span>LKR {fare.demand.toFixed(2)}</span></div>
            <div className="fare-total"><span>Total Fare</span><span>LKR {fare.total.toFixed(2)}</span></div>
            <p className="fare-note">This is an approximate fare. Final fare may vary.</p>

            <label className="field-label">Payment method</label>
            <div className="ride-type-grid">
              {[{ v: 'cash', t: 'Cash' }, { v: 'wallet', t: 'Vanni Wallet' }].map((p) => (
                <div key={p.v} className={`ride-type ${form.payment === p.v ? 'selected' : ''}`} onClick={() => setForm({ ...form, payment: p.v })}>
                  <div className="fi" style={{ width: 34, height: 34 }}><Icon name={p.v === 'cash' ? 'card' : 'wallet'} /></div>
                  <div><b>{p.t}</b><span>{p.v === 'wallet' ? `LKR ${Number(user.wallet || 0).toFixed(2)}` : 'Pay on arrival'}</span></div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)}><Icon name="back" /> Back</button>
              <button className="btn btn-primary btn-block" onClick={confirm} disabled={busy}>
                {busy ? 'Sending…' : 'Confirm Request'}
              </button>
            </div>
          </div>
          <div className="map-box"><MapArt from={form.pickup} to={form.dropoff} /></div>
        </div>
      )}

      {step === 3 && (
        <div className="card success-card">
          <div className="success-icon"><Icon name="check" size={28} /></div>
          <h3>Request confirmed!</h3>
          <p>A rider will accept your request shortly. You can track progress live.</p>
          <button className="btn btn-primary btn-block" onClick={() => navigate('/customer/active')}>Track Request</button>
          <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={() => navigate('/customer/dashboard')}>Back to dashboard</button>
        </div>
      )}
    </>
  );
}
