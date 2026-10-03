import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import LocationMap from '../../components/LocationMap';
import { useAppState } from '../../context/AppState';
import { mapApi, ridesApi } from '../../services/api';

const coordinateLabel = ({ latitude, longitude }) =>
  `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`;

function StepDot({ n, current }) {
  const cls = n < current ? 'done' : n === current ? 'active' : '';
  return <div className={`step-dot ${cls}`}>{n < current ? <Icon name="check" size={14} /> : n}</div>;
}

function LocationSummary({ label, location, selected }) {
  return (
    <div className={`location-summary ${selected ? 'selected' : ''}`}>
      <span>{label}</span>
      <b>{location?.address || `Select ${label.toLowerCase()} on the map`}</b>
      {location && <small>{coordinateLabel(location)}</small>}
    </div>
  );
}

export default function RequestRide() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useAppState();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeLocation, setActiveLocation] = useState('pickup');
  const [preview, setPreview] = useState(null);
  const [createdRide, setCreatedRide] = useState(null);
  const [form, setForm] = useState({
    rideType: params.get('type') === 'delivery' ? 'DELIVERY' : 'TRANSPORT',
    deliveryCategory: 'PARCEL',
    pickupLocation: null,
    destination: null,
  });

  const setRideType = (rideType) => {
    setForm((current) => ({
      ...current,
      rideType,
      deliveryCategory: rideType === 'DELIVERY' ? current.deliveryCategory || 'PARCEL' : null,
    }));
    setPreview(null);
  };

  const setLocation = (target, location) => {
    setForm((current) => ({
      ...current,
      [target === 'pickup' ? 'pickupLocation' : 'destination']: location,
    }));
    setPreview(null);
  };

  async function resolvePoint(target, point) {
    setError('');
    setLocationBusy(true);
    const fallback = { ...point, address: coordinateLabel(point) };
    setLocation(target, fallback);
    try {
      const place = await mapApi.reverse(point.latitude, point.longitude);
      setLocation(target, {
        address: place?.displayName || fallback.address,
        latitude: Number(place?.latitude ?? point.latitude),
        longitude: Number(place?.longitude ?? point.longitude),
      });
    } catch {
      showToast('Address lookup was unavailable; coordinates were kept.');
    } finally {
      setLocationBusy(false);
    }
  }

  async function searchPlaces(event) {
    event.preventDefault();
    setError('');
    if (searchQuery.trim().length < 3) {
      setError('Enter at least 3 characters to search for a place.');
      return;
    }
    setSearchBusy(true);
    try {
      const places = await mapApi.search(searchQuery.trim());
      setSearchResults(places);
      if (places.length === 0) setError('No matching places were found.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSearchBusy(false);
    }
  }

  function chooseSearchResult(place) {
    setLocation(activeLocation, {
      address: place.displayName,
      latitude: Number(place.latitude),
      longitude: Number(place.longitude),
    });
    setSearchResults([]);
    setSearchQuery('');
  }

  function useCurrentLocation() {
    setError('');
    if (!navigator.geolocation) {
      setError('Current location is not supported by this browser.');
      return;
    }
    setLocationBusy(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        void resolvePoint('pickup', {
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        setActiveLocation('destination');
      },
      () => {
        setLocationBusy(false);
        setError('Location permission was not granted. You can still select the map manually.');
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }

  const routePayload = () => ({
    rideType: form.rideType,
    deliveryCategory: form.rideType === 'DELIVERY' ? form.deliveryCategory : null,
    pickupLocation: form.pickupLocation,
    destination: form.destination,
  });

  async function previewRoute() {
    setError('');
    if (!form.pickupLocation || !form.destination) {
      setError('Select both pickup and destination before continuing.');
      return;
    }
    setPreviewBusy(true);
    try {
      const routePreview = await mapApi.previewRoute(routePayload());
      setPreview(routePreview);
      setStep(2);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPreviewBusy(false);
    }
  }

  async function confirm() {
    setError('');
    setBusy(true);
    try {
      const ride = await ridesApi.create(routePayload());
      setCreatedRide(ride);
      showToast('Request sent — finding a rider…');
      setStep(3);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  const map = (
    <div className="map-box map-box-live">
      <LocationMap
        pickup={form.pickupLocation}
        destination={form.destination}
        routeGeometry={preview?.routeGeometry}
        onSelect={(point) => void resolvePoint(activeLocation, point)}
        onMovePickup={(point) => void resolvePoint('pickup', point)}
        onMoveDestination={(point) => void resolvePoint('destination', point)}
      />
      <div className="map-help">
        Click the map to set the {activeLocation}. Drag a marker to correct it.
      </div>
    </div>
  );

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
            <h3 style={{ marginBottom: 18 }}>
              Create {form.rideType === 'TRANSPORT' ? 'Ride' : 'Delivery'} Request
            </h3>
            {error && <div className="alert alert-error">{error}</div>}

            <label className="field-label">Request type</label>
            <div className="ride-type-grid">
              {[
                { value: 'TRANSPORT', icon: 'bike', title: 'Ride', sub: 'Take me somewhere' },
                { value: 'DELIVERY', icon: 'package', title: 'Delivery', sub: 'Move an item' },
              ].map((type) => (
                <button
                  type="button"
                  key={type.value}
                  className={`ride-type ${form.rideType === type.value ? 'selected' : ''}`}
                  onClick={() => setRideType(type.value)}
                >
                  <div className="fi" style={{ width: 34, height: 34 }}><Icon name={type.icon} /></div>
                  <div><b>{type.title}</b><span>{type.sub}</span></div>
                </button>
              ))}
            </div>

            {form.rideType === 'DELIVERY' && (
              <div className="field">
                <label>Delivery category</label>
                <select
                  value={form.deliveryCategory}
                  onChange={(event) => setForm({ ...form, deliveryCategory: event.target.value })}
                >
                  <option value="FOOD">Food</option>
                  <option value="WATER">Water</option>
                  <option value="PARCEL">Other / Parcel</option>
                </select>
              </div>
            )}

            <div className="location-toggle" role="group" aria-label="Location being selected">
              <button type="button" className={activeLocation === 'pickup' ? 'active' : ''} onClick={() => setActiveLocation('pickup')}>Pickup</button>
              <button type="button" className={activeLocation === 'destination' ? 'active' : ''} onClick={() => setActiveLocation('destination')}>Destination</button>
            </div>

            <LocationSummary label="Pickup" location={form.pickupLocation} selected={activeLocation === 'pickup'} />
            <LocationSummary label="Destination" location={form.destination} selected={activeLocation === 'destination'} />

            <form className="location-search" onSubmit={searchPlaces}>
              <input type="search" placeholder={`Search ${activeLocation}`} value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
              <button className="btn btn-outline btn-sm" disabled={searchBusy}>{searchBusy ? 'Searching…' : 'Search'}</button>
            </form>
            {searchResults.length > 0 && (
              <div className="location-results">
                {searchResults.map((place) => (
                  <button type="button" key={place.providerPlaceId || `${place.latitude}-${place.longitude}`} onClick={() => chooseSearchResult(place)}>
                    {place.displayName}
                  </button>
                ))}
              </div>
            )}

            <button type="button" className="btn btn-ghost btn-block btn-sm" onClick={useCurrentLocation} disabled={locationBusy}>
              <Icon name="pin" size={16} /> Use my current location as pickup
            </button>

            <button className="btn btn-primary btn-block" onClick={previewRoute} disabled={previewBusy || locationBusy} style={{ marginTop: 14 }}>
              {previewBusy ? 'Calculating road route…' : 'Next: Fare Estimate'}
            </button>
          </div>
          {map}
        </div>
      )}

      {step === 2 && preview && (
        <div className="request-layout">
          <div className="card">
            <h3 style={{ marginBottom: 6 }}>Fare Estimate</h3>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="fare-summary" style={{ marginTop: 16 }}>
              <div><span>Road distance</span><b>{preview.distanceKm} km</b></div>
              <div><span>Estimated time</span><b>{preview.durationMinutes} mins</b></div>
            </div>

            <label className="field-label" style={{ marginTop: 18 }}>Route</label>
            <div className="fare-row"><span>Pickup</span><span>{form.pickupLocation.address}</span></div>
            <div className="fare-row"><span>Destination</span><span>{form.destination.address}</span></div>
            <div className="fare-total"><span>Estimated cash fare</span><span>LKR {Number(preview.estimatedFare).toFixed(2)}</span></div>
            <p className="fare-note">The backend recalculates the road route and fare when you confirm.</p>

            <label className="field-label">Payment method</label>
            <div className="ride-type selected cash-only-option">
              <div className="fi" style={{ width: 34, height: 34 }}><Icon name="card" /></div>
              <div><b>Cash</b><span>Pay the rider after completion</span></div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)}><Icon name="back" /> Back</button>
              <button className="btn btn-primary btn-block" onClick={confirm} disabled={busy}>{busy ? 'Sending…' : 'Confirm Request'}</button>
            </div>
          </div>
          {map}
        </div>
      )}

      {step === 3 && (
        <div className="card success-card">
          <div className="success-icon"><Icon name="check" size={28} /></div>
          <h3>Request confirmed!</h3>
          <p>Request {createdRide?.id ? `#${createdRide.id.slice(-6)}` : ''} is waiting for a rider.</p>
          <button className="btn btn-primary btn-block" onClick={() => navigate(`/customer/active?rideId=${createdRide?.id || ''}`)}>Track Request</button>
          <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={() => navigate('/customer/dashboard')}>Back to dashboard</button>
        </div>
      )}
    </>
  );
}
