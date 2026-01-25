import { randomUUID } from 'crypto';
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
  const requestId = request.headers.get('x-request-id') ?? randomUUID();
  const logPrefix = `[gemini-terrain:${requestId}]`;
  const requestStartedAt = Date.now();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error(`${logPrefix} missing GEMINI_API_KEY`);
    return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 });
  }

  let body: TerrainRequest;
  try {
    body = (await request.json()) as TerrainRequest;
  } catch (error) {
    console.error(`${logPrefix} invalid JSON body`, {
      error: error instanceof Error ? error.message : error,
    });
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body?.polygon || body.polygon.length < 3) {
    console.warn(`${logPrefix} missing polygon`, {
      polygonPoints: body?.polygon?.length ?? 0,
    });
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
  console.info(`${logPrefix} request parsed`, {
    model: GEMINI_MODEL,
    polygonPoints: body.polygon.length,
    locationName: body.locationName ?? null,
    bounds,
    center,
    zoom,
  });
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
        console.warn(`${logPrefix} map fetch failed`, {
          mapUrl,
          status: mapResponse.status,
        });
        continue;
      }

      mapBuffer = Buffer.from(await mapResponse.arrayBuffer());
      mimeType = mapResponse.headers.get('content-type') ?? 'image/png';
      mapSource = mapUrl;
      console.info(`${logPrefix} map fetch success`, {
        mapUrl,
        mimeType,
        bytes: mapBuffer.byteLength,
      });
      break;
    } catch (error) {
      console.warn(`${logPrefix} map fetch error`, {
        mapUrl,
        error: error instanceof Error ? error.message : error,
      });
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

  console.info(`${logPrefix} Gemini request start`, {
    model: GEMINI_MODEL,
    promptChars: prompt.length,
    mapIncluded: Boolean(mapBuffer),
    mapSource,
  });
  const geminiStartedAt = Date.now();
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
    const errorBody = await geminiResponse.text();
    console.error(`${logPrefix} Gemini request failed`, {
      status: geminiResponse.status,
      durationMs: Date.now() - geminiStartedAt,
      body: errorBody.slice(0, 800),
    });
    return NextResponse.json({ error: 'Gemini request failed' }, { status: 502 });
  }

  const geminiPayload = await geminiResponse.json();
  const text = geminiPayload?.candidates?.[0]?.content?.parts?.[0]?.text;
  console.info(`${logPrefix} Gemini response received`, {
    status: geminiResponse.status,
    durationMs: Date.now() - geminiStartedAt,
    candidates: geminiPayload?.candidates?.length ?? 0,
    textChars: typeof text === 'string' ? text.length : 0,
  });

  if (!text) {
    console.error(`${logPrefix} Gemini returned no content`);
    return NextResponse.json({ error: 'Gemini returned no content' }, { status: 502 });
  }

  let parsed: { heightmap?: { width: number; height: number; data: number[] }; summary?: string } | null = null;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    console.error(`${logPrefix} Gemini JSON parse failed`, {
      error: error instanceof Error ? error.message : error,
      textPreview: text.slice(0, 800),
    });
    return NextResponse.json({ error: 'Failed to parse Gemini response' }, { status: 502 });
  }

  if (!parsed?.heightmap?.data || parsed.heightmap.data.length === 0) {
    console.error(`${logPrefix} Gemini response missing heightmap`, {
      heightmap: parsed?.heightmap
        ? {
            width: parsed.heightmap.width,
            height: parsed.heightmap.height,
            dataLength: parsed.heightmap.data.length,
          }
        : null,
    });
    return NextResponse.json({ error: 'Gemini response missing heightmap' }, { status: 502 });
  }

  console.info(`${logPrefix} Gemini response parsed`, {
    heightmap: {
      width: parsed.heightmap.width,
      height: parsed.heightmap.height,
      dataLength: parsed.heightmap.data.length,
    },
    summary: parsed.summary ?? null,
    totalDurationMs: Date.now() - requestStartedAt,
  });
  return NextResponse.json({
    heightmap: parsed.heightmap,
    summary: parsed.summary ?? null,
  });
}
