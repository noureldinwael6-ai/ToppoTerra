import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {annualSeries, fitTrend, monthlySeries} from '../app/science.mjs';
import {bottleneckH1, ripsPersistence, runTopology, runTopologyAsync} from '../app/topology.mjs';

const months = Array.from({length: 12}, (_, i) => ({
  date: '2020-' + String(i + 1).padStart(2, '0') + '-01',
  days: new Date(Date.UTC(2020, i + 1, 0)).getUTCDate(),
  tavg: i === 1 ? 12 : 0,
  tavgAnomaly: 0,
  precip: 10,
  precipAnomaly: 2
}));

test('aggregates complete months and preserves variable-specific gaps', () => {
  assert.deepEqual(annualSeries(months, 'tavg'), [{year: 2020, value: 12 * 29 / 366}]);
  assert.deepEqual(annualSeries(months, 'precip'), [{year: 2020, value: 120}]);
  assert.deepEqual(annualSeries(months, 'precip', true), [{year: 2020, value: 24}]);
  assert.deepEqual(annualSeries(months.slice(0, 11), 'precip'), [{year: 2020, value: null}]);
  const missing = months.map((row, i) => i === 0 ? {...row, tavg: null} : row);
  assert.equal(monthlySeries(missing, 'tavg')[0].value, null);
  assert.equal(monthlySeries(missing, 'precip')[0].value, 10);
  assert.equal(annualSeries(missing, 'tavg')[0].value, null);
  assert.equal(annualSeries([...months.slice(0, 11), months[10]], 'precip')[0].value, null);
});

const trendPoints = Array.from({length: 45}, (_, i) => ({
  year: i + 1981,
  value: 8 + i * 0.08 + Math.sin(i * 0.8)
}));

test('annual OLS and calendar-lag HAC agree with an independent matrix calculation', () => {
  const expected = {
    rate: 0.783179991841602,
    low: 0.579238473515934,
    high: 0.987121510167273,
    p: 1.093855279203421e-9
  };
  const trend = fitTrend(trendPoints);
  assert.ok(Math.abs(trend.rate - expected.rate) < 1e-12);
  assert.ok(Math.abs(trend.ci[0] - expected.low) < 1e-10);
  assert.ok(Math.abs(trend.ci[1] - expected.high) < 1e-10);
  assert.ok(Math.abs(trend.p - expected.p) < 1e-15);
  assert.equal(trend.status, 'Significant trend');
  assert.equal(trend.lag, 3);
  assert.equal(trend.change, trend.slope * 44);
  assert.ok(trend.fitted.every(row => row.lo < row.value && row.hi > row.value));
  const robust = fitTrend(trendPoints, 'sen');
  assert.equal(robust.rate, robust.sen * 10);
  assert.equal(robust.p, trend.p);
  assert.ok(robust.fitted.every(row => row.lo === null && row.hi === null));
});

test('separates flat, unsupported, gappy, short and degenerate annual fits', () => {
  const flat = fitTrend(trendPoints.map(row => ({...row, value: 8})));
  assert.equal(flat.status, 'No supported directional trend');
  assert.equal(flat.mk.p, 1);
  assert.equal(flat.mk.tau, null);
  const oscillating = fitTrend(trendPoints.map((row, i) => ({...row, value: i % 2})));
  assert.equal(oscillating.status, 'No supported directional trend');
  assert.ok(oscillating.mk.p > 0.05);
  const gappy = fitTrend(trendPoints.filter((_, i) => i % 2 === 0));
  assert.equal(gappy.status, 'Insufficient data');
  assert.equal(gappy.missingYears, 22);
  assert.equal(gappy.p, null);
  assert.equal(fitTrend(trendPoints.slice(0, 19)).ci, null);
  const exact = fitTrend(trendPoints.map((row, i) => ({...row, value: 2 * i})));
  assert.equal(exact.rate, 20);
  assert.equal(exact.mk.tau, 1);
  assert.equal(exact.p, null);
  assert.throws(() => fitTrend([...trendPoints, trendPoints[0]]), /one value per year/);
});

test('a unit square has three H0 merges and one exact Rips H1 interval', () => {
  const result = ripsPersistence([[0, 0], [1, 0], [1, 1], [0, 1]]);
  assert.deepEqual(result.filter(feature => feature.dimension === 0).map(feature => feature.death), [1, 1, 1, null]);
  assert.deepEqual(result.filter(feature => feature.dimension === 1), [{
    dimension: 1, birth: 1, death: Math.SQRT2, persistence: Math.SQRT2 - 1
  }]);
  assert.equal(ripsPersistence([[0], [0], [1], [2], [3]]).filter(feature => feature.dimension === 1).length, 0);
});

test('H1 bottleneck optimally matches nearby features or sends them to the diagonal', () => {
  const first = [{dimension: 1, birth: 1, death: 3}, {dimension: 0, birth: 0, death: null}];
  const nearby = [{dimension: 1, birth: 1.25, death: 3.25}];
  const distant = [{dimension: 1, birth: 5, death: 7}];
  assert.equal(bottleneckH1(first, first), 0);
  assert.equal(bottleneckH1(first, []), 1);
  assert.equal(bottleneckH1(first, nearby), 0.25);
  assert.equal(bottleneckH1(nearby, first), 0.25);
  assert.equal(bottleneckH1(first, distant), 1);
});

const waveform = Array.from({length: 180}, (_, i) => ({
  date: (1981 + Math.floor(i / 12)) + '-' + String(i % 12 + 1).padStart(2, '0') + '-01',
  value: Math.sin(i * Math.PI / 6)
}));

test('time-delay topology reconstructs a cycle and recomputes for delay, period and joint mode', () => {
  const short = {startYear: 1981, endYear: 1986};
  const periodic = runTopology(waveform, null, short);
  assert.equal(periodic.windows.length, 2);
  assert.equal(periodic.windows[0].points.length, 30);
  assert.ok(periodic.windows[0].maxH1 > 0.5);
  assert.equal(periodic.windows[0].change, null);
  assert.ok(periodic.windows[1].change < 1e-12);
  const alternate = runTopology(waveform, null, {...short, delay: 6});
  assert.ok(alternate.windows[0].maxH1 < 1e-12);
  assert.deepEqual(runTopology(waveform, null, short), periodic);
  const joint = runTopology(waveform, waveform, short);
  assert.equal(joint.dimensions, 4);
  assert.equal(joint.windows[0].points[0].length, 4);
  assert.ok(joint.windows[0].maxH1 > periodic.windows[0].maxH1);
});

test('topology omits gaps and returns a reason for unavailable reference or windows', () => {
  const oneMissing = waveform.map((row, i) => i === 0 ? {...row, value: null} : row);
  const result = runTopology(oneMissing, waveform, {startYear: 1981, endYear: 1986});
  assert.equal(result.skipped, 1);
  assert.equal(result.windows.length, 1);
  assert.equal(result.windows[0].start, '1982-01-01');
  assert.equal(result.windows[0].change, null);
  assert.match(runTopology(waveform, null, {startYear: 1981, endYear: 1984}).reason, /five-calendar-year/);
  assert.match(runTopology(waveform.slice(0, 100)).reason, /baseline months/);
  assert.match(runTopology([]).reason, /unavailable/);
});



test('asynchronous topology falls back to the same analysis when a browser Worker is unavailable', async () => {
  const options = {startYear: 1981, endYear: 1985};
  assert.deepEqual(await runTopologyAsync(waveform, null, options), runTopology(waveform, null, options));
});



test('bundled Arizona and California climate records reproduce the demo comparisons', () => {
  const {series} = JSON.parse(readFileSync(new URL('../data/climate.json', import.meta.url), 'utf8'));
  const expected = {
    AZ: {tavg: [0.319714188, 'Significant trend'], precip: [-23.900764163, 'Significant trend']},
    CA: {tavg: [0.291035698, 'Significant trend'], precip: [-22.511963109, 'No supported directional trend']}
  };
  for (const [state, rows] of Object.entries(series)) {
    for (const [variable, [rate, status]] of Object.entries(expected[state])) {
      const annual = fitTrend(annualSeries(rows, variable));
      assert.equal(annual.n, 45);
      assert.equal(annual.status, status);
      assert.ok(Math.abs(annual.rate - rate) < 1e-8);
    }
  }
  const caPrecip = runTopology(monthlySeries(series.CA, 'precip', true), null, {startYear: 2007, endYear: 2012});
  assert.equal(caPrecip.windows.length, 2);
  assert.ok(Math.abs(caPrecip.windows[1].change - 0.206854499) < 1e-8);
});

