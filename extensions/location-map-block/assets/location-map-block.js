(function () {
  async function fetchLocations() {
    try {
      // Fetch the JSON endpoint exposed by the app route
      const res = await fetch('/app/locations.json');
      if (!res.ok) throw new Error('Failed to fetch locations');
      const data = await res.json();
      return data.locations || [];
    } catch (err) {
      console.error('Error fetching locations', err);
      return [];
    }
  }

  async function renderBlock(blockElement) {
    const blockId = blockElement.getAttribute('data-block-id') || blockElement.getAttribute('data-block-id') || blockElement.id;
    const container = document.getElementById('locations-list-' + (blockId || blockElement.id));
    if (!container) return;
    container.innerHTML = '<p>Loading locations…</p>';
    const locations = await fetchLocations();
    if (locations.length === 0) {
      container.innerHTML = '<p>No locations found.</p>';
      return;
    }

    const ul = document.createElement('ul');
    locations.forEach((loc) => {
      const li = document.createElement('li');
      const name = loc.name || '';
      const address = loc.address || '';
      const city = loc.city || '';
      const country = loc.country || '';
      li.innerHTML = `<strong>${name}</strong><br>${address}<br>${city}, ${country}`;
      ul.appendChild(li);
    });
    container.innerHTML = '';
    container.appendChild(ul);
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
