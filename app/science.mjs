const median = (values) => {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
};

export function monthlySeries(months, variable, anomaly = false) {
  const key = anomaly ? variable + 'Anomaly' : variable;
  return months.map(row => ({
    date: row.date,
    year: Number(row.date.slice(0, 4)),
    month: Number(row.date.slice(5, 7)),
    value: Number.isFinite(row[key]) ? row[key] : null,
    days: row.days
  }));
}

export function annualSeries(months, variable, anomaly = false) {
  const byYear = new Map();
  for (const row of monthlySeries(months, variable, anomaly)) {
    if (!byYear.has(row.year)) byYear.set(row.year, []);
    byYear.get(row.year).push(row);
  }
  return [...byYear].sort(([a], [b]) => a - b).map(([year, rows]) => {
    const complete = rows.length === 12
      && new Set(rows.map(row => row.month)).size === 12
      && rows.every(row => row.month >= 1 && row.month <= 12 && row.value !== null);
    if (!complete) return {year, value: null};
    if (variable === 'precip') return {year, value: rows.reduce((total, row) => total + row.value, 0)};
    const days = rows.reduce((total, row) => total + row.days, 0);
    if (!rows.every(row => Number.isInteger(row.days) && row.days >= 28 && row.days <= 31)) {
      return {year, value: null};
    }
    return {year, value: rows.reduce((total, row) => total + row.value * row.days, 0) / days};
  });
}

// The Lanczos approximation and modified Lentz continued fraction evaluate the Student t tail.
function logGamma(value) {
  const coefficients = [
    676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.6150291621406,
    12.507343278686905, -0.13857109526572012, 9.984369578019572e-6, 1.5056327351493116e-7
  ];
  const z = value - 1;
  let sum = 0.9999999999998099;
  for (let i = 0; i < coefficients.length; i++) sum += coefficients[i] / (z + i + 1);
  const t = z + 7.5;
  return Math.log(2 * Math.PI) / 2 + (z + 0.5) * Math.log(t) - t + Math.log(sum);
}

function betaFraction(a, b, x) {
  const awayFromZero = value => Math.abs(value) < 1e-28 ? 1e-28 : value;
  let c = 1;
  let d = 1 / awayFromZero(1 - (a + b) * x / (a + 1));
  let result = d;
  for (let i = 1; i <= 150; i++) {
    const twice = 2 * i;
    const terms = [
      i * (b - i) * x / ((a + twice - 1) * (a + twice)),
      -(a + i) * (a + b + i) * x / ((a + twice) * (a + twice + 1))
    ];
    let update = 1;
    for (const coefficient of terms) {
      d = 1 / awayFromZero(1 + coefficient * d);
      c = awayFromZero(1 + coefficient / c);
      update = c * d;
      result *= update;
    }
    if (Math.abs(update - 1) <= 2e-14) break;
  }
  return result;
}

function regularizedBeta(x, a, b) {
  if (x <= 0 || x >= 1) return x <= 0 ? 0 : 1;
  const scale = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b)
    + a * Math.log(x) + b * Math.log1p(-x));
  if (x < (a + 1) / (a + b + 2)) return scale * betaFraction(a, b, x) / a;
  return 1 - scale * betaFraction(b, a, 1 - x) / b;
}

function tTwoSided(statistic, degrees) {
  return regularizedBeta(degrees / (degrees + statistic ** 2), degrees / 2, 0.5);
}

function criticalT(degrees) {
  let lower = 0;
  let upper = 20;
  for (let i = 0; i < 42; i++) {
    const midpoint = (lower + upper) / 2;
    if (tTwoSided(midpoint, degrees) > 0.05) lower = midpoint;
    else upper = midpoint;
  }
  return (lower + upper) / 2;
}

function normalTwoSided(z) {
  // Approximate erfc(|z| / sqrt(2)) with a normal-tail polynomial.
  if (z === 0) return 1;
  const x = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * x);
  return 2 * Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI) * t
    * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
}

function rankTrend(points) {
  const slopes = [];
  const ties = new Map();
  let s = 0;
  for (let i = 0; i < points.length; i++) {
    const {year, value} = points[i];
    ties.set(value, (ties.get(value) ?? 0) + 1);
    for (let j = i + 1; j < points.length; j++) {
      const difference = points[j].value - value;
      slopes.push(difference / (points[j].year - year));
      s += Math.sign(difference);
    }
  }
  const n = points.length;
  let tiedPairs = 0;
  let tieVariance = 0;
  for (const count of ties.values()) {
    tiedPairs += count * (count - 1) / 2;
    tieVariance += count * (count - 1) * (2 * count + 5);
  }
  const variance = (n * (n - 1) * (2 * n + 5) - tieVariance) / 18;
  const denominator = Math.sqrt(slopes.length * (slopes.length - tiedPairs));
  const tau = denominator > 0 ? s / denominator : null;
  const z = variance > 0 ? (s - Math.sign(s)) / Math.sqrt(variance) : 0;
  return {sen: median(slopes), mk: {s, tau, z, p: n >= 10 ? normalTwoSided(z) : null}};
}

function lagOne(rows) {
  const byYear = new Map(rows.map(row => [row.year, row.residual]));
  const pairs = rows.filter(row => byYear.has(row.year - 1))
    .map(row => [byYear.get(row.year - 1), row.residual]);
  if (pairs.length < 4) return null;
  const xMean = pairs.reduce((sum, row) => sum + row[0], 0) / pairs.length;
  const yMean = pairs.reduce((sum, row) => sum + row[1], 0) / pairs.length;
  let xx = 0;
  let yy = 0;
  let xy = 0;
  for (const row of pairs) {
    const x = row[0] - xMean;
    const y = row[1] - yMean;
    xx += x * x;
    yy += y * y;
    xy += x * y;
  }
  return xx > 0 && yy > 0 ? xy / Math.sqrt(xx * yy) : null;
}

function hacCovariance(rows, sumXX, lag) {
  const byYear = new Map(rows.map(row => [row.year, row]));
  let interceptVariance = 0;
  let crossCovariance = 0;
  let slopeVariance = 0;
  for (const row of rows) {
    const a = row.residual;
    const b = row.x * a;
    interceptVariance += a * a;
    crossCovariance += a * b;
    slopeVariance += b * b;
    for (let l = 1; l <= lag; l++) {
      const previous = byYear.get(row.year - l);
      if (!previous) continue;
      const c = previous.residual;
      const d = previous.x * c;
      const weight = 1 - l / (lag + 1);
      interceptVariance += 2 * weight * a * c;
      crossCovariance += weight * (a * d + b * c);
      slopeVariance += 2 * weight * b * d;
    }
  }
  const n = rows.length;
  const finiteSample = n / (n - 2);
  return {
    intercept: interceptVariance * finiteSample / (n * n),
    cross: crossCovariance * finiteSample / (n * sumXX),
    slope: slopeVariance * finiteSample / (sumXX * sumXX)
  };
}

const insufficient = 'Insufficient data';

export function fitTrend(series, method = 'ols') {
  const points = series.filter(row => Number.isInteger(row.year) && Number.isFinite(row.value))
    .sort((a, b) => a.year - b.year);
  if (points.some((point, i) => i > 0 && point.year === points[i - 1].year)) {
    throw new Error('Trend analysis requires at most one value per year.');
  }
  const n = points.length;
  const start = points[0]?.year ?? null;
  const end = points[n - 1]?.year ?? null;
  const span = n ? end - start + 1 : 0;
  const missingYears = span - n;
  const result = {
    method, n, start, end, missingYears, coverage: span ? n / span : 0,
    slope: null, rate: null, change: null, ci: null, p: null, tStatistic: null, mk: null,
    olsRate: null, sen: null, senRate: null, fitted: [], lag: null, sensitivity: [],
    residualLag1: null, mean: null, min: null, max: null, observedChange: null,
    status: insufficient,
    reason: 'At least 20 complete annual values and 80% coverage between the first and last complete years are required for inference.'
  };
  if (n < 2) return result;

  const meanYear = points.reduce((sum, row) => sum + row.year, 0) / n;
  const mean = points.reduce((sum, row) => sum + row.value, 0) / n;
  const values = points.map(row => row.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const sumXX = points.reduce((sum, row) => sum + (row.year - meanYear) ** 2, 0);
  const ols = points.reduce((sum, row) => sum + (row.year - meanYear) * (row.value - mean), 0) / sumXX;
  const {sen, mk} = rankTrend(points);
  const slope = method === 'sen' ? sen : ols;
  const intercept = method === 'sen' ? median(points.map(row => row.value - slope * (row.year - meanYear))) : mean;
  const rows = points.map(row => ({
    year: row.year, x: row.year - meanYear, residual: row.value - (mean + ols * (row.year - meanYear))
  }));
  const fit = {
    ...result, slope, rate: 10 * slope, change: slope * (end - start), mk,
    sen, senRate: 10 * sen, olsRate: 10 * ols, residualLag1: lagOne(rows), mean, min, max,
    observedChange: values[n - 1] - values[0],
    fitted: Array.from({length: span}, (_, offset) => {
      const year = start + offset;
      return {year, value: intercept + slope * (year - meanYear), lo: null, hi: null};
    })
  };
  if (n < 20 || fit.coverage < 0.8) return fit;
  if (max === min) {
    return {...fit, status: 'No supported directional trend', reason: 'All complete annual values in the selection are equal.'};
  }
  const defaultLag = Math.floor(4 * (n / 100) ** (2 / 9));
  if (Math.max(...rows.map(row => Math.abs(row.residual))) <= Math.max(1, Math.abs(mean), max - min) * 1e-12) {
    return {...fit, reason: 'The fit has effectively zero residual variance. A sampling interval cannot be estimated.'};
  }

  const covariance = hacCovariance(rows, sumXX, defaultLag);
  if (covariance.slope <= 0) return {...fit, reason: 'The estimated slope variance is degenerate.'};
  const degrees = n - 2;
  const critical = criticalT(degrees);
  const standardError = Math.sqrt(covariance.slope);
  const tStatistic = ols / standardError;
  const p = tTwoSided(tStatistic, degrees);
  const ci = [10 * (ols - critical * standardError), 10 * (ols + critical * standardError)];
  if (method !== 'sen') {
    for (const row of fit.fitted) {
      const x = row.year - meanYear;
      const variance = covariance.intercept + 2 * x * covariance.cross + x * x * covariance.slope;
      const margin = critical * Math.sqrt(Math.max(0, variance));
      row.lo = row.value - margin;
      row.hi = row.value + margin;
    }
  }
  let status = 'No supported directional trend';
  let reason = 'The annual OLS trend has limited directional evidence at the selected scale.';
  if (p < 0.05) {
    status = 'Significant trend';
    reason = 'The approximate 95% annual OLS slope interval excludes zero.';
  } else if (p < 0.2 && Math.sign(ols) === Math.sign(sen)) {
    status = 'Possible/emerging change';
    reason = 'OLS and Theil–Sen agree on direction, and the annual OLS 95% interval includes zero.';
  }
  const sensitivity = [...new Set([1, defaultLag, 5])].map(lag => {
    const variance = hacCovariance(rows, sumXX, lag).slope;
    return {lag, p: variance > 0 ? tTwoSided(ols / Math.sqrt(variance), degrees) : null};
  });
  return {...fit, p, tStatistic, ci, status, reason, lag: defaultLag, sensitivity};
}

