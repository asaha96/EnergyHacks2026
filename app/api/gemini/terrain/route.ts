import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type LatLng = { lat: number; lng: number };

interface TerrainRequest {
  polygon: LatLng[];
  locationName?: string | null;
}

const MAP_SIZE = { width: 640, height: 640 };
const MAX_ZOOM = 18;
const MIN_ZOOM = 3;
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function latRad(lat: number) {
  const sin = Math.sin((lat * Math.PI) / 180);
  const rad = Math.log((1 + sin) / (1 - sin)) / 2;
  return Math.max(Math.min(rad, Math.PI), -Math.PI) / 2;
}

function zoomForFraction(mapPx: number, worldPx: number, fraction: number) {
  return Math.floor(Math.log(mapPx / worldPx / Math.max(fraction, 0.00001)) / Math.LN2);
}

function estimateZoom(bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) {
  const latFraction = (latRad(bounds.maxLat) - latRad(bounds.minLat)) / Math.PI;
  const lngDiff = bounds.maxLng - bounds.minLng;
  const lngFraction = ((lngDiff < 0 ? lngDiff + 360 : lngDiff) / 360) || 0.00001;

  const latZoom = zoomForFraction(MAP_SIZE.height, 256, latFraction);
  const lngZoom = zoomForFraction(MAP_SIZE.width, 256, lngFraction);

  return clamp(Math.min(latZoom, lngZoom, MAX_ZOOM), MIN_ZOOM, MAX_ZOOM);
}

function buildPrompt(options: {
  locationName?: string | null;
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  polygon: LatLng[];
  zoom: number;
  mapAvailable: boolean;
  mapSource?: string | null;
}) {
  const { bounds, polygon, locationName, zoom, mapAvailable, mapSource } = options;
  const polygonText = polygon
    .map((point) => `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`)
    .join(' | ');
  const mapHint = mapAvailable
    ? `- Map image source: ${mapSource ?? 'unknown'}\n`
    : '- Map image unavailable; infer terrain from polygon context and typical regional geography.\n';

  return `You are a terrain artist and GIS analyst helping visualize clean-energy sites.\n
Use the provided map image plus the polygon boundary to infer terrain relief and generate a beautiful 3D surface.\n
Return JSON only (no markdown) with this shape:\n
{\n
  "heightmap": { "width": 96, "height": 96, "data": [0..1 values row-major] },\n
  "summary": "One sentence about the terrain character."\n
}\n
Rules:\n
- Output exactly 96x96 values (9216 numbers).\n
- Values are normalized 0 to 1 (0=lowest, 1=highest).\n
- Emphasize ridgelines, valleys, and slopes you can infer from the map image.\n
- Keep gradients smooth but with distinct terrain features.\n
Context:\n
- Location: ${locationName ?? 'unspecified'}\n
- Map zoom: ${zoom}\n
- Map size: ${MAP_SIZE.width}x${MAP_SIZE.height}\n
${mapHint}
- Bounds: ${bounds.minLat.toFixed(6)},${bounds.minLng.toFixed(6)} to ${bounds.maxLat.toFixed(6)},${bounds.maxLng.toFixed(6)}\n
- Polygon vertices: ${polygonText}`;
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 });
  }

  const body = (await request.json()) as TerrainRequest;
  if (!body?.polygon || body.polygon.length < 3) {
    return NextResponse.json({ error: 'Polygon is required' }, { status: 400 });
  }

  const bounds = body.polygon.reduce(
    (acc, point) => ({
      minLat: Math.min(acc.minLat, point.lat),
      maxLat: Math.max(acc.maxLat, point.lat),
      minLng: Math.min(acc.minLng, point.lng),
      maxLng: Math.max(acc.maxLng, point.lng),
    }),
    {
      minLat: body.polygon[0].lat,
      maxLat: body.polygon[0].lat,
      minLng: body.polygon[0].lng,
      maxLng: body.polygon[0].lng,
    }
  );

  const center = {
    lat: (bounds.minLat + bounds.maxLat) / 2,
    lng: (bounds.minLng + bounds.maxLng) / 2,
  };

  const zoom = estimateZoom(bounds);
  const mapUrls = [
    `https://staticmap.openstreetmap.de/staticmap.php?center=${center.lat},${center.lng}&zoom=${zoom}&size=${MAP_SIZE.width}x${MAP_SIZE.height}&maptype=mapnik`,
    `https://staticmap.openstreetmap.fr/staticmap.php?center=${center.lat},${center.lng}&zoom=${zoom}&size=${MAP_SIZE.width}x${MAP_SIZE.height}&maptype=mapnik`,
  ];

  let mapBuffer: Buffer | null = null;
  let mimeType = 'image/png';
  let mapSource: string | null = null;

  for (const mapUrl of mapUrls) {
    try {
      const mapResponse = await fetch(mapUrl);
      if (!mapResponse.ok) {
        continue;
      }

      mapBuffer = Buffer.from(await mapResponse.arrayBuffer());
      mimeType = mapResponse.headers.get('content-type') ?? 'image/png';
      mapSource = mapUrl;
      break;
    } catch (error) {
      continue;
    }
  }

  const prompt = buildPrompt({
    locationName: body.locationName,
    bounds,
    polygon: body.polygon,
    zoom,
    mapAvailable: Boolean(mapBuffer),
    mapSource,
  });

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              ...(mapBuffer
                ? [{ inlineData: { mimeType, data: mapBuffer.toString('base64') } }]
                : []),
            ],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          topP: 0.9,
          maxOutputTokens: 4000,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!geminiResponse.ok) {
    return NextResponse.json({ error: 'Gemini request failed' }, { status: 502 });
  }

  const geminiPayload = await geminiResponse.json();
  const text = geminiPayload?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    return NextResponse.json({ error: 'Gemini returned no content' }, { status: 502 });
  }

  let parsed: { heightmap?: { width: number; height: number; data: number[] }; summary?: string } | null = null;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to parse Gemini response' }, { status: 502 });
  }

  if (!parsed?.heightmap?.data || parsed.heightmap.data.length === 0) {
    return NextResponse.json({ error: 'Gemini response missing heightmap' }, { status: 502 });
  }

  return NextResponse.json({
    heightmap: parsed.heightmap,
    summary: parsed.summary ?? null,
  });
}
