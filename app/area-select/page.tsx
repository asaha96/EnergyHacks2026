'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Leaf, Crosshair, Ruler, MapPin, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DynamicMap, type TileLayerType, type PolygonCoordinates } from '@/components/map';
import { ConstraintsSidebar, FinancialConstraints, EnergyConstraints, LandConstraints } from '@/components/constraints';
import { Button } from '@/components/ui/button';
import { calculateAreaWithUnits, formatArea, calculateCentroid } from '@/lib/geo';
import { usePlanStore } from '@/stores/plan-store';
import type { FinancingType, EnergyGoal, GridConnection } from '@/types/plan';

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
  const [locationName, setLocationName] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isConstraintsSidebarOpen, setIsConstraintsSidebarOpen] = useState(false);
  const [mapWidth, setMapWidth] = useState('100%');

  const { draftConstraints, updateDraftConstraints } = usePlanStore();

  const budget: [number, number] = [
    draftConstraints?.budget?.min ?? 50000,
    draftConstraints?.budget?.max ?? 150000,
  ];
  const financing: FinancingType = draftConstraints?.budget?.financing ?? 'undecided';
  const paybackPriority: number = draftConstraints?.budget?.paybackPriority ?? 50;

  const handleBudgetChange = useCallback((value: [number, number]) => {
    updateDraftConstraints({
      budget: {
        min: value[0],
        max: value[1],
        financing,
        paybackPriority,
      },
    });
  }, [financing, paybackPriority, updateDraftConstraints]);

  const handleFinancingChange = useCallback((value: FinancingType) => {
    updateDraftConstraints({
      budget: {
        min: budget[0],
        max: budget[1],
        financing: value,
        paybackPriority,
      },
    });
  }, [budget, paybackPriority, updateDraftConstraints]);

  const handlePaybackPriorityChange = useCallback((value: number) => {
    updateDraftConstraints({
      budget: {
        min: budget[0],
        max: budget[1],
        financing,
        paybackPriority: value,
      },
    });
  }, [budget, financing, updateDraftConstraints]);

  const primaryGoal: EnergyGoal = draftConstraints?.energy?.primaryGoal ?? 'offset';
  const targetProduction: number | undefined = draftConstraints?.energy?.targetProduction;
  const gridConnection: GridConnection = draftConstraints?.energy?.gridConnection ?? 'connected';

  const handlePrimaryGoalChange = useCallback((value: EnergyGoal) => {
    updateDraftConstraints({
      energy: {
        primaryGoal: value,
        targetProduction,
        gridConnection,
      },
    });
  }, [targetProduction, gridConnection, updateDraftConstraints]);

  const handleTargetProductionChange = useCallback((value: number | undefined) => {
    updateDraftConstraints({
      energy: {
        primaryGoal,
        targetProduction: value,
        gridConnection,
      },
    });
  }, [primaryGoal, gridConnection, updateDraftConstraints]);

  const handleGridConnectionChange = useCallback((value: GridConnection) => {
    updateDraftConstraints({
      energy: {
        primaryGoal,
        targetProduction,
        gridConnection: value,
      },
    });
  }, [primaryGoal, targetProduction, updateDraftConstraints]);

  const existingStructures: string[] = draftConstraints?.land?.existingStructures ?? [];
  const currentUse: string[] = draftConstraints?.land?.currentUse ?? [];

  const handleStructuresChange = useCallback((value: string[]) => {
    updateDraftConstraints({
      land: {
        exclusionZones: draftConstraints?.land?.exclusionZones ?? [],
        existingStructures: value,
        currentUse,
      },
    });
  }, [currentUse, draftConstraints?.land?.exclusionZones, updateDraftConstraints]);

  const handleLandUseChange = useCallback((value: string[]) => {
    updateDraftConstraints({
      land: {
        exclusionZones: draftConstraints?.land?.exclusionZones ?? [],
        existingStructures,
        currentUse: value,
      },
    });
  }, [existingStructures, draftConstraints?.land?.exclusionZones, updateDraftConstraints]);

  useEffect(() => {
    if (!prospectedArea || prospectedArea.length < 3) {
      setLocationName(null);
      return;
    }

    const centroid = calculateCentroid(prospectedArea);
    setIsLoadingLocation(true);

    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${centroid.lat}&lon=${centroid.lng}&format=json&zoom=14`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.display_name) {
          const parts = data.display_name.split(', ');
          const shortName = parts.slice(0, 3).join(', ');
          setLocationName(shortName);
        } else {
          setLocationName(`${centroid.lat.toFixed(4)}, ${centroid.lng.toFixed(4)}`);
        }
      })
      .catch(() => {
        setLocationName(`${centroid.lat.toFixed(4)}, ${centroid.lng.toFixed(4)}`);
      })
      .finally(() => {
        setIsLoadingLocation(false);
      });
  }, [prospectedArea]);

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

  const handleOpenConstraintsSidebar = useCallback(() => {
    setIsConstraintsSidebarOpen(true);
  }, []);

  const handleCloseConstraintsSidebar = useCallback(() => {
    setIsConstraintsSidebarOpen(false);
  }, []);

  const handleMapWidthChange = useCallback((width: string) => {
    setMapWidth(width);
    // Invalidate map size after transition to ensure proper rendering
    setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 350);
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, width: mapWidth }}
        transition={{ 
          opacity: { duration: 0.5 },
          width: { type: 'spring', damping: 30, stiffness: 300 }
        }}
        className="absolute inset-0"
        style={{ width: mapWidth }}
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
        {!isProspecting && prospectedArea && !isConstraintsSidebarOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute bottom-6 right-6 z-[1000]"
          >
            <div className="bg-background/95 backdrop-blur-sm rounded-2xl shadow-lg border border-border/50 p-5 w-80">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm font-medium text-foreground">
                    Area Selected
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Ruler className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Area</p>
                      <p className="text-xl font-bold text-foreground">
                        {formatArea(calculateAreaWithUnits(prospectedArea).acres)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Location</p>
                      {isLoadingLocation ? (
                        <p className="text-sm text-muted-foreground animate-pulse">
                          Finding location...
                        </p>
                      ) : (
                        <p className="text-sm font-medium text-foreground truncate">
                          {locationName}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <Button 
                    onClick={handleOpenConstraintsSidebar}
                    className="w-full gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Analyze This Area
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleStartProspecting}
                    className="w-full text-muted-foreground"
                  >
                    Redraw Selection
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConstraintsSidebar
        isOpen={isConstraintsSidebarOpen}
        onClose={handleCloseConstraintsSidebar}
        onMapWidthChange={handleMapWidthChange}
      >
        <FinancialConstraints
          budget={budget}
          financing={financing}
          paybackPriority={paybackPriority}
          onBudgetChange={handleBudgetChange}
          onFinancingChange={handleFinancingChange}
          onPaybackPriorityChange={handlePaybackPriorityChange}
          defaultOpen
        />
        <EnergyConstraints
          primaryGoal={primaryGoal}
          targetProduction={targetProduction}
          gridConnection={gridConnection}
          onPrimaryGoalChange={handlePrimaryGoalChange}
          onTargetProductionChange={handleTargetProductionChange}
          onGridConnectionChange={handleGridConnectionChange}
        />
        <LandConstraints
          existingStructures={existingStructures}
          currentUse={currentUse}
          onStructuresChange={handleStructuresChange}
          onLandUseChange={handleLandUseChange}
        />
      </ConstraintsSidebar>
    </div>
  );
}
