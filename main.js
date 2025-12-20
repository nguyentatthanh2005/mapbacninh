(async () => {
  'use strict';

  // =====================================================
  // CONFIG
  // =====================================================
  const CENTER_BN = [21.178138, 106.071002];

  // GraphHopper key (tùy chọn). OSRM vẫn chạy bình thường kể cả khi GH bị giới hạn.
  const GH_KEY = 'ba948071-8a9c-43e3-b979-9c317504b739';

  // Giảm spam request
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  const GH_SOFT_LIMIT_PER_MIN = 10;

  // Flight routing
  const MAX_FLIGHT_LEGS = 6;      // để dễ ra transit châu Âu
  const LAYOVER_MIN = 70;

  const TYPES = {
    ADMIN: 'Hành chính',
    SCHOOL: 'Trường',
    HEALTH: 'Y tế',
    FOOD: 'Ăn uống',
    SHOP: 'Mua sắm',
    ROAD: 'Đường xá',
    AIRPORT: 'Sân bay'
  };
  const ALLOWED_TYPES = new Set(Object.values(TYPES));

  // =====================================================
  // DOM
  // =====================================================
  const el = {
    routingPanel: document.getElementById('routingPanel'),
    btnDirect: document.getElementById('btnDirect'),
    startInput: document.getElementById('startInput'),
    endInput: document.getElementById('endInput'),
    startBtn: document.getElementById('startBtn'),
    itinerary: document.getElementById('itineraryContainer'),

    searchInput: document.getElementById('searchInput'),
    suggestionBox: document.getElementById('suggestionBox'),

    btnAllOn: document.getElementById('btnAllOn'),
    btnAllOff: document.getElementById('btnAllOff'),

    planeBox: document.getElementById('planeBox'),
    fromAirportSelect: document.getElementById('fromAirportSelect'),
    toAirportSelect: document.getElementById('toAirportSelect'),

    preferGH: document.getElementById('preferGH')
  };

  const qsAll = (sel) => Array.from(document.querySelectorAll(sel));

  // =====================================================
  // HELPERS
  // =====================================================
  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function isMobile() {
    return window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
  }

  function toRad(d) { return d * Math.PI / 180; }

  function haversineKm(a, b) {
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  function fmtDist(meters) {
    if (!Number.isFinite(meters)) return '-';
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  }

  function fmtTime(sec) {
    if (!Number.isFinite(sec)) return '-';
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return h ? `${h} giờ ${m} phút` : `${m} phút`;
  }

  function setBusy(on) {
    if (!el.startBtn) return;
    el.startBtn.disabled = Boolean(on);
    el.startBtn.innerHTML = on ? '<i class="fa-solid fa-spinner fa-spin"></i> Đang tính...' : 'Bắt đầu';
  }

  function getStyle(type) {
    switch (type) {
      case TYPES.ADMIN: return { color: '#2563eb', icon: 'fa-building-columns' };
      case TYPES.SCHOOL: return { color: '#7c3aed', icon: 'fa-graduation-cap' };
      case TYPES.HEALTH: return { color: '#dc2626', icon: 'fa-heart-pulse' };
      case TYPES.FOOD: return { color: '#d97706', icon: 'fa-utensils' };
      case TYPES.SHOP: return { color: '#db2777', icon: 'fa-bag-shopping' };
      case TYPES.ROAD: return { color: '#059669', icon: 'fa-road' };
      case TYPES.AIRPORT: return { color: '#0ea5e9', icon: 'fa-plane' };
      default: return { color: '#6b7280', icon: 'fa-location-dot' };
    }
  }

  // =====================================================
  // MAP INIT
  // =====================================================
  const map = L.map('map', { zoomControl: false }).setView(CENTER_BN, 15);
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  const baseLayers = {
    osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }),
    terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 17,
      attribution: '© OpenTopoMap'
    }),
    sat: L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19, attribution: 'Tiles © Esri' }
    )
  };

  const overlays = {
    bike: L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', {
      maxZoom: 20, opacity: 0.95, attribution: '© CyclOSM / OpenStreetMap'
    }),
    transit: L.tileLayer('https://{s}.tile.openptmap.org/pt/{z}/{x}/{y}.png', {
      maxZoom: 19, opacity: 0.9, attribution: '© OpenPTMap / OpenStreetMap'
    }),
    fires: L.tileLayer.wms('https://firms.modaps.eosdis.nasa.gov/wms/', {
      layers: 'fires_modis_24',
      format: 'image/png',
      transparent: true,
      opacity: 0.7,
      attribution: '© NASA FIRMS'
    })
  };

  let currentBaseKey = 'osm';
  baseLayers[currentBaseKey].addTo(map);

  L.circle(CENTER_BN, {
    color: '#2563eb',
    fillColor: '#2563eb',
    fillOpacity: 0.06,
    radius: 2500
  }).addTo(map);

  const markersLayer = L.layerGroup().addTo(map);
  const routeLayer = L.layerGroup().addTo(map);

  // =====================================================
  // UI: Legend + Layers + Geolocation
  // =====================================================
  window.toggleLegend = () => {
    const box = document.getElementById('legendBox');
    const btn = document.getElementById('openLegendBtn');
    if (!box || !btn) return;

    const hidden = box.style.display === 'none';
    box.style.display = hidden ? 'block' : 'none';
    btn.style.display = hidden ? 'none' : 'block';
  };

  const legendBox = document.getElementById('legendBox');
  const openLegendBtn = document.getElementById('openLegendBtn');
  if (legendBox) legendBox.style.display = 'block';
  if (openLegendBtn) openLegendBtn.style.display = 'none';

  window.toggleMapLayers = (force) => {
    const panel = document.getElementById('layersPanel');
    if (!panel) return;

    if (isMobile() && el.routingPanel && el.routingPanel.style.display === 'block') {
      el.routingPanel.style.display = 'none';
      el.btnDirect?.classList.remove('active');
    }

    const next = (typeof force === 'boolean') ? force : (panel.style.display !== 'block');
    panel.style.display = next ? 'block' : 'none';
  };

  window.setBaseLayer = (key) => {
    if (!baseLayers[key]) return;
    map.removeLayer(baseLayers[currentBaseKey]);
    currentBaseKey = key;
    map.addLayer(baseLayers[currentBaseKey]);

    qsAll('.layer-tile').forEach(btn => btn.classList.toggle('active', btn.dataset.base === key));
  };

  window.toggleOverlayLayer = (key, enabled) => {
    const layer = overlays[key];
    if (!layer) return;
    if (enabled) map.addLayer(layer);
    else map.removeLayer(layer);
  };

  let userMarker = null;
  window.locateUser = () => map.locate({ setView: true, maxZoom: 16 });

  map.on('locationfound', (e) => {
    if (userMarker) map.removeLayer(userMarker);
    userMarker = L.marker(e.latlng).addTo(map).bindPopup('Bạn ở đây').openPopup();
  });

  map.on('locationerror', () => {
    alert('Không thể lấy vị trí (hãy cho phép quyền truy cập vị trí).');
  });

  // =====================================================
  // LOAD DATA
  // =====================================================
  async function fetchJson(path) {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} - ${path}`);
    return res.json();
  }

  let AIRPORTS = [];
  let locations = [];

  async function loadAirports() {
    const arr = await fetchJson('./sanbay.json');
    if (!Array.isArray(arr)) throw new Error('sanbay.json phải là mảng JSON');

    AIRPORTS = arr
      .filter(a => a && a.code && Number.isFinite(a.lat) && Number.isFinite(a.lng))
      .map(a => ({
        code: String(a.code).trim().toUpperCase(),
        name: String(a.name || '').trim(),
        country: String(a.country || '').trim(),
        lat: Number(a.lat),
        lng: Number(a.lng)
      }))
      .sort((x, y) => (x.country + x.code).localeCompare(y.country + y.code));
  }

  function airportByCode(code) {
    code = String(code || '').trim().toUpperCase();
    return AIRPORTS.find(a => a.code === code) || null;
  }

  function nearestAirport(latlng) {
    let best = null, bestD = Infinity;
    for (const a of AIRPORTS) {
      const d = haversineKm({ lat: latlng.lat, lng: latlng.lng }, { lat: a.lat, lng: a.lng });
      if (d < bestD) { bestD = d; best = a; }
    }
    return best;
  }

  function fillAirportSelects() {
    if (!el.fromAirportSelect || !el.toAirportSelect) return;
    el.fromAirportSelect.innerHTML = '';
    el.toAirportSelect.innerHTML = '';

    const mk = (a) => {
      const opt = document.createElement('option');
      opt.value = a.code;
      opt.textContent = `${a.name} (${a.code}) - ${a.country}`;
      return opt;
    };

    AIRPORTS.forEach(a => {
      el.fromAirportSelect.appendChild(mk(a));
      el.toAirportSelect.appendChild(mk(a));
    });

    if (airportByCode('HAN')) el.fromAirportSelect.value = 'HAN';
    if (airportByCode('NRT')) el.toAirportSelect.value = 'NRT';
  }

  async function loadGeo() {
    const geo = await fetchJson('./geo.json');
    if (!geo || geo.type !== 'FeatureCollection' || !Array.isArray(geo.features)) {
      throw new Error('geo.json không đúng FeatureCollection');
    }

    const base = geo.features
      .filter(f => f?.geometry?.type === 'Point' && Array.isArray(f.geometry.coordinates))
      .map(f => {
        const [lng, lat] = f.geometry.coordinates;
        const props = f.properties || {};
        let type = String(props.type || TYPES.ROAD).trim();
        if (!ALLOWED_TYPES.has(type)) type = TYPES.ROAD;

        return {
          lat: Number(lat),
          lng: Number(lng),
          name: String(props.name || '').trim(),
          address: String(props.address || '').trim(),
          type
        };
      })
      .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.name);

    const airportsAsLocations = AIRPORTS.map(a => ({
      lat: a.lat,
      lng: a.lng,
      name: `${a.name} (${a.code})`,
      address: a.country,
      type: TYPES.AIRPORT,
      _airportCode: a.code
    }));

    locations = [...base, ...airportsAsLocations];
  }

  try {
    await loadAirports();
    fillAirportSelects();
    await loadGeo();
  } catch (e) {
    console.error(e);
    alert(e?.message || String(e));
    AIRPORTS = [];
    locations = [];
  }

  // =====================================================
  // FLIGHT GRAPH (tuyến bay “thực tế” theo dạng graph transit)
  // =====================================================
  const FLIGHT_ROUTES = [
    // VN nội địa
    ['HAN','SGN'], ['HAN','DAD'], ['HAN','CXR'], ['HAN','PQC'], ['HAN','VII'], ['HAN','HPH'], ['HAN','VDO'],
    ['SGN','DAD'], ['SGN','CXR'], ['SGN','PQC'], ['DAD','CXR'],

    // VN -> Asia
    ['HAN','BKK'], ['HAN','SIN'], ['HAN','HKG'], ['HAN','ICN'], ['HAN','NRT'],
    ['SGN','BKK'], ['SGN','SIN'], ['SGN','HKG'], ['SGN','ICN'], ['SGN','NRT'],
    ['DAD','BKK'], ['DAD','SIN'],

    // Asia hub
    ['SIN','KUL'], ['SIN','HKG'], ['SIN','ICN'], ['SIN','NRT'], ['SIN','DXB'], ['SIN','LHR'],
    ['BKK','HKG'], ['BKK','ICN'], ['BKK','NRT'], ['BKK','DXB'],
    ['HKG','ICN'], ['HKG','NRT'], ['ICN','NRT'],

    // Middle East / Turkey hub (cực quan trọng để đi EU)
    ['HAN','IST'], ['SGN','IST'], ['DAD','IST'],
    ['HAN','DOH'], ['SGN','DOH'], ['DAD','DOH'],
    ['HAN','DXB'], ['SGN','DXB'], ['DAD','DXB'],

    // Hub -> EU
    ['IST','FRA'], ['IST','AMS'], ['IST','CDG'], ['IST','LHR'], ['IST','VIE'], ['IST','ZRH'], ['IST','MAD'], ['IST','FCO'], ['IST','HEL'],
    ['DOH','FRA'], ['DOH','AMS'], ['DOH','CDG'], ['DOH','LHR'], ['DOH','MAD'], ['DOH','FCO'], ['DOH','ZRH'],
    ['DXB','FRA'], ['DXB','AMS'], ['DXB','MUC'], ['DXB','ZRH'], ['DXB','MAD'], ['DXB','FCO'], ['DXB','CDG'], ['DXB','LHR'],

    // Asia -> EU (một số tuyến thẳng)
    ['SIN','FRA'], ['SIN','AMS'], ['SIN','CDG'],
    ['ICN','FRA'], ['ICN','AMS'], ['ICN','CDG'],
    ['HKG','FRA'], ['HKG','AMS'], ['HKG','CDG'],
    ['NRT','FRA'], ['NRT','AMS'], ['NRT','CDG'],

    // EU nội bộ để transit nhiều chặng trong EU
    ['LHR','CDG'], ['LHR','AMS'], ['LHR','FRA'],
    ['CDG','AMS'], ['CDG','FRA'], ['CDG','ZRH'],
    ['FRA','AMS'], ['FRA','MUC'], ['FRA','ZRH'], ['FRA','VIE'], ['FRA','MAD'], ['FRA','FCO'],
    ['AMS','MAD'], ['AMS','FCO'], ['AMS','ZRH'],
    ['MAD','BCN'], ['FCO','MXP'], ['MUC','ZRH'], ['VIE','ZRH'],
    ['HEL','FRA'], ['HEL','AMS'], ['HEL','LHR']
  ];

  function buildFlightGraph() {
    const g = new Map();
    const add = (a, b) => {
      if (!g.has(a)) g.set(a, new Set());
      if (!g.has(b)) g.set(b, new Set());
      g.get(a).add(b);
      g.get(b).add(a);
    };
    FLIGHT_ROUTES.forEach(([a, b]) => add(a, b));
    return g;
  }
  const FLIGHT_GRAPH = buildFlightGraph();

  function kmOfPath(codes) {
    let total = 0;
    for (let i = 0; i < codes.length - 1; i++) {
      const A = airportByCode(codes[i]);
      const B = airportByCode(codes[i + 1]);
      if (!A || !B) return Infinity;
      total += haversineKm({ lat: A.lat, lng: A.lng }, { lat: B.lat, lng: B.lng });
    }
    return total;
  }

  // BFS tối ưu: ưu tiên ít chặng, rồi ít km hơn
  function findFlightPath(fromCode, toCode, maxLegs = MAX_FLIGHT_LEGS) {
    if (!fromCode || !toCode) return null;
    if (fromCode === toCode) return [fromCode];
    if (!FLIGHT_GRAPH.has(fromCode) || !FLIGHT_GRAPH.has(toCode)) return [fromCode, toCode];

    const q = [{ path: [fromCode] }];
    const bestAt = new Map();

    let best = null;
    let bestLegs = Infinity;
    let bestKm = Infinity;

    while (q.length) {
      const { path } = q.shift();
      const last = path[path.length - 1];
      const legs = path.length - 1;

      if (legs > maxLegs) continue;
      if (legs > bestLegs) continue;

      if (last === toCode) {
        const km = kmOfPath(path);
        if (legs < bestLegs || (legs === bestLegs && km < bestKm)) {
          best = path;
          bestLegs = legs;
          bestKm = km;
        }
        continue;
      }

      const neighbors = FLIGHT_GRAPH.get(last) || new Set();
      for (const nb of neighbors) {
        if (path.includes(nb)) continue;

        const next = [...path, nb];
        const nextLegs = next.length - 1;

        const km = kmOfPath(next);
        const key = `${nb}|${nextLegs}`;
        const prev = bestAt.get(key);

        if (prev == null || km < prev) {
          bestAt.set(key, km);
          q.push({ path: next });
        }
      }
    }

    return best || [fromCode, toCode];
  }

  function calcFlightLeg(codeA, codeB) {
    const A = airportByCode(codeA);
    const B = airportByCode(codeB);
    if (!A || !B) return { km: 0, sec: 0 };

    const km = haversineKm({ lat: A.lat, lng: A.lng }, { lat: B.lat, lng: B.lng });

    // Ước lượng thời gian bay
    const cruiseKmh = 820;
    const takeoffLandingMin = 25;
    const sec = (km / cruiseKmh) * 3600 + takeoffLandingMin * 60;

    return { km, sec };
  }

  // =====================================================
  // MARKERS + FILTER
  // =====================================================
  let markerIndex = [];

  function checkedTypes() {
    return new Set(qsAll('.filters input[type="checkbox"]:checked').map(x => x.value));
  }

  function createMarker(loc) {
    const st = getStyle(loc.type);
    const safeName = JSON.stringify(loc.name);

    const icon = L.divIcon({
      className: 'custom-pin-wrapper',
      html: `<div class="custom-pin" style="background-color:${st.color};"><i class="fa-solid ${st.icon}"></i></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -20]
    });

    const marker = L.marker([loc.lat, loc.lng], { icon });

    const popup = `
      <div style="font-family:'Segoe UI'">
        <div class="popup-title" style="color:${st.color}">${escapeHtml(loc.name)}</div>
        <div class="popup-type">${escapeHtml(loc.type)}${loc.address ? ` • ${escapeHtml(loc.address)}` : ''}</div>
        <div class="popup-actions">
          <button class="popup-btn" onclick="startRouteFrom(${loc.lat}, ${loc.lng}, ${safeName})">
            <i class="fa-solid fa-flag"></i> Đi từ đây
          </button>
          <button class="popup-btn" onclick="startRouteTo(${loc.lat}, ${loc.lng}, ${safeName})">
            <i class="fa-solid fa-flag-checkered"></i> Đến đây
          </button>
        </div>
      </div>
    `;
    marker.bindPopup(popup);
    return marker;
  }

  function renderMarkers() {
    markersLayer.clearLayers();
    markerIndex = [];

    const allow = checkedTypes();
    for (const loc of locations) {
      if (!allow.has(loc.type)) continue;
      const marker = createMarker(loc);
      markersLayer.addLayer(marker);
      markerIndex.push({ name: loc.name, type: loc.type, marker, loc });
    }
  }

  function setAllFilters(on) {
    qsAll('.filters input[type="checkbox"]').forEach(cb => cb.checked = Boolean(on));
    renderMarkers();
  }

  el.btnAllOn?.addEventListener('click', () => setAllFilters(true));
  el.btnAllOff?.addEventListener('click', () => setAllFilters(false));
  qsAll('.filters input[type="checkbox"]').forEach(cb => cb.addEventListener('change', renderMarkers));
  renderMarkers();

  // =====================================================
  // SEARCH
  // =====================================================
  let suggestions = [];
  let suggestIndex = -1;

  function hideSuggestions() {
    if (!el.suggestionBox) return;
    el.suggestionBox.style.display = 'none';
    el.suggestionBox.innerHTML = '';
    suggestions = [];
    suggestIndex = -1;
  }

  function drawSuggestions() {
    if (!el.suggestionBox) return;
    if (!suggestions.length) return hideSuggestions();

    el.suggestionBox.innerHTML = suggestions.map((l, idx) => {
      const st = getStyle(l.type);
      const safeName = JSON.stringify(l.name);
      const active = idx === suggestIndex ? 'active' : '';
      return `
        <div class="suggestion-item ${active}" data-idx="${idx}" onclick="selectSuggestion(${safeName})" role="option">
          <i class="fa-solid ${st.icon}" style="color:${st.color}"></i>
          <div class="sug-text">
            <div>${escapeHtml(l.name)}</div>
            <div class="sug-sub">${escapeHtml(l.address || l.type)}</div>
          </div>
        </div>
      `;
    }).join('');

    el.suggestionBox.style.display = 'block';

    if (suggestIndex >= 0) {
      const node = el.suggestionBox.querySelector(`.suggestion-item[data-idx="${suggestIndex}"]`);
      node?.scrollIntoView({ block: 'nearest' });
    }
  }

  function showSuggestions(val) {
    const q = String(val || '').toLowerCase().trim();
    if (!q) return hideSuggestions();

    suggestions = locations
      .filter(x => x.name.toLowerCase().includes(q))
      .slice(0, 14);

    suggestIndex = suggestions.length ? 0 : -1;
    drawSuggestions();
  }

  function selectSuggestion(name) {
    if (el.searchInput) el.searchInput.value = name;
    hideSuggestions();

    const found = locations.find(l => l.name === name);
    if (!found) return;

    map.setView([found.lat, found.lng], 16);

    const entry = markerIndex.find(m => m.name === found.name);
    if (entry) return entry.marker.openPopup();

    // Nếu đang tắt type -> bật rồi render lại
    const cb = document.querySelector(`.filters input[value="${CSS.escape(found.type)}"]`);
    if (cb) {
      cb.checked = true;
      renderMarkers();
      setTimeout(() => {
        const entry2 = markerIndex.find(m => m.name === found.name);
        entry2?.marker?.openPopup();
      }, 90);
    }
  }
  window.selectSuggestion = selectSuggestion;

  function onSearchKeyDown(e) {
    const showing = el.suggestionBox && el.suggestionBox.style.display === 'block';
    if (showing) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        suggestIndex = Math.min(suggestIndex + 1, suggestions.length - 1);
        drawSuggestions();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        suggestIndex = Math.max(suggestIndex - 1, 0);
        drawSuggestions();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = suggestions[suggestIndex];
        if (item) selectSuggestion(item.name);
      } else if (e.key === 'Escape') {
        hideSuggestions();
      }
      return;
    }

    if (e.key === 'Enter') {
      const val = String(el.searchInput?.value || '');
      const found = locations.find(l => l.name.toLowerCase().includes(val.toLowerCase()));
      if (found) selectSuggestion(found.name);
    }
  }

  if (el.searchInput) {
    el.searchInput.addEventListener('input', (e) => showSuggestions(e.target.value));
    el.searchInput.addEventListener('keydown', onSearchKeyDown);
    el.searchInput.addEventListener('blur', () => setTimeout(hideSuggestions, 120));
  }

  document.addEventListener('click', (e) => {
    const box = document.querySelector('.search-box');
    if (box && !box.contains(e.target)) hideSuggestions();
  });

  // =====================================================
  // ROUTING STATE
  // =====================================================
  let mode = 'car'; // car | moto | foot | plane
  let startPoint = null;
  let endPoint = null;
  let activeInput = 'start';
  const tempMarkers = { start: null, end: null };

  function routingEnabled() {
    return el.routingPanel && el.routingPanel.style.display === 'block';
  }

  function clearRouteOnly() {
    routeLayer.clearLayers();
    if (el.itinerary) el.itinerary.innerHTML = '';
  }

  function updateTempMarker(kind, latlng) {
    if (tempMarkers[kind]) {
      map.removeLayer(tempMarkers[kind]);
      tempMarkers[kind] = null;
    }
    if (!latlng) return;

    const bg = kind === 'start' ? '#2563eb' : '#dc2626';
    const iconHtml = kind === 'start'
      ? '<i class="fa-solid fa-flag" style="color:white"></i>'
      : '<i class="fa-solid fa-flag-checkered" style="color:white"></i>';

    const icon = L.divIcon({
      className: 'temp-marker-wrapper',
      html: `<div class="custom-pin" style="background-color:${bg};">${iconHtml}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30]
    });

    tempMarkers[kind] = L.marker(latlng, { icon }).addTo(map);
  }

  function setPoint(kind, latlng, text) {
    if (kind === 'start') {
      startPoint = latlng;
      if (el.startInput) el.startInput.value = text || '';
    } else {
      endPoint = latlng;
      if (el.endInput) el.endInput.value = text || '';
    }
    updateTempMarker(kind, latlng);
  }

  window.focusInput = (kind) => { activeInput = (kind === 'end') ? 'end' : 'start'; };

  function onMapClickSelect(e) {
    const coordText = `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;
    let target;
    if (!startPoint) target = 'start';
    else if (!endPoint) target = 'end';
    else target = activeInput;
    setPoint(target, e.latlng, coordText);
  }

  window.clearPoint = (kind) => {
    setPoint(kind, null, '');
    clearRouteOnly();
  };

  window.toggleRouting = () => {
    if (!el.routingPanel || !el.btnDirect) return;

    // mobile: đóng layers nếu đang mở
    if (isMobile()) {
      const lp = document.getElementById('layersPanel');
      if (lp && lp.style.display === 'block') lp.style.display = 'none';
    }

    if (routingEnabled()) {
      el.routingPanel.style.display = 'none';
      el.btnDirect.classList.remove('active');
      clearRouteOnly();
      setPoint('start', null, '');
      setPoint('end', null, '');
      map.off('click', onMapClickSelect);
      return;
    }

    el.routingPanel.style.display = 'block';
    el.btnDirect.classList.add('active');
    clearRouteOnly();
    setPoint('start', null, '');
    setPoint('end', null, '');
    map.on('click', onMapClickSelect);
    alert('Chế độ chỉ đường BẬT. Click bản đồ để chọn điểm.');
  };

  function setModeUI(next) {
    ['car', 'moto', 'foot', 'plane'].forEach(m => {
      const node = document.getElementById(`mode-${m}`);
      if (node) node.classList.toggle('active', m === next);
    });
    if (el.planeBox) el.planeBox.style.display = (next === 'plane') ? 'block' : 'none';
  }

  window.setMode = (next) => {
    mode = (['car', 'moto', 'foot', 'plane'].includes(next)) ? next : 'car';
    setModeUI(mode);
  };
  setModeUI(mode);

  // =====================================================
  // ROUTER CACHE
  // =====================================================
  const memCache = new Map();

  function cacheKey(provider, profile, pointsLatLng) {
    const pts = pointsLatLng.map(p => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`).join('|');
    return `route:${provider}:${profile}:${pts}`;
  }

  function cacheGet(key) {
    if (memCache.has(key)) return memCache.get(key);

    const raw = sessionStorage.getItem(key);
    if (!raw) return null;

    try {
      const obj = JSON.parse(raw);
      if (!obj || !obj.t || !obj.v) return null;
      if (Date.now() - obj.t > CACHE_TTL_MS) {
        sessionStorage.removeItem(key);
        return null;
      }
      memCache.set(key, obj.v);
      return obj.v;
    } catch {
      return null;
    }
  }

  function cacheSet(key, val) {
    memCache.set(key, val);
    try {
      sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), v: val }));
    } catch {}
  }

  // =====================================================
  // GH SOFT RATE LIMIT
  // =====================================================
  const ghHits = [];
  function ghAllowNow() {
    const now = Date.now();
    while (ghHits.length && now - ghHits[0] > 60_000) ghHits.shift();
    return ghHits.length < GH_SOFT_LIMIT_PER_MIN;
  }
  function ghMarkHit() { ghHits.push(Date.now()); }

  function isGHRateLimitError(msg) {
    const s = String(msg || '').toLowerCase();
    return (
      s.includes('minutely api limit') ||
      s.includes('rate limit') ||
      s.includes('too many requests') ||
      s.includes('429') ||
      s.includes('skip request')
    );
  }

  // =====================================================
  // PROVIDERS
  // =====================================================
  async function osrmRoute(pointsLatLng, profile) {
    // profile: driving | cycling | walking
    const coords = pointsLatLng.map(p => `${p.lng},${p.lat}`).join(';');
    const url =
      `https://router.project-osrm.org/route/v1/${encodeURIComponent(profile)}/${coords}` +
      `?overview=full&geometries=geojson&steps=true`;

    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.code !== 'Ok') throw new Error(data?.message || `OSRM error (${res.status})`);

    const r = data.routes?.[0];
    if (!r) throw new Error('OSRM: Không có kết quả');

    const geo = r.geometry?.coordinates || [];
    const poly = geo.map(([lng, lat]) => ({ lat, lng }));

    const steps = [];
    const leg = r.legs?.[0];
    if (leg?.steps?.length) {
      for (const s of leg.steps) {
        const dist = Number(s.distance || 0);
        const dur = Number(s.duration || 0);
        const name = String(s.name || '').trim();
        const type = String(s.maneuver?.type || '').trim();
        const mod = String(s.maneuver?.modifier || '').trim();

        let text = '';
        if (name) text = `Đi theo ${name}`;
        else if (type) text = `Thao tác: ${type}${mod ? ` (${mod})` : ''}`;
        else text = 'Tiếp tục';

        steps.push({ text, distance: dist, timeSec: dur });
      }
    }

    return {
      distance: Number(r.distance || 0),
      timeSec: Number(r.duration || 0),
      coords: poly,
      instructions: steps
    };
  }

  async function ghRoute(pointsLatLng, profile) {
    // profile: car | bike | foot (CHỈ profile thường, KHÔNG flexible mode)
    if (!GH_KEY || GH_KEY.trim().length < 10) throw new Error('Thiếu GH_KEY');
    if (!ghAllowNow()) throw new Error('Minutely API limit heavily violated. Skip request.');

    const url = `https://graphhopper.com/api/1/route?key=${encodeURIComponent(GH_KEY)}`;
    const body = {
      profile,
      locale: 'vi',
      points: pointsLatLng.map(p => [p.lng, p.lat]),
      instructions: true,
      calc_points: true,
      points_encoded: false
    };

    ghMarkHit();

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.message || `GraphHopper error (${res.status})`;
      throw new Error(msg);
    }

    const path = data?.paths?.[0];
    if (!path) throw new Error('GraphHopper: Không có kết quả');

    const coords = (path.points?.coordinates || []).map(([lng, lat]) => ({ lat, lng }));
    const instructions = (path.instructions || []).map(it => ({
      text: String(it.text || ''),
      distance: Number(it.distance || 0),
      timeSec: Number(it.time || 0) / 1000
    }));

    return {
      distance: Number(path.distance || 0),
      timeSec: Number(path.time || 0) / 1000,
      coords,
      instructions
    };
  }

  // Router chung: ưu tiên GH nếu user bật, nếu GH lỗi/limit -> tự rơi OSRM
  async function route(pointsLatLng, logicalMode) {
    // logicalMode: car | moto | foot
    // OSRM: driving/cycling/walking
    const osrmProfile =
      logicalMode === 'foot' ? 'walking' :
      logicalMode === 'moto' ? 'cycling' :
      'driving';

    // GH profile chỉ để tham khảo (free dễ limit)
    const ghProfile =
      logicalMode === 'foot' ? 'foot' :
      logicalMode === 'moto' ? 'bike' :
      'car';

    const preferGH = Boolean(el.preferGH?.checked);

    if (preferGH) {
      const kGH = cacheKey('GH', ghProfile, pointsLatLng);
      const cGH = cacheGet(kGH);
      if (cGH) return { ...cGH, _provider: 'GraphHopper' };

      try {
        const rGH = await ghRoute(pointsLatLng, ghProfile);
        cacheSet(kGH, rGH);
        return { ...rGH, _provider: 'GraphHopper' };
      } catch (e) {
        if (!isGHRateLimitError(e?.message)) {
          // nếu lỗi khác vẫn fallback để không chết
        }
      }
    }

    const kO = cacheKey('OSRM', osrmProfile, pointsLatLng);
    const cO = cacheGet(kO);
    if (cO) return { ...cO, _provider: 'OSRM' };

    const rO = await osrmRoute(pointsLatLng, osrmProfile);
    cacheSet(kO, rO);
    return { ...rO, _provider: 'OSRM' };
  }

  // =====================================================
  // DRAW
  // =====================================================
  function drawLine(latlngs, opt) {
    const poly = L.polyline(latlngs, opt);
    routeLayer.addLayer(poly);
    return poly;
  }

  // =====================================================
  // ROUTE CALC
  // =====================================================
  window.calculateRoute = async () => {
    if (!startPoint || !endPoint) return alert('Vui lòng chọn đủ 2 điểm!');
    setBusy(true);
    clearRouteOnly();

    try {
      // -----------------------
      // PLANE MODE
      // -----------------------
      if (mode === 'plane') {
        if (!AIRPORTS.length) throw new Error('Thiếu sanbay.json');

        const fromCode = String(el.fromAirportSelect?.value || '').trim().toUpperCase();
        const toCode = String(el.toAirportSelect?.value || '').trim().toUpperCase();

        const fromA = airportByCode(fromCode) || nearestAirport(startPoint);
        const toA = airportByCode(toCode) || nearestAirport(endPoint);
        if (!fromA || !toA) throw new Error('Không đủ sân bay để bay');

        const A = L.latLng(fromA.lat, fromA.lng);
        const B = L.latLng(toA.lat, toA.lng);

        // Ground 1: start -> A (car)
        const g1 = await route([startPoint, A], 'car');

        // Flight multi-leg
        const flightCodes = findFlightPath(fromA.code, toA.code, MAX_FLIGHT_LEGS);
        if (!flightCodes || flightCodes.length < 2) {
          throw new Error('Không tìm được tuyến bay. Hãy bổ sung FLIGHT_ROUTES.');
        }

        let flyKm = 0;
        let flySec = 0;
        const legHtml = [];

        for (let i = 0; i < flightCodes.length - 1; i++) {
          const c1 = flightCodes[i];
          const c2 = flightCodes[i + 1];
          const a1 = airportByCode(c1);
          const a2 = airportByCode(c2);
          if (!a1 || !a2) continue;

          const { km, sec } = calcFlightLeg(c1, c2);
          flyKm += km;
          flySec += sec;

          const hasLayover = i < flightCodes.length - 2;
          if (hasLayover) flySec += LAYOVER_MIN * 60;

          drawLine([L.latLng(a1.lat, a1.lng), L.latLng(a2.lat, a2.lng)], {
            color: '#0ea5e9',
            weight: 5,
            dashArray: '10 10',
            opacity: 0.95
          });

          legHtml.push(`
            <div style="padding:10px 12px;border-bottom:1px solid rgba(0,0,0,.08)">
              <div style="font-weight:900">Chặng bay ${i + 1}: ${escapeHtml(a1.code)} → ${escapeHtml(a2.code)}</div>
              <div style="opacity:.78;font-size:12px">
                ${km.toFixed(0)} km • ${fmtTime(sec)}${hasLayover ? ` • Transit ~${LAYOVER_MIN} phút` : ''}
              </div>
              <div style="opacity:.75;font-size:12px">${escapeHtml(a1.name)} → ${escapeHtml(a2.name)}</div>
            </div>
          `);
        }

        // Ground 2: B -> end (car)
        const g2 = await route([B, endPoint], 'car');

        // Draw ground
        drawLine(g1.coords, { color: '#2563eb', weight: 6, opacity: 1 });
        drawLine(g2.coords, { color: '#2563eb', weight: 6, opacity: 1 });

        const totalDist = g1.distance + flyKm * 1000 + g2.distance;
        const totalTime = g1.timeSec + flySec + g2.timeSec;

        if (el.itinerary) {
          el.itinerary.innerHTML = `
            <div style="padding:12px">
              <div style="font-weight:900;margin-bottom:6px">Chặng 1: Đến sân bay</div>
              <div>Đến: <b>${escapeHtml(fromA.name)}</b> (${escapeHtml(fromA.code)})</div>
              <div style="opacity:.8;margin-bottom:10px">${fmtDist(g1.distance)} • ${fmtTime(g1.timeSec)} • (${escapeHtml(g1._provider)})</div>

              <div style="font-weight:900;margin-bottom:6px">Chặng 2: Bay nhiều chặng</div>
              <div style="opacity:.85;margin-bottom:6px">Tuyến: <b>${escapeHtml(flightCodes.join(' → '))}</b></div>
              <div style="opacity:.8;margin-bottom:10px">Tổng bay: ${flyKm.toFixed(0)} km • ${fmtTime(flySec)}</div>
            </div>

            <div>${legHtml.join('')}</div>

            <div style="padding:12px">
              <div style="font-weight:900;margin-bottom:6px">Chặng 3: Từ sân bay đến điểm</div>
              <div>Từ: <b>${escapeHtml(toA.name)}</b> (${escapeHtml(toA.code)})</div>
              <div style="opacity:.8;margin-bottom:10px">${fmtDist(g2.distance)} • ${fmtTime(g2.timeSec)} • (${escapeHtml(g2._provider)})</div>

              <hr style="opacity:.2;margin:10px 0">
              <div><b>Tổng quãng đường:</b> ${fmtDist(totalDist)}</div>
              <div><b>Tổng thời gian:</b> ${fmtTime(totalTime)}</div>
            </div>
          `;
        }

        map.fitBounds(L.latLngBounds([startPoint, endPoint, A, B]), { padding: [50, 50] });
        return;
      }

      // -----------------------
      // NORMAL MODES
      // -----------------------
      const logical =
        mode === 'foot' ? 'foot' :
        mode === 'moto' ? 'moto' :
        'car';

      const title =
        logical === 'car' ? 'Lộ trình: Ô tô' :
        logical === 'moto' ? 'Lộ trình: Xe máy' :
        'Lộ trình: Đi bộ';

      // NOTE: OSRM cycling thường né cao tốc hơn driving (tương đối),
      // nhưng không đảm bảo 100% “đường cấm xe máy” theo luật VN.
      const result = await route([startPoint, endPoint], logical);

      drawLine(result.coords, {
        color: logical === 'moto' ? '#dc2626' : '#2563eb',
        weight: 6,
        opacity: 1
      });

      const steps = (result.instructions || [])
        .filter(x => x.text)
        .slice(0, 120)
        .map(x => `
          <div style="padding:10px 12px;border-bottom:1px solid rgba(0,0,0,.08)">
            <div style="font-weight:800">${escapeHtml(x.text)}</div>
            <div style="opacity:.75;font-size:12px">${fmtDist(x.distance)} • ${fmtTime(x.timeSec)}</div>
          </div>
        `).join('');

      const motoNote = (logical === 'moto')
        ? `<div style="opacity:.75;font-size:12px;margin-top:6px">
            * Xe máy đang dùng routing “cycling” để hạn chế cao tốc (tương đối). Muốn né “đường cấm xe máy” 100% cần dữ liệu hạn chế theo OSM/GraphHopper paid.
           </div>`
        : '';

      if (el.itinerary) {
        el.itinerary.innerHTML = `
          <div style="padding:12px">
            <div style="font-weight:900;font-size:14px;margin-bottom:6px">${escapeHtml(title)}</div>
            <div><b>Tổng quãng đường:</b> ${fmtDist(result.distance)}</div>
            <div><b>Tổng thời gian:</b> ${fmtTime(result.timeSec)}</div>
            <div style="opacity:.75;font-size:12px;margin-top:6px"><b>Provider:</b> ${escapeHtml(result._provider)}</div>
            ${motoNote}
            <div style="font-weight:900;margin:12px 0 6px">Hướng dẫn</div>
          </div>
          <div>${steps || '<div style="padding:12px;opacity:.8">Không có hướng dẫn</div>'}</div>
        `;
      }

      map.fitBounds(L.latLngBounds([startPoint, endPoint]), { padding: [50, 50] });
    } catch (err) {
      console.error(err);
      alert(`Không tính được đường: ${err?.message || err}`);
    } finally {
      setBusy(false);
    }
  };

  // =====================================================
  // POPUP ACTIONS
  // =====================================================
  window.startRouteFrom = (lat, lng, name) => {
    map.closePopup();
    if (!routingEnabled()) window.toggleRouting();
    setPoint('start', L.latLng(lat, lng), name);
  };

  window.startRouteTo = (lat, lng, name) => {
    map.closePopup();
    if (!routingEnabled()) window.toggleRouting();
    setPoint('end', L.latLng(lat, lng), name);
  };

})();
