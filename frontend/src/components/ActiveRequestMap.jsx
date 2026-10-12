import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = [8.7514, 80.4971];
const TILE_URL = import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = import.meta.env.VITE_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const marker = (label, className) => L.divIcon({
  className: `location-marker ${className}`,
  html: `<span>${label}</span>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const PICKUP_ICON = marker('P', 'pickup-marker');
const DESTINATION_ICON = marker('D', 'destination-marker');

const validPoint = (location) =>
  Number.isFinite(Number(location?.latitude)) && Number.isFinite(Number(location?.longitude));

function FitLocations({ pickup, destination }) {
  const map = useMap();
  useEffect(() => {
    const points = [pickup, destination]
      .filter(validPoint)
      .map((location) => [Number(location.latitude), Number(location.longitude)]);
    if (points.length === 1) map.setView(points[0], 15);
    if (points.length > 1) map.fitBounds(points, { padding: [38, 38], maxZoom: 16 });
  }, [destination, map, pickup]);
  return null;
}

export default function ActiveRequestMap({ pickup, destination }) {
  if (!validPoint(pickup) && !validPoint(destination)) return null;
  return (
    <MapContainer center={DEFAULT_CENTER} zoom={14} className="location-map" scrollWheelZoom>
      <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />
      <FitLocations pickup={pickup} destination={destination} />
      {validPoint(pickup) && <Marker position={[Number(pickup.latitude), Number(pickup.longitude)]} icon={PICKUP_ICON} />}
      {validPoint(destination) && <Marker position={[Number(destination.latitude), Number(destination.longitude)]} icon={DESTINATION_ICON} />}
    </MapContainer>
  );
}
