/**
 * Remembers what the person decided about sharing their location, so the browser's permission
 * prompt does not come back on every visit.
 *
 * The browser owns the permission itself. Chrome, Firefox and Safari keep an "Allow" for the site,
 * but "Allow this time" (and Safari's "ask each time") are forgotten on purpose. When the browser
 * has forgotten, the app does not ask again by itself: it opens the map where the person last was
 * and waits for them to tap the locate button. The last position stays on this device only.
 */

const ASKED = 'qss-loc-asked';
const GRANTED = 'qss-loc-granted';
const LAST = 'qss-last-pos';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage can be blocked; the app then just asks the way it always did */
  }
}

async function permissionState(): Promise<PermissionState | 'unknown'> {
  try {
    if (!navigator.permissions) return 'unknown';
    return (await navigator.permissions.query({ name: 'geolocation' })).state;
  } catch {
    return 'unknown';
  }
}

/** Should the app ask for the location by itself when the map opens? */
export async function shouldAutoLocate(): Promise<boolean> {
  const state = await permissionState();
  if (state === 'granted') return true;
  if (state === 'denied') return false;
  // The browser will ask. Do that only the very first time (or, if the browser cannot tell us,
  // only if the person said yes before).
  return read(ASKED) === null || (state === 'unknown' && read(GRANTED) === '1');
}

/** Call when the app is about to ask, so a dismissed prompt is not repeated every visit. */
export function markAsked(): void {
  write(ASKED, '1');
}

/** Call when a location fix arrives: remember the yes, and where the person was. */
export function rememberLocation(lat: number, lon: number): void {
  write(ASKED, '1');
  write(GRANTED, '1');
  write(LAST, JSON.stringify({ lat, lon }));
}

export function lastLocation(): { lat: number; lon: number } | null {
  try {
    const v = JSON.parse(read(LAST) ?? 'null');
    return v && Number.isFinite(v.lat) && Number.isFinite(v.lon) ? { lat: v.lat, lon: v.lon } : null;
  } catch {
    return null;
  }
}

/**
 * A position for features that only need a rough idea of where the person is. Never triggers a
 * permission prompt: it uses the location only if the browser has already allowed it, otherwise
 * the last remembered position, otherwise nothing.
 */
export async function quietPosition(): Promise<{ lat: number; lon: number } | null> {
  if ((await permissionState()) === 'granted' && 'geolocation' in navigator) {
    const fresh = await new Promise<{ lat: number; lon: number } | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 10 * 60 * 1000 },
      );
    });
    if (fresh) return fresh;
  }
  return lastLocation();
}
