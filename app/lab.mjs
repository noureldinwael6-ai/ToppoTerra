import {learningIllustrations} from './learn.mjs';
import {monthSpan,structuralStatus,topologyExplanation} from './result-story.mjs';
import {colors} from './analysis.mjs';
import {escape as html,number} from './charts.mjs';
import {climateLagCorrelations,filtrationSummary,mountPhaseSpace,pointProvenance,ripsEdges,shiftMonth} from './phase-space.mjs';
import {bettiFigure,compareH1,comparisonShape,featureDescription,lagGraph,overviewGraph,persistenceViews,sourceGraph,windowGraph} from './lab-figures.mjs';

const year = date => Number(date.slice(0,4));
const period = window => window.start.slice(0,7)+' to '+window.end.slice(0,7);
const option = (value,label,current) => '<option value="'+html(value)+'" '+(String(value)===String(current)?'selected':'')+'>'+html(label)+'</option>';
const fmt = (n,decimals=3) => html(number(n,decimals));
let mountedState;

function topWindow(windows, metric) {
  return windows.reduce((best,w,i)=>Number.isFinite(w[metric])&&(!Number.isFinite(windows[best][metric])||w[metric]>windows[best][metric])?i:best,0);
}

function labels(result, variable) {
  const prefix=variable.id==='tavg'?'Temperature':'Precipitation';
  const sign=result.direction==='past'?'−':'+';
  return [prefix+' z(t)','z(t '+sign+' '+result.delay+' mo)','z(t '+sign+' '+2*result.delay+' mo)'];
}

function renderPointGeometry(window, result, variable, item, variables) {
  const axes = labels(result,variable);
  const channels = variables.map(v=>v.label.toLowerCase()).join(' and ');
  const explanation = result.dimensions===3
    ? 'Three coordinates use '+html(channels)+' at the anchor month and the two preceding lag dates.'
    : 'The camera displays the primary variable’s three coordinates. Persistence and filtration use all '+result.dimensions+' coordinates from '+html(channels)+'.';
  return '<section class="panel lab-detail phase-detail" aria-labelledby="phase-title"><div class="lab-section-head"><div><div class="eyebrow lab-text">'+html(item.name)+' · '+period(window)+'</div><h2 id="phase-title">Climate phase space</h2></div><p>'+explanation+' The axes measure standardized departures from the baseline.</p></div>'
    +'<div class="phase-layout"><div class="phase-stage"><div class="phase-stage-head"><span>'+window.points.length+' embedded anchors</span><span>'+result.dimensions+'D embedding · τ '+result.delay+' mo</span></div>'
    +'<svg class="lab-phase" viewBox="0 0 660 390" role="group" tabindex="0" aria-label="Interactive 3D delay-coordinate point cloud. Use arrow keys to select a point and Shift plus arrows to orbit." data-phase-camera-view><path class="phase-grid"/><path class="phase-edges"/><g class="phase-axes"/><path class="phase-trajectory"/><path class="phase-selection"/><g class="phase-points"/></svg>'
    +'<div class="phase-controls" aria-label="Camera controls"><span class="phase-date-key"><i></i> Earlier to later</span><button type="button" class="button ghost slim" data-phase-camera="out" aria-label="Zoom out">−</button><button type="button" class="button ghost slim" data-phase-camera="in" aria-label="Zoom in">+</button><button type="button" class="button ghost slim" aria-pressed="false" data-phase-camera="pan">Pan</button><button type="button" class="button ghost slim" aria-pressed="false" data-phase-flat>Show XY</button><button type="button" class="button ghost slim" data-phase-camera="reset">Reset</button></div>'
    +'<p class="lab-caption phase-help">Drag to orbit. Select a dot or use the anchor menu. The line follows the sampled anchors in calendar order.</p></div>'
    +'<aside class="point-panel" aria-labelledby="point-title"><h3 id="point-title">Point inspector</h3><label>Anchor month<select data-phase-select aria-label="Anchor month">'+window.dates.map((date,i)=>option(i,(i+1)+' · '+date.slice(0,7),0)).join('')+'</select></label><div data-point-inspector aria-live="polite"></div></aside></div>'
    +'<div class="rips-control"><div><h3>Grow the filtration</h3><p>At ε, edges join pairs no farther apart than the chosen distance. Three pairwise joins form a triangle.</p></div><label>Distance ε <output data-rips-value for="lab-epsilon">0</output><input id="lab-epsilon" data-rips-scale type="range" min="0" max="1" value="0" step="0.01"></label><p data-rips-summary aria-live="polite"></p></div></section>';
}

function renderSource(window, rows, variables, result) {
  const active = rows.filter(r=>r.date>=window.start&&r.date<=window.end);
  const anchorByDate = new Map();
  const sign=result.direction==='past'?-1:1;
  for(let lag=0;lag<result.lagCount;lag++) {
    window.dates.forEach((date,i)=>{
      const real=shiftMonth(date,sign*lag*result.delay);
      if(!anchorByDate.has(real))anchorByDate.set(real,i);
    });
  }
  return '<section class="panel lab-detail" aria-labelledby="source-points-title"><div class="lab-section-head"><div><div class="eyebrow">Source observations</div><h2 id="source-points-title">From month to point</h2></div><p>Select a colored month to locate an embedding that uses it. The bright rings mark each of the selected point’s source months.</p></div>'
    +'<div class="source-points-grid">'+variables.map(v=>sourceGraph(active,v,anchorByDate)).join('')+'</div><p class="source-line">NOAA NCEI nClimDiv statewide monthly observations · '+period(window)+' · color rings link to the selected delay vector</p></section>';
}

export function renderLab(data, config, model, lab, result) {
  const {variable,records} = model;
  const item = records.find(record=>record.id===lab.region) ?? records[0];
  const companion = data.variables.find(v=>v.id!==variable.id);
  const variables = lab.joint ? [variable,companion] : [variable];
  const windows = result?.windows ?? [];
  const hasReference = Boolean(result?.reference);
  const index = Math.min(lab.window ?? topWindow(windows,'change'),Math.max(0,windows.length-1));
  const selected = windows[index];
  const reference = result?.reference;
  const human = html(item.name);
  mountedState = selected ? {data,item,variables,selected,result,index} : null;

  const header='<header class="page-head research-head"><div><a class="back" href="#analysis">← Public Explorer</a><div class="eyebrow lab-text">'+human+' · '+config.start+'–'+config.end+'</div><h1 tabindex="-1">Advanced Research Lab</h1><p>Follow the changing geometry of monthly climate records, from individual observations to persistent features.</p></div><div class="head-actions"><button class="button lab-button" data-action="rain-case">California rain example</button><button class="button ghost" data-action="save-lab">Save investigation</button><a class="button ghost" href="#methods">Read methods ↗</a></div></header>';
  const nav='<nav aria-label="Advanced research sections" class="research-nav"><span aria-current="page">Topology Explorer</span><a href="#comparison">Traditional vs Topo-Signal ↗</a><a href="#outlook">Future Outlook ↗</a><a href="#proof">Topo-Signal Proof Lab ↗</a><a href="#benchmark">Early detection & benchmark ↗</a><a href="#research-dynamics" data-lab-scroll="research-dynamics">Multivariable dynamics</a><a href="#research-heatwave" data-lab-scroll="research-heatwave">Heatwave research</a><a href="#methods">Methods & validation ↗</a></nav>';
  const controls='<form class="controls lab-controls" aria-label="Topo-Signal settings">'+(records.length>1?'<label>Region<select name="lab-region">'+records.map(r=>option(r.id,r.name,item.id)).join('')+'</select></label>':'')+'<label>Embedding<select name="lab-joint">'+option(false,variable.label,lab.joint)+option(true,'Temperature + precipitation',lab.joint)+'</select></label><label>Window<select name="lab-width">'+[2,4,5,8,10].map(n=>option(n,n+' years',lab.width??4)).join('')+'</select></label><label>Stride<select name="lab-step">'+[6,12,24].map(n=>option(n,n+' months',lab.step??12)).join('')+'</select></label><label>Delay<select name="lab-delay">'+[1,3,6].map(n=>option(n,n+(n===1?' month':' months'),lab.delay)).join('')+'</select></label>'+(selected?'<label>Inspect window<select name="lab-window">'+windows.map((w,i)=>option(i,period(w),index)).join('')+'</select></label>':'')+'</form>';
  const intro='<div class="lab-sequence"><span>Monthly values</span><span>Seasonal anomalies</span><span>Lagged coordinates</span><span>Distance filtration</span><span>Persistence</span><span><a href="#benchmark">Matched comparison ↗</a></span></div>';
  const caveat='<div class="caveat"><span class="tag possible">Experimental</span><p>Geometry can change with variability, lag, or sampling. Historical structure is exploratory. Visit the benchmark for the separate calibrated detector experiment.</p></div>';
  let view='<div class="panel empty" role="status">'+html(result?.error ?? result?.reason ?? 'Computing persistent homology from monthly anomalies…')+'</div>';
  if (selected) {
    const feature = selected.features.findIndex(f=>f.dimension===1);
    const referenceId = hasReference ? 'Frozen reference '+period(reference) : 'Frozen reference unavailable';
    const score = Number.isFinite(selected.referenceChange) ? fmt(selected.referenceChange) : '—';
    const peakIndex=topWindow(windows,'change');
    const max=windows[peakIndex];
    const changed=Number.isFinite(max?.change)
      ? 'Peak adjacent distance '+fmt(max.change)+' compares '+monthSpan(windows[peakIndex-1])+' with '+monthSpan(max)+'.'
      : 'Adjacent comparisons require consecutive complete windows.';
    const channel=variables.map(v=>v.label).join(' and ');
    const previous=windows[index-1];
    const interpretation=topologyExplanation({result,window:selected,reference,distance:selected.referenceChange,channel,title:'Read the frozen-reference distance'})
      +topologyExplanation({result,window:selected,reference:previous,distance:selected.change,channel,title:'Read the adjacent-window distance'});
    const reading='<div class="answer-grid compare">'+'<section class="answer"><h3>Conventional inference</h3><p>See the shared OLS slope, confidence interval and raw p-value in the <a href="#comparison">method comparison</a>.</p></section>'+'<section class="answer lab-answer"><div class="answer-top"><span class="series-name"><i style="--dot:'+colors.lab+'"></i>Structural comparison</span><span class="tag possible">Exploratory H<sub>1</sub></span></div><p class="rate">'+score+' <small>H<sub>1</sub> bottleneck distance</small></p><p class="answer-copy">Comparing '+period(selected)+' with '+monthSpan(reference)+'. '+changed+'</p><div class="answer-bottom"><span>Windows analyzed <b>'+windows.length+'</b></span><span>Skipped <b>'+result.skipped+'</b></span></div></section></div>';
    const scope = html('NOAA NCEI nClimDiv · '+item.name+' · '+variables.map(v=>v.label).join(' + ')+' · '+period(selected));
    const bounds = Math.max(1,Math.ceil(Math.max(...selected.points.concat(reference?.points??[]).flat().map(Math.abs))));
    const axes = labels(result,variable);
    view = renderPointGeometry(selected,result,variable,item,variables)
      +'<section class="panel lab-detail result-story"><h2>What changed in the reconstructed shape?</h2>'+reading+(interpretation?'<p class="story-evidence">'+structuralStatus+'</p>'+interpretation:'<p>Two eligible diagrams are required to measure a structural difference.</p>')+'</section>'
      +renderSource(selected,data.series[item.id],variables,result)
      +persistenceViews(selected.features,Math.max(0,feature),scope)
      +bettiFigure(selected.features,scope)
      +'<section class="panel lab-detail"><div class="lab-section-head"><div><div class="eyebrow lab-text">Windowed geometry</div><h2>Structural change over time</h2></div><p>Choose a window on either score plot to update the point cloud, source observations, and persistence views. Each window uses '+result.windowSize+' complete months, with a '+result.step+'-month stride. Overlapping windows share observations.</p></div><div class="score-grid"><div><h3>'+referenceId+'</h3>'+windowGraph(windows,index,true,config,result.step,reference)+'</div><div><h3>Adjacent windows</h3>'+windowGraph(windows,index,false,config,result.step)+'</div></div><div class="climate-window-context">'+overviewGraph(data.series[item.id].filter(row=>row.year>=config.start&&row.year<=config.end),variable,config,selected)+'</div><p class="source-line">'+scope+' · fixed scale '+data.baseline.join('–')+' · retrospective chronology</p></section>'
      +(reference?'<section class="panel lab-detail"><div class="lab-section-head"><div><div class="eyebrow lab-text">Same axes and scale</div><h2>Reference and selected geometry</h2></div><p>These XY projections share the same bounds. The exact H1 distance uses the full embedding.</p></div><div class="compare-shapes"><figure>'+comparisonShape(reference,bounds,axes)+'<figcaption>Reference '+period(reference)+'</figcaption></figure><strong>'+score+'<small>H1 distance</small></strong><figure>'+comparisonShape(selected,bounds,axes)+'<figcaption>Selected '+period(selected)+'</figcaption></figure></div>'+compareH1(reference,selected)+'<p class="source-line">'+scope+'</p></section>':'');
  }
  const correlations = climateLagCorrelations(data.series[item.id].filter(row=>row.year>=config.start&&row.year<=config.end));
  const zero = correlations.find(point=>point.lag===0);
  const directionNote='<details class="panel evidence" id="research-dynamics"><summary>Multivariable dynamics</summary><p>Choose Temperature + precipitation to inspect synchronized statewide monthly observations. Each channel uses its own calendar-month baseline and fixed scale. The paired six-dimensional calculation uses identical monthly dates and preserves both variables’ original units in the inspector. A third soil-wetness channel requires documented coverage on the same geography and calendar.</p><h3>Temperature and precipitation by lag</h3><p>Positive lag pairs temperature at month t with precipitation at a later month. The zero-lag correlation is '+fmt(zero.r)+' (n = '+zero.n+' paired months). These are exploratory associations. Serial dependence and repeated lag comparisons affect inference.</p>'+lagGraph(correlations)+'<p class="source-line">NOAA NCEI nClimDiv · '+human+' · '+config.start+'–'+config.end+' · paired statewide monthly anomalies relative to '+data.baseline.join('–')+'</p></details>';
  const heatwaveNote='<details class="panel evidence" id="research-heatwave"><summary>Heatwave research · daily data required</summary><p>The bundled statewide records contain monthly mean temperature and precipitation totals. Historical heatwave dates require daily maximum temperature with a defined percentile reference, complete event-duration coverage, and chronological validation.</p></details>';
  const methods='<details class="panel evidence"><summary>Topology methods and limitations</summary><p>Calendar-month anomalies are standardized with a fixed '+data.baseline.join('–')+' statewide anomaly mean and sample standard deviation. Each complete window uses up to 30 evenly spaced anchor months and two prior lag dates. The frozen comparison uses the earliest complete window of the same width inside the reference period. Historic scores inside that baseline are retrospective. The worker constructs an exact Euclidean Vietoris–Rips filtration through triangles and computes H0 and H1 over GF(2). Finite H1 diagrams are compared with exact bottleneck distance. The UI displays actual filtration edges and triangle counts, with no claim about the physical identity of a loop.</p><p><a href="https://ssrn.com/abstract=7615081" target="_blank" rel="noreferrer">Original Topo-Signal research ↗</a></p></details>';
  return '<div class="shell workspace enter lab research-lab">'+header+nav+controls+intro+caveat+view+learningIllustrations(['embedding','filtration','distance'])+directionNote+heatwaveNote+methods+'</div>';
}

function renderInspector(node, state, index, rows) {
  const {item,selected,result,variables,data}=state;
  const provenance = pointProvenance(selected,index,result,variables,rows);
  const anchor = selected.dates[index];
  const source = data.provenance.source;
  const date = r => r.date.slice(0,7);
  node.innerHTML='<div class="anchor-display"><strong>'+html(anchor.slice(0,7))+'</strong><span>Point '+(index+1)+' / '+selected.points.length+'</span></div><p class="point-source">'+html(item.name)+' · '+html(source)+'<br>'+period(selected)+' window · m = '+result.dimensions+' · τ = '+result.delay+' mo</p>'
    +'<div class="point-table-scroll"><table aria-label="Observations used for this delay vector"><thead><tr><th scope="col">Month</th><th scope="col">Raw</th><th scope="col">Anomaly</th><th scope="col">z</th></tr></thead><tbody>'+variables.map(v=>{
      const channel=provenance.filter(r=>r.variable===v.id);
      return '<tr class="point-channel"><th colspan="4" scope="rowgroup">'+html(v.label)+' ('+html(v.unit)+')</th></tr>'+channel.map(r=>'<tr data-inspector-date="'+r.date+'" data-inspector-variable="'+html(r.variable)+'"><th scope="row">'+date(r)+' <span>'+(r.offset===0?'t':r.offset+' mo')+'</span></th><td data-observed-value="'+r.value+'">'+fmt(r.value,2)+'</td><td data-anomaly-value="'+r.anomaly+'">'+fmt(r.anomaly,2)+'</td><td data-coordinate="'+r.normalized+'">'+fmt(r.normalized)+'</td></tr>').join('');
    }).join('')+'</tbody></table></div><details class="point-normalization"><summary>How z was calculated</summary><p>z = (anomaly − reference mean) / reference standard deviation.</p>'+variables.map((v,i)=>'<p>'+html(v.label)+' · reference mean '+fmt(result.scales[i].mean)+' · reference SD '+fmt(result.scales[i].sd)+'</p>').join('')+'</details>';
  return new Set(provenance.map(r=>r.date));
}

export function mountLab(root) {
  const scope = root.querySelector('.research-lab');
  if(!scope)return;
  const controller=new AbortController();
  const {signal}=controller;
  const on=(node,event,fn)=>node?.addEventListener(event,fn,{signal});
  const clickToSection=event=>{
    const button=event.target.closest('[data-lab-scroll]');
    if(!button)return;
    const section=scope.querySelector('#'+button.dataset.labScroll);
    if(!section)return;
    event.preventDefault();
    section.open=true;
    section.scrollIntoView({block:'start'});
    section.querySelector('summary').focus({preventScroll:true});
  };
  on(scope,'click',clickToSection);
  const state = mountedState;
  if(!state)return ()=>controller.abort();

  const {result,selected,data,item,variables}=state;
  const rows=new Map(data.series[item.id].map(row=>[row.date,row]));
  const pointSelect=scope.querySelector('[data-phase-select]');
  const pointInspector=scope.querySelector('[data-point-inspector]');
  const phaseSvg=scope.querySelector('.lab-phase');
  const selectWindow=scope.querySelector('select[name="lab-window"]');
  let point=0;
  let feature=Math.max(0,selected.features.findIndex(f=>f.dimension===1));
  const bound=Math.max(1,Math.ceil(Math.max(...selected.points.concat(result.reference?.points??[]).flat().map(Math.abs))));
  const phase = mountPhaseSpace(phaseSvg,selected,{bounds:bound,choose:selectPoint,labels:labels(result,variables[0]).map(html),
    controls:scope.querySelector('.phase-controls'),signal});

  function selectPoint(i) {
    if(!selected.dates[i])return;
    point=i;
    pointSelect.value=String(i);
    phase.select(i);
    const dates=renderInspector(pointInspector,state,i,rows);
    for(const dot of scope.querySelectorAll('.source-dot')) {
      const matched=dates.has(dot.dataset.date);
      dot.classList.toggle('linked',matched);
      dot.classList.toggle('anchor-active',dot.dataset.date===selected.dates[i]);
      if(dot.hasAttribute('data-source-pick'))dot.setAttribute('aria-pressed',String(matched));
    }
  }

  const epsilon=scope.querySelector('[data-rips-scale]');
  const output=scope.querySelector('[data-rips-value]');
  const summary=scope.querySelector('[data-rips-summary]');
  const edges=ripsEdges(selected.points);
  const scales = [...new Set([0,...edges.map(e=>e.distance)])].sort((a,b)=>a-b);
  epsilon.step='1';
  epsilon.max=String(scales.length-1);
  function setScale(scale) {
    epsilon.setAttribute('aria-valuetext',number(scale,3)+' standardized distance');
    const shot=filtrationSummary(edges,selected.features,scale,selected.points.length);
    phase.setEdges(shot.active);
    output.textContent=number(scale,3);
    summary.textContent=shot.active.length+' edges · '+shot.triangles+' triangles · '+shot.components+' components · '+shot.loops+' H1 loops';
  }
  function selectFeature(i) {
    if(!selected.features[i])return;
    feature=i;
    scope.querySelector('[data-feature-select]').value=String(i);
    scope.querySelector('[data-feature-detail]').innerHTML=featureDescription(selected.features[i]);
    for(const candidate of scope.querySelectorAll('[data-feature]')) {
      const active=Number(candidate.dataset.feature)===i;
      candidate.classList.toggle('active',active);
      candidate.setAttribute('aria-pressed',String(active));
    }
    const value = selected.features[i].birth;
    epsilon.value=String(scales.indexOf(value));
    setScale(value);
  }
  function selectByArrow(event,index,count,callback) {
    const delta={ArrowLeft:-1,ArrowDown:-1,ArrowRight:1,ArrowUp:1}[event.key];
    if(delta==null&&!['Home','End'].includes(event.key))return;
    event.preventDefault();
    callback(event.key==='Home'?0:event.key==='End'?count-1:Math.max(0,Math.min(count-1,index+delta)));
  }
  function selectByWindow(i) {
    if(!result.windows[i]||selectWindow.value===String(i))return;
    selectWindow.value=String(i);
    selectWindow.dispatchEvent(new Event('change',{bubbles:true}));
  }

  on(pointSelect,'change',()=>selectPoint(Number(pointSelect.value)));
  on(epsilon,'input',()=>setScale(scales[Number(epsilon.value)]));
  on(scope.querySelector('[data-feature-select]'),'change',event=>selectFeature(Number(event.target.value)));
  on(scope.querySelector('[data-diagram]'),'keydown',event=>selectByArrow(event,feature,selected.features.length,selectFeature));
  for(const svg of scope.querySelectorAll('[data-source-graph]'))on(svg,'keydown',event=>selectByArrow(event,point,selected.dates.length,selectPoint));
  for(const svg of scope.querySelectorAll('[data-score-graph]'))on(svg,'keydown',event=>selectByArrow(event,state.index,result.windows.length,selectByWindow));
  on(scope,'click',event=>{
    const target=event.target.closest('[data-source-pick],[data-feature],[data-topo-window]');
    if(!target)return;
    if(target.dataset.sourcePick!=null) selectPoint(Number(target.dataset.sourcePick));
    else if(target.dataset.feature!=null) selectFeature(Number(target.dataset.feature));
    else selectByWindow(Number(target.dataset.topoWindow));
  });
  selectPoint(0);
  selectFeature(feature);
  return ()=>controller.abort();
}

