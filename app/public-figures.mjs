import {fitTrend} from './science.mjs';
import {escape, number, signed, tiny, plot, charts} from './charts.mjs';

export function annualCoverage(monthly, start, end) {
  const monthsByYear = new Map();
  for (const row of monthly) {
    if (!Number.isInteger(row.month) || row.month < 1 || row.month > 12 || !Number.isFinite(row.value)) continue;
    if (!monthsByYear.has(row.year)) monthsByYear.set(row.year, new Set());
    monthsByYear.get(row.year).add(row.month);
  }
  return Array.from({length:end-start+1}, (_, index) => {
    const year = start + index;
    return {year, valid: monthsByYear.get(year)?.size ?? 0};
  });
}

export function annualMonthlyMaximum(monthly, coverage) {
  const maximumByYear = new Map();
  for (const row of monthly) {
    if (Number.isFinite(row.value)) {
      maximumByYear.set(row.year, Math.max(maximumByYear.get(row.year) ?? -Infinity, row.value));
    }
  }
  return coverage.map(({year,valid}) => ({x:year,y:valid === 12 ? maximumByYear.get(year) : null}));
}

export function pairedRate(first, second) {
  const secondByYear = new Map(second.map(row => [row.year,row.value]));
  const differences = first.map(({year,value}) => ({
    year,
    value: Number.isFinite(value) && Number.isFinite(secondByYear.get(year)) ? value - secondByYear.get(year) : null
  }));
  return fitTrend(differences);
}

function percentile(sorted, fraction) {
  const index = (sorted.length - 1) * fraction;
  const lower = Math.floor(index);
  const remainder = index - lower;
  return sorted[lower] + remainder * (sorted[Math.ceil(index)] - sorted[lower]);
}

export function periodDistribution(annual, start, end) {
  const mid = Math.floor((start + end) / 2);
  return [[start,mid],[mid+1,end]].map(([from,through]) => {
    const values=annual.filter(p=>p.year>=from && p.year<=through && Number.isFinite(p.value)).map(p=>p.value).sort((a,b)=>a-b);
    const summary=values.length>=4 ? [0,.25,.5,.75,1].map(fraction=>percentile(values,fraction)) : null;
    return {start:from,end:through,n:values.length,summary};
  });
}

export function uncertainty(records, unit, colors) {
  const available=records.filter(row=>row.trend.ci);
  if (!available.length) return '<p class="public-empty">A slope interval needs at least 20 complete years and enough usable data to estimate uncertainty.</p>';
  const domain=[0,...available.flatMap(row=>row.trend.ci),...available.map(row=>row.trend.olsRate)];
  const low=Math.min(...domain), high=Math.max(...domain);
  const padding=(high-low || 1)*.10;
  const percent=x=>100*(x-(low-padding))/(high-low+2*padding);
  return '<div class="slope-intervals"><p class="slope-units">'+escape(unit)+'</p>'+available.map(row=>{
    const t=row.trend, lo=percent(t.ci[0]), hi=percent(t.ci[1]), center=percent(t.olsRate);
    const details=row.name+' · OLS '+signed(t.olsRate)+' '+unit+' · 95% interval '+signed(t.ci[0])+' to '+signed(t.ci[1])+' · p '+tiny(t.p);
    return '<div class="slope-row" style="--state:'+colors[row.id]+'"><span>'+escape(row.name)+'</span><div class="slope-track" role="img" aria-label="'+escape(details)+'" title="'+escape(details)+'"><i class="slope-zero" style="--x:'+percent(0)+'%"></i><i class="slope-range" style="--x:'+lo+'%;--span:'+(hi-lo)+'%"></i><i class="slope-dot" style="--x:'+center+'%"></i></div><strong>'+signed(t.olsRate)+'</strong></div>';
  }).join('')+'<p class="slope-key"><i></i> Zero change <span>·</span> <b></b> Estimate <span>·</span> <i></i> 95% interval</p></div>';
}

export function distributionFigure(records, start, end, unit, colors) {
  const periods=records.flatMap(row=>periodDistribution(row.annual,start,end).map(period=>({...period,id:row.id,name:row.name})));
  const withSummary=periods.filter(period=>period.summary);
  if (!withSummary.length) return '<p class="public-empty">Select a period with at least four complete years in each half to compare both distributions.</p>';
  const all=withSummary.flatMap(period=>period.summary);
  const low=Math.min(...all), high=Math.max(...all);
  const span=(high-low) || 1;
  const at=value=>5+90*(value-low)/span;
  return '<div class="annual-boxes"><div class="box-axis"><span>'+number(low)+' '+escape(unit)+'</span><span>'+number(high)+' '+escape(unit)+'</span></div>'+periods.map(period=>{
    const label=period.name+' · '+period.start+'–'+period.end+' · '+period.n+' years';
    if (!period.summary) return '<div class="box-row"><p>'+escape(label)+'</p><span class="box-empty">Fewer than four complete years</span></div>';
    const [min,q1,med,q3,max]=period.summary;
    const details=label+' · minimum '+number(min)+' · Q1 '+number(q1)+' · median '+number(med)+' · Q3 '+number(q3)+' · maximum '+number(max)+' '+unit;
    return '<div class="box-row" style="--state:'+colors[period.id]+'"><p>'+escape(label)+'</p><div class="box-track" tabindex="0" role="img" aria-label="'+escape(details)+'" title="'+escape(details)+'"><i class="box-whisker" style="--x:'+at(min)+'%;--span:'+(at(max)-at(min))+'%"></i><i class="box-iqr" style="--x:'+at(q1)+'%;--span:'+(at(q3)-at(q1))+'%"></i><i class="box-median" style="--x:'+at(med)+'%"></i></div><b>'+number(med)+'</b></div>';
  }).join('')+'<p class="slope-key">Boxes span the middle 50%. Ticks mark medians, and whiskers span the observed range.</p></div>';
}

export function coverageFigure(records, start, end, colors) {
  return '<div class="coverage-fig"><div class="coverage-axis"><span>'+start+'</span><span>Calendar year</span><span>'+end+'</span></div>'+records.map(row=>{
    const stats=annualCoverage(row.monthly,start,end);
    const valid=stats.reduce((sum,p)=>sum+p.valid,0);
    return '<div class="coverage-row" style="--state:'+colors[row.id]+'"><strong>'+escape(row.name)+'</strong><p>'+valid+' / '+(12*stats.length)+' months available</p><div class="coverage-track" style="--years:'+stats.length+'" role="group" aria-label="'+escape(row.name)+' valid months by year">'+stats.map(({year,valid:count})=>'<span style="--coverage:'+100*count/12+'%" title="'+year+' · '+count+' of 12 months valid" aria-label="'+year+', '+count+' of 12 months valid"></span>').join('')+'</div></div>';
  }).join('')+'<div class="coverage-legend"><i></i><span>0 months</span><i></i><span>12 months</span></div></div>';
}

export function precipFigure(records, start, end, colors) {
  return plot(records.map(row=>({label:row.name,color:colors[row.id],dots:true,gap:1.01,points:annualMonthlyMaximum(row.monthlyRaw,annualCoverage(row.monthlyRaw,start,end))})),{
    title:'Peak monthly precipitation in each year', yLabel:'Monthly precipitation (mm)', tipUnit:'mm', xDomain:[start,end], formatX:String, zero:true
  });
}

export function mountPublic(root, onRange) {
  for (const control of root.querySelectorAll('[data-section]')) {
    control.addEventListener('click',()=>{
      const heading=root.querySelector('#'+control.dataset.section);
      heading.tabIndex=-1;
      heading.focus();
    });
  }
  root.querySelector('[data-public-evidence]')?.addEventListener('click',()=>{
    const heading=root.querySelector('#uncertainty-heading');
    heading.tabIndex=-1;
    heading.focus();
  });
  const chronology=root.querySelector('[data-public-chronology]');
  const node=chronology?.querySelector('.plot');
  const chart=node && charts.get(node.dataset.plot);
  root.querySelector('[data-print-report]')?.addEventListener('click',()=>window.print());
  if (!chart) return;
  root.querySelector('[data-download-chart]')?.addEventListener('click',()=>exportHistoricalChart(node,chart,chronology));
  const {width,pad,options}=chart;
  const [first,last]=options.xDomain;
  const start=Math.floor(first), end=Math.floor(last);
  root.querySelector('[data-public-zoom]')?.addEventListener('click',()=>onRange({start:Math.max(start,end-9),end}));
  if (start===end) return;

  const brush=document.createElementNS('http://www.w3.org/2000/svg','rect');
  brush.setAttribute('class','range-brush');
  brush.setAttribute('y',pad.t);
  brush.setAttribute('height',chart.height-pad.t-pad.b);
  brush.hidden=true;
  node.querySelector('svg').append(brush);
  let drag;
  const normalizedX=event=>{
    const bounds=node.getBoundingClientRect();
    return Math.min(width-pad.r,Math.max(pad.l,(event.clientX-bounds.left)*width/bounds.width));
  };
  const yearAt=x=>{
    const date=first+(last-first)*(x-pad.l)/(width-pad.l-pad.r);
    return last===end?Math.round(date):Math.floor(date + 1e-8);
  };
  node.addEventListener('pointerdown',event=>{
    if (event.button!==0 || !event.isPrimary) return;
    drag={id:event.pointerId,x:normalizedX(event)};
  });
  node.addEventListener('pointermove',event=>{
    if (!drag || drag.id!==event.pointerId) return;
    const x=normalizedX(event);
    if (Math.abs(x-drag.x)<7 && !drag.active) return;
    if (!drag.active) {
      node.setPointerCapture(drag.id);
      drag.active=true;
    }
    brush.removeAttribute('hidden');
    brush.setAttribute('x',Math.min(x,drag.x));
    brush.setAttribute('width',Math.abs(x-drag.x));
  });
  function clear() {
    drag=null;
    brush.setAttribute('hidden','');
  }
  node.addEventListener('pointercancel',clear);
  node.addEventListener('lostpointercapture',clear);
  node.addEventListener('pointerup',event=>{
    if (!drag || drag.id!==event.pointerId) return;
    const x=normalizedX(event);
    const valid=drag.active && yearAt(x)!==yearAt(drag.x);
    const range={start:yearAt(Math.min(x,drag.x)),end:yearAt(Math.max(x,drag.x))};
    clear();
    if (valid) onRange(range);
  });
}


function exportHistoricalChart(node, chart, chronology) {
  const original = node.querySelector('svg');
  const svg = original.cloneNode(true);
  const ns = 'http://www.w3.org/2000/svg';
  const {width,height}=chart;
  const exportWidth=Math.max(width,760);
  const exportHeight=height+55+18*chart.series.length;
  svg.setAttribute('viewBox','0 -32 '+exportWidth+' '+exportHeight);
  svg.setAttribute('width',exportWidth);
  svg.setAttribute('height',exportHeight);
  svg.querySelectorAll('.cursor,.range-brush').forEach(element=>element.remove());
  const create = (tag,attrs,text) => {
    const child=document.createElementNS(ns,tag);
    for(const [key,value] of Object.entries(attrs))child.setAttribute(key,value);
    if(text)child.textContent=text;
    return child;
  };
  svg.prepend(create('rect',{x:0,y:-32,width:exportWidth,height:exportHeight,fill:'#101c23'}));
  svg.prepend(create('title',{},chart.options.title));
  svg.append(
    create('style',{},'text{font: 11px sans-serif;fill:#d6e5e9}.plot-grid line{stroke:#48616a;stroke-width:1}.plot-grid .grid-zero{stroke:#a8bab9}'),
    create('text',{x:chart.pad.l,y:-9},chart.options.title),
    create('text',{x:chart.pad.l,y:height+10+18*chart.series.length},chronology.querySelector('.source-line').textContent.trim())
  );
  chart.series.forEach((item,index)=>{
    svg.append(create('text',{x:chart.pad.l,y:height+5+18*index,style:'fill:'+item.color},item.label));
  });
  const href = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = href;
  link.download = 'ToppoTerra-historical-record.svg';
  link.click();
  setTimeout(()=>URL.revokeObjectURL(href),1000);
}
