import {number} from './charts.mjs';
import {ripsEdges,bettiCounts} from './phase-space.mjs';
import {bottleneckH1,ripsPersistence} from './topology.mjs';

const square=side=>[[0,0],[side,0],[side,side],[0,side]];
const baseSquare=square(1);
const intervals=ripsPersistence(baseSquare);
const edges=ripsEdges(baseSquare);
const featureOf=features=>features.find(f=>f.dimension===1);
const polyline=(points,color)=>'<polyline points="'+points.map(p=>p.map(v=>v.toFixed(2)).join(',')).join(' ')+'" fill="none" stroke="'+color+'" stroke-width="2.5"/>';
const svg=(label,body)=>'<svg viewBox="0 0 420 180" role="img" aria-label="'+label+'">'+body+'</svg>';
const dot=(x,y,color,r=4)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+color+'"/>';
const mint='#a9ebca',violet='#c8b3fa',amber='#edb688';

export function teachingTrend(noise) {
  // Remove the mean and linear projection of the fixed residual vector.
  // Scaling the resulting residuals leaves the educational OLS fit invariant.
  const errors=[.8,-.9,1.2,-1.6,1.7,.2,-1.1,.9,-1.6,1.5,-.3];
  const center=errors.reduce((sum,value)=>sum+value,0)/errors.length;
  const tilt=errors.reduce((sum,value,i)=>sum+value*(i-5),0)/110;
  const fitted=Array.from({length:11},(_,i)=>1+.2*i);
  return {fitted,values:fitted.map((value,i)=>value+noise*(errors[i]-center-tilt*(i-5)))};
}

function trendDemo(value) {
  const {fitted,values}=teachingTrend(value);
  const locate=(v,i)=>[30+36*i,128-25*v];
  return {picture:svg('Eleven synthetic observations and their fitted line',
    '<path d="M30 25 V150 H390" stroke="currentColor" fill="none"/>'+polyline(fitted.map(locate),mint)
    +values.map((v,i)=>dot(...locate(v,i),amber)).join('')
    +'<text x="30" y="168">Year 0</text><text x="390" y="168" text-anchor="end">Year 10</text>'),
    caption:'The fitted value rises from 1 to 3 across ten years, or +2 example units per decade. The slider changes the scatter around the line. By construction, the scatter has zero mean and zero linear slope.'};
}

const orderings=[[0,1,0,-1,0,1,0,-1,0,1,0,-1,0],[-1,0,1,1,0,-1,0,1,-1,0,0,0,0]];

function embeddingDemo(value,lag) {
  const samples=orderings[value];
  const trail=samples.slice(lag).map((sample,i)=>[sample,samples[i]]);
  const linePoints=samples.map((v,i)=>[25+14*i,73-29*v]);
  const cloud=trail.map(([x,y])=>[320+52*x,92-48*y]);
  return {picture:svg('Synthetic samples and the XY projection of trailing delay coordinates',
    '<path d="M25 73 H195 M257 92 H385 M320 38 V147" stroke="currentColor" opacity=".55"/>'
    +polyline(linePoints,mint)+linePoints.map(p=>dot(...p,mint,3)).join('')
    +polyline(cloud,violet)+cloud.map(p=>dot(...p,violet,3)).join('')
    +dot(...linePoints.at(-1),amber,5)+dot(...linePoints.at(-1-lag),amber,5)+dot(...cloud.at(-1),amber,5)
    +'<text x="25" y="141">Sample order</text><text x="384" y="164" text-anchor="end">x(t)</text><text x="260" y="32">x(t−τ)</text>'),
    caption:'Both sequences contain the same 13 values and have mean zero. The last point pairs '+samples.at(-1)+' with '+samples.at(-1-lag)+', the value '+lag+' step'+(lag===1?'':'s')+' earlier. Changing the order or the lag changes which values sit together. The research view adds a third coordinate.'};
}

function filtrationDemo(scale) {
  const corners=[[152,30],[268,30],[268,146],[152,146]];
  const link=({i,j})=>polyline([corners[i],corners[j]],mint);
  const {components,loops}=bettiCounts(intervals,scale);
  const features=scale>=Math.SQRT2?'<rect x="152" y="30" width="116" height="116" fill="#a9ebca" opacity=".23"/>':'';
  return {picture:svg('Four points with all edges within the selected distance',
    features+edges.filter(edge=>edge.distance<=scale).map(link).join('')+corners.map(p=>dot(...p,amber,6)).join('')),
    caption:'ε = '+number(scale,2)+' · '+components+' connected component'+(components===1?'':'s')+' (H₀) · '+loops+' loop'+(loops===1?'':'s')+' (H₁). The four edges enter at 1. The diagonals and filling triangles enter together at √2. At that scale the loop dies.'};
}

function distanceDemo(side) {
  const a=featureOf(intervals), features=ripsPersistence(square(side)), b=featureOf(features);
  const distance=bottleneckH1(intervals,features);
  const max=2.5, x=(v,offset)=>offset+112*v/max, y=v=>135-110*v/max;
  const diag=(f,offset,color)=>'<path d="M'+offset+' 135 L'+x(max,offset)+' '+y(max)+'" stroke="currentColor" opacity=".6"/>'+dot(x(f.birth,offset),y(f.death),color,5);
  const together=Math.max(Math.abs(a.birth-b.birth),Math.abs(a.death-b.death));
  const separate=Math.max(a.persistence,b.persistence)/2;
  return {picture:svg('Two synthetic persistence diagrams on the same scale',
    diag(a,57,mint)+diag(b,251,violet)
    +'<path d="M'+x(a.birth,57)+' '+y(a.death)+' L'+x(b.birth,251)+' '+y(b.death)+'" stroke="'+amber+'" stroke-dasharray="4 4" opacity=".8"/>'
    +'<text x="57" y="160">Reference birth</text><text x="251" y="160">Selected birth</text><text x="12" y="22">Death</text>'),
    caption:'Pair the two dots for a cost of '+number(together,3)+', or send both to the diagonal for a worst cost of '+number(separate,3)+'. The smaller cost is the exact bottleneck distance '+number(distance,3)+'. The dashed line illustrates the direct pairing option.'};
}

const examples = {
  trend:{title:'A decade of change',controls:'<label>Scatter around the trend <input type="range" min="0" max="1.5" step=".1" value=".6" data-learn-value></label>',draw:trendDemo},
  embedding:{title:'Turn a sequence into a shape',controls:'<label>Sample order <select data-learn-value><option value="0">Repeating order</option><option value="1">Shuffled order</option></select></label><label>Delay τ <select data-learn-lag><option value="1">1 step</option><option value="2">2 steps</option><option value="3">3 steps</option></select></label>',draw:embeddingDemo},
  filtration:{title:'Watch points connect and loops fill',controls:'<label>Distance ε <input type="range" min="0" max="1.6" step=".01" value="1.1" data-learn-value></label>',draw:filtrationDemo},
  distance:{title:'Compare two persistence diagrams',controls:'<label>Side length in the second diagram <input type="range" min=".5" max="1.5" step=".01" value="1.1" data-learn-value></label>',draw:distanceDemo}
};

export function learningIllustrations(keys=Object.keys(examples)) {
  return '<section class="panel learning-group"><h2>Try the mathematics</h2><p>These synthetic examples use invented values for teaching.</p><div class="learning-grid">'+keys.map(key=>{
    const example=examples[key];
    return '<details class="result-explanation learning-demo" data-learning="'+key+'"><summary>'+example.title+'</summary>'+example.controls+'<figure><div data-learning-picture></div><figcaption aria-live="polite"></figcaption></figure></details>';
  }).join('')+'</div></section>';
}

export function mountLearning(root) {
  for(const demo of root.querySelectorAll('[data-learning]')){
    const example=examples[demo.dataset.learning];
    const input=demo.querySelector('[data-learn-value]');
    const lag=demo.querySelector('[data-learn-lag]');
    const update=()=>{
      const {picture,caption}=example.draw(Number(input.value),Number(lag?.value??1));
      demo.querySelector('[data-learning-picture]').innerHTML=picture;
      demo.querySelector('figcaption').textContent=caption;
    };
    demo.addEventListener('input',update);
    update();
  }
}
