import { useEffect, useState } from 'react';
import { currentPosition, displayCode, loadSiteStats, type Impact, type SiteStats } from '../lib/impact';
import Icon from './Icon';

/** "Your impact": personal numbers, community numbers and a referral code. Founding Members only. */
export default function ImpactCard({
  impact,
  error,
  onToast,
}: {
  impact: Impact | null;
  error: string | null;
  onToast: (message: string) => void;
}) {
  const [site, setSite] = useState<SiteStats | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
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
    const code = displayCode(impact.referralCode);
    const text = `Join me on QueerSafeSpace, a community map of places that are safe for LGBTQ+ people. Sign up at queersafespace.org and enter my code ${code}.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'QueerSafeSpace', text });
        return;
      }
      await navigator.clipboard.writeText(text);
      onToast('Message copied');
    } catch {
      /* user closed the share sheet */
    }
  }

  async function copy() {
    if (!impact) return;
    try {
      await navigator.clipboard.writeText(displayCode(impact.referralCode));
      onToast('Code copied');
    } catch {
      onToast('Could not copy. Select the code and copy it by hand.');
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
              <span>{impact.referrals === 1 ? 'friend joined' : 'friends joined'} with your code</span>
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

          <h3 className="impact-sub">Your referral code</h3>
          <p className="account-note">
            Friends can enter it when they sign up. We count the people who join with it. We never
            show who they are.
          </p>
          <div className="referral-code" aria-label="Your referral code">
            {displayCode(impact.referralCode)}
          </div>
          <div className="impact-actions">
            <button className="btn btn-primary" onClick={() => void share()}>
              <Icon name="heart" />
              Share my code
            </button>
            <button className="btn btn-secondary" onClick={() => void copy()}>
              Copy code
            </button>
          </div>
        </>
      )}
    </article>
  );
}
