/* Inline icons — stroke-only, 1.75px, to sit with the utility type. */
const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export const IconToday = (p) => (
  <svg {...base} {...p}>
    <path d="M4 17V9M8 19V7M12 21V3M16 19V7M20 17V9" />
  </svg>
)

export const IconPlan = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="4" width="18" height="17" rx="2.5" />
    <path d="M3 9h18M8 2v4M16 2v4M8 14h3M8 17h6" />
  </svg>
)

export const IconBuild = (p) => (
  <svg {...base} {...p}>
    <path d="M3 12h2M19 12h2M6 8v8M18 8v8M9 6v12M15 6v12M9 12h6" />
  </svg>
)

export const IconHistory = (p) => (
  <svg {...base} {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4" />
    <path d="M12 7v5l3.5 2" />
  </svg>
)

export const IconCalendar = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="4" width="18" height="17" rx="2.5" />
    <path d="M3 9h18M8 2v4M16 2v4" />
    <path d="M7.5 13h2M11 13h2M14.5 13h2M7.5 16.5h2M11 16.5h2" />
  </svg>
)

export const IconGear = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 3.5v2.4M12 18.1v2.4M4.9 12H2.5M21.5 12h-2.4M6.3 6.3l1.7 1.7M16 16l1.7 1.7M17.7 6.3 16 8M8 16l-1.7 1.7" />
  </svg>
)

export const IconBack = (p) => (
  <svg {...base} {...p}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
)

export const IconCheck = (p) => (
  <svg {...base} {...p}>
    <path d="M4 12.5l5 5L20 6.5" />
  </svg>
)
