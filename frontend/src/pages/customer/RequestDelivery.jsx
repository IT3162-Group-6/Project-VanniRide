import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import LocationMap from '../../components/LocationMap';
import { useAppState } from '../../context/AppState';
import { mapApi, ridesApi } from '../../services/api';

const FOOD_OUTLETS = [
  { id: 'hostel', label: 'Hostel canteen', address: 'Hostel Canteen', latitude: 8.7520, longitude: 80.4980 },
  { id: 'bs', label: 'BS canteen', address: 'BS Canteen', latitude: 8.7510, longitude: 80.4975 },
  { id: 'rilwan', label: 'Rilwan', address: 'Rilwan', latitude: 8.7530, longitude: 80.4965 },
  { id: 'rs', label: 'RS', address: 'RS', latitude: 8.7505, longitude: 80.4960 },
  { id: 'other', label: 'Other (Manual Selection)', address: '', latitude: null, longitude: null },
];

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

export default function RequestDelivery() {
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
    rideType: 'DELIVERY',
    deliveryCategory: 'PARCEL',
    pickupLocation: null,
    destination: null,
    packageWeight: '',
    foodType: '',
    waterAmount: '',
    receiverName: '',
    receiverPhone: '',
    foodOutletId: '',
  });

  const setLocation = (target, location) => {
    setForm((current) => {
      const updates = { [target === 'pickup' ? 'pickupLocation' : 'destination']: location };
      if (target === 'pickup' && current.deliveryCategory === 'FOOD') {
        const matchedPreset = FOOD_OUTLETS.find(o => o.address === location?.address);
        updates.foodOutletId = matchedPreset ? matchedPreset.id : 'other';
      }
      return { ...current, ...updates };
    });
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
    if (activeLocation === 'pickup' && form.deliveryCategory !== 'WATER') {
      setActiveLocation('destination');
    }
  }

  function useCurrentLocation(target = activeLocation) {
    setError('');
    if (!navigator.geolocation) {
      setError('Current location is not supported by this browser.');
      return;
    }
    setLocationBusy(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        void resolvePoint(target, {
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        if (target === 'pickup' && form.deliveryCategory !== 'WATER') {
          setActiveLocation('destination');
        }
      },
      () => {
        setLocationBusy(false);
        setError('Location permission was not granted. You can still select the map manually.');
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }

  const routePayload = () => {
    let noteText = '';
    
    if (form.deliveryCategory === 'FOOD' && form.foodType) {
      noteText += `Food Type: ${form.foodType}. `;
    } else if (form.deliveryCategory === 'WATER' && form.waterAmount) {
      noteText += `Amount of Water: ${form.waterAmount}. `;
    } else if (form.deliveryCategory === 'PARCEL' && form.packageWeight) {
      noteText += `Weight: ${form.packageWeight}kg. `;
    }

    if (form.receiverName || form.receiverPhone) {
      noteText += `Receiver: ${form.receiverName} ${form.receiverPhone}`;
    }

    return {
      rideType: 'DELIVERY',
      deliveryCategory: form.deliveryCategory,
      pickupLocation: form.pickupLocation,
      destination: form.destination,
      note: noteText.trim()
    };
  };

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

  async function handleMapClick(point) {
    const currentTarget = activeLocation;
    await resolvePoint(currentTarget, point);
    if (currentTarget === 'pickup' && form.deliveryCategory !== 'WATER') {
      setActiveLocation('destination');
    }
  }

  const map = (
    <div className="map-box map-box-live">
      <LocationMap
        pickup={form.deliveryCategory === 'WATER' ? null : form.pickupLocation}
        destination={form.destination}
        routeGeometry={preview?.routeGeometry}
        onSelect={handleMapClick}
        onMovePickup={activeLocation === 'pickup' && form.deliveryCategory !== 'WATER' ? (point) => void resolvePoint('pickup', point) : undefined}
        onMoveDestination={activeLocation === 'destination' ? (point) => void resolvePoint('destination', point) : undefined}
      />
      <div className="map-help">
        {form.deliveryCategory === 'WATER' 
          ? 'Click or drag to set the delivery destination.' 
          : (activeLocation === 'pickup' ? 'Click or drag to set the pickup.' : 'Click or drag to set the destination.')}
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
              Create Delivery Request
            </h3>
            {error && <div className="alert alert-error">{error}</div>}

            <div className="field">
              <label>Delivery category</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', marginBottom: '4px' }}>
                {[
                  { value: 'FOOD', icon: 'food', label: 'Food' },
                  { value: 'WATER', icon: 'water', label: 'Water' },
                  { value: 'PARCEL', icon: 'package', label: 'Parcel' },
                ].map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => {
                      if (form.deliveryCategory === cat.value) return;
                      const updates = { deliveryCategory: cat.value };
                      if (cat.value === 'WATER') {
                        updates.pickupLocation = { address: 'Campus Water Depot', latitude: 8.7514, longitude: 80.4971 };
                        setActiveLocation('destination');
                      } else if (form.deliveryCategory === 'WATER') {
                        updates.pickupLocation = null;
                        setActiveLocation('pickup');
                      }
                      setForm({ ...form, ...updates });
                    }}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px 4px',
                      borderRadius: 'var(--radius-md, 8px)',
                      border: `1px solid ${form.deliveryCategory === cat.value ? 'var(--green-600)' : 'var(--line)'}`,
                      background: form.deliveryCategory === cat.value ? 'var(--green-600)' : '#fff',
                      color: form.deliveryCategory === cat.value ? '#fff' : 'var(--ink-soft)',
                      cursor: 'pointer',
                      fontWeight: form.deliveryCategory === cat.value ? '600' : 'normal',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Icon name={cat.icon} size={22} />
                    <span style={{ fontSize: '0.85rem' }}>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {form.deliveryCategory === 'FOOD' && (
              <>
                <div className="field">
                  <label>Food Type</label>
                  <input type="text" placeholder="e.g., Rice & Curry, Short Eats, Lunch Box" value={form.foodType} onChange={(e) => setForm({ ...form, foodType: e.target.value })} />
                </div>
                <div className="field">
                  <label>Select Food Outlet</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                    {FOOD_OUTLETS.map(outlet => (
                      <button
                        key={outlet.id}
                        type="button"
                        onClick={() => {
                          if (outlet.id !== 'other') {
                            setLocation('pickup', { address: outlet.address, latitude: outlet.latitude, longitude: outlet.longitude });
                            setActiveLocation('destination');
                          } else {
                            setLocation('pickup', null);
                            setActiveLocation('pickup');
                          }
                        }}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '20px',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: `1px solid ${form.foodOutletId === outlet.id ? 'var(--green-600)' : 'var(--line)'}`,
                          background: form.foodOutletId === outlet.id ? 'var(--green-600)' : '#fff',
                          color: form.foodOutletId === outlet.id ? '#fff' : 'var(--ink-soft)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {outlet.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            {form.deliveryCategory === 'WATER' && (
              <div className="field">
                <label>Amount of Water</label>
                <input type="text" placeholder="e.g., 5L, 20L bottle, 2 bottles" value={form.waterAmount} onChange={(e) => setForm({ ...form, waterAmount: e.target.value })} />
              </div>
            )}
            {form.deliveryCategory === 'PARCEL' && (
              <div className="field">
                <label>Package Weight (kg)</label>
                <input type="number" placeholder="e.g. 2" value={form.packageWeight} onChange={(e) => setForm({ ...form, packageWeight: e.target.value })} />
              </div>
            )}

            <div className="field">
              <label>Receiver Name</label>
              <input type="text" placeholder="John Doe" value={form.receiverName} onChange={(e) => setForm({ ...form, receiverName: e.target.value })} />
            </div>

            <div className="field">
              <label>Receiver Phone</label>
              <input type="tel" placeholder="07X XXX XXXX" value={form.receiverPhone} onChange={(e) => setForm({ ...form, receiverPhone: e.target.value })} />
            </div>

            {form.deliveryCategory !== 'WATER' && (
              <div className="location-toggle" role="group" aria-label="Location being selected">
                <button type="button" className={activeLocation === 'pickup' ? 'active' : ''} onClick={() => setActiveLocation('pickup')}>Pickup</button>
                <button type="button" className={activeLocation === 'destination' ? 'active' : ''} onClick={() => setActiveLocation('destination')}>Destination</button>
              </div>
            )}

            {form.deliveryCategory !== 'WATER' && activeLocation === 'pickup' && (
              <LocationSummary label="Pickup" location={form.pickupLocation} selected={true} />
            )}
            {(activeLocation === 'destination' || form.deliveryCategory === 'WATER') && (
              <LocationSummary label={form.deliveryCategory === 'WATER' ? "Delivery Destination" : "Destination"} location={form.destination} selected={true} />
            )}

            <form className="location-search" onSubmit={searchPlaces}>
              <input type="search" placeholder={`Search ${form.deliveryCategory === 'WATER' ? 'destination' : activeLocation}`} value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
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

            {form.deliveryCategory !== 'WATER' && activeLocation === 'pickup' ? (
              <button type="button" className="btn btn-ghost btn-block btn-sm" onClick={() => useCurrentLocation('pickup')} disabled={locationBusy}>
                <Icon name="pin" size={16} /> Use my current location as pickup
              </button>
            ) : (
              <>
                <button type="button" className="btn btn-ghost btn-block btn-sm" onClick={() => useCurrentLocation('destination')} disabled={locationBusy}>
                  <Icon name="pin" size={16} /> Use my current location as destination
                </button>
                <div style={{ marginTop: 12, textAlign: 'center', fontSize: '0.9em', color: 'var(--text-muted, #666)' }}>
                  <Icon name="map" size={16} /> Or choose destination on the map
                </div>
              </>
            )}

            {form.pickupLocation && form.destination && (
              <div className="route-block" style={{ marginTop: 24, position: 'relative' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: 'var(--green-900)' }}>Selected Route Summary</h4>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 5, top: 18, bottom: 18, width: 2, background: 'transparent', borderLeft: '2px dashed var(--green-600)' }}></div>
                  
                  <div className="route-point" style={{ alignItems: 'center' }}>
                    <div className="dot dot-start" style={{ position: 'relative', zIndex: 1, margin: 0 }}></div>
                    <div style={{ flex: 1, marginLeft: 8 }}>
                      <span style={{ fontWeight: 600 }}>{form.deliveryCategory === 'WATER' ? 'Supplier' : 'Pickup'}</span>
                      <b style={{ marginTop: 2 }}>{form.pickupLocation.address}</b>
                    </div>
                    {form.deliveryCategory !== 'WATER' && (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setActiveLocation('pickup')} aria-label="Change Pickup">
                        <Icon name="edit" size={14} />
                      </button>
                    )}
                  </div>

                  <div className="route-point" style={{ alignItems: 'center', marginTop: 8 }}>
                    <div className="dot dot-end" style={{ background: '#d32f2f', position: 'relative', zIndex: 1, margin: 0 }}></div>
                    <div style={{ flex: 1, marginLeft: 8 }}>
                      <span style={{ fontWeight: 600 }}>Destination</span>
                      <b style={{ marginTop: 2 }}>{form.destination.address}</b>
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setActiveLocation('destination')} aria-label="Change Destination">
                      <Icon name="edit" size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            <button 
              className="btn btn-primary btn-block" 
              onClick={previewRoute} 
              disabled={previewBusy || locationBusy || !form.pickupLocation || !form.destination} 
              style={{ 
                marginTop: 14,
                boxShadow: (form.pickupLocation && form.destination) ? '0 4px 14px rgba(30, 122, 61, 0.4)' : 'none',
                transition: 'box-shadow 0.2s ease-in-out'
              }}>
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
