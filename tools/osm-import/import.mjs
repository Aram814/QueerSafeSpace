#!/usr/bin/env node
// Downloads LGBTQ+ listings from OpenStreetMap for each US state and writes one SQL file per state.
//
//   node tools/osm-import/import.mjs                 all 50 states + DC
//   node tools/osm-import/import.mjs --states=FL,GA  just these
//   node tools/osm-import/import.mjs --out=some/dir  where the .sql files go (default: out/)
//   node tools/osm-import/import.mjs --no-geocode   skip the city/street lookup (faster)
//
// Nothing is written to the database; review the files, then run them in the Supabase SQL Editor.

import { mkdirSync, writeFileSync } from 'node:fs';
import { buildAddress, chunkRows, dedupe, toRow, toSql } from './transform.mjs';
import { GEOCODE_DELAY_MS, reverseGeocode } from './geocode.mjs';

const STATES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
  CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
  KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts',
  MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico',
  NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const wanted = (arg('states') ?? '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
const outDir = arg('out') ?? 'out';
const BUNDLE_SIZE = 250; // places per combined file, small enough to paste into the SQL Editor
const geocodeOn = !process.argv.includes('--no-geocode');
const states = wanted.length ? wanted : Object.keys(STATES);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The state outline is found by its ISO code; if that finds nothing, by its name.
const AREA = [
  (code) => `area["ISO3166-2"="US-${code}"][admin_level=4]->.s;`,
  (code) => `area["ISO3166-2"="US-${code}"]->.s;`,
  (code) => `area["name"="${STATES[code]}"]["boundary"="administrative"][admin_level=4]->.s;`,
];

function query(code, variant = 0) {
  return `[out:json][timeout:240];
${AREA[variant](code)}
(
  nwr["lgbtq"~"^(primary|only|welcome|yes)$"](area.s);
  nwr["lgbtq:welcome"="yes"](area.s);
);
out center tags;`;
}

async function fetchState(code, variant = 0) {
  let lastError;
  for (let attempt = 0; attempt < 6; attempt++) {
    const url = MIRRORS[attempt % MIRRORS.length];
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'QueerSafeSpace-import/1.0 (QueerSafeSpace.LGBT@gmail.com)' },
        body: `data=${encodeURIComponent(query(code, variant))}`,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
      const json = await res.json();
      if (json.remark && /error|timeout/i.test(json.remark) && !json.elements?.length) {
        throw new Error(`Overpass remark: ${json.remark}`);
      }
      if (!json.elements?.length) console.warn(`  ${code} query ${variant + 1}: no results${json.remark ? ` (remark: ${json.remark})` : ''}, server ${url}`);
      return json.elements ?? [];
    } catch (err) {
      lastError = err;
      console.warn(`  ${code} attempt ${attempt + 1} failed: ${err.message}`);
      await sleep(10_000 * (attempt + 1));
    }
  }
  throw lastError;
}

mkdirSync(outDir, { recursive: true });
const summary = [];
const everything = []; // every listed place, for the combined files
for (const code of states) {
  if (!STATES[code]) {
    console.warn(`Unknown state code ${code}, skipping`);
    continue;
  }
  console.log(`${code} ${STATES[code]}...`);
  let elements;
  try {
    elements = await fetchState(code);
    // A state with nothing is suspicious (Pennsylvania has real listings), so try the other ways of finding it.
    for (let v = 1; !elements.length && v < AREA.length; v++) elements = await fetchState(code, v);
  } catch (err) {
    summary.push({ state: code, error: err.message });
    continue;
  }
  const skipped = {};
  const rows = [];
  for (const el of elements) {
    const r = toRow(el, code);
    if (r.skipped) skipped[r.skipped] = (skipped[r.skipped] ?? 0) + 1;
    else rows.push({ ...r.row, needsGeocode: r.needsGeocode, tags: r.tags });
  }
  const unique = dedupe(rows);

  // Fill in the street/city that OpenStreetMap is missing, one polite request at a time.
  let looked = 0;
  if (geocodeOn) {
    for (const row of unique) {
      if (!row.needsGeocode) continue;
      const geo = await reverseGeocode(row.latitude, row.longitude);
      looked++;
      if (geo) {
        const built = buildAddress(row.tags, code, geo);
        if (built.complete) row.address = built.address;
      }
      await sleep(GEOCODE_DELAY_MS);
    }
  }
  if (unique.length) writeFileSync(`${outDir}/${code}.sql`, toSql(unique, STATES[code]));
  everything.push(...unique);
  summary.push({ state: code, found: elements.length, listed: unique.length, looked_up: looked, skipped });
  console.log(`  ${elements.length} found, ${unique.length} listed, ${looked} addresses looked up`);
  await sleep(5_000); // be polite to the free public server
}

// Combined files: a few big ones are quicker to load than one file per state.
const parts = chunkRows(everything, BUNDLE_SIZE);
parts.forEach((rows, i) => {
  const name = `all-part-${String(i + 1).padStart(2, '0')}`;
  writeFileSync(`${outDir}/${name}.sql`, toSql(rows, `all states, part ${i + 1} of ${parts.length}`));
});
if (parts.length) console.log(`Wrote ${parts.length} combined file(s) of up to ${BUNDLE_SIZE} places each.`);

writeFileSync(`${outDir}/summary.json`, JSON.stringify(summary, null, 2));
const total = summary.reduce((n, s) => n + (s.listed ?? 0), 0);
console.log(`\nDone: ${total} places across ${summary.filter((s) => s.listed).length} states.`);
const failed = summary.filter((s) => s.error);
if (failed.length) {
  console.log(`Failed states (re-run with --states=${failed.map((s) => s.state).join(',')}): ${failed.map((s) => s.state).join(', ')}`);
  process.exitCode = 0; // partial results are still useful
}
