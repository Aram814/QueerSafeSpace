/** Light / dark / follow-the-device. Kept outside lib/ because it touches the DOM. */
export type ThemeChoice = 'system' | 'light' | 'dark';

const KEY = 'qss-theme';

export function getTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    // storage can be blocked (private windows); fall through to the device setting
  }
  return 'system';
}

export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', choice);
}

export function setTheme(choice: ThemeChoice): void {
  try {
    if (choice === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    // ignore: the choice still applies for this visit
  }
  applyTheme(choice);
}
