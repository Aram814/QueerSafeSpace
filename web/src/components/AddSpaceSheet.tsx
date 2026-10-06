import { useCallback, useState } from 'react';
import { looksLikeAddress, smartSearch } from '../lib/geo';
import { submitSpace } from '../lib/spaces';
import type { PlaceResult, SafetyRating } from '../lib/types';
import PlaceSearch from './PlaceSearch';
import SafetyPicker from './SafetyPicker';

/** Ported from the #add-tags chips in index.html. */
const SPACE_TAGS = [
  { tag: 'LGBTQ+-owned', label: '🏳️‍🌈 LGBTQ+-owned' },
  { tag: 'Trans-friendly', label: '🏳️‍⚧️ Trans-friendly' },
  { tag: 'Gender-neutral bathrooms', label: '🚻 Gender-neutral bathrooms' },
  { tag: 'Ally business', label: '💛 Ally business' },
  { tag: 'Youth-friendly', label: '👶 Youth-friendly' },
  { tag: 'Wheelchair accessible', label: '♿ Accessible' },
  { tag: 'BIPOC-friendly', label: '✊ BIPOC-friendly' },
  { tag: 'Medical/health services', label: '🏥 Medical/health' },
];

interface Props {
  userId: string;
  /** Prefilled when the user picked a map search result that is not in QSS yet. */
  initialPlace: PlaceResult | null;
  center: { lat: number; lon: number };
  onClose: () => void;
  onSubmitted: (space: { id: string; latitude: number | null; longitude: number | null }) => void;
}

export default function AddSpaceSheet({
  userId,
  initialPlace,
  center,
  onClose,
  onSubmitted,
}: Props) {
  const [query, setQuery] = useState(initialPlace?.name ?? '');
  const [place, setPlace] = useState<PlaceResult | null>(initialPlace);
  const [name, setName] = useState(initialPlace?.name ?? '');
  const [safety, setSafety] = useState<SafetyRating | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  // "Can't find it": the person types the street address themselves.
  const [manual, setManual] = useState(false);
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Same search as the map: any business, category or address, not just addresses.
  const search = useCallback(
    (q: string, onPartial: (r: PlaceResult[]) => void, signal: AbortSignal) =>
      smartSearch(q, center.lat, center.lon, onPartial, signal),
    [center.lat, center.lon],
  );

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  // Ported from submitSpace(): same validation order and messages.
  async function handleSubmit() {
    if (submitting) return;
    if (manual ? !address.trim() : !place) {
      setMessage({
        text: manual ? 'Enter the street address.' : 'Search and select a location.',
        isError: true,
      });
      return;
    }
    if (!name.trim()) {
      setMessage({ text: 'Enter a name for the space.', isError: true });
      return;
    }
    if (!safety) {
      setMessage({ text: 'Select a safety rating.', isError: true });
      return;
    }
    if (manual && !looksLikeAddress(address)) {
      setMessage({
        text: 'Enter the street address with the city and state, like 123 Main St, Dunnellon, FL.',
        isError: true,
      });
      return;
    }

    setSubmitting(true);
    setMessage({ text: manual ? 'Finding that address…' : 'Submitting…', isError: false });
    try {
      let target: { address: string; lat: number; lon: number };
      if (manual) {
        // The pin goes where the address geocodes to; the address shown is what the person typed.
        const typed = address.trim().replace(/\s+/g, ' ');
        const found = (await smartSearch(typed, center.lat, center.lon))[0];
        if (!found) {
          setMessage({
            text: "We couldn't find that address on the map. Check the spelling and include the city and state.",
            isError: true,
          });
          setSubmitting(false);
          return;
        }
        target = { address: typed, lat: found.lat, lon: found.lon };
      } else {
        const picked = place as PlaceResult;
        target = {
          address: picked.display_name || picked.address || picked.name,
          lat: picked.lat,
          lon: picked.lon,
        };
      }
      setMessage({ text: 'Submitting…', isError: false });
      const space = await submitSpace({
        name: name.trim(),
        address: target.address,
        latitude: target.lat,
        longitude: target.lon,
        notes: notes.trim(),
        tags,
        userId,
        safetyRating: safety,
      });
      onSubmitted(space);
    } catch (err) {
      console.error('submitSpace error:', err);
      const raw = err instanceof Error ? err.message : '';
      setMessage({
        text: /duplicate|already exists|address_key/i.test(raw)
          ? 'A place with that address is already on the map. Try searching for it by its address.'
          : raw || 'Something went wrong. Please try again.',
        isError: true,
      });
      setSubmitting(false);
    }
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="sheet">
        <div className="sheet-header">
          <span className="sheet-title">📍 Add a Safe Space</span>
          <button className="close-x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="fg">
          <label className="fl">{manual ? 'Enter the address yourself' : 'Search for a location'}</label>
          {manual ? (
            <input
              className="fi"
              placeholder="Street, city, state, e.g. 123 Main St, Dunnellon, FL"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              autoComplete="street-address"
            />
          ) : (
            <PlaceSearch
              placeholder="Search address or place name…"
              value={query}
              onValueChange={setQuery}
              search={search}
              debounceMs={380}
              onPick={(result) => {
                setPlace(result);
                setQuery(result.name);
                setName((prev) => prev || result.name || result.display_name.split(',')[0]);
              }}
            />
          )}
          {!manual && place && (
            <div className="sel-loc">📍 {place.display_name || place.address || place.name}</div>
          )}
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setManual((m) => !m);
              setMessage(null);
            }}
          >
            {manual ? 'Search for it instead' : "Can't find it? Enter it yourself"}
          </button>
        </div>

        <div className="fg">
          <label className="fl" htmlFor="add-name">
            Space Name
          </label>
          <input
            id="add-name"
            className="fi"
            placeholder="e.g. Rainbow Café, City Library…"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="fg">
          <label className="fl">How safe is this space?</label>
          <SafetyPicker value={safety} onChange={setSafety} />
        </div>

        <div className="fg">
          <label className="fl">Tags (select all that apply)</label>
          <div className="tags-wrap">
            {SPACE_TAGS.map(({ tag, label }) => (
              <button
                key={tag}
                type="button"
                className={`tag-btn${tags.includes(tag) ? ' sel' : ''}`}
                onClick={() => toggleTag(tag)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="fg">
          <label className="fl" htmlFor="add-desc">
            Additional notes (optional)
          </label>
          <textarea
            id="add-desc"
            className="fi ta"
            placeholder="Any extra info that might help others…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {message && <div className={`fmsg${message.isError ? ' error' : ''}`}>{message.text}</div>}

        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
          Submit Space 🏳️‍🌈
        </button>
      </div>
    </div>
  );
}
