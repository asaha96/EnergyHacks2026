'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import L from 'leaflet';
import { 
  ArrowLeft, 
  Leaf, 
  MoreHorizontal, 
  Download, 
  Share2, 
  Copy, 
  Trash2,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DynamicMap, type TileLayerType, type EquipmentPlacement } from '@/components/map';
import { OptimalOverlay } from '@/components/map/overlays';
import { MetricsGrid, SectionNavigation } from '@/components/overview';
import { AnalyticsSidebar } from '@/components/analytics';
import { usePlanStore } from '@/stores/plan-store';
import type { Plan } from '@/types/plan';

const CompletedPolygon = dynamic(
  () => import('@/components/map/map-internals').then((mod) => mod.CompletedPolygon),
  { ssr: false }
);

const EquipmentMarkerGroup = dynamic(
  () => import('@/components/map/markers/equipment-marker').then((mod) => mod.EquipmentMarkerGroup),
  { ssr: false }
);

const MapControls = dynamic(
  () => import('@/components/map/map-internals').then((mod) => mod.MapControls),
  { ssr: false }
);

export default function OverviewPage() {
  const router = useRouter();
  const params = useParams();
  const planId = params.id as string;
  
  const { plans, updatePlan, deletePlan } = usePlanStore();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [tileLayer, setTileLayer] = useState<TileLayerType>('satellite');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (planId) {
      const found = plans.find(p => p.id === planId);
      if (found) {
        setPlan(found);
        setEditedName(found.name);
      } else {
        router.push('/home');
      }
    } else {
      router.push('/home');
    }
  }, [planId, plans, router]);

  const handleMapReady = useCallback((map: L.Map) => {
    mapRef.current = map;
    setIsMapReady(true);
    
    if (plan?.area?.center) {
      map.setView([plan.area.center.lat, plan.area.center.lng], 17);
    }
  }, [plan?.area?.center]);

  const handleTileLayerChange = useCallback((layer: TileLayerType) => {
    setTileLayer(layer);
  }, []);

  const handleStartEditName = useCallback(() => {
    setIsEditingName(true);
    setEditedName(plan?.name || '');
  }, [plan?.name]);

  const handleSaveName = useCallback(() => {
    if (plan && editedName.trim()) {
      updatePlan(plan.id, { name: editedName.trim() });
    }
    setIsEditingName(false);
  }, [plan, editedName, updatePlan]);

  const handleCancelEditName = useCallback(() => {
    setIsEditingName(false);
    setEditedName(plan?.name || '');
  }, [plan?.name]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      handleCancelEditName();
    }
  }, [handleSaveName, handleCancelEditName]);

  const handleDelete = useCallback(() => {
    if (plan) {
      deletePlan(plan.id);
      router.push('/home');
    }
  }, [plan, deletePlan, router]);

  const handleShare = useCallback(() => {
    if (plan) {
      const url = `${window.location.origin}/overview/${plan.id}`;
      navigator.clipboard.writeText(url);
    }
  }, [plan]);

  const equipmentPlacements: EquipmentPlacement[] = plan?.analysis?.equipmentPlacements?.map(ep => ({
    id: ep.equipmentId,
    type: ep.equipmentId.includes('solar') ? 'solar-array' :
          ep.equipmentId.includes('wind') ? 'wind-turbine' :
          ep.equipmentId.includes('battery') ? 'battery' :
          ep.equipmentId.includes('inverter') ? 'inverter' : 'meter',
    position: ep.position,
    label: ep.equipmentId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    details: {
      orientation: ep.orientation,
    },
  })) || [];

  if (!plan) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading plan...</div>
      </div>
    );
  }

  const polygonCoords = plan.area.coordinates.map(c => ({ lat: c.lat, lng: c.lng }));

  return (
    <div className="h-screen w-screen overflow-hidden bg-background flex flex-col lg:flex-row">
      <div className="relative h-[40vh] lg:h-full lg:w-[60%] flex-shrink-0">
        <DynamicMap
          tileLayer={tileLayer}
          onMapReady={handleMapReady}
          className="h-full w-full"
          center={plan.area.center ? [plan.area.center.lat, plan.area.center.lng] : undefined}
          zoom={17}
        >
          {isMapReady && (
            <>
              <MapControls
                currentTileLayer={tileLayer}
                onTileLayerChange={handleTileLayerChange}
              />
              
              <CompletedPolygon coordinates={polygonCoords} />
              
              <OptimalOverlay
                polygon={polygonCoords}
                visible={true}
              />
              
              {equipmentPlacements.length > 0 && (
                <EquipmentMarkerGroup
                  placements={equipmentPlacements}
                  staggerDelay={0}
                />
              )}
            </>
          )}
        </DynamicMap>

        <div className="absolute top-4 left-4 z-[1000]">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => router.push('/home')}
            className="h-10 w-10 rounded-full bg-background/95 backdrop-blur-sm shadow-lg border border-border/50 hover:bg-background"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        <div className="absolute top-4 left-16 z-[1000]">
          <div className="flex items-center gap-2 bg-background/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-border/50">
            <Leaf className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">TerraWatt</span>
          </div>
        </div>
      </div>

      <div className="flex-1 lg:w-[40%] overflow-y-auto border-l border-border">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {isEditingName ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className="flex-1 px-3 py-1.5 text-lg font-semibold bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button size="icon" variant="ghost" onClick={handleSaveName} className="h-8 w-8">
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={handleCancelEditName} className="h-8 w-8">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <button
                  onClick={handleStartEditName}
                  className="flex items-center gap-2 min-w-0 group"
                >
                  <h1 className="text-lg font-semibold text-foreground truncate">
                    {plan.name}
                  </h1>
                  <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => {}}>
                  <Download className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShare}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {}}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Plan
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {plan.area.address && (
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {plan.area.address}
            </p>
          )}
        </header>

        <div className="p-6 space-y-6">
          <MetricsGrid
            systemSizeKw={plan.analysis?.systemSizeKw || 0}
            annualProductionKwh={plan.analysis?.annualProductionKwh || 0}
            totalCost={plan.financials?.totalCost || 0}
            netCost={plan.financials?.netCostAfterIncentives || 0}
            paybackYears={plan.financials?.paybackYears || 0}
            annualSavings={plan.financials?.annualSavings || 0}
            co2OffsetTons={plan.analysis?.co2OffsetTons || 0}
          />

          <SectionNavigation
            onAnalyticsClick={() => setShowAnalytics(true)}
            onBillingClick={() => {}}
            onImplementationClick={() => {}}
          />

          <section className="pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Created {new Date(plan.createdAt).toLocaleDateString()}</span>
              <span>{plan.area.areaAcres.toFixed(2)} acres</span>
            </div>
          </section>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{plan.name}&quot; and all associated data. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AnalyticsSidebar
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        plan={plan}
      />
    </div>
  );
}
