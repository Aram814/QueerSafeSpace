import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dedupe, toRow, toSql } from './transform.mjs';

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
