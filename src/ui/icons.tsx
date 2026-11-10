import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const base = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

/** Tuning fork. */
export function ForkIcon(p: P) {
  return (
    <svg {...base} {...p}>
      <path d="M8.5 3v7a3.5 3.5 0 0 0 7 0V3" />
      <path d="M12 13.5V21" />
      <path d="M10.5 21h3" />
    </svg>
  );
}

export function BarsIcon(p: P) {
  return (
    <svg {...base} {...p}>
      <path d="M5 20v-6" />
      <path d="M10 20V9" />
      <path d="M15 20v-8" />
      <path d="M20 20V4" />
    </svg>
  );
}

export function SlidersIcon(p: P) {
  return (
    <svg {...base} {...p}>
      <path d="M6 4v16" />
      <path d="M12 4v16" />
      <path d="M18 4v16" />
      <rect x="4" y="13" width="4" height="3" rx="1" fill="currentColor" stroke="none" />
      <rect x="10" y="6" width="4" height="3" rx="1" fill="currentColor" stroke="none" />
      <rect x="16" y="10" width="4" height="3" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CloseIcon(p: P) {
  return (
    <svg {...base} {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
