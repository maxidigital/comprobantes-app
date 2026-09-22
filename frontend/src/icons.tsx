interface IconProps {
  className?: string;
}

const commonProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  width: '1em',
  height: '1em',
};

export function MenuIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

export function BellIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 6.5-2.5 8.5-2.5 8.5h17S18 14.5 18 8Z" />
      <path d="M13.73 20a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export function MegaphoneIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <path d="M3 10v4a1 1 0 0 0 1 1h2l9 5V4L6 9H4a1 1 0 0 0-1 1Z" />
      <path d="M15 8.5a4 4 0 0 1 0 7" />
      <path d="M7 15v4a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-4" />
    </svg>
  );
}

export function RefreshIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <path d="M20 11a8 8 0 0 0-14.6-4.4M4 4v4h4" />
      <path d="M4 13a8 8 0 0 0 14.6 4.4M20 20v-4h-4" />
    </svg>
  );
}

export function ChartIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <path d="M4 20V10" />
      <path d="M12 20V4" />
      <path d="M20 20v-7" />
      <path d="M3 20h18" />
    </svg>
  );
}

export function SunIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

export function MoonIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}
