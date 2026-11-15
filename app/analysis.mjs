import {annualSeries, monthlySeries, fitTrend} from './science.mjs';
import {escape, plot, number, signed, tiny} from './charts.mjs';
import {renderDiagnostics} from './diagnostics.mjs';
import {renderStudyMap} from './intro.mjs';
import {pairedRate, uncertainty, distributionFigure, coverageFigure, precipFigure} from './public-figures.mjs';
export {mountPublic} from './public-figures.mjs';

export const colors = {AZ:'#a9ebca',CA:'#edb688',fit:'#e3f4ff',lab:'#c8b3fa'};
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const labelMonth = year => months[Math.round((year-Math.floor(year))*12)]+' '+Math.floor(year);
export const statusClass = status => ({'Significant trend':'significant','Possible/emerging change':'possible'}[status] ?? 'neutral');
const option = (value, label, selected) => '<option value="'+escape(value)+'" '+(String(selected)===String(value)?'selected':'')+'>'+escape(label)+'</option>';

export function analyze(data, config) {
  const variable = data.variables.find(item=>item.id===config.variable);
  const regions = config.region==='compare' ? data.regions : data.regions.filter(item=>item.id===config.region);
  const records = regions.map(region => {
    const source = data.series[region.id].filter(p=>p.year>=config.start&&p.year<=config.end);
    const monthly = monthlySeries(source,variable.id,config.anomaly);
    const monthlyRaw = config.anomaly ? monthlySeries(source,variable.id) : monthly;
    const annual = annualSeries(source,variable.id,config.anomaly);
    return {...region,monthly,monthlyRaw,annual,trend:fitTrend(annual,config.method)};
  });
  return {variable,records};
}

export function filters(data, config, {hideMethod=false, simple=false}={}) {
  const years = Array.from({length:data.maxYear-data.minYear+1},(_,i)=>data.minYear+i);
  return '<form class="controls" aria-label="Analysis settings"><label>Region<select name="region">'+data.regions.map(r=>option(r.id,r.name,config.region)).join('')+option('compare','Compare both states',config.region)+'</select></label><label>Variable<select name="variable">'+data.variables.map(v=>option(v.id,v.label,config.variable)).join('')+'</select></label><label>From<select name="start">'+years.map(y=>option(y,y,config.start)).join('')+'</select></label><label>Through<select name="end">'+years.map(y=>option(y,y,config.end)).join('')+'</select></label>'+(simple?'</form><details class="public-view-options"><summary>Chart and method settings</summary><form class="controls" aria-label="Chart and method settings">':'')+'<label>Display<select name="resolution">'+option('annual','Annual',config.resolution)+option('monthly','Monthly',config.resolution)+'</select></label><label>Values<select name="anomaly">'+option('false','Raw values',config.anomaly)+option('true','Anomalies',config.anomaly)+'</select></label>'+(hideMethod?'':'<label>Trend fit<select name="method">'+option('ols','Linear (OLS)',config.method)+option('sen','Theil–Sen',config.method)+'</select></label>')+'</form>'+(simple?'</details>':'');
}

export function trendSummary(item, unit, config) {
  const t = item.trend;
  const usable = Number.isFinite(t.rate);
  const direction = t.rate > 0 ? 'increase' : t.rate < 0 ? 'decrease' : 'zero slope';
  const method = config.method === 'sen' ? 'Theil–Sen' : 'Linear';
  return '<section class="answer"><div class="answer-top"><span class="series-name"><i style="--dot:'+colors[item.id]+'"></i>'+escape(item.name)+'</span><span class="tag '+statusClass(t.status)+'">'+escape(t.status)+'</span></div><p class="rate">'+signed(t.rate)+' <small>'+escape(unit)+'/decade</small></p><p class="answer-copy">'+(usable ? method+' fit estimates '+(direction==='zero slope'?'a flat trend':'an '+(direction==='increase'?'increase':'overall decrease'))+' of <strong>'+number(Math.abs(t.change))+' '+escape(unit)+'</strong> over '+t.start+'–'+t.end+'.' : 'Select a longer period to estimate a trend.')+'</p><div class="answer-bottom"><span>95% OLS interval <b>'+ (t.ci ? signed(t.ci[0])+' to '+signed(t.ci[1])+' '+escape(unit)+'/decade' : 'Unavailable')+'</b></span><span>OLS p-value <b>'+escape(tiny(t.p))+'</b></span></div></section>';
}

function chartSeries(item, config) {
  const points = config.resolution==='annual' ? item.annual.map(p=>({x:p.year,y:p.value})) : item.monthly.map(p=>({x:p.year+(p.month-1)/12,y:p.value}));
  return [{label:item.name+' · '+config.resolution,color:colors[item.id],gap:config.resolution==='annual'?1.01:.09,dots:config.resolution==='annual'&&points.length<18,points},
    ...(config.resolution==='annual'&&item.trend.fitted.length ? [{label:item.name+(config.method==='ols'?' · OLS fit':' · Sen fit'),color:item.id==='AZ'?colors.fit:'#f3dfc9',dash:true,gap:1.01,points:item.trend.fitted.map(p=>({x:p.year,y:p.value,lo:p.lo,hi:p.hi}))}] : [])];
}

function heatmap(record, unit, lo, hi, config) {
  const lookup = new Map(record.monthly.map(p=>[p.year+':'+p.month,p.value]));
  const years = Array.from({length:config.end-config.start+1},(_,i)=>config.end-i);
  return '<section class="public-heat-block"><h3>'+escape(record.name)+'</h3><div class="heat-scroll" tabindex="0" aria-label="'+escape(record.name)+' monthly heatmap, scroll for more years"><table class="heat"><thead><tr><th scope="col">Year</th>'+months.map(m=>'<th scope="col">'+m+'</th>').join('')+'</tr></thead><tbody>'+years.map(year=>'<tr><th scope="row">'+year+'</th>'+months.map((month,i)=>{
    const val=lookup.get(year+':'+(i+1));
    if (!Number.isFinite(val)) return '<td><span class="heat-missing" title="'+month+' '+year+' · Missing">–</span></td>';
    const fraction=(val-lo)/(hi-lo||1);
    const intensity=config.anomaly?96*Math.abs(val)/Math.max(Math.abs(lo),Math.abs(hi),1e-12):12+fraction*83;
    const description=month+' '+year+' · '+number(val)+' '+unit;
    return '<td><span style="--heat:'+Math.round(intensity)+'%" class="'+(config.anomaly?(val<0?'heat-negative':'heat-positive'):'')+'" title="'+escape(description)+'" aria-label="'+escape(description)+'"></span></td>';
  }).join('')+'</tr>').join('')+'</tbody></table></div></section>';
}

function statistics(item, unit, config) {
  const {trend:t} = item;
  const values = item.annual.map(p=>p.value).filter(Number.isFinite).sort((a,b)=>a-b);
  const avg = values.length ? values.reduce((a,b)=>a+b,0)/values.length : null;
  const median = values.length ? (values[Math.floor((values.length-1)/2)]+values[Math.ceil((values.length-1)/2)])/2 : null;
  const sd = values.length>1 ? Math.sqrt(values.reduce((s,v)=>s+(v-avg)**2,0)/(values.length-1)) : null;
  const fields = [['Complete years',t.n+' of '+(config.end-config.start+1)], ['Missing months',(config.end-config.start+1)*12-item.monthly.filter(p=>Number.isFinite(p.value)).length],['Mean / median',number(avg)+' / '+number(median)+' '+unit],['Min / max',number(values[0])+' / '+number(values.at(-1))+' '+unit],['Sample standard deviation',number(sd)+' '+unit],['Sample variance',number(sd===null?null:sd**2)+' '+unit+'²'],['OLS t-statistic',number(t.tStatistic,3)],['Theil–Sen per decade',signed(t.senRate)+' '+unit],['Mann–Kendall τ',number(t.mk?.tau,3)],['Mann–Kendall p (unadjusted)',tiny(t.mk?.p)],['Residual lag-1 correlation',number(t.residualLag1,3)],['HAC lag (years)',t.lag ?? '—'],['HAC p by lag',(t.sensitivity??[]).map(item=>item.lag+' yr: '+tiny(item.p)).join(' · ') || '—']];
  return '<div class="stat-readout"><h3>'+escape(item.name)+'</h3><dl>'+fields.map(([k,v])=>'<div><dt>'+escape(k)+'</dt><dd>'+escape(v)+'</dd></div>').join('')+'</dl><p>'+escape(t.reason ?? '')+'</p></div>';
}

function pairedComparison(records, unit) {
  if (records.length<2) return '';
  const [first,second]=records;
  const result=pairedRate(first.annual,second.annual);
  return '<div class="paired-result"><h3>'+escape(first.name)+' − '+escape(second.name)+'</h3><p><strong>'+signed(result.rate)+' '+escape(unit)+'</strong> slope difference · '+result.n+' matched years</p>'
    +'<p>'+(result.ci?'95% interval '+signed(result.ci[0])+' to '+signed(result.ci[1])+' · p '+escape(tiny(result.p)):'The paired record is too short for a 95% interval.')+'</p>'
    +'<p>OLS fits the difference between states year by year. Its uncertainty accounts for covariation between paired values.</p></div>';
}

export function publicVerdict(trend) {
  if(trend.status==='Significant trend')return {
    title:trend.olsRate>0?'Significant increase':'Significant decrease',
    tone:'supported',
    text:'The 95% range stays on one side of zero. The selected record supports a long-term '+(trend.olsRate>0?'increase.':'decrease.')
  };
  if(trend.status==='Insufficient data')return {
    title:'Insufficient data for a verdict',tone:'caution',
    text:'The test needs at least 20 complete years, enough coverage, and measurable variation. Try a longer date range.'
  };
  return {title:'No significant trend detected',tone:'uncertain',
    text:'The evidence does not establish a direction. The climate variable could still be changing.'};
}

function verdictCard(item,variable,config) {
  const t=item.trend, verdict=publicVerdict(t);
  const unit=escape(variable.annualUnit)+'/decade';
  const label=config.anomaly?'annual departures':variable.id==='precip'?'annual precipitation totals':'annual mean temperature';
  return '<article class="public-verdict '+verdict.tone+'"><div class="verdict-copy"><div class="eyebrow">'+escape(item.name)+' · '+escape(label)+'</div><h3>'+verdict.title+'</h3><p>'+verdict.text+'</p></div><div class="verdict-metrics"><span>Estimated change per decade</span><strong>'+signed(t.olsRate)+' <small>'+unit+'</small></strong><p>'+(t.ci?'95% range '+signed(t.ci[0])+' to '+signed(t.ci[1])+' '+unit:'95% range unavailable')+'</p><p>'+t.n+' complete years · '+escape(t.status)+'</p></div></article>';
}

export function renderAnalysis(data, config, model) {
  const {variable,records} = model;
  const unit = config.resolution==='annual' ? variable.annualUnit : variable.unit;
  const period = config.start+'–'+config.end;
  const name = records.map(r=>r.name).join(' & ');
  const anomalyLabel = 'Anomalies from '+data.baseline.join('–');
  const season = records.map(item=>{
    const result = months.map((_,i)=> {
      const values = item.monthly.filter(p=>p.month===i+1&&Number.isFinite(p.value)).map(p=>p.value);
      return {x:i+1,y:values.length?values.reduce((a,b)=>a+b,0)/values.length:null};
    });
    return {label:item.name,color:colors[item.id],points:result,dots:true};
  });
  const monthlyValues = records.flatMap(item=>item.monthly.map(p=>p.value).filter(Number.isFinite));
  const margin=Math.max(0,...monthlyValues.map(Math.abs));
  const lo=monthlyValues.length?(config.anomaly?-margin:Math.min(...monthlyValues)):0;
  const hi=monthlyValues.length?(config.anomaly?margin:Math.max(...monthlyValues)):0;
  const trendUnit=variable.annualUnit+'/decade';
  const source='<div class="source-line">'+escape(data.provenance.source)+' · '+escape(period)+'</div>';
  const provenance='<a href="'+escape(data.provenance.metadataUrl)+'" target="_blank" rel="noreferrer">NOAA dataset ↗</a>';
  const plotPeriod=config.resolution==='monthly'?'Monthly source values · trend inference uses complete calendar years.':'Complete calendar years · '+(variable.id==='precip'?'annual precipitation totals.':'temperature averaged with calendar-day weights.');
  const chartTitle=variable.label+(config.anomaly?' anomalies':'');
  const chart = plot(records.flatMap(item=>chartSeries(item,config)),{
    title: name+' '+variable.label+' historical series',yLabel:(config.anomaly?'Departure':'Value')+' ('+unit+')',tipUnit:unit,xDomain:[config.start,config.end+(config.resolution==='monthly'?11/12:0)],zero:config.anomaly,
    formatX:x=>String(x),detailX:config.resolution==='monthly'?labelMonth:x=>String(x)
  });
  return '<div class="shell workspace enter public-explorer">'
    +'<header class="page-head public-head"><div><a class="back" href="#regions">← Study areas</a><div class="eyebrow">Public Explorer</div><h1 tabindex="-1">'+escape(name)+'</h1><p>'+escape(variable.description)+' · '+escape(period)+' · Statewide estimates</p></div>'
    +'<div class="head-actions"><button class="button ghost" data-action="export">Export CSV <span aria-hidden="true">↓</span></button><button class="button ghost" data-print-report>Print report</button></div></header>'
    +'<section class="study-inputs" aria-label="Choose the data to analyze"><p>Choose a region, a climate variable and a date range. The result updates as you change the selection.</p>'+filters(data,config,{simple:true})+'</section>'
    +'<nav class="evidence-nav" aria-label="In this analysis"><button data-section="history-chart-heading">Historical record</button><button data-section="uncertainty-heading">Statistical evidence</button><button data-section="anomaly-heading">Unusual years</button><button data-section="seasonal-heading">Seasonality</button><a href="#comparison">Compare methods</a><a href="#methods">Metric guide</a></nav>'
    +'<section class="verdict-section" aria-labelledby="verdict-heading"><div class="verdict-heading"><div><h2 id="verdict-heading">Is the trend significant?</h2><p>Historical evidence from NOAA statewide estimates · '+escape(period)+'</p></div><button type="button" class="button ghost slim" data-public-evidence>How we decided ↓</button><a class="button lab-button slim" href="#proof">See if topology actually helps ↗</a></div><div class="answer-grid'+(records.length>1?' compare':'')+'">'+records.map(item=>verdictCard(item,variable,config)).join('')+'</div></section>'
    +'<div class="public-lead"><section class="public-chronology" data-public-chronology aria-labelledby="history-chart-heading"><header><div class="eyebrow">Historical record</div><h2 id="history-chart-heading">'+escape(chartTitle)+'</h2><p>'+escape(plotPeriod)+(config.anomaly?' '+escape(anomalyLabel)+'.':'')+'</p></header>'
    +chart+'<div class="public-zoom">'+(chart.includes('data-plot=')?'<button class="button ghost slim" data-download-chart>Download SVG</button>':'')+(config.end>config.start?'<span>Drag across the chart to select years.</span>':'')
    +(config.end-config.start>=10?'<button class="button ghost slim" data-public-zoom>Latest 10 years</button>':'')
    +(config.start!==data.minYear||config.end!==data.maxYear?'<button class="button ghost slim" data-action="reset-range">Reset range</button>':'')
    +'</div><div class="source-line">'+provenance+' · '+escape(period)+' · '+escape(data.version)+(config.resolution==='annual'&&config.method==='ols'?' · Shading is the 95% interval for the fitted mean.':'')+'</div></section>'
    +'<aside class="public-findings" aria-label="Trend findings"><div class="eyebrow">Trend estimate and test details</div><div class="answer-grid">'+records.map(item=>trendSummary(item,variable.annualUnit,config)).join('')+'</div><p class="public-impact">'+(variable.id==='precip'?'The rates describe change in annual precipitation totals per decade.':'A positive rate means the fitted annual average temperature increased.')+'</p></aside></div>'
    +'<div class="public-evidence-row"><section class="public-section" aria-labelledby="uncertainty-heading"><div class="eyebrow">Statistical evidence</div><h2 id="uncertainty-heading">How certain is the trend?</h2><p>Zero means no linear change. If the 95% range includes zero, the record leaves room for a flat trend as well as change. The p-value measures evidence against a zero slope. The rate per decade describes how large the estimated change is.</p>'+uncertainty(records,trendUnit,colors)+pairedComparison(records,trendUnit)
    +'<details class="public-details evidence"><summary>Statistical evidence and data coverage</summary><div class="evidence-content">'+records.map(item=>statistics(item,variable.annualUnit,config)).join('')+'</div><p>Annual ordinary least squares uses Newey–West standard errors to allow short-range dependence. The significance threshold is 0.05 for an individual selection. Repeated searches increase the chance of a small p-value. The unadjusted Mann–Kendall diagnostic describes direction under an independence assumption.</p></details>'+source+'</section>'
    +'<section class="public-section public-place" aria-labelledby="region-map-heading"><div class="eyebrow">Study footprint</div><h2 id="region-map-heading">Statewide coverage</h2>'+renderStudyMap(data.regions,config.region)
    +'<p>'+escape(records.map(item=>item.sourceGeography).join(' · '))+'</p><p>Colors identify selected state boundaries. Each series is a statewide aggregate of interpolated surface-station observations.</p><a href="#nasa">Explore NASA mission context ↗</a></section></div>'
    +'<section class="public-section public-calendar" aria-labelledby="seasonal-heading"><div class="eyebrow">Calendar patterns</div><h2 id="seasonal-heading">Seasonality and monthly departures</h2><div class="public-calendar-grid"><div><h3>Typical month</h3><p>Mean for each calendar month across '+escape(period)+(config.anomaly?', relative to the '+escape(data.baseline.join('–'))+' monthly normal.':'.')+'</p>'
    +plot(season,{title:'Mean by calendar month',yLabel:(config.anomaly?'Departure':'Mean')+' ('+variable.unit+')',tipUnit:variable.unit,xLabel:'Calendar month',xDomain:[1,12],xTicks:[1,3,5,7,9,11,12],formatX:x=>months[x-1],compact:true,zero:config.anomaly})
    +'</div><div class="public-heat"><h3>Month-by-year heatmap</h3><p>'+(config.anomaly?escape(anomalyLabel):'Raw monthly values')+' · '+(records.length>1?'Shared scale for both states. ':'')+'Scroll for earlier years.</p><div class="public-heat-pair">'+records.map(row=>heatmap(row,variable.unit,lo,hi,config)).join('')+'</div><div class="heat-key'+(config.anomaly?' heat-diverging':'')+'"><span>'+number(lo)+' '+escape(variable.unit)+'</span><i></i><span>'+number(hi)+' '+escape(variable.unit)+'</span><span>· – Missing</span></div></div></div>'+source+'</section>'
    +'<div class="public-evidence-row public-depth"><section class="public-section"><div class="eyebrow">Period comparison</div><h2>Early and late years</h2><p>Annual '+escape(variable.label.toLowerCase())+(config.anomaly?' anomalies':'')+' split at the middle calendar year. Each group uses complete annual values.</p>'
    +distributionFigure(records,config.start,config.end,variable.annualUnit,colors)+source+'</section>'
    +'<section class="public-section"><div class="eyebrow">Record quality</div><h2>Monthly coverage</h2><p>Annual analysis requires twelve valid months. Missing periods are never filled.</p>'+coverageFigure(records,config.start,config.end,colors)+source+'</section></div>'
    +renderDiagnostics(data,config,model,colors)
    +(variable.id==='precip'?'<section class="public-section"><div class="eyebrow">Precipitation extremes</div><h2>Wettest month in each complete year</h2><p>Maximum statewide monthly total. The source reports monthly totals, so this view describes wet months at the state scale.</p>'+precipFigure(records,config.start,config.end,colors)+source+'</section>':'')
    +'<details class="public-section detail-diagnostics"><summary>Data provenance and processing</summary><dl class="study-provenance"><dt>Provider and dataset</dt><dd>'+escape(data.provenance.source)+' · '+provenance+'</dd><dt>Archive dates</dt><dd>'+escape(data.provenance.startDate)+' to '+escape(data.provenance.endDate)+'</dd><dt>Selected period and unit</dt><dd>'+escape(period)+' · '+escape(unit)+'</dd><dt>Geographic footprint</dt><dd>'+escape(records.map(item=>item.sourceGeography).join(' · '))+'</dd><dt>Version</dt><dd>'+escape(data.version)+'</dd><dt>Processing</dt><dd>Annual values require all twelve months. Temperature uses calendar-day weights. Precipitation sums monthly totals. The baseline for departures is '+escape(data.baseline.join('–'))+'. Missing data stay blank.</dd></dl></details>'
    +'<section class="public-next"><div><h2>Investigate the shape of variability</h2><p>Open the same study in the research lab, or compare conventional and topological detectors on a common test.</p></div><div class="head-actions"><a class="button lab-button" href="#topology">Open Topo-Signal <span aria-hidden="true">↗</span></a><a class="button ghost" href="#comparison">Traditional vs Topo-Signal ↗</a><a class="button ghost" href="#outlook">Future Outlook ↗</a><a class="button ghost" href="#proof">Open Proof Lab ↗</a><a class="button ghost" href="#benchmark">See advanced evidence <span aria-hidden="true">↗</span></a></div></section></div>';
}

export function exportCsv(data, config, model) {
  const {variable,records} = model;
  const cols = ['row_type','region','date_or_period','variable','value','unit','source','dataset_version','method','n_years','rate_per_decade','modeled_change','ols_ci95_low_per_decade','ols_ci95_high_per_decade','ols_p','sen_rate_per_decade','mk_p_unadjusted','status','notes'];
  const csv = v => '"'+String(v ?? '').replaceAll('"','""')+'"';
  const rows = records.flatMap(item=>{
    const t=item.trend;
    const series = config.resolution==='annual'?item.annual.map(p=>({date:p.year,value:p.value})):item.monthly;
    const id = config.anomaly?variable.anomalyKey:variable.id;
    const unit = config.resolution==='annual'?variable.annualUnit:variable.unit;
    return [
      ['annual_trend',item.name,config.start+'–'+config.end,id,'',variable.annualUnit,data.provenance.source,data.version,config.method==='ols'?'OLS / HAC':'Theil–Sen effect; OLS / HAC inference',t.n,t.rate,t.change,t.ci?.[0],t.ci?.[1],t.p,t.senRate,t.mk?.p,t.status,(config.anomaly?'Baseline '+data.baseline.join('–')+'. ':'')+(t.reason??'')+' Individual tests; multiplicity unadjusted. Experimental Topo-Signal excluded.'],
      ...series.map(p=>['derived_'+config.resolution,item.name,p.date,id,p.value,unit,data.provenance.source,data.version,'','','','','','','','','',p.value==null?'Missing or inadequate coverage':config.anomaly?'Baseline '+data.baseline.join('–'):''])
    ];
  });
  const output = [cols,...rows].map(row=>row.map(csv).join(',')).join('\r\n');
  const link=document.createElement('a');
  link.href=URL.createObjectURL(new Blob(['\ufeff',output],{type:'text/csv;charset=utf-8'}));
  link.download='ToppoTerra-'+config.region+'-'+variable.id+'-'+config.start+'-'+config.end+'.csv';
  link.click();
  setTimeout(()=>URL.revokeObjectURL(link.href),1000);
}

