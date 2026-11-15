import {analyze,filters} from './analysis.mjs';
import {escape,plot,bindCharts} from './charts.mjs';
import {runTopologyAsync} from './topology.mjs';
import {monthlySeries} from './science.mjs';
import {compareH1,comparisonShape} from './lab-figures.mjs';
import {buildOutlook} from './outlook-model.mjs';

const green='#a9ebca', purple='#c8b3fa', amber='#edb688';
const endX=date=>Number(date.slice(0,4))+(Number(date.slice(5,7))-1)/12;
const fmt=(value,d=4)=>Number.isFinite(value)?value.toFixed(d):'Unavailable';
const pFormat=(value,d)=>Number.isFinite(value)?value>0&&value<10**(-d)?value.toExponential(d):value.toFixed(d):'Unavailable';
const choices=(values,selected,suffix='')=>values.map(value=>'<option value="'+value+'" '+(value===selected?'selected':'')+'>'+value+suffix+'</option>').join('');
const select=(name,label,options)=>'<label>'+label+'<select name="'+name+'">'+options+'</select></label>';
const rawPanel=result=>'<details class="evidence"><summary>Advanced details · raw numbers and provenance</summary><pre class="research-trace">'+escape(JSON.stringify(result,null,2))+'</pre><button type="button" class="button ghost" data-research-export>Download calculation JSON</button></details>';
const paper=(title,body,note)=>'<section class="panel figure-panel"><h2>'+title+'</h2>'+body+'<details class="evidence"><summary>How to read this figure</summary><p>'+note+'</p></details></section>';

function attachExport(target,trace,name){
  target.querySelector('[data-research-export]')?.addEventListener('click',()=>{
    const href=URL.createObjectURL(new Blob([JSON.stringify(trace,null,2)],{type:'application/json'}));
    const link=document.createElement('a');
    link.href=href;link.download=name+'.json';link.click();
    setTimeout(()=>URL.revokeObjectURL(href),500);
  });
}
function header(title,sub) {
  return '<header class="page-head"><div><a class="back" href="#analysis">← Public Explorer</a><p class="eyebrow lab-text">Research analysis</p><h1 tabindex="-1">'+title+'</h1><p>'+sub+'</p></div><div class="head-actions"><a class="button ghost" href="#comparison">Method comparison</a><a class="button ghost" href="#outlook">Future Outlook</a></div></header>';
}

export function comparisonEvidence(record,topology,index) {
  const window=topology?.windows[index];
  return {traditional:record.trend,
    native:window?{start:window.start,end:window.end,h1Distance:window.referenceChange,
      distanceToPrevious:window.change,maximumH1:window.maxH1,anchors:window.points.length,
      features:window.features,points:window.points,dates:window.dates}:null,
    independentSlope:null,independentTrendP:null,structuralP:null};
}

export function mountComparison(root,data,config,lab) {
  const model=analyze(data,{...config,method:'ols'});
  const controller=new AbortController();
  let selected=model.records.find(r=>r.id===lab.region)??model.records[0];
  let digits=4, width=lab.width??4,stride=lab.step??12,show=true,uncertainty=true,windowIndex=-1;
  let result=null, seq=0, elapsed=null, error=null;
  const variable=model.variable, unit=variable.annualUnit;
  root.innerHTML='<div class="shell workspace research-method">'+header('Traditional vs Topo-Signal','One climate record, two questions. Trend inference measures direction. Topology measures changes in the geometry of monthly anomalies.')
    +filters(data,{...config,method:'ols'},{hideMethod:true})+'<form class="controls comparison-controls">'
    +(model.records.length>1?select('method-state','Compare region',model.records.map(r=>'<option value="'+r.id+'" '+(r.id===selected.id?'selected':'')+'>'+escape(r.name)+'</option>').join('')):'')
    +select('method-width','Window',choices([2,4,5,8,10],width,' years'))+select('method-stride','Stride',choices([6,12,24],stride,' months'))
    +select('method-digits','Display precision',choices([2,4,6],digits,' decimals'))
    +'<label class="research-check"><input type="checkbox" data-method-topology checked> Show topology</label><label class="research-check"><input type="checkbox" data-method-interval checked> Show uncertainty</label></form><p class="source-line" role="status" data-comparison-status></p><div data-comparison-results></div></div>';
  const target=root.querySelector('[data-comparison-results]');
  const status=root.querySelector('[data-comparison-status]');
  function paint(){
    if(controller.signal.aborted)return;
    const index=windowIndex<0?(result?.windows.length??1)-1:windowIndex;
    const evidence=comparisonEvidence(selected,result,index);
    const t=evidence.traditional,w=evidence.native;
    const footprint=escape(selected.name)+' · '+escape(selected.sourceGeography)+' · '+escape(variable.label)+' · '+config.start+'–'+config.end+' · '+escape(data.version);
    const domain=[config.start,config.end+11/12];
    const opts={xDomain:domain,formatX:String,tipDigits:6};
    const values=selected.monthly.map(r=>({x:r.year+(r.month-1)/12,y:r.value}));
    const annual=config.resolution==='annual';
    const observedUnit=annual?unit:variable.unit;
    const climate=plot([{label:annual?'Annual observations':'Monthly observations',color:green,
      points:annual?selected.annual.map(r=>({x:r.year,y:r.value})):values,gap:annual?1.01:.09},
      ...(annual?[{label:'OLS fit on annual values',color:amber,dash:true,points:t.fitted.map(r=>({x:r.year,y:r.value,lo:uncertainty?r.lo:null,hi:uncertainty?r.hi:null}))}]:[])],
      {...opts,title:'Shared observations and conventional fit',yLabel:(config.anomaly?'Anomaly':'Value')+' ('+observedUnit+')',tipUnit:observedUnit});
    const rolling=result?.windows.map(entry=>{
      const samples=data.series[selected.id].filter(r=>r.date>=entry.start&&r.date<=entry.end);
      const monthly=monthlySeries(samples,variable.id,config.anomaly);
      const mapped=monthly.filter(r=>Number.isFinite(r.value)).map(r=>[r.year*12+r.month-1,r.value]);
      const centered=(list,i)=>list.reduce((s,p)=>s+p[i],0)/list.length;
      const support=mapped.length;
      // Same calendar-month window. Seasonal departures are used for this descriptive comparator.
      const departures=samples.map(r=>[r.year*12+r.month-1,r[variable.anomalyKey]]).filter(r=>Number.isFinite(r[1]));
      const dx=centered(departures,0),dy=centered(departures,1);
      const cov=departures.reduce((s,[x,y])=>s+(x-dx)*(y-dy),0);
      const denom=departures.reduce((s,[x])=>s+(x-dx)**2,0);
      return {date:entry.end,h1:entry.referenceChange,monthlySlope:denom?120*cov/denom:null,n:support};
    })??[];
    const interval=t.ci?t.ci.map(v=>fmt(v,digits)).join(' to '):'Unavailable';
    const mask=result?'<label>Inspect calculated window <select name="method-window">'+result.windows.map((entry,i)=>
      '<option value="'+i+'" '+(i===index?'selected':'')+'>'+entry.start.slice(0,7)+' to '+entry.end.slice(0,7)+'</option>').join('')+'</select></label>':'';
    const matrix='<section class="panel figure-panel"><h2>Historical trend · conventional inference</h2><p class="rate">'+fmt(t.olsRate,digits)+' <small>'+escape(unit)+'/decade</small></p><p>OLS on '+t.n+' complete annual observations · Theil–Sen '+fmt(t.senRate,digits)+' '+escape(unit)+'/decade</p>'
      +(uncertainty?'<p>95% OLS slope interval · '+interval+'</p>':'')
      +'<p>Raw OLS p-value <strong>'+pFormat(t.p,digits)+'</strong> · H₀: annual linear slope is zero.</p><p>Newey–West uncertainty accounts for short-range lag dependence. Mann–Kendall p '+pFormat(t.mk?.p,digits)+' describes monotonic rank ordering under an independence assumption. It can differ from the HAC test of a linear slope because the statistic and dependence assumptions differ.</p></section>'
      +'<section class="panel figure-panel"><h2>Topo-Signal structural analysis</h2>'+(show?'<p class="rate">'+fmt(w?.h1Distance,digits)+' <small>H1 diagram distance</small></p><p>'+(w?escape(w.start.slice(0,7)+' to '+w.end.slice(0,7))+' · '+w.anchors+' delay vectors':escape(error??result?.reason??'Computing geometry…'))+'</p>'
      +'<p>Structural p-value · exploratory, no valid p-value for this selection. A stable-process null would require dependence-aware, whole-path calibration.</p><p>Topology-assisted slope and trend p-value · <strong>Not independently computed</strong>.</p>':'<p>Topology display is off. The conventional trend uses the same inputs and retains the same values.</p>')+'</section>';
    const trace={dataset:data.version,source:data.provenance.source,inputSha256:data.provenance.readyCsvSha256,selection:{...config,method:'ols',region:selected.id},footprint:selected.sourceGeography,months:selected.monthly.length,
      missingMonths:selected.monthly.filter(r=>!Number.isFinite(r.value)).length,imputed:0,baseline:data.baseline,elapsedMilliseconds:elapsed,
      conventionalMethod:'Annual OLS / Newey–West HAC, with Sen and descriptive MK',traditional:evidence.traditional,
      topology:{algorithm:'Euclidean Vietoris–Rips GF(2), finite H1 bottleneck distance',delay:lab.delay,widthMonths:width*12,stride,direction:'trailing',
        reference:result?.reference&&{start:result.reference.start,end:result.reference.end,features:result.reference.features},scales:result?.scales,
        selected:evidence.native,structuralP:null,assistedSlope:null,assistedTrendP:null,rolling}};
    const rollingView=show&&result?paper('Rolling window evidence',mask+plot([{label:'H1 distance to reference',color:purple,dots:true,gap:stride/12+.01,points:rolling.map(r=>({x:endX(r.date),y:r.h1}))}],{...opts,title:'H1 distance to reference',yLabel:'Standardized distance',zero:true})+
      plot([{label:'Matched monthly anomaly OLS slopes',color:amber,dots:true,gap:stride/12+.01,points:rolling.map(r=>({x:endX(r.date),y:r.monthlySlope}))}],{...opts,title:'Descriptive anomaly slope on matched rolling windows',yLabel:variable.unit+'/decade'}),
      'The charts share dates but measure different quantities. Values are plotted at window end. Each month in a complete window contributes to its anomaly slope; persistence uses up to 30 trailing three-coordinate delay vectors. The first eligible score follows a complete window. Skipped windows: '+result.skipped+'. Overlapping windows reuse observations. Neither rolling series supplies a significance test.'):'';
    let geometry='';
    if(show&&w&&result.reference){
      const ref=result.reference;
      const bound=Math.max(1,...ref.points.concat(w.points).flat().map(Math.abs));
      const axes=['z(t)','z(t − '+lab.delay+' months)'];
      geometry=paper('Reference and selected geometry','<div class="split"><figure>'+comparisonShape(ref,bound,axes)+'<figcaption>Reference · '+ref.start.slice(0,7)+' to '+ref.end.slice(0,7)+'</figcaption></figure><figure>'+comparisonShape(w,bound,axes)+'<figcaption>Selected · '+w.start.slice(0,7)+' to '+w.end.slice(0,7)+'</figcaption></figure></div>'+compareH1(ref,w)+'<p><a href="#topology" data-method-inspect>Inspect this window’s linked 3D points, barcode and Rips filtration ↗</a></p>','Both XY projections share a scale. H1 distances use all three coordinates. The geometry contributes a structural descriptor, with no change to the measured trend.');
    }
    target.innerHTML='<p class="source-line">'+footprint+' · observed archive · no imputation</p>'+'<p><a class="button primary" href="#proof">See if topology actually helps ↗</a></p>'+matrix+paper('Shared climate record',climate,
      'Both methods draw from these statewide observations. Trend inference uses annual averages for temperature and annual totals for precipitation. Topology uses monthly departures from the fixed calendar-month climatology. The OLS band is for the fitted mean.')+rollingView+geometry
      +paper('Why Topo-Signal?', '<p>Recorded months → documented quality checks → fixed seasonal anomalies → trailing delay coordinates → H0/H1 intervals → H1 distance. A withheld-value experiment compares analog ranking with and without that persistent feature.</p><a href="#proof">See measured reconstruction differences ↗</a> · <a href="#benchmark">See detector results and timings ↗</a>', 'Topology adds a separate structural view. There is no slope or p-value subtraction between different hypotheses.')+rawPanel(trace);
    target.querySelector('[data-method-inspect]')?.addEventListener('click',()=>{
      lab.joint=false;
      lab.region=selected.id;
      lab.window=index;
    });
    attachExport(target,trace,'ToppoTerra-method-comparison');
    bindCharts(target);
  }
  async function calculate(){
    const id=++seq;
    result=null;error=null;elapsed=null;
    status.textContent=show?'Computing Topo-Signal for '+selected.name+'…':'';
    paint();
    if(!show)return;
    const started=performance.now();
    try {
      const value=await runTopologyAsync(monthlySeries(data.series[selected.id],variable.id,true),null,
        {baseline:data.baseline,startYear:config.start,endYear:config.end,windowSize:width*12,step:stride,delay:lab.delay,lagCount:3,direction:'past'});
      if(id!==seq||controller.signal.aborted)return;
      result=value;elapsed=performance.now()-started;
      lab.window=windowIndex<0?Math.max(0,value.windows.length-1):windowIndex;
    } catch(reason) {
      if(id!==seq||controller.signal.aborted)return;
      error=reason.message;
    }
    status.textContent=error?'Topology failed to calculate.':result?.reason??'Topology calculation complete.';
    paint();
  }
  root.querySelector('.research-method').addEventListener('change',event=>{
    const input=event.target;
    switch(input.name){
      case 'method-state':selected=model.records.find(r=>r.id===input.value);lab.region=selected.id;break;
      case 'method-width':width=Number(input.value);lab.width=width;break;
      case 'method-stride':stride=Number(input.value);lab.step=stride;break;
      case 'method-digits':digits=Number(input.value);paint();return;
      case 'method-window':windowIndex=Number(input.value);lab.window=windowIndex;paint();return;
      default:
        if(input.matches('[data-method-interval]')){uncertainty=input.checked;paint();return;}
        if(input.matches('[data-method-topology]')){show=input.checked;if(result||!show)paint();else calculate();return;}
        return;
    }
    windowIndex=-1;
    calculate();
  },{signal:controller.signal});
  calculate();
  return ()=>controller.abort();
}

const outlookCache=new WeakMap();

export function mountOutlook(root,data,config){
  const controller=new AbortController();
  const selected=config.region==='compare'?data.regions[0].id:config.region;
  root.innerHTML='<div class="shell workspace research-method">'+header('Future Outlook','Experimental projections of statewide annual mean temperature. The latest actual record ends before 2026.')
    +'<form class="controls">'+select('outlook-state','State',data.regions.map(r=>'<option value="'+r.id+'" '+(r.id===selected?'selected':'')+'>'+escape(r.name)+'</option>').join(''))+
    select('outlook-horizon','Years after last observed year',choices([2,3],2))+'<label>Historical issue<select name="outlook-replay"></select></label></form><div data-outlook-results aria-live="polite"></div></div>';
  const shell=root.querySelector('.research-method');
  const target=shell.querySelector('[data-outlook-results]');
  const field=name=>shell.querySelector('[name="outlook-'+name+'"]');
  let revealed=false;
  function paint(refresh=false){
    const id=field('state').value;
    const rows=data.series[id];
    if(!outlookCache.has(rows))outlookCache.set(rows,buildOutlook(rows));
    const model=outlookCache.get(rows);
    const arm=model.horizons.find(h=>h.horizon===Number(field('horizon').value));
    const place=escape(data.regions.find(r=>r.id===id).name);
    if(refresh) {
      field('replay').innerHTML='<option value="">Latest archive · projection</option>'+arm.replay.map(r=>'<option value="'+r.issue+'">'+r.issue+' → '+r.target+'</option>').reverse().join('');
      revealed=false;
    }
    const past=Boolean(field('replay').value);
    const output=past?arm.replay.find(r=>r.issue===Number(field('replay').value)):arm.projection;
    const caption=past?'Historical replay · outcome withheld':'Experimental statistical projection';
    const estimates=[['conventional','Conventional',amber],['topology','Conventional + H1',purple]];
    const series=output?[{label:'Observed annual temperature through issue',color:green,dots:true,points:model.annual.filter(r=>r.year<=output.issue).map(r=>({x:r.year,y:r.value}))},
      ...estimates.flatMap(([key,label,color])=>{
        const radius=output.bands[key],y=output[key];
        return [{label,color,dots:true,whiskers:true,points:[{x:output.target,y,lo:y-radius,hi:y+radius}]}];
      }),...(past&&revealed?[{label:'Revealed outcome',color:'#fff',dots:true,points:[{x:output.target,y:output.actual}]}]:[])]:[];
    const forecast=output?'<p class="eyebrow lab-text">'+caption+'</p><h3>'+output.target+' · '+output.horizon+'-year horizon</h3><p>Issue uses archive through '+output.issue+' · H1 predictor '+fmt(output.h1,4)+' (standardized) · '+output.n+' training pairs · training targets end by '+output.cutoff+'.</p>'
      +'<div class="answer-grid compare">'+estimates.map(([key,label])=>'<section class="answer"><h3>'+label+'</h3><p class="rate">'+fmt(output[key],2)+' <small>°C</small></p><p>Empirical outcome range '+fmt(output[key]-output.bands[key],2)+' to '+fmt(output[key]+output.bands[key],2)+' °C</p>'
      +(past&&revealed?'<p>Actual '+fmt(output.actual,2)+' °C · signed error '+fmt(output[key]-output.actual,3)+' °C</p>':'')+'</section>').join('')+'</div>'
      +(past?'<button type="button" class="button ghost" data-outlook-reveal '+(revealed?'disabled':'')+'>Reveal held-out outcome</button>':'')+
      plot(series,{title:'Historical observations and isolated '+(past?'hindcast':'future projection'),yLabel:'Annual mean temperature (°C)',tipUnit:'°C',tipDigits:4,formatX:String,xDomain:[model.annual[0].year,output.target+0.6],boundary:output.issue+.5}):'<p>Unavailable for this horizon. This demo requires eight scored outcomes, eight prior calibration errors and at least 70% measured coverage for the conventional model’s nominal 80% empirical range. Historical replay remains available.</p>';
    const metrics=arm.metrics?'<div class="table-scroll" tabindex="0"><table class="research-table"><caption>'+arm.replay.length+' matched targets, '+arm.replay[0].target+'–'+arm.replay.at(-1).target+' · '+arm.horizon+' years ahead</caption><thead><tr><th>Model</th><th>MAE (°C)</th><th>RMSE (°C)</th><th>Bias (°C)</th><th>Range coverage</th></tr></thead><tbody>'+[...estimates,['persistence','Prior-year level']].map(([key,label])=>{
      const m=arm.metrics[key];
      return '<tr><th>'+label+'</th><td>'+fmt(m.mae,4)+'</td><td>'+fmt(m.rmse,4)+'</td><td>'+fmt(m.bias,4)+'</td><td>'+fmt(m.coverage*100,1)+'% ('+m.bounded+')</td></tr>';
    }).join('')+'</tbody></table></div><p>Conventional is the primary displayed projection. H1 minus conventional MAE '+fmt(arm.metrics.topology.mae-arm.metrics.conventional.mae,4)+' °C. Small, overlapping historical samples do not establish reliable forecast superiority. A negative difference means the H1 arm made smaller absolute errors in this replay.</p>':'<p>Insufficient matched historical validation.</p>';
    const trace={source:data.version,inputSha256:data.provenance.readyCsvSha256,state:id,version:model.version,horizon:arm.horizon,metrics:arm.metrics,
      selected:output?(past&&!revealed?Object.fromEntries(Object.entries(output).filter(([key])=>key!=='actual')):output):null};
    target.innerHTML='<p class="source-line">'+place+' · NOAA NCEI nClimDiv · annual means from 12 monthly observations · Last actual month '+escape(model.lastDate?.slice(0,7))+'</p>'
      +paper('Projection and replay',forecast,'Historical values stop at the selected issue boundary. The two models use the same ridge penalty and information cutoff. H1 adds the longest finite loop lifetime in a trailing four-year standardized monthly delay cloud. Ranges use each method’s own 80th percentile of earlier absolute errors for that horizon. They are empirical outcome ranges, without guaranteed coverage.')
      +paper('Chronological evaluation',metrics,'Every historical origin is refit on earlier labelled pairs. The issue’s four-year context is embargoed from training targets. Results are paired on the same outcomes. We use the finalized historical archive and cannot reproduce later data revisions as known at issue time.')+rawPanel(trace)
      +'<p>Supported research horizon: two to three years from the last observed year. Longer horizons and daily hazard risks are unavailable. These annual estimates are statistical extrapolations under the archived model, not initialized climate forecasts.</p>';
    if(past&&output&&!revealed){
      target.querySelector('[data-outlook-reveal]').addEventListener('click',()=>{revealed=true;paint();});
    }
    attachExport(target,trace,'ToppoTerra-outlook');
    bindCharts(target);
  }
  shell.addEventListener('change',event=>{
    revealed=false;
    paint(event.target!==field('replay'));
  },{signal:controller.signal});
  paint(true);
  return ()=>controller.abort();
}

