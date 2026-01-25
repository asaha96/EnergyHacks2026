import { NextRequest } from 'next/server';
import {
  hardcodedElevation,
  TERRAIN_GRID_WIDTH,
  TERRAIN_GRID_HEIGHT,
  terrainBounds,
} from '@/lib/terrain-data';

const GRID_SIZE = 20;
const POINTS_PER_REQUEST = 100;

function returnHardcodedElevation() {
  return new Response(
    JSON.stringify({
      elevation: hardcodedElevation,
      gridWidth: TERRAIN_GRID_WIDTH,
      gridHeight: TERRAIN_GRID_HEIGHT,
      bounds: terrainBounds,
      source: 'hardcoded',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

export async function POST(request: NextRequest) {
  try {
    const { coordinates } = await request.json();

    if (!Array.isArray(coordinates) || coordinates.length < 3) {
      return new Response(
        JSON.stringify({ error: 'Invalid coordinates' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let north = -Infinity, south = Infinity, east = -Infinity, west = Infinity;
    for (const coord of coordinates) {
      north = Math.max(north, coord.lat);
      south = Math.min(south, coord.lat);
      east = Math.max(east, coord.lng);
      west = Math.min(west, coord.lng);
    }

    const latRange = north - south;
    const lngRange = east - west;

    const gridWidth = GRID_SIZE;
    const gridHeight = GRID_SIZE;
    const totalPoints = gridWidth * gridHeight;

    const latStep = latRange / (gridHeight - 1);
    const lngStep = lngRange / (gridWidth - 1);

    const allPoints: { lat: number; lng: number; idx: number }[] = [];
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        allPoints.push({
          lat: south + y * latStep,
          lng: west + x * lngStep,
          idx: y * gridWidth + x,
        });
      }
    }

    const chunks: typeof allPoints[] = [];
    for (let i = 0; i < allPoints.length; i += POINTS_PER_REQUEST) {
      chunks.push(allPoints.slice(i, i + POINTS_PER_REQUEST));
    }

    const elevations = new Array<number>(totalPoints).fill(0);
    let anyFetchFailed = false;

    const results = await Promise.all(
      chunks.map(async (chunk) => {
        const lats = chunk.map(p => p.lat.toFixed(6)).join(',');
        const lngs = chunk.map(p => p.lng.toFixed(6)).join(',');
        const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`;
        
        try {
          const res = await fetch(url);
          if (!res.ok) {
            console.error('Open-Meteo error:', res.status);
            anyFetchFailed = true;
            return { chunk, elevations: null };
          }
          
          const data = await res.json();
          if (!Array.isArray(data.elevation)) {
            anyFetchFailed = true;
            return { chunk, elevations: null };
          }
          return { chunk, elevations: data.elevation as number[] };
        } catch (err) {
          console.error('Open-Meteo fetch error:', err);
          anyFetchFailed = true;
          return { chunk, elevations: null };
        }
      })
    );

    if (anyFetchFailed) {
      console.log('Falling back to hardcoded elevation data');
      return returnHardcodedElevation();
    }

    for (const { chunk, elevations: chunkElevations } of results) {
      if (chunkElevations) {
        chunk.forEach((point, i) => {
          elevations[point.idx] = chunkElevations[i] ?? 0;
        });
      }
    }

    return new Response(
      JSON.stringify({
        elevation: elevations,
        gridWidth,
        gridHeight,
        bounds: { north, south, east, west },
        source: 'open-meteo',
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Elevation API error:', error);
    return returnHardcodedElevation();
  }
}
