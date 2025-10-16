# Location Map Block

This is a Theme App Extension (App Block) that renders store locations in your theme.

What it does
- Adds a block that displays a list of store locations fetched from the app's `/app/locations.json` endpoint.

Files
- `blocks/location_map.liquid` — Liquid block used in themes.
- `assets/location-map-block.js` — Client-side JS that fetches the JSON endpoint and injects the content.
- `assets/location-map-block.css` — Basic styles for the block.

How to use
1. Deploy the app and install the Theme App Extension with Shopify CLI.
2. In the Shopify Theme Editor, add the "Location Map" block to a section.

Security note
- The endpoint `/app/locations.json` is currently public and uses a hardcoded shop value. You should replace it with a secure implementation that validates the shop from the request or uses an app proxy if you need to expose shop-specific data to the storefront.

Development
- To test locally, ensure your dev app URL and theme app extension are correctly configured with the Shopify CLI. The block's JS fetches `/app/locations.json` relative to the store origin.
