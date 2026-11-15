import assert from 'node:assert/strict';
import {test} from 'node:test';
import {annualDiagnostics} from '../app/diagnostics.mjs';
import {fitTrend} from '../app/science.mjs';

const series=(values,start=2000)=>values.map((value,i)=>({year:start+i,value}));

test('rolling diagnostics require five consecutive observations and residuals use OLS',()=>{
  const source=series([1,2,3,4,5,null,7,8,9,10,11]);
  const {rolling,residuals}=annualDiagnostics(source,[],[]);
  assert.deepEqual(rolling.filter(row=>row.y!==null),[{x:2004,y:3},{x:2010,y:9}]);
  assert.equal(residuals.length,10);
  assert.ok(residuals.every(row=>Math.abs(row.y)<1e-10));
});

test('anomaly flags use a fixed, sufficient baseline with nonzero dispersion',()=>{
  const baseline=series(Array.from({length:20},(_,i)=>i%2===0?-1:1),1981);
  const selected=series([0,6,-6,null],2021);
  const result=annualDiagnostics([],baseline,selected);
  assert.equal(result.center,0);
  assert.equal(result.mad,1);
  assert.deepEqual(result.unusual,[{x:2022,y:6},{x:2023,y:-6}]);
  assert.deepEqual(annualDiagnostics([],baseline.slice(1),selected).unusual,[]);
  assert.deepEqual(annualDiagnostics([],series(Array(20).fill(0)),selected).unusual,[]);
});

test('HAC statistic uses the same evidence independently of display fit',()=>{
  const values=series(Array.from({length:30},(_,i)=>i/2+Math.cos(i)));
  const linear=fitTrend(values), sen=fitTrend(values,'sen');
  assert.ok(linear.tStatistic>0);
  assert.equal(linear.tStatistic,sen.tStatistic);
  assert.equal(linear.p,sen.p);
  assert.equal(fitTrend(values.slice(0,10)).tStatistic,null);
});

test('Betti counts respect exact square birth and death scales',async()=>{
  const {ripsPersistence}=await import('../app/topology.mjs');
  const {bettiCounts}=await import('../app/phase-space.mjs');
  const intervals=ripsPersistence([[0,0],[1,0],[1,1],[0,1]]);
  assert.deepEqual(bettiCounts(intervals,0),{components:4,loops:0});
  assert.deepEqual(bettiCounts(intervals,1),{components:1,loops:1});
  assert.deepEqual(bettiCounts(intervals,Math.SQRT2),{components:1,loops:0});
});
