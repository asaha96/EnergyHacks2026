'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer as LeafletMapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { cn } from '@/lib/utils';
import { TILE_LAYERS, type TileLayerType } from './tile-layers';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER: L.LatLngExpression = [39.8283, -98.5795];
const DEFAULT_ZOOM = 5;

interface MapContainerProps {
  center?: L.LatLngExpression;
  zoom?: number;
  className?: string;
  tileLayer?: TileLayerType;
  onMapReady?: (map: L.Map) => void;
  children?: React.ReactNode;
}

function MapReadyHandler({ onMapReady }: { onMapReady?: (map: L.Map) => void }) {
  const map = useMap();
  const hasCalledRef = useRef(false);

  useEffect(() => {
    if (onMapReady && !hasCalledRef.current) {
      hasCalledRef.current = true;
      onMapReady(map);
    }
  }, [map, onMapReady]);

  return null;
}

function GeolocationHandler({ enabled }: { enabled: boolean }) {
  const map = useMap();
  const hasTriedRef = useRef(false);

  useEffect(() => {
    if (!enabled || hasTriedRef.current) return;
    hasTriedRef.current = true;

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          map.flyTo(
            [position.coords.latitude, position.coords.longitude],
            12,
            { duration: 1.5 }
          );
        },
        () => {
          console.log('Geolocation not available, using default center');
        },
        { timeout: 5000, maximumAge: 60000 }
      );
    }
  }, [map, enabled]);

  return null;
}

function useLeafletIconFix() {
  const hasFixedRef = useRef(false);
  
  useEffect(() => {
    if (hasFixedRef.current) return;
    hasFixedRef.current = true;
    
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });
  }, []);
}

export function MapContainerComponent({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  className,
  tileLayer = 'positron',
  onMapReady,
  children,
}: MapContainerProps) {
  const [mounted, setMounted] = useState(false);
  const tile = TILE_LAYERS[tileLayer];

  useLeafletIconFix();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn('bg-muted animate-pulse', className)}>
        <div className="h-full w-full flex items-center justify-center">
          <div className="text-muted-foreground">Loading map...</div>
        </div>
      </div>
    );
  }

  return (
    <LeafletMapContainer
      center={center}
      zoom={zoom}
      className={cn('h-full w-full z-0', className)}
      zoomControl={false}
      attributionControl={true}
      scrollWheelZoom={true}
      doubleClickZoom={true}
      touchZoom={true}
      dragging={true}
    >
      <TileLayer
        url={tile.url}
        attribution={tile.attribution}
        maxZoom={19}
      />
      <MapReadyHandler onMapReady={onMapReady} />
      <GeolocationHandler enabled={true} />
      {children}
    </LeafletMapContainer>
  );
}
