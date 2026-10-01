import { useId } from 'react';

/** The shield from the logo, drawn in SVG so it stays sharp at any size and on dark backgrounds. */
export default function ShieldLogo({ className }: { className?: string }) {
  const clip = useId();
  return (
    <svg className={className} viewBox="0 0 64 72" role="img" aria-label="QueerSafeSpace shield">
      <defs>
        <clipPath id={clip}>
          <path d="M32 3 L59 12 V33 C59 50 48 62 32 69 C16 62 5 50 5 33 V12 Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <g transform="rotate(-14 32 36)">
          <rect x="-10" y="-4" width="90" height="16" fill="#e03c3c" />
          <rect x="-10" y="12" width="90" height="13" fill="#f58a2f" />
          <rect x="-10" y="25" width="90" height="12" fill="#f6c945" />
          <rect x="-10" y="37" width="90" height="12" fill="#3e9e5e" />
          <rect x="-10" y="49" width="90" height="12" fill="#3b8bd0" />
          <rect x="-10" y="61" width="90" height="20" fill="#8a6db8" />
        </g>
      </g>
      <path
        d="M32 3 L59 12 V33 C59 50 48 62 32 69 C16 62 5 50 5 33 V12 Z"
        fill="none"
        stroke="#163a63"
        strokeWidth="4.5"
        strokeLinejoin="round"
      />
      <path
        d="M32 50 C21 43 17 37 17 32 C17 27 21 24 25 24 C28 24 30.5 25.7 32 28.5 C33.5 25.7 36 24 39 24 C43 24 47 27 47 32 C47 37 43 43 32 50 Z"
        fill="#a9dcea"
        stroke="#163a63"
        strokeWidth="3.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
