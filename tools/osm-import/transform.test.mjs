import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildAddress, chunkRows, dedupe, toRow, toSql } from './transform.mjs';

const els = JSON.parse(readFileSync(new URL('./fixtures/florida-sample.json', import.meta.url)));
const results = els.map((e) => ({ e, r: toRow(e, 'FL') }));
const reason = (name) => results.find((x) => x.e.tags.name === name)?.r.skipped;

test('leaves out private, adult, unsourced-chain, unnamed and non-place elements', () => {
  assert.equal(reason('The Woodshed Orlando'), 'private');
  assert.equal(reason('Cypress Cove Nudist Resort'), 'adult venue');
  assert.equal(reason('Bonefish Grill'), 'chain without a source');
  assert.equal(reason('Unlabelled building'), 'not a place');
  assert.equal(results.find((x) => x.e.id === 2).r.skipped, 'no name');
});

test('keeps a chain location that has a recorded source, once', () => {
  const rows = dedupe(results.filter((x) => x.r.row).map((x) => x.r.row));
  assert.equal(rows.filter((r) => r.name === '7-Eleven').length, 1);
  assert.equal(rows.length, 9);
});

test('maps categories and builds addresses', () => {
  const by = Object.fromEntries(results.filter((x) => x.r.row).map((x) => [x.e.tags.name, x.r.row]));
  assert.equal(by['Disco Pony Nightclub'].category, 'bar');
  assert.equal(by['Disco Pony Nightclub'].address, '1901 North 15th Street, Tampa, FL 33605');
  assert.equal(by['Metro Wellness and Community Centers'].category, 'community');
  assert.equal(by['The Center'].category, 'community');
  assert.equal(by['The Center'].address, 'The Center, FL');
  assert.equal(by['Ravens & Rockers'].category, 'retail');
  assert.equal(by['Enigma'].address, '1110 Central Avenue, FL');
});

test('escapes quotes in the SQL', () => {
  const rows = dedupe(results.filter((x) => x.r.row).map((x) => x.r.row));
  const sql = toSql(rows, 'Florida');
  assert.match(sql, /'Bradley''s on 7th'/);
  assert.match(sql, /on conflict do nothing;/);
});

test('fills missing city and street from a reverse geocode', () => {
  const geo = { house_number: '100', road: 'Main Street', city: 'Ocala', postcode: '34471-1234' };
  assert.deepEqual(buildAddress({ name: 'Cafe' }, 'FL', geo), {
    address: '100 Main Street, Ocala, FL 34471',
    complete: true,
  });
  // No house number: the name leads so two places on one road never share an address.
  assert.equal(
    buildAddress({ name: 'Hunters Club' }, 'FL', { road: 'Wilton Drive', town: 'Wilton Manors' }).address,
    'Hunters Club, Wilton Drive, Wilton Manors, FL',
  );
  // OpenStreetMap's own tags win over the lookup.
  assert.equal(
    buildAddress({ name: 'X', 'addr:housenumber': '5', 'addr:street': 'Elm St' }, 'FL', { city: 'Tampa' }).address,
    '5 Elm St, Tampa, FL',
  );
  // Nothing found: incomplete, so the caller keeps the plain fallback.
  assert.equal(buildAddress({ name: 'Hunters Club' }, 'FL').complete, false);
});

test('marks places that need a lookup', () => {
  const enigma = results.find((x) => x.e.tags.name === 'Enigma').r;
  const disco = results.find((x) => x.e.tags.name === 'Disco Pony Nightclub').r;
  assert.equal(enigma.needsGeocode, true);
  assert.equal(disco.needsGeocode, false);
});

test('splits places into combined files without losing or reordering any', () => {
  const rows = Array.from({ length: 7 }, (_, i) => i);
  const parts = chunkRows(rows, 3);
  assert.deepEqual(parts.map((p) => p.length), [3, 3, 1]);
  assert.deepEqual(parts.flat(), rows);
  assert.deepEqual(chunkRows([], 3), []);
});
