import type { ReactNode } from 'react';
import Icon from '../components/Icon';
import { CONTACT_EMAIL, FEEDBACK_HREF, INSTAGRAM_HREF } from '../config';

export type InfoPage = 'crisis' | 'contact' | 'privacy' | 'terms' | 'account' | 'tester';

export function PageShell({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  return (
    <div className="screen page">
      <header className="page-head">
        <button className="page-back" onClick={onBack} aria-label="Back to the map">
          <Icon name="back" />
        </button>
        <h1>{title}</h1>
      </header>
      <div className="page-body">{children}</div>
    </div>
  );
}

const HOTLINES: { name: string; note?: string; label: string; href: string; icon: 'phone' | 'message'; text: string }[] = [
  {
    name: 'Trevor Project',
    note: 'LGBTQ+ youth',
    label: '1-866-488-7386',
    href: 'tel:18664887386',
    icon: 'phone',
    text: '24/7 crisis support for LGBTQ+ young people under 25. Also available by chat and text.',
  },
  {
    name: 'Trans Lifeline',
    label: '1-877-565-8860',
    href: 'tel:18775658860',
    icon: 'phone',
    text: 'Peer support hotline staffed by and for transgender people.',
  },
  {
    name: '988 Suicide & Crisis Lifeline',
    label: '988',
    href: 'tel:988',
    icon: 'phone',
    text: 'Free, confidential support any time. Press 3 for LGBTQ+ support.',
  },
  {
    name: 'Crisis Text Line',
    label: 'Text HOME to 741741',
    href: 'sms:741741',
    icon: 'message',
    text: 'Free text-based support from trained crisis counselors, any time.',
  },
  {
    name: 'GLBT National Hotline',
    label: '1-888-843-4564',
    href: 'tel:18888434564',
    icon: 'phone',
    text: 'Peer support, information and local resources for LGBTQ+ people of all ages.',
  },
  {
    name: 'National Domestic Violence Hotline',
    note: 'LGBTQ+ inclusive',
    label: '1-800-799-7233',
    href: 'tel:18007997233',
    icon: 'phone',
    text: 'Safe, confidential support for anyone experiencing domestic violence.',
  },
];

export function CrisisPage({ onBack }: { onBack: () => void }) {
  return (
    <PageShell title="Crisis resources" onBack={onBack}>
      <p className="page-lede">You are not alone. Help is available any time.</p>
      {HOTLINES.map((h) => (
        <article className="crisis-card" key={h.name}>
          <h2>
            {h.name} {h.note && <span className="crisis-note">({h.note})</span>}
          </h2>
          <a className="crisis-link" href={h.href}>
            <Icon name={h.icon} />
            {h.label}
          </a>
          <p>{h.text}</p>
        </article>
      ))}
    </PageShell>
  );
}

export function ContactPage({ onBack, onOpenPage }: { onBack: () => void; onOpenPage: (page: InfoPage) => void }) {
  return (
    <PageShell title="Contact us" onBack={onBack}>
      <article className="info-card">
        <h2>About QueerSafeSpace</h2>
        <p>
          A community-driven project for a safer world for LGBTQ+ people. Built by and for our
          community, because safety shouldn&apos;t be a privilege.
        </p>
      </article>
      <article className="info-card">
        <h2>Help us build it</h2>
        <p>We are still in beta. Tell us what works, what doesn&apos;t, or sign up to test new features.</p>
        <div className="info-actions">
          <a className="btn btn-primary" href={FEEDBACK_HREF}>
            <Icon name="message" />
            Send feedback
          </a>
          <button className="btn btn-secondary" onClick={() => onOpenPage('tester')}>
            <Icon name="flask" />
            Become a tester
          </button>
        </div>
      </article>
      <article className="info-card">
        <h2>Get in touch</h2>
        <p>
          Email <strong>{CONTACT_EMAIL}</strong>
        </p>
        <p>
          Follow us on{' '}
          <a href={INSTAGRAM_HREF} target="_blank" rel="noreferrer">
            Instagram
          </a>
        </p>
      </article>
    </PageShell>
  );
}

export function PrivacyPage({ onBack }: { onBack: () => void }) {
  return (
    <PageShell title="Privacy policy" onBack={onBack}>
      <article className="legal-doc">
        <p className="legal-date">Effective date: September 29, 2026</p>
        <p>QueerSafeSpace respects your privacy and is committed to protecting your personal information.</p>

        <h2>What we collect</h2>
        <p>
          We collect account info (email, password hash), optional location data when you add spaces,
          and basic usage data to improve the app.
        </p>
        <p>
          If you join through another member&apos;s referral link, we record which member referred
          you. That member only ever sees a count, never your name or details.
        </p>
        <p>
          If you fill in the &ldquo;Become a tester&rdquo; form we also keep the name, email, city,
          device and notes you enter, only to contact you about QueerSafeSpace. Ask us at any time
          to delete them.
        </p>

        <h2>Anonymity</h2>
        <p>
          Your ratings and comments are shown with the username you choose, never with your email.
          Please don&apos;t use your real name. You can change your username at any time in Account
          settings. We never sell your data or share it with advertisers.
        </p>

        <h2>Location data</h2>
        <p>
          If you allow it, your device location is used to center the map and to find places near you.
          We do not store it or link it to your account, and we do not track your movement. The only
          locations we save are the places you choose to submit.
        </p>

        <h2>Searching for places</h2>
        <p>
          When you search, the text you type and an approximate location (the area of the map you are
          viewing or near you, rounded to about 100 metres) are sent to services that find places. We
          do not add your name, email or account to these requests.
        </p>
        <ul>
          <li>
            <strong>Foursquare</strong> supplies business listings. Your search text and approximate
            location go to Foursquare through our server, so Foursquare does not receive your IP
            address from us.
          </li>
          <li>
            <strong>OpenStreetMap-based services</strong> (Overpass, Photon and Nominatim) supply map
            and address data. Some of these requests go through our server and some go straight from
            your browser, in which case the service can see your IP address, as with any website.
          </li>
          <li>
            <strong>Map tiles</strong> are loaded directly from OpenStreetMap, which can also see your
            IP address.
          </li>
          <li>
            <strong>Our hosting provider</strong> (Vercel) delivers this site and runs our search
            server, and may keep standard server logs such as IP addresses.
          </li>
        </ul>
        <p>
          These providers have their own privacy policies. If you would rather not share your
          location, block it in your browser settings; you can still search by typing a place or
          address.
        </p>

        <h2>Data storage</h2>
        <p>Data is stored securely via Supabase. You can request account deletion by contacting us.</p>

        <h2>Contact</h2>
        <p>{CONTACT_EMAIL}</p>
      </article>
    </PageShell>
  );
}

export function TermsPage({ onBack }: { onBack: () => void }) {
  return (
    <PageShell title="Terms & conditions" onBack={onBack}>
      <article className="legal-doc">
        <p className="legal-date">Effective date: September 13, 2025</p>
        <p>By using QueerSafeSpace, you agree to these Terms. You must be at least 13 years old.</p>

        <h2>Community guidelines</h2>
        <p>
          Do not submit false, misleading, or harmful information. Do not harass or harm other
          community members. Respect everyone&apos;s identity and experience.
        </p>

        <h2>Content</h2>
        <p>
          Space submissions are community-generated. QueerSafeSpace does not guarantee the accuracy of
          any safety rating. Always use your own judgment.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          QueerSafeSpace is provided as-is. We are not liable for any harm resulting from reliance on
          community-submitted data.
        </p>
      </article>
    </PageShell>
  );
}
