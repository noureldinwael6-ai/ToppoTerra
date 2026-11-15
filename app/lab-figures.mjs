import {escape as html,number,plot} from './charts.mjs';
import {bettiCounts} from './phase-space.mjs';

const value = (n, decimals=3) => html(number(n,decimals));
const finite = Number.isFinite;
const line = (points, x, y) => points.map((p,i)=>(i?'L':'M')+x(p).toFixed(1)+','+y(p).toFixed(1)).join('');
const featureColor = feature => feature.dimension === 0 ? 'component' : 'loop';
const orderByDimension = items => items.slice().sort((a,b)=>(a.feature.dimension===1?0:1)-(b.feature.dimension===1?0:1));
const scaleText = decimals => n => value(n,decimals);

function gridLines(values, y, width, left, right, format = scaleText(2)) {
  return values.map(v=>'<line class="lab-graph-grid" x1="'+left+'" x2="'+(width-right)+'" y1="'+y(v)+'" y2="'+y(v)+'"/><text text-anchor="end" x="'+(left-8)+'" y="'+(y(v)+4)+'">'+format(v)+'</text>').join('');
}

export function bettiFigure(features, scope) {
  const endpoints = features.flatMap(f=>f.death===null?[f.birth]:[f.birth,f.death]);
  const max = Math.max(...endpoints,0);
  const limit = max>0 ? max*1.08 : 1;
  const scales = [...new Set([0,...endpoints,limit])].sort((a,b)=>a-b);
  const counts = scales.map(x=>({x,...bettiCounts(features,x)}));
  const figure = plot([
    {label:'H0 components',color:'#a9ebca',step:true,points:counts.map(p=>({x:p.x,y:p.components}))},
    {label:'H1 loops',color:'#c8b3fa',step:true,points:counts.map(p=>({x:p.x,y:p.loops}))}
  ],{title:'Betti counts across the Rips filtration',xLabel:'Distance ε (standardized units)',yLabel:'Active features',xTicks:[0,limit/4,limit/2,3*limit/4,limit],formatX:scaleText(2),zero:true,discreteY:true});
  return '<details class="panel evidence"><summary>Betti counts by distance</summary><p>Each step counts live intervals from the selected barcode. An interval contributes from its birth through scales below its death. One connected component persists permanently. Narrow peaks can represent loops that fill shortly after appearing.</p>'+figure+'<p class="source-line">'+scope+'</p></details>';
}

export function lagGraph(values) {
  const x=lag=>66+(lag+6)/12*562;
  const y=r=>119-r*81;
  const bars=values.map(({lag,r,n})=>Number.isFinite(r)?'<rect class="lag-bar" x="'+(x(lag)-13)+'" y="'+Math.min(y(r),y(0))+'" width="26" height="'+Math.max(1,Math.abs(y(r)-y(0)))+'"><title>Lag '+lag+' mo · r '+number(r,3)+' · '+n+' matched months</title></rect>':'').join('');
  const labels=values.map(({lag,n})=>'<text class="axis" text-anchor="middle" x="'+x(lag)+'" y="221">'+lag+'</text><text text-anchor="middle" x="'+x(lag)+'" y="243">'+n+'</text>').join('');
  return '<svg class="lab-graph lag-graph" viewBox="0 0 660 267" role="img" aria-label="Pearson correlation by calendar-month lag, with matched pair counts below."><text class="axis" x="66" y="17">Pearson r</text>'+gridLines([-1,-.5,0,.5,1],y,660,66,26)+bars+labels+'<text class="axis" x="14" y="243">n</text><text class="axis" text-anchor="end" x="628" y="263">Precipitation lag (months)</text></svg>';
}

export function sourceGraph(rows, variable, representedMonths) {
  const width=660,height=222,left=59,right=23,top=29,bottom=45;
  const h=height-top-bottom;
  const valid=rows.map(row=>row[variable.id]).filter(finite);
  const low=Math.min(...valid), high=Math.max(...valid);
  const pad=(high-low || 1)*.08;
  const y=v=>top+(high+pad-v)/(high-low+2*pad)*h;
  const x=i=>left+i/(rows.length-1)*(width-right-left);
  const ticks=[low,low+(high-low)/2,high];
  const dots=rows.map((row,index)=>{
    const pointIndex=representedMonths.get(row.date);
    if(!finite(row[variable.id])) return '';
    const pick=pointIndex!=null;
    const label=row.date.slice(0,7)+', '+number(row[variable.id])+' '+variable.unit+(pick?' · inspect a point that uses this date':'');
    return '<circle cx="'+x(index)+'" cy="'+y(row[variable.id])+'" r="'+(pick?4:2.5)+'" data-date="'+row.date+'" class="source-dot'+(pick?' source-anchor':'')+'" '+(pick?'data-linked-observation="'+pointIndex+'" role="button" aria-label="'+html(label)+'" tabindex="-1" data-source-pick="'+pointIndex+'"':'')+'><title>'+html(label)+'</title></circle>';
  }).join('');
  const years=rows.map((r,i)=>r.month===1?'<text class="axis" text-anchor="middle" x="'+x(i)+'" y="'+(height-bottom+19)+'">'+r.year+'</text>':'').join('');
  const p=rows.map((r,i)=>({i,v:r[variable.id]})).filter(r=>finite(r.v));
  const path='<path class="source-line-graph" d="'+line(p,q=>x(q.i),q=>y(q.v))+'"/>';
  return '<svg data-source-graph class="lab-graph source-graph" viewBox="0 0 '+width+' '+height+'" role="group" aria-label="'+html(variable.label)+' monthly observations · use arrow keys to inspect embedded anchors" tabindex="0"><text x="'+left+'" y="15" class="axis">'+html(variable.label+' ('+variable.unit+')')+'</text>'+gridLines(ticks,y,width,left,right)+years+'<text text-anchor="end" x="'+(width-right)+'" y="'+(height-6)+'" class="axis">Calendar year</text>'+path+dots+'</svg>';
}

export function overviewGraph(rows, variable, config, current) {
  const width=720,height=145,left=66,right=28,top=24,bottom=33;
  const valid=rows.map(row=>row[variable.anomalyKey]).filter(finite);
  if(!valid.length)return '';
  const max=Math.max(.1,...valid.map(Math.abs));
  const x=year=>left+(year-config.start)/(config.end+1-config.start)*(width-left-right);
  const y=n=>top+(max-n)/(max*2)*(height-top-bottom);
  const path=rows.map((row,i)=>{
    const n=row[variable.anomalyKey];
    if(!finite(n))return '';
    const prev=rows[i-1];
    const contiguous=prev && row.year*12+row.month-prev.year*12-prev.month===1;
    return (contiguous&&finite(prev[variable.anomalyKey])?'L':'M')+x(row.year+(row.month-1)/12).toFixed(1)+','+y(n).toFixed(1);
  }).join('');
  const first=+current.start.slice(0,4), last=+current.end.slice(0,4);
  return '<svg class="lab-graph observed-overview" viewBox="0 0 '+width+' '+height+'" role="img" aria-label="'+html(variable.label)+' anomalies over the study period with selected window highlighted"><rect class="score-brush" x="'+x(first)+'" y="'+top+'" width="'+(x(last+1)-x(first))+'" height="'+(height-top-bottom)+'"/>'+gridLines([-max,0,max],y,width,left,right)+'<text class="axis" x="'+left+'" y="15">'+html(variable.label)+' anomaly ('+html(variable.unit)+')</text><path class="source-line-graph" d="'+path+'"/><text class="axis" x="'+left+'" y="136">'+config.start+'</text><text class="axis" text-anchor="end" x="'+(width-right)+'" y="136">'+config.end+'</text></svg>';
}

export function windowGraph(windows, currentIndex, referenceMode, config, stride=12) {
  const width=720,height=238,left=66,right=28,top=24,bottom=44;
  const metric = referenceMode ? 'referenceChange' : 'change';
  const scores=windows.map(w=>w[metric]).filter(finite);
  if (!scores.length) return '<p class="score-empty">No comparable windows are available for this period.</p>';
  const high=Math.max(...scores,.04)*1.09;
  const x=year=>left+(year-config.start)/(config.end+1-config.start)*(width-left-right);
  const y=n=>height-bottom-n/high*(height-top-bottom);
  const endMonths=windows.map(w=>Number(w.end.slice(0,4))*12+Number(w.end.slice(5,7))-1);
  const yearSpan=Math.max(1,config.end-config.start);
  const count=Math.min(6,yearSpan);
  const ticks=Array.from(new Set(Array.from({length:count+1},(_,i)=>config.start+Math.round(i*yearSpan/count))));
  const grid=gridLines([0, high*.25, high*.5, high*.75, high],y,width,left,right);
  const segments=windows.map((w,i)=>{
    const wprev=windows[i-1];
    if (!finite(w[metric])) return '';
    return (finite(wprev?.[metric]) && endMonths[i]-endMonths[i-1]===stride ? 'L':'M')+x(endMonths[i]/12).toFixed(1)+','+y(w[metric]).toFixed(1);
  }).join('');
  const dots=windows.map((w,i)=>{
    if (!finite(w[metric])) return '';
    const label=w.end.slice(0,7)+' window, '+number(w[metric],3)+' distance';
    return '<circle class="score-dot'+(i===currentIndex?' active':'')+'" cx="'+x(endMonths[i]/12)+'" cy="'+y(w[metric])+'" r="'+(i===currentIndex?6:3.5)+'" aria-label="'+html(label)+'" data-topo-window="'+i+'" role="button" tabindex="-1"><title>'+html(label)+'</title></circle>';
  }).join('');
  const active=windows[currentIndex];
  const brush=active?'<rect class="score-brush" x="'+x(Number(active.start.slice(0,4)))+'" y="'+top+'" width="'+(x(Number(active.end.slice(0,4))+1)-x(Number(active.start.slice(0,4))))+'" height="'+(height-top-bottom)+'"/>':'';
  return '<svg class="lab-graph score-graph" viewBox="0 0 '+width+' '+height+'" role="group" aria-label="'+(referenceMode?'Fixed-reference':'Adjacent-window')+' distance timeline · use arrow keys to choose a window" tabindex="0" data-score-graph>'+brush+grid+'<text x="'+left+'" y="15" class="axis">H1 bottleneck distance (standardized units)</text>'+ticks.map(year=>'<text class="axis" text-anchor="middle" x="'+x(year)+'" y="'+(height-bottom+21)+'">'+year+'</text>').join('')+'<text class="axis" text-anchor="end" x="'+(width-right)+'" y="'+(height-5)+'">Score at window end</text><path class="score-line" d="'+segments+'"/>'+dots+'</svg>';
}

function featureMarkup(features, limit) {
  const marked=features.map((feature,i)=>({feature,i}));
  const shown=orderByDimension(marked);
  const x=n=>57+n/limit*278;
  const y=n=>227-n/limit*163;
  const ticks=[0,limit/4,limit/2,3*limit/4,limit];
  const fineTicks=ticks.map(t=>'<text text-anchor="middle" x="'+x(t)+'" y="246">'+value(t,2)+'</text>').join('');
  const label=(f,i)=>'H'+f.dimension+' feature '+(i+1)+', birth '+number(f.birth,3)+', '+(f.death===null?'infinite death':'death '+number(f.death,3));
  const shortLabel=(f,i)=>'H'+f.dimension+' · '+(i+1)+' · '+number(f.birth,3)+'–'+(f.death===null?'∞':number(f.death,3));
  const points=shown.slice().reverse().map(({feature:f,i})=>{
    const common=' data-feature="'+i+'" data-diagram-feature="'+i+'" class="diagram-feature '+featureColor(f)+'" role="button" tabindex="-1" aria-label="'+html(label(f,i))+'"';
    return f.death===null
      ? '<path'+common+' d="M'+x(f.birth)+',44 l-5,-7 h10 z"><title>'+html(label(f,i))+'</title></path>'
      : '<circle'+common+' cx="'+x(f.birth)+'" cy="'+y(f.death)+'" r="'+(f.dimension===0?4:5.5)+'"><title>'+html(label(f,i))+'</title></circle>';
  }).join('');
  const diagram='<svg class="lab-graph persistence-diagram" viewBox="0 0 365 280" role="group" aria-label="Finite H0 and H1 persistence features, with one infinite H0 marker. Use arrow keys to inspect a feature." tabindex="0" data-diagram><text x="57" y="19" class="axis">Death distance</text>'+gridLines(ticks,y,365,57,30)+fineTicks+'<text x="57" y="47">∞</text><line class="diagram-diagonal" x1="'+x(0)+'" y1="'+y(0)+'" x2="'+x(limit)+'" y2="'+y(limit)+'"/><text x="335" y="269" text-anchor="end" class="axis">Birth distance</text>'+points+'</svg>';
  const barcode='<ol class="persistence-bars" aria-label="Persistence intervals">'+shown.map(({feature:f,i})=>{
    return '<li><button data-feature="'+i+'" class="barcode-feature '+featureColor(f)+'" aria-label="'+html(label(f,i))+'" aria-pressed="false"><span>H'+f.dimension+'</span><span class="barcode-track"><i style="--bar-start:'+100*f.birth/limit+'%;--bar-end:'+(f.death===null?100:100*f.death/limit)+'%">'+(f.death===null?'↗':'')+'</i></span><span>'+value(f.birth,2)+'–'+(f.death===null?'∞':value(f.death,2))+'</span></button></li>';
  }).join('')+'</ol>';
  const options=shown.map(({feature:f,i})=>'<option value="'+i+'">'+html(shortLabel(f,i))+'</option>').join('');
  return {diagram,barcode,options};
}

export function persistenceViews(features, featureId, note) {
  const max=Math.max(.2,...features.map(f=>f.death??0));
  const limit=Math.ceil(max*5.5)/5;
  const {diagram,barcode,options}=featureMarkup(features,limit);
  return '<section class="panel lab-detail" aria-labelledby="persistence-title"><div class="lab-section-head"><div><div class="eyebrow lab-text">H0 / H1</div><h2 id="persistence-title">Persistence across scales</h2></div><p>'+html(note)+'</p></div><div class="persistence-grid"><div><h3>Persistence diagram</h3>'+diagram+'<p class="lab-key"><i class="component"></i>H0 · components <i class="loop"></i>H1 · loops</p></div><div class="barcode-col"><h3>Persistence barcode</h3><p class="lab-caption">Birth → death in standardized distance. Scroll for all features.</p>'+barcode+'</div></div><div class="feature-inspection"><label>Inspect feature <select data-feature-select>'+options+'</select></label><p aria-live="polite" data-feature-detail>'+featureDescription(features[featureId])+'</p></div></section>';
}

export function featureDescription(feature) {
  if(!feature) return 'Choose a component or loop.';
  if(feature.death===null) return 'The last H0 connected component survives the complete filtration. It has an infinite lifetime.';
  return (feature.dimension===0?'Component':'Loop')+' born at '+value(feature.birth)+', dies at '+value(feature.death)+', lifetime '+value(feature.persistence)+' standardized distance.';
}

export function compareH1(reference, selected) {
  const a=reference.features.filter(f=>f.dimension===1);
  const b=selected.features.filter(f=>f.dimension===1);
  const hi=Math.max(.1,...a.concat(b).map(f=>f.death))*1.06;
  const x=n=>63+n/hi*285;
  const y=n=>181-n/hi*122;
  const ticks=[0,hi/2,hi];
  const dots=(data,color,size)=>data.map(f=>'<circle cx="'+x(f.birth)+'" cy="'+y(f.death)+'" r="'+size+'" class="'+color+'"><title>H1 · birth '+number(f.birth,3)+' · death '+number(f.death,3)+'</title></circle>').join('');
  return '<figure class="reference-diagram"><svg class="lab-graph" viewBox="0 0 380 220" role="img" aria-label="Finite H1 points in the frozen reference and selected window"><text class="axis" x="63" y="22">H1 death distance</text>'+gridLines(ticks,y,380,63,32)+'<path class="diagram-diagonal" d="M'+x(0)+','+y(0)+'L'+x(hi)+','+y(hi)+'"/>'+ticks.map(t=>'<text x="'+x(t)+'" y="199" text-anchor="middle">'+value(t,2)+'</text>').join('')+dots(a,'h1-reference',5)+dots(b,'h1-selected',3.4)+'<text class="axis" x="348" y="217" text-anchor="end">Birth distance</text></svg><figcaption><span><i class="h1-reference"></i> Frozen reference</span><span><i class="h1-selected"></i> Selected window</span></figcaption></figure>';
}

export function comparisonShape(window,bound,labels) {
  const x=a=>110+a/bound*74, y=b=>92-b/bound*60;
  const path=line(window.points, p=>x(p[0]),p=>y(p[1]));
  return '<svg class="lab-graph compare-shape" viewBox="0 0 220 184" role="img" aria-label="XY projection of the delay embedding, in standardized units"><path class="lab-graph-grid" d="M24,92H195M110,16V160"/><text x="5" y="15">'+html(labels[1])+'</text><text text-anchor="end" x="213" y="178">'+html(labels[0])+'</text><path class="compare-trail" d="'+path+'"/>'+window.points.map((p,i)=>'<circle cx="'+x(p[0])+'" cy="'+y(p[1])+'" r="3" style="fill:hsl('+(168+i/(window.points.length-1)*100)+' 62% 69%)"><title>'+window.dates[i].slice(0,7)+'</title></circle>').join('')+'</svg>';
}

