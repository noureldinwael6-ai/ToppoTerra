import {annualSeries} from './science.mjs';
import {ripsPersistence} from './topology.mjs';

export const outlookVersion='annual-temperature-ridge-h1-v1';
const mean=values=>values.reduce((a,b)=>a+b,0)/values.length;

export function annualPredictors(rows) {
  const byYear=new Map(annualSeries(rows,'tavg').map(r=>[r.year,r.value]));
  const byMonth=new Map(rows.map(r=>[r.year*12+r.month-1,r.tavg]));
  return [...byYear].flatMap(([year,value])=>{
    const recent=Array.from({length:5},(_,i)=>byYear.get(year-i));
    const monthly=Array.from({length:48},(_,i)=>byMonth.get((year-3)*12+i));
    if(!recent.every(Number.isFinite)||!monthly.every(Number.isFinite))return [];
    const calendar=Array.from({length:12},(_,m)=>mean([0,1,2,3].map(i=>monthly[12*i+m])));
    const residual=monthly.map((v,i)=>v-calendar[i%12]);
    const sd=Math.sqrt(mean(residual.map(v=>v*v)));
    const points=Array.from({length:22},(_,i)=>{
      const j=6+Math.round(i*41/21);
      return [j,j-3,j-6].map(k=>sd?residual[k]/sd:0);
    });
    const h1=Math.max(0,...ripsPersistence(points).filter(f=>f.dimension===1).map(f=>f.persistence));
    return [{year,value,base:[year,mean(recent),value],h1}];
  });
}

function solve(matrix,target) {
  const a=matrix.map((row,i)=>[...row,target[i]]);
  for(let j=0;j<a.length;j++){
    const pivot=a.slice(j).reduce((best,row,i)=>Math.abs(row[j])>Math.abs(a[best][j])?i+j:best,j);
    [a[j],a[pivot]]=[a[pivot],a[j]];
    const diagonal=a[j][j];
    a[j]=a[j].map(v=>v/diagonal);
    for(let i=0;i<a.length;i++)if(i!==j){
      const coefficient=a[i][j];
      a[i]=a[i].map((v,k)=>v-coefficient*a[j][k]);
    }
  }
  return a.map(row=>row.at(-1));
}

function predict(train,query,enhance){
  const features=r=>enhance?[...r.base,r.h1]:r.base;
  const source=train.map(r=>features(r.origin));
  const center=features(query).map((_,i)=>mean(source.map(r=>r[i])));
  const scale=center.map((v,i)=>Math.sqrt(mean(source.map(r=>(r[i]-v)**2)))||1);
  const standard=row=>[1,...row.map((v,i)=>(v-center[i])/scale[i])];
  const x=source.map(standard);
  const dimensions=x[0].length;
  const matrix=Array.from({length:dimensions},(_,i)=>Array.from({length:dimensions},(_,j)=>
    x.reduce((s,r)=>s+r[i]*r[j],0)+(i===j&&i>0?4:0)));
  const rhs=Array.from({length:dimensions},(_,i)=>x.reduce((s,r,k)=>s+r[i]*train[k].actual,0));
  const beta=solve(matrix,rhs);
  return standard(features(query)).reduce((s,v,i)=>s+v*beta[i],0);
}

export function hindcastAt(features,annual,year,horizon) {
  const query=features.find(r=>r.year===year);
  if(!query)return null;
  const values=new Map(annual.map(r=>[r.year,r.value]));
  // Keep the issue-year's four-year topology context out of the labelled training targets.
  const cutoff=year-4;
  const train=[];
  for(const origin of features){
    if(origin.year+horizon>cutoff)break;
    const actual=values.get(origin.year+horizon);
    if(Number.isFinite(actual))train.push({origin,actual});
  }
  if(train.length<12)return null;
  return {issue:year,target:year+horizon,cutoff,n:train.length,h1:query.h1,horizon,
    conventional:predict(train,query,false),topology:predict(train,query,true),persistence:query.value};
}

const arms=['conventional','topology','persistence'];
const quality=(rows,method)=>{
  const errors=rows.map(r=>r[method]-r.actual);
  const bounded=rows.filter(r=>Number.isFinite(r.bands[method]));
  return {mae:mean(errors.map(Math.abs)),rmse:Math.sqrt(mean(errors.map(e=>e*e))),bias:mean(errors),
    coverage:bounded.length?mean(bounded.map(r=>Number(Math.abs(r[method]-r.actual)<=r.bands[method]))):null,
    bounded:bounded.length};
};

function bounds(prior,origin){
  const admissible=prior.filter(r=>r.target<=origin);
  return Object.fromEntries(arms.map(method=>{
    const errors=admissible.map(r=>Math.abs(r[method]-r.actual)).sort((a,b)=>a-b);
    return [method,errors.length>=8?errors[Math.ceil(.8*errors.length)-1]:null];
  }));
}

export function buildOutlook(rows) {
  const annual=annualSeries(rows,'tavg').filter(r=>Number.isFinite(r.value));
  const features=annualPredictors(rows);
  const actual=new Map(annual.map(r=>[r.year,r.value]));
  const issue=annual.at(-1)?.year;
  const horizons=[2,3].map(horizon=>{
    const replay=[];
    for(const {year} of features){
      if(!actual.has(year+horizon))continue;
      const result=hindcastAt(features,annual,year,horizon);
      if(result)replay.push({...result,actual:actual.get(result.target),bands:bounds(replay,year)});
    }
    const measured=replay.filter(r=>Number.isFinite(r.bands.conventional));
    const future=hindcastAt(features,annual,issue,horizon);
    if(future)future.bands=bounds(replay,issue);
    const metrics=measured.length?Object.fromEntries(arms.map(method=>[method,quality(measured,method)])):null;
    const eligible=future&&measured.length>=8&&Number.isFinite(future.bands.conventional)&&metrics.conventional.coverage>=.7;
    return {horizon,replay:measured,projection:eligible?future:null,metrics};
  });
  return {annual,issue,lastDate:rows.at(-1)?.date,horizons,version:outlookVersion};
}

