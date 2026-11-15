import {escape,plot,number,signed} from './charts.mjs';

const colors={classical:'#edb688',topology:'#c8b3fa',observed:'#a9ebca'};
const methodLabels={classical:'Window statistics',topology:'H1 persistence'};
const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const pct=value=>number(100*value,1)+'%';
const yearLabel=year=>String(year);
const monthLabel=x=>months[Math.round((x-Math.floor(x))*12)]+' '+Math.floor(x);
const period=([start,end])=>start+'–'+end;

function header(label,title,caption,links) {
  return '<header class="research-header"><div><a class="back" href="'+links[0][0]+'">← '+links[0][1]+'</a><p class="eyebrow">'+label+'</p><h1 tabindex="-1">'+title+'</h1><p>'+caption+'</p></div><div class="head-actions">'+links.slice(1).map(([href,text])=>'<a href="'+href+'" class="button ghost">'+text+' <span aria-hidden="true">↗</span></a>').join('')+'</div></header>';
}

function loadState(bundle,topic) {
  return '<div class="panel empty" role="'+(bundle?.error?'alert':'status')+'">'+escape(bundle?.error ?? ('Loading '+topic+'…'))+'</div>';
}

function qualityCell(result) {
  return '<strong>'+result.count+' / '+result.n+'</strong> <span class="benchmark-range">('+pct(result.interval[0])+'–'+pct(result.interval[1])+')</span>'
    +(result.medianDelay!=null?'<small>'+number(result.medianDelay)+' mo median delay</small>':'')
    +(result.preAlarm!=null?'<small>'+result.preAlarm+' pre-onset crossings</small>':'')
    +(result.eligibleWindows<13?'<small>'+result.eligibleWindows+' / 13 complete windows per path</small>':'');
}

export function renderBenchmark(_data,bundle) {
  const title=header('Advanced Research Lab / Benchmark','Why topology?','Test whether persistent geometry identifies the same structural changes as a detector based on ordinary window statistics.',
    [['#topology','Topology Explorer'],['#analysis','Public Explorer'],['#methods','Methods & sources']]);
  if(!bundle || bundle.error)return '<div class="shell workspace research">'+title+loadState(bundle,'archived benchmark results')+'</div>';
  const {experiment,runtime}=bundle;
  const {history,scenarios,protocol,relation}=experiment;
  const [ordinary,tda]=history;
  const firstText=entry=>entry.firstAlert??'None';
  const labels='<div class="research-metadata"><span>Reference <b>'+period(protocol.train)+'</b></span><span>Embargo <b>'+period(protocol.gap)+'</b></span><span>Replay <b>'+period(protocol.test)+'</b></span><span>Window <b>'+protocol.windowMonths+' mo</b></span></div>';
  const traces=history.map(entry=>({label:methodLabels[entry.method],color:colors[entry.method],dots:true,gap:1.01,
    points:entry.windows.map(w=>({x:w.year,y:w.ratio}))}));
  traces.push({label:'Calibrated threshold',color:'#b9cbc6',dash:true,points:[{x:2011,y:1},{x:2025,y:1}]});
  const historicalPlot=plot(traces,{title:'Historical Arizona structural-change replay',yLabel:'Score ÷ path threshold',xLabel:'Window end year',
    xDomain:protocol.test,formatX:yearLabel,zero:true});
  const rawPlot=plot([{label:'Calendar-year mean anomaly',color:colors.observed,points:protocol.annualAnomalies}],
    {title:'Arizona temperature anomalies from the training period',yLabel:'Anomaly (°C)',xLabel:'Year',xDomain:protocol.test,formatX:yearLabel,zero:true,height:175});
  const peak=a=>a.windows.reduce((best,w)=>!best||w.ratio>best.ratio?w:best,null);
  const evidence='<section class="research-feature panel"><div class="eyebrow">Early detection · Retrospective replay</div><h2>Arizona temperature</h2><p>Arizona statewide monthly means from NOAA NCEI nClimDiv. Both detectors see identical calendar dates. Values above 1 cross the detector’s frozen threshold.</p>'
    +labels
    +'<div class="table-scroll" tabindex="0" aria-label="Historical detector comparison"><table class="research-table"><caption>Historical replay · '+ordinary.windows.length+' ending years per detector</caption>'
    +'<thead><tr><th>Metric</th><th>Window statistics</th><th>H1 persistence</th><th>Difference (H1 − statistics)</th></tr></thead><tbody>'
    +'<tr><th>Threshold crossings</th><td>'+ordinary.alerts+'</td><td>'+tda.alerts+'</td><td>'+signed(tda.alerts-ordinary.alerts,0)+'</td></tr>'
    +'<tr><th>First crossing, calendar year</th><td>'+firstText(ordinary)+'</td><td>'+firstText(tda)+'</td><td>'+(tda.firstAlert!==null&&ordinary.firstAlert!==null?signed(tda.firstAlert-ordinary.firstAlert,0)+' yr':'Unavailable')+'</td></tr>'
    +'<tr><th>Peak score relative to threshold</th><td>'+number(peak(ordinary).ratio,2)+'× ('+peak(ordinary).year+')</td><td>'+number(peak(tda).ratio,2)+'× ('+peak(tda).year+')</td><td>'+signed(peak(tda).ratio-peak(ordinary).ratio,2)+'×</td></tr></tbody></table></div>'
    +historicalPlot+rawPlot+'<p class="source-line">Arizona · NOAA NCEI nClimDiv · archived analysis · '+period(protocol.test)+' replay. No independently dated regime change is available, so detection delay and added value on this record are inconclusive.</p></section>';
  const matched=scenarios.find(s=>s.type==='null').results;
  const stress=scenarios.find(s=>s.type==='ar').results;
  const count=result=>result.count+'/'+result.n;
  const diagnostics='<section class="research-feature panel" id="diagnostics"><div class="eyebrow lab-text">Synthetic test · Not real NASA climate evidence</div><h2>Performance on known changes</h2>'
    +'<p class="research-note"><strong>Calibration depends on the null model.</strong> On the fitted block null, window statistics and H1 crossed in '+count(matched.classical)+' and '+count(matched.topology)+' holdout paths. On the AR(1) stress null, they crossed in '+count(stress.classical)+' and '+count(stress.topology)+'. The results establish no general false-alarm guarantee or early-detection advantage.</p>'
    +'<p>Each scenario uses '+protocol.trials+' paired holdout paths. Null rows count any crossing. Change rows count a post-onset crossing and show conditional median delay. Intervals are descriptive 95% Wilson intervals for the simulated path proportions.</p>'
    +'<div class="table-scroll" tabindex="0" aria-label="Synthetic score table"><table class="research-table compact"><caption>Matched detector quality · '+protocol.monitoringMonths+' months per path</caption><thead><tr><th>Scenario</th><th>Matching target</th><th>Window statistics</th><th>H1 persistence</th><th>Difference (H1 − statistics)</th></tr></thead><tbody>'
    +scenarios.map(s=>{
      const {classical,topology}=s.results;
      const delta=100*(topology.count/topology.n-classical.count/classical.n);
      const delay=topology.medianDelay!=null&&classical.medianDelay!=null?' / '+signed(topology.medianDelay-classical.medianDelay,0)+' mo':'';
      return '<tr><th>'+escape(s.name)+'</th><td>'+(s.change?'Detect after month '+protocol.onset:'False-alarm path')+'</td><td>'+qualityCell(classical)+'</td><td>'+qualityCell(topology)+'</td><td>'+signed(delta,1)+' pp'+delay+'</td></tr>';
    }).join('')+'</tbody></table></div>'
    +'<p>Detection delay is conditional on a crossing, so read it alongside the detected count. The AR(1) row stress-tests calibration outside the fitted null. Overlapping windows remain within the scored paths.</p>'
    +'<p>Synthetic paired-variable control · '+relation.n+' samples. Shifting wetness three months behind rainfall changes the same-month correlation from '+number(relation.sameMonthBefore,3)+' to '+number(relation.sameMonthAfter,3)+'. At the corresponding lag the correlation is '+number(relation.alignedAfter,3)+'. Joint-detector performance for this fixture remains untested.</p></section>';
  const conventional=runtime.measurements.find(r=>r.method==='classical'), topology=runtime.measurements.find(r=>r.method==='topology');
  const efficiency='<section class="research-feature panel"><div class="eyebrow">Computational efficiency</div><h2>Cost for the same replay</h2><p>'+escape(runtime.cpu)+' · '+escape(runtime.system)+' · Node '+escape(runtime.node)+'. Each fresh process loads the same NOAA input. Timings include detector fitting and '+conventional.windows+' window scores, exclude file I/O and calibration, and use no saved diagrams.</p>'
    +'<div class="table-scroll" tabindex="0" aria-label="Computational efficiency table"><table class="research-table"><caption>Separate process per method · milliseconds and process-wide peak MiB</caption><thead><tr><th>Metric</th><th>Window statistics</th><th>H1 persistence</th><th>Difference (H1 − statistics)</th></tr></thead><tbody>'
    +[['First run (ms)','firstMs',1],['Median of six subsequent runs (ms)','medianMs',1],['Peak process RSS (MiB)','processPeakRssKiB',1/1024]].map(([label,key,scale])=>{
      const a=conventional[key]*scale,b=topology[key]*scale;
      return '<tr><th>'+label+'</th><td>'+number(a,3)+'</td><td>'+number(b,3)+'</td><td>'+signed(b-a,3)+'</td></tr>';
    }).join('')+'</tbody></table></div><p>Timing depends on machine and load. RSS includes the Node runtime, input data and compiled code.</p></section>';
  const methods='<details class="panel evidence"><summary>Methods &amp; validation</summary><p>Freeze '+period(protocol.train)+' calendar-month means and anomaly scale. Use six disjoint training windows as the reference and leave '+period(protocol.gap)+' entirely unused. Score the '+period(protocol.test)+' holdout using trailing 36-month windows sampled at year-end. The conventional score takes the maximum standardized shift in mean, log standard deviation and lag-1 autocorrelation. H1 persistence scores the median bottleneck distance to the frozen training diagrams using 30 trailing delay vectors, dimension 3 and a three-month lag.</p><p>Calibrate each cutoff on the maxima of the same '+protocol.calibrationPaths+' length-180-month simulated null paths. January-aligned 24-month moving blocks from the training anomaly series approximate short-range dependence. The rank threshold gives a nominal '+pct(protocol.falseAlarmTarget)+' probability of any crossing per path under that bootstrap null. Strict exceedances and the simulated-path intervals describe this design. Climate calibration beyond this fitted null, sensitivity to block length and real event validation remain open.</p><p>Annual OLS significance tests the slope of a long-term linear trend. These detectors test compatibility with a reference window process through a separate full-path null.</p></details>';
  return '<div class="shell workspace enter research">'+title+evidence+diagnostics+efficiency+methods+'<div class="split research-availability"><section class="panel"><div class="eyebrow lab-text">Multivariable dynamics</div><h2>Two aligned variables</h2><p>Temperature and precipitation come from the same statewide monthly NOAA product. Soil wetness requires a compatible product on the same footprint.</p><a href="#topology">Open joint embedding ↗</a></section><section class="panel"><div class="eyebrow">Heatwave research</div><h2>Daily Tmax required</h2><p>The available statewide series is monthly. Historical heatwave dates, duration and predictive validation need daily maxima, fixed seasonal thresholds and independently evaluated outcomes.</p><a href="#methods">Inspect data coverage ↗</a></section></div></div>';
}

function nasaFootprint(nasa) {
  const [lowLat,highLat,lowLon,highLon]=nasa.area;
  const nx=16,ny=11;
  const values=nasa.grid;
  if(!values?.length)return '';
  const min=Math.min(...values.map(v=>v.value)), max=Math.max(...values.map(v=>v.value));
  const cells=values.map(v=>{
    const x=(v.lon-lowLon-.05)*10,y=(highLat-v.lat-.05)*10;
    const ratio=(v.value-min)/(max-min||1);
    const hue=181-ratio*32,luminance=20+ratio*53;
    return '<rect x="'+(65+x*27)+'" y="'+(15+y*20)+'" width="26" height="19" fill="hsl('+hue+' 47% '+luminance+'%)"><title>'+
      number(v.lat)+'° N, '+number(v.lon)+'° E · '+number(v.value)+' mm/month</title></rect>';
  }).join('');
  return '<figure class="nasa-grid"><svg viewBox="0 0 550 285" role="img" aria-label="Nile Delta NASA GPM cell footprints shaded by the mean monthly precipitation over 1998 to 2007">'
    +cells+'<g fill="currentColor" class="nasa-grid-labels"><text x="60" y="25" text-anchor="end">'+number(highLat)+'° N</text><text x="60" y="'+(ny*20+10)+'" text-anchor="end">'+number(lowLat)+'° N</text><text x="65" y="260">'+number(lowLon)+'° E</text><text x="'+(65+nx*27)+'" y="260" text-anchor="end">'+number(highLon)+'° E</text></g></svg>'
    +'<figcaption><span>'+number(min)+' mm/month</span><span class="nasa-legend"></span><span>'+number(max)+' mm/month</span></figcaption></figure>';
}

export function renderNasa(bundle) {
  const title=header('Public Explorer / Mission records','Nile Delta rainfall','Explore a historical gridded precipitation record from NASA GPM IMERG.',
    [['#analysis','Public Explorer'],['#regions','U.S. study map'],['#methods','Methods & sources']]);
  if(!bundle || bundle.error)return '<div class="shell workspace research">'+title+loadState(bundle,'archived NASA observations')+'</div>';
  const {nasa}=bundle;
  const [lowLat,highLat,lowLon,highLon]=nasa.area;
  const points=nasa.records.map(r=>({x:r.year+(r.month-1)/12,y:r.value}));
  const annual=nasa.annual.map(r=>({x:r.year,y:r.value}));
  const fit=nasa.fit.map(r=>({x:r.year,y:r.value}));
  return '<div class="shell workspace enter research">'+title+'<div class="research-metadata nasa-metadata"><span>Period <b>Jan 1998–Dec 2007</b></span><span>Monthly samples <b>'+points.length+'</b></span><span>Footprint <b>'+escape(nasa.gridSummary)+'</b></span><span>Product <b>NASA GPM IMERG</b></span></div>'
    +'<section class="research-feature panel"><div class="eyebrow">NASA mission product · Monthly accumulations</div><h2>Precipitation history</h2><p>Area-weighted depth from a Nile Delta bounding box. Each point uses all '+nasa.grid.length+' cells in the archived grid.</p>'
    +plot([{label:'Regional monthly accumulation',color:colors.observed,points,gap:.09}],{title:'Nile Delta monthly IMERG precipitation',yLabel:'Monthly total (mm)',xLabel:'Month',tipUnit:'mm',xDomain:[1998,2007+11/12],formatX:yearLabel,detailX:monthLabel,zero:true})
    +'<div class="source-line">NASA GPM IMERG · '+escape(nasa.origin)+' · geographic footprint spans land and water.</div></section>'
    +'<div class="split nasa-split"><section class="research-feature panel"><div class="eyebrow">Observed grid footprint</div><h2>Coverage by cell</h2><p>'+number(lowLat)+'–'+number(highLat)+'° N, '+number(lowLon)+'–'+number(highLon)+'° E. Cell color shows each location’s average monthly precipitation over the full record.</p>'+nasaFootprint(nasa)+'</section>'
    +'<section class="research-feature panel"><div class="eyebrow">Annual totals</div><h2>'+signed(nasa.rate)+' <small>mm/decade</small></h2><p>The ten-year OLS fit is descriptive. The project’s confidence interval and significance assessment require at least 20 complete years.</p>'
    +plot([{label:'Annual precipitation',color:colors.observed,points:annual,dots:true},{label:'Descriptive linear fit',color:colors.classical,points:fit,dash:true}],{title:'Annual IMERG precipitation and descriptive trend',xLabel:'Year',yLabel:'Annual total (mm)',tipUnit:'mm',formatX:yearLabel,compact:true,zero:true})+'</section></div>'
    +'<details class="panel evidence" open><summary>Product and geographic scope</summary><p>NASA supplies the satellite-derived IMERG product. USF IMaRS distributed this extract through ERDDAP. The archive is monthly accumulated depth in millimeters. The app weights regular latitude–longitude cell depths by cosine of latitude, then sums complete calendar years. '+escape(nasa.release)+'</p><p>The footprint includes cells in coastal waters and spans part of the Nile Delta study area. Arizona and California use statewide NOAA NCEI estimates and remain separate.</p><p><a href="https://gpm.nasa.gov/data/imerg" target="_blank" rel="noreferrer">NASA product documentation ↗</a> · <a href="https://erddap.marine.usf.edu/erddap/griddap/IMERG_monthly_global_precip.html" target="_blank" rel="noreferrer">USF source metadata ↗</a></p></details></div>';
}

