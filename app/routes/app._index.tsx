import { useEffect, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import {
  getLocationsByShop,
  createLocation,
  deleteLocation,
  type Location,
} from "../models/Location.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const locations = await getLocationsByShop(session.shop);
  return { locations };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const method = request.method;

  if (method === "POST") {
    const result = await createLocation({
      shop: session.shop,
      name: formData.get("name") as string,
      address: formData.get("address") as string,
      city: formData.get("city") as string,
      country: formData.get("country") as string,
      zipCode: formData.get("zipCode") as string,
      phone: formData.get("phone") as string,
    });

    return result;
  }

  if (method === "DELETE") {
    const id = Number(formData.get("id"));
    const result = await deleteLocation(id);
    return result;
  }

  return { success: false, error: "Method not allowed" };
};

export default function Index() {
  const { locations: initialLocations } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    country: "",
    zipCode: "",
    phone: "",
  });

  // Merge fetcher data with initial locations
  const locations = fetcher.data && 'location' in fetcher.data && fetcher.data.success
    ? [...initialLocations, fetcher.data.location]
    : initialLocations;

  const isLoading = ["loading", "submitting"].includes(fetcher.state);

  useEffect(() => {
    if (fetcher.data && 'success' in fetcher.data) {
      if (fetcher.data.success) {
        if ('location' in fetcher.data) {
          shopify.toast.show("Location saved successfully");
          setShowModal(false);
          resetForm();
        } else if ('id' in fetcher.data) {
          shopify.toast.show("Location deleted successfully");
        }
      } else if ('error' in fetcher.data) {
        shopify.toast.show(fetcher.data.error || "An error occurred", { isError: true });
      }
    }
  }, [fetcher.data, shopify]);

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      city: "",
      country: "",
      zipCode: "",
      phone: "",
    });
    setEditingLocation(null);
  };

  const handleOpenModal = (location?: Location) => {
    console.log("handleOpenModal called", { location, showModal });
    if (location) {
      setEditingLocation(location);
      setFormData({
        name: location.name,
        address: location.address,
        city: location.city,
        country: location.country,
        zipCode: location.zipCode || "",
        phone: location.phone || "",
      });
    } else {
      resetForm();
    }
    setShowModal(true);
    console.log("Modal should now be visible");
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = () => {
    const formDataToSubmit = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value) formDataToSubmit.append(key, value);
    });
    
    fetcher.submit(formDataToSubmit, { method: "POST" });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this location?")) {
      const formDataToSubmit = new FormData();
      formDataToSubmit.append("id", id.toString());
      fetcher.submit(formDataToSubmit, { method: "DELETE" });
    }
  };

  console.log("Rendering Index component", { showModal, locationsCount: locations.length });

  return (
    <s-page heading="Location Manager">
      <s-button
        slot="primary-action"
        variant="primary"
        onClick={() => {
          console.log("Primary action button clicked");
          handleOpenModal();
        }}
      >
        Add Location
      </s-button>

      <s-section heading="Manage Your Store Locations">
        <s-paragraph>
          Add, edit, and manage your store locations. Each location includes address details
          and geographic coordinates automatically generated through geocoding.
        </s-paragraph>

        {locations && locations.length > 0 ? (
          <s-box borderWidth="base" borderRadius="base">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e1e3e5" }}>
                  <th style={{ padding: "12px", textAlign: "left" }}>Name</th>
                  <th style={{ padding: "12px", textAlign: "left" }}>Address</th>
                  <th style={{ padding: "12px", textAlign: "left" }}>City</th>
                  <th style={{ padding: "12px", textAlign: "left" }}>Country</th>
                  <th style={{ padding: "12px", textAlign: "left" }}>Phone</th>
                  <th style={{ padding: "12px", textAlign: "left" }}>Coordinates</th>
                  <th style={{ padding: "12px", textAlign: "left" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((location) => {
                  if (!location) return null;
                  return (
                    <tr key={location.id} style={{ borderBottom: "1px solid #e1e3e5" }}>
                      <td style={{ padding: "12px" }}>
                        <strong>{location.name}</strong>
                      </td>
                      <td style={{ padding: "12px" }}>{location.address}</td>
                      <td style={{ padding: "12px" }}>{location.city}</td>
                      <td style={{ padding: "12px" }}>{location.country}</td>
                      <td style={{ padding: "12px" }}>{location.phone || "-"}</td>
                      <td style={{ padding: "12px", color: "#6d7175" }}>
                        {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <s-button
                          variant="tertiary"
                          onClick={() => handleDelete(location.id)}
                        >
                          Delete
                        </s-button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </s-box>
        ) : (
          <s-box padding="large">
            <s-stack direction="block" gap="base">
              <s-heading>No locations yet</s-heading>
              <s-paragraph>
                Add your first location to get started with location management.
              </s-paragraph>
              <s-button
                variant="primary"
                onClick={() => {
                  console.log("Empty state button clicked");
                  handleOpenModal();
                }}
              >
                Add Location
              </s-button>
            </s-stack>
          </s-box>
        )}
      </s-section>

      {showModal && (
        <>
          {console.log("Rendering modal", { showModal })}
          <s-modal
            heading={editingLocation ? "Edit Location" : "Add New Location"}
          >
          <s-stack direction="block" gap="base">
            <s-text-field
              label="Location Name"
              value={formData.name}
              onInput={(e: Event) =>
                setFormData({ ...formData, name: (e.target as HTMLInputElement).value })
              }
              required
            />
            
            <s-text-field
              label="Address"
              value={formData.address}
              onInput={(e: Event) =>
                setFormData({ ...formData, address: (e.target as HTMLInputElement).value })
              }
              required
            />
            
            <s-stack direction="inline" gap="base">
              <s-text-field
                label="City"
                value={formData.city}
                onInput={(e: Event) =>
                  setFormData({ ...formData, city: (e.target as HTMLInputElement).value })
                }
                required
              />
              
              <s-text-field
                label="Country"
                value={formData.country}
                onInput={(e: Event) =>
                  setFormData({ ...formData, country: (e.target as HTMLInputElement).value })
                }
                required
              />
            </s-stack>
            
            <s-stack direction="inline" gap="base">
              <s-text-field
                label="Zip Code"
                value={formData.zipCode}
                onInput={(e: Event) =>
                  setFormData({ ...formData, zipCode: (e.target as HTMLInputElement).value })
                }
              />
              
              <s-text-field
                label="Phone"
                value={formData.phone}
                onInput={(e: Event) =>
                  setFormData({ ...formData, phone: (e.target as HTMLInputElement).value })
                }
              />
            </s-stack>
          </s-stack>

          <s-stack slot="footer" direction="inline" gap="base">
            <s-button onClick={handleCloseModal}>Cancel</s-button>
            <s-button
              variant="primary"
              onClick={handleSubmit}
              {...(isLoading ? { loading: true } : {})}
            >
              {editingLocation ? "Update Location" : "Add Location"}
            </s-button>
          </s-stack>
          </s-modal>
        </>
      )}

      <s-section slot="aside" heading="About Location Manager">
        <s-paragraph>
          This dashboard allows you to manage all your store locations in one place.
          Locations are automatically geocoded using OpenStreetMap to provide accurate coordinates for mapping.
        </s-paragraph>
        
        <s-stack direction="block" gap="base">
          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
            background="subdued"
          >
            <s-stack direction="block" gap="base">
              <strong>Features:</strong>
              <s-unordered-list>
                <s-list-item>Add new locations with address details</s-list-item>
                <s-list-item>Automatic geocoding for coordinates</s-list-item>
                <s-list-item>View all locations in a data table</s-list-item>
                <s-list-item>Delete locations as needed</s-list-item>
              </s-unordered-list>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Technical Details">
        <s-paragraph>
          <s-text>Database: </s-text>
          <s-link href="https://www.prisma.io/" target="_blank">
            Prisma with SQLite
          </s-link>
        </s-paragraph>
        <s-paragraph>
          <s-text>Geocoding: </s-text>
          <s-text>OpenStreetMap Nominatim API</s-text>
        </s-paragraph>
        <s-paragraph>
          <s-text>Components: </s-text>
          <s-link
            href="https://shopify.dev/docs/api/app-home/using-polaris-components"
            target="_blank"
          >
            Polaris Web Components
          </s-link>
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
