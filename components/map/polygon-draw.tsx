'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useMap, Polygon, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { Pentagon, Square, Pencil, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

declare module 'leaflet' {
  interface Polygon {
    editing?: {
      enable: () => void;
      disable: () => void;
    };
  }
}

export interface PolygonCoordinates {
  lat: number;
  lng: number;
}

interface PolygonDrawProps {
  onPolygonChange?: (coordinates: PolygonCoordinates[] | null) => void;
  initialCoordinates?: PolygonCoordinates[];
  className?: string;
}

type DrawMode = 'polygon' | 'rectangle' | 'edit' | null;

const POLYGON_STYLE: L.PathOptions = {
  color: 'oklch(0.60 0.13 163)',
  fillColor: 'oklch(0.60 0.13 163)',
  fillOpacity: 0.2,
  weight: 3,
};

const EDIT_STYLE: L.PathOptions = {
  color: 'oklch(0.70 0.15 162)',
  fillColor: 'oklch(0.70 0.15 162)',
  fillOpacity: 0.25,
  weight: 3,
  dashArray: '5, 5',
};

interface DrawingHandlerProps {
  mode: DrawMode;
  onComplete: (coords: PolygonCoordinates[]) => void;
  onCancel: () => void;
  tempPoints: PolygonCoordinates[];
  setTempPoints: React.Dispatch<React.SetStateAction<PolygonCoordinates[]>>;
}

function DrawingHandler({ mode, onComplete, onCancel, tempPoints, setTempPoints }: DrawingHandlerProps) {
  const rectStartRef = useRef<PolygonCoordinates | null>(null);

  useMapEvents({
    click(e) {
      if (mode === 'polygon') {
        const newPoint = { lat: e.latlng.lat, lng: e.latlng.lng };
        setTempPoints((prev) => [...prev, newPoint]);
      } else if (mode === 'rectangle' && !rectStartRef.current) {
        rectStartRef.current = { lat: e.latlng.lat, lng: e.latlng.lng };
        setTempPoints([rectStartRef.current]);
      }
    },
    mousemove(e) {
      if (mode === 'rectangle' && rectStartRef.current) {
        const start = rectStartRef.current;
        const end = { lat: e.latlng.lat, lng: e.latlng.lng };
        setTempPoints([
          start,
          { lat: start.lat, lng: end.lng },
          end,
          { lat: end.lat, lng: start.lng },
        ]);
      }
    },
    mouseup() {
      if (mode === 'rectangle' && rectStartRef.current && tempPoints.length === 4) {
        onComplete(tempPoints);
        rectStartRef.current = null;
      }
    },
    dblclick(e) {
      if (mode === 'polygon' && tempPoints.length >= 3) {
        L.DomEvent.stopPropagation(e.originalEvent);
        onComplete(tempPoints);
      }
    },
    keydown(e) {
      if (e.originalEvent.key === 'Escape') {
        onCancel();
        rectStartRef.current = null;
      } else if (e.originalEvent.key === 'Enter' && mode === 'polygon' && tempPoints.length >= 3) {
        onComplete(tempPoints);
      }
    },
  });

  return null;
}

export function PolygonDraw({
  onPolygonChange,
  initialCoordinates,
  className,
}: PolygonDrawProps) {
  const map = useMap();
  const [activeMode, setActiveMode] = useState<DrawMode>(null);
  const [coordinates, setCoordinates] = useState<PolygonCoordinates[] | null>(
    initialCoordinates || null
  );
  const [tempPoints, setTempPoints] = useState<PolygonCoordinates[]>([]);
  const polygonRef = useRef<L.Polygon | null>(null);

  const hasPolygon = coordinates && coordinates.length >= 3;

  const clearAll = useCallback(() => {
    setCoordinates(null);
    setTempPoints([]);
    setActiveMode(null);
    onPolygonChange?.(null);
  }, [onPolygonChange]);

  const handleDrawComplete = useCallback((coords: PolygonCoordinates[]) => {
    setCoordinates(coords);
    setTempPoints([]);
    setActiveMode(null);
    onPolygonChange?.(coords);
  }, [onPolygonChange]);

  const handleCancel = useCallback(() => {
    setTempPoints([]);
    setActiveMode(null);
  }, []);

  const startPolygonDraw = useCallback(() => {
    if (activeMode === 'polygon') {
      handleCancel();
      return;
    }
    clearAll();
    setActiveMode('polygon');
    map.getContainer().style.cursor = 'crosshair';
  }, [activeMode, clearAll, handleCancel, map]);

  const startRectangleDraw = useCallback(() => {
    if (activeMode === 'rectangle') {
      handleCancel();
      return;
    }
    clearAll();
    setActiveMode('rectangle');
    map.getContainer().style.cursor = 'crosshair';
  }, [activeMode, clearAll, handleCancel, map]);

  const toggleEdit = useCallback(() => {
    if (activeMode === 'edit') {
      setActiveMode(null);
    } else if (hasPolygon) {
      setActiveMode('edit');
    }
  }, [activeMode, hasPolygon]);

  const finishPolygon = useCallback(() => {
    if (tempPoints.length >= 3) {
      handleDrawComplete(tempPoints);
    }
  }, [tempPoints, handleDrawComplete]);

  useEffect(() => {
    if (!activeMode || activeMode === 'edit') {
      map.getContainer().style.cursor = '';
    }
  }, [activeMode, map]);

  useEffect(() => {
    if (activeMode === 'edit' && polygonRef.current) {
      polygonRef.current.editing?.enable();
    } else if (polygonRef.current) {
      polygonRef.current.editing?.disable();
    }
  }, [activeMode]);

  useEffect(() => {
    if (activeMode === 'edit' && polygonRef.current) {
      const handleEdit = () => {
        if (polygonRef.current) {
          const latLngs = polygonRef.current.getLatLngs()[0] as L.LatLng[];
          const newCoords = latLngs.map((ll) => ({ lat: ll.lat, lng: ll.lng }));
          setCoordinates(newCoords);
          onPolygonChange?.(newCoords);
        }
      };

      polygonRef.current.on('edit', handleEdit);
      return () => {
        polygonRef.current?.off('edit', handleEdit);
      };
    }
  }, [activeMode, onPolygonChange]);

  const displayCoords = activeMode === 'polygon' || activeMode === 'rectangle' 
    ? tempPoints 
    : coordinates;

  return (
    <>
      {(activeMode === 'polygon' || activeMode === 'rectangle') && (
        <DrawingHandler
          mode={activeMode}
          onComplete={handleDrawComplete}
          onCancel={handleCancel}
          tempPoints={tempPoints}
          setTempPoints={setTempPoints}
        />
      )}

      {displayCoords && displayCoords.length >= 2 && (
        <Polygon
          ref={polygonRef}
          positions={displayCoords.map((c) => [c.lat, c.lng] as L.LatLngTuple)}
          pathOptions={activeMode === 'edit' ? EDIT_STYLE : POLYGON_STYLE}
        />
      )}

      {tempPoints.length > 0 && tempPoints.length < 3 && activeMode === 'polygon' && (
        <Polygon
          positions={[...tempPoints, tempPoints[0]].map((c) => [c.lat, c.lng] as L.LatLngTuple)}
          pathOptions={{ ...POLYGON_STYLE, fillOpacity: 0.1, dashArray: '3, 3' }}
        />
      )}

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className={cn(
          'absolute top-1/2 -translate-y-1/2 left-4 z-[1000] flex flex-col gap-2',
          className
        )}
      >
        <div className="bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border border-border/50 p-1.5 flex flex-col gap-1">
          <Button
            variant={activeMode === 'polygon' ? 'default' : 'ghost'}
            size="icon"
            onClick={startPolygonDraw}
            className={cn(
              'h-10 w-10',
              activeMode === 'polygon' && 'bg-primary text-primary-foreground'
            )}
            title="Draw polygon (click points, double-click to finish)"
          >
            <Pentagon className="h-5 w-5" />
          </Button>
          
          <Button
            variant={activeMode === 'rectangle' ? 'default' : 'ghost'}
            size="icon"
            onClick={startRectangleDraw}
            className={cn(
              'h-10 w-10',
              activeMode === 'rectangle' && 'bg-primary text-primary-foreground'
            )}
            title="Draw rectangle (click and drag)"
          >
            <Square className="h-5 w-5" />
          </Button>

          <div className="h-px bg-border my-1" />

          <Button
            variant={activeMode === 'edit' ? 'default' : 'ghost'}
            size="icon"
            onClick={toggleEdit}
            disabled={!hasPolygon}
            className={cn(
              'h-10 w-10',
              activeMode === 'edit' && 'bg-primary text-primary-foreground'
            )}
            title="Edit vertices"
          >
            <Pencil className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={clearAll}
            disabled={!hasPolygon && tempPoints.length === 0}
            className="h-10 w-10 text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Clear drawing"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <AnimatePresence>
          {activeMode === 'polygon' && tempPoints.length >= 3 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Button
                size="sm"
                onClick={finishPolygon}
                className="w-full gap-2"
              >
                <Check className="h-4 w-4" />
                Finish
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {activeMode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border border-border/50 px-3 py-2 max-w-[160px]"
            >
              <p className="text-xs text-muted-foreground">
                {activeMode === 'polygon' && (tempPoints.length < 3 
                  ? 'Click to add points' 
                  : 'Double-click or press Enter to finish')}
                {activeMode === 'rectangle' && 'Click and drag to draw'}
                {activeMode === 'edit' && 'Drag corners to adjust'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
