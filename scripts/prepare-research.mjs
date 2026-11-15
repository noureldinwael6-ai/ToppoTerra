import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {cpus,platform,arch} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {buildExperiment,representativeReplay} from './research-experiment.mjs';
import {fitTrend} from '../app/science.mjs';

const sourceName='NASA_GPM_IMERG_Nile_Delta_monthly_raw_1998_2007.csv';
const shaExpected='66f3a19f388bc78201e4e12782096bb79614b538ac0340b4c22367911183ce75';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceUrl = new URL('../data/source-records/'+sourceName+'.gz',import.meta.url);
const climateUrl = new URL('../data/climate.json',import.meta.url);

export function parseImerg(raw) {
  const lines=raw.toString('utf8').trim().split(/\r?\n/);
  if(lines.shift()!=='time,latitude,longitude,precipitation'||lines.shift()!=='UTC,degrees_north,degrees_east,mm') {
    throw new Error('Unexpected IMERG schema or units.');
  }
  const monthly=new Map();
  for(const line of lines) {
    const [date,latText,lonText,precip]=line.split(',');
    const lat=Number(latText),lon=Number(lonText),value=Number(precip);
    if(!/^\d{4}-(0[1-9]|1[0-2])-01T00:00:00Z$/.test(date)||
      ![lat,lon,value].every(Number.isFinite)||!precip||value<0||
      lat<30.55-1e-4||lat>31.55+1e-4||lon<30.55-1e-4||lon>32.05+1e-4) {
      throw new Error('Invalid IMERG date, precipitation, or grid metadata.');
    }
    const key=lat.toFixed(2)+','+lon.toFixed(2);
    const grid=monthly.get(date)??new Map();
    if(grid.has(key))throw new Error('Duplicate cell at '+date);
    grid.set(key,{weight:Math.cos(lat*Math.PI/180),value});
    monthly.set(date,grid);
  }
  if(monthly.size!==120)throw new Error('Expected all 120 calendar months.');
  const gridKeys=[...monthly.values()][0].keys();
  const validFootprint=new Set(gridKeys);
  const records=[...monthly].sort(([a],[b])=>a.localeCompare(b)).map(([date,cells],i)=>{
    const year=1998+Math.floor(i/12), month=i%12+1;
    if(date.slice(0,7)!==year+'-'+String(month).padStart(2,'0')||
        cells.size!==176||[...cells.keys()].some(key=>!validFootprint.has(key))) {
      throw new Error('Nonconsecutive month or incomplete shared IMERG grid.');
    }
    let sum=0, area=0;
    for(const {weight,value} of cells.values()){sum+=weight*value;area+=weight;}
    return {date:date.slice(0,10),year,month,value:sum/area};
  });
  const annual=Array.from({length:10},(_,i)=>({
    year:1998+i,value:records.slice(i*12,(i+1)*12).reduce((sum,row)=>sum+row.value,0)
  }));
  const trend=fitTrend(annual,'ols');
  const grid=[...validFootprint].map(key=>{
    const [lat,lon]=key.split(',').map(Number);
    const value=[...monthly.values()].reduce((total,cells)=>total+cells.get(key).value,0)/monthly.size;
    return {lat,lon,value};
  });
  return {records,annual,rate:trend.rate,fit:trend.fitted,source:'NASA GPM IMERG monthly accumulation',
    origin:'USF IMaRS ERDDAP archived extract',release:'The distributor links IMERG V07 technical documentation. Exact export revision and the distributor’s upstream rate-to-depth procedure are absent from the supplied CSV.',
    grid,gridSummary:'176 cells at 0.1° resolution',area:[30.50,31.60,30.50,32.10],archiveSha256:digest(raw)};
}

function measure(climate,method) {
  const times=[];
  let windows;
  for(let i=0;i<7;i++){
    const before=performance.now();
    windows=representativeReplay(climate,method);
    times.push(performance.now()-before);
  }
  const sorted=times.slice(1).sort((a,b)=>a-b);
  return {method,firstMs:times[0],medianMs:(sorted[2]+sorted[3])/2,
    processPeakRssKiB:process.resourceUsage().maxRSS,windows:windows.length};
}

async function main() {
  const climateBytes=await readFile(climateUrl);
  const climate=JSON.parse(climateBytes);
  const mode=process.argv[2];
  if(mode==='--timing'){
    console.log(JSON.stringify(measure(climate,process.argv[3])));
    return;
  }
  let raw;
  if(mode){
    raw=await readFile(mode);
    if(digest(raw)!==shaExpected)throw new Error('Source fingerprint differs from audited raw CSV.');
    await writeFile(sourceUrl,gzipSync(raw,{level:9}));
  } else raw=gunzipSync(await readFile(sourceUrl));
  if(digest(raw)!==shaExpected)throw new Error('Archive fingerprint mismatch.');
  const nasa=parseImerg(raw);
  const experiment=buildExperiment(climate);
  const measurements=['classical','topology'].map(method=>{
    const proc=spawnSync(process.execPath,[fileURLToPath(import.meta.url),'--timing',method],{encoding:'utf8'});
    if(proc.status!==0)throw new Error(proc.stderr||String(proc.error));
    return JSON.parse(proc.stdout);
  });
  const runtime={measurements,cpu:cpus()[0]?.model??'Unknown CPU',system:platform()+' '+arch(),node:process.version};
  await writeFile(new URL('../data/research.json',import.meta.url),JSON.stringify({
    schema:'toppoterra-research-v1',climateSha256:digest(climateBytes),nasa,experiment,runtime
  })+'\n');
  console.log('NASA grid: '+nasa.records.length+' months, 176 cells per month in the Nile Delta footprint.');
  console.log(JSON.stringify({history:experiment.history.map(h=>({method:h.method,firstAlert:h.firstAlert,alerts:h.alerts,threshold:h.threshold})),runtime},null,2));
}

if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)await main();

