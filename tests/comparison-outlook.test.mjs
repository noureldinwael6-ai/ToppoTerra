import test from 'node:test';
import assert from 'node:assert/strict';
import climate from '../data/climate.json' with {type:'json'};
import {annualSeries,monthlySeries,fitTrend} from '../app/science.mjs';
import {runTopology,bottleneckH1} from '../app/topology.mjs';
import {comparisonEvidence} from '../app/comparison.mjs';
import {annualPredictors,buildOutlook,hindcastAt} from '../app/outlook-model.mjs';

const rows=climate.series.AZ;
const months=monthlySeries(rows,'tavg',true);
const window={windowSize:48,step:12,startYear:2000,endYear:2005,lagCount:3,direction:'past'};

test('comparison never presents a conventional slope or p as native topology',()=>{
  const trend=fitTrend(annualSeries(rows,'tavg'));
  const topo=runTopology(months,null,window);
  const selected=comparisonEvidence({trend},topo,1);
  const without=comparisonEvidence({trend},null,1);
  assert.deepEqual(selected.traditional,without.traditional);
  assert.equal(selected.independentSlope,null);
  assert.equal(selected.independentTrendP,null);
  assert.equal(selected.structuralP,null);
  assert.ok(Math.abs(trend.olsRate-.3197141883289685)<1e-12);
  assert.equal(selected.native.h1Distance,bottleneckH1(topo.reference.features,topo.windows[1].features));
  assert.equal(without.native,null);
});

test('48-month trailing windows overlap, label actual end month and drop gaps',()=>{
  assert.deepEqual(runTopology(months,null,window).windows.map(w=>[w.start,w.end]),
    [['2000-01-01','2003-12-01'],['2001-01-01','2004-12-01'],['2002-01-01','2005-12-01']]);
  const semiannual=runTopology(months,null,{...window,step:6});
  assert.equal(semiannual.windows[1].end,'2004-06-01');
  assert.equal(semiannual.windows.length,5);
  assert.equal(semiannual.windows[1].dates.at(-1),'2004-06-01');
  const gaps=runTopology(months.filter(m=>m.date!=='2000-12-01'),null,window);
  assert.equal(gaps.skipped,1);
  assert.equal(gaps.windows[0].start,'2001-01-01');
  const short=runTopology(months,null,{...window,windowSize:24,delay:6});
  assert.equal(new Set(short.windows[0].dates).size,12);
});

test('rolling models and H1 predictors ignore all observations after issue',()=>{
  const issue=2018;
  function evaluate(input){
    const annual=annualSeries(input,'tavg');
    return hindcastAt(annualPredictors(input),annual,issue,2);
  }
  const replay=evaluate(rows);
  assert.equal(replay.cutoff,2014);
  assert.deepEqual(replay,evaluate(rows.filter(r=>r.year<=issue)));
  assert.deepEqual(replay,evaluate(rows.map(r=>r.year>issue?{...r,tavg:r.tavg+60}:r)));
  assert.notEqual(replay.topology,replay.conventional);
});

test('historical replay uses prior ranges and gates post-2026 estimates by coverage',()=>{
  const az=buildOutlook(rows);
  const ca=buildOutlook(climate.series.CA);
  assert.equal(az.lastDate,'2025-12-01');
  assert.deepEqual(az.horizons.map(h=>h.projection.target),[2027,2028]);
  assert.deepEqual(ca.horizons.map(h=>h.projection),[null,null]);
  assert.deepEqual(az.horizons.map(h=>h.replay.length),[13,10]);
  const two=az.horizons[0].metrics;
  assert.ok(two.topology.mae>two.conventional.mae);
  assert.ok(ca.horizons[0].metrics.persistence.mae<ca.horizons[0].metrics.topology.mae);
});

