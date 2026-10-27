const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export const HomeIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
    <path d="M10 21v-6h4v6" />
  </svg>
);

export const EntriesIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 15 15 9M15 9h-4.5M15 9v4.5" />
  </svg>
);

export const LogoutIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3v9" />
    <path d="M6.3 7.3a8 8 0 1 0 11.4 0" />
  </svg>
);

export const MenuIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const BellIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

export const PinIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export const CalendarIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

export const EyeIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const EyeOffIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M9.9 4.24A9 9 0 0 1 12 4c6.5 0 10 7 10 7a17 17 0 0 1-2.16 3.19M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24M2 2l20 20" />
  </svg>
);

export const CloseIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const ChevronIcon = ({ dir = 'down', ...p }) => {
  const r = { down: 0, up: 180, left: 90, right: -90 }[dir];
  return (
    <svg {...base} {...p} style={{ transform: `rotate(${r}deg)`, ...(p.style || {}) }}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
};

export const TrendIcon = ({ up = true, ...p }) => (
  <svg {...base} width={16} height={16} {...p}>
    {up ? (
      <>
        <path d="m22 7-8.5 8.5-5-5L2 17" />
        <path d="M16 7h6v6" />
      </>
    ) : (
      <>
        <path d="m22 17-8.5-8.5-5 5L2 7" />
        <path d="M16 17h6v-6" />
      </>
    )}
  </svg>
);

export const Logo = ({ light = true }) => (
  <div className={`logo ${light ? 'logo--light' : ''}`}>
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="currentColor" />
      <path d="M9 17V8.5a3.5 3.5 0 1 1 3.5 3.5H11" stroke="var(--logo-fg, #0d5c57)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </svg>
    <span>kloudspot</span>
  </div>
);
