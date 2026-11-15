import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bottleneckH1, ripsPersistence, runTopology} from '../app/topology.mjs';
import {cameraPoint, climateLagCorrelations, filtrationSummary, pointProvenance, ripsEdges, shiftMonth} from '../app/phase-space.mjs';

const data = JSON.parse(readFileSync(new URL('../data/climate.json',import.meta.url),'utf8'));
const variables = data.variables;
const az = data.series.AZ;
const rows = new Map(az.map(row=>[row.date,row]));
const series = variable => az.map(row=>({date:row.date,value:row[variable.anomalyKey]}));
const primary = series(variables[0]);
const secondary = series(variables[1]);
const settings = {lagCount:3, direction:'past',delay:3,startYear:2011,endYear:2015};

test('three independently referenced anchor points map to observed and normalized months in AZ',()=>{
  const result = runTopology(primary,null,settings);
  const window = result.windows[0];
  const points = [
    [0, ['2011-07-01','2011-04-01','2011-01-01']],
    [13,['2013-07-01','2013-04-01','2013-01-01']],
    [29,['2015-12-01','2015-09-01','2015-06-01']]
  ];
  const base = az.filter(row=>row.year<=2010).map(row=>row.tavgAnomaly);
  const mean = base.reduce((a,b)=>a+b,0)/base.length;
  const sd = Math.sqrt(base.reduce((a,v)=>a+(v-mean)**2,0)/(base.length-1));
  for(const [index,dates] of points) {
    const provenance=pointProvenance(window,index,result,[variables[0]],rows);
    assert.deepEqual(provenance.map(record=>record.date),dates);
    for(const [i,record] of provenance.entries()) {
      const source=rows.get(dates[i]);
      assert.equal(record.value,source.tavg);
      assert.equal(record.anomaly,source.tavgAnomaly);
      assert.ok(Math.abs(record.normalized-(source.tavgAnomaly-mean)/sd)<1e-10);
    }
  }
  assert.equal(result.dimensions,3);
  assert.equal(shiftMonth('2011-01-01',-6),'2010-07-01');
});

test('joint windows preserve state/month joins and keep a frozen reference across study ranges',()=>{
  const result = runTopology(primary,secondary,settings);
  const wider = runTopology(primary,secondary,{...settings,startYear:2010,endYear:2019});
  assert.deepEqual(result.reference,wider.reference);
  assert.equal(result.reference.start,'1981-01-01');
  const window = result.windows[0];
  assert.deepEqual(window,wider.windows.find(x=>x.start===window.start)
    && {...wider.windows.find(x=>x.start===window.start),change:null});
  assert.equal(window.referenceChange,bottleneckH1(result.reference.features,window.features));
  const records = pointProvenance(window,29,result,variables,rows);
  assert.equal(records.length,6);
  assert.equal(records[3].value,rows.get('2015-12-01').precip);
  assert.equal(records[3].unit,'mm');
  assert.equal(result.dimensions,6);
  const changed = runTopology(primary,secondary,{...settings,delay:6});
  assert.notDeepEqual(window.points,changed.windows[0].points);
});

test('positive lag relates temperature to later precipitation and does not compress calendar gaps',()=>{
  const fixture = [3,2,7,3,8,4,6,12].map((value,i,all)=>({
    date:shiftMonth('2001-01-01',i),tavgAnomaly:value,precipAnomaly:all[i-1]??0
  })).filter((_,i)=>i!==3);
  const points = climateLagCorrelations(fixture,1);
  assert.equal(points.find(p=>p.lag===1).n,5);
  assert.ok(Math.abs(points.find(p=>p.lag===1).r-1)<1e-12);
  assert.notEqual(points.find(p=>p.lag===-1).r,1);
  assert.equal(climateLagCorrelations(fixture.slice(0,2),1).at(-1).r,null);
});

test('one exact filtration scale reveals a witnessed square cycle and the next fills it',()=>{
  const points=[[0,0,0],[1,0,0],[1,1,0],[0,1,0]];
  const edges=ripsEdges(points);
  const features=ripsPersistence(points);
  const initial=filtrationSummary(edges,features,0,4);
  const cycle=filtrationSummary(edges,features,1,4);
  const filled=filtrationSummary(edges,features,Math.SQRT2,4);
  assert.deepEqual([initial.active.length,initial.triangles,initial.components,initial.loops],[0,0,4,0]);
  assert.deepEqual([cycle.active.length,cycle.triangles,cycle.components,cycle.loops],[4,0,1,1]);
  assert.deepEqual([filled.active.length,filled.triangles,filled.components,filled.loops],[6,4,1,0]);
  const basis = cameraPoint([0,0,1],{yaw:Math.PI/2,pitch:0});
  assert.ok(Math.abs(basis[0]+1)<1e-12);
});

