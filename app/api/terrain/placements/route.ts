import { NextRequest } from 'next/server';
import { geminiChatStream } from '@/lib/gemini';
import type { PlanConstraints } from '@/types/plan';

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
  let body: {
    elevationGrid?: number[];
    gridWidth?: number;
    gridHeight?: number;
    slopeGrid?: number[];
    aspectGrid?: number[];
    solarSuitability?: number[];
    windSuitability?: number[];
    constraints?: PlanConstraints;
    bounds?: { north: number; south: number; east: number; west: number };
  };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid or empty request body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const elevationGrid = Array.isArray(body.elevationGrid) ? body.elevationGrid : [];
    const gridWidth = typeof body.gridWidth === 'number' ? body.gridWidth : 10;
    const gridHeight = typeof body.gridHeight === 'number' ? body.gridHeight : 10;
    const slopeGrid = Array.isArray(body.slopeGrid) ? body.slopeGrid : [];
    const aspectGrid = Array.isArray(body.aspectGrid) ? body.aspectGrid : [];
    const solarSuitability = Array.isArray(body.solarSuitability) ? body.solarSuitability : [];
    const windSuitability = Array.isArray(body.windSuitability) ? body.windSuitability : [];
    const constraints = body.constraints;
    const bounds = body.bounds;

    if (!elevationGrid.length || elevationGrid.length !== gridWidth * gridHeight) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid elevation grid dimensions' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const expectedLength = gridWidth * gridHeight;
    if (
      slopeGrid.length !== expectedLength ||
      aspectGrid.length !== expectedLength ||
      solarSuitability.length !== expectedLength ||
      windSuitability.length !== expectedLength
    ) {
      return new Response(
        JSON.stringify({ success: false, error: 'All terrain grids must have matching dimensions' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!constraints || !constraints.budget || !constraints.energy || !constraints.technical) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required constraint fields (budget, energy, technical)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!bounds || typeof bounds.north !== 'number' || typeof bounds.south !== 'number' || 
        typeof bounds.east !== 'number' || typeof bounds.west !== 'number') {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid bounds object' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const normalized = normalizeGrid(elevationGrid.map(Number));
    const gridText = formatGrid(normalized, gridWidth);

    const systemPrompt = [
      'You are a renewable energy site planner. Output ZONES (rectangular areas) not individual placements.',
      'Always respond with valid JSON only, no markdown or code blocks.',
      '',
      'Your task is to identify optimal rectangular zones for renewable energy equipment based on terrain analysis and user constraints.',
      'Zones should not overlap. Each zone represents an optimal area for that technology.',
      '',
      'Suitability scores explanation:',
      '- Solar suitability: 0-100 (higher = better for solar). Considers slope, aspect (south-facing preferred), and shading.',
      '- Wind suitability: 0-100 (higher = better for wind). Considers elevation, exposure, and terrain roughness.',
      '',
      'Use suitability scores to identify contiguous high-scoring regions and define rectangular zones around them.',
    ].join('\n');

    const solarSuitabilityText = formatGrid(solarSuitability.map(v => v / 100), gridWidth);
    const windSuitabilityText = formatGrid(windSuitability.map(v => v / 100), gridWidth);

    const { budget, energy, technical } = constraints;
    const selectedTechnologies = technical.technologies.join(', ');

    const userPrompt = [
      '## User Constraints',
      `Budget: $${budget.min.toLocaleString()} - $${budget.max.toLocaleString()}`,
      `Financing: ${budget.financing}`,
      `User selected technologies: ${selectedTechnologies}`,
      `Primary energy goal: ${energy.primaryGoal}`,
      `Grid connection: ${energy.gridConnection}`,
      energy.targetProduction ? `Target production: ${energy.targetProduction} kWh/month` : '',
      '',
      '## Grid Information',
      `Grid dimensions: ${gridWidth} x ${gridHeight}`,
      `Bounds: North ${bounds.north.toFixed(6)}, South ${bounds.south.toFixed(6)}, East ${bounds.east.toFixed(6)}, West ${bounds.west.toFixed(6)}`,
      '',
      '## Output Format',
      'Return JSON with a "zones" array. Each zone has: x1, z1 (top-left corner), x2, z2 (bottom-right corner), type ("solar" or "wind"), and suitability (0-100).',
      'Coordinates are normalized in [-1, 1].',
      '',
      'Example:',
      '{"zones":[{"x1":-0.8,"z1":-0.6,"x2":-0.2,"z2":0.1,"type":"solar","suitability":85},{"x1":0.3,"z1":0.4,"x2":0.8,"z2":0.85,"type":"wind","suitability":78}]}',
      '',
      'Rules:',
      '- Stay within |x|,|z| <= 0.9 to avoid terrain edges.',
      '- Only include zones for technologies the user selected.',
      '- Zones must NOT overlap.',
      '- Solar zones: 2-4 zones, can be larger since panels are dense.',
      '- Wind zones: 1-2 zones, smaller since turbines need spacing.',
      '- Place zones where suitability grids show high values.',
      '',
      '## Terrain Analysis Data',
      '',
      'Elevation grid (normalized 0-1, row-major):',
      gridText,
      '',
      'Solar suitability grid (0-1, higher = better):',
      solarSuitabilityText,
      '',
      'Wind suitability grid (0-1, higher = better):',
      windSuitabilityText,
    ].filter(line => line !== '').join('\n');

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const generator = geminiChatStream([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ]);

        for await (const chunk of generator) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Placement planning failed:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Placement planning failed', message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
