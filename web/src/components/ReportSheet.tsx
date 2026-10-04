import { useState } from 'react';
import { REPORT_REASONS, reportComment, type ReportReason } from '../lib/moderation';
import Icon from './Icon';

interface Props {
  ratingId: string;
  onClose: () => void;
  onSent: () => void;
}

/** Lets a signed-in member tell us a comment should be looked at. Reports are private. */
export default function ReportSheet({ ratingId, onClose, onSent }: Props) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    if (!reason) {
      setMessage('Please choose a reason.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await reportComment(ratingId, reason, note);
      onSent();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="overlay center" role="dialog" aria-modal="true">
      <div className="sheet">
        <div className="sheet-header">
          <span className="sheet-title">Report this comment</span>
          <button className="close-x" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="fg" role="radiogroup" aria-label="Reason">
          <span className="fl">What is the problem?</span>
          {REPORT_REASONS.map((r) => (
            <label key={r.value} className="chk-row">
              <input type="radio" name="report-reason" checked={reason === r.value} onChange={() => setReason(r.value)} />
              <span>{r.label}</span>
            </label>
          ))}
        </div>

        <div className="fg">
          <label className="fl" htmlFor="report-note">
            Anything we should know? (optional)
          </label>
          <textarea
            id="report-note"
            className="fi ta"
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <p className="rate-note">Reports are private. The person who wrote the comment is never told who reported it.</p>

        {message && <div className="fmsg error">{message}</div>}

        <button className="btn btn-primary" disabled={busy} onClick={() => void submit()}>
          Send report
        </button>
      </div>
    </div>
  );
}
