import { useCallback, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import AddSpaceSheet from '../components/AddSpaceSheet';
import Icon from '../components/Icon';
import NearbyList from '../components/NearbyList';
import MenuDrawer from '../components/MenuDrawer';
import ShieldLogo from '../components/ShieldLogo';
import { getTheme, type ThemeChoice } from '../theme';
import type { InfoPage } from './InfoPages';
import MapView from '../components/MapView';
import PlaceSearch from '../components/PlaceSearch';
import RateSheet from '../components/RateSheet';
import SpaceDetailSheet from '../components/SpaceDetailSheet';
import ReportSheet from '../components/ReportSheet';
import { signOut } from '../lib/auth';
import { DEFAULT_CENTER, getDistKm, smartSearch } from '../lib/geo';
import { PIN_COLORS, type SpaceFilter } from '../lib/ratings';
import { loadSpaceDetail, loadSpacesInView, type MapBounds } from '../lib/spaces';
import type { PlaceResult, Profile, Space, SpaceDetail } from '../lib/types';

/** Unrated listings (grey pins) only appear once the map is zoomed in to about city level. */
const LISTED_MIN_ZOOM = 11;

const FILTERS: { value: SpaceFilter; label: string; dot?: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'safe', label: 'Safe', dot: PIN_COLORS.safe },
  { value: 'mixed', label: 'Mixed', dot: PIN_COLORS.mixed },
  { value: 'unsafe', label: 'Not safe', dot: PIN_COLORS.not_safe },
];

interface Props {
  user: User | null;
  profile: Profile | null;
  onRequestAuth: () => void;
  onSignedOut: () => void;
  onToast: (message: string) => void;
  onOpenPage: (page: InfoPage) => void;
}

export default function MapScreen({
  user,
  profile,
  onRequestAuth,
  onSignedOut,
  onToast,
  onOpenPage,
}: Props) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [filter, setFilter] = useState<SpaceFilter>('all');
  const [query, setQuery] = useState('');
  const [flyTo, setFlyTo] = useState<{ lat: number; lon: number; zoom: number } | null>(null);
  const [detail, setDetail] = useState<SpaceDetail | null>(null);
  const [rateSpaceId, setRateSpaceId] = useState<string | null>(null);
  const [reportRatingId, setReportRatingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [pendingPlace, setPendingPlace] = useState<PlaceResult | null>(null);
  const [recenterTick, setRecenterTick] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setThemeState] = useState<ThemeChoice>(getTheme);
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const [viewZoom, setViewZoom] = useState(4);
  const [viewCenter, setViewCenter] = useState<{ lat: number; lon: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);

  const mapViewRef = useRef<{ lat: number; lon: number; zoom: number } | null>(null);

  // Where searches and new spaces are anchored. Like Apple/Google Maps this is the
  // visible map once it is zoomed to city level; when zoomed far out (e.g. GPS has
  // not resolved yet and the map still shows the whole US) prefer the GPS fix.
  function currentCenter(): { lat: number; lon: number } {
    const view = mapViewRef.current;
    if (view && view.zoom >= 9) return view;
    return userLocation ?? view ?? DEFAULT_CENTER;
  }
  const center = currentCenter();
  // Community-rated places show at any zoom; OpenStreetMap listings only when zoomed in.
  const shownSpaces = useMemo(
    () => spaces.filter((sp) => sp.source !== 'osm' || viewZoom >= LISTED_MIN_ZOOM),
    [spaces, viewZoom],
  );
  const spacesRef = useRef<Space[]>([]);
  spacesRef.current = spaces;

  const signedIn = !!user;

  // Only the places in and around the visible map are loaded (the database holds many more).
  const viewportRef = useRef<{ bounds: MapBounds; center: { lat: number; lon: number } } | null>(null);
  const loadSeq = useRef(0);
  const refreshSpaces = useCallback(async () => {
    const vp = viewportRef.current;
    if (!vp) return;
    const seq = ++loadSeq.current;
    // Load a margin around the screen so small pans don't need a new request.
    const padLat = (vp.bounds.north - vp.bounds.south) * 0.5;
    const padLon = (vp.bounds.east - vp.bounds.west) * 0.5;
    const next = await loadSpacesInView(
      {
        south: vp.bounds.south - padLat,
        north: vp.bounds.north + padLat,
        west: vp.bounds.west - padLon,
        east: vp.bounds.east + padLon,
      },
      vp.center,
    );
    if (seq === loadSeq.current) setSpaces(next);
  }, []);

  const openDetail = useCallback(async (spaceId: string) => {
    const space = await loadSpaceDetail(spaceId);
    if (space) setDetail(space);
  }, []);

  // Say why location failed, once per attempt (a recenter click starts a new attempt).
  const locationToastShown = useRef(false);
  const handleLocationError = useCallback(
    (code?: number) => {
      if (locationToastShown.current) return;
      locationToastShown.current = true;
      onToast(
        code === 1
          ? '📍 Location is blocked for this site — allow it in your browser settings'
          : code === 3
            ? '📍 Location timed out — showing default view. Tap ⌖ to retry'
            : '📍 Location unavailable — showing default view',
      );
    },
    [onToast],
  );

  const handleUserLocated = useCallback((lat: number, lon: number) => {
    setUserLocation({ lat, lon });
  }, []);

  const loadTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const handleMapMove = useCallback(
    (lat: number, lon: number, zoom: number, bounds: MapBounds) => {
      mapViewRef.current = { lat, lon, zoom };
      setViewCenter({ lat, lon });
      setViewZoom(zoom);
      viewportRef.current = { bounds, center: { lat, lon } };
      clearTimeout(loadTimer.current);
      loadTimer.current = setTimeout(() => void refreshSpaces(), 350);
    },
    [refreshSpaces],
  );

  const userLocationRef = useRef(userLocation);
  userLocationRef.current = userLocation;

  // Anything on the map can be searched; places already in QueerSafeSpace are
  // matched by name/address too, so they surface even if OSM search misses them.
  const search = useCallback(async (q: string, onPartial: (r: PlaceResult[]) => void, signal: AbortSignal) => {
    const view = mapViewRef.current;
    const anchor =
      view && view.zoom >= 9 ? view : (userLocationRef.current ?? view ?? DEFAULT_CENTER);
    const needle = q.trim().toLowerCase();
    const known = spacesRef.current
      .filter(
        (sp) =>
          sp.latitude != null &&
          sp.longitude != null &&
          `${sp.name} ${sp.address}`.toLowerCase().includes(needle),
      )
      .map(
        (sp): PlaceResult => ({
          name: sp.name,
          address: sp.address,
          lat: sp.latitude as number,
          lon: sp.longitude as number,
          display_name: sp.name,
          dist: getDistKm(anchor.lat, anchor.lon, sp.latitude as number, sp.longitude as number),
        }),
      )
      .sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0))
      .slice(0, 5);

    // Merge and sort together: a QueerSafeSpace place is only first if it is the nearest.
    const withKnown = (found: PlaceResult[]): PlaceResult[] =>
      [
        ...known,
        ...found.filter((r) => !known.some((k) => getDistKm(k.lat, k.lon, r.lat, r.lon) < 0.1)),
      ].sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0));
    if (known.length) onPartial(known);

    let found: PlaceResult[] = [];
    try {
      found = await smartSearch(
        q,
        anchor.lat,
        anchor.lon,
        (partial) => onPartial(withKnown(partial)),
        signal,
      );
    } catch (err) {
      if (!known.length) throw err;
    }
    return withKnown(found);
  }, []);

  // Ported from pickSearchResult(): fly there, open the space if we already
  // know it, otherwise prime the add-space form with the picked place.
  function pickSearchResult(result: PlaceResult) {
    setFlyTo({ lat: result.lat, lon: result.lon, zoom: 17 });
    const nearby = spaces.find(
      (sp) =>
        sp.latitude != null &&
        sp.longitude != null &&
        getDistKm(result.lat, result.lon, sp.latitude, sp.longitude) < 0.1,
    );
    if (nearby) {
      setPendingPlace(null);
      void openDetail(nearby.id);
    } else {
      setPendingPlace(result);
      onToast(`📍 "${result.name}" isn't in QueerSafeSpace yet — tap + to add it!`);
    }
  }

  function openAddSpace() {
    if (!user) {
      onToast('Sign in to add a space');
      onRequestAuth();
      return;
    }
    setAddOpen(true);
  }

  function openRate(spaceId: string) {
    if (!user) {
      setDetail(null);
      onRequestAuth();
      return;
    }
    setDetail(null);
    setRateSpaceId(spaceId);
  }

  return (
    <div className="screen main">
      <div className="topbar">
        <div className="brand">
          <ShieldLogo className="brand-shield" />
          <span className="brand-name wordmark">QueerSafeSpace</span>
          <span className="beta-tag">Beta</span>
        </div>
        <PlaceSearch
          placeholder="Search cafes, parks, Walmart…"
          value={query}
          onValueChange={(v) => {
            setQuery(v);
            if (!v.trim()) setPendingPlace(null);
          }}
          search={search}
          onPick={(result) => {
            setQuery(result.name);
            pickSearchResult(result);
          }}
          isKnown={(result) =>
            spaces.some(
              (sp) =>
                sp.latitude != null &&
                sp.longitude != null &&
                getDistKm(result.lat, result.lon, sp.latitude, sp.longitude) < 0.1,
            )
          }
        />
        <button className="icon-btn primary add-btn" onClick={openAddSpace} title="Add a safe space" aria-label="Add a safe space">
          <Icon name="plus" size={20} />
        </button>
        <button className="icon-btn menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu">
          <Icon name="menu" size={20} />
        </button>
      </div>

      <div className="filter-bar">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={`chip${filter === f.value ? ' active' : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.dot && <span className="chip-dot" style={{ background: f.dot }} />}
            {f.label}
          </button>
        ))}
      </div>

      <div className="main-body">
        <NearbyList
          spaces={shownSpaces}
          filter={filter}
          center={viewCenter ?? userLocation ?? DEFAULT_CENTER}
          expanded={nearbyOpen}
          onToggle={() => setNearbyOpen((o) => !o)}
          onSelect={(sp) => {
            setNearbyOpen(false);
            setFlyTo({ lat: sp.latitude as number, lon: sp.longitude as number, zoom: 16 });
            void openDetail(sp.id);
          }}
        />

        <div className="map-area">
          <button
            className="recenter-btn"
            title="Recenter on my location"
            aria-label="Recenter on my location"
            onClick={() => {
              locationToastShown.current = false;
              setRecenterTick((t) => t + 1);
            }}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <MapView
            spaces={shownSpaces}
            filter={filter}
            flyTo={flyTo}
            onOpenDetail={openDetail}
            onUserLocated={handleUserLocated}
            onMapMove={handleMapMove}
            userLocation={userLocation}
            recenterTick={recenterTick}
            searchPin={pendingPlace}
            onAddSearchPin={openAddSpace}
            onLocationError={handleLocationError}
          />
        </div>
      </div>

      {menuOpen && (
        <MenuDrawer
          user={user}
          profile={profile}
          theme={theme}
          onThemeChange={setThemeState}
          onClose={() => setMenuOpen(false)}
          onOpenPage={(p) => {
            setMenuOpen(false);
            onOpenPage(p);
          }}
          onSignIn={() => {
            setMenuOpen(false);
            onRequestAuth();
          }}
          onSignOut={async () => {
            setMenuOpen(false);
            await signOut();
            onSignedOut();
            onToast('Signed out');
          }}
        />
      )}

      {detail && (
        <SpaceDetailSheet
          space={detail}
          isSignedIn={signedIn}
          onClose={() => setDetail(null)}
          onRate={() => openRate(detail.id)}
          onReport={(ratingId) => {
            if (!signedIn) {
              onRequestAuth();
              return;
            }
            setReportRatingId(ratingId);
          }}
        />
      )}

      {reportRatingId && user && (
        <ReportSheet
          ratingId={reportRatingId}
          onClose={() => setReportRatingId(null)}
          onSent={() => {
            setReportRatingId(null);
            onToast('Thanks. We will take a look.');
          }}
        />
      )}

      {rateSpaceId && user && (
        <RateSheet
          spaceId={rateSpaceId}
          userId={user.id}
          onClose={() => setRateSpaceId(null)}
          onSubmitted={async () => {
            const spaceId = rateSpaceId;
            setRateSpaceId(null);
            onToast('Thanks for rating!');
            await refreshSpaces();
            await openDetail(spaceId);
          }}
        />
      )}

      {addOpen && user && (
        <AddSpaceSheet
          userId={user.id}
          initialPlace={pendingPlace}
          center={center}
          onClose={() => setAddOpen(false)}
          onSubmitted={async (space) => {
            setAddOpen(false);
            setPendingPlace(null);
            setQuery('');
            onToast('🏳️‍🌈 Space added! Thank you!');
            await refreshSpaces();
            if (space.latitude != null && space.longitude != null) {
              setFlyTo({ lat: space.latitude, lon: space.longitude, zoom: 15 });
            }
          }}
        />
      )}
    </div>
  );
}
