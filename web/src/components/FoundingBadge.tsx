import Icon from './Icon';

/** Thank-you badge for early supporters. Granted by hand in Supabase; see founding_members. */
export default function FoundingBadge({ size = 'small' }: { size?: 'small' | 'large' }) {
  return (
    <span className={`founding-badge ${size}`} title="Thank you for helping build QueerSafeSpace">
      <Icon name="heart" size={size === 'large' ? 16 : 12} />
      Founding Member
    </span>
  );
}
