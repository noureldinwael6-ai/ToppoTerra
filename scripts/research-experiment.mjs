import {ripsPersistence,bottleneckH1} from '../app/topology.mjs';

const windowMonths = 36;
const stride = 12;
const delay = 3;
const monitoringMonths = 180;
const calibrationPaths = 99;
const trials = 48;
const falseAlarmTarget = .10;
const onset = 72;
const mean = values => values.reduce((sum,v)=>sum+v,0)/values.length;
const sd = values => {
  const center=mean(values);
  return Math.sqrt(values.reduce((sum,v)=>sum+(v-center)**2,0)/(values.length-1));
};
const median = values => {
  const sorted=[...values].sort((a,b)=>a-b);
  return sorted.length ? (sorted[Math.floor((sorted.length-1)/2)]+sorted[Math.ceil((sorted.length-1)/2)])/2 : null;
};

export function seededRandom(seed) {
  let state=seed>>>0;
  return () => {
    state=(state+0x6d2b79f5)>>>0;
    let x=Math.imul(state^(state>>>15),state|1);
    x^=x+Math.imul(x^(x>>>7),x|61);
    return ((x^(x>>>14))>>>0)/4294967296;
  };
}

export function standardizer(train) {
  if (train.length!==240 || !train.every(Number.isFinite)) throw new Error('Calibration expects 20 complete training years.');
  const normals=Array.from({length:12},(_,month)=>mean(train.filter((_,i)=>i%12===month)));
  const anomalies=train.map((v,i)=>v-normals[i%12]);
  const scale=sd(anomalies);
  if (!(scale>0)) throw new Error('Training variance must be positive.');
  return {normals,scale,transform:values=>values.map((v,i)=>Number.isFinite(v)?(v-normals[i%12])/scale:null)};
}

export function embedded(values) {
  return values.slice(2*delay).map((v,i)=>[v,values[i+delay],values[i]]);
}

function featureVector(values) {
  const center=mean(values), spread=sd(values);
  let cross=0, power=0;
  for(let i=0;i<values.length;i++) {
    const x=values[i]-center;
    power+=x*x;
    if(i)cross+=x*(values[i-1]-center);
  }
  return [center,Math.log(Math.max(spread,1e-6)),power>0?cross/power:0];
}
const finiteH1 = values => ripsPersistence(embedded(values)).filter(f=>f.dimension===1&&Number.isFinite(f.death));

export function freezeScores(values, method) {
  const references=[];
  for(let i=0;i+windowMonths<=values.length;i+=windowMonths){
    const block=values.slice(i,i+windowMonths);
    if(block.every(Number.isFinite))references.push(block);
  }
  if(!references.length)throw new Error('No complete training windows.');
  if(method==='topology') {
    const diagrams=references.map(finiteH1);
    return rows=>{
      const diagram=finiteH1(rows);
      return median(diagrams.map(reference=>bottleneckH1(diagram,reference)));
    };
  }
  if(method!=='classical')throw new Error('Unknown benchmark detector.');
  const train=references.map(featureVector);
  const centers=train[0].map((_,i)=>mean(train.map(v=>v[i])));
  const scales=train[0].map((_,i)=>Math.max(.05,sd(train.map(v=>v[i]))));
  return rows=>Math.max(...featureVector(rows).map((v,i)=>Math.abs(v-centers[i])/scales[i]));
}

export function replay(values, scoreWindow) {
  const windows=[];
  for(let end=windowMonths;end<=values.length;end+=stride){
    const block=values.slice(end-windowMonths,end);
    windows.push({end,score:block.every(Number.isFinite)?scoreWindow(block):null});
  }
  return windows;
}

export function sampleNull(values, rand, length=monitoringMonths) {
  const blockMonths=24;
  const choices=Math.floor((values.length-blockMonths)/12)+1;
  const out=[];
  while(out.length<length) {
    const offset=12*Math.floor(rand()*choices);
    out.push(...values.slice(offset,offset+blockMonths));
  }
  return out.slice(0,length);
}

export function alarmThreshold(maxima, alpha=falseAlarmTarget) {
  // Finite-sample rank threshold: alarms are strictly above this order statistic.
  const rank=Math.ceil((maxima.length+1)*(1-alpha));
  return maxima.slice().sort((a,b)=>a-b)[rank-1] ?? Infinity;
}

function wilson(count,n) {
  if(!n)return null;
  const z=1.959963984540054, fraction=count/n;
  const denominator=1+z*z/n;
  const margin=z*Math.sqrt(fraction*(1-fraction)/n+z*z/(4*n*n));
  return [(fraction+z*z/(2*n)-margin)/denominator,(fraction+z*z/(2*n)+margin)/denominator];
}
const maxScore = windows => Math.max(...windows.map(window=>window.score??-Infinity));

function shifted(values, type, rand) {
  if(type==='null')return values;
  if(type==='gaps')return values.map((v,i)=>[16,56,104,148].includes(i)?null:v);
  if(type==='clusters') {
    const out=values.slice();
    for(let i=onset;i<out.length;i+=12){
      const annual=out.slice(i,i+12);
      const ordered=[...annual.filter(v=>v>0),...annual.filter(v=>v<=0)];
      const offset=Math.floor(rand()*12);
      const rotated=ordered.slice(offset).concat(ordered.slice(0,offset));
      out.splice(i,12,...rotated);
    }
    return out;
  }
  return values.map((v,i)=>{
    if(i<onset)return v;
    if(type==='step')return v+1;
    if(type==='drift')return v+(i-onset)*.015;
    if(type==='spread')return v*1.6;
    return v;
  });
}

export function pointRelationFixture() {
  // Synthetic-only lag shift with unchanged marginals by circularly rotating a paired fixture.
  const rand=seededRandom(0x2146);
  const rainfall=Array.from({length:48},()=>rand()*2-1);
  const wetness=rainfall.slice(-3).concat(rainfall.slice(0,-3));
  const correlation=(a,b)=>{
    const x=mean(a),y=mean(b);
    return a.reduce((s,v,i)=>s+(v-x)*(b[i]-y),0)/((a.length-1)*sd(a)*sd(b));
  };
  return {n:rainfall.length,sameMonthBefore:correlation(rainfall,rainfall),
    sameMonthAfter:correlation(rainfall,wetness),shiftedLagMonths:3,
    alignedAfter:correlation(rainfall.slice(0,-3),wetness.slice(3))};
}

export function buildExperiment(climate) {
  const site=climate.series.AZ;
  const rawYears=(start,end)=>site.filter(r=>r.year>=start&&r.year<=end).map(r=>r.tavg);
  const train=rawYears(1981,2000);
  const standardized=standardizer(train);
  const ref=standardized.transform(train);
  const test=standardized.transform(rawYears(2011,2025));
  if (test.length!==monitoringMonths || !test.every(Number.isFinite)) throw new Error('Replay expects 15 complete held-out years.');
  const detectors=['classical','topology'].map(method=>({method,scoreWindow:freezeScores(ref,method)}));
  const calibrationRand=seededRandom(0x5253);
  const nulls=Array.from({length:calibrationPaths},()=>sampleNull(ref,calibrationRand));
  for(const detector of detectors){
    const maxima=nulls.map(path=>maxScore(replay(path,detector.scoreWindow)));
    detector.threshold=alarmThreshold(maxima);
    detector.calibrationExceedances=maxima.filter(x=>x>detector.threshold).length;
  }
  const rng=seededRandom(0x62c1);
  // Shared holdout null draws keep method comparisons paired. Transformations never touch the calibration paths.
  const trialBases=Array.from({length:trials},()=>sampleNull(ref,rng));
  const scenarios=[
    {name:'Stable seasonal cycle + block noise',type:'null',change:false},
    {name:'Autocorrelated Gaussian null (ρ = 0.70)',type:'ar',change:false},
    {name:'Observation gaps',type:'gaps',change:false},
    {name:'Abrupt mean increase (+1 training SD)',type:'step',change:true},
    {name:'Gradual mean drift (+0.015 SD/month)',type:'drift',change:true},
    {name:'Variability increase (×1.6 SD)',type:'spread',change:true},
    {name:'Clustered warm months (annual mean preserved)',type:'clusters',change:true}
  ].map(scenario=>{
    const paths=trialBases.map((base,i)=>{
      if(scenario.type!=='ar') {
        const candidate=shifted(base,scenario.type,seededRandom(0x4490+i));
        const syntheticRaw=candidate.map((z,t)=>z===null?null:z*standardized.scale+standardized.normals[t%12]);
        return standardized.transform(syntheticRaw);
      }
      const rand=seededRandom(0x3030+i);
      let value=0;
      return Array.from({length:monitoringMonths+36},()=>{
        const shock=Math.sqrt(-2*Math.log(1-rand()))*Math.cos(2*Math.PI*rand());
        value=.70*value+Math.sqrt(1-.70**2)*shock;
        return value;
      }).slice(36);
    });
    const results=Object.fromEntries(detectors.map(d=>{
      const observed=paths.map(path=>replay(path,d.scoreWindow));
      const crossing=observed.map(windows=>windows.filter(w=>w.score!==null&&w.score>d.threshold));
      const delays=scenario.change ? crossing.flatMap(windows=>{
        const hit=windows.find(w=>w.end>onset);
        return hit ? [hit.end-onset] : [];
      }):[];
      const count=scenario.change?delays.length:crossing.filter(row=>row.length>0).length;
      return [d.method,{
        count,n:trials,interval:wilson(count,trials),medianDelay:median(delays),
        preAlarm:scenario.change?crossing.filter(row=>row.some(w=>w.end<=onset)).length:null,
        eligibleWindows:observed[0].filter(w=>w.score!==null).length
      }];
    }));
    return {...scenario,results};
  });
  const history=detectors.map(d=>{
    const windows=replay(test,d.scoreWindow).map(w=>({...w,ratio:w.score/d.threshold,
      year:2010+w.end/12,alert:w.score>d.threshold}));
    return {method:d.method,threshold:d.threshold,calibrationExceedances:d.calibrationExceedances,windows,
      firstAlert:windows.find(w=>w.alert)?.year??null,alerts:windows.filter(w=>w.alert).length};
  });
  return {history,scenarios,relation:pointRelationFixture(),protocol:{
    variable:'Monthly mean air temperature',state:'Arizona',source:'NOAA NCEI nClimDiv',
    train:[1981,2000],gap:[2001,2010],test:[2011,2025],windowMonths,stride,delay,dimensions:3,
    sampleCount:windowMonths-2*delay,monitoringMonths,calibrationPaths,trials,falseAlarmTarget,onset,
    annualAnomalies:Array.from({length:15},(_,i)=>({x:2011+i,y:mean(test.slice(i*12,i*12+12))*standardized.scale}))
  }};
}

export function representativeReplay(climate, method) {
  const region=climate.series.AZ;
  const read=(first,last)=>region.filter(row=>row.year>=first&&row.year<=last).map(row=>row.tavg);
  const transform=standardizer(read(1981,2000)).transform;
  const frozen=freezeScores(transform(read(1981,2000)),method);
  const values=transform(read(2011,2025));
  return replay(values,frozen);
}

