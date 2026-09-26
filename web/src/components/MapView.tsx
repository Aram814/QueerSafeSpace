import { useEffect, useMemo } from 'react';
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
}: Pick<Props, 'flyTo' | 'onUserLocated' | 'onLocationError'>) {
  const map = useMap();

  useEffect(() => {
    map.locate({ setView: true, maxZoom: 13 });
    const located = (e: L.LocationEvent) => onUserLocated(e.latlng.lat, e.latlng.lng);
    map.on('locationfound', located);
    map.on('locationerror', onLocationError);
    const timer = setTimeout(() => map.invalidateSize(), 200);
    return () => {
      clearTimeout(timer);
      map.off('locationfound', located);
      map.off('locationerror', onLocationError);
    };
  }, [map, onUserLocated, onLocationError]);

  useEffect(() => {
    if (!flyTo) return;
    map.flyTo([flyTo.lat, flyTo.lon], flyTo.zoom, { animate: true, duration: 0.7 });
  }, [map, flyTo]);

  return null;
}

export default function MapView({
  spaces,
  filter,
  flyTo,
  onOpenDetail,
  onUserLocated,
  onLocationError,
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
      <MapEffects flyTo={flyTo} onUserLocated={onUserLocated} onLocationError={onLocationError} />

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
