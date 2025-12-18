(() => {
  'use strict';

  // =========================
  // CONFIG
  // =========================
  const CENTER_BN = [21.178138, 106.071002];
  const WAQI_TOKEN = 'YOUR_WAQI_TOKEN'; // <-- thay token nếu dùng AQI

  // =========================
  // MAP INIT
  // =========================
  const map = L.map('map', { zoomControl: false }).setView(CENTER_BN, 15);
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // =========================
  // BASE LAYERS + OVERLAYS
  // =========================
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
    aqi: L.tileLayer(`https://tiles.waqi.info/tiles/usepa-aqi/{z}/{x}/{y}.png?token=${encodeURIComponent(WAQI_TOKEN)}`, {
      maxZoom: 19, opacity: 0.65, attribution: '© WAQI'
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

  // Leaflet layer control (giữ lại cho tiện)
  L.control.layers(
    { 'Mặc định (OSM)': baseLayers.osm, 'Địa hình': baseLayers.terrain, 'Vệ tinh': baseLayers.sat },
    { 'Đi xe đạp': overlays.bike, 'Giao thông công cộng': overlays.transit, 'Chất lượng không khí (AQI)': overlays.aqi, 'Cháy rừng': overlays.fires },
    { position: 'topright', collapsed: true }
  ).addTo(map);

  // Center circle
  L.circle(CENTER_BN, {
    color: '#3b82f6',
    fillColor: '#3b82f6',
    fillOpacity: 0.05,
    radius: 2500
  }).addTo(map);

  // =========================
  // DATA
  // =========================
  const locations = [
    { lat: 21.178138, lng: 106.071002, type: 'Đường xá', name: 'Ngã 6 Bắc Ninh' },

    { lat: 21.178179, lng: 106.075248, type: 'Trường', name: 'THPT Hàn Thuyên' },
    { lat: 21.171631, lng: 106.073339, type: 'Trường', name: 'Cao Đẳng Cơ điện và Xây dựng' },
    { lat: 21.174498, lng: 106.073899, type: 'Trường', name: 'Cao Đẳng Sư Phạm' },
    { lat: 21.178179, lng: 106.076801, type: 'Trường', name: 'Cao Đẳng Công Nghiệp Bắc Ninh' },

    { lat: 21.182301, lng: 106.072998, type: 'Hành chính', name: 'UBND Tỉnh Bắc Ninh' },
    { lat: 21.180200, lng: 106.071971, type: 'Hành chính', name: 'Bưu Điện Tỉnh Bắc Ninh' },
    { lat: 21.182098, lng: 106.075026, type: 'Hành chính', name: 'Sở Giáo Dục và Đào Tạo Tỉnh Bắc Ninh' },
    { lat: 21.181638, lng: 106.076064, type: 'Hành chính', name: 'Chi Cụ Thủy Lợi Tỉnh Bắc Ninh' },
    { lat: 21.180288, lng: 106.074857, type: 'Hành chính', name: 'Sở Khoa Học Công Nghệ' },
    { lat: 21.179630, lng: 106.074358, type: 'Hành chính', name: 'Trụ Sở Tiếp Công Dân Tỉnh ' },
    { lat: 21.183664, lng: 106.075407, type: 'Hành chính', name: 'Bảo Tàng' },
    { lat: 21.185682, lng: 106.073974, type: 'Hành chính', name: 'Báo Bắc Ninh' },
    { lat: 21.185317, lng: 106.077493, type: 'Hành chính', name: 'Tỉnh Ủy Bắc Ninh' },

    { lat: 21.178474, lng: 106.072003, type: 'Mua sắm', name: 'Mua sắm 1' },
    { lat: 21.177664, lng: 106.067371, type: 'Mua sắm', name: 'Mua sắm 2' },
    { lat: 21.175113, lng: 106.065617, type: 'Mua sắm', name: 'Mua sắm 3' },
    { lat: 21.173106, lng: 106.064726, type: 'Mua sắm', name: 'Mua sắm 4' },
    { lat: 21.172389, lng: 106.062811, type: 'Mua sắm', name: 'Mua sắm 5' },
    { lat: 21.180165, lng: 106.066019, type: 'Mua sắm', name: 'Mua sắm 6' },
    { lat: 21.181608, lng: 106.066819, type: 'Mua sắm', name: 'Mua sắm 7' },
    { lat: 21.183656, lng: 106.073452, type: 'Mua sắm', name: 'Mua sắm 8' },
    { lat: 21.169162, lng: 106.091959, type: 'Mua sắm', name: 'Mua sắm 9' },
    { lat: 21.167168, lng: 106.053402, type: 'Mua sắm', name: 'Mua sắm 10' },

    { lat: 21.182003, lng: 106.071190, type: 'Y tế', name: 'Y tế 1' },
    { lat: 21.187300, lng: 106.071716, type: 'Y tế', name: 'Y tế 2' },
    { lat: 21.187773, lng: 106.062873, type: 'Y tế', name: 'Y tế 3' },
    { lat: 21.184792, lng: 106.062436, type: 'Y tế', name: 'Y tế 4' },
    { lat: 21.181201, lng: 106.057216, type: 'Y tế', name: 'Y tế 5' },
    { lat: 21.176444, lng: 106.057141, type: 'Y tế', name: 'Y tế 6' },
    { lat: 21.173267, lng: 106.054652, type: 'Y tế', name: 'Y tế 7' },
    { lat: 21.167845, lng: 106.046069, type: 'Y tế', name: 'Y tế 8' },
    { lat: 21.167845, lng: 106.066813, type: 'Y tế', name: 'Y tế 9' },
    { lat: 21.169996, lng: 106.068363, type: 'Y tế', name: 'Y tế 10' },
    { lat: 21.173327, lng: 106.078392, type: 'Y tế', name: 'Y tế 11' },
    { lat: 21.189041, lng: 106.080790, type: 'Y tế', name: 'Y tế 12' },
    { lat: 21.189926, lng: 106.080487, type: 'Y tế', name: 'Y tế 13' },
    { lat: 21.169600, lng: 106.062300, type: 'Y tế', name: 'Y tế 14' },

    { lat: 21.177281, lng: 106.070598, type: 'Ăn uống', name: 'Ăn uống 1' },
    { lat: 21.178319, lng: 106.072135, type: 'Ăn uống', name: 'Ăn uống 2' },
    { lat: 21.179482, lng: 106.070040, type: 'Ăn uống', name: 'Ăn uống 3' },
    { lat: 21.182198, lng: 106.066840, type: 'Ăn uống', name: 'Ăn uống 4' },
    { lat: 21.181695, lng: 106.067116, type: 'Ăn uống', name: 'Ăn uống 5' },
    { lat: 21.185572, lng: 106.070528, type: 'Ăn uống', name: 'Ăn uống 6' },
    { lat: 21.174722, lng: 106.079527, type: 'Ăn uống', name: 'Ăn uống 7' },
    { lat: 21.176896, lng: 106.074581, type: 'Ăn uống', name: 'Ăn uống 8' },
    { lat: 21.166606, lng: 106.052220, type: 'Ăn uống', name: 'Ăn uống 9' },
    { lat: 21.189095, lng: 106.065000, type: 'Ăn uống', name: 'Ăn uống 10' },

    { lat: 21.161791, lng: 106.066775, type: 'Đường xá', name: 'Đường xá 1' },
    { lat: 21.164211, lng: 106.073076, type: 'Đường xá', name: 'Đường xá 2' },
    { lat: 21.167664, lng: 106.074847, type: 'Đường xá', name: 'Đường xá 3' },
    { lat: 21.166923, lng: 106.070210, type: 'Đường xá', name: 'Đường xá 4' },
    { lat: 21.168945, lng: 106.069367, type: 'Đường xá', name: 'Đường xá 5' },
    { lat: 21.168299, lng: 106.069676, type: 'Đường xá', name: 'Đường xá 6' },
    { lat: 21.177701, lng: 106.071835, type: 'Đường xá', name: 'Đường xá 7' },
    { lat: 21.177569, lng: 106.070292, type: 'Đường xá', name: 'Đường xá 8' },
    { lat: 21.182200, lng: 106.064491, type: 'Đường xá', name: 'Đường xá 9' },
    { lat: 21.189818, lng: 106.067259, type: 'Đường xá', name: 'Đường xá 10' },
    { lat: 21.160033, lng: 106.048470, type: 'Đường xá', name: 'Đường xá 11' },
    { lat: 21.184261, lng: 106.080890, type: 'Đường xá', name: 'Đường xá 12' },
    { lat: 21.182430, lng: 106.078901, type: 'Đường xá', name: 'Đường xá 13' },
    { lat: 21.183420, lng: 106.075250, type: 'Đường xá', name: 'Đường xá 14' }
  ];

  // =========================
  // HELPERS
  // =========================
  function getStyle(type) {
    switch (type) {
      case 'Y tế': return { color: '#ef4444', icon: 'fa-heart-pulse' };
      case 'Trường': return { color: '#8b5cf6', icon: 'fa-graduation-cap' };
      case 'Ăn uống': return { color: '#f59e0b', icon: 'fa-utensils' };
      case 'Mua sắm': return { color: '#ec4899', icon: 'fa-bag-shopping' };
      case 'Hành chính': return { color: '#3b82f6', icon: 'fa-building-columns' };
      case 'Đường xá': return { color: '#10b981', icon: 'fa-road' };
      default: return { color: '#6b7280', icon: 'fa-location-dot' };
    }
  }

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

  function applyInvertRule() {
    const mapEl = document.getElementById('map');
    if (!mapEl) return;
    const isDark = document.body.classList.contains('dark-mode');
    mapEl.classList.toggle('no-invert', isDark && currentBaseKey === 'sat');
  }

  // =========================
  // DOM
  // =========================
  const routingPanel = document.getElementById('routingPanel');
  const btnDirect = document.getElementById('btnDirect');
  const startInput = document.getElementById('startInput');
  const endInput = document.getElementById('endInput');
  const startBtn = document.getElementById('startBtn');
  const itineraryContainer = document.getElementById('itineraryContainer');
  const suggestionBox = document.getElementById('suggestionBox');
  const searchInput = document.getElementById('searchInput');
  const btnTheme = document.getElementById('btnTheme');

  // =========================
  // THEME (Dark/Light)
  // =========================
  const THEME_KEY = 'bn_theme';

  function setTheme(theme) {
    const isDark = theme !== 'light';
    document.body.classList.toggle('dark-mode', isDark);
    document.body.classList.toggle('light-mode', !isDark);

    if (btnTheme) {
      btnTheme.innerHTML = isDark
        ? '<i class="fa-solid fa-moon" aria-hidden="true"></i> <span>Dark</span>'
        : '<i class="fa-solid fa-sun" aria-hidden="true"></i> <span>Light</span>';
    }

    applyInvertRule();
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  }

  window.toggleTheme = () => {
    const isDarkNow = document.body.classList.contains('dark-mode');
    setTheme(isDarkNow ? 'light' : 'dark');
  };

  setTheme(localStorage.getItem(THEME_KEY) || 'dark');

  // =========================
  // MARKERS + FILTER
  // =========================
  const markersLayer = L.layerGroup().addTo(map);
  let allMarkers = [];

  function getCheckedTypes() {
    return Array.from(document.querySelectorAll('.filters input:checked')).map(i => i.value);
  }

  function createPoiMarker(loc) {
    const style = getStyle(loc.type);
    const safeName = JSON.stringify(loc.name);

    const icon = L.divIcon({
      className: 'custom-pin-wrapper',
      html: `<div class="custom-pin" style="background-color:${style.color};"><i class="fa-solid ${style.icon}"></i></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -20]
    });

    const marker = L.marker([loc.lat, loc.lng], { icon });

    const popupContent = `
      <div style="font-family:'Segoe UI'">
        <div class="popup-title" style="color:${style.color}">${escapeHtml(loc.name)}</div>
        <div class="popup-type">${escapeHtml(loc.type)}</div>
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
    marker.bindPopup(popupContent);
    return marker;
  }

  function renderMap() {
    markersLayer.clearLayers();
    allMarkers = [];

    const checked = getCheckedTypes();
    locations.forEach(loc => {
      if (!checked.includes(loc.type)) return;

      const marker = createPoiMarker(loc);
      markersLayer.addLayer(marker);
      allMarkers.push({ name: loc.name, type: loc.type, marker });
    });
  }

  document.querySelectorAll('.filters input').forEach(cb => cb.addEventListener('change', renderMap));
  renderMap();

  // =========================
  // ROUTING
  // =========================
  const PROFILE_MAP = { driving: 'driving', bike: 'driving', foot: 'driving' };

  let routingControl = null;
  let currentMode = 'driving';

  let startPoint = null;
  let endPoint = null;

  const tempMarkers = { start: null, end: null };
  let activeInput = 'start';

  function isRoutingEnabled() {
    return routingPanel && routingPanel.style.display === 'block';
  }

  function updateTempMarker(type, latlng) {
    if (tempMarkers[type]) {
      map.removeLayer(tempMarkers[type]);
      tempMarkers[type] = null;
    }
    if (!latlng) return;

    const bg = type === 'start' ? '#3b82f6' : '#ef4444';
    const iconHtml = type === 'start'
      ? '<i class="fa-solid fa-car" style="color:white"></i>'
      : '<i class="fa-solid fa-flag-checkered" style="color:white"></i>';

    const icon = L.divIcon({
      className: 'temp-marker-wrapper',
      html: `<div class="custom-pin" style="background-color:${bg};">${iconHtml}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -20]
    });

    tempMarkers[type] = L.marker(latlng, { icon }).addTo(map);
  }

  function setPoint(type, latlng, text) {
    if (type === 'start') {
      startPoint = latlng;
      if (startInput) startInput.value = text || '';
    } else {
      endPoint = latlng;
      if (endInput) endInput.value = text || '';
    }
    updateTempMarker(type, latlng);
  }

  window.focusInput = (type) => {
    activeInput = type === 'end' ? 'end' : 'start';
  };

  function onMapClickSelect(e) {
    const coordText = `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;
    let target;
    if (!startPoint) target = 'start';
    else if (!endPoint) target = 'end';
    else target = activeInput;
    setPoint(target, e.latlng, coordText);
  }

  function clearRouteOnly() {
    if (routingControl) {
      map.removeControl(routingControl);
      routingControl = null;
    }
    if (itineraryContainer) itineraryContainer.innerHTML = '';
  }

  window.clearPoint = (type) => {
    setPoint(type, null, '');
    clearRouteOnly();
  };

  function clearAllRouting({ removeClickHandler = true } = {}) {
    clearRouteOnly();
    setPoint('start', null, '');
    setPoint('end', null, '');
    if (removeClickHandler) map.off('click', onMapClickSelect);
  }

  window.toggleRouting = () => {
    if (!routingPanel || !btnDirect) return;

    // mobile: đóng layers panel nếu đang mở
    if (isMobile()) {
      const lp = document.getElementById('layersPanel');
      if (lp && lp.style.display === 'block') lp.style.display = 'none';
    }

    if (isRoutingEnabled()) {
      routingPanel.style.display = 'none';
      btnDirect.classList.remove('active');
      clearAllRouting({ removeClickHandler: true });
      return;
    }

    routingPanel.style.display = 'block';
    btnDirect.classList.add('active');
    clearAllRouting({ removeClickHandler: false });
    map.on('click', onMapClickSelect);
    alert('Chế độ chỉ đường BẬT. Hãy click bản đồ để chọn điểm.');
  };

  window.setMode = (mode) => {
    ['driving', 'bike', 'foot'].forEach(m => {
      const el = document.getElementById(`mode-${m}`);
      if (el) el.classList.toggle('active', m === mode);
    });
    currentMode = mode;
    if (startPoint && endPoint) window.calculateRoute();
  };

  window.calculateRoute = () => {
    if (!startPoint || !endPoint) {
      alert('Vui lòng chọn đủ 2 điểm!');
      return;
    }

    if (startBtn) startBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tính...';
    if (routingControl) map.removeControl(routingControl);

    const profile = PROFILE_MAP[currentMode] || 'driving';

    routingControl = L.Routing.control({
      waypoints: [startPoint, endPoint],
      router: L.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1',
        profile,
        language: 'vi'
      }),
      plan: L.Routing.plan([startPoint, endPoint], {
        addWaypoints: false,
        draggableWaypoints: false,
        createMarker: () => null
      }),
      lineOptions: { styles: [{ color: '#3b82f6', opacity: 1, weight: 6 }] },
      show: false,
      addWaypoints: false,
      routeWhileDragging: false
    }).addTo(map);

    routingControl.on('routesfound', () => {
      if (startBtn) startBtn.innerHTML = 'Bắt đầu';
      const hidden = routingControl.getContainer?.() || document.querySelector('.leaflet-routing-container');
      if (hidden && itineraryContainer) itineraryContainer.innerHTML = hidden.innerHTML;
      map.fitBounds(L.latLngBounds([startPoint, endPoint]), { padding: [50, 50] });
    });

    routingControl.on('routingerror', () => {
      if (startBtn) startBtn.innerHTML = 'Bắt đầu';
      alert('Không tìm thấy đường đi.');
    });
  };

  window.startRouteFrom = (lat, lng, name) => {
    map.closePopup();
    if (!isRoutingEnabled()) window.toggleRouting();
    setPoint('start', L.latLng(lat, lng), name);
  };

  window.startRouteTo = (lat, lng, name) => {
    map.closePopup();
    if (!isRoutingEnabled()) window.toggleRouting();
    setPoint('end', L.latLng(lat, lng), name);
  };

 // =========================
// SEARCH (click + keyboard)
// =========================
let currentSuggestions = [];
let activeSuggestIndex = -1;

function hideSuggestions() {
  if (suggestionBox) suggestionBox.style.display = 'none';
  currentSuggestions = [];
  activeSuggestIndex = -1;
}

function renderSuggestions() {
  if (!suggestionBox) return;

  if (currentSuggestions.length === 0) {
    hideSuggestions();
    return;
  }

  suggestionBox.innerHTML = currentSuggestions.map((l, idx) => {
    const style = getStyle(l.type);
    const safeName = JSON.stringify(l.name);
    const activeCls = idx === activeSuggestIndex ? 'active' : '';
    return `
      <div class="suggestion-item ${activeCls}" data-idx="${idx}" onclick="selectSuggestion(${safeName})" role="option">
        <i class="fa-solid ${style.icon}" style="color:${style.color};margin-right:8px"></i>
        ${escapeHtml(l.name)}
      </div>
    `;
  }).join('');

  suggestionBox.style.display = 'block';

  // auto scroll item active vào view (khi dùng phím)
  if (activeSuggestIndex >= 0) {
    const el = suggestionBox.querySelector(`.suggestion-item[data-idx="${activeSuggestIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }
}

window.showSuggestions = (val) => {
  const inputVal = String(val).toLowerCase().trim();
  if (!suggestionBox) return;

  if (inputVal.length < 1) {
    hideSuggestions();
    return;
  }

  currentSuggestions = locations
    .filter(l => l.name.toLowerCase().includes(inputVal))
    .slice(0, 12);

  activeSuggestIndex = currentSuggestions.length ? 0 : -1;
  renderSuggestions();
};

window.selectSuggestion = (name) => {
  if (searchInput) searchInput.value = name;
  hideSuggestions();

  const found = locations.find(l => l.name === name);
  if (!found) return;

  // bay tới điểm
  map.setView([found.lat, found.lng], 16);

  // mở popup nếu marker đang render
  const markerEntry = allMarkers.find(m => m.name === found.name);
  if (markerEntry) {
    markerEntry.marker.openPopup();
    return;
  }

  // nếu marker đang bị tắt do filter -> bật filter loại đó và render lại
  const cb = document.querySelector(`.filters input[value="${CSS.escape(found.type)}"]`);
  if (cb) {
    cb.checked = true;
    renderMap();
    setTimeout(() => {
      const m2 = allMarkers.find(m => m.name === found.name);
      if (m2) m2.marker.openPopup();
    }, 100);
  }
};

// Bắt phím ↑ ↓ Enter Esc ngay trên input (không cần sửa HTML)
function onSearchKeyDown(e) {
  if (!suggestionBox || suggestionBox.style.display !== 'block') {
    // nếu chưa mở suggestions, Enter vẫn cho tìm như cũ
    if (e.key === 'Enter') {
      const val = String(searchInput?.value || '');
      const found = locations.find(l => l.name.toLowerCase().includes(val.toLowerCase()));
      if (found) window.selectSuggestion(found.name);
    }
    return;
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeSuggestIndex = Math.min(activeSuggestIndex + 1, currentSuggestions.length - 1);
    renderSuggestions();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeSuggestIndex = Math.max(activeSuggestIndex - 1, 0);
    renderSuggestions();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const item = currentSuggestions[activeSuggestIndex];
    if (item) window.selectSuggestion(item.name);
  } else if (e.key === 'Escape') {
    hideSuggestions();
  }
}

if (searchInput) {
  searchInput.addEventListener('keydown', onSearchKeyDown);
  searchInput.addEventListener('blur', () => setTimeout(hideSuggestions, 120));
}

document.addEventListener('click', (e) => {
  const box = document.querySelector('.search-box');
  if (box && !box.contains(e.target)) hideSuggestions();
});


  // =========================
  // GEOLOCATION
  // =========================
  let userMarker = null;

  map.on('locationfound', (e) => {
    if (userMarker) map.removeLayer(userMarker);
    userMarker = L.marker(e.latlng).addTo(map).bindPopup('Bạn ở đây').openPopup();
  });

  map.on('locationerror', () => {
    alert('Không thể lấy vị trí (hãy cho phép quyền truy cập vị trí).');
  });

  window.locateUser = () => {
    map.locate({ setView: true, maxZoom: 16 });
  };

  // =========================
  // LEGEND
  // =========================
  window.toggleLegend = () => {
    const box = document.getElementById('legendBox');
    const btn = document.getElementById('openLegendBtn');
    if (!box || !btn) return;

    const isHidden = box.style.display === 'none';
    box.style.display = isHidden ? 'block' : 'none';
    btn.style.display = isHidden ? 'none' : 'flex';
  };

  // =========================
  // LAYERS PANEL
  // =========================
  window.toggleMapLayers = (force) => {
    const panel = document.getElementById('layersPanel');
    if (!panel) return;

    // mobile: đóng routing panel nếu đang mở
    if (isMobile() && routingPanel && routingPanel.style.display === 'block') {
      routingPanel.style.display = 'none';
      btnDirect?.classList.remove('active');
    }

    const next = (typeof force === 'boolean') ? force : (panel.style.display !== 'block');
    panel.style.display = next ? 'block' : 'none';
  };

  window.setBaseLayer = (key) => {
    if (!baseLayers[key]) return;
    map.removeLayer(baseLayers[currentBaseKey]);
    currentBaseKey = key;
    map.addLayer(baseLayers[currentBaseKey]);

    document.querySelectorAll('.layer-tile').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.base === key);
    });

    applyInvertRule();
  };

  window.toggleOverlayLayer = (key, enabled) => {
    const layer = overlays[key];
    if (!layer) return;
    if (enabled) map.addLayer(layer);
    else map.removeLayer(layer);
  };

  // Initial state legend
  const legendBox = document.getElementById('legendBox');
  const openLegendBtn = document.getElementById('openLegendBtn');
  if (legendBox) legendBox.style.display = 'block';
  if (openLegendBtn) openLegendBtn.style.display = 'none';
})();
