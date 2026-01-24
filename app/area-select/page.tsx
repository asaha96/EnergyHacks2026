'use client';

import { useState, useCallback, useRef } from 'react';
import L from 'leaflet';
import { motion } from 'framer-motion';
import { ArrowLeft, Leaf } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DynamicMap, MapControls, type TileLayerType } from '@/components/map';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function AreaSelectPage() {
  const router = useRouter();
  const mapRef = useRef<L.Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [tileLayer, setTileLayer] = useState<TileLayerType>('positron');

  const handleMapReady = useCallback((map: L.Map) => {
    mapRef.current = map;
    setIsMapReady(true);
  }, []);

  const handleTileLayerChange = useCallback((layer: TileLayerType) => {
    setTileLayer(layer);
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
            <MapControls
              currentTileLayer={tileLayer}
              onTileLayerChange={handleTileLayerChange}
            />
          )}
        </DynamicMap>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="absolute top-0 left-0 right-0 z-[1000] pointer-events-none"
      >
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4 pointer-events-auto">
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

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: isMapReady ? 1 : 0, scale: isMapReady ? 1 : 0.9 }}
            transition={{ delay: 0.5 }}
            className="pointer-events-auto"
          >
            <div className="bg-background/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-border/50">
              <p className="text-sm text-muted-foreground">
                <span className="hidden sm:inline">Use the search bar to find your property or </span>
                <span className="font-medium text-foreground">pan and zoom</span>
                <span className="hidden sm:inline"> to navigate</span>
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: isMapReady ? 1 : 0, y: isMapReady ? 0 : 20 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className={cn(
          "absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000]",
          "bg-background/95 backdrop-blur-sm rounded-2xl shadow-lg border border-border/50",
          "px-6 py-4"
        )}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-foreground">
              Select Your Land Area
            </span>
          </div>
          <p className="text-xs text-muted-foreground max-w-xs">
            Drawing tools coming next - you&apos;ll be able to outline your property boundaries
          </p>
        </div>
      </motion.div>
    </div>
  );
}
