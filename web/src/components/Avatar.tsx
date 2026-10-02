import { useId } from 'react';
import { avatarDef, DEFAULT_AVATAR, type AvatarDef } from '../lib/avatars';

const HEART =
  'M32 52 C32 52 12 40 12 26 C12 19 17 14 23 14 C27 14 30 16 32 19 C34 16 37 14 41 14 C47 14 52 19 52 26 C52 40 32 52 32 52 Z';

function Stripes({ colors, y = 0, h = 64 }: { colors: string[]; y?: number; h?: number }) {
  const band = h / colors.length;
  return (
    <>
      {colors.map((c, i) => (
        <rect key={i} x="0" y={y + i * band} width="64" height={band + 0.5} fill={c} />
      ))}
    </>
  );
}

function Motif({ kind, to }: { kind: 'sun' | 'aurora' | 'waves' | 'moon' | 'dots'; to: string }) {
  switch (kind) {
    case 'sun':
      return (
        <>
          {[...Array(9)].map((_, i) => {
            const a = Math.PI + (i * Math.PI) / 8;
            return (
              <line key={i} x1={32 + Math.cos(a) * 19} y1={44 + Math.sin(a) * 19} x2={32 + Math.cos(a) * 26} y2={44 + Math.sin(a) * 26} stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
            );
          })}
          <path d="M14 44 A18 18 0 0 1 50 44 Z" fill="#fff" />
          <rect x="0" y="44" width="64" height="20" fill={to} opacity="0.55" />
        </>
      );
    case 'aurora':
      return (
        <>
          <path d="M-4 22 C14 8 26 36 40 20 S60 14 68 24 L68 34 C58 26 48 36 38 32 S14 20 -4 34 Z" fill="#fff" opacity="0.5" />
          <path d="M-4 38 C12 26 28 54 42 38 S60 32 68 42 L68 52 C58 44 48 54 38 50 S14 40 -4 52 Z" fill="#fff" opacity="0.8" />
        </>
      );
    case 'waves':
      return (
        <>
          <path d="M0 26 Q8 18 16 26 T32 26 T48 26 T64 26 V64 H0 Z" fill="#fff" opacity="0.35" />
          <path d="M0 38 Q8 30 16 38 T32 38 T48 38 T64 38 V64 H0 Z" fill="#fff" opacity="0.55" />
          <path d="M0 50 Q8 42 16 50 T32 50 T48 50 T64 50 V64 H0 Z" fill="#fff" opacity="0.85" />
        </>
      );
    case 'moon':
      return (
        <>
          <path d="M38 15 A17 17 0 1 0 49 41 A14 14 0 0 1 38 15 Z" fill="#fff" />
          <circle cx="48" cy="48" r="1.8" fill="#fff" />
          <circle cx="14" cy="16" r="1.6" fill="#fff" />
          <circle cx="50" cy="14" r="1.2" fill="#fff" />
        </>
      );
    case 'dots':
      return (
        <>
          <circle cx="32" cy="32" r="22" fill="none" stroke="#fff" strokeWidth="4" opacity="0.9" />
          <circle cx="32" cy="32" r="12" fill="none" stroke="#fff" strokeWidth="4" opacity="0.7" />
          <circle cx="32" cy="32" r="3.5" fill="#fff" />
        </>
      );
  }
}

function Art({ def, uid }: { def: AvatarDef; uid: string }) {
  switch (def.kind) {
    case 'flag':
      return <Stripes colors={def.stripes} />;
    case 'heart':
      return (
        <>
          <rect width="64" height="64" fill={def.bg} />
          <path d={HEART} fill={def.fill} />
        </>
      );
    case 'glow':
      return (
        <>
          <defs>
            <linearGradient id={uid} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={def.from} />
              <stop offset="1" stopColor={def.to} />
            </linearGradient>
          </defs>
          <rect width="64" height="64" fill={`url(#${uid})`} />
          <Motif kind={def.motif} to={def.to} />
        </>
      );
    case 'ring':
      return (
        <>
          <Stripes colors={def.stripes} />
          <circle cx="32" cy="32" r="19" fill="#fff" />
          <path d={HEART} fill={def.stripes[0]} transform="translate(8 8) scale(0.75)" />
        </>
      );
    case 'star': {
      const pts = [...Array(10)].map((_, i) => {
        const r = i % 2 === 0 ? 21 : 9;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        return [32 + Math.cos(a) * r, 33 + Math.sin(a) * r];
      });
      const bands = ['#E40303', '#FF8C00', '#FFED00', '#008026', '#004DFF', '#750787'];
      const spark = (x: number, y: number, k: number) => (
        <path d="M0 -4 L1 -1 L4 0 L1 1 L0 4 L-1 1 L-4 0 L-1 -1 Z" fill="#fff" transform={`translate(${x} ${y}) scale(${k})`} />
      );
      return (
        <>
          <defs>
            <radialGradient id={`${uid}b`} cx="0.5" cy="0.5" r="0.7">
              <stop offset="0" stopColor="#4A2D8F" />
              <stop offset="1" stopColor={def.bg} />
            </radialGradient>
            <radialGradient id={`${uid}h`}>
              <stop offset="0" stopColor="#FFD86B" stopOpacity="0.85" />
              <stop offset="1" stopColor="#FFD86B" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`${uid}s`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FFF3B0" />
              <stop offset="0.5" stopColor={def.fill} />
              <stop offset="1" stopColor="#E8920C" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" fill={`url(#${uid}b)`} />
          {bands.map((c, i) => (
            <circle key={c} cx="32" cy="32" r={31 - i * 1.6} fill="none" stroke={c} strokeWidth="1.7" />
          ))}
          <circle cx="32" cy="33" r="26" fill={`url(#${uid}h)`} />
          <polygon points={pts.map((q) => q.join(',')).join(' ')} fill={`url(#${uid}s)`} stroke="#FFF3B0" strokeWidth="1" strokeLinejoin="round" />
          {pts.map((q, i) => {
            if (i % 2 === 1) return null;
            const l = pts[(i + 9) % 10];
            const r = pts[(i + 1) % 10];
            return <polygon key={i} points={`32,33 ${l.join(',')} ${q.join(',')} ${r.join(',')}`} fill="#fff" opacity="0.14" />;
          })}
          {spark(13, 17, 1.1)}
          {spark(51, 15, 0.8)}
          {spark(52, 50, 1)}
          {spark(12, 49, 0.7)}
        </>
      );
    }
    case 'logo': {
      const shield = 'M32 3 L59 12 V33 C59 50 48 62 32 69 C16 62 5 50 5 33 V12 Z';
      return (
        <>
          <rect width="64" height="64" fill={def.bg} />
          <g transform="translate(7.2 4.2) scale(0.78)">
            <clipPath id={`${uid}k`}>
              <path d={shield} />
            </clipPath>
            <g clipPath={`url(#${uid}k)`}>
              <g transform="rotate(-14 32 36)">
                <rect x="-10" y="-4" width="90" height="16" fill="#e03c3c" />
                <rect x="-10" y="12" width="90" height="13" fill="#f58a2f" />
                <rect x="-10" y="25" width="90" height="12" fill="#f6c945" />
                <rect x="-10" y="37" width="90" height="12" fill="#3e9e5e" />
                <rect x="-10" y="49" width="90" height="12" fill="#3b8bd0" />
                <rect x="-10" y="61" width="90" height="20" fill="#8a6db8" />
              </g>
            </g>
            <path d={shield} fill="none" stroke="#163a63" strokeWidth="4.5" strokeLinejoin="round" />
            <path
              d="M32 50 C21 43 17 37 17 32 C17 27 21 24 25 24 C28 24 30.5 25.7 32 28.5 C33.5 25.7 36 24 39 24 C43 24 47 27 47 32 C47 37 43 43 32 50 Z"
              fill="#a9dcea"
              stroke="#163a63"
              strokeWidth="3.6"
              strokeLinejoin="round"
            />
          </g>
        </>
      );
    }
    case 'night':
      return (
        <>
          <rect width="64" height="64" fill={def.bg} />
          <circle cx="12" cy="14" r="1.6" fill="#fff" />
          <circle cx="52" cy="12" r="1.2" fill="#fff" />
          <circle cx="54" cy="48" r="1.6" fill="#fff" />
          <circle cx="10" cy="50" r="1.2" fill="#fff" />
          <path d={HEART} fill={def.fill} />
        </>
      );
  }
}

/**
 * A round avatar. Accepts the new ids, and still shows any old emoji avatar a member picked
 * before avatars were drawn.
 */
export default function Avatar({ id, size = 44, label }: { id?: string | null; size?: number; label?: string }) {
  const uid = useId();
  const def = avatarDef(id) ?? (id && !/^[a-z]+-[a-z]+$/.test(id) ? undefined : avatarDef(DEFAULT_AVATAR));
  if (!def) {
    return (
      <span className="avatar-emoji" style={{ width: size, height: size, fontSize: size * 0.55 }} aria-hidden={!label}>
        {id}
      </span>
    );
  }
  return (
    <svg
      className="avatar-svg"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <clipPath id={`${uid}c`}>
        <circle cx="32" cy="32" r="32" />
      </clipPath>
      <g clipPath={`url(#${uid}c)`}>
        <Art def={def} uid={`${uid}g`} />
      </g>
    </svg>
  );
}
