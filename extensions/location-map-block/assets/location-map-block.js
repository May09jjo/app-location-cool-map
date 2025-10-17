(function () {
  async function fetchLocationsForShop(shop) {
    try {
      const url = '/app/locations.json?shop=' + encodeURIComponent(shop);
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) throw new Error('Failed to fetch locations');
      const json = await res.json();
      return json.locations || [];
    } catch (err) {
      console.error('Error fetching locations', err);
      return [];
    }
  }

  function createListItem(loc, index) {
    const li = document.createElement('div');
    li.className = 'location-item';
    li.setAttribute('data-index', String(index));
    li.innerHTML = `
      <div class="location-item-title">${escapeHtml(loc.name)}</div>
      <div class="location-item-address">${escapeHtml(loc.address)}</div>
      <div class="location-item-meta">${escapeHtml(loc.city)}, ${escapeHtml(loc.country)}</div>
    `;
    return li;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function renderBlock(blockElement) {
    const blockId = blockElement.querySelector('[id^="locations-list-"]')?.id?.replace('locations-list-', '') || blockElement.id;
    const listContainer = document.getElementById('locations-list-' + blockId);
    const mapContainer = document.getElementById('map-' + blockId);
    const filterInput = document.getElementById('location-filter-' + blockId);
    if (!listContainer || !mapContainer) return;

    listContainer.innerHTML = '<p>Loading locations…</p>';

    // Read shop from block data attribute
    const shop = blockElement.getAttribute('data-shop') || '';
    const locations = await fetchLocationsForShop(shop);

    // Initialize map (assumes leaflet.js and leaflet.css are loaded from local assets)
    let L = window.L;
    let map;
    let markers = [];
    if (L && mapContainer) {
      map = L.map(mapContainer, { scrollWheelZoom: false }).setView([0, 0], 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
    } else if (!L) {
      console.warn('Leaflet (window.L) not found. Ensure leaflet.js is included in extension assets and loaded.');
    }

    // Render list
    listContainer.innerHTML = '';
    const listRoot = document.createElement('div');
    listRoot.className = 'locations-list-root';

    locations.forEach((loc, i) => {
      const item = createListItem(loc, i);
      listRoot.appendChild(item);

      if (map && loc.latitude != null && loc.longitude != null) {
        const marker = L.marker([loc.latitude, loc.longitude]).addTo(map);
        marker.bindPopup(`<strong>${escapeHtml(loc.name)}</strong><br>${escapeHtml(loc.address)}`);
        marker.on('click', () => {
          // highlight corresponding list item
          document.querySelectorAll(`#locations-list-${blockId} .location-item`).forEach(el => el.classList.remove('active'));
          item.classList.add('active');
        });
        markers.push({ marker, index: i });
      }
    });

    listContainer.appendChild(listRoot);

    // Fit map to markers
    if (map && markers.length > 0) {
      const group = L.featureGroup(markers.map(m => m.marker));
      map.fitBounds(group.getBounds().pad(0.2));
    }

    // Filter handling
    if (filterInput) {
      filterInput.addEventListener('input', (ev) => {
        const q = (ev.target.value || '').toLowerCase().trim();
        const items = listRoot.querySelectorAll('.location-item');
        items.forEach((el) => {
          const name = el.querySelector('.location-item-title')?.textContent?.toLowerCase() || '';
          const addr = el.querySelector('.location-item-address')?.textContent?.toLowerCase() || '';
          const meta = el.querySelector('.location-item-meta')?.textContent?.toLowerCase() || '';
          const visible = !q || name.includes(q) || addr.includes(q) || meta.includes(q);
          el.style.display = visible ? '' : 'none';
        });

        // Optionally update marker visibility
        if (map && markers.length > 0) {
          markers.forEach(m => {
            const itemEl = listRoot.querySelector(`.location-item[data-index='${m.index}']`);
            if (itemEl) {
              if (itemEl.style.display === 'none') {
                map.removeLayer(m.marker);
              } else {
                m.marker.addTo(map);
              }
            }
          });
        }
      });
    }
  }

  function init() {
    const blocks = document.querySelectorAll('.location-map-block');
    blocks.forEach((block) => renderBlock(block));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
