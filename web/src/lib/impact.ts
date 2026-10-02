import { supabase } from './supabase';

export interface Impact {
  myRatings: number;
  myPlacesAdded: number;
  referralCode: string;
  referrals: number;
}

export interface SiteStats {
  totalPlaces: number;
  ratedPlaces: number;
  totalRatings: number;
  /** Only present when a location was available. */
  area: { places: number; ratedPlaces: number; ratings: number } | null;
}

/** The signed-in Founding Member's own numbers. Throws if the account has no badge. */
export async function loadImpact(): Promise<Impact> {
  const { data, error } = await supabase.rpc('my_impact');
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as
    | { my_ratings: number; my_places_added: number; referral_code: string; referrals: number }
    | undefined;
  if (!row) throw new Error('No stats available');
  return {
    myRatings: row.my_ratings,
    myPlacesAdded: row.my_places_added,
    referralCode: row.referral_code,
    referrals: row.referrals,
  };
}

export async function loadSiteStats(at: { lat: number; lon: number } | null): Promise<SiteStats> {
  const { data, error } = await supabase.rpc('site_stats', {
    p_lat: at?.lat ?? null,
    p_lon: at?.lon ?? null,
    p_radius_km: 40,
  });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as {
    total_places: number;
    rated_places: number;
    total_ratings: number;
    area_places: number | null;
    area_rated_places: number | null;
    area_ratings: number | null;
  };
  return {
    totalPlaces: row.total_places,
    ratedPlaces: row.rated_places,
    totalRatings: row.total_ratings,
    area:
      row.area_places == null
        ? null
        : { places: row.area_places, ratedPlaces: row.area_rated_places ?? 0, ratings: row.area_ratings ?? 0 },
  };
}

/** Best-effort position; resolves to null if denied, unavailable or slow. */
export function currentPosition(): Promise<{ lat: number; lon: number } | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 10 * 60 * 1000 },
    );
  });
}

export function referralLink(code: string): string {
  return `${window.location.origin}/?ref=${encodeURIComponent(code)}`;
}
