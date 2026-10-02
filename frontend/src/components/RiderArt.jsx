import ScooterRider from './ScooterRider';

/** Compact rider illustration used inside dashboard cards and promo blocks. */
export default function RiderArt({ tone = 'light' }) {
  return (
    <svg viewBox="0 0 300 210" width="100%" height="100%" role="img" aria-label="Student rider illustration">
      <ellipse cx="150" cy="180" rx="140" ry="30" fill={tone === 'light' ? '#d8eedd' : 'rgba(255,255,255,.14)'} />
      <ScooterRider />
    </svg>
  );
}
