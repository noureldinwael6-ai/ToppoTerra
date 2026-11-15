import {bottleneckH1,ripsPersistence,runTopology} from './topology.mjs';
import {annualSeries,fitTrend} from './science.mjs';

export const methodNames = {
  seasonal:'Same-month climatology',
  local:'Adjacent observations',
  geometry:'Geometric analogs',
  ph:'H1-assisted analogs'
};
const average = values => values.reduce((a,b)=>a+b,0)/values.length;
export const monthNumber = date => {
  const match = /^(\d{4})-(0[1-9]|1[0-2])-01$/.exec(date);
  if (!match) throw new Error('Use an actual calendar month, in YYYY-MM-01 format.');
  return Number(match[1])*12 + Number(match[2])-1;
};
const dateOf = index => Math.floor(index/12)+'-'+String(index%12+1).padStart(2,'0')+'-01';

export function isolateObservation(rows,variable,dates) {
  const selected=new Set(dates.map(monthNumber));
  if (!selected.size || selected.size>18) throw new Error('Choose 1 to 18 distinct archive months.');
  const archive=new Map(rows.map(row=>[monthNumber(row.date),row]));
  for (const index of selected) {
    if (index<Math.min(...archive.keys()) || index>Math.max(...archive.keys())) throw new Error('The mask must stay inside archive coverage.');
  }
  const truth=Object.fromEntries([...selected].map(index=>[dateOf(index),archive.get(index)?.[variable]??null]));
  const values=[...new Set([...archive.keys(),...selected])].sort((a,b)=>a-b).map(index=>{
    const value=archive.get(index)?.[variable];
    const finite=Number.isFinite(value);
    const hidden=selected.has(index)&&finite;
    return {date:dateOf(index),value:hidden||!finite?null:value,
      status:hidden?'experimentally_masked':finite?'observed':'missing'};
  });
  return {values,truth};
}

function normals(samples) {
  const months=Array.from({length:12},()=>[]);
  for (const [index,value] of samples) if(Number.isFinite(value))months[index%12].push(value);
  const mean=months.map(values=>values.length?average(values):null);
  const residuals=months.flatMap((values,month)=>values.map(value=>value-mean[month]));
  const scale=Math.sqrt(residuals.reduce((sum,value)=>sum+value*value,0)/Math.max(1,residuals.length-12));
  return {mean,scale,count:months.map(values=>values.length)};
}

function embedding(indices,vector) {
  const set=new Set(indices);
  const anchors=indices.filter(offset=>set.has(offset-1)&&set.has(offset-2));
  return {anchors,points:anchors.map(offset=>[vector(offset),vector(offset-1),vector(offset-2)])};
}

function diagram(indices,vector) {
  const {points}=embedding(indices,vector);
  return points.length>=4?ripsPersistence(points):null;
}

function neighbors(samples,target,mode,scale) {
  if (!(scale.scale>0)) return [];
  const offsets=Array.from({length:25},(_,i)=>i-12).filter(offset=>
    offset!==0&&(mode==='retrospective'||offset<0)&&Number.isFinite(samples.get(target+offset)));
  if (offsets.length<6) return [];
  const anomaly = index => (samples.get(index)-scale.mean[index%12])/scale.scale;
  const sameMonth=[...samples.keys()].filter(index=>index%12===target%12 &&
    Math.abs(index-target)>12 && Number.isFinite(samples.get(index)));
  const targetDiagrams=new Map();
  const analogs=[];
  for (const index of sameMonth) {
    const common=offsets.filter(offset=>Number.isFinite(samples.get(index+offset)));
    if (common.length<Math.max(6,Math.ceil(offsets.length*.75))) continue;
    const distance=Math.sqrt(average(common.map(offset=>(anomaly(target+offset)-anomaly(index+offset))**2)));
    const key=common.join(',');
    if(!targetDiagrams.has(key))targetDiagrams.set(key,diagram(common,offset=>anomaly(target+offset)));
    const targetDiagram=targetDiagrams.get(key);
    const analogDiagram=targetDiagram?diagram(common,offset=>anomaly(index+offset)):null;
    const h1=analogDiagram?bottleneckH1(targetDiagram,analogDiagram):null;
    analogs.push({date:dateOf(index),value:samples.get(index),distance,h1,
      targetMonths:common.map(offset=>dateOf(target+offset)),analogMonths:common.map(offset=>dateOf(index+offset)),
      query:targetDiagram ? {...embedding(common,offset=>anomaly(target+offset)), features:targetDiagram} : null});
  }
  return analogs;
}

function analogEstimate(candidates,withPh,target) {
  const ranked=candidates.filter(candidate=>!withPh||candidate.h1!==null).map(candidate=>{
    const distance=withPh?Math.hypot(candidate.distance,2*candidate.h1):candidate.distance;
    return {...candidate,rankingDistance:distance};
  }).sort((a,b)=>a.rankingDistance-b.rankingDistance||a.date.localeCompare(b.date)).slice(0,5);
  if(ranked.length<3) return {value:null,neighbors:ranked,support:ranked.length};
  const weights=ranked.map(item=>1/(.10+item.rankingDistance)**2);
  return {value:ranked.reduce((sum,item,i)=>sum+item.value*weights[i],0)/weights.reduce((a,b)=>a+b,0),
    neighbors:ranked.map(({query,...item})=>item),support:ranked.length,
    geometry:{points:ranked[0].query.points,features:ranked[0].query.features,
      dates:ranked[0].query.anchors.map(offset=>dateOf(target+offset))}};
}

export function reconstruct(values,dates,mode) {
  if (!['retrospective','prospective'].includes(mode)) throw new Error('Choose retrospective or prospective reconstruction.');
  const entries=values.map(row=>[monthNumber(row.date),row.status==='observed'?row.value:null]);
  const observationIndex=new Map(entries);
  if(observationIndex.size!==entries.length)throw new Error('The archive has duplicate calendar months.');
  const targets=[...new Set(dates.map(monthNumber))].sort((a,b)=>a-b);
  if(!targets.length||targets.length>18)throw new Error('Choose 1 to 18 distinct archive months.');
  if(targets.some(index=>observationIndex.get(index)!==null))throw new Error('Mask each target before estimating it.');
  return targets.map(target=>{
    const samples=new Map(entries.filter(([index,value])=>Number.isFinite(value) && (mode==='retrospective'||index<target)));
    const scale=normals(samples);
    const before=[...samples.keys()].filter(index=>index<target).reduce((a,b)=>Math.max(a,b),-Infinity);
    const after=[...samples.keys()].filter(index=>index>target).reduce((a,b)=>Math.min(a,b),Infinity);
    const left=samples.get(before),right=samples.get(after);
    let local={value:null,context:[]};
    if(mode==='prospective' && target-before<=12) local={value:left,context:[dateOf(before)]};
    if(mode==='retrospective'&&target-before<=12&&after-target<=12) local={
      value:left+(right-left)*(target-before)/(after-before),context:[dateOf(before),dateOf(after)]
    };
    const candidates=neighbors(samples,target,mode,scale).filter(candidate=>candidate.h1!==null);
    const ph=analogEstimate(candidates,true,target);
    // The paired ablation uses the same eligible candidates as H1.
    const geometry=analogEstimate(candidates,false,target);
    return {date:dateOf(target),baselineMonths:samples.size,mean:scale.mean[target%12],
      scale:scale.scale,candidates:candidates.length,
      estimates:{seasonal:{value:scale.count[target%12]>=3?scale.mean[target%12]:null},local,geometry,ph}};
  });
}

export function reconstructionMetrics(results,truth) {
  return Object.keys(methodNames).map(method=>{
    const known=results.filter(row=>Number.isFinite(truth[row.date]));
    const errors=known.flatMap(row=>Number.isFinite(row.estimates[method].value)
      ? [{date:row.date,error:row.estimates[method].value-truth[row.date]}] : []);
    return {method,n:errors.length,total:known.length,failures:known.length-errors.length,errors,
      mae:errors.length?average(errors.map(row=>Math.abs(row.error))):null,
      rmse:errors.length?Math.sqrt(average(errors.map(row=>row.error**2))):null,
      bias:errors.length?average(errors.map(row=>row.error)):null};
  });
}

export function seededMasks(rows,start,end,anchor,count,type,seed) {
  const allowed=rows.filter(row=>row.year>=start&&row.year<=end);
  if(!allowed.length)throw new Error('There are no months inside this study period.');
  const i=allowed.findIndex(row=>row.date===anchor);
  if(i<0)throw new Error('Choose a month inside the active study period.');
  if(type==='single')return [anchor];
  if(!Number.isInteger(count)||count<2||count>18)throw new Error('Use an integer mask size from 2 to 18.');
  if(type==='gap') {
    const dates=Array.from({length:count},(_,j)=>dateOf(monthNumber(anchor)+j));
    if(monthNumber(dates.at(-1))>monthNumber(allowed.at(-1).date))throw new Error('The gap extends beyond the selected period.');
    return dates;
  }
  if(type!=='random'||!Number.isInteger(seed)||seed<0||seed>4294967295||count>allowed.length) {
    throw new Error('Use a valid unsigned 32-bit seed and a mask no larger than the study period.');
  }
  const dates=allowed.map(row=>row.date);
  let state=seed>>>0;
  for(let j=0;j<count;j++){
    state=(Math.imul(state,1664525)+1013904223)>>>0;
    const pick=j+Math.floor((state/4294967296)*(dates.length-j));
    [dates[j],dates[pick]]=[dates[pick],dates[j]];
  }
  return dates.slice(0,count).sort();
}

export function benchmarkReconstruction(rows,variable,mode) {
  const start=rows.at(0).year,end=rows.at(-1).year;
  const heldOutStart = Math.max(start+14,end-12);
  const segment=rows.filter(row=>row.year>=heldOutStart);
  const scenarios=[
    {name:'Six random singletons · seed 193',masks:seededMasks(rows,heldOutStart,end,segment[0].date,6,'random',193).map(date=>[date])},
    {name:'Six random singletons · seed 819',masks:seededMasks(rows,heldOutStart,end,segment[0].date,6,'random',819).map(date=>[date])},
    {name:'Three-month winter gap',masks:[seededMasks(rows,heldOutStart,end,segment[11].date,3,'gap',0)]},
    {name:'Six-month spring gap',masks:[seededMasks(rows,heldOutStart,end,segment[27].date,6,'gap',0)]},
    {name:'Three extreme months',masks:[...segment].sort((a,b)=>b[variable]-a[variable]).slice(0,3).map(row=>[row.date])}
  ];
  const began=performance.now();
  const comparisons=scenarios.map(({name,masks})=>{
    const all=[]; const truth={};
    for(const dates of masks){
      const isolated=isolateObservation(rows,variable,dates);
      all.push(...reconstruct(isolated.values,dates,mode));
      Object.assign(truth,isolated.truth);
    }
    return {name,metrics:reconstructionMetrics(all,truth)};
  });
  return {start:heldOutStart,end,mode,comparisons,runtime:performance.now()-began};
}

export function reconstructionImpact(rows,variable,isolated,results,method,dataBaseline,period) {
  const maskIndex=new Map(isolated.values.map(row=>[row.date,row]));
  const estimateIndex=new Map(results.map(row=>[row.date,row.estimates[method].value]));
  const gap=rows.map(row=>({...row,[variable]:maskIndex.get(row.date).value}));
  const overlay=gap.map(row=>({...row,[variable]:estimateIndex.get(row.date)??row[variable]}));
  const rates=[gap,overlay].map(series=>fitTrend(annualSeries(series.filter(row=>row.year>=period.start&&row.year<=period.end),variable)));
  const fittedNormals=normals(new Map(gap.filter(row=>row.year>=dataBaseline[0]&&row.year<=dataBaseline[1]).map(row=>[monthNumber(row.date),row[variable]]))).mean;
  const topologies=[gap,overlay].map(series=>runTopology(series.map(row=>({
    date:row.date,value:Number.isFinite(row[variable])&&Number.isFinite(fittedNormals[row.month-1])
      ? row[variable]-fittedNormals[row.month-1] : null
  })),null,{baseline:dataBaseline,lagCount:3,direction:'past',startYear:period.start,endYear:period.end}));
  return {rates:rates.map(rate=>({rate:rate.rate,n:rate.n})), topology:topologies.map(topology=>({
    count:topology.windows.length,skipped:topology.skipped,peak:Math.max(0,...topology.windows.map(w=>w.referenceChange??0))
  }))};
}

