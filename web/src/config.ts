/** Where feedback goes (tester sign-ups use the in-app form). */
export const CONTACT_EMAIL = 'QueerSafeSpace.lgbt@gmail.com';

export const FEEDBACK_HREF = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  'QueerSafeSpace feedback',
)}`;

/**
 * Where the donate button goes (a Ko-fi, Stripe or similar page). Leave unset to hide every
 * "Support QueerSafeSpace" link. Set VITE_DONATE_URL in Vercel (and optionally VITE_DONATE_PROVIDER,
 * for example "Ko-fi"), then redeploy.
 */
export const DONATE_URL: string = (import.meta.env.VITE_DONATE_URL ?? '').trim();
export const DONATE_PROVIDER: string = (import.meta.env.VITE_DONATE_PROVIDER ?? '').trim();

export const INSTAGRAM_HREF = 'https://www.instagram.com/queersafespace.lgbt';

/**
 * Google and Apple sign-in. Keep off until both providers are configured in Supabase
 * (Authentication > Providers) and their redirect URLs are added; see web/README.md.
 */
export const OAUTH_ENABLED = false;
