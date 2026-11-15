import {test} from 'node:test';
import assert from 'node:assert/strict';
import {annualCoverage, annualMonthlyMaximum, pairedRate, periodDistribution} from '../app/public-figures.mjs';

test('coverage counts unique finite calendar months and wettest months need a complete year',()=>{
  const full=Array.from({length:12},(_,i)=>({year:2000,month:i+1,value:i===2?30:i}));
  const rows=[...full,{year:2001,month:2,value:8},{year:2001,month:2,value:10},{year:2001,month:5,value:null}];
  const coverage=annualCoverage(rows,1999,2001);
  assert.deepEqual(coverage,[{year:1999,valid:0},{year:2000,valid:12},{year:2001,valid:1}]);
  assert.deepEqual(annualMonthlyMaximum(rows,coverage),[{x:1999,y:null},{x:2000,y:30},{x:2001,y:null}]);
});

test('period distributions split calendar years and use linear quantiles on complete annual values',()=>{
  const data=[2,4,6,8,10,20,30,40,50,60].map((value,index)=>({year:2000+index,value}));
  data[5].value=null;
  const halves=periodDistribution(data,2000,2009);
  assert.deepEqual(halves,[
    {start:2000,end:2004,n:5,summary:[2,4,6,8,10]},
    {start:2005,end:2009,n:4,summary:[30,37.5,45,52.5,60]}
  ]);
});

test('state comparison fits paired annual differences and excludes unmatched years',()=>{
  const first=Array.from({length:30},(_,i)=>({year:1981+i,value:i+Math.sin(i)}));
  const second=first.map(({year,value},i)=>({year,value:i===15?null:value-i*.2-Math.cos(i)*.1}));
  const result=pairedRate(first,second);
  assert.equal(result.n,29);
  assert.ok(result.rate>1.98&&result.rate<2.02);
  assert.ok(result.ci[0]>1.9&&result.ci[1]<2.1);
});

