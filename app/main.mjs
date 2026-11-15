import {renderWelcome,renderRegions,mountIntro} from './intro.mjs';
import {bindCharts,clearCharts,escape} from './charts.mjs';
import {analyze,renderAnalysis,exportCsv} from './analysis.mjs';
import {mountPublic} from './public-figures.mjs';
import {monthlySeries} from './science.mjs';

const main = document.querySelector('main');
const head = document.querySelector('#site-header');
const foot = document.querySelector('#site-footer');
import {mountExperiment} from './experiments.mjs';
import {mountProofLab} from './proof-lab.mjs';
import {mountComparison,mountOutlook} from './comparison.mjs';
const experimentPages=['proof','reconstruction','scenario','prediction'];
const pages = new Set(['home','regions','analysis','topology','benchmark','nasa','history','methods','comparison','outlook',...experimentPages]);
const historyKey = 'ToppoTerra.history.v1';
const configKey = 'ToppoTerra.config.v1';
const state = {data:null,page:'home',config:null,history:[],lab:{joint:false,delay:3,region:null,window:null},results:new Map()};
let dropView;
let research;
let researchRequest;
let guide = false;
const lagCount = 3;
const direction = 'past';
const pending = new Set();
let topologyCompute;
let labModule;
let previous;

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function save(key, value) {
  try { localStorage.setItem(key,JSON.stringify(value)); } catch { return; }
}

function normalized(raw) {
  const {data} = state;
  const constrain = (value,fallback) => Number.isInteger(Number(value)) && Number(value)>=data.minYear && Number(value)<=data.maxYear ? Number(value) : fallback;
  const start=constrain(raw?.start,data.minYear);
  const end=constrain(raw?.end,data.maxYear);
  return {
    region:['compare',...data.regions.map(r=>r.id)].includes(raw?.region)?raw.region:data.regions[0].id,
    variable:data.variables.some(v=>v.id===raw?.variable)?raw.variable:data.variables[0].id,
    start:Math.min(start,end),end:Math.max(start,end),
    resolution:raw?.resolution==='monthly'?'monthly':'annual',
    anomaly:raw?.anomaly===true,method:raw?.method==='sen'?'sen':'ols'
  };
}

function record(mode = 'analysis') {
  const config={...state.config};
  const version=state.data.version;
  const lab = mode==='topology'?{...state.lab,lagCount,direction}:null;
  const id=JSON.stringify(lab?[version,config,lab]:[version,config]);
  state.history=[{id,config,version,mode,lab,when:new Date().toISOString()},...state.history.filter(item=>item.id!==id)].slice(0,16);
  save(historyKey,state.history);
}

const regionLabel = (data,id) => id==='compare' ? data.regions.map(r=>r.name).join(' & ') : data.regions.find(r=>r.id===id)?.name ?? 'Region unavailable';
const stamp = when => Number.isFinite(Date.parse(when)) ? new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(when)) : '';

function historyPage() {
  return '<div class="shell workspace enter"><header class="page-head"><div><a class="back" href="#home">← Home</a><div class="eyebrow">Your explorations</div><h1 tabindex="-1">Search history</h1><p>Search settings are stored in this browser. Reopening a search recalculates the analysis with the current bundle.</p></div>'+(state.history.length?'<button class="button ghost" data-action="clear-history">Clear history</button>':'<a class="button primary" href="#regions">Start exploring →</a>')+'</header>'
    +(state.history.length?'<ol class="history-list">'+state.history.map((item,i)=>{
      const c=normalized(item.config);
      const v=state.data.variables.find(variable=>variable.id===c.variable);
      return '<li class="panel"><div><h2>'+escape(regionLabel(state.data,c.region))+'</h2><p>'+escape(v.label)+' · '+c.start+'–'+c.end+' · '+escape(c.resolution)+(c.anomaly?' anomalies':'')+' · '+(c.method==='sen'?'Theil–Sen':'OLS')+(item.mode==='topology'?' · Research Lab':'')+'</p><time datetime="'+escape(item.when)+'">'+escape(stamp(item.when))+'</time>'+(item.version!==state.data.version?'<p>Saved with a previous data version.</p>':'')+'</div><div class="head-actions"><button class="button primary slim" data-action="restore" data-index="'+i+'">Reopen <span aria-hidden="true">↗</span></button><button class="button ghost slim" data-action="remove-history" data-index="'+i+'" aria-label="Remove exploration '+(i+1)+'">Remove</button></div></li>';
    }).join('')+'</ol>':'<div class="panel empty">Your analyzed selections will appear here.</div>')+'</div>';
}

function methodsPage({provenance:p,baseline,version,regions,minYear,maxYear}) {
  return '<div class="shell workspace enter"><header class="page-head"><div><a class="back" href="#home">← Home</a><div class="eyebrow">About this investigation</div><h1 tabindex="-1">Methods &amp; sources</h1><p>Trace the evidence from statewide climate records to trend and topology results.</p></div></header><div class="methods-grid"><article class="panel"><div class="eyebrow">Historical record</div><h2>NOAA NCEI nClimDiv</h2><p>Monthly statewide estimates for '+escape(regions.map(r=>r.name).join(' and '))+' from '+minYear+'–'+maxYear+'. The underlying NOAA product uses interpolated surface station observations. This demo includes temperature and precipitation.</p><p>'+escape(version)+' · Supplied product date '+escape(p.publicationDate)+'.</p><a href="'+escape(p.metadataUrl)+'" target="_blank" rel="noreferrer">Product metadata ↗</a></article><article class="panel"><div class="eyebrow">Conventional inference</div><h2>Trend evidence</h2><p>We weight temperature by days per month, sum precipitation, and require all 12 months for an annual value. Monthly anomalies subtract the state’s '+baseline.join('–')+' calendar-month normal.</p><p>Annual OLS uses Newey–West HAC standard errors and approximate t inference. Theil–Sen supplies a robust effect estimate. The tie-aware Mann–Kendall result is descriptive and unadjusted for autocorrelation. Inference requires at least 20 complete years and 80% internal coverage.</p></article><article class="panel"><div class="eyebrow lab-text">Experimental analysis</div><h2>Topo-Signal</h2><p>Delay coordinates organize monthly anomalies as a point cloud. Rips persistent homology tracks the scales at which components merge and loops appear or fill. The lab plots H1 bottleneck distances to a frozen reference. The benchmark documents a separate detector calibration and its limits.</p><a href="https://ssrn.com/abstract=7615081" target="_blank" rel="noreferrer">Original research preprint ↗</a></article><article class="panel"><div class="eyebrow">Competition scope</div><h2>NASA Earth science data</h2><p>The NASA mission record covers a Nile Delta study box, separate from the NOAA statewide estimates for Arizona and California. <a href="#nasa">Open the NASA mission record ↗</a></p><a href="https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/" target="_blank" rel="noreferrer">Read the NASA Space Apps challenge ↗</a></article></div><section class="panel assistant-note"><div><h2>AI Climate Assistant</h2><p>Planned feature</p></div><button class="button ghost" disabled>Unavailable</button></section></div>';
}

function route() {
  const requested=location.hash.slice(1);
  if (requested==='main') return;
  const page=pages.has(requested)?requested:'home';
  if (page!==state.page && page==='analysis') record();
  state.page=page;
  render();
}

function navigate(page) {
  if (location.hash==='#'+page) render();
  else location.hash=page;
}

function frame() {
  const page=state.page;
  const nav=(url,text,active=url===page)=>'<a href="#'+url+'" '+(active?'aria-current="page"':'')+'>'+text+'</a>';
  head.innerHTML='<div class="shell nav"><a class="brand" href="#home" aria-label="ToppoTerra home"><img src="./assets/mark.svg" alt="" width="35" height="35"><span>Toppo<span>Terra</span></span></a><nav aria-label="Main navigation">'+nav('regions','Regions')+nav('analysis','Public Explorer')+nav('topology','Research Lab',['topology','benchmark'].includes(page))+nav('history','History')+'</nav></div>';
  foot.innerHTML='<div class="shell foot"><span>ToppoTerra <span class="divider">/</span> Earth System Trend Detective</span><a href="#methods">Data &amp; methods ↗</a></div>';
}

function topologyKey(item) {
  const {data,config,lab}=state;
  const seriesVersion=data.provenance.readyCsvSha256??data.version;
  return JSON.stringify(['rips-v2',seriesVersion,item.id,config.variable,config.start,config.end,lab.delay,lab.joint,lagCount,direction,lab.width??4,lab.step??12,data.baseline]);
}

function getTopology(item) {
  const {data,config,lab}=state;
  const key=topologyKey(item);
  if (state.results.has(key)) return state.results.get(key);
  if (pending.has(key)) return null;
  pending.add(key);
  const companion=data.variables.find(v=>v.id!==config.variable);
  const primarySeries=monthlySeries(data.series[item.id],config.variable,true);
  const companionSeries=lab.joint?monthlySeries(data.series[item.id],companion.id,true):null;
  const options={startYear:config.start,endYear:config.end,delay:lab.delay,baseline:data.baseline,lagCount,direction,windowSize:(lab.width??4)*12,step:lab.step??12};
  topologyCompute ??= import('./topology.mjs');
  topologyCompute.then(module=>module.runTopologyAsync(primarySeries,companionSeries,options))
    .catch(error=>({error:'Topology unavailable. '+error.message})).then(output=>{
      pending.delete(key);
      state.results.set(key,output);
      if(state.results.size>24)state.results.delete(state.results.keys().next().value);
      if(state.page==='topology' && key===topologyKey({id:currentLabRegion()}))render();
    });
  return null;
}

function currentLabRegion() {
  return state.config.region==='compare' ? state.lab.region??state.data.regions[0].id : state.config.region;
}

function getResearch() {
  if (researchRequest) return;
  researchRequest=Promise.all([
    import('./benchmark-view.mjs'),
    fetch(new URL('../data/research.json',import.meta.url)).then(response=>{
      if(!response.ok)throw new Error('Research data request returned '+response.status);
      return response.json();
    })
  ]).then(([module,bundle])=>{research={module,bundle};})
    .catch(error=>{research={error:error.message};})
    .then(()=>{if(['benchmark','nasa'].includes(state.page))render();});
}

function regionSettings(data,config) {
  const option=(value,label,current)=>'<option value="'+escape(value)+'" '+(value===current?'selected':'')+'>'+escape(label)+'</option>';
  const years=Array.from({length:data.maxYear-data.minYear+1},(_,i)=>data.minYear+i);
  const yearOptions=current=>years.map(year=>option(year,year,current)).join('');
  return '<form class="region-settings" aria-label="Investigation settings"><label>Variable<select name="variable">'+data.variables.map(v=>option(v.id,v.label,config.variable)).join('')+'</select></label><label>From<select name="start">'+yearOptions(config.start)+'</select></label><label>Through<select name="end">'+yearOptions(config.end)+'</select></label></form>';
}

function updateRange({start,end}) {
  state.config=normalized({...state.config,start,end});
  state.lab.window=null;
  save(configKey,state.config);
  record();
  render();
  main.querySelector('button[data-public-zoom]')?.focus({preventScroll:true});
}

function guidance(page) {
  const steps={
    regions:['1 of 4 · Define the investigation','The map shows the two statewide archives. Keep the full record and choose Public Explorer.','analysis','See the trend'],
    analysis:['2 of 4 · Read the trend','The per-decade rate describes the fitted change. The interval shows its uncertainty.','topology','See the geometry'],
    topology:['3 of 4 · Trace a point','Select a phase-space point to reveal the dated observations used in its coordinates.','benchmark','Compare the detectors'],
    benchmark:['4 of 4 · Review the evidence','Compare the two detectors under the same replay rules, then inspect the limits on any added-value claim.','analysis','Return to Public Explorer']
  };
  if(!guide || !steps[page])return '';
  const [step,copy,next,label]=steps[page];
  return '<section class="shell guide" aria-label="Guided investigation"><div><small class="eyebrow">'+step+'</small><p>'+copy+'</p></div><div class="guide-actions"><a class="button primary slim" href="#'+next+'">'+label+' →</a><button type="button" class="button ghost slim" data-action="exit-guide">Explore freely</button></div></section>';
}

function render() {
  const {page,config,data,lab}=state;
  const active=document.activeElement;
  const focused=active?.name && main.contains(active) ? active.name : null;
  const changed=page!==previous;
  const optionsOpen=!changed && main.querySelector('.public-view-options')?.open;
  if(dropView){dropView();dropView=null;}
  clearCharts();
  if(changed)frame();
  main.dataset.page=page;
  main.removeAttribute('aria-busy');
  const coverage={start:data.minYear,end:data.maxYear};
  if(page==='home')main.innerHTML=renderWelcome({coverage});
  if(page==='regions')main.innerHTML=renderRegions({regions:data.regions,coverage,selection:config.region,settings:regionSettings(data,config)});
  if(page==='history')main.innerHTML=historyPage();
  if(page==='methods')main.innerHTML=methodsPage(data);
  if(page==='analysis')main.innerHTML=renderAnalysis(data,config,analyze(data,config));
  if(page==='comparison')dropView=mountComparison(main,data,config,lab);
  if(page==='outlook')dropView=mountOutlook(main,data,config);
  if(page==='proof'||page==='reconstruction'){
    const study=config.region==='compare'?{...config,region:lab.region??data.regions[0].id}:config;
    dropView=mountProofLab(main,data,study);
  } else if(experimentPages.includes(page))dropView=mountExperiment(main,page,data,config);
  if(page==='analysis'||page==='topology')main.insertAdjacentHTML('beforeend','<nav class="shell controls" aria-label="Climate experiment workspaces"><a class="button lab-button" href="#proof">Open Topo-Signal Proof Lab</a><a class="button ghost" href="#scenario">Try a scenario</a><a class="button ghost" href="#prediction">Investigate forecast evidence</a></nav>');
  if(page==='topology') {
    if(!labModule) {
      main.innerHTML='<p class="shell loading" role="status">Opening the topology lab…</p>';
      import('./lab.mjs').then(module=>{
        labModule=module;
        if(state.page==='topology')render();
      }).catch(error=>{
        console.error(error);
        if(state.page==='topology')main.innerHTML='<div class="shell empty" role="alert">Topology could not load. <a href="#analysis">Return to analysis</a>.</div>';
      });
    } else {
      const model=analyze(data,config);
      const item=model.records.find(record=>record.id===lab.region)??model.records[0];
      main.innerHTML=labModule.renderLab(data,config,model,lab,getTopology(item));
    }
  }
  if(page==='benchmark'||page==='nasa') {
    getResearch();
    main.innerHTML=research?.module
      ? (page==='benchmark'?research.module.renderBenchmark(data,research.bundle):research.module.renderNasa(research.bundle))
      : '<div class="shell empty" role="'+(research?.error?'alert':'status')+'">'+(research?.error?'Research records could not load. <a href="#analysis">Return to Public Explorer</a>.':'Loading documented research results…')+'</div>';
  }
  main.insertAdjacentHTML('afterbegin',guidance(page));
  if(page==='home'||page==='regions')dropView=mountIntro(page);
  if(page==='analysis'){
    dropView=mountPublic(main,updateRange);
    if(optionsOpen)main.querySelector('.public-view-options').open=true;
  }
  if(page==='topology'&&labModule)dropView=labModule.mountLab(main);
  if((page==='benchmark'||page==='nasa')&&research?.module?.mountResearch)dropView=research.module.mountResearch(main);
  bindCharts(main);
  if(changed && previous!==undefined){
    window.scrollTo(0,0);
    const heading=main.querySelector('h1');
    if(heading) {heading.tabIndex=-1;heading.focus({preventScroll:true});}
    else main.focus({preventScroll:true});
  }
  if(!changed&&focused)main.querySelector('select[name="'+focused+'"]')?.focus({preventScroll:true});
  previous=page;
}

document.querySelector('.skip').addEventListener('click',event=>{event.preventDefault();main.focus();});
main.addEventListener('submit',event=>event.preventDefault());
main.addEventListener('change',event=>{
  const {name,value}=event.target;
  if(!state.data || !name) return;
  const {config,lab}=state;
  if(name.startsWith('lab-')) {
    const key=name.slice(4);
    lab[key]=key==='joint'?value==='true':['delay','window','width','step'].includes(key)?Number(value):value;
    if(key!=='window')lab.window=null;
  } else if(name in config) {
    const updated={...config,[name]:name==='anomaly'?value==='true':['start','end'].includes(name)?Number(value):value};
    if(name==='start' && updated.start>updated.end)updated.end=updated.start;
    if(name==='end' && updated.end<updated.start)updated.start=updated.end;
    state.config=normalized(updated);
    state.lab.window=null;
    save(configKey,state.config);
    if(state.page==='analysis')record();
  } else return;
  render();
});

main.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');
  if(!button||!state.data)return;
  const {action,index,region}=button.dataset;
  if(action==='choose-region') {
    state.config=normalized({...state.config,region});
    state.lab.window=null;
    save(configKey,state.config);
    if(state.page==='analysis')record();
    render();
    const selector=button.matches('.study-pin')?'.study-pin':'.region-option';
    main.querySelector(selector+'[data-region="'+state.config.region+'"]')?.focus({preventScroll:true});
  }
  if(action==='analyze')navigate('analysis');
  if(action==='advanced')navigate('topology');
  if(action==='guided-start') {
    guide=true;
    state.config=normalized({region:'AZ',variable:'tavg'});
    state.lab={joint:false,delay:3,region:null,window:null};
    save(configKey,state.config);
    navigate('regions');
  }
  if(action==='exit-guide') {
    guide=false;
    main.querySelector('.guide')?.remove();
    main.querySelector('h1')?.focus();
  }
  if(action==='save-lab') {
    record('topology');
    button.textContent='Investigation saved';
  }
  if(action==='restore' && state.history[index]) {
    const item=state.history[index];
    state.config=normalized(item.config);
    state.lab=item.lab?{...item.lab}:{joint:false,delay:3,region:null,window:null};
    save(configKey,state.config);
    navigate(item.mode==='topology'?'topology':'analysis');
  }
  if(action==='rain-case') {
    state.config=normalized({region:'CA',variable:'precip',resolution:'annual'});
    state.lab={joint:false,delay:3,region:'CA',window:null};
    save(configKey,state.config);
    record();
    render();
    main.querySelector('h1')?.focus();
  }
  if(action==='reset-range') {
    state.config=normalized({...state.config,start:state.data.minYear,end:state.data.maxYear});
    save(configKey,state.config);
    record();
    render();
  }
  if(action==='remove-history'||action==='clear-history') {
    state.history=action==='clear-history'?[]:state.history.filter((_,i)=>i!==Number(index));
    save(historyKey,state.history);
    render();
    (main.querySelector('[data-action="clear-history"]')??main.querySelector('h1'))?.focus();
  }
  if(action==='export')exportCsv(state.data,state.config,analyze(state.data,state.config));
});

window.addEventListener('hashchange',()=>{if(state.data)route();});

try {
  const response=await fetch(new URL('../data/climate.json',import.meta.url));
  if(!response.ok)throw new Error('Data request returned '+response.status);
  const data=await response.json();
  data.minYear=Number(data.provenance.startDate.slice(0,4));
  data.maxYear=Number(data.provenance.endDate.slice(0,4));
  state.data=data;
  state.config=normalized(read(configKey,null));
  const history=read(historyKey,[]);
  state.history=Array.isArray(history)?history.filter(item=>item&&typeof item==='object'&&item.config).slice(0,16):[];
  if(location.hash==='#main')render();
  else route();
} catch (error) {
  main.removeAttribute('aria-busy');
  main.innerHTML='<div class="shell empty" role="alert"><h1>Climate records couldn’t load</h1><p>Start ToppoTerra with <code>npm start</code> and open the printed URL in your browser.</p><button class="button primary" id="retry">Retry</button></div>';
  document.querySelector('#retry').onclick=()=>location.reload();
  console.error(error);
}

