import { useEffect, useState } from 'react';
import {
  currentPosition,
  loadImpact,
  loadSiteStats,
  referralLink,
  type Impact,
  type SiteStats,
} from '../lib/impact';
import Icon from './Icon';

/** "Your impact": personal numbers, community numbers and a referral link. Founding Members only. */
export default function ImpactCard({ onToast }: { onToast: (message: string) => void }) {
  const [impact, setImpact] = useState<Impact | null>(null);
  const [site, setSite] = useState<SiteStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const mine = await loadImpact();
        if (alive) setImpact(mine);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : 'Could not load your stats');
        return;
      }
      const position = await currentPosition();
      try {
        const stats = await loadSiteStats(position);
        if (alive) setSite(stats);
      } catch {
        /* community numbers are optional */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function share() {
    if (!impact) return;
    const url = referralLink(impact.referralCode);
    const text = 'Join me on QueerSafeSpace, a community map of places that are safe for LGBTQ+ people.';
    try {
      if (navigator.share) {
        await navigator.share({ title: 'QueerSafeSpace', text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      onToast('Link copied');
    } catch {
      /* user closed the share sheet */
    }
  }

  async function copy() {
    if (!impact) return;
    try {
      await navigator.clipboard.writeText(referralLink(impact.referralCode));
      onToast('Link copied');
    } catch {
      onToast('Could not copy. Select the link and copy it by hand.');
    }
  }

  if (error) {
    return (
      <article className="info-card">
        <h2>Your impact</h2>
        <p className="account-note">{error}</p>
      </article>
    );
  }

  return (
    <article className="info-card impact-card">
      <h2>Your impact</h2>
      {!impact ? (
        <p className="account-note">Loading…</p>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat">
              <b>{impact.myRatings}</b>
              <span>places you&apos;ve rated</span>
            </div>
            <div className="stat">
              <b>{impact.myPlacesAdded}</b>
              <span>places you&apos;ve added</span>
            </div>
            <div className="stat">
              <b>{impact.referrals}</b>
              <span>{impact.referrals === 1 ? 'friend joined' : 'friends joined'} through your link</span>
            </div>
          </div>

          {site && (
            <div className="stat-grid community">
              <div className="stat">
                <b>{site.ratedPlaces}</b>
                <span>places rated on QueerSafeSpace</span>
              </div>
              <div className="stat">
                <b>{site.totalRatings}</b>
                <span>ratings from the community</span>
              </div>
              {site.area && (
                <div className="stat">
                  <b>{site.area.ratedPlaces}</b>
                  <span>
                    rated places within about 25 miles of you ({site.area.places} listed)
                  </span>
                </div>
              )}
            </div>
          )}

          <h3 className="impact-sub">Your referral link</h3>
          <p className="account-note">
            Share it with friends. We count the people who join through it. We never show who they
            are.
          </p>
          <input className="fi" readOnly value={referralLink(impact.referralCode)} aria-label="Your referral link" onFocus={(e) => e.currentTarget.select()} />
          <div className="impact-actions">
            <button className="btn btn-primary" onClick={() => void share()}>
              <Icon name="heart" />
              Share my link
            </button>
            <button className="btn btn-secondary" onClick={() => void copy()}>
              Copy link
            </button>
          </div>
        </>
      )}
    </article>
  );
}
