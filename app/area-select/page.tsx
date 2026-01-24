'use client';

import { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Leaf, Crosshair } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DynamicMap, type TileLayerType, type PolygonCoordinates } from '@/components/map';
import { Button } from '@/components/ui/button';

const MapControls = dynamic(
  () => import('@/components/map/map-internals').then((mod) => mod.MapControls),
  { ssr: false }
);

const AddressSearch = dynamic(
  () => import('@/components/map/map-internals').then((mod) => mod.AddressSearch),
  { ssr: false }
);

const ProspectMode = dynamic(
  () => import('@/components/map/map-internals').then((mod) => mod.ProspectMode),
  { ssr: false }
);

const CompletedPolygon = dynamic(
  () => import('@/components/map/map-internals').then((mod) => mod.CompletedPolygon),
  { ssr: false }
);

export default function AreaSelectPage() {
  const router = useRouter();
  const mapRef = useRef<L.Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [tileLayer, setTileLayer] = useState<TileLayerType>('positron');
  const [isProspecting, setIsProspecting] = useState(false);
  const [prospectedArea, setProspectedArea] = useState<PolygonCoordinates[] | null>(null);

  const handleMapReady = useCallback((map: L.Map) => {
    mapRef.current = map;
    setIsMapReady(true);
  }, []);

  const handleTileLayerChange = useCallback((layer: TileLayerType) => {
    setTileLayer(layer);
  }, []);

  const handleStartProspecting = useCallback(() => {
    setIsProspecting(true);
    setProspectedArea(null);
  }, []);

  const handleProspectComplete = useCallback((coords: PolygonCoordinates[]) => {
    setProspectedArea(coords);
    setIsProspecting(false);
  }, []);

  const handleProspectCancel = useCallback(() => {
    setIsProspecting(false);
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0"
      >
        <DynamicMap
          tileLayer={tileLayer}
          onMapReady={handleMapReady}
          className="h-full w-full"
        >
          {isMapReady && (
            <>
              <AnimatePresence>
                {!isProspecting && (
                  <MapControls
                    currentTileLayer={tileLayer}
                    onTileLayerChange={handleTileLayerChange}
                  />
                )}
              </AnimatePresence>
              
              <AnimatePresence>
                {!isProspecting && (
                  <AddressSearch className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]" />
                )}
              </AnimatePresence>

              <ProspectMode
                isActive={isProspecting}
                onComplete={handleProspectComplete}
                onCancel={handleProspectCancel}
              />

              {!isProspecting && prospectedArea && (
                <CompletedPolygon coordinates={prospectedArea} />
              )}
            </>
          )}
        </DynamicMap>
      </motion.div>

      <AnimatePresence>
        {!isProspecting && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="absolute top-0 left-0 z-[1000] pointer-events-none"
          >
            <div className="p-4 flex items-center gap-4 pointer-events-auto">
              <Button
                variant="secondary"
                size="icon"
                onClick={() => router.push('/home')}
                className="h-10 w-10 rounded-full bg-background/95 backdrop-blur-sm shadow-lg border border-border/50 hover:bg-background"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              
              <div className="flex items-center gap-2 bg-background/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-border/50">
                <Leaf className="h-5 w-5 text-primary" />
                <span className="font-semibold text-foreground">TerraWatt</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isProspecting && !prospectedArea && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000]"
          >
            <div className="bg-background/95 backdrop-blur-sm rounded-2xl shadow-lg border border-border/50 px-6 py-4">
              <div className="flex flex-col items-center gap-4">
                <div className="text-center">
                  <h2 className="text-lg font-semibold text-foreground">
                    Select Your Land
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Navigate to your property, then start prospecting
                  </p>
                </div>

                <Button
                  size="lg"
                  onClick={handleStartProspecting}
                  className="gap-2"
                >
                  <Crosshair className="h-5 w-5" />
                  Start Prospecting
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isProspecting && prospectedArea && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000]"
          >
            <div className="bg-background/95 backdrop-blur-sm rounded-2xl shadow-lg border border-border/50 px-6 py-4">
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  <span className="text-sm font-medium text-foreground">
                    Area Selected
                  </span>
                </div>
                
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {prospectedArea.length} vertices
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Ready for analysis
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleStartProspecting}
                  >
                    Redraw
                  </Button>
                  <Button onClick={() => router.push('/home')}>
                    Continue
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
