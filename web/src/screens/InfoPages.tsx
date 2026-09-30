import type { ReactNode } from 'react';
import Icon from '../components/Icon';
import { CONTACT_EMAIL, FEEDBACK_HREF, INSTAGRAM_HREF, TESTER_HREF } from '../config';

function PageShell({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
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

export function ContactPage({ onBack }: { onBack: () => void }) {
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
          <a className="btn btn-secondary" href={TESTER_HREF}>
            <Icon name="flask" />
            Become a tester
          </a>
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
