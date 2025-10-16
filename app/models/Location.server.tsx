import prisma from "../db.server";
import { geocodeAddress } from "../utils/geocoding.server";

export type Location = {
  id: number;
  shop: string;
  name: string;
  address: string;
  city: string;
  country: string;
  zipCode: string | null;
  phone: string | null;
  latitude: number;
  longitude: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateLocationInput = {
  shop: string;
  name: string;
  address: string;
  city: string;
  country: string;
  zipCode?: string;
  phone?: string;
};

export type UpdateLocationInput = {
  id: number;
  name?: string;
  address?: string;
  city?: string;
  country?: string;
  zipCode?: string;
  phone?: string;
};

/**
 * Get all locations for a specific shop
 */
export async function getLocationsByShop(shop: string): Promise<Location[]> {
  return await prisma.location.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get a single location by ID
 */
export async function getLocationById(id: number): Promise<Location | null> {
  return await prisma.location.findUnique({
    where: { id },
  });
}

/**
 * Create a new location with automatic geocoding
 */
export async function createLocation(
  input: CreateLocationInput
): Promise<{ success: true; location: Location } | { success: false; error: string }> {
  try {
    // Validate required fields
    if (!input.name || !input.address || !input.city || !input.country) {
      return {
        success: false,
        error: "Name, address, city, and country are required fields.",
      };
    }

    // Construct full address for geocoding
    const fullAddress = `${input.address}, ${input.city}, ${input.country}`;
    const coordinates = await geocodeAddress(fullAddress);

    if (!coordinates) {
      return {
        success: false,
        error: "Could not find coordinates for the address. Please verify the address is correct.",
      };
    }

    // Create the location
    const location = await prisma.location.create({
      data: {
        shop: input.shop,
        name: input.name,
        address: input.address,
        city: input.city,
        country: input.country,
        zipCode: input.zipCode || null,
        phone: input.phone || null,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      },
    });

    return { success: true, location };
  } catch (error) {
    console.error("Error creating location:", error);
    return {
      success: false,
      error: "An error occurred while creating the location.",
    };
  }
}

/**
 * Update an existing location
 */
export async function updateLocation(
  input: UpdateLocationInput
): Promise<{ success: true; location: Location } | { success: false; error: string }> {
  try {
    const { id, ...updateData } = input;

    // Check if location exists
    const existingLocation = await prisma.location.findUnique({
      where: { id },
    });

    if (!existingLocation) {
      return {
        success: false,
        error: "Location not found.",
      };
    }

    // If address fields are being updated, re-geocode
    let coordinates = null;
    if (updateData.address || updateData.city || updateData.country) {
      const address = updateData.address || existingLocation.address;
      const city = updateData.city || existingLocation.city;
      const country = updateData.country || existingLocation.country;
      const fullAddress = `${address}, ${city}, ${country}`;
      
      coordinates = await geocodeAddress(fullAddress);
      
      if (!coordinates) {
        return {
          success: false,
          error: "Could not find coordinates for the updated address.",
        };
      }
    }

    // Update the location
    const location = await prisma.location.update({
      where: { id },
      data: {
        ...updateData,
        ...(coordinates && {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        }),
      },
    });

    return { success: true, location };
  } catch (error) {
    console.error("Error updating location:", error);
    return {
      success: false,
      error: "An error occurred while updating the location.",
    };
  }
}

/**
 * Delete a location by ID
 */
export async function deleteLocation(
  id: number
): Promise<{ success: true; id: number } | { success: false; error: string }> {
  try {
    // Check if location exists
    const existingLocation = await prisma.location.findUnique({
      where: { id },
    });

    if (!existingLocation) {
      return {
        success: false,
        error: "Location not found.",
      };
    }

    // Delete the location
    await prisma.location.delete({
      where: { id },
    });

    return { success: true, id };
  } catch (error) {
    console.error("Error deleting location:", error);
    return {
      success: false,
      error: "An error occurred while deleting the location.",
    };
  }
}

/**
 * Delete all locations for a specific shop
 */
export async function deleteAllLocationsByShop(
  shop: string
): Promise<{ success: true; count: number } | { success: false; error: string }> {
  try {
    const result = await prisma.location.deleteMany({
      where: { shop },
    });

    return { success: true, count: result.count };
  } catch (error) {
    console.error("Error deleting locations:", error);
    return {
      success: false,
      error: "An error occurred while deleting locations.",
    };
  }
}