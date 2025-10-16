import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { getLocationsByShop, type Location } from "../models/Location.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
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
