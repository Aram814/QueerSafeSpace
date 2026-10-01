import { useState } from 'react';
import { submitRating } from '../lib/spaces';
import { SAFETY_TAGS, type SafetyRating, type SafetyTag } from '../lib/types';
import { NEGATIVE_TAGS, tagLabel } from '../lib/ratings';
import Icon from './Icon';
import SafetyPicker from './SafetyPicker';

interface Props {
  spaceId: string;
  userId: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function RateSheet({ spaceId, userId, onClose, onSubmitted }: Props) {
  const [rating, setRating] = useState<SafetyRating | null>(null);
  const [comment, setComment] = useState('');
  const [safetyTags, setSafetyTags] = useState<SafetyTag[]>([]);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  function toggleTag(tag: SafetyTag) {
    setSafetyTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  // Ported from submitRating(): upsert on (space_id, user_id), so re-rating
  // replaces the previous vote rather than adding one.
  async function handleSubmit() {
    if (!rating) {
      setMessage({ text: 'Please select a rating.', isError: true });
      return;
    }
    setMessage({ text: 'Submitting…', isError: false });
    try {
      await submitRating({ spaceId, userId, rating, comment, safetyTags });
      onSubmitted();
    } catch (err) {
      console.error('submitRating error:', err);
      setMessage({
        text: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
        isError: true,
      });
    }
  }

  return (
    <div className="overlay center" role="dialog" aria-modal="true">
      <div className="sheet">
        <div className="sheet-header">
          <span className="sheet-title">Rate this place</span>
          <button className="close-x" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="fg">
          <label className="fl">How safe did it feel?</label>
          <SafetyPicker value={rating} onChange={setRating} />
        </div>

        <div className="fg">
          <label className="fl">What did you notice? (optional)</label>
          <div className="tags-wrap">
            {SAFETY_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`tag-btn${NEGATIVE_TAGS.has(tag) ? ' neg' : ''}${safetyTags.includes(tag) ? ' sel' : ''}`}
                onClick={() => toggleTag(tag)}
              >
                {tagLabel(tag)}
              </button>
            ))}
          </div>
        </div>

        <div className="fg">
          <label className="fl" htmlFor="rate-comment">
            Comment (optional)
          </label>
          <textarea
            id="rate-comment"
            className="fi ta"
            placeholder="Share your experience…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        <p className="rate-note">Your rating is anonymous. Your username is never shown with it.</p>

        {message && <div className={`fmsg${message.isError ? ' error' : ''}`}>{message.text}</div>}

        <button className="btn btn-primary" onClick={handleSubmit}>
          Submit rating
        </button>
      </div>
    </div>
  );
}
