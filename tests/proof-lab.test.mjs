import test from 'node:test';
import assert from 'node:assert/strict';
import data from '../data/climate.json' with {type:'json'};
import {isolateObservation,reconstruct,reconstructionMetrics,seededMasks,monthNumber} from '../app/reconstruction-engine.mjs';
const rows=data.series.AZ, dates=['2019-01-01','2019-02-01','2019-03-01'];
const run=(archive,mode)=>reconstruct(isolateObservation(archive,'tavg',dates).values,dates,mode);
test('prospective predictions, ranking and geometry ignore masked and later values',()=>{
  const expected=run(rows,'prospective');
  assert.deepEqual(run(rows.map(r=>r.date>=dates[0]?{...r,tavg:r.tavg+100}:r),'prospective'),expected);
  for(const result of expected){
    const shape=result.estimates.ph.geometry;
    assert.ok(shape.points.length>=4);
    for(const date of shape.dates)for(let lag=0;lag<3;lag++){
      assert.ok(monthNumber(date)-lag<monthNumber(result.date));
      assert.ok(dates.every(hidden=>monthNumber(hidden)!==monthNumber(date)-lag));
    }
  }
});
test('retrospective predictions ignore masked truth and materialize H1 ablation',()=>{
  const expected=run(rows,'retrospective');
  assert.deepEqual(run(rows.map(r=>dates.includes(r.date)?{...r,tavg:-999}:r),'retrospective'),expected);
  assert.ok(expected.some(r=>r.estimates.ph.value!==r.estimates.geometry.value));
  const metrics=reconstructionMetrics(expected,isolateObservation(rows,'tavg',dates).truth);
  assert.ok(metrics.every(m=>m.n===3&&m.mae>=0&&m.rmse>=m.mae));
});
test('calendar blocks roll across years and stay in period without mutating data',()=>{
  const mask=seededMasks(rows,2019,2020,'2019-12-01',3,'gap',0);
  assert.deepEqual(mask,['2019-12-01','2020-01-01','2020-02-01']);
  assert.throws(()=>seededMasks(rows,2019,2020,'2020-12-01',3,'gap',0),/extends/);
  const snapshot=JSON.stringify(rows);
  assert.equal(isolateObservation(rows,'tavg',mask).values.filter(r=>r.status==='experimentally_masked').length,3);
  assert.equal(JSON.stringify(rows),snapshot);
});
