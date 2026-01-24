'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useMap, Polygon, useMapEvents, Circle } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crosshair, 
  Pentagon, 
  Square, 
  Undo2, 
  Trash2, 
  Check,
  X,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface PolygonCoordinates {
  lat: number;
  lng: number;
}

type ProspectTool = 'polygon' | 'rectangle';

interface ProspectModeProps {
  isActive: boolean;
  onComplete: (coordinates: PolygonCoordinates[]) => void;
  onCancel: () => void;
  className?: string;
}

const POLYGON_STYLE: L.PathOptions = {
  color: 'oklch(0.60 0.13 163)',
  fillColor: 'oklch(0.60 0.13 163)',
  fillOpacity: 0.25,
  weight: 3,
};

const PREVIEW_STYLE: L.PathOptions = {
  color: 'oklch(0.70 0.15 162)',
  fillColor: 'oklch(0.70 0.15 162)',
  fillOpacity: 0.15,
  weight: 2,
  dashArray: '6, 6',
};

const VERTEX_STYLE = {
  radius: 6,
  color: 'oklch(0.60 0.13 163)',
  fillColor: 'white',
  fillOpacity: 1,
  weight: 2,
};

function MapInteractionController({ disabled }: { disabled: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (disabled) {
      map.dragging.disable();
      map.doubleClickZoom.disable();
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.dragging.enable();
      map.doubleClickZoom.enable();
      map.getContainer().style.cursor = '';
    }

    return () => {
      map.dragging.enable();
      map.doubleClickZoom.enable();
      map.getContainer().style.cursor = '';
    };
  }, [map, disabled]);

  return null;
}

interface DrawingHandlerProps {
  tool: ProspectTool;
  points: PolygonCoordinates[];
  setPoints: React.Dispatch<React.SetStateAction<PolygonCoordinates[]>>;
  onComplete: () => void;
}

function DrawingHandler({ tool, points, setPoints, onComplete }: DrawingHandlerProps) {
  const map = useMap();
  const rectStartRef = useRef<PolygonCoordinates | null>(null);
  const [previewPoint, setPreviewPoint] = useState<PolygonCoordinates | null>(null);

  useEffect(() => {
    const container = map.getContainer();
    
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      if (tool === 'polygon' && points.length >= 3) {
        onComplete();
      }
    };

    container.addEventListener('contextmenu', handleContextMenu);
    return () => container.removeEventListener('contextmenu', handleContextMenu);
  }, [map, tool, points.length, onComplete]);

  useMapEvents({
    click(e) {
      if (tool === 'polygon') {
        const newPoint = { lat: e.latlng.lat, lng: e.latlng.lng };
        setPoints((prev) => [...prev, newPoint]);
      } else if (tool === 'rectangle' && !rectStartRef.current) {
        rectStartRef.current = { lat: e.latlng.lat, lng: e.latlng.lng };
        setPoints([rectStartRef.current]);
      }
    },
    mousemove(e) {
      if (tool === 'polygon' && points.length > 0) {
        setPreviewPoint({ lat: e.latlng.lat, lng: e.latlng.lng });
      } else if (tool === 'rectangle' && rectStartRef.current) {
        const start = rectStartRef.current;
        const end = { lat: e.latlng.lat, lng: e.latlng.lng };
        setPoints([
          start,
          { lat: start.lat, lng: end.lng },
          end,
          { lat: end.lat, lng: start.lng },
        ]);
      } else {
        setPreviewPoint(null);
      }
    },
    mouseup() {
      if (tool === 'rectangle' && rectStartRef.current && points.length === 4) {
        onComplete();
        rectStartRef.current = null;
      }
    },
  });

  const previewPositions = points.length > 0 && previewPoint && tool === 'polygon'
    ? [...points, previewPoint].map((c) => [c.lat, c.lng] as L.LatLngTuple)
    : null;

  return (
    <>
      {previewPositions && previewPositions.length >= 2 && (
        <Polygon positions={previewPositions} pathOptions={PREVIEW_STYLE} />
      )}
    </>
  );
}

interface CompletedPolygonProps {
  coordinates: PolygonCoordinates[];
}

export function CompletedPolygon({ coordinates }: CompletedPolygonProps) {
  if (!coordinates || coordinates.length < 3) return null;

  return (
    <Polygon
      positions={coordinates.map((c) => [c.lat, c.lng] as L.LatLngTuple)}
      pathOptions={POLYGON_STYLE}
    />
  );
}

export function ProspectMode({
  isActive,
  onComplete,
  onCancel,
  className,
}: ProspectModeProps) {
  const [tool, setTool] = useState<ProspectTool>('polygon');
  const [points, setPoints] = useState<PolygonCoordinates[]>([]);
  const canComplete = tool === 'polygon' ? points.length >= 3 : points.length === 4;

  const handleUndo = useCallback(() => {
    if (tool === 'polygon') {
      setPoints((prev) => prev.slice(0, -1));
    }
  }, [tool]);

  const handleClear = useCallback(() => {
    setPoints([]);
  }, []);

  const handleComplete = useCallback(() => {
    if (canComplete) {
      onComplete(points);
    }
  }, [canComplete, points, onComplete]);

  const handleCancel = useCallback(() => {
    setPoints([]);
    onCancel();
  }, [onCancel]);

  useEffect(() => {
    if (!isActive) {
      setPoints([]);
      setTool('polygon');
    }
  }, [isActive]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;
      
      if (e.key === 'Escape') {
        if (points.length > 0) {
          handleClear();
        } else {
          handleCancel();
        }
      } else if (e.key === 'Enter' && canComplete) {
        handleComplete();
      } else if ((e.key === 'z' || e.key === 'Z') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, points.length, canComplete, handleClear, handleCancel, handleComplete, handleUndo]);

  if (!isActive) return null;

  return (
    <>
      <MapInteractionController disabled={isActive} />
      
      <DrawingHandler
        tool={tool}
        points={points}
        setPoints={setPoints}
        onComplete={handleComplete}
      />

      {points.length >= 2 && (
        <Polygon
          positions={points.map((c) => [c.lat, c.lng] as L.LatLngTuple)}
          pathOptions={POLYGON_STYLE}
        />
      )}

      {points.map((point, index) => (
        <Circle
          key={`vertex-${index}`}
          center={[point.lat, point.lng]}
          {...VERTEX_STYLE}
        />
      ))}

      <div className="absolute inset-0 pointer-events-none z-[999]">
        <div className="absolute inset-x-0 top-0 h-1 bg-primary/50" />
        <div className="absolute inset-x-0 bottom-0 h-1 bg-primary/50" />
        <div className="absolute inset-y-0 left-0 w-1 bg-primary/50" />
        <div className="absolute inset-y-0 right-0 w-1 bg-primary/50" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="absolute top-20 left-1/2 -translate-x-1/2 z-[1001]"
      >
        <div className="bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <Crosshair className="h-4 w-4" />
          <span className="text-sm font-medium">Prospecting Mode</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className={cn(
          'absolute top-1/2 -translate-y-1/2 left-4 z-[1001]',
          className
        )}
      >
        <div className="bg-background/95 backdrop-blur-sm rounded-xl shadow-lg border border-border/50 p-2 flex flex-col gap-1">
          <div className="px-2 py-1 mb-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Tool
            </span>
          </div>
          
          <Button
            variant={tool === 'polygon' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => { setTool('polygon'); handleClear(); }}
            className={cn(
              'justify-start gap-2',
              tool === 'polygon' && 'bg-primary text-primary-foreground'
            )}
          >
            <Pentagon className="h-4 w-4" />
            Polygon
          </Button>
          
          <Button
            variant={tool === 'rectangle' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => { setTool('rectangle'); handleClear(); }}
            className={cn(
              'justify-start gap-2',
              tool === 'rectangle' && 'bg-primary text-primary-foreground'
            )}
          >
            <Square className="h-4 w-4" />
            Rectangle
          </Button>

          <div className="h-px bg-border my-2" />

          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={points.length === 0 || tool === 'rectangle'}
            className="justify-start gap-2"
          >
            <Undo2 className="h-4 w-4" />
            Undo
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={points.length === 0}
            className="justify-start gap-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1001]"
      >
        <div className="bg-background/95 backdrop-blur-sm rounded-2xl shadow-lg border border-border/50 px-6 py-4">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">
                {tool === 'polygon' ? (
                  points.length === 0 
                    ? 'Click on the map to start outlining your property'
                    : points.length < 3
                      ? `${3 - points.length} more point${3 - points.length > 1 ? 's' : ''} needed`
                      : `${points.length} points - click more or confirm`
                ) : (
                  points.length === 0
                    ? 'Click and drag to draw a rectangle'
                    : 'Release to confirm rectangle'
                )}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>

              <Button
                size="sm"
                onClick={handleComplete}
                disabled={!canComplete}
                className="gap-2"
              >
                <Check className="h-4 w-4" />
                Confirm Area
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              {canComplete ? (
                <>
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Right-click</kbd> or{' '}
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd> to confirm
                </>
              ) : (
                <>
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Esc</kbd> to cancel
                </>
              )}
            </p>
          </div>
        </div>
      </motion.div>
    </>
  );
}
