/** Directions links. Google Maps works everywhere; Apple devices can also open Apple Maps. */

export function googleDirectionsUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
}

export function appleDirectionsUrl(lat: number, lon: number): string {
  return `https://maps.apple.com/?daddr=${lat},${lon}&dirflg=d`;
}

/** iPhone, iPad and Mac, where Apple Maps is built in. */
export function isAppleDevice(): boolean {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod|macintosh|mac os x/i.test(ua);
}
