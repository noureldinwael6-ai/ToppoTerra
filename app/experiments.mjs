import {escape,number,plot,bindCharts} from './charts.mjs';
import {isolateObservation,reconstruct,methodNames,reconstructionMetrics} from './reconstruction-engine.mjs';
import {annualSeries,fitTrend} from './science.mjs';
import {runTopologyAsync} from './topology.mjs';

const titles={reconstruction:'Missing-Value Reconstruction',scenario:'What-If Studio',prediction:'Environmental Prediction Lab'};
export function mountExperiment(root,page,data,config){
  const region=config.region==='compare'?data.regions[0].id:config.region;
  const variable=data.variables.find(v=>v.id===config.variable);
  const archive=data.series[region];
  const rows=archive.filter(r=>r.year>=config.start&&r.year<=config.end);
  root.innerHTML='<div class="shell workspace"><header class="page-head"><div><a class="back" href="#topology">← Research Lab</a><h1>'+titles[page]+'</h1><p>'+escape(data.regions.find(r=>r.id===region).name)+' · NOAA NCEI nClimDiv · '+escape(variable.label)+' ('+escape(variable.unit)+')</p></div></header><section class="panel figure-panel"></section></div>';
  const panel=root.querySelector('section');
  if(page==='prediction'){
    panel.innerHTML='<h2>Forecast unavailable</h2><p>The statewide archive contains monthly temperature means and precipitation totals. It cannot identify daily heatwave or heavy rainfall events. A chronological monthly dry-event model comparison is pending.</p><p><a href="#outlook">Open annual temperature Future Outlook ↗</a></p><a href="#benchmark">Inspect the existing structural-change replay ↗</a>';
    return;
  }
  const dates=rows.map(r=>'<option>'+r.date+'</option>').reverse().join('');
  panel.innerHTML='<form class="controls"><label>Observation month<select name="experiment-date">'+dates+'</select></label>'+ (page==='scenario'?'<label>Hypothetical value ('+escape(variable.unit)+')<input required type="number" step="any" name="scenario-value"></label><button class="button primary" data-step="apply">Run scenario</button>':'<label>Information available<select name="experiment-mode"><option value="retrospective">Retrospective</option><option value="prospective">Prospective · past only</option></select></label><button class="button primary" data-step="mask">Hide value</button><button class="button" data-step="estimate" disabled>Reconstruct</button><button class="button" data-step="reveal" disabled>Reveal original</button>')+'<button class="button ghost" data-step="reset">Reset</button></form><div class="experiment-output" aria-live="polite"></div>';
  const output=panel.querySelector('.experiment-output');
  const date=panel.querySelector('[name="experiment-date"]');
  const mode=panel.querySelector('[name="experiment-mode"]');
  const btn=step=>panel.querySelector('[data-step="'+step+'"]');
  let trial,results,version=0;
  const key=variable.id;
  function reset(){
    version++;trial=results=null;output.replaceChildren();date.disabled=false;
    if(mode){mode.disabled=false;btn('estimate').disabled=true;btn('reveal').disabled=true;btn('mask').disabled=false;}
  }
  function show(reveal){
    const result=results[0];
    const metrics=reveal?reconstructionMetrics(results,trial.truth):[];
    const target=archive.findIndex(r=>r.date===result.date);
    const visible=archive.slice(Math.max(0,target-7),target+8);
    output.innerHTML='<h2>'+escape(result.date)+'</h2><p>'+ (reveal?'Original: '+number(trial.truth[result.date])+' '+escape(variable.unit)+'.':'The original remains hidden.')+'</p><ul>'+Object.entries(result.estimates).map(([method,estimate],i)=>'<li>'+methodNames[method]+': '+number(estimate.value)+' '+escape(variable.unit)+(reveal?' · absolute error '+number(metrics[i].mae):'')+'</li>').join('')+'</ul><p>H1-assisted analogs use persistent geometry to rank comparable contexts. These estimates have no calibrated uncertainty interval.</p>'+plot([{label:'Observed',points:visible.map(r=>({x:r.year+(r.month-1)/12,y:r.date===result.date?null:r[key]}))},{label:'H1-assisted estimate',color:'#c8b3fa',dots:true,points:[{x:archive[target].year+(archive[target].month-1)/12,y:result.estimates.ph.value}]}],{title:'Reconstruction context',yLabel:variable.unit});
    bindCharts(output);
  }
  panel.addEventListener('click',async event=>{
    const step=event.target.closest('[data-step]')?.dataset.step;
    if(!step)return;
    event.preventDefault();
    try{
      if(step==='reset'){reset();return;}
      if(step==='mask'){
        trial=isolateObservation(archive,key,[date.value]);
        date.disabled=mode.disabled=btn('mask').disabled=true;btn('estimate').disabled=false;
        output.textContent=date.value+' · experimentally masked';return;
      }
      if(step==='estimate'){
        results=reconstruct(trial.values,[date.value],mode.value);
        btn('reveal').disabled=false;show(false);return;
      }
      if(step==='reveal'){show(true);return;}
      const input=panel.querySelector('[name="scenario-value"]');
      const value=input.valueAsNumber;
      if(!Number.isFinite(value)||value<(key==='precip'?0:-70)||value>(key==='precip'?2000:65))throw new Error('Enter a finite value in the displayed unit and a plausible monthly range.');
      const original=archive.find(r=>r.date===date.value);
      const anomaly=variable.anomalyKey;
      const edited=archive.map(r=>r===original?{...r,[key]:value,[anomaly]:r[anomaly]+value-r[key]}:r);
      const trend=series=>fitTrend(annualSeries(series.filter(r=>r.year>=config.start&&r.year<=config.end),key));
      const options={baseline:data.baseline,startYear:config.start,endYear:config.end,lagCount:3,direction:'past'};
      const series=items=>items.map(r=>({date:r.date,value:r[anomaly]}));
      const current=++version;
      output.textContent='Computing persistence…';
      const before=await runTopologyAsync(series(archive),null,options);
      const after=await runTopologyAsync(series(edited),null,{...options,referenceScales:before.scales});
      if(current!==version||!panel.isConnected)return;
      const a=trend(archive),b=trend(edited);
      output.innerHTML='<h2>User-supplied scenario</h2><p>'+escape(original.date)+' · '+number(original[key])+' → '+number(value)+' '+escape(variable.unit)+'</p><p>Descriptive annual slope: '+number(a.rate)+' → '+number(b.rate)+' '+escape(variable.unit)+'/decade. Scenario forecast unavailable.</p>'+plot([{label:'Observed',points:annualSeries(rows,key).map(r=>({x:r.year,y:r.value}))},{label:'Hypothetical',color:'#c8b3fa',points:annualSeries(edited.filter(r=>r.year>=config.start&&r.year<=config.end),key).map(r=>({x:r.year,y:r.value}))}],{title:'Observed and hypothetical annual series',yLabel:variable.unit})+plot([before,after].map((model,i)=>({label:i?'Hypothetical':'Observed',color:i?'#c8b3fa':'#a9ebca',points:model.windows.map(w=>({x:Number(w.end.slice(0,4)),y:w.maxH1}))})),{title:'Longest finite H1 feature by window',yLabel:'Persistence lifetime'});
      bindCharts(output);
    }catch(error){output.textContent=error.message;}
  });
  return ()=>{version++;};
}

