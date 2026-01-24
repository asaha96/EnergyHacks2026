'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeftRight, 
  TrendingUp,
  Receipt,
  Zap,
  Settings,
  CircleDollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Plan } from '@/types/plan';

interface ComparisonTabProps {
  plan: Plan | null;
  className?: string;
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

type Scenario = 'current' | 'conservative' | 'optimistic';

interface BillComparisonProps {
  currentBill: number;
  projectedBill: number;
}

function BillComparison({ currentBill, projectedBill }: BillComparisonProps) {
  const savings = currentBill - projectedBill;
  const savingsPercent = (savings / currentBill) * 100;

  return (
    <motion.div
      variants={itemVariants}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          Monthly Energy Bill Comparison
        </h3>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 rounded-lg bg-muted/30 border border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Before
            </p>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              ${currentBill}
            </p>
            <p className="text-xs text-muted-foreground mt-1">per month</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-2">
              After
            </p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              ${projectedBill}
            </p>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">per month</p>
          </div>
        </div>
        <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/10 dark:to-teal-950/10 border border-emerald-100 dark:border-emerald-900">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Monthly Savings</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              ${savings}/mo ({savingsPercent.toFixed(0)}%)
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface ScenarioCardProps {
  title: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}

function ScenarioCard({ title, description, isActive, onClick, icon }: ScenarioCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full rounded-xl border p-4 text-left transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive
          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
          : 'border-border bg-card hover:bg-muted/30 hover:border-border/80'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'bg-muted text-muted-foreground'
        )}>
          {icon}
        </div>
        <div>
          <p className={cn(
            'text-sm font-medium',
            isActive ? 'text-primary' : 'text-foreground'
          )}>
            {title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}

function PlaceholderChart({ title, description, height = 'h-48' }: { title: string; description: string; height?: string }) {
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
            Charts will be implemented in Task 8.5
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function ComparisonTab({ plan, className }: ComparisonTabProps) {
  const [activeScenario, setActiveScenario] = useState<Scenario>('current');

  const bills = useMemo(() => {
    const baseMonthlyBill = 250;
    const annualSavings = plan?.financials?.annualSavings || 0;
    const monthlySavings = annualSavings / 12;
    
    return {
      current: baseMonthlyBill,
      projected: Math.max(0, baseMonthlyBill - monthlySavings),
    };
  }, [plan?.financials?.annualSavings]);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      transition={{ staggerChildren: 0.05 }}
      className={cn('p-6 space-y-6', className)}
    >
      <BillComparison
        currentBill={bills.current}
        projectedBill={bills.projected}
      />

      <motion.div variants={itemVariants}>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
          <Settings className="h-4 w-4" />
          What-If Scenarios
        </h3>
        <div className="space-y-2">
          <ScenarioCard
            title="Current Plan"
            description="Based on your selected configuration"
            isActive={activeScenario === 'current'}
            onClick={() => setActiveScenario('current')}
            icon={<CircleDollarSign className="h-4 w-4" />}
          />
          <ScenarioCard
            title="Conservative Estimate"
            description="10% lower production, 10% higher costs"
            isActive={activeScenario === 'conservative'}
            onClick={() => setActiveScenario('conservative')}
            icon={<TrendingUp className="h-4 w-4 rotate-180" />}
          />
          <ScenarioCard
            title="Optimistic Estimate"
            description="10% higher production, additional incentives"
            isActive={activeScenario === 'optimistic'}
            onClick={() => setActiveScenario('optimistic')}
            icon={<Zap className="h-4 w-4" />}
          />
        </div>
      </motion.div>

      <PlaceholderChart
        title="ROI Comparison by Scenario"
        description="How different assumptions affect your return on investment"
        height="h-56"
      />

      <motion.div
        variants={itemVariants}
        className="rounded-xl border border-border bg-card p-4"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-500">
            <ArrowLeftRight className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-foreground">
              Sensitivity Analysis
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              See how changes in energy prices, inflation, or system degradation
              could affect your long-term savings and ROI.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
