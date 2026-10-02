import { useCallback, useEffect, useState } from 'react';
import {
  grantFounding,
  loadDailySignups,
  loadOverview,
  loadRecentAccounts,
  loadTesters,
  setContacted,
  type AdminAccount,
  type AdminOverview,
  type AdminTester,
} from '../lib/admin';
import { TESTER_DEVICES, TESTER_ROLES } from '../lib/testers';
import { PageShell } from './InfoPages';

interface Props {
  onBack: () => void;
  onToast: (message: string) => void;
}

interface Data {
  overview: AdminOverview;
  daily: { day: string; accounts: number }[];
  accounts: AdminAccount[];
  testers: AdminTester[];
}

const when = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const dayName = new Intl.DateTimeFormat(undefined, { month: 'numeric', day: 'numeric' });

function ago(iso: string | null): string {
  if (!iso) return 'never';
  return when.format(new Date(iso));
}

function roleLabel(value: string): string {
  return TESTER_ROLES.find((r) => r.value === value)?.label ?? value;
}

function deviceLabel(value: string | null): string | null {
  return TESTER_DEVICES.find((d) => d.value === value)?.label ?? value;
}

/** Owner/admin dashboard. Every number comes from admin_* database functions that check the caller. */
export default function AdminPage({ onBack, onToast }: Props) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [overview, daily, accounts, testers] = await Promise.all([
        loadOverview(),
        loadDailySignups(14),
        loadRecentAccounts(25),
        loadTesters(),
      ]);
      setData({ overview, daily, accounts, testers });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the admin data');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function grant() {
    setBusy(true);
    try {
      const n = await grantFounding();
      onToast(n === 0 ? 'No new Founding Members to add' : `Added ${n} Founding Member${n === 1 ? '' : 's'}`);
      await refresh();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Could not add Founding Members');
    } finally {
      setBusy(false);
    }
  }

  async function toggleContacted(t: AdminTester, value: boolean) {
    setData((d) => d && { ...d, testers: d.testers.map((x) => (x.id === t.id ? { ...x, contacted: value } : x)) });
    try {
      await setContacted(t.id, value);
    } catch (err) {
      setData((d) => d && { ...d, testers: d.testers.map((x) => (x.id === t.id ? { ...x, contacted: !value } : x)) });
      onToast(err instanceof Error ? err.message : 'Could not save that');
    }
  }

  if (error) {
    return (
      <PageShell title="Admin" onBack={onBack}>
        <article className="info-card">
          <p className="account-note">{error}</p>
          <button className="btn btn-secondary" onClick={() => void refresh()}>
            Try again
          </button>
        </article>
      </PageShell>
    );
  }

  if (!data) {
    return (
      <PageShell title="Admin" onBack={onBack}>
        <p className="account-note">Loading…</p>
      </PageShell>
    );
  }

  const { overview: o, daily, accounts, testers } = data;
  const peak = Math.max(1, ...daily.map((d) => d.accounts));
  const waiting = testers.filter((t) => t.hasAccount && !t.founding).length;

  return (
    <PageShell title="Admin" onBack={onBack}>
      <article className="info-card">
        <h2>Accounts</h2>
        <div className="stat-grid">
          <div className="stat"><b>{o.accounts}</b><span>total accounts</span></div>
          <div className="stat"><b>{o.new7d}</b><span>new in the last 7 days</span></div>
          <div className="stat"><b>{o.new30d}</b><span>new in the last 30 days</span></div>
          <div className="stat"><b>{o.confirmed}</b><span>confirmed their email</span></div>
          <div className="stat"><b>{o.foundingMembers}</b><span>Founding Members</span></div>
          <div className="stat"><b>{o.referrals}</b><span>joined through a referral</span></div>
        </div>

        <h3 className="impact-sub">New accounts, last 14 days</h3>
        <div className="bars" role="img" aria-label="New accounts per day for the last 14 days">
          {daily.map((d) => (
            <div className="bar-col" key={d.day} title={`${d.day}: ${d.accounts}`}>
              <span className="bar-num">{d.accounts || ''}</span>
              <span className="bar" style={{ height: `${(d.accounts / peak) * 100}%` }} />
              <span className="bar-day">{dayName.format(new Date(`${d.day}T12:00:00`))}</span>
            </div>
          ))}
        </div>
      </article>

      <article className="info-card">
        <h2>Places</h2>
        <div className="stat-grid">
          <div className="stat"><b>{o.placesTotal}</b><span>places on the map</span></div>
          <div className="stat"><b>{o.placesCommunity}</b><span>added by the community</span></div>
          <div className="stat"><b>{o.placesRated}</b><span>places with a rating</span></div>
          <div className="stat"><b>{o.ratingsTotal}</b><span>ratings in total</span></div>
          <div className="stat"><b>{o.ratings7d}</b><span>ratings in the last 7 days</span></div>
        </div>
      </article>

      <article className="info-card">
        <h2>Tester sign-ups</h2>
        <p className="account-note">
          {o.testerSignups} filled in the form, {o.testersWithAccount} have created an account.
        </p>
        <button className="btn btn-primary" disabled={busy} onClick={() => void grant()}>
          Add Founding Member badges{waiting ? ` (${waiting} waiting)` : ''}
        </button>
        <p className="account-note">
          Gives the badge to every tester who has created an account with the same email. Safe to press as
          often as you like.
        </p>
        <ul className="admin-list">
          {testers.map((t) => (
            <li key={t.id} className="admin-row">
              <div className="admin-main">
                <b>{t.name}</b>
                <span className="admin-email">{t.email}</span>
                <span className="admin-meta">
                  {[t.location, deviceLabel(t.device), t.roles.map(roleLabel).join(', ')].filter(Boolean).join(' · ')}
                </span>
                {t.note && <span className="admin-note">&ldquo;{t.note}&rdquo;</span>}
                <span className="admin-meta">
                  {ago(t.createdAt)} · {t.founding ? 'Founding Member' : t.hasAccount ? 'has an account' : 'no account yet'}
                </span>
              </div>
              <label className="badge-toggle">
                <input type="checkbox" checked={t.contacted} onChange={(e) => void toggleContacted(t, e.target.checked)} />
                <span>Contacted</span>
              </label>
            </li>
          ))}
          {!testers.length && <li className="account-note">No tester sign-ups yet.</li>}
        </ul>
      </article>

      <article className="info-card">
        <h2>Newest accounts</h2>
        <ul className="admin-list">
          {accounts.map((a) => (
            <li key={`${a.createdAt}${a.email}`} className="admin-row">
              <div className="admin-main">
                <b>{a.username ?? 'no username yet'}</b>
                <span className="admin-email">{a.email}</span>
                <span className="admin-meta">
                  joined {ago(a.createdAt)} · last seen {ago(a.lastSignInAt)}
                </span>
                <span className="admin-tags">
                  {!a.confirmed && <em>email not confirmed</em>}
                  {a.founding && <em>Founding Member</em>}
                  {a.testerSignup && <em>tester form</em>}
                  {a.viaReferral && <em>referral</em>}
                </span>
              </div>
            </li>
          ))}
        </ul>
        <button className="btn btn-secondary" onClick={() => void refresh()}>
          Refresh
        </button>
      </article>
    </PageShell>
  );
}
