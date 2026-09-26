import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import AddSpaceSheet from '../components/AddSpaceSheet';
import MapView from '../components/MapView';
import PlaceSearch from '../components/PlaceSearch';
import RateSheet from '../components/RateSheet';
import SpaceDetailSheet from '../components/SpaceDetailSheet';
import { signOut } from '../lib/auth';
import { DEFAULT_CENTER, getDistKm, smartSearch } from '../lib/geo';
import { PIN_COLORS, type SpaceFilter } from '../lib/ratings';
import { loadSpaceDetail, loadSpaces } from '../lib/spaces';
import type { PlaceResult, Profile, Space, SpaceDetail } from '../lib/types';

const FILTERS: { value: SpaceFilter; label: string }[] = [
  { value: 'all', label: '🏳️‍🌈 All' },
  { value: 'safe', label: '✅ Safe' },
  { value: 'mixed', label: '⚠️ Mixed' },
  { value: 'unsafe', label: '❌ Not Safe' },
];

interface Props {
  user: User | null;
  profile: Profile | null;
  onRequestAuth: () => void;
  onSignedOut: () => void;
  onToast: (message: string) => void;
}

export default function MapScreen({ user, profile, onRequestAuth, onSignedOut, onToast }: Props) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [filter, setFilter] = useState<SpaceFilter>('all');
  const [query, setQuery] = useState('');
  const [flyTo, setFlyTo] = useState<{ lat: number; lon: number; zoom: number } | null>(null);
  const [detail, setDetail] = useState<SpaceDetail | null>(null);
  const [rateSpaceId, setRateSpaceId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [pendingPlace, setPendingPlace] = useState<PlaceResult | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);

  // Searches bias towards the user's GPS position when it is available.
  const center = userLocation ?? DEFAULT_CENTER;
  const centerRef = useRef(center);
  centerRef.current = center;

  const refreshSpaces = useCallback(async () => {
    setSpaces(await loadSpaces());
  }, []);

  useEffect(() => {
    void refreshSpaces();
  }, [refreshSpaces, user]);

  const openDetail = useCallback(async (spaceId: string) => {
    const space = await loadSpaceDetail(spaceId);
    if (space) setDetail(space);
  }, []);

  const handleLocationError = useCallback(
    () => onToast('📍 Location unavailable — showing default view'),
    [onToast],
  );

  const handleUserLocated = useCallback((lat: number, lon: number) => {
    setUserLocation({ lat, lon });
  }, []);

  const search = useCallback(
    (q: string) => smartSearch(q, centerRef.current.lat, centerRef.current.lon),
    [],
  );

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
        <div className="brand">🏳️‍🌈 QueerSafeSpace</div>
        <PlaceSearch
          placeholder="Search cafes, parks, Walmart…"
          value={query}
          onValueChange={setQuery}
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
        <button className="icon-btn primary" onClick={openAddSpace} title="Add a safe space">
          +
        </button>
        {user ? (
          <button
            className="icon-btn"
            title={profile?.username ?? user.email ?? 'Account'}
            onClick={async () => {
              await signOut();
              onSignedOut();
              onToast('Signed out');
            }}
          >
            {profile?.avatar_url ?? '🏳️‍🌈'}
          </button>
        ) : (
          <button className="icon-btn" onClick={onRequestAuth}>
            Sign In
          </button>
        )}
      </div>

      <div className="filter-bar">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={`chip${filter === f.value ? ' active' : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="main-body">
        <aside className="sidebar">
          <div className="legend-card">
            <p className="legend-title">Map Legend</p>
            <span className="key-item">
              <span className="key-dot" style={{ background: PIN_COLORS.safe }} />
              Safe
            </span>
            <span className="key-item">
              <span className="key-dot" style={{ background: PIN_COLORS.mixed }} />
              Mixed
            </span>
            <span className="key-item">
              <span className="key-dot" style={{ background: PIN_COLORS.not_safe }} />
              Not Safe
            </span>
            <span className="key-item">
              <span className="key-dot" style={{ background: PIN_COLORS.unknown }} />
              Unknown
            </span>
          </div>
          <div className="sidebar-tip">
            <strong>💡 Add a Space</strong>
            <span>Tap + in the top bar to share a safe space with the community.</span>
          </div>
        </aside>

        <div className="map-area">
          <MapView
            spaces={spaces}
            filter={filter}
            flyTo={flyTo}
            onOpenDetail={openDetail}
            onUserLocated={handleUserLocated}
            onLocationError={handleLocationError}
          />
        </div>
      </div>

      {detail && (
        <SpaceDetailSheet
          space={detail}
          isSignedIn={!!user}
          onClose={() => setDetail(null)}
          onRate={() => openRate(detail.id)}
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
