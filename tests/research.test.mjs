import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {parseImerg} from '../scripts/prepare-research.mjs';
import {alarmThreshold,embedded,freezeScores,replay,sampleNull,seededRandom,standardizer} from '../scripts/research-experiment.mjs';

const climateBytes=readFileSync(new URL('../data/climate.json',import.meta.url));
const climate=JSON.parse(climateBytes);
const bundle=JSON.parse(readFileSync(new URL('../data/research.json',import.meta.url)));
const rawImerg=gunzipSync(readFileSync(new URL('../data/source-records/NASA_GPM_IMERG_Nile_Delta_monthly_raw_1998_2007.csv.gz',import.meta.url)));

test('NASA IMERG raw archive reproduces the regional figure with monthly depth and complete common grid',()=>{
  assert.deepEqual(parseImerg(rawImerg),bundle.nasa);
  assert.match(bundle.nasa.archiveSha256,/^66f3a19f388bc78201e4e12782096bb79614b538ac0340b4c22367911183ce75$/);
  assert.equal(bundle.nasa.records.length,120);
  assert.equal(bundle.nasa.grid.length,176);
  assert.equal(bundle.nasa.annual.length,10);
  assert.equal(bundle.nasa.records.at(-1).date,'2007-12-01');
  const january=rawImerg.toString('utf8').split(/\r?\n/).slice(2,178).map(line=>line.split(',').map(Number));
  assert.equal(january.length,176);
  const latitudes=january.map(row=>row[1]);
  const weights=latitudes.map(lat=>Math.sin((lat+.05)*Math.PI/180)-Math.sin((lat-.05)*Math.PI/180));
  const independentlyWeighted=january.reduce((total,row,i)=>total+weights[i]*row[3],0)/weights.reduce((a,b)=>a+b);
  assert.ok(Math.abs(bundle.nasa.records[0].value-independentlyWeighted)<1e-9);
});

test('null calibration is deterministic and uses one complete-path maximum per run',()=>{
  const samples=Array.from({length:99},(_,i)=>i).reverse();
  const threshold=alarmThreshold(samples);
  assert.equal(threshold,89);
  assert.equal(samples.filter(x=>x>threshold).length,9);
  const values=Array.from({length:240},(_,i)=>i);
  const a=sampleNull(values,seededRandom(34));
  assert.deepEqual(a,sampleNull(values,seededRandom(34)));
  assert.equal(a.length,180);
  assert.ok(a.every((v,i)=>v%12===i%12));
});

test('rolling detectors ignore later observations, use past lags and skip a window with any gap',()=>{
  const raw=climate.series.AZ;
  const train=raw.slice(0,240).map(row=>row.tavg);
  const norm=standardizer(train);
  const observed=norm.transform(raw.slice(-180).map(row=>row.tavg));
  const baseline=norm.transform(train);
  assert.deepEqual(embedded([0,1,2,3,4,5,6,7]),[[6,3,0],[7,4,1]]);
  for(const method of ['classical','topology']){
    const score=freezeScores(baseline,method);
    const replayFull=replay(observed,score);
    assert.deepEqual(replay(observed.slice(0,48),score),replayFull.slice(0,2));
    const changedFuture=observed.map((v,i)=>i<48?v:v+100);
    assert.deepEqual(replay(changedFuture,score).slice(0,2),replayFull.slice(0,2));
    const gappy=observed.map((v,i)=>i===20?null:v);
    assert.deepEqual(replay(gappy,score).slice(0,3).map(w=>w.score===null),[true,true,false]);
  }
});

test('bundled research replay fingerprints the input and compares identical held-out endpoints',()=>{
  assert.equal(bundle.climateSha256,createHash('sha256').update(climateBytes).digest('hex'));
  const protocol=bundle.experiment.protocol;
  assert.deepEqual(protocol.train,[1981,2000]);
  assert.deepEqual(protocol.gap,[2001,2010]);
  assert.deepEqual(protocol.test,[2011,2025]);
  const train=climate.series.AZ.slice(0,240).map(row=>row.tavg);
  const norm=standardizer(train);
  const observed=norm.transform(climate.series.AZ.slice(-180).map(row=>row.tavg));
  for(const h of bundle.experiment.history) {
    const score=freezeScores(norm.transform(train),h.method);
    assert.deepEqual(h.windows.map(({end,score})=>({end,score})),replay(observed,score));
    assert.deepEqual(h.windows.map(w=>w.year),Array.from({length:13},(_,i)=>2013+i));
    assert.equal(h.alerts,0);
    assert.equal(h.calibrationExceedances,9);
  }
  assert.equal(bundle.experiment.scenarios.length,7);
  for(const scenario of bundle.experiment.scenarios){
    assert.equal(scenario.results.classical.n,48);
    assert.equal(scenario.results.topology.n,48);
  }
});

