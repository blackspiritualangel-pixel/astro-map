/**
 * AstroCarto — Cosmic Hotspots  |  app.js
 * ============================================================
 * HOW GLIDE PASSES DATA:
 *   Glide Web Embed supports URL parameter injection.
 *   Set your embed URL to something like:
 *
 *   https://yoursite.com/astrocarto/?embed=glide
 *     &sun={Sun_Sign}
 *     &rising={Rising_Sign}
 *     &moon={Moon_Sign}
 *     &vibe={Desired_Vibe}
 *     &name={Name}
 *
 *   Glide replaces {Sun_Sign} etc. with the current user's
 *   column values at runtime. The map then renders
 *   personalized planetary lines automatically.
 *
 * STANDALONE MODE (no URL params):
 *   The form panel is shown so users can pick their signs
 *   manually and hit "Reveal My Cosmic Map".
 * ============================================================
 */

const AstroCarto = (() => {

  /* ── CITY DATABASE ── */
  const CITIES = [
    { name: 'Paris',         vibe: 'Romance',   lon:   2.35, lat:  48.85, planet: 'Venus',   color: '#d4a574', sym: '♀' },
    { name: 'Tokyo',         vibe: 'Career',    lon: 139.69, lat:  35.69, planet: 'Mercury', color: '#85b7eb', sym: '☿' },
    { name: 'Maui',          vibe: 'Rest',      lon:-156.33, lat:  20.80, planet: 'Moon',    color: '#afa9ec', sym: '☽' },
    { name: 'New York City', vibe: 'Abundance', lon: -74.00, lat:  40.71, planet: 'Jupiter', color: '#5dcaa5', sym: '♃' },
    { name: 'London',        vibe: 'Purpose',   lon:  -0.12, lat:  51.50, planet: 'Sun',     color: '#f0c040', sym: '☉' },
    { name: 'Bali',          vibe: 'Spirit',    lon: 115.19, lat:  -8.41, planet: 'Venus',   color: '#d4a574', sym: '♀' },
    { name: 'Lisbon',        vibe: 'Romance',   lon:  -9.14, lat:  38.72, planet: 'Venus',   color: '#d4a574', sym: '♀' },
    { name: 'Barcelona',     vibe: 'Abundance', lon:   2.17, lat:  41.38, planet: 'Jupiter', color: '#5dcaa5', sym: '♃' },
    { name: 'Kyoto',         vibe: 'Spirit',    lon: 135.77, lat:  35.01, planet: 'Moon',    color: '#afa9ec', sym: '☽' },
    { name: 'Buenos Aires',  vibe: 'Romance',   lon: -58.40, lat: -34.60, planet: 'Venus',   color: '#d4a574', sym: '♀' },
    { name: 'Cape Town',     vibe: 'Purpose',   lon:  18.42, lat: -33.92, planet: 'Sun',     color: '#f0c040', sym: '☉' },
    { name: 'Chiang Mai',    vibe: 'Rest',      lon:  98.98, lat:  18.79, planet: 'Moon',    color: '#afa9ec', sym: '☽' },
    { name: 'Amsterdam',     vibe: 'Career',    lon:   4.90, lat:  52.37, planet: 'Mercury', color: '#85b7eb', sym: '☿' },
    { name: 'Tulum',         vibe: 'Spirit',    lon: -87.46, lat:  20.21, planet: 'Moon',    color: '#afa9ec', sym: '☽' },
    { name: 'Dubai',         vibe: 'Abundance', lon:  55.30, lat:  25.20, planet: 'Jupiter', color: '#5dcaa5', sym: '♃' },
    { name: 'Sydney',        vibe: 'Career',    lon: 151.21, lat: -33.87, planet: 'Mercury', color: '#85b7eb', sym: '☿' },
  ];

  /* ── SIGN → PLANETARY LINE OFFSETS ──
     Each zodiac sign shifts the phase angle of its ruling
     planetary arc, so the map lines visually respond to the
     user's specific chart. Values are in degrees. */
  const SIGN_OFFSETS = {
    Aries:       { sun:  20, moon:  15, venus: -10, jupiter:   5, mercury:  10 },
    Taurus:      { sun:  10, moon:   5, venus:  20, jupiter:  10, mercury:   0 },
    Gemini:      { sun:   5, moon:  10, venus:   0, jupiter: -10, mercury:  20 },
    Cancer:      { sun:  -5, moon:  25, venus:  15, jupiter:   0, mercury:  -5 },
    Leo:         { sun:  25, moon:   5, venus:  10, jupiter:  15, mercury:   5 },
    Virgo:       { sun:   8, moon:  12, venus:   0, jupiter: -15, mercury:  25 },
    Libra:       { sun:   5, moon:   0, venus:  25, jupiter:  20, mercury:  10 },
    Scorpio:     { sun: -10, moon:  20, venus:  -5, jupiter:   0, mercury: -10 },
    Sagittarius: { sun:  20, moon:  -5, venus:   5, jupiter:  25, mercury:   0 },
    Capricorn:   { sun:  10, moon: -10, venus:   5, jupiter:  15, mercury: -15 },
    Aquarius:    { sun:   0, moon:   5, venus:  -5, jupiter:  10, mercury:  20 },
    Pisces:      { sun:  -5, moon:  22, venus:  18, jupiter:   5, mercury: -10 },
  };

  /* ── PLANET LINE BASE CONFIG ── */
  const PLANET_LINES = [
    { planet: 'Sun',    key: 'sun',     color: '#f0c040', width: 1.8, phase:  20, amp: 26, freq: 180 },
    { planet: 'Moon',   key: 'moon',    color: '#afa9ec', width: 1.5, phase: -30, amp: 30, freq: 160 },
    { planet: 'Venus',  key: 'venus',   color: '#d4a574', width: 1.5, phase:  60, amp: 22, freq: 140 },
    { planet: 'Jupiter', key: 'jupiter', color: '#5dcaa5', width: 1.5, phase: -80, amp: 35, freq: 170 },
    { planet: 'Mercury', key: 'mercury', color: '#85b7eb', width: 1.0, phase:  10, amp: 18, freq: 130 },
  ];

  /* ── MAP DIMENSIONS (SVG viewBox) ── */
  const W = 800;
  const H = 480;

  /* ── STATE ── */
  let svg, proj, pathGen;
  let isGlideMode = false;

  /* ──────────────────────────────────────────────
     URL PARAMETER HANDLING
     Glide injects values via URL query string.
     e.g. ?embed=glide&sun=Leo&rising=Scorpio&vibe=Romance
  ────────────────────────────────────────────── */
  function parseURLParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      embed:   params.get('embed')    || '',
      name:    params.get('name')     || '',
      sun:     titleCase(params.get('sun')    || ''),
      rising:  titleCase(params.get('rising') || ''),
      moon:    titleCase(params.get('moon')   || ''),
      vibe:    titleCase(params.get('vibe')   || 'all'),
    };
  }

  function titleCase(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /* Apply URL params to the form selects (standalone mode)
     or directly to state (glide mode). */
  function applyParams(params) {
    setSelect('sun',    params.sun);
    setSelect('rising', params.rising);
    setSelect('moon',    params.moon);
    setSelect('energy', params.vibe !== 'All' ? params.vibe : 'all');

    if (params.name) {
      const sub = document.getElementById('hdr-sub');
      if (sub) sub.textContent = `${params.name}'s cosmic map`;
    }
  }

  function setSelect(id, value) {
    const el = document.getElementById(id);
    if (!el || !value) return;
    const opt = [...el.options].find(o => o.value.toLowerCase() === value.toLowerCase());
    if (opt) el.value = opt.value;
  }

  /* ──────────────────────────────────────────────
     GET CURRENT FORM VALUES
     Works whether data came from URL or manual form.
  ────────────────────────────────────────────── */
  function getFormValues() {
    return {
      sun:    document.getElementById('sun').value,
      rising: document.getElementById('rising').value,
      moon:   document.getElementById('moon').value,
      vibe:   document.getElementById('energy').value,
    };
  }

  /* ──────────────────────────────────────────────
     MAP INIT
     Builds the SVG canvas, stars, graticule, loads
     world topology then renders lines + cities.
  ────────────────────────────────────────────── */
  function buildMap() {
    const mapDiv = document.getElementById('map');
    mapDiv.innerHTML = '';

    // Loading indicator
    const loading = document.createElement('div');
    loading.id = 'map-loading';
    loading.textContent = 'Charting the cosmos…';
    document.getElementById('map-wrap').appendChild(loading);

    svg = d3.select('#map').append('svg')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .attr('role', 'img')
      .attr('aria-label', 'Astrocartography world map with planetary lines and cosmic hotspot cities');

    proj = d3.geoNaturalEarth1().scale(138).translate([W / 2, H / 2 + 15]);
    pathGen = d3.geoPath(proj);

    // Ocean background
    svg.append('rect').attr('width', W).attr('height', H).attr('fill', '#06101a');

    // Stars
    const rng = d3.randomLcg(42);
    svg.selectAll('circle.star')
      .data(Array.from({ length: 260 }, () => ({
        x: rng() * W, y: rng() * H,
        r: rng() * 1.1 + 0.3,
        o: rng() * 0.5 + 0.15,
      })))
      .join('circle')
      .attr('class', 'star')
      .attr('cx', d => d.x).attr('cy', d => d.y)
      .attr('r',  d => d.r).attr('fill', '#ddd8c0')
      .attr('opacity', d => d.o);

    // Graticule grid (30° spacing)
    svg.append('path')
      .datum(d3.geoGraticule().step([30, 30])())
      .attr('d', pathGen)
      .attr('fill', 'none')
      .attr('stroke', '#0f1e2e')
      .attr('stroke-width', 0.5);

    // Equator (dashed)
    svg.append('path')
      .datum({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: d3.range(-180, 181, 5).map(x => [x, 0]) }
      })
      .attr('d', pathGen)
      .attr('fill', 'none')
      .attr('stroke', '#1a3550')
      .attr('stroke-width', 0.7)
      .attr('stroke-dasharray', '3,5');

    // Load world topology
    d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(world => {
        const loading = document.getElementById('map-loading');
        if (loading) loading.remove();

        const countries = topojson.feature(world, world.objects.countries);
        const borders   = topojson.mesh(world, world.objects.countries, (a, b) => a !== b);

        // Land masses
        svg.selectAll('path.land')
          .data(countries.features)
          .join('path')
          .attr('class', 'land')
          .attr('d', pathGen)
          .attr('fill', '#112030')
          .attr('stroke', 'none');

        // Country borders
        svg.append('path').datum(borders)
          .attr('d', pathGen)
          .attr('fill', 'none')
          .attr('stroke', '#1a3850')
          .attr('stroke-width', 0.35);

        // Sphere outline
        svg.append('path').datum({ type: 'Sphere' })
          .attr('d', pathGen)
          .attr('fill', 'none')
          .attr('stroke', '#1a3850')
          .attr('stroke-width', 1);

        // Layer groups (order matters — lines under pins)
        svg.append('g').attr('id', 'planet-lines');
        svg.append('g').attr('id', 'city-pins');

        renderLines();
        renderCities();
      })
      .catch(() => {
        const loading = document.getElementById('map-loading');
        if (loading) loading.textContent = 'Could not load map data. Check your connection.';
      });
  }

  /* ──────────────────────────────────────────────
     RENDER PLANETARY LINES
     Phase of each arc shifts based on the user's
     Sun, Rising, and Moon signs.
  ────────────────────────────────────────────── */
  function renderLines() {
    const { sun, rising, moon } = getFormValues();
    const g = d3.select('#planet-lines');
    g.selectAll('*').remove();

    PLANET_LINES.forEach(line => {
      let phase = line.phase;

      // Apply sign offsets — Sun sign shifts Sun/Venus,
      // Rising shifts Jupiter/Mercury, Moon shifts Moon line
      const sunOffsets     = SIGN_OFFSETS[sun]    || {};
      const risingOffsets  = SIGN_OFFSETS[rising] || {};
      const moonOffsets    = SIGN_OFFSETS[moon]    || {};

      if (line.key === 'sun')     phase += (sunOffsets.sun     || 0);
      if (line.key === 'moon')    phase += (moonOffsets.moon   || 0);
      if (line.key === 'venus')   phase += (sunOffsets.venus   || 0);
      if (line.key === 'jupiter') phase += (risingOffsets.jupiter || 0);
      if (line.key === 'mercury') phase += (risingOffsets.mercury || 0);

      const coords = d3.range(-180, 181, 8).map(lon => [
        lon,
        Math.max(-75, Math.min(75,
          line.amp * Math.sin((lon + phase) * Math.PI / line.freq)
        )),
      ]);

      g.append('path')
        .datum({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords } })
        .attr('d', pathGen)
        .attr('fill', 'none')
        .attr('stroke', line.color)
        .attr('stroke-width', line.width)
        .attr('opacity', 0.82)
        .attr('stroke-linecap', 'round');
    });
  }

  /* ──────────────────────────────────────────────
     RENDER CITY PINS
     Filters by selected vibe, draws pulsing rings,
     city labels, and wires up tooltip events.
  ────────────────────────────────────────────── */
  function renderCities() {
    const { vibe } = getFormValues();
    const filtered = vibe === 'all' ? CITIES : CITIES.filter(c => c.vibe === vibe);
    const active   = filtered.length ? filtered : CITIES.slice(0, 6);

    const g       = d3.select('#city-pins');
    g.selectAll('*').remove();

    const tooltip  = document.getElementById('tooltip');
    const mapWrap  = document.getElementById('map-wrap');

    active.forEach(city => {
      const pt = proj([city.lon, city.lat]);
      if (!pt) return;
      const [cx, cy] = pt;

      // Outer glow rings
      g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 15)
        .attr('fill', 'none').attr('stroke', city.color)
        .attr('stroke-width', 0.5).attr('opacity', 0.18);

      g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 8)
        .attr('fill', 'none').attr('stroke', city.color)
        .attr('stroke-width', 0.8).attr('opacity', 0.42);

      // Core dot (interactive)
      g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 4.5)
        .attr('fill', city.color).attr('opacity', 0.95)
        .attr('cursor', 'pointer')
        .attr('tabindex', 0)
        .attr('role', 'button')
        .attr('aria-label', `${city.name} — ${city.vibe}`)
        .on('mousemove touchmove', (evt) => showTooltip(evt, city, mapWrap, tooltip))
        .on('mouseleave touchend', () => hideTooltip(tooltip));

      // Center highlight
      g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 1.8)
        .attr('fill', '#fff').attr('opacity', 0.9);

      // Label background + text
      const isRight  = cx < W * 0.72;
      const lx       = isRight ? cx + 12 : cx - 12;
      const anchor   = isRight ? 'start' : 'end';
      const ly       = cy <= 55 ? cy + 22 : cy - 13;

      const bgRect = g.append('rect').attr('rx', 3)
        .attr('fill', '#06101a').attr('opacity', 0.8);

      const nameText = g.append('text')
        .attr('x', lx).attr('y', ly)
        .attr('text-anchor', anchor)
        .attr('font-size', 10).attr('font-weight', '600')
        .attr('fill', '#e0d4b0').attr('font-family', 'Cinzel, serif')
        .text(city.name);

      const vibeText = g.append('text')
        .attr('x', lx).attr('y', ly + 12)
        .attr('text-anchor', anchor)
        .attr('font-size', 9).attr('fill', city.color)
        .attr('font-family', 'Crimson Pro, serif')
        .attr('font-style', 'italic')
        .text(`${city.sym} ${city.vibe}`);

      // Size background rect to fit both text labels
      try {
        const nb = nameText.node().getBBox();
        const vb = vibeText.node().getBBox();
        bgRect
          .attr('x',      Math.min(nb.x, vb.x) - 2)
          .attr('y',      nb.y - 2)
          .attr('width',  Math.max(nb.width, vb.width) + 4)
          .attr('height', nb.height + vb.height + 4);
      } catch (e) { /* getBBox may fail in hidden iframes */ }
    });

    renderCityStrip(active);
  }

  /* ──────────────────────────────────────────────
     TOOLTIP HELPERS
  ────────────────────────────────────────────── */
  function showTooltip(evt, city, mapWrap, tooltip) {
    const svgEl  = mapWrap.querySelector('svg');
    if (!svgEl) return;
    const sr     = svgEl.getBoundingClientRect();
    const scale  = sr.width / W;
    const pt     = proj([city.lon, city.lat]);
    if (!pt) return;
    const [cx, cy] = pt;
    const px = cx * scale;
    const py = cy * scale;

    document.getElementById('tt-name').textContent    = city.name;
    document.getElementById('tt-vibe').textContent    = city.vibe;
    document.getElementById('tt-vibe').style.color    = city.color;
    document.getElementById('tt-planet').textContent  = `${city.sym} ${city.planet} line`;

    tooltip.style.display = 'block';
    tooltip.setAttribute('aria-hidden', 'false');
    tooltip.style.left = Math.min(px + 14, sr.width - 140) + 'px';
    tooltip.style.top  = Math.max(6, py - 56) + 'px';
  }

  function hideTooltip(tooltip) {
    tooltip.style.display = 'none';
    tooltip.setAttribute('aria-hidden', 'true');
  }

  /* ──────────────────────────────────────────────
     CITY STRIP (scrollable pills at bottom)
  ────────────────────────────────────────────── */
  function renderCityStrip(cities) {
    const strip = document.getElementById('city-strip');
    strip.innerHTML = '';
    cities.forEach(city => {
      const pill = document.createElement('div');
      pill.className = 'city-pill';
      pill.setAttribute('role', 'listitem');
      pill.setAttribute('tabindex', '0');
      pill.innerHTML = `
        <div class="cp-name">${city.name}</div>
        <div class="cp-vibe" style="color:${city.color}">${city.sym} ${city.vibe}</div>
      `;
      strip.appendChild(pill);
    });
  }

  /* ──────────────────────────────────────────────
     PUBLIC: calculate()
     Called by the "Reveal My Cosmic Map" button.
  ────────────────────────────────────────────── */
  function calculate() {
    const btn = document.getElementById('calc-btn');
    if (btn) {
      btn.textContent = 'Calculating…';
      btn.disabled    = true;
    }
    setTimeout(() => {
      renderLines();
      renderCities();
      if (btn) {
        btn.textContent = 'Reveal My Cosmic Map ✦';
        btn.disabled    = false;
      }
    }, 350);
  }

  /* ──────────────────────────────────────────────
     INIT
     Runs on page load. Checks for Glide URL params,
     applies them, then builds the map.
  ────────────────────────────────────────────── */
  function init() {
    const params = parseURLParams();

    // Detect Glide embed mode
    isGlideMode = params.embed === 'glide';
    if (isGlideMode) {
      document.body.classList.add('glide-mode');
      const formPanel = document.getElementById('form-panel');
      if (formPanel) formPanel.classList.add('glide-mode');
    }

    // Apply URL params to form (even in standalone — pre-fills if linked with params)
    applyParams(params);

    // Build the map
    buildMap();
  }

  /* Run on DOM ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* Expose public API */
  return { calculate, renderLines, renderCities };

})();
