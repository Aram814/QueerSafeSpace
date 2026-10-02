import { useId } from 'react';
import { avatarDef, DEFAULT_AVATAR, type AvatarDef } from '../lib/avatars';

const HEART =
  'M32 52 C32 52 12 40 12 26 C12 19 17 14 23 14 C27 14 30 16 32 19 C34 16 37 14 41 14 C47 14 52 19 52 26 C52 40 32 52 32 52 Z';
const SPARKLE = 'M32 10 L36 28 L54 32 L36 36 L32 54 L28 36 L10 32 L28 28 Z';

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
          <path d={SPARKLE} fill="#fff" opacity="0.92" />
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
    case 'star':
      return (
        <>
          <rect width="64" height="64" fill={def.bg} />
          <path d={SPARKLE} fill={def.fill} />
          <circle cx="15" cy="15" r="2" fill="#fff" opacity="0.8" />
          <circle cx="50" cy="49" r="1.5" fill="#fff" opacity="0.8" />
        </>
      );
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
