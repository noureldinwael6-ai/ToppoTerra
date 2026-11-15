import {escape, number, signed} from './charts.mjs';

export const structuralStatus = 'Structural difference measured. Statistical significance has not been established.';
export const monthSpan = window => window ? window.start.slice(0,7)+' to '+window.end.slice(0,7) : 'Unavailable';

function variableName(variable,anomaly) {
  const label=variable.id==='precip'?'annual precipitation totals':'annual mean temperature';
  return anomaly ? 'annual departures in '+label : label;
}

export function trendNarrative(trend,variable,config) {
  const subject=variableName(variable,config.anomaly);
  if(!Number.isFinite(trend.olsRate))return 'There are too few complete years to fit a line to '+subject+'.';
  const direction=trend.olsRate>0?'upward':trend.olsRate<0?'downward':'flat';
  const rate=signed(trend.olsRate)+' '+variable.annualUnit+' per decade';
  const opening='The fitted line for '+subject+' is '+direction+' ('+rate+') over '+trend.start+'–'+trend.end+'. ';
  if(trend.status==='Significant trend')return opening+'The test supports a long-term linear change over those years.';
  if(trend.status==='Possible/emerging change')return opening+'Both fits point in the same direction, but the uncertainty still leaves room for zero linear change.';
  if(!Number.isFinite(trend.p))return opening+(trend.reason?' '+trend.reason:' The test is unavailable for this selection.');
  return opening+'The evidence is inconclusive about a long-term linear change.';
}

export function explain(title,meaning,importance,calculation,visual='') {
  return '<details class="result-explanation"><summary>'+title+'</summary>'
    +'<p><strong>What does this mean?</strong> '+meaning+'</p><p><strong>Why is it important?</strong> '+importance+'</p>'+visual
    +'<details class="calculation"><summary>How was this calculated?</summary>'+calculation+'</details></details>';
}

export function tReference(trend) {
  const t=Math.abs(trend.tStatistic);
  if(!Number.isFinite(trend.tStatistic)||trend.n<=2)return null;
  const df=trend.n-2;
  const extent=Math.max(4,t+Math.max(1,t*.08));
  const height=x=>(1+x*x/df)**(-(df+1)/2);
  return {t,df,extent,height};
}

function nullIllustration(trend) {
  const nullModel=tReference(trend);
  if(!nullModel)return '';
  const {t,df,extent,height}=nullModel;
  const sx=x=>42+416*(x+extent)/(2*extent);
  const sy=x=>103-81*height(x);
  const line=(a,b)=>Array.from({length:65},(_,i)=>{
    const x=a+(b-a)*i/64;
    return sx(x).toFixed(2)+' '+sy(x).toFixed(2);
  }).join(' L');
  const shade=(a,b)=>'<path d="M'+sx(a)+' 103 L'+line(a,b)+' L'+sx(b)+' 103 Z" fill="#edb688" opacity=".65"/>';
  const mark=x=>'<path d="M'+sx(x)+' 14 V103" stroke="#edb688" stroke-dasharray="4 3"/>';
  const label=(s,x)=>'<text x="'+sx(x)+'" y="125" text-anchor="middle">'+s+'</text>';
  return '<figure class="story-illustration"><svg viewBox="0 0 500 139" role="img" aria-label="Approximate Student t null reference with both tails beyond the absolute observed statistic"><path d="M42 103 H458" stroke="currentColor"/>'+shade(-extent,-t)+shade(t,extent)+'<path d="M'+line(-extent,extent)+'" fill="none" stroke="#a9ebca" stroke-width="2"/>'+mark(-t)+mark(t)+label('0',0)+(t>extent*.17?label('−|t|',-t)+label('+|t|',t):'')+'</svg><figcaption>Approximate Student t reference with '+df+' degrees of freedom. The two shaded tails begin at |t| = '+number(t,3)+'. The curve is scaled to its peak and cropped for display. The calculated p-value includes both full tails.</figcaption></figure>';
}

export function trendExplanation(trend,variable,config) {
  const interval=trend.ci?'The approximate 95% slope interval runs from '+signed(trend.ci[0])+' to '+signed(trend.ci[1])+' '+variable.annualUnit+' per decade.':'A slope interval is unavailable for this selection.';
  const p=Number.isFinite(trend.p)?'p = '+escape(String(trend.p))+' · t = '+escape(String(trend.tStatistic))+' · '+(trend.n-2)+' degrees of freedom · '+trend.lag+'-year HAC bandwidth.':'A numeric p-value and test statistic are unavailable.';
  return explain('Read the trend, interval and p-value',escape(trendNarrative(trend,variable,config)),
    escape(interval)+' The line summarizes the direction across years. Evidence about the slope depends on both its size and its uncertainty. A p-value describes the chance of a test statistic at least this extreme if the true linear slope is zero and the model assumptions hold.',
    '<p>Fit ŷ = a + b·year by least squares using '+trend.n+' complete annual values. The decade rate is 10b. Temperature uses calendar-day weights and annual precipitation sums monthly totals. The calendar-year Newey–West covariance allows short-range dependence and changing residual variance. Use t = b/SE(b), p = 2P(T<sub>n−2</sub> ≥ |t|), and 10[b ± t<sub>0.975,n−2</sub>·SE(b)]. '+p+'</p><p>The approximate test uses a zero slope as the statistical null hypothesis. Repeated selections are unadjusted. Seasonal aggregation, nonlinear changes, record coverage and persistent residuals affect interpretation. <a href="https://www.nber.org/papers/t0055" target="_blank" rel="noreferrer">Newey and West’s covariance method ↗</a></p>',
    nullIllustration(trend));
}

export function topologyInterpretation(window, reference, distance, channel) {
  if(!window || !reference || !Number.isFinite(distance))return 'A diagram distance requires two complete windows with a valid reference scale.';
  const opening='For '+channel.toLowerCase()+', the '+monthSpan(window)+' window was compared with '+monthSpan(reference)+'. ';
  return opening+(distance===0?'Their finite loop diagrams coincide at the current settings.':'Their finite loop diagrams differ at the current settings.')+' '+structuralStatus;
}

export function topologyExplanation({result,window,reference,distance,channel,title='What does this diagram distance mean?',digits=4}) {
  if(!Number.isFinite(distance)||!window||!reference)return '';
  const featureCount=w=>w.features.filter(f=>f.dimension===1&&f.death!==null).length;
  return explain(title,
    escape(topologyInterpretation(window,reference,distance,channel)),
    'Think of each diagram as a list of the scales where loops appear and fill. To compare the lists, pair similar features and allow unmatched features to shrink to the diagonal. The distance is the largest adjustment in the best possible pairing. Here the diagrams contain '+featureCount(window)+' and '+featureCount(reference)+' finite H<sub>1</sub> features. The result adds information about the arrangement of lagged observations. A loop alone cannot establish a climate cycle.',
    '<p>The exact bottleneck distance is <strong>'+distance.toFixed(digits)+'</strong>. For each possible matching, take the largest L∞ cost in birth/death coordinates, then minimize it. Matching to the diagonal costs half the feature lifetime. Distances use dimensionless Euclidean coordinates after scaling each channel to its '+escape(result.baseline.join('–'))+' monthly anomaly mean and sample standard deviation. No additional normalization or universal threshold applies.</p><p>Each '+result.windowSize+'-month complete window uses '+window.points.length+' sampled delay vectors with '+result.dimensions+' coordinates and a '+result.delay+'-month lag. The scan moves '+result.step+' months at a time. Compare only under documented settings and use <a href="#benchmark">the separate calibrated experiment</a> to see how a reference-process test works. <a href="https://arxiv.org/abs/1307.6188" target="_blank" rel="noreferrer">Perea and Harer on sliding windows and persistence ↗</a></p>');
}

export function publicStory(data,config,model) {
  const {variable,records}=model;
  return '<section class="panel result-story" aria-labelledby="story-heading"><h2 id="story-heading" tabindex="-1">What changed, and how sure are we?</h2>'
    +'<div class="story-cards">'+records.map(record=>{
      const finite=record.annual.filter(p=>Number.isFinite(p.value));
      const last=finite.at(-1), first=finite[0];
      const observed=first&&last&&first.year!==last.year?'The first and last complete years in view were '+first.year+' ('+number(first.value)+' '+variable.annualUnit+') and '+last.year+' ('+number(last.value)+' '+variable.annualUnit+').':'This selection contains '+finite.length+' complete annual observation'+(finite.length===1?'':'s')+'.';
      const missing=12*(config.end-config.start+1)-record.monthly.filter(p=>Number.isFinite(p.value)).length;
      return '<article class="story-card"><h3>'+escape(record.name)+'</h3><div><h4>What we observed</h4><p>'+escape(observed)+' The historical chart traces the observations between those dates.</p></div>'
        +'<div><h4>What the statistics tell us</h4><p>'+escape(trendNarrative(record.trend,variable,config))+'</p></div>'
        +'<div><h4>What Topo-Signal examined</h4><div data-story-topology="'+escape(record.id)+'" role="status"><p>Checking the latest complete window of monthly departures…</p></div></div>'
        +'<div><h4>What remains uncertain</h4><p>'+missing+' missing months in '+config.start+'–'+config.end+'. Nearby years can behave similarly, so the trend test adjusts for short-range dependence. The archive reports statewide estimates. Local experiences and causes require other evidence.</p></div>'
        +trendExplanation(record.trend,variable,config)+'</article>';
    }).join('')+'</div><p class="story-source">'+escape(data.provenance.source)+' · <a href="#comparison">Compare both methods and their time windows</a></p></section>';
}

export function publicTopologyStory(output,channel) {
  const window=output.windows?.at(-1);
  const distance=window?.referenceChange;
  if(!window||!Number.isFinite(distance))return '<p>'+escape(output.error??output.reason??'A complete frozen reference and study window are required for a structural comparison.')+'</p>';
  return '<p>'+escape(topologyInterpretation(window,output.reference,distance,channel))+'</p>'
    +'<p>The trend describes the direction of annual values. The diagram comparison describes the shape of monthly variability in two specific periods.</p>'
    +topologyExplanation({result:output,window,reference:output.reference,distance,channel});
}
