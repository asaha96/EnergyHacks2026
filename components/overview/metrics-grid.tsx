'use client';

import { motion } from 'framer-motion';
import { 
  Zap, 
  Sun, 
  DollarSign, 
  Calendar, 
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricsGridProps {
  systemSizeKw: number;
  annualProductionKwh: number;
  totalCost: number;
  netCost: number;
  paybackYears: number;
  annualSavings: number;
  className?: string;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${Math.round(value / 1000)}k`;
  }
  return `$${value.toLocaleString()}`;
}

function formatLargeNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toLocaleString();
}

function CircularProgress({ 
  value, 
  max, 
  size = 64, 
  strokeWidth = 6,
  className,
}: { 
  value: number; 
  max: number; 
  size?: number; 
  strokeWidth?: number;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(value / max, 1);
  const offset = circumference - progress * circumference;

  return (
    <svg width={size} height={size} className={cn('transform -rotate-90', className)}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted/30"
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
        className="text-primary"
      />
    </svg>
  );
}

function MiniSparkline({ className }: { className?: string }) {
  const points = [12, 18, 14, 22, 19, 28, 24, 32, 28, 35, 30, 38];
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min;
  
  const pathData = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * 100;
      const y = 100 - ((p - min) / range) * 100;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 100" className={cn('w-full h-full', className)} preserveAspectRatio="none">
      <motion.path
        d={pathData}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
      />
    </svg>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

export function MetricsGrid({
  systemSizeKw,
  annualProductionKwh,
  totalCost,
  netCost,
  paybackYears,
  annualSavings,
  className,
}: MetricsGridProps) {
  const savingsPercent = totalCost > 0 ? ((totalCost - netCost) / totalCost) * 100 : 0;
  const roi25Year = annualSavings * 25;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn('space-y-4', className)}
    >
      <motion.div 
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">System Capacity</span>
            </div>
            <div className="flex items-baseline gap-2">
              <motion.span 
                className="text-5xl font-bold tracking-tight text-foreground"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
              >
                {systemSizeKw}
              </motion.span>
              <span className="text-xl text-muted-foreground font-medium">kW</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Total installed capacity
            </p>
          </div>
          
          <div className="relative">
            <CircularProgress value={systemSizeKw} max={100} size={80} strokeWidth={8} />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sun className="h-6 w-6 text-amber-500" />
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-3">
        <motion.div
          variants={itemVariants}
          className="group relative overflow-hidden rounded-xl bg-card border border-border p-4 hover:border-amber-500/30 transition-colors"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-md bg-amber-500/10 flex items-center justify-center">
                <Sun className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Annual Production</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-foreground">{formatLargeNumber(annualProductionKwh)}</span>
              <span className="text-sm text-muted-foreground">kWh</span>
            </div>
            <div className="h-8 mt-2 text-amber-500/60">
              <MiniSparkline />
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="group relative overflow-hidden rounded-xl bg-card border border-border p-4 hover:border-emerald-500/30 transition-colors"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-md bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Investment</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-foreground">{formatCurrency(netCost)}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-0.5">
                <ArrowUpRight className="h-3 w-3" />
                {savingsPercent.toFixed(0)}% saved
              </span>
              <span className="text-xs text-muted-foreground">
                from {formatCurrency(totalCost)}
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="group relative overflow-hidden rounded-xl bg-card border border-border p-4 hover:border-blue-500/30 transition-colors"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-md bg-blue-500/10 flex items-center justify-center">
                <Calendar className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Payback Period</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-foreground">{paybackYears}</span>
              <span className="text-sm text-muted-foreground">years</span>
            </div>
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-blue-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((paybackYears / 25) * 100, 100)}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">of 25-year system life</p>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="group relative overflow-hidden rounded-xl bg-card border border-border p-4 hover:border-violet-500/30 transition-colors"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-md bg-violet-500/10 flex items-center justify-center">
                <TrendingUp className="h-3.5 w-3.5 text-violet-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Annual Savings</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-foreground">{formatCurrency(annualSavings)}</span>
              <span className="text-sm text-muted-foreground">/yr</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="text-violet-600 font-medium">{formatCurrency(roi25Year)}</span> over 25 years
            </p>
          </div>
        </motion.div>
      </div>

    </motion.div>
  );
}
