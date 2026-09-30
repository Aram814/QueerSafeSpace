import Icon from '../components/Icon';
import ShieldLogo from '../components/ShieldLogo';

interface Props {
  onSignUp: () => void;
  onSignIn: () => void;
  onBrowseAnonymously: () => void;
}

export default function SplashScreen({ onSignUp, onSignIn, onBrowseAnonymously }: Props) {
  return (
    <div className="screen splash">
      <div className="flag-ribbon" aria-hidden="true" />
      <div className="splash-inner">
        <ShieldLogo className="splash-shield" />
        <h1 className="splash-title">QueerSafeSpace</h1>
        <p className="splash-tagline">Because safety shouldn&apos;t be a privilege</p>

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
            Ratings are always anonymous
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
          <button className="btn btn-secondary" onClick={onSignUp}>
            Create an account
          </button>
          <button className="btn btn-link" onClick={onSignIn}>
            I already have an account
          </button>
        </div>
        <p className="splash-note">
          <span className="beta-tag">Beta</span> Still being built with the community. Tell us what you
          think from the menu.
        </p>
      </div>
    </div>
  );
}
