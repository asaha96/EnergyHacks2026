// TeraWatt Hardcoded Terrain Elevation Data
// Location: Caldwell County, TX (matches placements.ts)
// Designed to complement the placement zones with realistic Texas Hill Country terrain
//
// Grid: 20x20 (400 elevation values in meters)
// Row-major order: index = y * 20 + x
// Y=0 is SOUTH, Y=19 is NORTH (geographic convention)
// X=0 is WEST, X=19 is EAST
//
// Terrain Design Philosophy:
// - Generally flat Texas agricultural land (140-160m base elevation)
// - Gentle depression for pond near pollinator habitat (SW-center area)
// - Slight ridge along eastern edge (natural drainage pattern)
// - Minimal variation in solar zones (optimal for panels)
// - Gentle rolling in agrivoltaic pasture areas

// Elevation values in meters above sea level
// Typical Caldwell County elevation: 400-600 feet (122-183m)
// We use ~150m as baseline with +-15m variation

export const TERRAIN_GRID_WIDTH = 20;
export const TERRAIN_GRID_HEIGHT = 20;

// Grid layout reference (looking from above, North at top):
// Y=19 (North): Buffer zone along FM 2623
// Y=15-18: NW Solar (left) | NC Agrivoltaic (center-left)
// Y=10-14: NW Solar continues | Central area | Battery Storage (right)
// Y=5-9: Pollinator/Pond area | Central Solar | SE Agrivoltaic begins
// Y=0-4 (South): SW Solar (left) | SE Agrivoltaic (right)
//
// X mapping: 0-4 (far west), 5-9 (center-west), 10-14 (center-east), 15-19 (far east/road)

export const hardcodedElevation: number[] = [
  // Row 0 (Y=0, Southernmost) - SW Solar zone (flat) | SE Agrivoltaic (gentle roll)
  148, 148, 148, 149, 149, 150, 150, 151, 151, 152, 153, 154, 155, 155, 156, 157, 158, 159, 160, 161,
  
  // Row 1 - SW Solar continues | SE Agrivoltaic
  148, 148, 148, 149, 149, 150, 150, 151, 152, 152, 153, 154, 155, 156, 156, 157, 158, 159, 160, 161,
  
  // Row 2 - SW Solar | SE Agrivoltaic
  148, 148, 149, 149, 149, 150, 151, 151, 152, 153, 153, 154, 155, 156, 157, 158, 158, 159, 160, 162,
  
  // Row 3 - SW Solar | SE Agrivoltaic 
  148, 149, 149, 149, 150, 150, 151, 152, 152, 153, 154, 155, 155, 156, 157, 158, 159, 160, 161, 162,
  
  // Row 4 - SW Solar | Central transition | SE Agrivoltaic
  149, 149, 149, 150, 150, 151, 151, 152, 153, 153, 154, 155, 156, 157, 157, 158, 159, 160, 161, 162,
  
  // Row 5 - Pollinator zone begins (depression starts) | Central | SE Agrivoltaic
  149, 149, 150, 150, 147, 146, 145, 152, 153, 154, 154, 155, 156, 156, 157, 158, 159, 160, 161, 163,
  
  // Row 6 - POND AREA (deep depression) | Central Solar | transition
  149, 150, 150, 146, 143, 141, 142, 150, 152, 153, 154, 155, 155, 156, 157, 158, 159, 160, 162, 163,
  
  // Row 7 - POND CENTER (lowest point ~138m) | Central Solar
  150, 150, 147, 143, 139, 138, 139, 148, 151, 153, 154, 154, 155, 156, 157, 158, 159, 161, 162, 163,
  
  // Row 8 - Pond edge | Central Solar | Battery Storage zone begins
  150, 150, 148, 145, 142, 141, 143, 149, 152, 153, 154, 155, 155, 156, 157, 158, 158, 159, 162, 163,
  
  // Row 9 - Pollinator transition | Central Solar | Battery Storage (flat)
  150, 150, 149, 148, 147, 148, 150, 151, 152, 153, 154, 155, 156, 156, 157, 158, 158, 159, 160, 163,
  
  // Row 10 - NW Solar zone begins | Central | Battery Storage
  150, 150, 150, 150, 150, 151, 151, 152, 153, 153, 154, 155, 155, 156, 157, 158, 158, 159, 160, 164,
  
  // Row 11 - NW Solar (very flat) | NC Agrivoltaic begins | Battery Storage
  150, 150, 150, 150, 151, 151, 152, 152, 153, 154, 154, 155, 155, 156, 157, 158, 158, 159, 161, 164,
  
  // Row 12 - NW Solar | NC Agrivoltaic (gentle undulation)
  150, 150, 150, 151, 151, 151, 152, 153, 153, 154, 155, 155, 156, 156, 157, 158, 159, 160, 161, 164,
  
  // Row 13 - NW Solar | NC Agrivoltaic
  150, 150, 151, 151, 151, 152, 152, 153, 154, 154, 155, 156, 156, 157, 157, 158, 159, 160, 162, 165,
  
  // Row 14 - NW Solar | NC Agrivoltaic
  150, 151, 151, 151, 152, 152, 153, 153, 154, 155, 155, 156, 157, 157, 158, 158, 159, 160, 162, 165,
  
  // Row 15 - NW Solar | NC Agrivoltaic
  151, 151, 151, 152, 152, 153, 153, 154, 154, 155, 156, 156, 157, 158, 158, 159, 160, 161, 163, 165,
  
  // Row 16 - NW Solar | NC Agrivoltaic
  151, 151, 152, 152, 152, 153, 154, 154, 155, 155, 156, 157, 157, 158, 159, 159, 160, 161, 163, 166,
  
  // Row 17 - Approaching northern buffer
  151, 152, 152, 152, 153, 153, 154, 155, 155, 156, 156, 157, 158, 158, 159, 160, 160, 162, 164, 166,
  
  // Row 18 - Near FM 2623
  152, 152, 152, 153, 153, 154, 154, 155, 156, 156, 157, 157, 158, 159, 159, 160, 161, 162, 164, 167,
  
  // Row 19 (Y=19, Northernmost) - FM 2623 Buffer (slightly elevated road grade)
  153, 153, 153, 154, 154, 155, 155, 156, 156, 157, 158, 158, 159, 159, 160, 161, 162, 163, 165, 168,
];

// Bounds matching the Caldwell County site in placements.ts
export const terrainBounds = {
  north: 29.67240064991416,
  south: 29.647741019671773,
  east: -97.90489221345922,
  west: -97.9229727055634,
};

// Metadata for the hardcoded terrain
export const terrainMetadata = {
  baseElevation: 150, // meters (roughly 492 feet)
  minElevation: 138,  // pond bottom
  maxElevation: 168,  // eastern ridge near road
  elevationRange: 30, // meters total variation
  features: {
    pond: {
      centerX: 5,  // grid coordinates
      centerY: 7,
      radiusApprox: 2,
      depth: 12, // meters below surrounding terrain
      description: 'Natural stock pond, ideal for pollinator habitat moisture source',
    },
    easternRidge: {
      description: 'Gentle ridge along eastern boundary, natural drainage divide',
      peakElevation: 168,
    },
    solarFlats: {
      nwZone: { avgElevation: 150, variance: 2 },
      swZone: { avgElevation: 149, variance: 2 },
    },
  },
};

/**
 * Get elevation at a specific grid cell
 * @param x - Column (0-19, west to east)
 * @param y - Row (0-19, south to north)
 * @returns Elevation in meters, or null if out of bounds
 */
export function getElevationAt(x: number, y: number): number | null {
  if (x < 0 || x >= TERRAIN_GRID_WIDTH || y < 0 || y >= TERRAIN_GRID_HEIGHT) {
    return null;
  }
  return hardcodedElevation[y * TERRAIN_GRID_WIDTH + x];
}

/**
 * Get elevation at normalized coordinates (-1 to 1)
 * Uses bilinear interpolation for smooth sampling
 * @param nx - Normalized X coordinate (-1 = west, 1 = east)
 * @param nz - Normalized Z coordinate (-1 = south, 1 = north)
 * @returns Interpolated elevation in meters
 */
export function getElevationAtNormalized(nx: number, nz: number): number {
  // Convert normalized coords to grid coords
  const gx = ((nx + 1) / 2) * (TERRAIN_GRID_WIDTH - 1);
  const gy = ((nz + 1) / 2) * (TERRAIN_GRID_HEIGHT - 1);
  
  // Bilinear interpolation
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const x1 = Math.min(x0 + 1, TERRAIN_GRID_WIDTH - 1);
  const y1 = Math.min(y0 + 1, TERRAIN_GRID_HEIGHT - 1);
  
  const tx = gx - x0;
  const ty = gy - y0;
  
  const e00 = hardcodedElevation[y0 * TERRAIN_GRID_WIDTH + x0];
  const e10 = hardcodedElevation[y0 * TERRAIN_GRID_WIDTH + x1];
  const e01 = hardcodedElevation[y1 * TERRAIN_GRID_WIDTH + x0];
  const e11 = hardcodedElevation[y1 * TERRAIN_GRID_WIDTH + x1];
  
  const ex0 = e00 + (e10 - e00) * tx;
  const ex1 = e01 + (e11 - e01) * tx;
  
  return ex0 + (ex1 - ex0) * ty;
}

/**
 * Check if using hardcoded terrain (based on bounds matching)
 */
export function shouldUseHardcodedTerrain(
  bounds: { north: number; south: number; east: number; west: number }
): boolean {
  const tolerance = 0.01; // ~1km tolerance
  return (
    Math.abs(bounds.north - terrainBounds.north) < tolerance &&
    Math.abs(bounds.south - terrainBounds.south) < tolerance &&
    Math.abs(bounds.east - terrainBounds.east) < tolerance &&
    Math.abs(bounds.west - terrainBounds.west) < tolerance
  );
}

/**
 * Get the hardcoded elevation data as Float32Array for direct use in terrain rendering
 */
export function getHardcodedElevationData(): {
  data: Float32Array;
  gridWidth: number;
  gridHeight: number;
  bounds: typeof terrainBounds;
} {
  return {
    data: new Float32Array(hardcodedElevation),
    gridWidth: TERRAIN_GRID_WIDTH,
    gridHeight: TERRAIN_GRID_HEIGHT,
    bounds: terrainBounds,
  };
}
