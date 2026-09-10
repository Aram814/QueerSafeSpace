/**
 * tests/map.test.js
 *
 * Plain Node.js tests for the pure utility functions extracted from index.html.
 * Run with:  node tests/map.test.js
 *
 * These tests cover the three bug areas reported:
 *   1. renderMarkers — null-map guard must come BEFORE map.removeLayer()
 *   2. debGeo / smartSearch — must not call map.getCenter() when map is null
 *   3. nominatimBiased — name field must never be undefined/null
 *   4. overallRating — correct majority-vote logic
 *   5. getDistKm — haversine sanity check
 *   6. formatOsmAddress — address assembly
 *   7. esc — XSS-escape helper
 */

'use strict';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅  ${label}`);
    passed++;
  } else {
    console.error(`  ❌  FAIL: ${label}`);
    failed++;
  }
}

function assertThrows(fn, label) {
  try {
    fn();
    console.error(`  ❌  FAIL (expected throw): ${label}`);
    failed++;
  } catch (_) {
    console.log(`  ✅  ${label}`);
    passed++;
  }
}

// ─── Inline the pure functions from index.html ───────────────────────────────

function overallRating(ratings) {
  if (!ratings || !ratings.length) return 'unknown';
  const c = { safe: 0, mixed: 0, not_safe: 0 };
  ratings.forEach(r => { if (c[r.rating] !== undefined) c[r.rating]++; });
  const max = Math.max(c.safe, c.mixed, c.not_safe);
  if (c.safe === max && c.safe > 0)         return 'safe';
  if (c.not_safe === max && c.not_safe > 0) return 'not_safe';
  if (c.mixed > 0)                          return 'mixed';
  return 'unknown';
}

function getDistKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatOsmAddress(tags) {
  const p = [];
  if (tags['addr:housenumber'] && tags['addr:street'])
    p.push(tags['addr:housenumber'] + ' ' + tags['addr:street']);
  else if (tags['addr:street']) p.push(tags['addr:street']);
  if (tags['addr:city'])  p.push(tags['addr:city']);
  if (tags['addr:state']) p.push(tags['addr:state']);
  return p.join(', ') || tags.amenity || tags.shop || tags.leisure || tags.tourism || '';
}

function esc(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Simulates the FIXED renderMarkers guard: null check BEFORE map.removeLayer().
 * Before the fix the guard came after the removeLayer call, causing a crash.
 */
function renderMarkersFixed(map, markers, spaces) {
  if (!map) return 'early-return';           // FIX: guard is first
  Object.values(markers).forEach(m => map.removeLayer(m));
  return 'rendered';
}

/**
 * Simulates the BROKEN renderMarkers guard (pre-fix) for regression reference.
 */
function renderMarkersBroken(map, markers, spaces) {
  Object.values(markers).forEach(m => map.removeLayer(m)); // crashes when map is null
  if (!map) return 'early-return';
  return 'rendered';
}

/**
 * Simulates the FIXED debGeo / smartSearch center resolution.
 * Before the fix: map.getCenter() was called unconditionally.
 */
function resolveCenter(map, userLat, userLon) {
  const center = map ? map.getCenter() : null;
  const lat = userLat || (center ? center.lat : 39.5);
  const lon = userLon || (center ? center.lng : -98.35);
  return { lat, lon };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

console.log('\n=== Bug fix: renderMarkers null-map guard ===');

assert(
  renderMarkersFixed(null, {}, []) === 'early-return',
  'renderMarkers returns early when map is null (no crash)'
);

assert(
  renderMarkersFixed(null, {}, []) !== 'rendered',
  'renderMarkers does NOT attempt to render when map is null'
);

assertThrows(
  () => renderMarkersBroken(null, { a: { removeLayer: undefined } }, []),
  'OLD (broken) renderMarkers throws when map is null — confirms the bug existed'
);

const fakeMap = { removeLayer: () => {} };
assert(
  renderMarkersFixed(fakeMap, {}, []) === 'rendered',
  'renderMarkers proceeds normally when map is valid'
);

console.log('\n=== Bug fix: debGeo / smartSearch safe center resolution ===');

assert(
  resolveCenter(null, null, null).lat === 39.5,
  'Falls back to US center lat (39.5) when map is null and no userLat'
);
assert(
  resolveCenter(null, null, null).lon === -98.35,
  'Falls back to US center lon (-98.35) when map is null and no userLon'
);
assert(
  resolveCenter(null, 51.5, -0.12).lat === 51.5,
  'Uses userLat when map is null'
);
assert(
  resolveCenter(null, 51.5, -0.12).lon === -0.12,
  'Uses userLon when map is null'
);
const fakeMapWithCenter = { getCenter: () => ({ lat: 40.7, lng: -74.0 }) };
assert(
  resolveCenter(fakeMapWithCenter, null, null).lat === 40.7,
  'Uses map.getCenter().lat when userLat is null but map exists'
);
assert(
  resolveCenter(fakeMapWithCenter, null, null).lon === -74.0,
  'Uses map.getCenter().lng when userLon is null but map exists'
);

console.log('\n=== overallRating ===');

assert(overallRating([]) === 'unknown', 'Empty ratings → unknown');
assert(overallRating(null) === 'unknown', 'Null ratings → unknown');
assert(overallRating([{ rating: 'safe' }, { rating: 'safe' }]) === 'safe', 'Majority safe → safe');
assert(overallRating([{ rating: 'not_safe' }, { rating: 'not_safe' }]) === 'not_safe', 'Majority not_safe → not_safe');
assert(overallRating([{ rating: 'mixed' }]) === 'mixed', 'Single mixed → mixed');
assert(
  overallRating([{ rating: 'safe' }, { rating: 'not_safe' }, { rating: 'mixed' }]) === 'safe',
  'Three-way tie: safe wins (checked first)'
);
assert(
  overallRating([{ rating: 'safe' }, { rating: 'not_safe' }]) === 'safe',
  'safe and not_safe tied: safe wins (checked first)'
);
assert(
  overallRating([{ rating: 'unknown_val' }]) === 'unknown',
  'Unrecognised rating value → unknown'
);

console.log('\n=== getDistKm ===');

const samePoint = getDistKm(51.5, -0.12, 51.5, -0.12);
assert(samePoint < 0.001, 'Same point → ~0 km');

const londonToNY = getDistKm(51.5074, -0.1278, 40.7128, -74.006);
assert(londonToNY > 5500 && londonToNY < 5600, 'London→New York ≈ 5570 km');

const shortDist = getDistKm(51.5, -0.12, 51.51, -0.12);
assert(shortDist > 1.0 && shortDist < 1.2, '0.01° lat difference ≈ 1.1 km');

console.log('\n=== formatOsmAddress ===');

assert(
  formatOsmAddress({ 'addr:housenumber': '10', 'addr:street': 'Downing St', 'addr:city': 'London' }) === '10 Downing St, London',
  'Full address with house number'
);
assert(
  formatOsmAddress({ 'addr:street': 'Main St', 'addr:state': 'CA' }) === 'Main St, CA',
  'Street + state, no house number'
);
assert(
  formatOsmAddress({ amenity: 'cafe' }) === 'cafe',
  'Falls back to amenity tag when no address fields'
);
assert(
  formatOsmAddress({}) === '',
  'Empty tags → empty string'
);

console.log('\n=== esc (XSS escape) ===');

assert(esc('<script>') === '&lt;script&gt;', 'Escapes < and >');
assert(esc('"hello"') === '&quot;hello&quot;', 'Escapes double quotes');
assert(esc('a & b') === 'a &amp; b', 'Escapes ampersand');
assert(esc('') === '', 'Empty string → empty string');
assert(esc(null) === '', 'null → empty string');
assert(esc(undefined) === '', 'undefined → empty string');
assert(esc(42) === '42', 'Number coerced to string');

console.log('\n=== nominatimBiased result mapping (name fallback) ===');

// Simulate the fixed mapping logic: r.name || (r.display_name||'').split(',')[0]
function mapNominatimResult(r, lat, lon) {
  return {
    name: r.name || (r.display_name || '').split(',')[0],
    address: r.display_name,
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
    display_name: r.display_name,
  };
}

const withName = mapNominatimResult({ name: 'Rainbow Café', display_name: 'Rainbow Café, London', lat: '51.5', lon: '-0.1' });
assert(withName.name === 'Rainbow Café', 'Uses r.name when present');

const withoutName = mapNominatimResult({ name: '', display_name: 'Some Street, London, UK', lat: '51.5', lon: '-0.1' });
assert(withoutName.name === 'Some Street', 'Falls back to first segment of display_name when name is empty');

const noDisplayName = mapNominatimResult({ name: '', display_name: '', lat: '51.5', lon: '-0.1' });
assert(noDisplayName.name === '', 'Empty string when both name and display_name are empty (no crash)');

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('Some tests FAILED.');
  process.exit(1);
} else {
  console.log('All tests passed ✅');
}
