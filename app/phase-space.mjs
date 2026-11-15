const limit = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function shiftMonth(date, offset) {
  const [year, month] = date.split('-').map(Number);
  const index = year * 12 + month - 1 + offset;
  return Math.floor(index / 12) + '-' + String(index % 12 + 1).padStart(2, '0') + '-01';
}

export function pointProvenance(window, index, result, variables, rows) {
  const anchor = window.dates[index];
  const point = window.points[index];
  if (!anchor || !point) return [];
  const sign = result.direction === 'past' ? -1 : 1;
  return variables.flatMap((variable, channel) =>
    Array.from({length:result.lagCount}, (_, lagIndex) => {
      const offset = sign * lagIndex * result.delay;
      const date = shiftMonth(anchor, offset);
      const row = rows.get(date);
      return {
        variable:variable.id, label:variable.label, unit:variable.unit,
        date, offset, value:row?.[variable.id], anomaly:row?.[variable.anomalyKey],
        normalized:point[channel * result.lagCount + lagIndex],
        mean:result.scales[channel].mean, sd:result.scales[channel].sd
      };
    })
  );
}

export function climateLagCorrelations(rows, maxLag=6) {
  const byMonth = new Map(rows.map(row=>[row.date,row]));
  return Array.from({length:2*maxLag+1},(_,i)=>{
    const lag=i-maxLag;
    const pairs=rows.flatMap(row=>{
      const x=row.tavgAnomaly, y=byMonth.get(shiftMonth(row.date,lag))?.precipAnomaly;
      return Number.isFinite(x)&&Number.isFinite(y)?[[x,y]]:[];
    });
    const n=pairs.length;
    const means=pairs.reduce(([x,y],pair)=>[x+pair[0]/n,y+pair[1]/n],[0,0]);
    const [xx,yy,xy]=pairs.reduce(([xx,yy,xy],[x,y])=>{
      const a=x-means[0],b=y-means[1];
      return [xx+a*a,yy+b*b,xy+a*b];
    },[0,0,0]);
    return {lag,n,r:n>=3&&xx>0&&yy>0?limit(xy/Math.sqrt(xx*yy),-1,1):null};
  });
}

export function ripsEdges(points) {
  const edges = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const distance = Math.sqrt(points[i].reduce((sum, value, d) => sum + (value - points[j][d]) ** 2, 0));
      edges.push({i,j,distance});
    }
  }
  return edges;
}

export function bettiCounts(features, epsilon) {
  const alive = features.filter(f => f.birth <= epsilon && (f.death === null || epsilon < f.death));
  return {components:alive.filter(f => f.dimension === 0).length, loops:alive.filter(f => f.dimension === 1).length};
}

export function filtrationSummary(edges, features, epsilon, pointCount) {
  const active = edges.filter(edge => edge.distance <= epsilon);
  const connected = Array.from({length:pointCount}, () => []);
  for (const {i,j} of active) {
    connected[i][j] = true;
    connected[j][i] = true;
  }
  let triangles = 0;
  for (const {i,j} of active) {
    for (let k = j + 1; k < pointCount; k++) {
      if (connected[i][k] && connected[j][k]) triangles++;
    }
  }
  return {active, triangles, ...bettiCounts(features,epsilon)};
}

// Adapted from the team's legacy TopologicalViewer.tsx 3D camera rotation.
// Each plotted position is a camera projection of actual XYZ coordinates.
export function cameraPoint([x,y,z], view) {
  const ax = Math.cos(view.pitch), bx = Math.sin(view.pitch);
  const ay = Math.cos(view.yaw), by = Math.sin(view.yaw);
  const rotatedX = x * ay - z * by;
  const intermediateZ = x * by + z * ay;
  return [rotatedX, y * ax - intermediateZ * bx, y * bx + intermediateZ * ax];
}

const surface = {width:660, height:390, cx:333, cy:194};
const svgNS = 'http://www.w3.org/2000/svg';

export function mountPhaseSpace(svg, window, options) {
  const {bounds, choose, labels, controls, signal} = options;
  const elements = {
    grid:svg.querySelector('.phase-grid'), axes:svg.querySelector('.phase-axes'),
    edges:svg.querySelector('.phase-edges'), path:svg.querySelector('.phase-trajectory'),
    selection:svg.querySelector('.phase-selection'), dots:svg.querySelector('.phase-points')
  };
  const flat = controls.querySelector('[data-phase-flat]');
  const view = {yaw:-.64,pitch:.51,zoom:1,x:0,y:0,flat:false};
  let cameraMode = 'orbit';
  let selected = 0;
  let visibleEdges = [];
  let drag = null;
  let blockedClick = false;
  let scheduled = 0;
  const dots = window.points.map((_,index) => {
    const dot = document.createElementNS(svgNS,'circle');
    dot.dataset.phasePoint = index;
    dot.setAttribute('role','button');
    dot.setAttribute('tabindex','-1');
    dot.setAttribute('r','5.2');
    dot.setAttribute('aria-label','Inspect anchor '+window.dates[index]);
    dot.style.fill = 'hsl('+(168+index/(window.points.length-1)*100)+' 62% 69%)';
    const title = document.createElementNS(svgNS,'title');
    title.textContent = 'Anchor '+window.dates[index];
    dot.append(title);
    return dot;
  });

  const on = (node, event, fn, extra = {}) => node.addEventListener(event, fn, {...extra, signal});
  const point = coords => {
    const [x,y,z] = view.flat ? [coords[0],coords[1],0] : cameraPoint(coords,view);
    const scale = 115 * view.zoom / bounds;
    return [surface.cx + view.x+x*scale,surface.cy+view.y-y*scale,z];
  };
  const segment = (a,b) => 'M'+a[0].toFixed(1)+','+a[1].toFixed(1)+'L'+b[0].toFixed(1)+','+b[1].toFixed(1);

  function draw() {
    scheduled = 0;
    const b = bounds;
    const n = b/4;
    const projected = window.points.map(point);
    const gridLines = [];
    for (let i=-4;i<=4;i++) {
      if(view.flat) {
        gridLines.push(segment(point([i*n,-b,0]),point([i*n,b,0])),segment(point([-b,i*n,0]),point([b,i*n,0])));
      } else {
        gridLines.push(segment(point([i*n,-b,-b]),point([i*n,-b,b])),segment(point([-b,-b,i*n]),point([b,-b,i*n])));
      }
    }
    elements.grid.setAttribute('d',gridLines.join(''));
    const axes = labels.slice(0,view.flat?2:3).map((label,d) => {
      const edge = [0,0,0], negative=[0,0,0];
      edge[d] = b*1.14;
      negative[d] = -b;
      const origin=point(negative), tip=point(edge);
      const x=limit(tip[0]+9,10,Math.max(10,surface.width-label.length*7-12));
      const y=limit(tip[1]-6,17,surface.height-8);
      return '<path d="'+segment(origin,tip)+'"/><text x="'+x+'" y="'+y+'">'+label+'</text>';
    });
    elements.axes.innerHTML = axes.join('');
    elements.edges.setAttribute('d',visibleEdges.map(edge => segment(projected[edge.i],projected[edge.j])).join(''));
    elements.path.setAttribute('d',projected.slice(1).map((p,i)=>segment(projected[i],p)).join(''));
    elements.selection.setAttribute('d',selected > 0 ? segment(projected[selected-1],projected[selected]) : '');
    const order = projected.map((p,i)=>[p,i]).sort(([a],[b])=>a[2]-b[2]);
    for (const [p,i] of order) {
      const dot = dots[i];
      dot.setAttribute('cx',p[0]);
      dot.setAttribute('cy',p[1]);
      dot.setAttribute('r',i===selected?'8':'5.2');
      dot.setAttribute('aria-pressed',String(i===selected));
      dot.classList.toggle('selected',i===selected);
      elements.dots.append(dot);
    }
    // Keep the selected marker legible even where the camera projects two points together.
    elements.dots.append(dots[selected]);
  }

  const drawNext = () => { if (!scheduled) scheduled = requestAnimationFrame(draw); };
  signal.addEventListener('abort',()=>cancelAnimationFrame(scheduled),{once:true});
  on(svg,'pointerdown',event=>{
    if (event.button!==0 && event.button!==1) return;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,travel:0,pan:view.flat||cameraMode==='pan'||event.shiftKey||event.button===1};
  });
  on(svg,'pointermove',event=>{
    if (drag?.id!==event.pointerId) return;
    const dx=event.clientX-drag.x, dy=event.clientY-drag.y;
    drag.travel+=Math.hypot(dx,dy);
    if(drag.travel<4) return;
    if(!svg.hasPointerCapture(event.pointerId)) svg.setPointerCapture(event.pointerId);
    drag.x=event.clientX; drag.y=event.clientY;
    if(drag.pan) {
      const rect=svg.getBoundingClientRect();
      view.x+=dx*surface.width/rect.width; view.y+=dy*surface.height/rect.height;
    } else {
      view.yaw-=dx*.011;
      view.pitch=limit(view.pitch-dy*.011,-Math.PI/2,Math.PI/2);
    }
    drawNext();
  });
  function release(event) {
    if(drag?.id!==event.pointerId) return;
    blockedClick=drag.travel>=4;
    drag=null;
    if(svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
    setTimeout(()=>{blockedClick=false;},0);
  }
  on(svg,'pointerup',release);
  on(svg,'pointercancel',release);
  on(svg,'click',event=>{
    if(blockedClick) return;
    const dot=event.target.closest('[data-phase-point]');
    if(dot) choose(Number(dot.dataset.phasePoint));
  });
  on(svg,'keydown',event=>{
    const delta = {ArrowLeft:-1,ArrowUp:-1,ArrowRight:1,ArrowDown:1}[event.key];
    if(delta==null) return;
    event.preventDefault();
    if(event.shiftKey&&!view.flat) {
      if(event.key==='ArrowLeft'||event.key==='ArrowRight') view.yaw+=delta*.15;
      else view.pitch=limit(view.pitch+delta*.15,-Math.PI/2,Math.PI/2);
      drawNext();
    } else choose(limit(selected+delta,0,dots.length-1));
  });
  on(svg,'wheel',event=>{
    if (!event.ctrlKey) return;
    event.preventDefault();
    view.zoom=limit(view.zoom*Math.exp(-event.deltaY*.002),.45,3.5);
    drawNext();
  },{passive:false});
  on(controls,'click',event=>{
    const button=event.target.closest('[data-phase-camera]');
    if(!button) return;
    const action=button.dataset.phaseCamera;
    if (action==='in') view.zoom=limit(view.zoom*1.22,.45,3.5);
    if (action==='out') view.zoom=limit(view.zoom/1.22,.45,3.5);
    if (action==='pan') {
      cameraMode=cameraMode==='pan'?'orbit':'pan';
      button.setAttribute('aria-pressed',String(cameraMode==='pan'));
    }
    if (action==='reset') Object.assign(view,{yaw:-.64,pitch:.51,zoom:1,x:0,y:0});
    drawNext();
  });
  on(flat,'click',()=>{
    view.flat=!view.flat;
    flat.setAttribute('aria-pressed',String(view.flat));
    flat.textContent=view.flat?'Show 3D':'Show XY';
    drawNext();
  });
  draw();
  return {
    select(index) {selected=index;drawNext();},
    setEdges(edges) {visibleEdges=edges;drawNext();}
  };
}

