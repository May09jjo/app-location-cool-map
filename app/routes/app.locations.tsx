import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { getLocationsByShop, type Location } from "../models/Location.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const isJson = url.pathname.endsWith(".json") || request.headers.get("accept")?.includes("application/json");

  // If the request asks for JSON, allow fetching by shop query param (used by the storefront block)
  if (isJson) {
    const shop = url.searchParams.get("shop");
    if (!shop) {
      return new Response(JSON.stringify({ error: "shop param required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const locations = await getLocationsByShop(shop);
    return new Response(JSON.stringify({ locations }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Default admin-protected page rendering
  const { session } = await authenticate.admin(request);
  const locations = await getLocationsByShop(session.shop);
  return { locations };
};


export default function AppLocations() {
  const { locations } = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>Store Locations</h1>
      <ul>
        {locations.map((location: Location) => (
          <li key={location.id}>
            <strong>{location.name}</strong>
            <p>{location.address}</p>
            <p>
              {location.city}, {location.country}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
