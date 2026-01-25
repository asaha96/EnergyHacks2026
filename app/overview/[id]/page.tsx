'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
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
import { PlanDetailPanel } from '@/components/overview';
import { usePlanStore } from '@/stores/plan-store';
import type { Plan } from '@/types/plan';
import type { PlacementPlan, PlacementZone } from '@/components/3d';

const TerrainAnalysisScene = dynamic(
  () => import('@/components/3d/terrain-analysis-scene').then((mod) => mod.TerrainAnalysisScene),
  { ssr: false }
);

const AnalysisOverlay = dynamic(
  () => import('@/components/3d/analysis-overlay').then((mod) => mod.AnalysisOverlay),
  { ssr: false }
);

const ZONE_COLORS: Record<PlacementZone['type'], string> = {
  solar: '#f59e0b',
  wind: '#3b82f6',
  battery_storage: '#8b5cf6',
  agrivoltaic: '#10b981',
  pollinator_habitat: '#ec4899',
  buffer: '#6b7280',
};

const ZONE_ICONS: Record<PlacementZone['type'], string> = {
  solar: '\u2600',
  wind: '\u2741',
  battery_storage: '\u26A1',
  agrivoltaic: '\u2618',
  pollinator_habitat: '\u273F',
  buffer: '\u26D4',
};

function getStoredPlacementPlan(planId: string): PlacementPlan | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(`placement-plan-${planId}`);
    if (stored) {
      return JSON.parse(stored) as PlacementPlan;
    }
  } catch {
    console.warn('Failed to load placement plan from localStorage');
  }
  return null;
}

function generateFallbackPlacements(): PlacementPlan {
  return {
    zones: [
      { 
        id: 'solar-main',
        x1: -0.6, z1: -0.2, x2: 0.4, z2: 0.5, 
        type: 'solar', 
        suitability: 92,
        name: 'Primary Solar Array',
        estimatedCapacityMW: 3.2,
        notes: 'Optimal south-facing exposure with minimal shading'
      },
      { 
        id: 'solar-secondary',
        x1: -0.8, z1: 0.5, x2: -0.2, z2: 0.9, 
        type: 'solar', 
        suitability: 85,
        name: 'Secondary Solar Zone',
        estimatedCapacityMW: 1.8,
        notes: 'Good morning sun exposure'
      },
      { 
        id: 'wind-zone',
        x1: 0.5, z1: -0.7, x2: 0.9, z2: -0.2, 
        type: 'wind', 
        suitability: 78,
        name: 'Wind Turbine Area',
        estimatedCapacityMW: 0.5,
        notes: 'Elevated terrain with consistent wind patterns'
      },
      { 
        id: 'battery-storage',
        x1: 0.3, z1: 0.6, x2: 0.7, z2: 0.85, 
        type: 'battery_storage', 
        suitability: 95,
        name: 'Battery Storage',
        estimatedCapacityMW: 2.0,
        notes: 'Central location for grid connection'
      },
      { 
        id: 'buffer-zone',
        x1: -0.9, z1: -0.9, x2: -0.6, z2: -0.5, 
        type: 'buffer', 
        suitability: 100,
        name: 'Setback Buffer',
        notes: 'Required property line setback'
      },
    ],
  };
}

export default function OverviewPage() {
  const router = useRouter();
  const params = useParams();
  const planId = params.id as string;

  const { plans, updatePlan, deletePlan } = usePlanStore();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const placementPlan = useMemo<PlacementPlan>(() => {
    const stored = getStoredPlacementPlan(planId);
    return stored || generateFallbackPlacements();
  }, [planId]);

  const selectedZone = useMemo(() => {
    if (!selectedZoneId) return null;
    return placementPlan.zones.find(z => z.id === selectedZoneId) || null;
  }, [selectedZoneId, placementPlan]);

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
      localStorage.removeItem(`placement-plan-${plan.id}`);
      router.push('/home');
    }
  }, [plan, deletePlan, router]);

  const handleShare = useCallback(() => {
    if (plan) {
      const url = `${window.location.origin}/overview/${plan.id}`;
      navigator.clipboard.writeText(url);
    }
  }, [plan]);

  const handleZoneSelect = useCallback((zone: PlacementZone | null) => {
    setSelectedZoneId(zone?.id || null);
  }, []);

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
      <div className="relative h-[40vh] lg:h-full lg:w-[60%] flex-shrink-0 bg-slate-50">
        <TerrainAnalysisScene
          phase="complete"
          progress={1}
          isVisible={true}
          polygon={polygonCoords}
          className="!right-0"
          externalPlacementPlan={placementPlan}
          onZoneSelect={handleZoneSelect}
          selectedZoneId={selectedZoneId}
        />

        <AnalysisOverlay
          phase="complete"
          progress={1}
          isAnalyzing={false}
          locationName={plan.area.address ? plan.area.address.split(',')[0] : 'Remote Location'}
          areaAcres={plan.area.areaAcres}
          className="!right-0"
          onBack={() => router.push('/home')}
        />

        {selectedZone && (
          <div className="absolute bottom-4 left-4 max-w-sm bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-4 z-20">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{ZONE_ICONS[selectedZone.type]}</span>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">
                    {selectedZone.name || selectedZone.id || 'Zone'}
                  </h3>
                  <p className="text-xs text-gray-500 capitalize">
                    {selectedZone.type.replace('_', ' ')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedZoneId(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Suitability</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${selectedZone.suitability}%`,
                        backgroundColor: ZONE_COLORS[selectedZone.type],
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-700">{selectedZone.suitability}%</span>
                </div>
              </div>

              {selectedZone.estimatedCapacityMW && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Est. Capacity</span>
                  <span className="text-xs font-medium text-gray-700">
                    {selectedZone.estimatedCapacityMW} {selectedZone.type === 'battery_storage' ? 'MWh' : 'MW'}
                  </span>
                </div>
              )}

              {selectedZone.notes && (
                <p className="text-xs text-gray-600 pt-2 border-t border-gray-100">
                  {selectedZone.notes}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 lg:w-[40%] flex flex-col border-l border-border overflow-hidden">
        <header className="shrink-0 z-30 bg-background border-b border-border px-6 py-4">
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
                <DropdownMenuItem onClick={() => { }}>
                  <Download className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShare}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { }}>
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

        <PlanDetailPanel plan={plan} className="flex-1" />
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
    </div>
  );
}
