import { PIN_COLORS } from '../lib/ratings';
import type { OverallRating } from '../lib/types';
import { PATHS, type IconName } from './Icon';

const BADGE: Record<OverallRating, IconName> = {
  safe: 'check',
  mixed: 'alert',
  not_safe: 'x',
  unknown: 'question',
};

interface Props {
  rating: OverallRating;
  /** The kind of place: cafe, library, bar... */
  icon: IconName;
  /** CSS left/top of the pin's tip. */
  left: string;
  top: string;
  large?: boolean;
}

/**
 * A map pin: color and a badge say how safe a place is (the badge keeps it readable without
 * color vision), the center icon says what kind of place it is.
 */
export default function PlacePin({ rating, icon, left, top, large }: Props) {
  const color = PIN_COLORS[rating];
  const stroke = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  return (
    <svg
      className={`place-pin${large ? ' large' : ''}`}
      viewBox="0 0 32 40"
      style={{ left, top }}
      aria-hidden="true"
    >
      <path
        d="M16 0C7.2 0 0 7 0 15.7 0 27 16 40 16 40s16-13 16-24.3C32 7 24.8 0 16 0z"
        fill={color}
      />
      <svg x="6" y="6" width="20" height="20" viewBox="0 0 24 24" stroke="#fff" strokeWidth="2" {...stroke}>
        <path d={PATHS[icon]} />
      </svg>
      <circle cx="26" cy="6" r="6" fill="#fff" />
      <svg x="21" y="1" width="10" height="10" viewBox="0 0 24 24" stroke={color} strokeWidth="3.4" {...stroke}>
        <path d={PATHS[BADGE[rating]]} />
      </svg>
    </svg>
  );
}
