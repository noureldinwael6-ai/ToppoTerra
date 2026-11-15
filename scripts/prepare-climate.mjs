import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const FIRST_YEAR = 1981;
export const LAST_YEAR = 2025;
export const BASELINE = [1981, 2010];
const STATE_CODES = {
  AZ: { name: 'Arizona', code: '002' },
  CA: { name: 'California', code: '004' },
};
const VARIABLES = {
  tavg: {
    element: '002',
    file: 'tavg',
    sourceUnit: '°F',
    sourceFile: 'climdiv-tmpcst-v1.0.0-20261105',
    valid: value => value > -99 && value <= 140,
    convert: value => (value - 32) * 5 / 9,
    label: 'Mean temperature',
    description: 'Monthly mean near-surface air temperature',
    unit: '°C',
    annualUnit: '°C',
    annualAggregation: 'day-weighted mean',
    anomalyKey: 'tavgAnomaly',
  },
  precip: {
    element: '001',
    file: 'precip',
    sourceUnit: 'inches/month',
    sourceFile: 'climdiv-pcpnst-v1.0.0-20261105',
    valid: value => value >= 0 && value <= 200,
    convert: value => value * 25.4,
    label: 'Precipitation',
    description: 'Monthly total precipitation (liquid-water equivalent)',
    unit: 'mm',
    annualUnit: 'mm',
    annualAggregation: 'sum',
    anomalyKey: 'precipAnomaly',
  },
};

const READY_SHA256 = 'ac0278a00a71fa561e9304a587a17463e71f27646f9a2a6bb2ee772a12f0c37f';
const SOURCE_URL = 'https://www.ncei.noaa.gov/monitoring-content/data/us/climdiv/monthly/current/';
const round = value => Number(value.toFixed(6));
const isoMonth = (year, month) => String(year) + '-' + String(month).padStart(2, '0') + '-01';

export function parseSource(text, state, variable, first = FIRST_YEAR, last = LAST_YEAR) {
  const stateCode = STATE_CODES[state]?.code;
  const spec = VARIABLES[variable];
  if (!stateCode || !spec) throw new Error('Unsupported state or variable');
  const lines = text.trim().split(/\r?\n/);
  if (lines.length !== last - first + 1) throw new Error('Missing or duplicate years for ' + state + ' ' + variable);
  return lines.flatMap((line, index) => {
    const [identity, ...fields] = line.trim().split(/\s+/);
    const year = first + index;
    if (identity !== stateCode + spec.element + year || fields.length !== 12) {
      throw new Error('Unexpected state, variable, year or month count: ' + identity);
    }
    return fields.map(field => {
      const value = Number(field);
      if (!/^-?\d+(\.\d+)?$/.test(field) || !Number.isFinite(value) || !spec.valid(value)) {
        throw new Error('Invalid or missing reading: ' + identity + ' ' + field);
      }
      return spec.convert(value);
    });
  });
}

function monthlyNormals(series) {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const reference = series.filter(row => row.month === month && row.year >= BASELINE[0] && row.year <= BASELINE[1]);
    if (reference.length !== BASELINE[1] - BASELINE[0] + 1) throw new Error('Incomplete baseline for month ' + month);
    const average = key => reference.reduce((sum, row) => sum + row[key], 0) / reference.length;
    return { month, tavg: average('tavg'), precip: average('precip') };
  });
}

export function buildClimate(readSource) {
  const series = {};
  const normals = {};
  const regions = Object.entries(STATE_CODES).map(([id, state]) => {
    const read = variable => {
      const name = state.name.toLowerCase() + '_' + VARIABLES[variable].file + '_1981_2025.txt';
      return parseSource(readSource(name), id, variable);
    };
    const tavg = read('tavg');
    const precip = read('precip');
    const rows = tavg.map((value, index) => {
      const year = FIRST_YEAR + Math.floor(index / 12);
      const month = index % 12 + 1;
      const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
      return { date: isoMonth(year, month), year, month, days, tavg: value, precip: precip[index] };
    });
    const base = monthlyNormals(rows);
    series[id] = rows.map(row => ({
      ...row,
      tavg: round(row.tavg),
      precip: round(row.precip),
      tavgAnomaly: round(row.tavg - base[row.month - 1].tavg),
      precipAnomaly: round(row.precip - base[row.month - 1].precip),
    }));
    normals[id] = base.map(row => ({ month: row.month, tavg: round(row.tavg), precip: round(row.precip) }));
    return { id, name: state.name, sourceGeography: 'NOAA state ' + state.code };
  });

  const variables = Object.entries(VARIABLES).map(([id, spec]) => ({
    id,
    label: spec.label,
    description: spec.description,
    unit: spec.unit,
    annualUnit: spec.annualUnit,
    annualAggregation: spec.annualAggregation,
    anomalyKey: spec.anomalyKey,
    sourceUnit: spec.sourceUnit,
    sourceUrl: SOURCE_URL + spec.sourceFile,
  }));

  return {
    version: 'nclimdiv-v1.0.0-20261105',
    baseline: BASELINE,
    regions,
    variables,
    series,
    normals,
    provenance: {
      source: 'NOAA NCEI nClimDiv',
      provider: 'NOAA National Centers for Environmental Information',
      product: 'U.S. Climate Divisional Database (nClimDiv)',
      geographicScope: ['Arizona (002)', 'California (004)'],
      spatialResolution: 'Statewide aggregation derived from interpolated surface station observations',
      temporalResolution: 'Monthly',
      startDate: isoMonth(FIRST_YEAR, 1),
      endDate: isoMonth(LAST_YEAR, 12),
      publicationDate: '2026-11-05',
      publicationDateEvidence: 'Supplied package manifest and NOAA source filenames',
      sourceFiles: 'data/source-records/*.txt',
      filePath: 'data/climate.json',
      metadataUrl: 'https://www.ncei.noaa.gov/metadata/geoportal/rest/metadata/item/gov.noaa.ncdc%3AC00005/html',
      qualityFlag: 'Passed recorded statewide series checks; no source flags are provided in the transcriptions.',
      missingness: { expectedMonthsPerState: 540, missingMonths: 0, missingValues: 0 },
      licenseOrAttribution: 'Credit NOAA NCEI nClimDiv v1.0.0. Source excerpts supplied in project archive.',
      processingSteps: [
        'Validate state and element code, increasing year sequence, month count and numeric range.',
        'Convert published Fahrenheit means to Celsius and inches of precipitation to millimeters.',
        'Average the 30 matching calendar months for each 1981–2010 statewide baseline.',
        'Subtract the baseline from each corresponding observation. Round app data to six decimal places.',
      ],
      readyCsvSha256: READY_SHA256,
    },
  };
}

export function compareReadyCsv(bytes, climate) {
  if (createHash('sha256').update(bytes).digest('hex') !== READY_SHA256) throw new Error('READY CSV does not match the supplied manifest fingerprint');
  const [header, ...lines] = bytes.toString('utf8').trim().split(/\r?\n/);
  if (header !== 'date,state,state_name,spatial_scale,year,month,tavg_c,precip_mm,tavg_anomaly_c,precip_anomaly_mm,tavg_normal_1981_2010_c,precip_normal_1981_2010_mm,tavg_f_source,precip_in_source') {
    throw new Error('Unexpected READY CSV header');
  }
  const visited = new Set();
  for (const line of lines) {
    // The supplied CSV schema contains only unquoted codes, numbers, and the two state names.
    const [date, state, name, scope, year, month, tavg, precip, tavgAnomaly, precipAnomaly, normT, normP, sourceT, sourceP] = line.split(',');
    const index = (Number(year) - FIRST_YEAR) * 12 + Number(month) - 1;
    const row = climate.series[state]?.[index];
    const normal = climate.normals[state]?.[Number(month) - 1];
    const key = state + date;
    if (!row || !normal || !STATE_CODES[state] || row.date !== date || row.year !== Number(year) || row.month !== Number(month)
        || name !== STATE_CODES[state].name || scope !== 'statewide' || visited.has(key)) {
      throw new Error('Invalid or duplicate READY state-month: ' + key);
    }
    const comparisons = [
      [row.tavg, tavg, 0.000051], [row.precip, precip, 0.000501],
      [row.tavgAnomaly, tavgAnomaly, 0.000051], [row.precipAnomaly, precipAnomaly, 0.000501],
      [normal.tavg, normT, 0.000051], [normal.precip, normP, 0.000501],
      [row.tavg, VARIABLES.tavg.convert(Number(sourceT)), 0.000001],
      [row.precip, VARIABLES.precip.convert(Number(sourceP)), 0.000001],
    ];
    if (comparisons.some(([actual, expected, tolerance]) => expected === '' || !Number.isFinite(Number(expected))
        || Math.abs(actual - Number(expected)) > tolerance)) {
      throw new Error('Source records differ from READY CSV at ' + key);
    }
    visited.add(key);
  }
  if (visited.size !== Object.values(climate.series).reduce((count, rows) => count + rows.length, 0)) throw new Error('Incomplete READY CSV');
  return visited.size;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const source = name => readFileSync(new URL('../data/source-records/' + name, import.meta.url), 'utf8');
  const climate = buildClimate(source);
  if (process.argv[2]) {
    console.log('Cross-checked ' + compareReadyCsv(readFileSync(process.argv[2]), climate) + ' rows against the original READY CSV.');
  }
  writeFileSync(new URL('../data/climate.json', import.meta.url), JSON.stringify(climate) + '\n');
  console.log('Wrote data/climate.json with ' + Object.values(climate.series).reduce((n, rows) => n + rows.length, 0) + ' valid state-months.');
}
