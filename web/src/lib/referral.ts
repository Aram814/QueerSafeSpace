const KEY = 'qss-ref';

/** Remembers a ?ref=CODE from the address bar (for people who arrive through a member's link). */
export function captureReferral(): void {
  try {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref && /^[a-z0-9]{4,16}$/i.test(ref)) {
      localStorage.setItem(KEY, ref.toLowerCase());
    }
    if (ref) {
      const url = new URL(window.location.href);
      url.searchParams.delete('ref');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
  } catch {
    /* storage can be blocked; referral is a nice-to-have */
  }
}

export function storedReferral(): string | undefined {
  try {
    return localStorage.getItem(KEY) ?? undefined;
  } catch {
    return undefined;
  }
}
