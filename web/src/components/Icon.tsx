/** Small line icons, one set everywhere (replaces the mix of emoji and font icons). */
const PATHS: Record<string, string> = {
  menu: 'M4 7h16M4 12h16M4 17h16',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 4.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM20 20l-4.2-4.2',
  check: 'M5 12.5l4.2 4.2L19 7',
  alert: 'M12 6v8M12 18h.01',
  x: 'M7 7l10 10M17 7L7 17',
  map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.4A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  users: 'M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM20 19v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 5.2a3 3 0 0 1 0 5.6',
  sos: 'M12 3l9.5 17h-19L12 3zM12 10v4.5M12 17.5h.01',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  message: 'M4 5h16v11H9l-5 4V5z',
  flask: 'M9 3h6M10 3v6l-5 9a1.5 1.5 0 0 0 1.3 2.2h11.4A1.5 1.5 0 0 0 19 18l-5-9V3',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20c1-4 4-5.5 7-5.5s6 1.5 7 5.5',
  login: 'M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10',
  logout: 'M10 4H5v16h5M14 8l4 4-4 4M18 12H8',
  close: 'M6 6l12 12M18 6L6 18',
  back: 'M15 5l-7 7 7 7',
  locate: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3',
  phone:
    'M6.6 3h3l1.4 4-2 1.3a11 11 0 0 0 5.7 5.7l1.3-2 4 1.4v3a2 2 0 0 1-2.2 2A16 16 0 0 1 4.6 5.2 2 2 0 0 1 6.6 3z',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
  auto: 'M4 5h16v11H4zM9 20h6M12 16v4',
};

export type IconName = keyof typeof PATHS;

export default function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="i"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
