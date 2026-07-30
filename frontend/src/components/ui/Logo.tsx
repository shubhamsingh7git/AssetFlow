export default function Logo({ className = "w-6 h-6 text-white" }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 100 100" 
      className={className}
      fill="currentColor"
    >
      {/* Outer gear rim */}
      <circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" strokeWidth="8" />

      {/* Inner white circle boundary */}
      <circle cx="50" cy="50" r="30" fill="none" stroke="white" strokeWidth="4" />

      {/* Solid center circle */}
      <circle cx="50" cy="50" r="23" fill="currentColor" />

      {/* White Rupee sign */}
      <text 
        x="50" 
        y="58" 
        fontFamily="sans-serif" 
        fontSize="24" 
        fontWeight="bold" 
        fill="white" 
        textAnchor="middle"
      >
        ₹
      </text>

      {/* Gear teeth rotated around center (excluding top-right 45 deg quadrant) */}
      <rect x="45" y="4" width="10" height="12" rx="2" fill="currentColor" transform="rotate(0 50 50)" />
      <rect x="45" y="4" width="10" height="12" rx="2" fill="currentColor" transform="rotate(-45 50 50)" />
      <rect x="45" y="4" width="10" height="12" rx="2" fill="currentColor" transform="rotate(-90 50 50)" />
      <rect x="45" y="4" width="10" height="12" rx="2" fill="currentColor" transform="rotate(-135 50 50)" />
      <rect x="45" y="4" width="10" height="12" rx="2" fill="currentColor" transform="rotate(180 50 50)" />
      <rect x="45" y="4" width="10" height="12" rx="2" fill="currentColor" transform="rotate(135 50 50)" />
      <rect x="45" y="4" width="10" height="12" rx="2" fill="currentColor" transform="rotate(90 50 50)" />

      {/* Sun rays in top-right quadrant */}
      <line x1="50" y1="12" x2="50" y2="2" stroke="currentColor" strokeWidth="4" strokeLinecap="round" transform="rotate(25 50 50)" />
      <line x1="50" y1="12" x2="50" y2="2" stroke="currentColor" strokeWidth="4" strokeLinecap="round" transform="rotate(47.5 50 50)" />
      <line x1="50" y1="12" x2="50" y2="2" stroke="currentColor" strokeWidth="4" strokeLinecap="round" transform="rotate(70 50 50)" />
    </svg>
  );
}
