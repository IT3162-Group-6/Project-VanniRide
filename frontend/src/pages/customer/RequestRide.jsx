import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import DeliveryDetailsForm, { DeliveryOrderSummary } from '../../components/DeliveryDetailsForm';
import LocationMap from '../../components/LocationMap';
import { useAppState } from '../../context/appStateStore';
import { QUICK_PICK_LOCATIONS } from '../../data/quickPickLocations';
import {
  FOOD_PICKUP_LOCATIONS,
  WATER_SOURCE_LOCATIONS,
  buildDeliveryPayload,
  createDefaultDeliveryDetails,
  validateDeliveryDetails,
} from '../../data/deliveryOptions';
import { mapApi, ridesApi } from '../../services/api';
import { getLocationLabels } from '../../utils/locationLabels';

const coordinateLabel = ({ latitude, longitude }) =>
  `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`;

function StepDot({ n, current }) {
  const cls = n < current ? 'done' : n === current ? 'active' : '';
  return <div className={`step-dot ${cls}`}>{n < current ? <Icon name="check" size={14} /> : n}</div>;
}

function LocationSummary({ label, location, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`location-summary ${selected ? 'selected' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span>{label}</span>
      <b>{location?.address || `Select ${label.toLowerCase()} on the map`}</b>
      {location && <small>{coordinateLabel(location)}</small>}
    </button>
  );
}

export default function RequestRide() {
  const [params] = useSearchParams();
  const requestedRideType = params.get('type') === 'delivery' ? 'DELIVERY' : 'TRANSPORT';
  return <RequestRideForm key={requestedRideType} requestedRideType={requestedRideType} />;
}

function RequestRideForm({ requestedRideType }) {
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
  const [deliveryDetails, setDeliveryDetails] = useState(createDefaultDeliveryDetails);
  const [form, setForm] = useState({
    rideType: requestedRideType,
    deliveryCategory: 'FOOD',
    pickupLocation: null,
    destination: null,
  });

  const setDeliveryCategory = (deliveryCategory) => {
    if (deliveryCategory === form.deliveryCategory) return;
    setForm((current) => ({
      ...current,
      deliveryCategory,
      pickupLocation: null,
      destination: null,
    }));
    setActiveLocation('pickup');
    setSearchQuery('');
    setSearchResults([]);
    setPreview(null);
    setError('');
  };

  const setLocation = (target, location) => {
    setForm((current) => ({
      ...current,
      [target === 'pickup' ? 'pickupLocation' : 'destination']: location,
    }));
    setPreview(null);
  };

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 3) return undefined;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearchBusy(true);
      setError('');
      try {
        const places = await mapApi.search(query, { signal: controller.signal });
        setSearchResults(places);
        if (places.length === 0) {
          setError('No matching places were found in Northern Province.');
        }
      } catch (requestError) {
        if (requestError.name !== 'AbortError') setError(requestError.message);
      } finally {
        if (!controller.signal.aborted) setSearchBusy(false);
      }
    }, 450);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  function updateSearchQuery(event) {
    const value = event.target.value;
    setSearchQuery(value);
    setSearchResults([]);
    setError('');
    if (value.trim().length < 3) setSearchBusy(false);
  }

  async function resolvePoint(target, point, advanceSelection = false) {
    setError('');
    setLocationBusy(true);
    const fallback = { ...point, address: coordinateLabel(point) };
    setLocation(target, fallback);
    if (advanceSelection) {
      setActiveLocation(target === 'pickup' ? 'destination' : 'pickup');
    }
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

  function chooseSearchResult(place) {
    setLocation(activeLocation, {
      address: place.displayName,
      latitude: Number(place.latitude),
      longitude: Number(place.longitude),
    });
    setSearchResults([]);
    setSearchQuery('');
    setActiveLocation(activeLocation === 'pickup' ? 'destination' : 'pickup');
  }

  function chooseFoodPickup(place) {
    setDeliveryDetails((current) => ({
      ...current,
      foodOrder: {
        ...current.foodOrder,
        outletCode: place.id,
        outletName: place.displayName,
      },
    }));
    setLocation('pickup', {
      address: place.displayName,
      latitude: place.latitude,
      longitude: place.longitude,
    });
    setActiveLocation('destination');
    setSearchQuery('');
    setSearchResults([]);
    setPreview(null);
    setError('');
  }

  function chooseWaterSource(place) {
    setLocation('destination', {
      address: place.displayName,
      latitude: place.latitude,
      longitude: place.longitude,
    });
    setActiveLocation('pickup');
    setSearchQuery('');
    setSearchResults([]);
    setPreview(null);
    setError('');
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
        void resolvePoint(activeLocation, {
          latitude: coords.latitude,
          longitude: coords.longitude,
        }, true);
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
    ...(form.rideType === 'DELIVERY'
      ? { deliveryDetails: buildDeliveryPayload(deliveryDetails, form.deliveryCategory) }
      : {}),
    pickupLocation: form.pickupLocation,
    destination: form.destination,
  });

  async function previewRoute() {
    setError('');
    if (form.rideType === 'DELIVERY') {
      const validationError = validateDeliveryDetails(deliveryDetails, form.deliveryCategory);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    if (!form.pickupLocation || !form.destination) {
      setError(`Select both ${locationLabels.pickup.toLowerCase()} and ${locationLabels.destination.toLowerCase()} before continuing.`);
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

  const locationLabels = getLocationLabels(form.rideType, form.deliveryCategory);
  const activeLocationLabel = locationLabels[activeLocation];
  const showGeneralQuickPicks = form.rideType === 'TRANSPORT'
    || form.deliveryCategory === 'PARCEL'
    || (form.deliveryCategory === 'FOOD' && activeLocation === 'destination')
    || (form.deliveryCategory === 'WATER' && activeLocation === 'pickup');

  const map = (
    <div className="map-box map-box-live">
      <LocationMap
        pickup={form.pickupLocation}
        destination={form.destination}
        routeGeometry={preview?.routeGeometry}
        onSelect={(point) => void resolvePoint(activeLocation, point, true)}
        onMovePickup={(point) => void resolvePoint('pickup', point)}
        onMoveDestination={(point) => void resolvePoint('destination', point)}
      />
      <div className="map-help">
        Click the map to set the {activeLocationLabel.toLowerCase()}. Drag a marker to correct it.
      </div>
    </div>
  );

  const locationPicker = (
    <div className="location-picker">
      <div className="location-toggle" role="group" aria-label="Location being selected">
        <button type="button" className={activeLocation === 'pickup' ? 'active' : ''} onClick={() => setActiveLocation('pickup')}>{locationLabels.pickup}</button>
        <button type="button" className={activeLocation === 'destination' ? 'active' : ''} onClick={() => setActiveLocation('destination')}>{locationLabels.destination}</button>
      </div>

      <LocationSummary label={locationLabels.pickup} location={form.pickupLocation} selected={activeLocation === 'pickup'} onSelect={() => setActiveLocation('pickup')} />
      <LocationSummary label={locationLabels.destination} location={form.destination} selected={activeLocation === 'destination'} onSelect={() => setActiveLocation('destination')} />

      <div className="location-search">
        <input type="search" placeholder={`Search ${activeLocationLabel.toLowerCase()} in Northern Province`} value={searchQuery} onChange={updateSearchQuery} />
        {searchBusy && <span role="status">Searching…</span>}
      </div>
      {searchResults.length > 0 && (
        <div className="location-results">
          {searchResults.map((place) => (
            <button type="button" key={place.providerPlaceId || `${place.latitude}-${place.longitude}`} onClick={() => chooseSearchResult(place)}>
              {place.displayName}
            </button>
          ))}
        </div>
      )}

      {showGeneralQuickPicks && (
        <div className="quick-picks" aria-label="Frequently used locations">
          <span>{activeLocationLabel} quick picks</span>
          <div>
            {QUICK_PICK_LOCATIONS.map((place) => (
              <button type="button" key={place.id} onClick={() => chooseSearchResult(place)}>
                <Icon name="pin" size={13} /> {place.displayName}
              </button>
            ))}
          </div>
        </div>
      )}

      <button type="button" className="btn btn-ghost btn-block btn-sm" onClick={useCurrentLocation} disabled={locationBusy}>
        <Icon name="pin" size={16} /> Use my current location as {activeLocationLabel.toLowerCase()}
      </button>
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

            {form.rideType === 'DELIVERY' && (
              <div className="delivery-category-tabs" role="tablist" aria-label="Delivery category">
                {[
                  { value: 'FOOD', label: 'Food' },
                  { value: 'WATER', label: 'Water' },
                  { value: 'PARCEL', label: 'Other Parcel' },
                ].map((category) => (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={form.deliveryCategory === category.value}
                    className={form.deliveryCategory === category.value ? 'active' : ''}
                    key={category.value}
                    onClick={() => setDeliveryCategory(category.value)}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            )}

            {form.rideType === 'DELIVERY' && form.deliveryCategory === 'FOOD' && locationPicker}

            {form.rideType === 'DELIVERY' && (
              <DeliveryDetailsForm
                category={form.deliveryCategory}
                details={deliveryDetails}
                foodPickupLocations={FOOD_PICKUP_LOCATIONS}
                waterPickupLocations={WATER_SOURCE_LOCATIONS}
                onChooseFoodPickup={chooseFoodPickup}
                onChooseWaterPickup={chooseWaterSource}
                selectedPickup={form.destination}
                setDetails={(updater) => {
                  setDeliveryDetails(updater);
                  setPreview(null);
                }}
              />
            )}

            {(form.rideType === 'TRANSPORT' || form.deliveryCategory !== 'FOOD') && locationPicker}

            <button className="btn btn-primary btn-block" onClick={previewRoute} disabled={previewBusy || locationBusy} style={{ marginTop: 14 }}>
              {previewBusy ? 'Calculating road route…' : `Next: ${form.rideType === 'DELIVERY' ? 'Delivery' : 'Fare'} Estimate`}
            </button>
          </div>
          {map}
        </div>
      )}

      {step === 2 && preview && (
        <div className="request-layout">
          <div className="card">
            <h3 style={{ marginBottom: 6 }}>{form.rideType === 'DELIVERY' ? 'Delivery Summary' : 'Fare Estimate'}</h3>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="fare-summary" style={{ marginTop: 16 }}>
              <div><span>Road distance</span><b>{preview.distanceKm} km</b></div>
              <div><span>Estimated time</span><b>{preview.durationMinutes} mins</b></div>
            </div>

            <label className="field-label" style={{ marginTop: 18 }}>Route</label>
            <div className="fare-row"><span>{locationLabels.pickup}</span><span>{form.pickupLocation.address}</span></div>
            <div className="fare-row"><span>{locationLabels.destination}</span><span>{form.destination.address}</span></div>
            {form.rideType === 'DELIVERY' && <>
              {form.deliveryCategory === 'PARCEL' && (
                <div className="delivery-review-contact">
                  <span>Receiver</span>
                  <b>{deliveryDetails.receiverMode === 'SELF'
                    ? 'Me · account phone number'
                    : `${deliveryDetails.receiverName} · ${deliveryDetails.receiverPhone}`}</b>
                </div>
              )}
              <DeliveryOrderSummary category={form.deliveryCategory} details={deliveryDetails} compact />
              {preview.fareBreakdown && <div className="delivery-price-breakdown">
                <div><span>Base delivery charge</span><b>LKR {Number(preview.fareBreakdown.baseFare).toFixed(2)}</b></div>
                <div><span>Distance charge</span><b>LKR {Number(preview.fareBreakdown.distanceCharge).toFixed(2)}</b></div>
                <div><span>Quantity / weight handling</span><b>LKR {Number(preview.fareBreakdown.handlingCharge).toFixed(2)}</b></div>
              </div>}
            </>}
            <div className="fare-total"><span>Estimated {form.rideType === 'DELIVERY' ? 'delivery charge' : 'cash fare'}</span><span>LKR {Number(preview.estimatedFare).toFixed(2)}</span></div>
            <p className="fare-note">The backend recalculates the road route and fare when you confirm.</p>
            {form.rideType === 'DELIVERY' && <p className="fare-note">Food or product purchase cost is separate and is not included in this delivery charge.</p>}

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
