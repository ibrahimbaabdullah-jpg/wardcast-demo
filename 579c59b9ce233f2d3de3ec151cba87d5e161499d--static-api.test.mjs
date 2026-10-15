import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { routeRequest } from '../src/static-api.ts';

const bundle = JSON.parse(readFileSync(new URL('../public/data/demo.json', import.meta.url)));
const sources = JSON.parse(readFileSync(new URL('../public/data/sources.json', import.meta.url)));
const route = (path, options) => routeRequest(bundle, sources, path, options);

test('all trusts preserve every original monthly value, including null and zero', () => {
  assert.equal(route('/trusts').trusts.length, 124);
  assert.equal(bundle.history.length, 5873);
  assert.ok(bundle.history.some((row) => row.occupied === null));
  assert.ok(bundle.history.some((row) => row.occupied === 0));
  for (const trust of bundle.trusts) {
    assert.deepEqual(
      route(`/history/${trust.code}`).observations,
      bundle.history
        .filter((row) => row.code === trust.code)
        .sort((a, b) => a.month.localeCompare(b.month)),
    );
  }
});

test('every saved forecast is returned unchanged at its original cutoff', () => {
  let count = 0;
  for (const trust of bundle.trusts) {
    const { cutoffs } = route(`/cutoffs/${trust.code}`);
    assert.deepEqual(cutoffs, [...cutoffs].sort().reverse());
    for (const cutoff of cutoffs) {
      const actual = route(`/forecasts/${trust.code}?cutoff=${cutoff}`);
      const expected = bundle.forecasts
        .filter((row) => row.code === trust.code && row.cutoff === cutoff)
        .sort((a, b) => a.horizon - b.horizon);
      assert.deepEqual(actual.forecasts, expected);
      count += expected.length;
    }
    if (cutoffs.length) assert.equal(route(`/forecasts/${trust.code}`).cutoff, cutoffs[0]);
  }
  assert.equal(count, 8949);
});

test('capacity scenarios preserve predictions and correctly reverse margin bounds', () => {
  const original = JSON.stringify(bundle);
  for (const capacity of [1, 300.5, 1000]) {
    const response = route('/scenarios', {
      method: 'POST',
      body: JSON.stringify({ trust_code: 'RCF', cutoff: '2026-03-01', capacity }),
    });
    const forecasts = route('/forecasts/RCF?cutoff=2026-03-01').forecasts;
    response.forecasts.forEach((row, i) => {
      assert.equal(row.prediction, forecasts[i].prediction);
      assert.equal(row.occupancy_pct, (row.prediction / capacity) * 100);
      assert.equal(row.margin, capacity - row.prediction);
      assert.equal(row.lower_margin, capacity - row.upper);
      assert.equal(row.upper_margin, capacity - row.lower);
      assert.ok(row.lower_margin <= row.margin && row.margin <= row.upper_margin);
    });
  }
  assert.equal(JSON.stringify(bundle), original);
});

test('invalid, zero, and overflow-producing capacities are rejected', () => {
  for (const capacity of [0, -1, null, '342', true, 1e-320]) {
    assert.throws(() =>
      route('/scenarios', {
        method: 'POST',
        body: JSON.stringify({ trust_code: 'RCF', capacity }),
      }),
    );
  }
  assert.throws(() => route('/scenarios', { method: 'POST', body: '{invalid' }));
  assert.throws(() =>
    route('/scenarios', {
      method: 'POST',
      body: JSON.stringify({ trust_code: 'RCF', capacity: 10, extra: true }),
    }),
  );
});

test('unavailable forecasts, invalid dates and unknown routes fail explicitly', () => {
  const zero = bundle.trusts.find((trust) => trust.latest_available === 0);
  assert.deepEqual(route(`/cutoffs/${zero.code}`).cutoffs, []);
  assert.throws(() => route(`/forecasts/${zero.code}`), /No forecasts/);
  assert.throws(() => route('/forecasts/UNKNOWN'), /Unknown trust/);
  assert.throws(() => route('/forecasts/RCF?cutoff=2026-13-01'), /Invalid/);
  assert.throws(() => route('/forecasts/RCF?cutoff=2020-01-01'), /No forecasts/);
  assert.throws(() => route('/unknown'), /Unknown/);
});

test('evidence, provenance and model metadata match the published snapshot', () => {
  assert.deepEqual(route('/evaluation'), bundle.evaluation);
  assert.deepEqual(route('/meta'), bundle.metadata);
  assert.deepEqual(route('/sources'), sources);
  assert.equal(sources.files.length, 48);
});
