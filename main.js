(() => {
  'use strict';

  // Map init
  const CENTER_BN = [21.178138, 106.071002];
  const map = L.map('map', { zoomControl: false }).setView(CENTER_BN, 15);

  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(map);

  L.circle(CENTER_BN, {
    color: '#3b82f6',
    fillColor: '#3b82f6',
    fillOpacity: 0.05,
    radius: 2500
  }).addTo(map);

  // Data
  const locations = [
    { lat: 21.178138, lng: 106.071002, type: 'Đường xá', name: 'Ngã 6 Bắc Ninh' },
    { lat: 21.182410, lng: 106.072610, type: 'Trường', name: 'THPT Hàn Thuyên' },
    { lat: 21.187350, lng: 106.074890, type: 'Hành chính', name: 'UBND Tỉnh Bắc Ninh' },
    { lat: 21.178450, lng: 106.071420, type: 'Mua sắm', name: 'Vincom Plaza Bắc Ninh' },
    { lat: 21.169600, lng: 106.062300, type: 'Y tế', name: 'Bệnh viện Đa khoa Tỉnh' },
    { lat: 21.174200, lng: 106.058900, type: 'Ăn uống', name: 'Nhà hàng Trâu Ngon Quán' },
    { lat: 21.183420, lng: 106.075250, type: 'Đường xá', name: 'Ngã 4 Cổng Ô' },
    { lat: 21.184350, lng: 106.076900, type: 'Mua sắm', name: 'MediaMart Bắc Ninh' },
    { lat: 21.178580, lng: 106.071250, type: 'Ăn uống', name: 'Highlands Coffee Ngã 6' },
    { lat: 21.185500, lng: 106.055000, type: 'Y tế', name: 'PK Tai Mũi Họng' },
    { lat: 21.171631, lng: 106.073339, type: 'Trường', name: 'CĐ Cơ điện & Xây dựng' },
    { lat: 21.174498, lng: 106.073899, type: 'Trường', name: 'CĐ Sư Phạm Bắc Ninh' },
    { lat: 21.192500, lng: 106.064500, type: 'Y tế', name: 'Bệnh viện Sản Nhi' }
  ];

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

  // DOM refs
  const routingPanel = document.getElementById('routingPanel');
  const btnDirect = document.getElementById('btnDirect');
  const startInput = document.getElementById('startInput');
  const endInput = document.getElementById('endInput');
  const startBtn = document.getElementById('startBtn');
  const itineraryContainer = document.getElementById('itineraryContainer');
  const suggestionBox = document.getElementById('suggestionBox');
  const searchInput = document.getElementById('searchInput');

  // Render markers
  const markersLayer = L.layerGroup().addTo(map);
  let allMarkers = [];

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

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

  // --- ROUTING ---
  // router.project-osrm.org demo server typically only supports the "driving" profile dataset.
  // We keep the UI modes, but fall back to "driving" to avoid routing errors.
  const PROFILE_MAP = { driving: 'driving', bike: 'driving', foot: 'driving' };

  let routingControl = null;
  let currentMode = 'driving';

  let startPoint = null;
  let endPoint = null;

  const tempMarkers = { start: null, end: null };
  let activeInput = 'start';

  function isRoutingEnabled() {
    return routingPanel.style.display === 'block';
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
      startInput.value = text || '';
    } else {
      endPoint = latlng;
      endInput.value = text || '';
    }
    updateTempMarker(type, latlng);
  }

  window.focusInput = (type) => {
    activeInput = type === 'end' ? 'end' : 'start';
  };

  function onMapClickSelect(e) {
    const coordText = `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;

    // Fill missing first, then overwrite the active input
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
    itineraryContainer.innerHTML = '';
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

    // Optional gentle hint to avoid confusion
    if (mode !== 'driving') {
      console.info('Demo OSRM server thường chỉ hỗ trợ "driving"; chế độ khác sẽ dùng driving fallback.');
    }

    if (startPoint && endPoint) window.calculateRoute();
  };

  window.calculateRoute = () => {
    if (!startPoint || !endPoint) {
      alert('Vui lòng chọn đủ 2 điểm!');
      return;
    }

    startBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tính...';

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
      startBtn.innerHTML = 'Bắt đầu';

      // Copy the hidden itinerary into our own container
      const hidden = routingControl.getContainer?.() || document.querySelector('.leaflet-routing-container');
      if (hidden) itineraryContainer.innerHTML = hidden.innerHTML;

      map.fitBounds(L.latLngBounds([startPoint, endPoint]), { padding: [50, 50] });
    });

    routingControl.on('routingerror', () => {
      startBtn.innerHTML = 'Bắt đầu';
      alert('Không tìm thấy đường đi.');
    });
  };

  // Global actions from Popup
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

  // --- SEARCH ---
  window.showSuggestions = (val) => {
    const inputVal = String(val).toLowerCase().trim();
    if (inputVal.length < 1) {
      suggestionBox.style.display = 'none';
      return;
    }

    const matches = locations
      .filter(l => l.name.toLowerCase().includes(inputVal))
      .slice(0, 8);

    if (matches.length === 0) {
      suggestionBox.style.display = 'none';
      return;
    }

    suggestionBox.innerHTML = matches.map(l => {
      const style = getStyle(l.type);
      const safeName = JSON.stringify(l.name);
      return `
        <div class="suggestion-item" onclick="selectSuggestion(${safeName})" role="option">
          <i class="fa-solid ${style.icon}" style="color:${style.color};margin-right:8px"></i>
          ${escapeHtml(l.name)}
        </div>
      `;
    }).join('');

    suggestionBox.style.display = 'block';
  };

  window.selectSuggestion = (name) => {
    searchInput.value = name;
    suggestionBox.style.display = 'none';

    const found = locations.find(l => l.name === name);
    if (!found) return;

    map.setView([found.lat, found.lng], 16);

    const markerEntry = allMarkers.find(m => m.name === found.name);
    if (markerEntry) {
      markerEntry.marker.openPopup();
      return;
    }

    // If marker isn't rendered due to filters, enable its type and re-render
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

  window.handleSearch = (e) => {
    if (e.key !== 'Enter') return;
    const val = String(e.target.value || '');
    const found = locations.find(l => l.name.toLowerCase().includes(val.toLowerCase()));
    if (found) window.selectSuggestion(found.name);
  };

  document.addEventListener('click', (e) => {
    const box = document.querySelector('.search-box');
    if (box && !box.contains(e.target)) suggestionBox.style.display = 'none';
  });

  // --- GEOLOCATION ---
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

  // --- LEGEND ---
  window.toggleLegend = () => {
    const box = document.getElementById('legendBox');
    const btn = document.getElementById('openLegendBtn');
    if (!box || !btn) return;

    const isHidden = box.style.display === 'none';
    box.style.display = isHidden ? 'block' : 'none';
    btn.style.display = isHidden ? 'none' : 'flex';
  };

  // Initial state
  const legendBox = document.getElementById('legendBox');
  const openLegendBtn = document.getElementById('openLegendBtn');
  if (legendBox) legendBox.style.display = 'block';
  if (openLegendBtn) openLegendBtn.style.display = 'none';
})();
