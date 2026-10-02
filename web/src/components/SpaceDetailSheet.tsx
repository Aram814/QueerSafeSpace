import { useEffect, useMemo } from 'react';
import {
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  countRatings,
  NEGATIVE_TAGS,
  overallRating,
  PIN_COLORS,
  tagLabel,
  VERDICTS,
} from '../lib/ratings';
import type { OverallRating, SafetyRating, SpaceDetail } from '../lib/types';
import FoundingBadge from './FoundingBadge';
import Icon, { type IconName } from './Icon';

interface Props {
  space: SpaceDetail;
  isSignedIn: boolean;
  onClose: () => void;
  onRate: () => void;
}

const BADGE: Record<OverallRating, IconName> = {
  safe: 'check',
  mixed: 'alert',
  not_safe: 'x',
  unknown: 'question',
};

const SEGMENTS: { key: SafetyRating; label: string }[] = [
  { key: 'safe', label: 'Safe' },
  { key: 'mixed', label: 'Mixed' },
  { key: 'not_safe', label: 'Not safe' },
];

function percent(n: number, total: number): number {
  return total ? Math.round((n / total) * 100) : 0;
}

/** Imported listings without a street number start their address with the place name; drop it. */
function shortAddress(name: string, address: string): string {
  const prefix = `${name}, `;
  const rest = address.startsWith(prefix) ? address.slice(prefix.length) : address;
  return rest.split(',').slice(0, 3).join(',');
}

/**
 * Reviews are deliberately author-less: a rating is never joined to a profile, so only the
 * date, verdict, tags and comment are shown.
 */
export default function SpaceDetailSheet({ space, isSignedIn, onClose, onRate }: Props) {
  const ratings = useMemo(() => space.ratings ?? [], [space.ratings]);
  const total = ratings.length;
  const counts = countRatings(ratings);
  const overall = overallRating(ratings);
  const color = PIN_COLORS[overall];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // What people noticed, most-mentioned first.
  const noticed = useMemo(() => {
    const tally = new Map<string, number>();
    for (const r of ratings) for (const t of r.safety_tags ?? []) tally.set(t, (tally.get(t) ?? 0) + 1);
    return [...tally.entries()].sort((a, b) => b[1] - a[1]);
  }, [ratings]);

  const spaceTags = Array.isArray(space.tags) ? space.tags : [];
  const comments = ratings.filter((r) => r.comment && r.comment.trim());
  const hasLocation = space.latitude != null && space.longitude != null;

  return (
    <div className="overlay panel" role="dialog" aria-modal="true" aria-label={space.name} onClick={onClose}>
      <div className="sheet detail" onClick={(e) => e.stopPropagation()}>
        <div className="detail-head">
          <span className="detail-icon" style={{ background: color }}>
            <Icon name={(CATEGORY_ICONS[space.category] ?? 'pin') as IconName} size={26} />
          </span>
          <div className="detail-title">
            <h2 className="space-name">{space.name}</h2>
            <div className="space-addr">
              {CATEGORY_LABELS[space.category] ?? 'Place'}
              {space.address && ` · ${shortAddress(space.name, space.address)}`}
            </div>
          </div>
          <button className="close-x" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className={`verdict v-${overall}`}>
          <span className="verdict-badge" style={{ background: color }}>
            <Icon name={BADGE[overall]} size={20} />
          </span>
          <div>
            <div className="verdict-title">{VERDICTS[overall]}</div>
            <div className="verdict-sub">
              {total === 0
                ? 'Be the first to share what it is like here.'
                : `Based on ${total} rating${total === 1 ? '' : 's'}`}
            </div>
          </div>
        </div>

        {total > 0 && (
          <div className="split">
            <div className="split-bar" role="img" aria-label="How people rated this place">
              {SEGMENTS.map(({ key }) =>
                counts[key] > 0 ? (
                  <span
                    key={key}
                    className="split-seg"
                    style={{ flexGrow: counts[key], background: PIN_COLORS[key] }}
                  />
                ) : null,
              )}
            </div>
            <div className="split-legend">
              {SEGMENTS.map(({ key, label }) => (
                <span className="split-item" key={key}>
                  <span className="key-dot" style={{ background: PIN_COLORS[key] }} />
                  {label} <b>{percent(counts[key], total)}%</b>
                  <span className="split-n">({counts[key]})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {space.source === 'osm' && (
          <div className="listed-note">
            <Icon name="question" size={18} />
            <div>
              <strong>Listed as LGBTQ+ friendly on OpenStreetMap.</strong> This is a listing, not a
              safety rating, and nobody here has rated it yet. If you have been, rate it and help
              others know what to expect.
              <div className="listed-credit">
                Listing data © OpenStreetMap contributors (ODbL).
              </div>
            </div>
          </div>
        )}

        {(noticed.length > 0 || spaceTags.length > 0) && (
          <section className="detail-sec">
            <h3>What people noticed</h3>
            <div className="space-tags">
              {noticed.map(([tag, n]) => (
                <span className={`stag ${NEGATIVE_TAGS.has(tag) ? 'neg' : 'pos'}`} key={tag}>
                  <Icon name={NEGATIVE_TAGS.has(tag) ? 'alert' : 'check'} size={13} />
                  {tagLabel(tag)}
                  {n > 1 && <b>×{n}</b>}
                </span>
              ))}
              {spaceTags.map((t) => (
                <span className="stag" key={t}>
                  {t}
                </span>
              ))}
            </div>
          </section>
        )}

        {space.notes && space.source !== 'osm' && <p className="space-notes">{space.notes}</p>}

        <section className="detail-sec">
          <h3>
            Comments{comments.length > 0 && <span className="detail-count">{comments.length}</span>}
          </h3>
          {comments.length === 0 ? (
            <div className="empty-state">
              <Icon name="message" size={22} />
              <span>{total === 0 ? 'No ratings yet. Be the first!' : 'No comments yet.'}</span>
            </div>
          ) : (
            comments.slice(0, 8).map((r) => (
              <article className="rev-item" key={r.id} style={{ borderLeftColor: PIN_COLORS[r.rating] }}>
                <div className="rev-head">
                  <span className="rev-badge" style={{ background: PIN_COLORS[r.rating] }}>
                    <Icon name={BADGE[r.rating]} size={11} />
                  </span>
                  <span className="rev-name">{r.username || 'Former member'}</span>
                  {r.founding && <FoundingBadge />}
                  <span className="rev-date">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}
                  </span>
                </div>
                <div className="rev-text">{r.comment}</div>
              </article>
            ))
          )}
        </section>

        <div className="detail-actions">
          <button className="btn btn-primary" onClick={onRate}>
            <Icon name={isSignedIn ? 'star' : 'login'} />
            {isSignedIn ? 'Rate this place' : 'Sign in to rate'}
          </button>
          {hasLocation && (
            <a
              className="btn btn-secondary"
              target="_blank"
              rel="noopener noreferrer"
              href={`https://www.google.com/maps/dir/?api=1&destination=${space.latitude},${space.longitude}`}
            >
              <Icon name="map" />
              Directions
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
