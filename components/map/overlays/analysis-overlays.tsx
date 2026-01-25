'use client';

import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import type { PolygonCoordinates } from '../prospect-mode';

export type OverlayType = 
  | 'terrain' 
  | 'solar' 
  | 'wind' 
  | 'exclusion' 
  | 'optimal';

export interface OverlayConfig {
  id: OverlayType;
  label: string;
  description: string;
  colors: string[];
  opacity: number;
}

export const OVERLAY_CONFIGS: Record<OverlayType, OverlayConfig> = {
  terrain: {
    id: 'terrain',
    label: 'Terrain & Elevation',
    description: 'Topography analysis',
    colors: ['#2d5a27', '#8fbc8f', '#f4e04d', '#e67e22', '#c0392b'],
    opacity: 0.5,
  },
  solar: {
    id: 'solar',
    label: 'Solar Irradiance',
    description: 'Sun exposure levels',
    colors: ['#fff7bc', '#fec44f', '#fe9929', '#ec7014', '#cc4c02'],
    opacity: 0.55,
  },
  wind: {
    id: 'wind',
    label: 'Wind Potential',
    description: 'Wind speed patterns',
    colors: ['#deebf7', '#9ecae1', '#4292c6', '#2171b5', '#084594'],
    opacity: 0.5,
  },
  exclusion: {
    id: 'exclusion',
    label: 'Exclusion Zones',
    description: 'Restricted areas',
    colors: ['#e74c3c'],
    opacity: 0.4,
  },
  optimal: {
    id: 'optimal',
    label: 'Optimal Zones',
    description: 'Best placement areas',
    colors: ['#27ae60'],
    opacity: 0.45,
  },
};

interface BaseOverlayProps {
  polygon: PolygonCoordinates[];
  visible: boolean;
  onAnimationComplete?: () => void;
}

function useLeaflet() {
  const [L, setL] = useState<typeof import('leaflet') | null>(null);

  useEffect(() => {
    import('leaflet').then(setL);
  }, []);

  return L;
}

export function TerrainOverlay({ polygon, visible, onAnimationComplete }: BaseOverlayProps) {
  const map = useMap();
  const L = useLeaflet();
  const layersRef = useRef<import('leaflet').Layer[]>([]);
  const animatingRef = useRef(false);

  useEffect(() => {
    if (!L) return;

    if (!visible || animatingRef.current) {
      if (!visible) {
        layersRef.current.forEach(layer => map.removeLayer(layer));
        layersRef.current = [];
      }
      return;
    }

    animatingRef.current = true;
    const config = OVERLAY_CONFIGS.terrain;
    
    const bounds = L.latLngBounds(polygon.map((p) => [p.lat, p.lng] as [number, number]));
    const zones: import('leaflet').LatLngBounds[] = [];
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const latRange = ne.lat - sw.lat;
    const lngRange = ne.lng - sw.lng;
    
    for (let i = 0; i < 12; i++) {
      const centerLat = sw.lat + (Math.random() * latRange);
      const centerLng = sw.lng + (Math.random() * lngRange);
      const size = 0.15 + (Math.random() * 0.25);
      zones.push(L.latLngBounds(
        [centerLat - (latRange * size / 2), centerLng - (lngRange * size / 2)],
        [centerLat + (latRange * size / 2), centerLng + (lngRange * size / 2)]
      ));
    }

    const polygonLayer = L.polygon(
      polygon.map((p) => [p.lat, p.lng] as [number, number]),
      { color: 'transparent', fillColor: config.colors[0], fillOpacity: 0, weight: 0 }
    ).addTo(map);
    layersRef.current.push(polygonLayer);

    zones.forEach((zoneBounds, index) => {
      const colorIndex = Math.floor(Math.random() * config.colors.length);
      
      setTimeout(() => {
        if (!visible) return;
        
        const rect = L.rectangle(zoneBounds, {
          color: 'transparent',
          fillColor: config.colors[colorIndex],
          fillOpacity: 0,
          weight: 0,
        }).addTo(map);
        
        layersRef.current.push(rect);
        
        let opacity = 0;
        const targetOpacity = config.opacity * (0.6 + Math.random() * 0.4);
        const animate = () => {
          if (opacity < targetOpacity) {
            opacity += 0.05;
            rect.setStyle({ fillOpacity: Math.min(opacity, targetOpacity) });
            requestAnimationFrame(animate);
          } else if (index === zones.length - 1) {
            animatingRef.current = false;
            onAnimationComplete?.();
          }
        };
        animate();
      }, index * 80);
    });

    return () => {
      layersRef.current.forEach(layer => map.removeLayer(layer));
      layersRef.current = [];
      animatingRef.current = false;
    };
  }, [L, map, polygon, visible, onAnimationComplete]);

  return null;
}

export function SolarOverlay({ polygon, visible, onAnimationComplete }: BaseOverlayProps) {
  const map = useMap();
  const L = useLeaflet();
  const layersRef = useRef<import('leaflet').Layer[]>([]);
  const animatingRef = useRef(false);

  useEffect(() => {
    if (!L) return;

    if (!visible || animatingRef.current) {
      if (!visible) {
        layersRef.current.forEach(layer => map.removeLayer(layer));
        layersRef.current = [];
      }
      return;
    }

    animatingRef.current = true;
    const config = OVERLAY_CONFIGS.solar;
    
    const bounds = L.latLngBounds(polygon.map((p) => [p.lat, p.lng] as [number, number]));
    const zones: import('leaflet').LatLngBounds[] = [];
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const latRange = ne.lat - sw.lat;
    const lngRange = ne.lng - sw.lng;
    
    for (let i = 0; i < 10; i++) {
      const centerLat = sw.lat + (Math.random() * latRange);
      const centerLng = sw.lng + (Math.random() * lngRange);
      const size = 0.15 + (Math.random() * 0.25);
      zones.push(L.latLngBounds(
        [centerLat - (latRange * size / 2), centerLng - (lngRange * size / 2)],
        [centerLat + (latRange * size / 2), centerLng + (lngRange * size / 2)]
      ));
    }

    zones.forEach((zoneBounds, index) => {
      const colorIndex = Math.min(
        config.colors.length - 1,
        Math.floor(Math.random() * config.colors.length * 1.3)
      );
      
      setTimeout(() => {
        if (!visible) return;
        
        const rect = L.rectangle(zoneBounds, {
          color: 'transparent',
          fillColor: config.colors[Math.min(colorIndex, config.colors.length - 1)],
          fillOpacity: 0,
          weight: 0,
        }).addTo(map);
        
        layersRef.current.push(rect);
        
        let opacity = 0;
        const targetOpacity = config.opacity * (0.7 + Math.random() * 0.3);
        const animate = () => {
          if (opacity < targetOpacity) {
            opacity += 0.04;
            rect.setStyle({ fillOpacity: Math.min(opacity, targetOpacity) });
            requestAnimationFrame(animate);
          } else if (index === zones.length - 1) {
            animatingRef.current = false;
            onAnimationComplete?.();
          }
        };
        animate();
      }, index * 100);
    });

    return () => {
      layersRef.current.forEach(layer => map.removeLayer(layer));
      layersRef.current = [];
      animatingRef.current = false;
    };
  }, [L, map, polygon, visible, onAnimationComplete]);

  return null;
}

export function WindOverlay({ polygon, visible, onAnimationComplete }: BaseOverlayProps) {
  const map = useMap();
  const L = useLeaflet();
  const layersRef = useRef<import('leaflet').Layer[]>([]);
  const animatingRef = useRef(false);

  useEffect(() => {
    if (!L) return;

    if (!visible || animatingRef.current) {
      if (!visible) {
        layersRef.current.forEach(layer => map.removeLayer(layer));
        layersRef.current = [];
      }
      return;
    }

    animatingRef.current = true;
    const config = OVERLAY_CONFIGS.wind;
    
    const bounds = L.latLngBounds(polygon.map((p) => [p.lat, p.lng] as [number, number]));
    const zones: import('leaflet').LatLngBounds[] = [];
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const latRange = ne.lat - sw.lat;
    const lngRange = ne.lng - sw.lng;
    
    for (let i = 0; i < 8; i++) {
      const centerLat = sw.lat + (Math.random() * latRange);
      const centerLng = sw.lng + (Math.random() * lngRange);
      const size = 0.15 + (Math.random() * 0.25);
      zones.push(L.latLngBounds(
        [centerLat - (latRange * size / 2), centerLng - (lngRange * size / 2)],
        [centerLat + (latRange * size / 2), centerLng + (lngRange * size / 2)]
      ));
    }

    zones.forEach((zoneBounds, index) => {
      const colorIndex = Math.floor(Math.random() * config.colors.length);
      
      setTimeout(() => {
        if (!visible) return;
        
        const rect = L.rectangle(zoneBounds, {
          color: 'transparent',
          fillColor: config.colors[colorIndex],
          fillOpacity: 0,
          weight: 0,
        }).addTo(map);
        
        layersRef.current.push(rect);
        
        let opacity = 0;
        const targetOpacity = config.opacity * (0.6 + Math.random() * 0.4);
        const animate = () => {
          if (opacity < targetOpacity) {
            opacity += 0.04;
            rect.setStyle({ fillOpacity: Math.min(opacity, targetOpacity) });
            requestAnimationFrame(animate);
          } else if (index === zones.length - 1) {
            animatingRef.current = false;
            onAnimationComplete?.();
          }
        };
        animate();
      }, index * 90);
    });

    return () => {
      layersRef.current.forEach(layer => map.removeLayer(layer));
      layersRef.current = [];
      animatingRef.current = false;
    };
  }, [L, map, polygon, visible, onAnimationComplete]);

  return null;
}

export function ExclusionOverlay({ polygon, visible, onAnimationComplete }: BaseOverlayProps) {
  const map = useMap();
  const L = useLeaflet();
  const layersRef = useRef<import('leaflet').Layer[]>([]);
  const animatingRef = useRef(false);

  useEffect(() => {
    if (!L) return;

    if (!visible || animatingRef.current) {
      if (!visible) {
        layersRef.current.forEach(layer => map.removeLayer(layer));
        layersRef.current = [];
      }
      return;
    }

    animatingRef.current = true;
    const config = OVERLAY_CONFIGS.exclusion;
    const bounds = L.latLngBounds(polygon.map((p) => [p.lat, p.lng] as [number, number]));
    
    const exclusionZones: import('leaflet').LatLngBounds[] = [];
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const latRange = ne.lat - sw.lat;
    const lngRange = ne.lng - sw.lng;
    
    exclusionZones.push(L.latLngBounds(
      [sw.lat, sw.lng],
      [sw.lat + latRange * 0.15, sw.lng + lngRange * 0.2]
    ));
    
    if (Math.random() > 0.3) {
      const centerLat = sw.lat + latRange * (0.4 + Math.random() * 0.3);
      const centerLng = sw.lng + lngRange * (0.3 + Math.random() * 0.4);
      exclusionZones.push(L.latLngBounds(
        [centerLat - latRange * 0.08, centerLng - lngRange * 0.15],
        [centerLat + latRange * 0.08, centerLng + lngRange * 0.15]
      ));
    }

    exclusionZones.forEach((zoneBounds, index) => {
      setTimeout(() => {
        if (!visible) return;
        
        const rect = L.rectangle(zoneBounds, {
          color: config.colors[0],
          fillColor: config.colors[0],
          fillOpacity: 0,
          weight: 2,
          dashArray: '5, 5',
        }).addTo(map);
        
        layersRef.current.push(rect);
        
        let opacity = 0;
        const targetOpacity = config.opacity;
        const animate = () => {
          if (opacity < targetOpacity) {
            opacity += 0.03;
            rect.setStyle({ fillOpacity: Math.min(opacity, targetOpacity) });
            requestAnimationFrame(animate);
          } else if (index === exclusionZones.length - 1) {
            animatingRef.current = false;
            onAnimationComplete?.();
          }
        };
        animate();
      }, index * 200);
    });

    return () => {
      layersRef.current.forEach(layer => map.removeLayer(layer));
      layersRef.current = [];
      animatingRef.current = false;
    };
  }, [L, map, polygon, visible, onAnimationComplete]);

  return null;
}

export function OptimalOverlay({ polygon, visible, onAnimationComplete }: BaseOverlayProps) {
  const map = useMap();
  const L = useLeaflet();
  const layersRef = useRef<import('leaflet').Layer[]>([]);
  const animatingRef = useRef(false);

  useEffect(() => {
    if (!L) return;

    if (!visible || animatingRef.current) {
      if (!visible) {
        layersRef.current.forEach(layer => map.removeLayer(layer));
        layersRef.current = [];
      }
      return;
    }

    animatingRef.current = true;
    const config = OVERLAY_CONFIGS.optimal;
    const bounds = L.latLngBounds(polygon.map((p) => [p.lat, p.lng] as [number, number]));
    
    const optimalZones: import('leaflet').LatLngBounds[] = [];
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const latRange = ne.lat - sw.lat;
    const lngRange = ne.lng - sw.lng;
    
    const mainLat = sw.lat + latRange * (0.3 + Math.random() * 0.2);
    const mainLng = sw.lng + lngRange * (0.4 + Math.random() * 0.2);
    optimalZones.push(L.latLngBounds(
      [mainLat, mainLng],
      [mainLat + latRange * 0.35, mainLng + lngRange * 0.4]
    ));
    
    const secLat = sw.lat + latRange * (0.55 + Math.random() * 0.2);
    const secLng = sw.lng + lngRange * (0.1 + Math.random() * 0.2);
    optimalZones.push(L.latLngBounds(
      [secLat, secLng],
      [secLat + latRange * 0.25, secLng + lngRange * 0.3]
    ));

    optimalZones.forEach((zoneBounds, index) => {
      setTimeout(() => {
        if (!visible) return;
        
        const rect = L.rectangle(zoneBounds, {
          color: config.colors[0],
          fillColor: config.colors[0],
          fillOpacity: 0,
          weight: 2,
        }).addTo(map);
        
        layersRef.current.push(rect);
        
        let opacity = 0;
        const targetOpacity = config.opacity;
        const animate = () => {
          if (opacity < targetOpacity) {
            opacity += 0.035;
            rect.setStyle({ fillOpacity: Math.min(opacity, targetOpacity) });
            requestAnimationFrame(animate);
          } else if (index === optimalZones.length - 1) {
            animatingRef.current = false;
            onAnimationComplete?.();
          }
        };
        animate();
      }, index * 300);
    });

    return () => {
      layersRef.current.forEach(layer => map.removeLayer(layer));
      layersRef.current = [];
      animatingRef.current = false;
    };
  }, [L, map, polygon, visible, onAnimationComplete]);

  return null;
}
