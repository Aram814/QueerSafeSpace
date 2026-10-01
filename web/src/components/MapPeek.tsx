import Icon from './Icon';
import PlacePin from './PlacePin';

/**
 * A drawn map with a few example places, shown on the welcome screen so people see what the
 * app does before they read anything. The places are examples, not real listings.
 */
export default function MapPeek() {
  return (
    <div className="map-peek" aria-hidden="true">
      <svg className="peek-art" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
        <rect className="mp-land" width="400" height="400" />
        <path className="mp-water" d="M-20 90 C70 50 150 140 250 100 S400 50 430 80 V190 C330 190 260 140 160 180 S30 200 -20 180 Z" />
        <rect className="mp-park" x="262" y="232" width="104" height="80" rx="12" />
        <rect className="mp-park" x="24" y="276" width="120" height="74" rx="12" />
        <rect className="mp-park" x="170" y="20" width="64" height="40" rx="10" />
        <g className="mp-road" fill="none" strokeWidth="11" strokeLinecap="round">
          <path d="M-10 226 H410" />
          <path d="M146 -10 V410" />
          <path d="M308 -10 L252 410" />
        </g>
        <g className="mp-road2" fill="none" strokeWidth="6" strokeLinecap="round">
          <path d="M-10 330 H410" />
          <path d="M54 -10 V410" />
          <path d="M360 40 V410" />
          <path d="M-10 150 C100 130 220 170 410 130" />
        </g>
      </svg>

      <PlacePin rating="not_safe" icon="glass" left="16%" top="52%" />
      <PlacePin rating="safe" icon="book" left="84%" top="50%" />
      <PlacePin rating="mixed" icon="church" left="27%" top="76%" />
      <PlacePin rating="safe" icon="cup" left="70%" top="78%" large />
      <PlacePin rating="unknown" icon="bag" left="58%" top="62%" />

      <div className="peek-card">
        <div className="peek-card-top">
          <span className="peek-ico">
            <Icon name="cup" size={18} />
          </span>
          <span className="peek-card-text">
            <strong>Bean There Coffee</strong>
            <small>0.3 mi &middot; 9 ratings</small>
          </span>
          <span className="peek-pill">Mostly safe</span>
        </div>
        <div className="peek-bar">
          <i style={{ width: '67%', background: 'var(--safe)' }} />
          <i style={{ width: '22%', background: 'var(--mixed)' }} />
          <i style={{ width: '11%', background: 'var(--unsafe)' }} />
        </div>
        <span className="peek-example">Example</span>
      </div>
    </div>
  );
}
