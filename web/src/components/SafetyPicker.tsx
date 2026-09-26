import type { SafetyRating } from '../lib/types';

const OPTIONS: { value: SafetyRating; icon: string; label: string; className: string }[] = [
  { value: 'safe', icon: '✅', label: 'Safe', className: 's-safe' },
  { value: 'mixed', icon: '⚠️', label: 'Mixed', className: 's-mixed' },
  { value: 'not_safe', icon: '❌', label: 'Not Safe', className: 's-unsafe' },
];

interface Props {
  value: SafetyRating | null;
  onChange: (value: SafetyRating) => void;
}

export default function SafetyPicker({ value, onChange }: Props) {
  return (
    <div className="safety-row">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`safety-btn ${opt.className}${value === opt.value ? ' sel' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          <span className="ico">{opt.icon}</span>
          {opt.label}
        </button>
      ))}
    </div>
  );
}
