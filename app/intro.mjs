import { statePaths } from './state-paths.mjs';

const asset = name => new URL(`../assets/${name}`, import.meta.url).href;
const arrow = '<span aria-hidden="true">↗</span>';
const coordinates = { AZ: [34.3, -111.9], CA: [36.8, -119.5] };
const formatText = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

function coverageLabel(coverage) {
  const start = coverage?.start ?? coverage?.startYear ?? coverage?.minYear ?? (Array.isArray(coverage) ? coverage[0] : null);
  const end = coverage?.end ?? coverage?.endYear ?? coverage?.maxYear ?? (Array.isArray(coverage) ? coverage[1] : null);
  return start && end ? `${formatText(String(start).slice(0, 4))}–${formatText(String(end).slice(0, 4))}` : '';
}

export function renderWelcome({ coverage } = {}) {
  const years = coverageLabel(coverage);
  return `<section class="intro-shell enter" aria-labelledby="welcome-title">
    <div class="intro-grid">
      <div class="intro-copy">
        <p class="intro-eyebrow"><span aria-hidden="true"></span> NASA Space Apps 2026</p>
        <h1 id="welcome-title">Earth, over <em>time.</em></h1>
        <p class="intro-lede">Reveal how temperature and precipitation changed across Arizona and California, using decades of climate observations.</p><p class="intro-proof">Test whether the shape of climate data helps recover missing observations and understand change. <a href="#proof">See what topology changes ↗</a></p>
        <div class="intro-actions">
          <a class="intro-primary" href="#regions">Start investigation ${arrow}</a>
          <a class="intro-history" href="#history"><span aria-hidden="true">↶</span> Search history</a>
          <button class="intro-demo" type="button" data-action="guided-start">Try the guided demo <span aria-hidden="true">→</span></button>
        </div>
      </div>
      <figure class="intro-orbit">
        <div class="intro-earth" data-earth>
          <div class="orbit-circle" aria-hidden="true"></div>
          <div class="orbit-meridian" aria-hidden="true"></div>
          <div class="intro-planet">
            <img src="${asset('earth-poster.webp')}" width="960" height="960" fetchpriority="high" alt="Earth centered on North America">
            <canvas aria-hidden="true"></canvas>
          </div>
          <div class="orbit-controls" data-orbit-controls hidden>
            <button type="button" data-orbit="west" aria-label="Rotate Earth west">‹</button>
            <button type="button" data-orbit="pause" aria-pressed="false">Play orbit</button>
            <button type="button" data-orbit="east" aria-label="Rotate Earth east">›</button>
          </div>
        </div>
        <figcaption class="orbit-credit">Earth imagery by <a href="https://sketchfab.com/3d-models/earth-41fc80d85dfd480281f21b74b2de2faa" target="_blank" rel="noreferrer">Akshat</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a></figcaption>
      </figure>
    </div>
    <dl class="intro-metadata">
      <div><dt>Study areas</dt><dd>Arizona &amp; California</dd></div>
      ${years ? `<div><dt>Observation record</dt><dd>${years}</dd></div>` : ''}
      <div><dt>Data source</dt><dd>NOAA National Centers for Environmental Information</dd></div>
    </dl>
  </section>`;
}

export function renderStudyMap(regions, selection) {
  const mapWidth = 592;
  const mapHeight = 436;
  const dataStates = new Set(regions.map(region => region.id));
  const selected = id => selection === id || (selection === 'compare' && dataStates.has(id));
  return `<figure class="study-map">
    <div class="study-map-inner">
      <svg viewBox="0 0 ${mapWidth} ${mapHeight}" aria-hidden="true" class="study-geometry">
        <defs>
          <pattern id="study-grid" width="36" height="44" patternUnits="userSpaceOnUse">
            <path d="M 36 0 H 0 V 44" fill="none" stroke="currentColor" stroke-width=".6"/>
          </pattern>
          <radialGradient id="study-water">
            <stop offset="0" stop-color="#172c32"/>
            <stop offset="1" stop-color="#101c23"/>
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#study-water)"/>
        <rect width="100%" height="100%" fill="url(#study-grid)" class="study-grid"/>
        <g class="study-boundaries">${Object.entries(statePaths).map(([id, path]) =>
          `<path class="study-shape${selected(id) ? ' study-selected' : ''}" data-state="${id}" d="${path}"></path>`).join('')}
        </g>
        <text x="34" y="374" class="study-ocean" transform="rotate(-19 34 374)">Pacific Ocean</text>
      </svg>
      ${regions.filter(({ id }) => coordinates[id]).map(({ id, name }) => {
        const [lat, lon] = coordinates[id];
        const left = (lon + 126.5) * 18 / mapWidth * 100;
        const top = (48.8 - lat) * 22 / mapHeight * 100;
        return `<button type="button" class="study-pin" style="--pin-x:${left}%;--pin-y:${top}%"
          data-action="choose-region" data-region="${id}" aria-label="Select ${formatText(name)} on map" aria-pressed="${selected(id)}">
          <span class="pin-dot" aria-hidden="true"></span><span>${formatText(id)}</span>
        </button>`;
      }).join('')}
      <div class="study-north" aria-label="North">↑<span aria-hidden="true">N</span></div>
    </div>
    <figcaption>
      <span>Western United States</span>
      <a href="https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html">U.S. Census boundaries</a>
    </figcaption>
  </figure>`;
}

export function renderRegions({ regions = [], coverage, selection, settings = '' } = {}) {
  const years = coverageLabel(coverage);
  const modes = regions.length > 1
    ? [...regions, { id: 'compare', name: 'Compare both states' }] : regions;
  return `<section class="region-shell enter" aria-labelledby="regions-title">
    <header class="region-header">
      <p class="intro-eyebrow"><span aria-hidden="true"></span> Geographic coverage</p>
      <h1 id="regions-title">Choose a study area.</h1>
      <p>Explore a statewide record or compare Arizona and California over a common period.</p>
    </header>
    <div class="region-grid">
      ${renderStudyMap(regions, selection)}
      <div class="region-panel">
        <h2>Available records</h2>
        <div class="region-options" role="group" aria-label="Study area">
          ${modes.map(({ id, name }) => `<button type="button" class="region-option"
            data-action="choose-region" data-region="${formatText(id)}" aria-pressed="${selection === id}">
            <span class="region-option-code" aria-hidden="true">${id === 'compare' ? 'AZ + CA' : formatText(id)}</span>
            <span><strong>${formatText(name)}</strong><small>${id === 'compare' ? 'Compare the same variable' : 'NOAA statewide climate series'}</small></span>
            <span class="region-radio" aria-hidden="true"></span>
          </button>`).join('')}
        </div>
        ${years ? `<p class="region-coverage">Monthly records <strong>${years}</strong></p>` : ''}
        ${settings}
        <div class="mode-choices" aria-label="Choose an exploration mode">
          <button type="button" class="mode-choice mode-public" data-action="analyze"${modes.length ? '' : ' disabled'}><span><strong>Public Explorer</strong><small>Understand the changes</small></span>${arrow}</button>
          <button type="button" class="mode-choice mode-advanced" data-action="advanced"${modes.length ? '' : ' disabled'}><span><strong>Advanced Research Lab</strong><small>Investigate the topology</small></span>${arrow}</button>
        </div>
      </div>
    </div>
  </section>`;
}

export function mountIntro(page) {
  if (page !== 'welcome' && page !== 'home') return;
  const surface = document.querySelector('[data-earth]');
  if (!surface || matchMedia('(prefers-reduced-motion: reduce), (max-width: 560px)').matches) return;
  let disposed = false;
  let cleanup;
  import('./earth.mjs').then(({ attachGlobe }) => {
    if (!disposed) cleanup = attachGlobe(surface);
  }).catch(() => {});
  return () => {
    disposed = true;
    cleanup?.();
  };
}


