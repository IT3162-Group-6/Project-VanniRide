import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = [
  Number(import.meta.env.VITE_MAP_INITIAL_LAT || 8.7514),
  Number(import.meta.env.VITE_MAP_INITIAL_LON || 80.4971),
];
const TILE_URL =
  import.meta.env.VITE_MAP_TILE_URL ||
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  import.meta.env.VITE_MAP_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const markerIcon = (label, className) =>
  L.divIcon({
    className: `location-marker ${className}`,
    html: `<span>${label}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

const PICKUP_ICON = markerIcon('P', 'pickup-marker');
const DESTINATION_ICON = markerIcon('D', 'destination-marker');

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });
  return null;
}

function MapViewport({ pickup, destination, routeCoordinates }) {
  const map = useMap();
  useEffect(() => {
    const points = routeCoordinates.length
      ? routeCoordinates
      : [pickup, destination]
          .filter(Boolean)
          .map((location) => [location.latitude, location.longitude]);
    if (points.length === 1) map.setView(points[0], 15);
    if (points.length > 1) {
      map.fitBounds(points, { padding: [30, 30], maxZoom: 16 });
    }
  }, [destination, map, pickup, routeCoordinates]);
  return null;
}

export default function LocationMap({
  pickup,
  destination,
  routeGeometry,
  onSelect,
  onMovePickup,
  onMoveDestination,
}) {
  const routeCoordinates = useMemo(
    () =>
      (routeGeometry?.coordinates || []).map(([longitude, latitude]) => [
        latitude,
        longitude,
      ]),
    [routeGeometry]
  );

  const dragHandler = (callback) => ({
    dragend(event) {
      const point = event.target.getLatLng();
      callback({ latitude: point.lat, longitude: point.lng });
    },
  });

  return (
    <MapContainer center={DEFAULT_CENTER} zoom={14} className="location-map">
      <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />
      <MapClickHandler onSelect={onSelect} />
      <MapViewport
        pickup={pickup}
        destination={destination}
        routeCoordinates={routeCoordinates}
      />
      {pickup && (
        <Marker
          position={[pickup.latitude, pickup.longitude]}
          icon={PICKUP_ICON}
          draggable
          eventHandlers={dragHandler(onMovePickup)}
        />
      )}
      {destination && (
        <Marker
          position={[destination.latitude, destination.longitude]}
          icon={DESTINATION_ICON}
          draggable
          eventHandlers={dragHandler(onMoveDestination)}
        />
      )}
      {routeCoordinates.length > 1 && (
        <Polyline positions={routeCoordinates} pathOptions={{ color: '#1e7a3d', weight: 5 }} />
      )}
    </MapContainer>
  );
}
