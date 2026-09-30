/**
 * Shared flat-vector scooter + student rider, drawn in a 300x210 local space.
 * Used by both the hero scene and the smaller dashboard illustration.
 */
export default function ScooterRider() {
  return (
    <g>
      <ellipse cx="150" cy="196" rx="132" ry="13" fill="#2f4136" opacity=".13" />

      {/* wheels */}
      <circle cx="72" cy="158" r="31" fill="#1b2420" />
      <circle cx="72" cy="158" r="14" fill="#cbd8cf" />
      <circle cx="238" cy="158" r="31" fill="#1b2420" />
      <circle cx="238" cy="158" r="14" fill="#cbd8cf" />

      {/* scooter body */}
      <path d="M98 152V120c0-9 6-15 15-15h40c8 0 13 5 15 13l7 34z" fill="#249149" />
      <path d="M100 148h84v16h-84z" fill="#1e7a3d" />
      <path d="M180 164l14-46c3-10 9-15 19-16l20-3 5 18-20 3-16 44z" fill="#249149" />
      <path d="M232 100l30-9" stroke="#1b2420" strokeWidth="9" strokeLinecap="round" />
      <path d="M241 104l3 32" stroke="#186531" strokeWidth="9" strokeLinecap="round" />
      <circle cx="243" cy="104" r="8" fill="#eaf6ec" />
      <rect x="92" y="92" width="76" height="19" rx="9" fill="#1b2420" />

      {/* delivery box */}
      <rect x="54" y="78" width="50" height="46" rx="9" fill="#1b2420" />
      <rect x="64" y="90" width="30" height="22" rx="5" fill="#33413a" />
      <path d="M72 101h14M79 94v14" stroke="#8fe0a8" strokeWidth="3.4" strokeLinecap="round" />

      {/* leg */}
      <path d="M126 106l40 22-20 30" stroke="#2f3b34" strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M140 156h22" stroke="#1b2420" strokeWidth="11" strokeLinecap="round" />

      {/* torso + arm */}
      <path d="M124 104L168 64" stroke="#249149" strokeWidth="30" strokeLinecap="round" />
      <path d="M170 68l58 26" stroke="#249149" strokeWidth="13" strokeLinecap="round" />
      <path d="M150 88l16-15" stroke="#1e7a3d" strokeWidth="12" strokeLinecap="round" />
      <circle cx="232" cy="96" r="8" fill="#f0d0b4" />

      {/* head */}
      <path d="M186 58c-6 5-15 5-21-1l-3 10 14 8z" fill="#f0d0b4" />
      <circle cx="180" cy="42" r="23" fill="#249149" />
      <path d="M180 19a23 23 0 0 1 23 23h-14a9 9 0 0 0-9-9z" fill="#1e7a3d" />
      <path d="M196 36c8 0 12 5 12 10s-5 8-12 8z" fill="#d6ebdb" />
      <path d="M170 48h22v3a11 11 0 0 1-22 0z" fill="#3a2b22" />
    </g>
  );
}
