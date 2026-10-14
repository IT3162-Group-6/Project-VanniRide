import riderIllustration from '../assets/rider-dashboard-v2.png';

/** Compact rider illustration used inside dashboard cards and promo blocks. */
export default function RiderArt() {
  return (
    <img
      className="rider-art-image"
      src={riderIllustration}
      alt="Student delivery rider on a green scooter"
      decoding="async"
    />
  );
}
