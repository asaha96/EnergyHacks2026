'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  Satellite, 
  Database, 
  Cpu, 
  Zap, 
  DollarSign, 
  CheckCircle2,
  Loader2,
  Mountain,
  Sun,
  Wind,
  Battery,
  MapPin,
  TrendingUp,
  ArrowLeft,
  X,
  Save,
  Sparkles,
  type LucideIcon
} from 'lucide-react';
import type { AnalysisPhase } from '@/components/agent';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AnalysisOverlayProps {
  phase: AnalysisPhase;
  isAnalyzing: boolean;
  progress: number;
  locationName?: string | null;
  areaAcres?: number;
  onBack?: () => void;
  onStop?: () => void;
  onSave?: () => void;
  isSaving?: boolean;
}

const phases: { 
  id: AnalysisPhase; 
  label: string; 
  icon: LucideIcon;
  description: string;
}[] = [
  { 
    id: 'data-collection', 
    label: 'Data Collection', 
    icon: Satellite,
    description: 'Fetching satellite imagery & terrain data'
  },
  { 
    id: 'constraint-integration', 
    label: 'Constraint Analysis', 
    icon: Database,
    description: 'Mapping boundaries & exclusion zones'
  },
  { 
    id: 'technology-optimization', 
    label: 'Technology Optimization', 
    icon: Cpu,
    description: 'Evaluating solar & wind potential'
  },
  { 
    id: 'system-design', 
    label: 'System Design', 
    icon: Zap,
    description: 'Computing optimal equipment layout'
  },
  { 
    id: 'financial-modeling', 
    label: 'Financial Modeling', 
    icon: DollarSign,
    description: 'Calculating costs & projections'
  },
];

function PhaseIndicator({ 
  phaseInfo, 
  isActive, 
  isComplete,
  index
}: { 
  phaseInfo: typeof phases[0];
  isActive: boolean;
  isComplete: boolean;
  index: number;
}) {
  const IconComponent = phaseInfo.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300",
        isActive && "bg-primary/20 border border-primary/30",
        isComplete && !isActive && "opacity-60",
        !isActive && !isComplete && "opacity-30"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center transition-all",
        isActive && "bg-primary text-primary-foreground shadow-lg shadow-primary/30",
        isComplete && !isActive && "bg-green-500/20 text-green-400",
        !isActive && !isComplete && "bg-muted text-muted-foreground"
      )}>
        {isComplete && !isActive ? (
          <CheckCircle2 className="w-5 h-5" />
        ) : isActive ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <IconComponent className="w-5 h-5" />
          </motion.div>
        ) : (
          <IconComponent className="w-5 h-5" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={[
          "font-medium text-sm",
          isActive ? "text-primary" : "",
          isComplete && !isActive ? "text-green-400" : "",
          !isActive && !isComplete ? "text-muted-foreground" : ""
        ].filter(Boolean).join(" ")}>
          {phaseInfo.label}
        </p>
        {isActive && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="text-xs text-muted-foreground mt-0.5"
          >
            {phaseInfo.description}
          </motion.p>
        )}
      </div>

      {isActive && (
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-2 h-2 rounded-full bg-primary"
        />
      )}
    </motion.div>
  );
}

function MetricCard({
  icon: IconEl,
  label,
  value,
  suffix,
  color,
  delay
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  suffix?: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', damping: 20 }}
      className="bg-background/60 backdrop-blur-md border border-border/50 rounded-xl p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", color)}>
          <IconEl className="w-4 h-4" />
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold">{value}</span>
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
    </motion.div>
  );
}

export function AnalysisOverlay({
  phase,
  isAnalyzing,
  progress,
  locationName,
  areaAcres,
  onBack,
  onStop,
  onSave,
  isSaving
}: AnalysisOverlayProps) {
  const currentPhaseIndex = phases.findIndex(p => p.id === phase);
  const isComplete = phase === 'complete';

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-6 pointer-events-auto">
        <div className="flex items-center justify-between">
          {/* Left - Back button and location */}
          <div className="flex items-center gap-4">
            {onBack && (
              <Button
                variant="secondary"
                size="icon"
                onClick={onBack}
                className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-background/80 backdrop-blur-md border border-border/50 rounded-2xl px-5 py-3 shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Mountain className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Terrain Analysis</p>
                  {locationName && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {locationName}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right - Stop button */}
          {isAnalyzing && onStop && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Button
                variant="destructive"
                size="sm"
                onClick={onStop}
                className="rounded-full gap-2"
              >
                <X className="w-4 h-4" />
                Stop Analysis
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Left Sidebar - Phase Progress */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 w-72 pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-background/80 backdrop-blur-md border border-border/50 rounded-2xl p-4 shadow-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Analysis Progress</h3>
            <span className="text-xs text-primary font-medium">
              {Math.round(progress * 100)}%
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="h-1.5 bg-muted rounded-full mb-4 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary via-primary to-green-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {/* Phase list */}
          <div className="space-y-1">
            {phases.map((p, i) => (
              <PhaseIndicator
                key={p.id}
                phaseInfo={p}
                isActive={p.id === phase}
                isComplete={i < currentPhaseIndex || isComplete}
                index={i}
              />
            ))}
          </div>

          {/* Complete state */}
          <AnimatePresence>
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 space-y-3"
              >
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-green-400">Analysis Complete</p>
                      <p className="text-xs text-muted-foreground">Ready to save your plan</p>
                    </div>
                  </div>
                </div>
                
                {onSave && (
                  <Button
                    onClick={onSave}
                    disabled={isSaving}
                    className="w-full gap-2 bg-gradient-to-r from-primary to-green-500 hover:from-primary/90 hover:to-green-500/90 rounded-xl h-12 text-base font-semibold"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Saving Plan...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Save Your Plan
                      </>
                    )}
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Bottom Stats - Show after technology phase */}
      <AnimatePresence>
        {(currentPhaseIndex >= 2 || isComplete) && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto"
          >
            <div className="flex gap-3">
              <MetricCard
                icon={Sun}
                label="Solar Potential"
                value="1,650"
                suffix="kWh/kW/yr"
                color="bg-amber-500/20 text-amber-400"
                delay={0}
              />
              <MetricCard
                icon={Wind}
                label="Wind Speed"
                value="8.3"
                suffix="mph avg"
                color="bg-blue-500/20 text-blue-400"
                delay={0.1}
              />
              <MetricCard
                icon={Battery}
                label="System Size"
                value="45"
                suffix="kW"
                color="bg-green-500/20 text-green-400"
                delay={0.2}
              />
              <MetricCard
                icon={TrendingUp}
                label="Annual Output"
                value="58.5"
                suffix="MWh"
                color="bg-purple-500/20 text-purple-400"
                delay={0.3}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scanning indicator */}
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-6 right-6 pointer-events-none"
          >
            <div className="flex items-center gap-2 bg-background/80 backdrop-blur-md border border-border/50 rounded-full px-4 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Processing terrain data...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AnalysisOverlay;
