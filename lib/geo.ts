/**
 * Geodesic area calculation utilities
 * Uses the Shoelace formula with geodesic corrections for accurate area calculation
 */

export interface Coordinate {
  lat: number;
  lng: number;
}

// Earth's radius in meters (WGS84 mean radius)
const EARTH_RADIUS = 6371008.8;

// Conversion constants
const SQ_METERS_TO_ACRES = 0.000247105;
const SQ_METERS_TO_HECTARES = 0.0001;
const SQ_METERS_TO_SQ_FEET = 10.7639;
const SQ_METERS_TO_SQ_MILES = 3.861e-7;

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculate geodesic area of a polygon using the Shoelace formula
 * adapted for spherical coordinates (Karney's method simplified)
 * 
 * @param coordinates - Array of lat/lng coordinates forming a closed polygon
 * @returns Area in square meters
 */
export function calculateGeodesicArea(coordinates: Coordinate[]): number {
  if (coordinates.length < 3) return 0;

  // Close the polygon if not already closed
  const ring = [...coordinates];
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first.lat !== last.lat || first.lng !== last.lng) {
    ring.push(first);
  }

  let area = 0;
  const n = ring.length;

  for (let i = 0; i < n - 1; i++) {
    const p1 = ring[i];
    const p2 = ring[i + 1];

    const lat1 = toRadians(p1.lat);
    const lat2 = toRadians(p2.lat);
    const lng1 = toRadians(p1.lng);
    const lng2 = toRadians(p2.lng);

    // Spherical excess formula
    area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }

  area = Math.abs(area * EARTH_RADIUS * EARTH_RADIUS / 2);

  return area;
}

/**
 * Calculate area and return in multiple units
 */
export function calculateAreaWithUnits(coordinates: Coordinate[]): {
  squareMeters: number;
  acres: number;
  hectares: number;
  squareFeet: number;
  squareMiles: number;
} {
  const squareMeters = calculateGeodesicArea(coordinates);

  return {
    squareMeters,
    acres: squareMeters * SQ_METERS_TO_ACRES,
    hectares: squareMeters * SQ_METERS_TO_HECTARES,
    squareFeet: squareMeters * SQ_METERS_TO_SQ_FEET,
    squareMiles: squareMeters * SQ_METERS_TO_SQ_MILES,
  };
}

/**
 * Format area for display with appropriate precision
 * 
 * @param acres - Area in acres
 * @returns Formatted string with unit
 */
export function formatArea(acres: number): string {
  if (acres < 0.01) {
    const sqFt = acres / SQ_METERS_TO_ACRES * SQ_METERS_TO_SQ_FEET;
    return `${sqFt.toFixed(2)} sq ft`;
  }
  return `${acres.toFixed(2)} acres`;
}

/**
 * Calculate the centroid of a polygon
 */
export function calculateCentroid(coordinates: Coordinate[]): Coordinate {
  if (coordinates.length === 0) {
    return { lat: 0, lng: 0 };
  }

  let latSum = 0;
  let lngSum = 0;

  for (const coord of coordinates) {
    latSum += coord.lat;
    lngSum += coord.lng;
  }

  return {
    lat: latSum / coordinates.length,
    lng: lngSum / coordinates.length,
  };
}

/**
 * Calculate the bounding box of a polygon
 */
export function calculateBounds(coordinates: Coordinate[]): {
  north: number;
  south: number;
  east: number;
  west: number;
} | null {
  if (coordinates.length === 0) return null;

  let north = -Infinity;
  let south = Infinity;
  let east = -Infinity;
  let west = Infinity;

  for (const coord of coordinates) {
    north = Math.max(north, coord.lat);
    south = Math.min(south, coord.lat);
    east = Math.max(east, coord.lng);
    west = Math.min(west, coord.lng);
  }

  return { north, south, east, west };
}

/**
 * Fetch elevation data grid from Open-Meteo
 * Limited to 100 points per request (10x10 grid)
 */
export async function fetchElevationGrid(
  center: Coordinate,
  radiusMeters: number,
  gridSize: number = 10
): Promise<Float32Array> {
  // Generate grid coordinates
  const lats: number[] = [];
  const lngs: number[] = [];
  const step = (radiusMeters * 2) / (gridSize - 1);
  
  // Simple flat earth approximation for small areas
  const latStepDeg = step / 111320; 
  const lngStepDeg = step / (111320 * Math.cos(toRadians(center.lat)));

  const startLat = center.lat - (latStepDeg * (gridSize - 1)) / 2;
  const startLng = center.lng - (lngStepDeg * (gridSize - 1)) / 2;

  // Row-major order (y then x) to match typical heightmap layout
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      lats.push(startLat + y * latStepDeg);
      lngs.push(startLng + x * lngStepDeg);
    }
  }

  // Batch request to Open-Meteo
  const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats.join(',')}&longitude=${lngs.join(',')}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch elevation data');
    const data = await res.json();
    return new Float32Array(data.elevation);
  } catch (error) {
    console.warn('Error fetching elevation data, falling back to flat terrain:', error);
    return new Float32Array(gridSize * gridSize).fill(0);
  }
}

