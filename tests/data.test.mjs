import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildClimate, parseSource } from '../scripts/prepare-climate.mjs';

const readSource = name => readFileSync(new URL('../data/source-records/' + name, import.meta.url), 'utf8');
const output = buildClimate(readSource);
const fixture = (identity, monthly) => identity + ' ' + monthly + (' ' + monthly).repeat(11);

test('validates source state and element codes and converts published units', () => {
  assert.deepEqual(parseSource(fixture('0020021981', '50'), 'AZ', 'tavg', 1981, 1981), Array(12).fill(10));
  assert.deepEqual(parseSource(fixture('0040011981', '1'), 'CA', 'precip', 1981, 1981), Array(12).fill(25.4));
  assert.throws(() => parseSource(fixture('0040021981', '50'), 'AZ', 'tavg', 1981, 1981), /Unexpected state/);
  assert.throws(() => parseSource(fixture('0020011981', '50'), 'AZ', 'tavg', 1981, 1981), /Unexpected state/);
});

test('rejects missing, invalid, duplicate and nonconsecutive records', () => {
  assert.throws(() => parseSource(fixture('0020021981', '-99.99'), 'AZ', 'tavg', 1981, 1981), /Invalid or missing/);
  assert.throws(() => parseSource(fixture('0020011981', '-9.99'), 'AZ', 'precip', 1981, 1981), /Invalid or missing/);
  assert.throws(() => parseSource('0020011981 0', 'AZ', 'precip', 1981, 1981), /month count/);
  assert.throws(() => parseSource(fixture('0020011982', '0'), 'AZ', 'precip', 1981, 1981), /year/);
  const line = fixture('0020011981', '0');
  assert.throws(() => parseSource(line + '\n' + line, 'AZ', 'precip', 1981, 1981), /duplicate years/);
  assert.equal(parseSource(line, 'AZ', 'precip', 1981, 1981)[0], 0);
});

test('bundles 540 distinct calendar months per state with real, distinct values', () => {
  assert.deepEqual(output.regions.map(r => r.name), ['Arizona', 'California']);
  for (const rows of Object.values(output.series)) {
    assert.equal(rows.length, 540);
    assert.equal(rows[0].date, '1981-01-01');
    assert.equal(rows.at(-1).date, '2025-12-01');
    assert.equal(new Set(rows.map(row => row.date)).size, rows.length);
    assert.equal(rows.find(row => row.date === '2000-02-01').days, 29);
    assert.equal(rows.find(row => row.date === '2001-02-01').days, 28);
  }
  assert.equal(output.series.AZ[0].precip, 18.288);
  assert.equal(output.series.CA[0].precip, 111.506);
});

test('derives independent baseline means and centered anomalies for each state and month', () => {
  for (const [state, rows] of Object.entries(output.series)) {
    for (const { month, tavg, precip } of output.normals[state]) {
      const reference = rows.filter(row => row.month === month && row.year <= 2010);
      assert.equal(reference.length, 30);
      const mean = key => reference.reduce((sum, row) => sum + row[key] / reference.length, 0);
      for (const value of [mean('tavg') - tavg, mean('precip') - precip, mean('tavgAnomaly'), mean('precipAnomaly')]) {
        assert.ok(Math.abs(value) < 1e-6);
      }
    }
  }
});

test('bundled cache exactly equals a fresh reconstruction', () => {
  const bundled = JSON.parse(readFileSync(new URL('../data/climate.json', import.meta.url), 'utf8'));
  assert.deepEqual(bundled, output);
});
