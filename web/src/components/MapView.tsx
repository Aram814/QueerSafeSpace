import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { DEFAULT_CENTER } from '../lib/geo';
import { matchesFilter, overallRating, PIN_COLORS, RATING_LABELS, type SpaceFilter } from '../lib/ratings';
import type { Space } from '../lib/types';

interface Props {
  spaces: Space[];
  filter: SpaceFilter;
  flyTo: { lat: number; lon: number; zoom: number } | null;
  onOpenDetail: (spaceId: string) => void;
  onUserLocated: (lat: number, lon: number) => void;
  /** Fired on load and after every pan/zoom, so searches can bias to the visible area. */
  onMapMove: (lat: number, lon: number, zoom: number) => void;
  /** Last known GPS fix, if any. */
  userLocation: { lat: number; lon: number } | null;
  /** Bump to recentre on the user. */
  recenterTick: number;
  /** A searched-for place that is not (yet) in QueerSafeSpace; shown as a marker. */
  searchPin: { lat: number; lon: number; name: string; address: string } | null;
  onAddSearchPin: () => void;
  onLocationError: () => void;
}

/** Ported from the divIcon in renderMarkers(). */
function pinIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:28px;height:28px;
      background:${color};
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:3px solid #fff;
      box-shadow:0 3px 8px rgba(0,0,0,0.28);
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  });
}

function MapEffects({
  flyTo,
  onUserLocated,
  onLocationError,
  onMapMove,
  userLocation,
  recenterTick,
}: Pick<
  Props,
  'flyTo' | 'onUserLocated' | 'onLocationError' | 'onMapMove' | 'userLocation' | 'recenterTick'
>) {
  const map = useMap();

  // Callbacks live in a ref so a parent re-render never re-runs map.locate()
  // (which would re-centre the map mid-search).
  const cbs = useRef({ onUserLocated, onLocationError, onMapMove });
  cbs.current = { onUserLocated, onLocationError, onMapMove };

  // GPS can answer seconds after the user has already searched or panned; only the
  // first fix may move the map, and only if nothing else has (otherwise the map
  // "bounces back" to the user's location after flying to a search result).
  const interacted = useRef(false);

  useEffect(() => {
    const located = (e: L.LocationEvent) => {
      if (!interacted.current) map.setView(e.latlng, 13);
      cbs.current.onUserLocated(e.latlng.lat, e.latlng.lng);
    };
    const touched = () => {
      interacted.current = true;
    };
    const failed = () => cbs.current.onLocationError();
    const moved = () => {
      const c = map.getCenter();
      cbs.current.onMapMove(c.lat, c.lng, map.getZoom());
    };
    map.on('locationfound', located);
    map.on('locationerror', failed);
    map.on('moveend', moved);
    map.on('dragstart', touched);
    map.on('zoomstart', touched);
    moved();
    map.locate({ setView: false });
    const timer = setTimeout(() => map.invalidateSize(), 200);
    return () => {
      clearTimeout(timer);
      map.off('locationfound', located);
      map.off('locationerror', failed);
      map.off('moveend', moved);
      map.off('dragstart', touched);
      map.off('zoomstart', touched);
    };
  }, [map]);

  useEffect(() => {
    if (!flyTo) return;
    interacted.current = true;
    map.flyTo([flyTo.lat, flyTo.lon], flyTo.zoom, { animate: true, duration: 0.7 });
  }, [map, flyTo]);

  const lastTick = useRef(recenterTick);
  useEffect(() => {
    if (recenterTick === lastTick.current) return;
    lastTick.current = recenterTick;
    interacted.current = true;
    if (userLocation) {
      map.flyTo([userLocation.lat, userLocation.lon], 15, { animate: true, duration: 0.7 });
    } else {
      map.locate({ setView: true, maxZoom: 15 });
    }
  }, [map, recenterTick, userLocation]);

  return null;
}

const searchPinIcon = L.divIcon({
  className: '',
  html: '<div style="width:30px;height:30px;background:#111827;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,0.35)"></div>',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -32],
});

const userDotIcon = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;background:#3b82f6;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 4px rgba(59,130,246,0.25)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function SearchPinMarker({
  pin,
  onAdd,
}: {
  pin: NonNullable<Props['searchPin']>;
  onAdd: () => void;
}) {
  const ref = useRef<L.Marker>(null);
  useEffect(() => {
    ref.current?.openPopup();
  }, [pin]);
  return (
    <Marker ref={ref} position={[pin.lat, pin.lon]} icon={searchPinIcon}>
      <Popup>
        <div className="map-popup">
          <div className="map-popup-name">{pin.name}</div>
          <div className="map-popup-rating">{pin.address || 'Not in QueerSafeSpace yet'}</div>
          <button className="map-popup-btn" onClick={onAdd}>
            Add to QueerSafeSpace
          </button>
        </div>
      </Popup>
    </Marker>
  );
}

export default function MapView({
  spaces,
  filter,
  flyTo,
  onOpenDetail,
  onUserLocated,
  onLocationError,
  onMapMove,
  userLocation,
  recenterTick,
  searchPin,
  onAddSearchPin,
}: Props) {
  const visible = useMemo(
    () =>
      spaces
        .filter((sp) => sp.latitude != null && sp.longitude != null)
        .map((sp) => ({ space: sp, rating: overallRating(sp.ratings) }))
        .filter(({ rating }) => matchesFilter(rating, filter)),
    [spaces, filter],
  );

  return (
    <MapContainer
      className="map"
      center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lon]}
      zoom={4}
      zoomControl={false}
      scrollWheelZoom
    >
      <TileLayer
        attribution='© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <MapEffects
        flyTo={flyTo}
        onUserLocated={onUserLocated}
        onLocationError={onLocationError}
        onMapMove={onMapMove}
        userLocation={userLocation}
        recenterTick={recenterTick}
      />
      {userLocation && (
        <Marker
          position={[userLocation.lat, userLocation.lon]}
          icon={userDotIcon}
          interactive={false}
          keyboard={false}
        />
      )}
      {searchPin && <SearchPinMarker pin={searchPin} onAdd={onAddSearchPin} />}

      {visible.map(({ space, rating }) => {
        const total = space.ratings?.length ?? 0;
        return (
          <Marker
            key={space.id}
            position={[space.latitude as number, space.longitude as number]}
            icon={pinIcon(PIN_COLORS[rating])}
          >
            <Popup>
              <div className="map-popup">
                <div className="map-popup-name">{space.name}</div>
                <div className="map-popup-rating">
                  {RATING_LABELS[rating]} · {total} rating{total !== 1 ? 's' : ''}
                </div>
                <button className="map-popup-btn" onClick={() => onOpenDetail(space.id)}>
                  View Details →
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
