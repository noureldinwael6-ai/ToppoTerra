import assert from 'node:assert/strict';
import {test} from 'node:test';
import climate from '../data/climate.json' with {type:'json'};
import {trendNarrative,tReference,topologyInterpretation,structuralStatus} from '../app/result-story.mjs';
import {annualSeries,fitTrend} from '../app/science.mjs';
import {matchedMonthlySlope} from '../app/comparison.mjs';
import {teachingTrend} from '../app/learn.mjs';

test('the public story distinguishes supported, inconclusive and insufficient NOAA selections',()=>{
  const tavg=climate.variables.find(v=>v.id==='tavg'), precip=climate.variables.find(v=>v.id==='precip');
  const temperature=fitTrend(annualSeries(climate.series.AZ,'tavg'));
  const rainfall=fitTrend(annualSeries(climate.series.CA,'precip'));
  assert.match(trendNarrative(temperature,tavg,{}),/upward \(\+0\.32 °C per decade\).*test supports/);
  assert.match(trendNarrative(rainfall,precip,{}),/downward .*inconclusive/);
  const short=fitTrend(annualSeries(climate.series.AZ.slice(-48),'tavg'));
  assert.match(trendNarrative(short,tavg,{}),/20 complete/);
  assert.equal(tReference(short),null);
  const reference=tReference(temperature);
  assert.equal(reference.df,43);
  assert.equal(reference.height(reference.t),reference.height(-reference.t));
  assert.equal(reference.height(0),1);
});

test('the matched-window slope uses only its exact month subset and seasonal departures',()=>{
  const dates={start:'1981-07-01',end:'1985-06-01'};
  const archive=climate.series.AZ;
  const full=matchedMonthlySlope(archive,'tavg',dates);
  assert.equal(full.n,48);
  const changed=archive.map(row=>({...row,tavg:999,tavgAnomaly:row.date<dates.start||row.date>dates.end?999:row.tavgAnomaly}));
  assert.deepEqual(matchedMonthlySlope(changed,'tavg',dates),full);
  const one=matchedMonthlySlope(archive,'tavg',{start:dates.start,end:dates.start});
  assert.deepEqual(one,{n:1,monthlySlope:null});
});

test('topology interpretation identifies operands without claiming a climate trend',()=>{
  const current={start:'2022-01-01',end:'2025-12-01'}, reference={start:'1981-01-01',end:'1984-12-01'};
  const report=topologyInterpretation(current,reference,0,'Mean temperature');
  assert.match(report,/2022-01 to 2025-12.*1981-01 to 1984-12.*coincide/);
  assert.ok(report.includes(structuralStatus));
  assert.match(topologyInterpretation(current,reference,.1,'Mean temperature'),/diagrams differ/);
  assert.doesNotMatch(topologyInterpretation(current,reference,null,'Mean temperature'),/Structural difference measured/);
});

test('the synthetic scatter control leaves the educational trend unchanged',()=>{
  for(const noise of [0,.6,1.5]){
    const {values}=teachingTrend(noise);
    const trend=fitTrend(values.map((value,i)=>({year:2000+i,value})));
    assert.ok(Math.abs(trend.olsRate-2)<1e-12);
  }
});
