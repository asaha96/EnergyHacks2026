import { NextRequest, NextResponse } from 'next/server';
import { geminiChatJson } from '@/lib/gemini';

type PlacementResponse = {
  solar?: Array<{ x: number; z: number; tilt?: number; scale?: number; azimuth?: number }>;
  wind?: Array<{ x: number; z: number; height?: number; scale?: number }>;
  markers?: Array<{ x: number; z: number; label?: string; type?: string }>;
};

function normalizeGrid(grid: number[]) {
  let min = Infinity;
  let max = -Infinity;
  for (const value of grid) {
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  const range = max - min || 1;
  return grid.map((value) => (value - min) / range);
}

function formatGrid(grid: number[], size: number) {
  const rows: string[] = [];
  for (let y = 0; y < size; y++) {
    const row = grid
      .slice(y * size, (y + 1) * size)
      .map((value) => value.toFixed(3))
      .join(', ');
    rows.push(`[${row}]`);
  }
  return rows.join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const elevationGrid = Array.isArray(body?.elevationGrid) ? body.elevationGrid : [];
    const gridSize = typeof body?.gridSize === 'number' ? body.gridSize : 10;

    if (!elevationGrid.length || elevationGrid.length !== gridSize * gridSize) {
      return NextResponse.json({ success: false, error: 'Invalid elevation grid' }, { status: 400 });
    }

    const normalized = normalizeGrid(elevationGrid.map(Number));
    const gridText = formatGrid(normalized, gridSize);

    const systemPrompt = 'You are an expert renewable site planner for Guadalupe County, Texas (near Seguin/New Braunfels). Use local context: high solar irradiance (~1737 kWh/m2/yr), decent wind (~14 mph), and local utilities (GVEC/NBU). Always respond with valid JSON only, no markdown or code blocks.';

    const userPrompt = [
      'Given the elevation grid below (values 0 to 1, row-major), propose placements for solar arrays, wind turbines, and marker anchors.',
      'Return JSON only with this exact shape:',
      '{"solar":[{"x":0,"z":0,"tilt":0.25,"scale":0.32,"azimuth":1.2}],"wind":[{"x":0,"z":0,"height":1.4,"scale":0.38}],"markers":[{"x":0,"z":0,"type":"solar","label":"Solar Zone A"},...] }',
      'Constraints:',
      '- x and z are normalized coordinates in [-1, 1]; stay within |x|,|z| <= 0.92 to avoid edges.',
      '- Provide 12 solar entries, 3 wind entries, 5 marker entries.',
      '- Solar: favor flatter mid-elevation areas; Wind: favor higher ridges or exposed peaks.',
      '- Markers should correspond to solar, wind, optimal, battery, and grid types.',
      'Elevation grid:',
      gridText,
    ].join('\n');

    const parsed = await geminiChatJson<PlacementResponse>(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]
    );

    return NextResponse.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Placement planning failed:', error);
    return NextResponse.json(
      { success: false, error: 'Placement planning failed', message: error?.message },
      { status: 500 }
    );
  }
}
