/**
 * Climate-only Vietoris–Rips H0/H1 over GF(2). The bounded sample keeps the
 * complete filtration small enough to reconstruct and inspect in the browser.
 */
export function ripsPersistence(points) {
  if (!points.length) return [];
  const size = points.length;
  const dimensions = points[0].length;
  if (!dimensions || points.some(point => point.length !== dimensions || !point.every(Number.isFinite))) {
    throw new Error('Persistent homology requires finite points of equal dimension.');
  }

  const edges = [];
  for (let a = 0; a < size; a++) {
    for (let b = a + 1; b < size; b++) {
      const squared = points[a].reduce((sum, value, d) => sum + (value - points[b][d]) ** 2, 0);
      edges.push({a, b, scale: Math.sqrt(squared)});
    }
  }
  edges.sort((left, right) => left.scale - right.scale || left.a - right.a || left.b - right.b);
  const edgeIds = Array.from({length: size}, () => new Int32Array(size));
  const parent = Array.from({length: size}, (_, index) => index);
  const features = [];
  const cycleEdge = new Uint8Array(edges.length);

  function root(index) {
    while (parent[index] !== index) {
      parent[index] = parent[parent[index]];
      index = parent[index];
    }
    return index;
  }

  edges.forEach(({a, b, scale}, index) => {
    edgeIds[a][b] = edgeIds[b][a] = index;
    const ra = root(a);
    const rb = root(b);
    if (ra === rb) cycleEdge[index] = 1;
    else {
      parent[rb] = ra;
      if (scale > 0) features.push({dimension: 0, birth: 0, death: scale, persistence: scale});
    }
  });
  features.push({dimension: 0, birth: 0, death: null, persistence: null});

  // Kruskal's forest spans every filtration sublevel. A cycle is represented
  // uniquely by the nonforest edges it contains. Project triangle boundaries
  // to those cycle generators and reduce in filtration order over GF(2).
  const pivotColumns = new Map();
  edges.forEach(({a, b, scale}, index) => {
    for (let c = 0; c < size; c++) {
      if (c === a || c === b) continue;
      const left = edgeIds[a][c];
      const right = edgeIds[b][c];
      if (left > index || right > index) continue;
      const column = new Set([index, left, right].filter(id => cycleEdge[id]));
      while (column.size) {
        let pivot = -1;
        for (const edge of column) pivot = Math.max(pivot, edge);
        const previous = pivotColumns.get(pivot);
        if (previous) {
          for (const edge of previous) column.has(edge) ? column.delete(edge) : column.add(edge);
          continue;
        }
        pivotColumns.set(pivot, column);
        const birth = edges[pivot].scale;
        const persistence = scale - birth;
        if (persistence > 0) features.push({dimension: 1, birth, death: scale, persistence});
        break;
      }
    }
  });
  return features.sort((a, b) => a.dimension - b.dimension || (b.persistence ?? 0) - (a.persistence ?? 0));
}

/**
 * Exact bottleneck distance between two finite H1 diagrams. Augment each side
 * with a diagonal copy of every point on the other side. At a candidate scale,
 * a perfect matching exists precisely when every feature can be paired across
 * diagrams or sent to the diagonal at that cost.
 */
export function bottleneckH1(first, second) {
  const a = first.filter(feature => feature.dimension === 1 && feature.death !== null);
  const b = second.filter(feature => feature.dimension === 1 && feature.death !== null);
  const size = a.length + b.length;
  if (!size) return 0;
  const costs = Array.from({length: size}, (_, i) => Array.from({length: size}, (_, j) => {
    if (i < a.length && j < b.length) {
      return Math.max(Math.abs(a[i].birth - b[j].birth), Math.abs(a[i].death - b[j].death));
    }
    if (i < a.length) return (a[i].death - a[i].birth) / 2;
    if (j < b.length) return (b[j].death - b[j].birth) / 2;
    return 0;
  }));
  const candidates = [...new Set(costs.flat())].sort((x, y) => x - y);

  function canMatch(limit) {
    const matches = new Int32Array(size).fill(-1);
    function assign(i, visited) {
      for (let j = 0; j < size; j++) {
        if (visited[j] || costs[i][j] > limit) continue;
        visited[j] = 1;
        if (matches[j] === -1 || assign(matches[j], visited)) {
          matches[j] = i;
          return true;
        }
      }
      return false;
    }
    for (let i = 0; i < size; i++) {
      if (!assign(i, new Uint8Array(size))) return false;
    }
    return true;
  }

  let left = 0;
  let right = candidates.length - 1;
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (canMatch(candidates[mid])) right = mid;
    else left = mid + 1;
  }
  return candidates[left];
}

function monthIndex(date) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])-01$/.exec(date);
  return match ? Number(match[1]) * 12 + Number(match[2]) - 1 : null;
}

function monthDate(index) {
  return Math.floor(index / 12) + '-' + String(index % 12 + 1).padStart(2, '0') + '-01';
}

function indexMonths(rows) {
  const months = new Map();
  for (const {date, value} of rows) {
    const index = monthIndex(date);
    if (index === null || months.has(index)) throw new Error('Topology requires distinct first-of-month dates.');
    months.set(index, Number.isFinite(value) ? value : null);
  }
  return months;
}

function referenceScale(months, baseline) {
  // Use the complete reference supplied to runTopology, regardless of the selected range.
  const baselineValues = [];
  for (let index = baseline[0] * 12; index < (baseline[1] + 1) * 12; index++) {
    const value = months.get(index);
    if (Number.isFinite(value)) baselineValues.push(value);
  }
  if (baselineValues.length < 120) return null;
  const mean = baselineValues.reduce((total, value) => total + value, 0) / baselineValues.length;
  const variance = baselineValues.reduce((total, value) => total + (value - mean) ** 2, 0) / (baselineValues.length - 1);
  return variance > 0 ? {mean, sd: Math.sqrt(variance)} : null;
}

const resultCache = new Map();

export function runTopology(primary, companion = null, options = {}) {
  const {delay = 3, windowSize = 60, step = 12, baseline = [1981, 2010], startYear, endYear,
    lagCount = 2, direction = 'future'} = options;
  if (![1, 3, 6].includes(delay) || ![24,48,60,96,120].includes(windowSize) || ![6,12,24].includes(step)) {
    throw new Error('Use a 2-, 4-, 5-, 8- or 10-year window, a 6-, 12- or 24-month stride and a 1-, 3- or 6-month lag.');
  }
  if (![2, 3].includes(lagCount) || !['past', 'future'].includes(direction)) {
    throw new Error('Topology needs two or three coordinates per channel and a valid lag direction.');
  }
  const dimensions = (companion ? 2 : 1) * lagCount;
  const response = {windows: [], delay, windowSize, step, dimensions, lagCount, direction,
    skipped: 0, baseline, reference: null, scales: [], reason: null};
  if (!primary.length || (companion && !companion.length)) {
    return {...response, reason: 'Monthly anomalies are unavailable for the selected view.'};
  }
  const maps = [indexMonths(primary)];
  if (companion) maps.push(indexMonths(companion));
  const scales = options.referenceScales ?? maps.map(months => referenceScale(months, baseline));
  if (scales.length !== maps.length || (options.referenceScales && scales.some(scale=>!Number.isFinite(scale?.mean)||!Number.isFinite(scale?.sd)||scale.sd<=0))) throw new Error('Invalid frozen reference scales.');
  if (scales.some(scale => !scale)) {
    return {...response, reason: 'Topology needs at least 120 finite baseline months and positive variance for each variable.'};
  }
  const observedStart = Math.min(...maps[0].keys());
  const observedEnd = Math.max(...maps[0].keys());
  const start = startYear == null ? observedStart : Math.max(observedStart, startYear * 12);
  const end = endYear == null ? observedEnd : Math.min(observedEnd, (endYear + 1) * 12 - 1);
  const first = Math.ceil(start / 12) * 12;
  const lagSpan = (lagCount - 1) * delay;
  const sampleCount = Math.min(30,windowSize-lagSpan);
  response.scales = scales;

  function embed(from) {
    const to = from + windowSize - 1;
    const series = maps.map((months, channel) => Array.from({length: windowSize}, (_, i) => {
      const value = months.get(from + i);
      const {mean, sd} = scales[channel];
      return Number.isFinite(value) ? (value - mean) / sd : null;
    }));
    if (series.some(channel => channel.includes(null))) return null;
    const points = [];
    const dates = [];
    const firstOffset = direction === 'past' ? lagSpan : 0;
    const sign = direction === 'past' ? -1 : 1;
    for (let i = 0; i < sampleCount; i++) {
      const offset = firstOffset + Math.round(i * (windowSize - lagSpan - 1) / (sampleCount - 1));
      points.push(series.flatMap(channel =>
        Array.from({length: lagCount}, (_, j) => channel[offset + sign * j * delay])));
      dates.push(monthDate(from + offset));
    }
    const cacheKey = JSON.stringify(points);
    let features = resultCache.get(cacheKey);
    if (!features) {
      features = Object.freeze(ripsPersistence(points).map(feature => Object.freeze(feature)));
      resultCache.set(cacheKey, features);
      if (resultCache.size > 384) resultCache.delete(resultCache.keys().next().value);
    }
    const maxH1 = Math.max(0, ...features.filter(feature => feature.dimension === 1).map(feature => feature.persistence));
    return {start: monthDate(from), end: monthDate(to), points, dates, features, maxH1};
  }

  // Keep a deterministic climate reference independent of the selected years.
  for (let from = baseline[0] * 12; from + windowSize <= (baseline[1] + 1) * 12; from += step) {
    response.reference = embed(from);
    if (response.reference) break;
  }

  for (let from = first; from + windowSize - 1 <= end; from += step) {
    const window = embed(from);
    if (!window) {
      response.skipped++;
      continue;
    }
    const previous = response.windows.at(-1);
    const adjacent = previous?.end === monthDate(from + windowSize - 1 - step);
    const change = adjacent ? bottleneckH1(previous.features, window.features) : null;
    const referenceChange = response.reference ? bottleneckH1(response.reference.features, window.features) : null;
    response.windows.push({...window, change, referenceChange});
  }
  if (!response.windows.length) {
    response.reason = 'No complete '+({24:'two',48:'four',60:'five',96:'eight',120:'ten'}[windowSize])+'-calendar-year window is available for all selected monthly channels.';
  }
  return response;
}


let topologyWorker;
let nextId = 0;
const analyses = new Map();

export async function runTopologyAsync(primary, companion = null, options = {}) {
  if (typeof Worker === 'function' && topologyWorker === undefined) {
    try {
      topologyWorker = new Worker(new URL('./topology.worker.mjs', import.meta.url), {type: 'module'});
      topologyWorker.addEventListener('message', ({data}) => {
        const request = analyses.get(data.id);
        if (!request) return;
        analyses.delete(data.id);
        if (data.error) request.reject(new Error(data.error));
        else request.resolve(data.result);
      });
      topologyWorker.addEventListener('error', () => {
        topologyWorker.terminate();
        topologyWorker = null;
        for (const request of analyses.values()) {
          try {
            request.resolve(runTopology(...request.args));
          } catch (error) {
            request.reject(error);
          }
        }
        analyses.clear();
      });
    } catch {
      topologyWorker = null;
    }
  }
  const args = [primary, companion, options];
  if (!topologyWorker) {
    await new Promise(resolve => setTimeout(resolve, 0));
    return runTopology(...args);
  }
  return new Promise((resolve, reject) => {
    const id = nextId++;
    try {
      topologyWorker.postMessage({id, primary, companion, options});
      analyses.set(id, {resolve, reject, args});
    } catch (error) {
      reject(error);
    }
  });
}

