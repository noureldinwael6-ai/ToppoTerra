import {escape,number,plot,bindCharts} from './charts.mjs';
import {isolateObservation,methodNames,monthNumber,reconstructionMetrics,seededMasks} from './reconstruction-engine.mjs';
import {mountPhaseSpace,shiftMonth} from './phase-space.mjs';

const tint='#c8b3fa', observed='#a9ebca', conventional='#edb688';
const modeName=mode=>mode==='prospective'?'Prospective · only earlier months':'Retrospective · surrounding months';
const resultText=value=>Number.isFinite(value)?number(value,3):'Unavailable';
const displayDate=date=>date.slice(0,7);
const monthLabel=index=>Math.floor(index/12)+'-'+String(index%12+1).padStart(2,'0');

export function mountProofLab(root,data,config) {
  const cancel=new AbortController();
  const region=config.region==='compare'?data.regions[0].id:config.region;
  const place=data.regions.find(item=>item.id===region).name;
  const variable=data.variables.find(item=>item.id===config.variable);
  const rows=data.series[region].filter(row=>row.year>=config.start&&row.year<=config.end);
  const months=rows.filter(row=>Number.isFinite(row[variable.id]));
  const label=escape(variable.label), unit=escape(variable.unit);
  const subject=escape(place)+' · '+label+' ('+unit+') · '+config.start+'–'+config.end+' · NOAA NCEI nClimDiv';
  root.innerHTML='<div class="shell workspace proof enter"><header class="page-head"><div><a class="back" href="#topology">← Advanced Research Lab</a><p class="eyebrow lab-text">Experiment and ablation</p><h1 tabindex="-1">Topo-Signal Proof Lab</h1><p>'+subject+'</p></div><a class="button ghost" href="#analysis">Return to Public Explorer</a></header>'
    +'<p class="proof-thesis">Don’t just ask whether Earth’s climate is changing. Test how the structure of its data is changing, and whether that structure helps us recover information and anticipate risk.</p>'
    +'<nav class="research-nav" aria-label="Proof experiments"><span aria-current="page">Blindfold the data</span><a href="#benchmark">Structural-change evidence ↗</a><a href="#scenario">What-If Studio ↗</a><a href="#prediction">Climate Time Machine status ↗</a></nav>'
    +'<section class="panel figure-panel"><div class="proof-lead"><div><h2>Blindfold the data</h2><p>Withhold one measured month or a consecutive block. Compare two conventional baselines and the same analog estimator with and without H1 information.</p></div><label class="proof-switch"><input type="checkbox" checked data-proof-topology> Topology on</label></div>'
    +'<form class="controls"><label>First hidden month<select name="proof-date">'+months.slice().reverse().map(row=>'<option value="'+row.date+'">'+displayDate(row.date)+'</option>').join('')+'</select></label><label>Mask<select name="proof-count"><option value="1">One month</option><option value="3">3-month block</option><option value="6">6-month block</option></select></label><label>Available observations<select name="proof-mode"><option value="retrospective">Retrospective</option><option value="prospective">Prospective</option></select></label></form>'
    +'<div class="head-actions"><button class="button primary" data-proof="mask">Hide measurement(s)</button><button class="button" data-proof="estimate" disabled>Reconstruct with both</button><button class="button" data-proof="reveal" disabled>Reveal actual values</button><button class="button ghost" data-proof="reset">Reset</button></div><p class="proof-status" data-proof-status role="status">Select a month to begin.</p><div data-proof-results></div></section>'
    +'<section class="panel figure-panel"><h2>Repeated archive tests</h2><p>Compare held-out singletons, consecutive gaps and upper extremes in the later archive years. The benchmark uses the full selected state archive. Your trial uses the Public Explorer period.</p><button class="button ghost" data-proof="benchmark">Run paired archive benchmark</button><p data-proof-benchmark-status role="status"></p><div data-proof-benchmark></div></section>'
    +'<section class="panel figure-panel"><h2>Noise or a real extreme?</h2><p>Artifact injection, true-extreme retention and trend-error recalibration are pending. The upper-extreme masks above treat the archived values as ground truth.</p></section></div>';
  const scope=root.querySelector('.proof');
  const get=selector=>scope.querySelector(selector);
  const control=name=>get('[name="'+name+'"]');
  const action=name=>get('[data-proof="'+name+'"]');
  const status=get('[data-proof-status]');
  const results=get('[data-proof-results]');
  const toggle=get('[data-proof-topology]');
  let trial, estimates, revealed=false, geometryCleanup, worker, sequence=0;
  const waiting = new Map();
  const originalRows=new Map(rows.map(row=>[row.date,row]));
  const chosenMethod=()=>toggle.checked?'ph':'geometry';
  const signal=cancel.signal;

  function request(payload) {
    if(!worker){
      worker=new Worker(new URL('./proof-worker.mjs',import.meta.url),{type:'module'});
      worker.onmessage=({data:{id,result,error}})=>{
        const callback=waiting.get(id);
        if(!callback)return;
        waiting.delete(id);
        if(error)callback.reject(new Error(error));
        else callback.resolve(result);
      };
      worker.onerror=()=>{
        for(const callback of waiting.values())callback.reject(new Error('The experiment worker could not run. Reload and try again.'));
        waiting.clear();
        worker?.terminate();
        worker=null;
      };
    }
    return new Promise((resolve,reject)=>{
      const id=++sequence;
      waiting.set(id,{resolve,reject});
      try{worker.postMessage({...payload,id});}
      catch(error){waiting.delete(id);reject(error);}
    });
  }

  function reset() {
    geometryCleanup?.abort();
    trial=estimates=null;
    revealed=false;
    results.replaceChildren();
    for(const input of scope.querySelectorAll('select'))input.disabled=false;
    action('mask').disabled=!months.length;
    action('estimate').disabled=true;
    action('reveal').disabled=true;
    preview();
  }

  function preview() {
    const month=control('proof-date').value;
    const row=originalRows.get(month);
    status.textContent=row?'Observed '+displayDate(month)+' · '+resultText(row[variable.id])+' '+variable.unit+'. Hide it to start the blind comparison.':'No measured month is available in this period.';
  }

  function proofChart() {
    const first=monthNumber(trial.dates[0]), last=monthNumber(trial.dates.at(-1));
    const masked=new Map(trial.values.map(row=>[row.date,row]));
    const context=trial.values.filter(row=>monthNumber(row.date)>=first-7&&monthNumber(row.date)<=last+7
      && (trial.mode==='retrospective'||revealed||monthNumber(row.date)<first));
    const truth=revealed?[{label:'Revealed originals',color:'#eaf1ff',dots:true,gap:1,
      points:trial.dates.map(date=>({x:monthNumber(date),y:trial.truth[date]}))}]:[];
    const series=[
      {label:revealed?'Observed archive context':'Admissible archive context',color:observed,gap:1,points:context.map(row=>({x:monthNumber(row.date),y:masked.get(row.date).value}))},
      {label:trial.mode==='prospective'?'Last earlier value':'Linear interpolation',color:conventional,dots:true,gap:1,
        points:estimates.map(item=>({x:monthNumber(item.date),y:item.estimates.local.value}))},
      {label:methodNames[chosenMethod()],color:tint,dots:true,gap:1,
        points:estimates.map(item=>({x:monthNumber(item.date),y:item.estimates[chosenMethod()].value}))}, ...truth
    ];
    return plot(series,{title:place+' '+variable.label+' reconstruction context',yLabel:'Monthly value ('+variable.unit+')',
      xLabel:'Calendar month',xDomain:[first-7,last+7],xTicks:[first-6,first,last+6],formatX:monthLabel,tipUnit:variable.unit});
  }

  function updateResults() {
    geometryCleanup?.abort();
    const metricByMethod=new Map((revealed?reconstructionMetrics(estimates,trial.truth):[]).map(row=>[row.method,row]));
    const active=chosenMethod();
    const keys=['seasonal','local','geometry','ph'];
    const base=metricByMethod.get('seasonal'), enhanced=metricByMethod.get('ph');
    const matched=base&&enhanced&&base.n===trial.dates.length&&enhanced.n===base.n;
    const delta=matched?base.mae-enhanced.mae:null;
    const improvement=matched&&base.mae>0?100*delta/base.mae:null;
    const verdict=!matched?'Some values could not be estimated. A full-mask comparison is unavailable.':
      Math.abs(delta)<1e-10?'The methods tied on mean absolute error.':
      'H1-assisted reconstruction had '+(delta>0?'lower':'higher')+' mean absolute error than same-month climatology on these '+base.n+' hidden values.'
      +(improvement===null?'':' MAE improvement: '+resultText(improvement)+'%.');
    const geometry=metricByMethod.get('geometry');
    const ablation=matched&&geometry?.n===enhanced.n
      ? estimates.every(r=>r.estimates.geometry.value===r.estimates.ph.value)?'No measured added value in this test.': 'Adding H1 to the same analog method changed MAE from '+resultText(geometry.mae)+' to '+resultText(enhanced.mae)+' '+unit+'.'
      : '';
    const estimateCaption=(key)=>key==='local'
      ? trial.mode==='prospective'?'Last earlier value':'Linear interpolation':methodNames[key];
    const formatCell=(item,key)=>{
      const estimate=item.estimates[key].value;
      const truth=trial.truth[item.date];
      return resultText(estimate)+(revealed&&Number.isFinite(estimate)&&Number.isFinite(truth)
        ? '<small>error '+resultText(estimate-truth)+' · absolute '+resultText(Math.abs(estimate-truth))+'</small>':'');
    };
    results.innerHTML='<h3>Reconstruction comparison</h3><p>'+modeName(trial.mode)+' · '+trial.dates.length+' masked month(s). Estimated values use '+unit+'.</p><p class="proof-scroll-note">Scroll tables to see every method.</p>'
      +'<div class="table-scroll" tabindex="0" role="region" aria-label="Scrollable comparison table"><table class="research-table compact"><caption>Same masked observations for every method</caption><thead><tr><th scope="col">Month</th>'+keys.map(key=>'<th scope="col">'+estimateCaption(key)+'</th>').join('')+(revealed?'<th scope="col">Original</th>':'')+'</tr></thead><tbody>'
      +estimates.map(item=>'<tr><th scope="row">'+displayDate(item.date)+'</th>'+keys.map(key=>'<td>'+formatCell(item,key)+'</td>').join('')+(revealed?'<td>'+resultText(trial.truth[item.date])+'</td>':'')+'</tr>').join('')
      +'</tbody></table></div>'+(revealed?'<p><strong>'+verdict+'</strong> '+ablation+'</p>':'')+proofChart()
      +'<details class="evidence" open><summary>What does this chart mean?</summary><p>The highlighted estimates fill intentionally removed NOAA values. Once revealed, later months may appear for context. Prospective estimates used only earlier months. Absolute error measures distance from the revealed record. These tests do not provide calibrated uncertainty intervals.</p></details>'
      +(revealed?'<div class="table-scroll" tabindex="0" role="region" aria-label="Scrollable comparison table"><table class="research-table compact"><caption>All methods · same trial · errors in '+unit+'</caption><thead><tr><th>Method</th><th>MAE</th><th>RMSE</th><th>Bias</th><th>Estimated / masked</th></tr></thead><tbody>'
      +[...metricByMethod.values()].map(m=>'<tr><th>'+estimateCaption(m.method)+'</th><td>'+resultText(m.mae)+'</td><td>'+resultText(m.rmse)+'</td><td>'+resultText(m.bias)+'</td><td>'+m.n+' / '+m.total+'</td></tr>').join('')+'</tbody></table></div>':'')
      +'<section class="proof-geometry"><h3>From the masked series to shape</h3><p>Inspect the measured months used in the first target’s nearest analog comparison. A point uses three consecutive known months. The masked values never enter these coordinates.</p><div data-proof-geometry></div></section>';
    bindCharts(results);
    mountGeometry(estimates[0],active);
  }

  function mountGeometry(result,active) {
    const surface=get('[data-proof-geometry]');
    const estimate=result.estimates[active];
    const geometry=estimate.geometry;
    if(!geometry) {surface.innerHTML='<p>Insufficient complete lag context or analogs for this mask. The conventional estimates remain visible.</p>';return;}
    const featureLifetimes=geometry.features.filter(feature=>feature.dimension===1).map(feature=>feature.persistence);
    surface.innerHTML='<div class="proof-cloud"><div><svg class="lab-phase" viewBox="0 0 660 390" role="group" tabindex="0" aria-label="Mask-aware phase space. Arrow keys select a point. Shift plus arrow keys rotate."><path class="phase-grid"/><g class="phase-axes"/><path class="phase-edges"/><path class="phase-trajectory"/><path class="phase-selection"/><g class="phase-points"/></svg><div class="phase-controls"><button class="button ghost slim" data-phase-camera="out" aria-label="Zoom out">−</button><button class="button ghost slim" data-phase-camera="in" aria-label="Zoom in">+</button><button class="button ghost slim" data-phase-camera="pan" aria-pressed="false">Pan</button><button class="button ghost slim" data-phase-flat aria-pressed="false">Show XY</button><button class="button ghost slim" data-phase-camera="reset">Reset view</button></div></div>'
      +'<aside><p><strong>First target</strong> '+displayDate(result.date)+'</p><p><strong>Finite H<sub>1</sub> loops</strong> '+featureLifetimes.length+' · longest lifetime '+resultText(Math.max(0,...featureLifetimes))+' in standardized distance</p><p>Selected analogs '+estimate.neighbors.map(item=>displayDate(item.date)).join(', ')+'.</p><p data-proof-point aria-live="polite"></p><details class="result-explanation"><summary>Read the loop count and lifetime</summary><p><strong>What does this mean?</strong> A finite loop forms at one link distance and fills at a larger one. Lifetime measures the distance between those scales.</p><p><strong>Why is it important?</strong> Loop information can change which measured analogs the estimator selects. The revealed target and paired errors show whether it helped in this trial.</p><details><summary>How was this calculated?</summary><p>The exact Euclidean filtration uses the measured lagged context in standardized coordinates. H₁ lifetime is death minus birth. The reported maximum is zero when the finite H₁ diagram is empty. These features carry no climate significance test.</p></details></details></aside></div>';
    geometryCleanup=new AbortController();
    const phase=mountPhaseSpace(surface.querySelector('svg'),geometry,{
      bounds:Math.max(1,...geometry.points.flat().map(Math.abs)),
      choose:index=>selectPoint(index),labels:['z(t)','z(t−1)','z(t−2)'],
      controls:surface.querySelector('.phase-controls'),signal:geometryCleanup.signal
    });
    function selectPoint(index) {
      phase.select(index);
      const date=geometry.dates[index];
      surface.querySelector('[data-proof-point]').innerHTML='<strong>Observed inputs · '+displayDate(date)+'</strong><br>'+geometry.points[index].map((z,lag)=>{
        const month=shiftMonth(date,-lag);
        return displayDate(month)+' · '+resultText(originalRows.get(month)?.[variable.id])+' '+unit+' · z '+resultText(z);
      }).join('<br>');
    }
    selectPoint(0);
  }

  scope.addEventListener('click',async event=>{
    const step=event.target.closest('[data-proof]')?.dataset.proof;
    if(!step)return;
    try {
      if(step==='reset'){reset();return;}
      if(step==='mask'){
        const dates=seededMasks(rows,config.start,config.end,control('proof-date').value,
          Number(control('proof-count').value),control('proof-count').value==='1'?'single':'gap',0);
        const isolated=isolateObservation(rows,variable.id,dates);
        trial={...isolated,dates,mode:control('proof-mode').value};
        for(const input of scope.querySelectorAll('select'))input.disabled=true;
        action('mask').disabled=true;action('estimate').disabled=false;
        status.textContent='Hidden: '+dates.map(displayDate).join(', ')+'. '+modeName(trial.mode)+'.';
      }
      if(step==='estimate'){
        const current=trial;
        action('estimate').disabled=true;
        status.textContent='Comparing the estimators on the same masked input…';
        const started=performance.now();
        const computed=await request({kind:'estimate',values:trial.values,dates:trial.dates,mode:trial.mode});
        if(trial!==current||signal.aborted)return;
        estimates=computed;
        action('reveal').disabled=false;
        status.textContent='Reconstruction complete in '+number(performance.now()-started,0)+' ms including worker overhead. Original values are still hidden.';
        updateResults();
      }
      if(step==='reveal'){
        revealed=true;
        action('reveal').disabled=true;
        status.textContent='Originals revealed. Positive signed errors are overestimates.';
        updateResults();
      }
      if(step==='benchmark'){
        const note=get('[data-proof-benchmark-status]');
        const mode=control('proof-mode').value;
        action('benchmark').disabled=true;
        note.textContent='Running the fixed masks and all four methods…';
        try {
          const benchmark=await request({kind:'benchmark',rows:data.series[region],variable:variable.id,mode});
          if(signal.aborted)return;
          note.textContent=modeName(mode)+' · '+place+' · '+benchmark.start+'–'+benchmark.end+' masked targets · '+number(benchmark.runtime,0)+' ms in this browser.';
          get('[data-proof-benchmark]').innerHTML=renderBenchmark(benchmark,unit);
        } finally {
          action('benchmark').disabled=false;
        }
      }
    } catch(error) {
      if(signal.aborted)return;
      if(step==='benchmark')get('[data-proof-benchmark-status]').textContent=error.message;
      else status.textContent=error.message;
      if(step==='estimate'&&trial)action('estimate').disabled=false;
    }
  },{signal});
  control('proof-date').addEventListener('change',preview,{signal});
  toggle.addEventListener('change',()=>{
    toggle.parentElement.lastChild.textContent=toggle.checked?' Topology on':' Topology off';
    if(estimates)updateResults();
  },{signal});
  reset();
  return ()=>{
    cancel.abort();
    geometryCleanup?.abort();
    worker?.terminate();
    for(const callback of waiting.values())callback.reject(new Error('Experiment closed.'));
    waiting.clear();
  };
}

function renderBenchmark(benchmark,unit) {
  const rows=benchmark.comparisons.map(group=>{
    const ph=group.metrics.find(m=>m.method==='ph'), geom=group.metrics.find(m=>m.method==='geometry');
    const geometricErrors=new Map(geom.errors.map(row=>[row.date,row.error]));
    const paired=ph.errors.filter(row=>geometricErrors.has(row.date));
    const delta=paired.length?paired.reduce((sum,row)=>sum+Math.abs(row.error)-Math.abs(geometricErrors.get(row.date)),0)/paired.length:null;
    const verdict=delta===null?'No shared estimates':Math.abs(delta)<0.005?'Similar point estimates':delta<0?'Lower measured H1 MAE':'Higher measured H1 MAE';
    return '<tr><th scope="row">'+escape(group.name)+'</th>'+group.metrics.map(m=>'<td>'+resultText(m.mae)+' / '+resultText(m.rmse)+'<small>'+m.n+' of '+m.total+' estimated</small></td>').join('')+'<td>'+resultText(delta)+'<small>'+verdict+' · n='+paired.length+'</small></td></tr>';
  }).join('');
  return '<div class="table-scroll" tabindex="0" role="region" aria-label="Scrollable comparison table"><table class="research-table compact"><caption>MAE / RMSE ('+unit+') · H1 minus geometry MAE</caption><thead><tr><th>Mask group</th><th>Climatology</th><th>Adjacent</th><th>Geometry</th><th>H1 assisted</th><th>Paired difference</th></tr></thead><tbody>'+rows+'</tbody></table></div><p>These are descriptive results on prespecified masks. Trials share observations and the sample is small, so differences do not establish a statistically reliable or generalizable improvement.</p>';
}

