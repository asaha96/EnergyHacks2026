'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sun, Calendar, Clock, TrendingUp, Zap, CloudSun } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Plan } from '@/types/plan';

interface ProductionTabProps {
  plan: Plan | null;
  className?: string;
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  gradient: string;
}

function MetricCard({ icon, label, value, subtext, gradient }: MetricCardProps) {
  return (
    <motion.div
      variants={itemVariants}
      className="rounded-xl border border-border bg-card p-4"
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          gradient
        )}>
          <div className="text-white">{icon}</div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p className="mt-1 text-xl font-semibold text-foreground tabular-nums">
            {value}
          </p>
          {subtext && (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtext}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface PlaceholderChartProps {
  title: string;
  description: string;
  height?: string;
}

function PlaceholderChart({ title, description, height = 'h-48' }: PlaceholderChartProps) {
  return (
    <motion.div
      variants={itemVariants}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className={cn(
        'flex items-center justify-center bg-muted/10',
        height
      )}>
        <div className="text-center px-6">
          <div className="flex justify-center mb-3">
            <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-muted-foreground/50" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Charts will be implemented in Task 8.2
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Using Recharts for visualizations
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function ProductionTab({ plan, className }: ProductionTabProps) {
  const metrics = useMemo(() => {
    if (!plan?.analysis) {
      return {
        systemSize: '0 kW',
        annualProduction: '0 kWh',
        monthlyAverage: '0 kWh',
        peakOutput: '0 kW',
        capacityFactor: '0%',
        specificYield: '0 kWh/kWp',
      };
    }

    const { systemSizeKw, annualProductionKwh } = plan.analysis;
    const monthlyAvg = annualProductionKwh / 12;
    const peakOutput = systemSizeKw * 0.85;
    const capacityFactor = (annualProductionKwh / (systemSizeKw * 8760)) * 100;
    const specificYield = annualProductionKwh / systemSizeKw;

    return {
      systemSize: `${systemSizeKw.toFixed(1)} kW`,
      annualProduction: `${(annualProductionKwh / 1000).toFixed(1)}k kWh`,
      monthlyAverage: `${(monthlyAvg / 1000).toFixed(1)}k kWh`,
      peakOutput: `${peakOutput.toFixed(1)} kW`,
      capacityFactor: `${capacityFactor.toFixed(1)}%`,
      specificYield: `${specificYield.toFixed(0)} kWh/kWp`,
    };
  }, [plan?.analysis]);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      transition={{ staggerChildren: 0.05 }}
      className={cn('p-6 space-y-6', className)}
    >
      <motion.div variants={itemVariants}>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
          Production Overview
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            icon={<Zap className="h-5 w-5" />}
            label="System Size"
            value={metrics.systemSize}
            subtext="Peak DC capacity"
            gradient="bg-gradient-to-br from-amber-500 to-orange-500"
          />
          <MetricCard
            icon={<Sun className="h-5 w-5" />}
            label="Annual Output"
            value={metrics.annualProduction}
            subtext="Estimated yearly"
            gradient="bg-gradient-to-br from-yellow-500 to-amber-500"
          />
          <MetricCard
            icon={<Calendar className="h-5 w-5" />}
            label="Monthly Avg"
            value={metrics.monthlyAverage}
            subtext="Per month average"
            gradient="bg-gradient-to-br from-blue-500 to-cyan-500"
          />
          <MetricCard
            icon={<Clock className="h-5 w-5" />}
            label="Capacity Factor"
            value={metrics.capacityFactor}
            subtext="Utilization rate"
            gradient="bg-gradient-to-br from-emerald-500 to-teal-500"
          />
        </div>
      </motion.div>

      <PlaceholderChart
        title="Monthly Production Forecast"
        description="Estimated energy production by month, accounting for seasonal variations"
        height="h-56"
      />

      <PlaceholderChart
        title="Daily Production Profile"
        description="Average hourly output throughout a typical day"
        height="h-48"
      />

      <motion.div
        variants={itemVariants}
        className="rounded-xl border border-border bg-card p-4"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-500">
            <CloudSun className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-foreground">
              Weather Impact Analysis
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              Production estimates account for historical weather patterns, cloud cover, 
              and seasonal sun angles specific to your location.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
