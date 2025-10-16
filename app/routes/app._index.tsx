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
    const useManualCoordinates = formData.get("useManualCoordinates") === "true";
    const latitude = formData.get("latitude");
    const longitude = formData.get("longitude");

    const result = await createLocation({
      shop: session.shop,
      name: formData.get("name") as string,
      address: formData.get("address") as string,
      city: formData.get("city") as string,
      country: formData.get("country") as string,
      zipCode: formData.get("zipCode") as string,
      phone: formData.get("phone") as string,
      useManualCoordinates,
      latitude: latitude ? parseFloat(latitude as string) : undefined,
      longitude: longitude ? parseFloat(longitude as string) : undefined,
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
  
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [useManualCoordinates, setUseManualCoordinates] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    country: "",
    zipCode: "",
    phone: "",
    latitude: "",
    longitude: "",
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
          // Close modal programmatically
          const modal = document.getElementById('location-modal') as HTMLElement & { hide?: () => void };
          if (modal && typeof modal.hide === 'function') {
            modal.hide();
          } else {
            // Fallback: try removing open attribute
            const modalElement = document.getElementById('location-modal');
            if (modalElement) {
              modalElement.removeAttribute('open');
            }
          }
          resetForm();
          // Reload the page to show the new location
          window.location.reload();
        } else if ('id' in fetcher.data) {
          shopify.toast.show("Location deleted successfully");
          // Reload to update the list
          window.location.reload();
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
      latitude: "",
      longitude: "",
    });
    setEditingLocation(null);
    setUseManualCoordinates(false);
  };

  const handleOpenModal = (location?: Location) => {
    console.log("handleOpenModal called", { location });
    if (location) {
      setEditingLocation(location);
      setFormData({
        name: location.name,
        address: location.address,
        city: location.city,
        country: location.country,
        zipCode: location.zipCode || "",
        phone: location.phone || "",
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
      });
    } else {
      resetForm();
    }
  };

  const handleSubmit = (e?: Event) => {
    // Prevent default if called from button click
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Prevent double submission
    if (isLoading) {
      console.log("Already submitting, ignoring duplicate request");
      return;
    }

    console.log("Submitting form with data:", formData);
    
    const formDataToSubmit = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value) formDataToSubmit.append(key, value);
    });
    
    // Add flag to indicate manual coordinates
    if (useManualCoordinates) {
      formDataToSubmit.append("useManualCoordinates", "true");
    }
    
    fetcher.submit(formDataToSubmit, { method: "POST" });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this location?")) {
      const formDataToSubmit = new FormData();
      formDataToSubmit.append("id", id.toString());
      fetcher.submit(formDataToSubmit, { method: "DELETE" });
    }
  };

  console.log("Rendering Index component", { locationsCount: locations.length });

  return (
    <s-page heading="Location Manager">
      <s-button
        slot="primary-action"
        variant="primary"
        commandFor="location-modal"
        command="--show"
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
            <style>{`
              .locations-table {
                width: 100%;
                border-collapse: collapse;
              }
              .locations-table thead tr {
                border-bottom: 1px solid #e1e3e5;
              }
              .locations-table th {
                padding: 12px;
                text-align: left;
              }
              .locations-table tbody tr {
                border-bottom: 1px solid #e1e3e5;
              }
              .locations-table td {
                padding: 12px;
              }
              .locations-table .coordinates {
                color: #6d7175;
              }
            `}</style>
            <table className="locations-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Address</th>
                  <th>City</th>
                  <th>Country</th>
                  <th>Phone</th>
                  <th>Coordinates</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((location) => {
                  if (!location) return null;
                  return (
                    <tr key={location.id}>
                      <td>
                        <strong>{location.name}</strong>
                      </td>
                      <td>{location.address}</td>
                      <td>{location.city}</td>
                      <td>{location.country}</td>
                      <td>{location.phone || "-"}</td>
                      <td className="coordinates">
                        {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                      </td>
                      <td>
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
                commandFor="location-modal"
                command="--show"
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

      <s-modal
        id="location-modal"
        heading={editingLocation ? "Edit Location" : "Add New Location"}
        size="large"
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
          
          <s-checkbox
            label="Enter coordinates manually"
            details="useful for Latin America where geocoding may not work well"
            checked={useManualCoordinates}
            onChange={(e: Event) => {
              const checked = (e.target as HTMLInputElement).checked;
              setUseManualCoordinates(checked);
              console.log("Manual coordinates:", checked);
            }}
          >
            
          </s-checkbox>

          {!useManualCoordinates ? (
            <>
              <s-text-field
                label="Address"
                value={formData.address}
                onInput={(e: Event) =>
                  setFormData({ ...formData, address: (e.target as HTMLInputElement).value })
                }
                required
                placeholder="Full street address for automatic geocoding"
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
            </>
          ) : (
            <>
              <s-text-field
                label="Address (Optional)"
                value={formData.address}
                onInput={(e: Event) =>
                  setFormData({ ...formData, address: (e.target as HTMLInputElement).value })
                }
                placeholder="You can still enter an address for reference"
              />
              
              <s-stack direction="inline" gap="base">
                <s-text-field
                  label="City (Optional)"
                  value={formData.city}
                  onInput={(e: Event) =>
                    setFormData({ ...formData, city: (e.target as HTMLInputElement).value })
                  }
                />
                
                <s-text-field
                  label="Country (Optional)"
                  value={formData.country}
                  onInput={(e: Event) =>
                    setFormData({ ...formData, country: (e.target as HTMLInputElement).value })
                  }
                />
              </s-stack>

              <s-stack direction="inline" gap="base">
                <s-text-field
                  label="Latitude"
                  value={formData.latitude}
                  onInput={(e: Event) =>
                    setFormData({ ...formData, latitude: (e.target as HTMLInputElement).value })
                  }
                  
                  required
                  placeholder="Example: 12.1364"
                />
                
                <s-text-field
                  label="Longitude"
                  value={formData.longitude}
                  onInput={(e: Event) =>
                    setFormData({ ...formData, longitude: (e.target as HTMLInputElement).value })
                  }
                  
                  required
                  placeholder="Example: -86.2514"
                />
              </s-stack>
            </>
          )}
          
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

        <s-button
          slot="primary-action"
          variant="primary"
          onClick={(event: Event) => handleSubmit(event)}
          disabled={isLoading}
          {...(isLoading ? { loading: true } : {})}
        >
          {editingLocation ? "Update Location" : "Add Location"}
        </s-button>
        <s-button
          slot="secondary-actions"
          commandFor="location-modal"
          command="--hide"
          onClick={resetForm}
        >
          Cancel
        </s-button>
      </s-modal>

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