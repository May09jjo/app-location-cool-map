/**
 * Geocodes an address string into latitude and longitude coordinates using Nominatim.
 * @param address The full address to search for.
 * @returns An object with latitude and longitude, or null if not found.
 */
export async function geocodeAddress(
  address: string
): Promise<{ latitude: number; longitude: number } | null> {
  const API_ENDPOINT = "https://nominatim.openstreetmap.org/search";
  const url = `${API_ENDPOINT}?q=${encodeURIComponent(
    address
  )}&format=json&limit=1`;

  try {
    const response = await fetch(url, {
      headers: {
        // Nominatim's public API requires a specific User-Agent
        "User-Agent": "Shopify Store Locator App/1.0 (dev.test@example.com)",
      },
    });

    if (!response.ok) {
      console.error("Nominatim API request failed:", response.statusText);
      return null;
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const { lat, lon } = data[0];
      return {
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
      };
    }
    return null;
  } catch (error) {
    console.error("Error during geocoding:", error);
    return null;
  }
}