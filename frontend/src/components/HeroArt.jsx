import ScooterRider from './ScooterRider';

/**
 * Landing page scene: campus arch, trees, curved road and a student rider.
 */
export default function HeroArt() {
  return (
    <svg viewBox="0 0 620 440" width="100%" height="100%" role="img" aria-label="Student rider on a scooter near the university campus">
      <rect width="620" height="440" rx="26" fill="#eef7f0" />

      <ellipse cx="110" cy="320" rx="200" ry="95" fill="#e0f0e4" />
      <ellipse cx="520" cy="305" rx="180" ry="85" fill="#d9ecde" />

      {/* campus arch */}
      <g fill="#cbe4d2">
        <rect x="330" y="150" width="26" height="140" rx="6" />
        <rect x="452" y="150" width="26" height="140" rx="6" />
        <path d="M330 162a74 74 0 0 1 148 0v14H330z" />
        <rect x="383" y="94" width="42" height="66" rx="8" />
        <path d="M404 70l23 28h-46z" />
        <rect x="318" y="282" width="172" height="12" rx="5" />
      </g>
      <circle cx="404" cy="128" r="11" fill="#eef7f0" />

      {/* trees */}
      <rect x="128" y="214" width="9" height="56" rx="4" fill="#a7c9b0" />
      <rect x="546" y="216" width="8" height="50" rx="4" fill="#a7c9b0" />
      <g fill="#bbdcc3">
        <circle cx="132" cy="190" r="34" />
        <circle cx="164" cy="208" r="23" />
        <circle cx="104" cy="212" r="21" />
        <circle cx="550" cy="196" r="27" />
        <circle cx="574" cy="212" r="18" />
      </g>

      {/* road */}
      <path d="M-10 440C60 400 190 368 330 358s200-12 300-30v112z" fill="#525e58" />
      <path d="M40 434C110 404 236 382 350 375" stroke="#f3f7f4" strokeWidth="5" strokeDasharray="16 22" strokeLinecap="round" fill="none" opacity=".75" />

      {/* location pin */}
      <g transform="translate(250,138)">
        <path d="M18 56s19-20 19-34A19 19 0 0 0 -1 22c0 14 19 34 19 34z" fill="#1e7a3d" />
        <circle cx="18" cy="21" r="7" fill="#eef7f0" />
      </g>

      <g transform="translate(132,212)"><ScooterRider /></g>
    </svg>
  );
}
