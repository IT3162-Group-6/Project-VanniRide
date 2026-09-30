export default function MapArt({ from = 'Science Faculty', to = 'Vavuniya Town' }) {
  return (
    <svg viewBox="0 0 400 380" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="380" fill="#e7f2e9" />
      <path d="M0 260 L400 220" stroke="#cfe3d1" strokeWidth="26" />
      <path d="M60 0 L120 380" stroke="#cfe3d1" strokeWidth="18" />
      <path d="M40 90 Q220 40 340 210" stroke="#1e7a3d" strokeWidth="4" fill="none" strokeDasharray="2 10" strokeLinecap="round" />
      <circle cx="40" cy="90" r="8" fill="#1e7a3d" />
      <circle cx="340" cy="210" r="8" fill="#14301f" />
      <text x="52" y="80" fontSize="13" fill="#14301f" fontFamily="sans-serif" fontWeight="700">{from}</text>
      <text x="240" y="200" fontSize="13" fill="#14301f" fontFamily="sans-serif" fontWeight="700">{to}</text>
    </svg>
  );
}
