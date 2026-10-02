/** Avatars are drawn, not typed, so they look the same on every phone. See components/Avatar.tsx. */

export type AvatarDef =
  | { id: string; label: string; tier: Tier; kind: 'flag'; stripes: string[] }
  | { id: string; label: string; tier: Tier; kind: 'heart'; bg: string; fill: string }
  | { id: string; label: string; tier: Tier; kind: 'glow'; from: string; to: string }
  | { id: string; label: string; tier: Tier; kind: 'ring'; stripes: string[] }
  | { id: string; label: string; tier: Tier; kind: 'star'; bg: string; fill: string }
  | { id: string; label: string; tier: Tier; kind: 'night'; bg: string; fill: string };

/** 0 = everyone; higher tiers unlock as more referrals come in with your code. */
export type Tier = 0 | 1 | 2 | 3;

/** Referrals (people who signed up with your code) needed for each tier. */
export const TIER_UNLOCK: Record<Tier, number> = { 0: 0, 1: 5, 2: 10, 3: 20 };

export const DEFAULT_AVATAR = 'flag-rainbow';

export const AVATAR_DEFS: AvatarDef[] = [
  { id: 'flag-rainbow', label: 'Rainbow', tier: 0, kind: 'flag', stripes: ['#E40303', '#FF8C00', '#FFED00', '#008026', '#004DFF', '#750787'] },
  { id: 'flag-trans', label: 'Trans', tier: 0, kind: 'flag', stripes: ['#5BCEFA', '#F5A9B8', '#FFFFFF', '#F5A9B8', '#5BCEFA'] },
  { id: 'flag-bi', label: 'Bi', tier: 0, kind: 'flag', stripes: ['#D60270', '#D60270', '#9B4F96', '#0038A8', '#0038A8'] },
  { id: 'flag-pan', label: 'Pan', tier: 0, kind: 'flag', stripes: ['#FF218C', '#FFD800', '#21B1FF'] },
  { id: 'flag-nonbinary', label: 'Non-binary', tier: 0, kind: 'flag', stripes: ['#FCF434', '#FFFFFF', '#9C59D1', '#2C2C2C'] },
  { id: 'flag-lesbian', label: 'Lesbian', tier: 0, kind: 'flag', stripes: ['#D52D00', '#EF7627', '#FF9A56', '#FFFFFF', '#D162A4', '#B55690', '#A30262'] },
  { id: 'flag-ace', label: 'Ace', tier: 0, kind: 'flag', stripes: ['#000000', '#A3A3A3', '#FFFFFF', '#800080'] },
  { id: 'flag-aro', label: 'Aro', tier: 0, kind: 'flag', stripes: ['#3DA542', '#A7D379', '#FFFFFF', '#A9A9A9', '#000000'] },
  { id: 'flag-genderfluid', label: 'Genderfluid', tier: 0, kind: 'flag', stripes: ['#FF76A4', '#FFFFFF', '#C011D7', '#000000', '#2F3CBE'] },
  { id: 'flag-agender', label: 'Agender', tier: 0, kind: 'flag', stripes: ['#000000', '#BCC4C7', '#FFFFFF', '#B7F684', '#FFFFFF', '#BCC4C7', '#000000'] },

  { id: 'glow-sunrise', label: 'Sunrise', tier: 1, kind: 'glow', from: '#FF9A56', to: '#F25C9A' },
  { id: 'glow-aurora', label: 'Aurora', tier: 1, kind: 'glow', from: '#3DDC97', to: '#4F6CFF' },
  { id: 'glow-ocean', label: 'Ocean', tier: 1, kind: 'glow', from: '#5BCEFA', to: '#2D5BE3' },
  { id: 'glow-dusk', label: 'Dusk', tier: 1, kind: 'glow', from: '#F5A9B8', to: '#7C4DFF' },
  { id: 'glow-candy', label: 'Candy', tier: 1, kind: 'glow', from: '#FF8AD8', to: '#6EC5FF' },

  { id: 'ring-rainbow', label: 'Rainbow ring', tier: 2, kind: 'ring', stripes: ['#E40303', '#FF8C00', '#FFED00', '#008026', '#004DFF', '#750787'] },
  { id: 'ring-trans', label: 'Trans ring', tier: 2, kind: 'ring', stripes: ['#5BCEFA', '#F5A9B8', '#FFFFFF', '#F5A9B8', '#5BCEFA'] },
  { id: 'ring-bi', label: 'Bi ring', tier: 2, kind: 'ring', stripes: ['#D60270', '#9B4F96', '#0038A8'] },
  { id: 'ring-pan', label: 'Pan ring', tier: 2, kind: 'ring', stripes: ['#FF218C', '#FFD800', '#21B1FF'] },
  { id: 'star-gold', label: 'Gold star', tier: 3, kind: 'star', bg: '#2A2150', fill: '#FFC83D' },
  { id: 'night-heart', label: 'Night sky', tier: 2, kind: 'night', bg: '#1B1840', fill: '#FF7AB6' },
];

export function avatarDef(id: string | null | undefined): AvatarDef | undefined {
  return AVATAR_DEFS.find((a) => a.id === id);
}

export function isUnlocked(def: AvatarDef, referrals: number): boolean {
  return referrals >= TIER_UNLOCK[def.tier];
}
