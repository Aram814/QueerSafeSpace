import { countRatings, overallRating, PIN_COLORS, RATING_LABELS } from '../lib/ratings';
import type { SpaceDetail } from '../lib/types';

interface Props {
  space: SpaceDetail;
  isSignedIn: boolean;
  onClose: () => void;
  onRate: () => void;
}

const BADGE_CLASS = {
  safe: 'sb-safe',
  mixed: 'sb-mixed',
  not_safe: 'sb-unsafe',
  unknown: 'sb-unknown',
} as const;

const BARS = [
  ['safe', '✅ Safe', '#22C55E'],
  ['mixed', '⚠️ Mixed', '#FBBF24'],
  ['not_safe', '❌ Not Safe', '#EF4444'],
] as const;

/**
 * Ported from openDetail(). Reviews are deliberately author-less: a rating is
 * never joined to a profile, so only the date, colour and comment are shown.
 */
export default function SpaceDetailSheet({ space, isSignedIn, onClose, onRate }: Props) {
  const ratings = space.ratings ?? [];
  const total = ratings.length;
  const counts = countRatings(ratings);
  const overall = overallRating(ratings);

  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="sheet">
        <div className="sheet-header end">
          <button className="close-x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="space-name">{space.name}</div>
        {space.address && (
          <div className="space-addr">📍 {space.address.split(',').slice(0, 3).join(',')}</div>
        )}

        <div className={`safety-badge ${BADGE_CLASS[overall]}`}>
          {RATING_LABELS[overall]} · {total} rating{total !== 1 ? 's' : ''}
        </div>

        {total > 0 && (
          <div className="bars">
            {BARS.map(([key, label, color]) => (
              <div className="bar-row" key={key}>
                <span className="bar-lbl">{label}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${total ? Math.round((counts[key] / total) * 100) : 0}%`,
                      background: color,
                    }}
                  />
                </div>
                <span className="bar-ct">{counts[key]}</span>
              </div>
            ))}
          </div>
        )}

        {space.tags && space.tags.length > 0 && (
          <div className="space-tags">
            {space.tags.map((t) => (
              <span className="stag" key={t}>
                {t}
              </span>
            ))}
          </div>
        )}

        {space.notes && <p className="space-notes">{space.notes}</p>}

        <button className="btn btn-primary" onClick={onRate}>
          {isSignedIn ? '⭐ Rate This Space' : '🔑 Sign In to Rate'}
        </button>

        <div className="reviews-sec">
          <div className="reviews-title">Recent Ratings</div>
          {total === 0 ? (
            <div className="empty-state">
              <div className="ei">💬</div>
              No ratings yet — be the first!
            </div>
          ) : (
            ratings.slice(0, 8).map((r) => (
              <div className="rev-item" key={r.id}>
                <div className="rev-head">
                  <span>👤</span>
                  <span className="rev-date">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}
                  </span>
                  <div className="rev-dot" style={{ background: PIN_COLORS[r.rating] }} />
                </div>
                {r.safety_tags && r.safety_tags.length > 0 && (
                  <div className="space-tags">
                    {r.safety_tags.map((t) => (
                      <span className="stag" key={t}>
                        {t.replaceAll('_', ' ')}
                      </span>
                    ))}
                  </div>
                )}
                {r.comment && <div className="rev-text">{r.comment}</div>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
