interface Props {
  onSignUp: () => void;
  onSignIn: () => void;
  onBrowseAnonymously: () => void;
}

export default function SplashScreen({ onSignUp, onSignIn, onBrowseAnonymously }: Props) {
  return (
    <div className="screen splash">
      <div className="splash-card">
        <div className="splash-logo" aria-hidden="true">
          🏳️‍🌈
        </div>
        <h1 className="splash-title">QueerSafeSpace</h1>
        <p className="splash-tagline">Because Safety Shouldn&apos;t Be A Privilege</p>
        <p className="splash-desc">
          A community-driven map for the LGBTQ+ community to find and share safe, inclusive
          spaces. Not a dating app — just a safe haven. Anonymous. Free. For everyone.
        </p>

        <button className="btn btn-primary" onClick={onSignUp}>
          Join the Community
        </button>
        <button className="btn btn-secondary" onClick={onSignIn}>
          Sign In
        </button>
        <button className="btn btn-ghost" onClick={onBrowseAnonymously}>
          Browse Map Anonymously →
        </button>
        <p className="splash-note">
          🔒 Fully anonymous. Account unlocks saved favorites &amp; ratings.
        </p>
      </div>
    </div>
  );
}
