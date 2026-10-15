import { useCallback, useEffect, useState } from 'react';
import Icon from '../../components/Icon';
import RideCard from '../../components/RideCard';
import { useAuth } from '../../context/authStore';
import { useAppState } from '../../context/appStateStore';
import { useRealtimeEvent } from '../../context/realtimeHooks';
import { ridesApi } from '../../services/api';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'ride', label: 'Rides' },
  { key: 'delivery', label: 'Deliveries' },
];

export default function AvailableRequests() {
  const { user, setRiderAvailability } = useAuth();
  const { showToast } = useAppState();
  const [rides, setRides] = useState([]);
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [changingId, setChangingId] = useState(null);
  const [goingOnline, setGoingOnline] = useState(false);
  const approved = user.riderProfile?.approvalStatus === 'approved';
  const riderBusy = user.riderProfile?.availabilityStatus === 'busy';

  const load = useCallback((force = false) => {
    if (!approved || riderBusy || (!force && !user.online)) {
      setRides([]);
      setError('');
      setLoading(false);
      return;
    }
    setLoading(true);
    ridesApi.list({ available: true })
      .then((items) => { setRides(items); setError(''); })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [approved, riderBusy, user.online]);

  useEffect(() => {
    const initial = setTimeout(load, 0);
    const timer = user.online && approved && !riderBusy
      ? setInterval(load, 20000)
      : null;
    return () => { clearTimeout(initial); clearInterval(timer); };
  }, [approved, load, riderBusy, user.online]);

  useRealtimeEvent('new_ride_request', () => load());
  useRealtimeEvent('ride_status_changed', () => load());

  const shown = tab === 'all' ? rides : rides.filter((r) => r.type === tab);

  async function goOnline() {
    setGoingOnline(true);
    setError('');
    try {
      await setRiderAvailability(true);
      showToast("You're online — requests will appear");
      load(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setGoingOnline(false);
    }
  }

  async function setIgnored(ride, ignored) {
    setChangingId(ride.id);
    try {
      if (ignored) await ridesApi.ignore(ride.id);
      else await ridesApi.restore(ride.id);
      setRides((current) => {
        const updated = current.map((item) =>
          item.id === ride.id
            ? { ...item, ignored, ignoredAt: ignored ? new Date().toISOString() : null }
            : item
        );
        return updated.sort((left, right) => Number(left.ignored) - Number(right.ignored));
      });
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setChangingId(null);
    }
  }

  return (
    <div className="card">
      <div className="card-head"><h3>Available Requests</h3></div>
      {error && <div className="alert alert-error">{error}</div>}

      {!approved && (
        <div className="availability-banner availability-banner-warning">
          <Icon name="shield" />
          <div><b>Rider approval required</b><span>Your account must be approved before you can receive requests.</span></div>
        </div>
      )}
      {approved && riderBusy && (
        <div className="availability-banner">
          <Icon name="route" />
          <div><b>You are currently busy</b><span>Complete or cancel your active request before viewing other requests.</span></div>
        </div>
      )}
      {approved && !riderBusy && !user.online && (
        <div className="availability-banner availability-banner-offline">
          <Icon name="bike" />
          <div><b>You are currently offline</b><span>Go online to view and receive available ride and delivery requests.</span></div>
          <button type="button" className="btn btn-primary btn-sm" onClick={goOnline} disabled={goingOnline}>
            {goingOnline ? 'Going online…' : 'Go online'}
          </button>
        </div>
      )}

      <div className={`tabs ${!user.online || !approved || riderBusy ? 'tabs-disabled' : ''}`}>
        {TABS.map((t) => (
          <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {loading && user.online && approved && !riderBusy && <p className="muted">Loading…</p>}
      {!loading && shown.map((r) => (
        <RideCard
          key={r.id}
          ride={r}
          person="customer"
          to={`/rider/requests/${r.id}`}
          muted={r.ignored}
          actions={(
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setIgnored(r, !r.ignored)}
              disabled={changingId === r.id}
            >
              {changingId === r.id ? 'Saving…' : r.ignored ? 'Restore' : 'Ignore'}
            </button>
          )}
        />
      ))}
      {!loading && user.online && approved && !riderBusy && shown.length === 0 && (
        <div className="empty">
          <div className="fi"><Icon name="list" /></div>
          <b>{tab === 'all' ? 'No requests are available' : `No ${tab} requests are available`}</b>
          <p>This list refreshes automatically. New requests from customers will appear here when they are submitted.</p>
        </div>
      )}
    </div>
  );
}
