import type { SafetyRating } from '../lib/types';
import Icon, { type IconName } from './Icon';

const OPTIONS: { value: SafetyRating; icon: IconName; label: string; className: string }[] = [
  { value: 'safe', icon: 'check', label: 'Safe', className: 's-safe' },
  { value: 'mixed', icon: 'alert', label: 'Mixed', className: 's-mixed' },
  { value: 'not_safe', icon: 'x', label: 'Not safe', className: 's-unsafe' },
];

interface Props {
  value: SafetyRating | null;
  onChange: (value: SafetyRating) => void;
}

export default function SafetyPicker({ value, onChange }: Props) {
  return (
    <div className="safety-row" role="radiogroup" aria-label="Your rating">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          className={`safety-btn ${opt.className}${value === opt.value ? ' sel' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          <span className="ico">
            <Icon name={opt.icon} size={22} />
          </span>
          {opt.label}
        </button>
      ))}
    </div>
  );
}
