const ink = '#a9ebca';
const dimensions = new Map();
let nextId = 0;
export const charts = new Map();
export const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const number = (value, decimals = 2) => Number.isFinite(value) ? value.toLocaleString('en-US', {maximumFractionDigits:decimals}) : '—';
export const signed = (value, decimals = 2) => Number.isFinite(value) ? (value > 0 ? '+' : value < 0 ? '−' : '') + number(Math.abs(value), decimals) : '—';
export const tiny = value => !Number.isFinite(value) ? '—' : value < 0.001 ? '< 0.001' : number(value, 3);

function niceDomain(values, includeZero, count) {
  if (includeZero) values.push(0);
  let min = Math.min(...values), max = Math.max(...values);
  if (min === max) { min -= Math.abs(min) * .08 || 1; max += Math.abs(max) * .08 || 1; }
  const raw = (max - min) / count;
  const unit = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].find(tick => tick * unit >= raw) * unit;
  const low = Math.floor(min / step) * step;
  const high = Math.ceil(max / step) * step;
  return {low,high,ticks:Array.from({length:Math.round((high-low)/step)+1}, (_,i) => low + i*step)};
}

function lines(points, sx, sy, gap) {
  let last = null;
  return points.map(point => {
    if (!Number.isFinite(point.y)) {last = null; return '';}
    const op = last === null || point.x - last > gap ? 'M' : 'L';
    last = point.x;
    return op + sx(point.x).toFixed(2) + ',' + sy(point.y).toFixed(2);
  }).join(' ');
}

export function plot(series, options) {
  const valid = series.flatMap(item => item.points.filter(point => Number.isFinite(point.x) && Number.isFinite(point.y)));
  if (!valid.length) return '<div class="plot-empty" role="status">No values meet the selected coverage rules.</div>';
  const id = 'plot-' + ++nextId;
  const width = matchMedia('(max-width: 620px)').matches ? 420 : options.compact ? 550 : matchMedia('(max-width: 850px)').matches ? 720 : 940;
  const height = options.height ?? (width < 500 ? 265 : 320);
  const pad = {l: width < 500 ? 51 : 66,r: 22,t: 35,b: 52};
  const yDomain = niceDomain(valid.flatMap(point => [point.y, point.lo, point.hi].filter(Number.isFinite)),options.zero,5);
  if (options.discreteY) yDomain.ticks = yDomain.ticks.filter(Number.isInteger);
  const pointsX = valid.map(point => point.x);
  const minX = options.xDomain?.[0] ?? Math.min(...pointsX);
  const maxX = options.xDomain?.[1] ?? Math.max(...pointsX);
  const sx = x => minX === maxX ? (width + pad.l - pad.r)/2 : pad.l + ((x-minX)/(maxX-minX))*(width-pad.l-pad.r);
  const sy = y => height-pad.b-((y-yDomain.low)/(yDomain.high-yDomain.low))*(height-pad.b-pad.t);
  const yearStep = maxX - minX > 36 ? 10 : maxX - minX > 12 ? 5 : maxX - minX > 5 ? 2 : 1;
  const xTicks = options.xTicks ?? (!options.scatter ? [...new Set([Math.ceil(minX), ...Array.from({length:Math.floor((Math.floor(maxX) - Math.ceil(minX/yearStep)*yearStep)/yearStep)+1}, (_,i) => Math.ceil(minX/yearStep)*yearStep + i*yearStep)])].filter((year,i,a) => i === 0 || year-a[i-1] >= yearStep*.55) : niceDomain(pointsX,false,5).ticks.filter(x => x>=minX && x<=maxX));
  const fmtX = options.formatX ?? (x => number(x,1));
  const xLabels = xTicks.map(x => '<text x="'+sx(x)+'" y="'+(height-pad.b+21)+'" text-anchor="middle">'+escape(fmtX(x))+'</text>').join('');
  const grid = yDomain.ticks.map(y => '<line class="'+(Math.abs(y)<1e-8?'grid-zero':'')+'" x1="'+pad.l+'" x2="'+(width-pad.r)+'" y1="'+sy(y)+'" y2="'+sy(y)+'"/><text x="'+(pad.l-10)+'" y="'+(sy(y)+4)+'" text-anchor="end">'+number(Math.abs(y)<1e-8?0:y,2)+'</text>').join('');
  const shapes = series.map(item => {
    const color = item.color ?? ink;
    const bounded = item.points.filter(point => Number.isFinite(point.lo) && Number.isFinite(point.hi));
    const bands = [];
    for (const point of bounded) {
      const last = bands.at(-1);
      if (!last || point.x - last.at(-1).x > (item.gap ?? Infinity)) bands.push([point]);
      else last.push(point);
    }
    const band = bands.filter(group => group.length > 1).map(group => '<polygon points="'+group.map(p => sx(p.x)+','+sy(p.hi)).concat([...group].reverse().map(p => sx(p.x)+','+sy(p.lo))).join(' ')+'" fill="'+color+'" opacity=".15"/>').join('');
    if (options.scatter) return item.points.filter(p=>Number.isFinite(p.y)).map(p=>'<circle cx="'+sx(p.x)+'" cy="'+sy(p.y)+'" r="4" fill="'+color+'" fill-opacity=".72"><title>'+escape(p.label ?? item.label)+', '+number(p.x)+', '+number(p.y)+'</title></circle>').join('');
    const whiskers=item.whiskers?bounded.map(p=>'<path d="M'+sx(p.x)+','+sy(p.lo)+'V'+sy(p.hi)+' M'+(sx(p.x)-4)+','+sy(p.lo)+'h8 M'+(sx(p.x)-4)+','+sy(p.hi)+'h8" stroke="'+color+'" opacity=".75"/>').join(''):'';
    const linePoints = item.step ? item.points.flatMap((point,i)=>i ? [{x:point.x,y:item.points[i-1].y},point] : [point]) : item.points;
    const markers = item.dots ? item.points.filter(p=>Number.isFinite(p.y)).map(p=>'<circle cx="'+sx(p.x)+'" cy="'+sy(p.y)+'" r="2.5" fill="'+color+'"/>').join('') : '';
    return band + whiskers + '<path d="'+lines(linePoints,sx,sy,item.gap ?? Infinity)+'" fill="none" stroke="'+color+'" stroke-width="'+(item.dash ? 1.7 : 2.1)+'" '+(item.dash?'stroke-dasharray="5 4"':'')+' vector-effect="non-scaling-stroke"/>'+markers;
  }).join('');
  const diagonal = options.diagonal ? '<line x1="'+sx(Math.max(minX,yDomain.low))+'" x2="'+sx(Math.min(maxX,yDomain.high))+'" y1="'+sy(Math.max(minX,yDomain.low))+'" y2="'+sy(Math.min(maxX,yDomain.high))+'" stroke="#a8bab9" opacity=".6" stroke-dasharray="4 5"/>' : '';
  const boundary=Number.isFinite(options.boundary)?'<line x1="'+sx(options.boundary)+'" x2="'+sx(options.boundary)+'" y1="'+pad.t+'" y2="'+(height-pad.b)+'" stroke="#9db3b8" stroke-dasharray="3 4"><title>Observed / projected boundary</title></line>':'';
  charts.set(id, {valid,series,options,width,sx,pad,fmtX,height});
  dimensions.set(id, -1);
  const legend = series.map(item => '<span><i class="'+(item.dash?'dashed':'')+'" style="--dot:'+(item.color ?? ink)+'"></i>'+escape(item.label)+'</span>').join('');
  return '<figure class="figure"><div class="plot" data-plot="'+id+'" '+(!options.scatter?'tabindex="0" aria-label="'+escape(options.title)+'. Use arrow keys to read data values."':'')+'><svg viewBox="0 0 '+width+' '+height+'" role="img" aria-label="'+escape(options.title)+'"><g class="plot-grid">'+grid+xLabels+'</g><text class="axis-title" x="'+pad.l+'" y="17">'+escape(options.yLabel)+'</text><text class="axis-title" x="'+(width-pad.r)+'" text-anchor="end" y="'+(height-7)+'">'+escape(options.xLabel ?? 'Year')+'</text>'+diagonal+boundary+shapes+'<line class="cursor" hidden y1="'+pad.t+'" y2="'+(height-pad.b)+'"/></svg><div class="plot-tip" hidden></div><span class="visually-hidden plot-live" aria-live="polite"></span></div><figcaption class="plot-legend">'+legend+'</figcaption></figure>';
}

export function clearCharts() {
  charts.clear();
  dimensions.clear();
}

function inspect(node, index) {
  const {series,options,width,sx,fmtX} = charts.get(node.dataset.plot);
  const xs = [...new Set(series.filter(item=>!item.dash).flatMap(item => item.points.filter(point=>Number.isFinite(point.y)).map(point=>point.x)))].sort((a,b)=>a-b);
  if (!xs.length) return;
  const i = Math.max(0,Math.min(xs.length-1,index));
  dimensions.set(node.dataset.plot,i);
  const x = xs[i];
  const read = series.map(item => {
    const point = item.points.find(p => p.x===x);
    return point && Number.isFinite(point.y) ? '<span><i style="--dot:'+(item.color??ink)+'"></i>'+escape(item.label)+' <b>'+number(point.y,options.tipDigits??2)+' '+escape(options.tipUnit ?? '')+'</b></span>' : '';
  }).join('');
  const tip = node.querySelector('.plot-tip');
  tip.innerHTML = '<strong>'+escape(options.detailX?.(x) ?? fmtX(x))+'</strong>'+read;
  tip.hidden = false;
  if (node === document.activeElement) node.querySelector('.plot-live').textContent = [...tip.children].map(child=>child.textContent).join(', ');
  tip.style.left = Math.min(99,Math.max(1,100*sx(x)/width))+'%';
  tip.classList.toggle('tip-left',sx(x)>width*.72);
  const line = node.querySelector('.cursor');
  line.removeAttribute('hidden');
  line.setAttribute('x1',sx(x));
  line.setAttribute('x2',sx(x));
}

export function bindCharts(root) {
  for (const node of root.querySelectorAll('.plot[tabindex]')) {
    const {series,sx,width} = charts.get(node.dataset.plot);
    const xs = [...new Set(series.filter(item=>!item.dash).flatMap(item=>item.points.filter(p=>Number.isFinite(p.y)).map(p=>p.x)))].sort((a,b)=>a-b);
    node.addEventListener('pointermove',event => {
      const rect = node.getBoundingClientRect();
      const target = (event.clientX - rect.left) * width / rect.width;
      const index = xs.reduce((best,x,i) => Math.abs(sx(x)-target) < Math.abs(sx(xs[best])-target) ? i : best,0);
      inspect(node,index);
    });
    const hide = () => { node.querySelector('.plot-tip').hidden = true; node.querySelector('.cursor').setAttribute('hidden',''); };
    node.addEventListener('pointerleave',hide);
    node.addEventListener('blur',hide);
    node.addEventListener('focus',()=>inspect(node,dimensions.get(node.dataset.plot)));
    node.addEventListener('keydown',event => {
      if (!['ArrowLeft','ArrowRight','Home','End','Escape'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Escape') {hide(); return;}
      const index = dimensions.get(node.dataset.plot);
      inspect(node,event.key==='Home'?0:event.key==='End'?xs.length-1:index+(event.key==='ArrowLeft'?-1:1));
    });
  }
}

