import { useEffect, useRef, useState } from 'react';
import { formatDistance } from '../lib/geo';
import type { PlaceResult } from '../lib/types';

interface Props {
  placeholder: string;
  value: string;
  onValueChange: (value: string) => void;
  /**
   * Runs debounced; rejecting renders the failure state. `onPartial` may be called
   * any number of times with interim results while slower sources are still pending.
   */
  search: (query: string, onPartial: (results: PlaceResult[]) => void) => Promise<PlaceResult[]>;
  onPick: (result: PlaceResult) => void;
  /** Rendered as a badge on a result already present in QueerSafeSpace. */
  isKnown?: (result: PlaceResult) => boolean;
  debounceMs?: number;
  minLength?: number;
}

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'failed' }
  | { kind: 'results'; results: PlaceResult[] };

/**
 * Ported from attachSearchListener() / debGeo(): debounced querying with
 * token-based stale-response cancellation, so only the newest query renders.
 */
export default function PlaceSearch({
  placeholder,
  value,
  onValueChange,
  search,
  onPick,
  isKnown,
  debounceMs = 300,
  minLength = 2,
}: Props) {
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [open, setOpen] = useState(false);
  const tokenRef = useRef(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = value.trim();
    if (query.length < minLength) {
      setOpen(false);
      setState({ kind: 'idle' });
      return;
    }

    setOpen(true);
    setState({ kind: 'loading' });
    const token = ++tokenRef.current;

    const timer = setTimeout(async () => {
      try {
        const results = await search(query, (partial) => {
          if (token === tokenRef.current && partial.length) {
            setState({ kind: 'results', results: partial });
          }
        });
        if (token !== tokenRef.current) return;
        setState({ kind: 'results', results });
      } catch {
        if (token !== tokenRef.current) return;
        setState({ kind: 'failed' });
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [value, search, debounceMs, minLength]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  return (
    <div className="search-wrap" ref={wrapRef}>
      <input
        type="text"
        className="fi"
        placeholder={placeholder}
        autoComplete="off"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      />

      {open && (
        <div className="search-dropdown open">
          {state.kind === 'loading' && <div className="geo-item loading">Searching nearby…</div>}
          {state.kind === 'failed' && (
            <div className="geo-item loading">Search failed — try again</div>
          )}
          {state.kind === 'results' && state.results.length === 0 && (
            <div className="geo-item loading">No places found nearby</div>
          )}
          {state.kind === 'results' &&
            state.results.map((r, i) => (
              <div
                key={`${r.lat},${r.lon},${i}`}
                className="geo-item"
                onClick={() => {
                  setOpen(false);
                  onPick(r);
                }}
              >
                <div className="geo-name">{r.name}</div>
                <div className="geo-addr">
                  <span>{r.address}</span>
                  {isKnown?.(r) && <span className="geo-in-qss">✅ In QSS</span>}
                  {r.dist != null && <span className="geo-dist">{formatDistance(r.dist)}</span>}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
