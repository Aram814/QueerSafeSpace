import type { ReactNode } from 'react';
import Icon from '../components/Icon';
import { CONTACT_EMAIL, FEEDBACK_HREF, INSTAGRAM_HREF } from '../config';

export type InfoPage = 'crisis' | 'contact' | 'privacy' | 'terms' | 'account' | 'tester' | 'admin';

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
    name: 'LGBT National Hotline',
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
        <p className="legal-date">Effective date: October 4, 2026</p>
        <p>QueerSafeSpace respects your privacy and is committed to protecting your personal information.</p>

        <h2>What we collect</h2>
        <p>
          We collect account info (email, password hash), optional location data when you add spaces,
          and basic usage data to improve the app.
        </p>
        <p>
          If you join using another member&apos;s referral code, we record which member referred
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
        <p>
          Data is stored securely via Supabase. You can delete your account and its data yourself in
          Account settings, or ask us to do it.
        </p>

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
        <p className="legal-date">Effective date: October 4, 2026</p>
        <p>
          These Terms are an agreement between you and QueerSafeSpace (&ldquo;we&rdquo;,
          &ldquo;us&rdquo;). By creating an account or using the app or website, you agree to them. If
          you do not agree, please do not use QueerSafeSpace.
        </p>

        <h2>Who can use it</h2>
        <p>
          You must be at least 13 years old. If you are under 18, please use QueerSafeSpace with the
          knowledge of a parent or guardian.
        </p>

        <h2>What QueerSafeSpace is, and is not</h2>
        <p>
          QueerSafeSpace is a community map. People share their own experiences of places, and we
          also show places listed on public map sources. It is an information tool only. It is not a
          safety service, a security service, an emergency service, or professional advice of any
          kind.
        </p>
        <p>
          If you are in danger or need urgent help, call your local emergency number (911 in the US).
          You can find support lines under Crisis resources in the menu.
        </p>

        <h2>Safety is your call</h2>
        <p>
          Ratings, tags, comments and listings are opinions and information from other people. They
          may be wrong, out of date, or reflect one person&apos;s experience on one day. A place
          marked &ldquo;safe&rdquo; may not be safe for you, and a place with no rating or a poor
          rating is not necessarily unsafe. Staff, owners, policies and other customers change.
        </p>
        <p>
          We do not verify ratings, visit places, or promise that any place, person, event or
          experience will be safe, welcoming or free from harassment, discrimination, discomfort or
          harm. You are responsible for your own decisions and for your own safety. Use your
          judgment, trust your instincts, and take whatever precautions you think are right when you
          go anywhere.
        </p>
        <p>
          You use QueerSafeSpace, and visit any place you find through it, at your own risk. You
          understand that something unpleasant or unsafe can happen at any place, and you accept that
          risk.
        </p>

        <h2>Ratings, comments and places you add</h2>
        <p>
          You are responsible for what you post. When you rate, comment or add a place, you agree
          that:
        </p>
        <ul>
          <li>it is based on your own real, firsthand experience, and you believe it to be true;</li>
          <li>
            you will describe what happened, not attack anyone. Do not name or identify private
            individuals, do not share anyone&apos;s personal information, and do not post hateful,
            threatening, harassing or sexually explicit content;
          </li>
          <li>
            you have no financial or personal connection to the place that would make your rating
            misleading, and you are not rating a place because of a personal dispute;
          </li>
          <li>you will not post fake, paid, copied or repeated ratings.</li>
        </ul>
        <p>
          You keep ownership of what you post. You give us a free, worldwide, permanent licence to
          store, display, adapt and use it in QueerSafeSpace, including after you delete your
          account, in a form that is not linked to you.
        </p>
        <p>
          Content shown on QueerSafeSpace was written by community members, not by us, and does not
          represent our views. We are not the author or publisher of what members post.
        </p>

        <h2>Listed places and businesses</h2>
        <p>
          Some places come from public sources such as OpenStreetMap, and some searches use other
          providers. These are listings, not endorsements or ratings. We have no relationship with
          the businesses and organizations shown, and a listing does not mean they support, endorse
          or are affiliated with QueerSafeSpace or its community. Details such as names, addresses
          and hours may be wrong or out of date. If you own or run a place and believe something
          shown about it is inaccurate, contact us and we will review it.
        </p>

        <h2>Rules</h2>
        <p>Do not:</p>
        <ul>
          <li>harass, threaten or harm anyone, or use QueerSafeSpace to find, follow or target a person;</li>
          <li>post false, misleading or harmful information;</li>
          <li>
            try to find out who wrote a rating, or to link usernames to real people, emails or
            accounts;
          </li>
          <li>
            scrape, copy in bulk, or resell the data, or interfere with the service, its security or
            other people&apos;s use of it;
          </li>
          <li>break the law, or use QueerSafeSpace for anything unlawful.</li>
        </ul>

        <h2>Your account and username</h2>
        <p>
          Give accurate information and keep your password private; you are responsible for activity
          on your account. Your username is shown publicly next to your ratings and comments. Please
          do not use your real name. You can change your username, or delete your account and its
          data, at any time in Account settings.
        </p>

        <h2>Volunteers, testers and Founding Members</h2>
        <p>
          People who help test, rate places, or spread the word are volunteers. Volunteering does not
          make anyone an employee, contractor or partner of QueerSafeSpace, and no payment, wage or
          other compensation is promised. Features such as the Founding Member badge, extra avatars
          and referral counts are small thanks for helping. They have no cash value, can&apos;t be
          sold or exchanged, and we may change or end them at any time. Any other perk is a gift, not
          a promise.
        </p>

        <h2>Moderation</h2>
        <p>
          We are not required to monitor content, but we may review, edit, hide or remove any content,
          and suspend or close any account, at any time and for any reason, including breaking these
          Terms. You can report a problem using the contact details below.
        </p>

        <h2>No warranties</h2>
        <p>
          QueerSafeSpace is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the
          fullest extent the law allows, we make no promises or warranties of any kind, express or
          implied, including about accuracy, completeness, reliability, availability, fitness for a
          particular purpose, or that the service will be uninterrupted, secure or error-free.
        </p>

        <h2>Limit of our liability</h2>
        <p>
          To the fullest extent the law allows, QueerSafeSpace and the people who run, build, volunteer
          for or contribute to it are not liable for any loss, injury, harm or damage of any kind
          arising from or connected to your use of, or reliance on, QueerSafeSpace or anything on it.
          This includes, for example, harassment, discrimination, assault, discomfort, embarrassment,
          property loss, emotional distress or any other harm that happens at or near a place shown on
          the map, whether or not it was marked safe, and anything done or said by other users, by
          businesses or by anyone else.
        </p>
        <p>
          This also covers indirect, incidental, special, consequential and punitive damages, lost
          profits and lost data. If a court decides we are liable despite this, our total liability
          for all claims is limited to US$100. Some places do not allow these limits, so they apply
          to you only as far as your local law permits. Nothing in these Terms limits any right you
          have that cannot legally be limited.
        </p>

        <h2>Release and responsibility for your content</h2>
        <p>
          You release QueerSafeSpace and the people involved in running it from any claim connected
          to other users&apos; content or to your visit to any place. You also agree to cover claims,
          losses and costs that come from content you post or from your breaking these Terms.
        </p>

        <h2>Changes</h2>
        <p>
          We may change, pause or stop QueerSafeSpace, or change these Terms, at any time. When the
          Terms change, we will update the date above. Using QueerSafeSpace after a change means you
          accept the new Terms.
        </p>

        <h2>Governing law</h2>
        <p>
          These Terms are governed by the laws of the State of Florida, USA, without regard to its
          conflict-of-law rules. Any dispute will be handled in the state or federal courts located in
          Florida, and you agree to those courts. If any part of these Terms is found unenforceable,
          the rest still applies.
        </p>

        <h2>Contact</h2>
        <p>
          Questions, content reports, or corrections: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </article>
    </PageShell>
  );
}
