#!/usr/bin/env node
// Downloads LGBTQ+ listings from OpenStreetMap for each US state and writes one SQL file per state.
//
//   node tools/osm-import/import.mjs                 all 50 states + DC
//   node tools/osm-import/import.mjs --states=FL,GA  just these
//   node tools/osm-import/import.mjs --out=some/dir  where the .sql files go (default: out/)
//
// Nothing is written to the database; review the files, then run them in the Supabase SQL Editor.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dedupe, toRow, toSql } from './transform.mjs';

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
const states = wanted.length ? wanted : Object.keys(STATES);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function query(code) {
  return `[out:json][timeout:240];
area["ISO3166-2"="US-${code}"][admin_level=4]->.s;
(
  nwr["lgbtq"~"^(primary|only|welcome|yes)$"](area.s);
  nwr["lgbtq:welcome"="yes"](area.s);
);
out center tags;`;
}

async function fetchState(code) {
  let lastError;
  for (let attempt = 0; attempt < 6; attempt++) {
    const url = MIRRORS[attempt % MIRRORS.length];
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'QueerSafeSpace-import/1.0 (QueerSafeSpace.LGBT@gmail.com)' },
        body: `data=${encodeURIComponent(query(code))}`,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
      const json = await res.json();
      if (json.remark && /error|timeout/i.test(json.remark) && !json.elements?.length) {
        throw new Error(`Overpass remark: ${json.remark}`);
      }
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
for (const code of states) {
  if (!STATES[code]) {
    console.warn(`Unknown state code ${code}, skipping`);
    continue;
  }
  console.log(`${code} ${STATES[code]}...`);
  let elements;
  try {
    elements = await fetchState(code);
  } catch (err) {
    summary.push({ state: code, error: err.message });
    continue;
  }
  const skipped = {};
  const rows = [];
  for (const el of elements) {
    const r = toRow(el, code);
    if (r.skipped) skipped[r.skipped] = (skipped[r.skipped] ?? 0) + 1;
    else rows.push(r.row);
  }
  const unique = dedupe(rows);
  if (unique.length) writeFileSync(`${outDir}/${code}.sql`, toSql(unique, STATES[code]));
  summary.push({ state: code, found: elements.length, listed: unique.length, skipped });
  console.log(`  ${elements.length} found, ${unique.length} listed`);
  await sleep(5_000); // be polite to the free public server
}

writeFileSync(`${outDir}/summary.json`, JSON.stringify(summary, null, 2));
const total = summary.reduce((n, s) => n + (s.listed ?? 0), 0);
console.log(`\nDone: ${total} places across ${summary.filter((s) => s.listed).length} states.`);
const failed = summary.filter((s) => s.error);
if (failed.length) {
  console.log(`Failed states (re-run with --states=${failed.map((s) => s.state).join(',')}): ${failed.map((s) => s.state).join(', ')}`);
  process.exitCode = 0; // partial results are still useful
}
