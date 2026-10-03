import Icon from '../components/Icon';
import MapPeek from '../components/MapPeek';
import ShieldLogo from '../components/ShieldLogo';
import type { InfoPage } from './InfoPages';

interface Props {
  onSignUp: () => void;
  onSignIn: () => void;
  onBrowseAnonymously: () => void;
  onOpenPage: (page: InfoPage) => void;
}

/**
 * Phone: the map on top, the shield resting on the edge of the sheet below it.
 * Desktop: the map fills the left, the sheet is a panel on the right, same edge, same shield.
 */
export default function SplashScreen({ onSignUp, onSignIn, onBrowseAnonymously, onOpenPage }: Props) {
  return (
    <div className="screen splash">
      <div className="flag-ribbon" aria-hidden="true" />
      <MapPeek />

      <main className="splash-sheet">
        <ShieldLogo className="splash-badge" />
        <h1 className="splash-title">QueerSafeSpace</h1>
        <p className="splash-tagline">
          Because Safety Shouldn&apos;t Be A Privilege
        </p>

        <ul className="splash-facts">
          <li>
            <span className="fact-dot">
              <Icon name="map" size={14} />
            </span>
            Find places rated by people like you
          </li>
          <li>
            <span className="fact-dot">
              <Icon name="lock" size={14} />
            </span>
            Your identity stays private
          </li>
          <li>
            <span className="fact-dot">
              <Icon name="users" size={14} />
            </span>
            Built by and for the community
          </li>
        </ul>

        <div className="splash-actions">
          <button className="btn btn-primary" onClick={onBrowseAnonymously}>
            <Icon name="map" />
            Explore the map
          </button>
          <button className="btn btn-secondary" onClick={onSignIn}>
            Sign in
          </button>
          <button className="btn btn-link" onClick={onSignUp}>
            New here? Create an account
          </button>
        </div>

        <div className="splash-help">
          <Icon name="flask" size={18} />
          <p>
            QueerSafeSpace is in beta.{' '}
            <button className="link-btn" onClick={() => onOpenPage('tester')}>
              Help us test it
            </button>{' '}
            <span className="splash-help-note">(a volunteer sign-up, separate from your account)</span>
          </p>
        </div>

        <p className="splash-legal">
          <span className="beta-tag">Beta</span>
          <button className="link-btn" onClick={() => onOpenPage('privacy')}>
            Privacy
          </button>
          <span aria-hidden="true">&middot;</span>
          <button className="link-btn" onClick={() => onOpenPage('terms')}>
            Terms
          </button>
          <span aria-hidden="true">&middot;</span>
          <button className="link-btn" onClick={() => onOpenPage('crisis')}>
            Crisis resources
          </button>
        </p>
      </main>
    </div>
  );
}
