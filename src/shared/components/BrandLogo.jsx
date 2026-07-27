// Hand-drawn brain-and-circuit mark (no image asset / npm package) — a
// circular cyan-to-blue gradient badge with a lobed brain silhouette and
// small circuit-node dots, matching the FacilityBrain brand icon.
export default function BrandLogo({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="brandLogoGradient" x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#22E1FF" />
          <stop offset="1" stopColor="#0D6EFD" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#brandLogoGradient)" />

      {/* left + right brain hemispheres */}
      <path
        d="M31 17c-3.5-2-8-1.6-10.4 1.2-2.6-.6-5.4 1-5.8 4-2.4.6-4 3-3.4 5.6.4 1.7 1.6 3 3.1 3.6-1 1.3-1.5 3-1.2 4.7.5 3 3.2 5 6 4.8.6 2 2.4 3.5 4.6 3.6 2 .1 3.8-1 4.7-2.7"
        stroke="#071427" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" fill="none"
      />
      <path
        d="M33 17c3.5-2 8-1.6 10.4 1.2 2.6-.6 5.4 1 5.8 4 2.4.6 4 3 3.4 5.6-.4 1.7-1.6 3-3.1 3.6 1 1.3 1.5 3 1.2 4.7-.5 3-3.2 5-6 4.8-.6 2-2.4 3.5-4.6 3.6-2 .1-3.8-1-4.7-2.7"
        stroke="#071427" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" fill="none"
      />
      <line x1="32" y1="17" x2="32" y2="45" stroke="#071427" strokeWidth="2" strokeLinecap="round" />

      {/* circuit nodes */}
      {[[19, 24], [15, 32], [19, 41], [45, 24], [49, 32], [45, 41], [32, 47]].map(([cx, cy], i) => (
        <circle key={`n${i}`} cx={cx} cy={cy} r="1.8" fill="#071427" />
      ))}
      {[[19, 24, 25, 27], [15, 32, 22, 32], [19, 41, 25, 38], [45, 24, 39, 27], [49, 32, 42, 32], [45, 41, 39, 38]].map(([x1, y1, x2, y2], i) => (
        <line key={`c${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#071427" strokeWidth="1.3" strokeLinecap="round" />
      ))}
    </svg>
  )
}
