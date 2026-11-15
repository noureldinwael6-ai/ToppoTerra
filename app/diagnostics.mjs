import {annualSeries, fitTrend} from './science.mjs';
import {escape, plot, signed} from './charts.mjs';

const median = values => {
  const sorted = [...values].sort((a,b)=>a-b);
  const middle = Math.floor(sorted.length/2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle-1]+sorted[middle])/2;
};

export function annualDiagnostics(annual, baselineAnomalies, selectedAnomalies) {
  const observations = new Map(annual.filter(row=>Number.isFinite(row.value)).map(row=>[row.year,row.value]));
  const fit = fitTrend(annual);
  const residuals = fit.fitted.filter(row=>observations.has(row.year))
    .map(row=>({x:row.year,y:observations.get(row.year)-row.value}));
  const rolling = Array.from(observations, ([year])=>{
    const values = Array.from({length:5},(_,i)=>observations.get(year-i));
    return {x:year,y:values.every(Number.isFinite)?values.reduce((sum,v)=>sum+v,0)/5:null};
  });
  const reference = baselineAnomalies.map(row=>row.value).filter(Number.isFinite);
  const center = reference.length>=20 ? median(reference) : null;
  const mad = center===null ? null : median(reference.map(value=>Math.abs(value-center)));
  const anomalies = selectedAnomalies.map(row=>({x:row.year,y:row.value}));
  const unusual = mad>0 ? anomalies.filter(point=>Number.isFinite(point.y) && Math.abs(point.y-center)>3.5*1.4826*mad) : [];
  return {rolling,residuals,anomalies,unusual,center,mad,referenceCount:reference.length};
}

export function renderDiagnostics(data, config, model, colors) {
  const {variable,records} = model;
  const [first,last] = data.baseline;
  const results = records.map(record=>{
    const raw = data.series[record.id];
    const baseline = raw.filter(row=>row.year>=first&&row.year<=last);
    const selected = raw.filter(row=>row.year>=config.start&&row.year<=config.end);
    return {...annualDiagnostics(record.annual,annualSeries(baseline,variable.id,true),annualSeries(selected,variable.id,true)),record};
  });
  const unit = variable.annualUnit;
  const source = escape(data.provenance.source)+' · '+config.start+'–'+config.end+' · '+escape(data.version);
  const chart = (key,title,yLabel,zero=false) => plot(results.flatMap(result=>{
    const {record}=result;
    const primary={label:record.name, color:colors[record.id],points:result[key],gap:1.01,dots:true};
    return key==='anomalies' && result.unusual.length
      ? [primary,{label:record.name+' flagged year',color:'#f8c95b',points:result.unusual,dots:true,gap:0}]
      : [primary];
  }),{title,yLabel:yLabel+' ('+unit+')',tipUnit:unit,zero,xDomain:[config.start,config.end],formatX:String});
  const findings = results.map(({record,mad,unusual,referenceCount})=>{
    const description=mad>0 ? (unusual.length?unusual.map(p=>p.x+' ('+signed(p.y)+' '+unit+')').join(', '):'No years crossed the screening threshold.')
      : 'Screen unavailable with '+referenceCount+' complete reference years or zero baseline spread.';
    return '<li><strong>'+escape(record.name)+' · </strong>'+escape(description)+'</li>';
  }).join('');
  return '<section class="public-section" aria-labelledby="anomaly-heading"><h2 id="anomaly-heading" tabindex="-1">Unusual years</h2>'
    +'<p>Annual departures compare each year with the '+first+'–'+last+' NOAA seasonal baseline. Highlighted years were far from the typical baseline departure.</p>'
    +'<ul>'+findings+'</ul>'+chart('anomalies','Annual departures and flagged years','Departure',true)
    +'<details class="public-details"><summary>How was this calculated?</summary><p>We aggregate each complete year’s monthly departures and compare it with the median annual departure in '+first+'–'+last+'. A flag requires an absolute difference greater than 3.5 × 1.4826 × the median absolute deviation. The screen needs 20 complete baseline years and positive spread. The threshold is descriptive. Skewed precipitation, dependent years and an evolving climate can affect flags.</p></details><p class="source-line">'+source+'</p></section>'
    +'<details class="public-section detail-diagnostics"><summary>Moving averages and regression residuals</summary>'
    +'<h3>Five-year moving average</h3><p>Each point averages the year shown and the four preceding years in your selection. Gaps leave the average unavailable. Smoothing reduces short-term fluctuations and can delay apparent turning points.</p>'
    +chart('rolling','Trailing five-year average',config.anomaly?'Average departure':'Average value')
    +'<h3>Linear regression residuals</h3><p>Each point shows the observed annual value minus the ordinary least squares fit. Runs above or below zero can indicate temporal dependence or a departure from a linear trend. The residuals refer to OLS even when the historical chart displays Theil–Sen.</p>'
    +chart('residuals','Annual OLS residuals','Residual',true)
    +'<p class="source-line">'+source+'</p></details>';
}
