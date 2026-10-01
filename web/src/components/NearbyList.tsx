import { useMemo } from 'react';
import { getDistKm } from '../lib/geo';
import {
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  matchesFilter,
  overallRating,
  PIN_COLORS,
  type SpaceFilter,
} from '../lib/ratings';
import type { OverallRating, Space } from '../lib/types';
import Icon, { type IconName } from './Icon';

const VERDICT: Record<OverallRating, string> = {
  safe: 'Mostly safe',
  mixed: 'Mixed reports',
  not_safe: 'Reported not safe',
  unknown: 'No ratings yet',
};

const BADGE: Record<OverallRating, IconName> = {
  safe: 'check',
  mixed: 'alert',
  not_safe: 'x',
  unknown: 'question',
};

/** How far from the map centre a place can be and still count as "nearby" (about 25 miles). */
const NEARBY_RADIUS_KM = 40;

function formatDist(km: number): string {
  const mi = km * 0.621371;
  return mi < 0.1 ? 'Here' : mi < 10 ? `${mi.toFixed(1)} mi` : `${Math.round(mi)} mi`;
}

interface Props {
  spaces: Space[];
  filter: SpaceFilter;
  /** Distances are measured from here, nearest first. */
  center: { lat: number; lon: number };
  onSelect: (space: Space) => void;
  /** Phone only: the sheet is a drawer that starts collapsed. */
  expanded: boolean;
  onToggle: () => void;
}

/** The "Nearby" list: a sidebar on desktop, a bottom sheet on phones. */
export default function NearbyList({ spaces, filter, center, onSelect, expanded, onToggle }: Props) {
  const items = useMemo(
    () =>
      spaces
        .filter((sp) => sp.latitude != null && sp.longitude != null)
        .map((space) => ({
          space,
          rating: overallRating(space.ratings),
          dist: getDistKm(center.lat, center.lon, space.latitude as number, space.longitude as number),
        }))
        .filter(({ rating, dist }) => dist <= NEARBY_RADIUS_KM && matchesFilter(rating, filter))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 50),
    [spaces, filter, center.lat, center.lon],
  );

  return (
    <section className={`nearby${expanded ? ' open' : ''}`} aria-label="Nearby places">
      <button className="nearby-handle" onClick={onToggle} aria-expanded={expanded}>
        <span className="nearby-grip" aria-hidden="true" />
        <span className="nearby-title">Nearby</span>
        <span className="nearby-count">{items.length} {items.length === 1 ? 'place' : 'places'}</span>
      </button>
      <h2 className="nearby-heading">Nearby</h2>
      <ul className="nearby-list">
        {items.length === 0 && (
          <li className="nearby-empty">
            No places here yet. Search for a place and tap + to be the first to add it.
          </li>
        )}
        {items.map(({ space, rating, dist }) => {
          const total = space.ratings?.length ?? 0;
          return (
            <li key={space.id}>
              <button className="nearby-item" onClick={() => onSelect(space)}>
                <span className="nearby-icon" style={{ background: PIN_COLORS[rating] }}>
                  <Icon name={(CATEGORY_ICONS[space.category] ?? 'pin') as IconName} size={20} />
                  <span className="nearby-badge" style={{ color: PIN_COLORS[rating] }}>
                    <Icon name={BADGE[rating]} size={10} />
                  </span>
                </span>
                <span className="nearby-text">
                  <span className="nearby-name">{space.name}</span>
                  <span className="nearby-meta">
                    {CATEGORY_LABELS[space.category] ?? 'Place'} · {formatDist(dist)}
                  </span>
                  <span className={`nearby-verdict r-${rating}`}>
                    {VERDICT[rating]}
                    {total > 0 && ` · ${total} rating${total === 1 ? '' : 's'}`}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
