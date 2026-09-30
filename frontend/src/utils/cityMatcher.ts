export interface CityCategoryConfig {
  name: string;
  cities: string[];
  deliveryFeeSettings: {
    minAmountForFreeDelivery: number;
    deliveryFee: number;
  };
  planPrices: {
    basic: number;
    standard: number;
    premium: number;
    customizableBase: number;
  };
}

export interface CityMatchResult {
  eligible: boolean;
  city: string | null;
  categoryKey: string | null;
  categoryName: string | null;
  outOfProvince: boolean;
  provinceName: string | null;
  error: string | null;
}

// Known coordinates for British Columbia cities for precise map centering
export const CITY_COORDINATES: Record<string, [number, number]> = {
  vancouver: [49.2827, -123.1207],
  burnaby: [49.2488, -122.9805],
  richmond: [49.1666, -123.1336],
  "new westminster": [49.2057, -122.9110],
  langley: [49.1044, -122.6587],
  surrey: [49.1913, -122.8490],
  coquitlam: [49.2838, -122.7932],
  delta: [49.0847, -123.0587],
  "port coquitlam": [49.2628, -122.7811],
  "port moody": [49.2831, -122.8317],
  abbotsford: [49.0504, -122.3045],
  chilliwack: [49.1579, -121.9514],
  mission: [49.1337, -122.3112],
  "maple ridge": [49.2193, -122.5984],
  "white rock": [49.0252, -122.8029],
  "pitt meadows": [49.2215, -122.6896],
  kelowna: [49.8880, -119.4960],
  kamloops: [50.6745, -120.3273],
  victoria: [48.4284, -123.3656],
  nanaimo: [49.1659, -123.9401]
};

export const DEFAULT_BC_CENTER: [number, number] = [49.2827, -123.1207]; // Vancouver

/**
 * Normalizes city string by removing administrative prefixes and whitespace
 */
export function normalizeCityName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/\b(city of|township of|district of|town of|municipality of|village of)\b/gi, "")
    .trim();
}

/**
 * Advanced Address and City Matching Engine
 * Matches an address string and/or reverse geocoded details against admin-configured cityCategories.
 */
export function matchAddressToAdminCities(
  address: string,
  categories: Record<string, CityCategoryConfig> = {},
  nominatimAddress?: Record<string, string>
): CityMatchResult {
  if (!address || typeof address !== "string" || !address.trim()) {
    return {
      eligible: false,
      city: null,
      categoryKey: null,
      categoryName: null,
      outOfProvince: false,
      provinceName: null,
      error: "Address is empty or invalid"
    };
  }

  // 1. Check province if provided by Nominatim geocoder
  const state = nominatimAddress?.state || "";

  if (state) {
    const normState = state.toLowerCase().trim();
    const isBC = normState === "british columbia" || normState === "bc";
    if (!isBC) {
      return {
        eligible: false,
        city: null,
        categoryKey: null,
        categoryName: null,
        outOfProvince: true,
        provinceName: state,
        error: `Delivery is currently not available in ${state}. Ghar Ki Rasoee operates exclusively in British Columbia.`
      };
    }
  }

  // Collect all admin-configured cities across all categories
  const candidateList: { city: string; categoryKey: string; categoryName: string }[] = [];
  for (const catKey of Object.keys(categories)) {
    const cat = categories[catKey];
    const cities = cat?.cities || [];
    for (const c of cities) {
      if (c && typeof c === "string" && c.trim().length > 0) {
        candidateList.push({
          city: c.trim(),
          categoryKey: catKey,
          categoryName: cat.name || catKey
        });
      }
    }
  }

  // Sort candidate cities descending by length so "Port Coquitlam" is checked before "Coquitlam"
  candidateList.sort((a, b) => b.city.length - a.city.length);

  // 2. Check if Nominatim structured city field matches
  const structuredCityName = nominatimAddress
    ? (nominatimAddress.city || nominatimAddress.town || nominatimAddress.municipality || nominatimAddress.village || nominatimAddress.suburb || nominatimAddress.county)
    : null;

  if (structuredCityName) {
    const normStructured = normalizeCityName(structuredCityName);
    for (const cand of candidateList) {
      const normCand = normalizeCityName(cand.city);
      if (normStructured === normCand || normStructured.includes(normCand) || normCand.includes(normStructured)) {
        return {
          eligible: true,
          city: cand.city,
          categoryKey: cand.categoryKey,
          categoryName: cand.categoryName,
          outOfProvince: false,
          provinceName: state || "British Columbia",
          error: null
        };
      }
    }
  }

  // 3. Fallback to full address string matching using word boundaries
  const normalizedAddress = address.toLowerCase();

  for (const cand of candidateList) {
    const normCity = normalizeCityName(cand.city);
    const escaped = normCity.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
    if (regex.test(normalizedAddress)) {
      return {
        eligible: true,
        city: cand.city,
        categoryKey: cand.categoryKey,
        categoryName: cand.categoryName,
        outOfProvince: false,
        provinceName: state || "British Columbia",
        error: null
      };
    }
  }

  return {
    eligible: false,
    city: null,
    categoryKey: null,
    categoryName: null,
    outOfProvince: false,
    provinceName: state || null,
    error: "This address does not match any currently supported city in Ghar Ki Rasoee's delivery zones."
  };
}

/**
 * Returns [lat, lng] for a given city name, with fallback to Vancouver
 */
export function getCityCoordinates(cityName: string | null): [number, number] {
  if (!cityName) return DEFAULT_BC_CENTER;
  const norm = normalizeCityName(cityName);
  return CITY_COORDINATES[norm] || DEFAULT_BC_CENTER;
}
