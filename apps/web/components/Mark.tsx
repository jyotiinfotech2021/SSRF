export function Mark() {
  return (
    <svg className="mark" viewBox="0 0 40 40" aria-hidden="true">
      <circle className="mark-ring" cx="20" cy="20" r="18.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle className="mark-ring2" cx="20" cy="20" r="15" fill="none" stroke="currentColor" strokeWidth=".6" />
      {/* a short bright arc that travels around the outer ring */}
      <circle className="mark-glint" cx="20" cy="20" r="18.5" fill="none" strokeWidth="1.8" strokeLinecap="round" pathLength="100" strokeDasharray="9 91" />
      <path className="mark-star" d="M20 8.5l1.6 4.9h5.1l-4.1 3 1.6 4.9-4.2-3-4.2 3 1.6-4.9-4.1-3h5.1z" fill="currentColor" />
      <text x="20" y="31" textAnchor="middle" fontSize="6.2" fontFamily="Georgia,serif" letterSpacing=".6" fill="currentColor">SSRF</text>
    </svg>
  );
}
