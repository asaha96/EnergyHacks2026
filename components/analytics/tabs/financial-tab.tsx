'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  Percent, 
  Calendar, 
  PiggyBank, 
  TrendingUp,
  BadgeCheck,
  Calculator,
  Building,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Plan } from '@/types/plan';

interface FinancialTabProps {
  plan: Plan | null;
  className?: string;
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${value.toFixed(0)}`;
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  gradient: string;
  highlight?: boolean;
}

function MetricCard({ icon, label, value, subtext, gradient, highlight }: MetricCardProps) {
  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        'rounded-xl border border-border bg-card p-4',
        highlight && 'ring-2 ring-primary/20 border-primary/30'
      )}
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

interface IncentiveRowProps {
  name: string;
  amount: number;
  description: string;
}

function IncentiveRow({ name, amount, description }: IncentiveRowProps) {
  return (
    <motion.div
      variants={itemVariants}
      className="flex items-center justify-between py-3 border-b border-border last:border-0"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
          <BadgeCheck className="h-4 w-4 text-emerald-500" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
        -{formatCurrency(amount)}
      </span>
    </motion.div>
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
            Charts will be implemented in Task 8.3
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function FinancialTab({ plan, className }: FinancialTabProps) {
  const planFinancials = plan?.financials;
  const financials = useMemo(() => {
    if (!planFinancials) {
      return {
        totalCost: 0,
        netCost: 0,
        annualSavings: 0,
        paybackYears: 0,
        roi25Year: 0,
        incentives: [],
      };
    }

    return {
      totalCost: planFinancials.totalCost,
      netCost: planFinancials.netCostAfterIncentives,
      annualSavings: planFinancials.annualSavings,
      paybackYears: planFinancials.paybackYears,
      roi25Year: planFinancials.roi25Year,
      incentives: planFinancials.incentives || [],
    };
  }, [planFinancials]);

  const totalIncentives = financials.totalCost - financials.netCost;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      transition={{ staggerChildren: 0.05 }}
      className={cn('p-6 space-y-6', className)}
    >
      <motion.div variants={itemVariants}>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
          Investment Summary
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            icon={<DollarSign className="h-5 w-5" />}
            label="Gross Cost"
            value={formatCurrency(financials.totalCost)}
            subtext="Before incentives"
            gradient="bg-gradient-to-br from-slate-500 to-gray-600"
          />
          <MetricCard
            icon={<PiggyBank className="h-5 w-5" />}
            label="Net Cost"
            value={formatCurrency(financials.netCost)}
            subtext="After incentives"
            gradient="bg-gradient-to-br from-emerald-500 to-teal-500"
            highlight
          />
          <MetricCard
            icon={<Calendar className="h-5 w-5" />}
            label="Payback"
            value={`${financials.paybackYears.toFixed(1)} yrs`}
            subtext="Break-even point"
            gradient="bg-gradient-to-br from-blue-500 to-cyan-500"
          />
          <MetricCard
            icon={<Percent className="h-5 w-5" />}
            label="25-Year ROI"
            value={`${financials.roi25Year.toFixed(0)}%`}
            subtext="Total return"
            gradient="bg-gradient-to-br from-violet-500 to-purple-500"
          />
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="rounded-xl border border-border bg-card">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-foreground">Available Incentives</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tax credits and rebates you may qualify for
            </p>
          </div>
          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            -{formatCurrency(totalIncentives)}
          </span>
        </div>
        <div className="px-4">
          {financials.incentives.length > 0 ? (
            financials.incentives.map((incentive, index) => (
              <IncentiveRow
                key={index}
                name={incentive.name}
                amount={incentive.amount}
                description={incentive.description}
              />
            ))
          ) : (
            <div className="py-8 text-center">
              <Building className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">
                Incentive data will be calculated during analysis
              </p>
            </div>
          )}
        </div>
      </motion.div>

      <PlaceholderChart
        title="25-Year Cash Flow Projection"
        description="Cumulative savings over the system lifetime"
        height="h-56"
      />

      <PlaceholderChart
        title="Cost Breakdown"
        description="Equipment, installation, and other costs"
        height="h-48"
      />

      <motion.div
        variants={itemVariants}
        className="rounded-xl border border-border bg-card p-4"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500">
            <Calculator className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-foreground">
              Financing Scenarios
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              Compare cash purchase, loan, and lease options with different 
              terms to find the best financial fit for your situation.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
