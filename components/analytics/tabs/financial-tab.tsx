'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign,
  Percent,
  Calendar,
  PiggyBank,
  BadgeCheck,
  Calculator,
  Building,
  Landmark,
  Zap,
  Sun,
  Wind,
  Battery,
  Cable,
  Wrench,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Plan } from '@/types/plan';
import { CostBreakdownChart } from '../charts/cost-breakdown-chart';
import { CashFlowChart } from '../charts/cash-flow-chart';
import { generateIncentivesData, generateEquipmentData, type IncentiveData, type EquipmentLineItem } from '../charts/financial-data';

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

const INCENTIVE_ICONS: Record<IncentiveData['type'], typeof BadgeCheck> = {
  federal: Landmark,
  state: Building,
  utility: Zap,
  other: BadgeCheck,
};

const INCENTIVE_COLORS: Record<IncentiveData['type'], string> = {
  federal: 'bg-blue-500/10 text-blue-500',
  state: 'bg-violet-500/10 text-violet-500',
  utility: 'bg-amber-500/10 text-amber-500',
  other: 'bg-emerald-500/10 text-emerald-500',
};

function IncentiveRow({ incentive }: { incentive: IncentiveData }) {
  const Icon = INCENTIVE_ICONS[incentive.type];
  const colorClass = INCENTIVE_COLORS[incentive.type];

  return (
    <motion.div
      variants={itemVariants}
      className="flex items-center justify-between py-3 border-b border-border last:border-0"
    >
      <div className="flex items-center gap-3">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', colorClass)}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{incentive.name}</p>
          <p className="text-xs text-muted-foreground">{incentive.description}</p>
        </div>
      </div>
      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
        -{formatCurrency(incentive.amount)}
      </span>
    </motion.div>
  );
}

const CATEGORY_ICONS: Record<EquipmentLineItem['category'], typeof Sun> = {
  solar: Sun,
  wind: Wind,
  storage: Battery,
  bos: Cable,
  installation: Wrench,
};

const CATEGORY_COLORS: Record<EquipmentLineItem['category'], string> = {
  solar: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  wind: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  storage: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  bos: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  installation: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
};

const CATEGORY_LABELS: Record<EquipmentLineItem['category'], string> = {
  solar: 'Solar Equipment',
  wind: 'Wind Equipment',
  storage: 'Energy Storage',
  bos: 'Balance of System',
  installation: 'Installation',
};

function EquipmentRow({ item }: { item: EquipmentLineItem }) {
  const Icon = CATEGORY_ICONS[item.category];
  const colorClass = CATEGORY_COLORS[item.category];

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', colorClass)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
          <p className="text-xs text-muted-foreground truncate">{item.model}</p>
        </div>
      </div>
      <div className="text-right shrink-0 ml-3">
        <p className="text-sm font-semibold text-foreground tabular-nums">
          ${item.totalPrice.toLocaleString()}
        </p>
        {item.quantity > 1 && (
          <p className="text-xs text-muted-foreground">
            {item.quantity} × ${item.unitPrice.toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}

interface EquipmentCategoryProps {
  category: EquipmentLineItem['category'];
  items: EquipmentLineItem[];
  defaultExpanded?: boolean;
}

function EquipmentCategory({ category, items, defaultExpanded = false }: EquipmentCategoryProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const Icon = CATEGORY_ICONS[category];
  const colorClass = CATEGORY_COLORS[category];
  const total = items.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full py-3 px-1 hover:bg-muted/30 transition-colors rounded-lg -mx-1"
      >
        <div className="flex items-center gap-3">
          <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', colorClass)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">{CATEGORY_LABELS[category]}</p>
            <p className="text-xs text-muted-foreground">{items.length} item{items.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground tabular-nums">
            ${total.toLocaleString()}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pb-3 pl-11">
              {items.map((item) => (
                <EquipmentRow key={item.id} item={item} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FinancialTab({ plan, className }: FinancialTabProps) {
  const financials = useMemo(() => {
    // HARDCODED DEMO DATA
    return {
      totalCost: 6500000,
      netCost: 4550000,
      annualSavings: 1297006,
      paybackYears: 3.51,
      roi25Year: 32.0,
    };
  }, []);

  const incentives = useMemo(() => [
    {
      type: 'federal',
      name: 'Federal Investment Tax Credit (ITC)',
      description: '30% tax credit for renewable energy systems',
      amount: 1950000, // 30% of 6.5M
    } as IncentiveData
  ], []);

  const totalIncentives = 1950000;

  const equipmentTotal = 6500000;

  // Mock equipment categorization
  const equipmentByCategory = useMemo(() => {
    return {
      solar: [{ id: '1', name: 'Utility Scale PV Modules', model: 'High Efficiency Monocrystalline', category: 'solar' as const, quantity: 10000, unitPrice: 325, totalPrice: 3250000 }],
      wind: [] as EquipmentLineItem[],
      storage: [] as EquipmentLineItem[],
      bos: [{ id: '2', name: 'Racking & Mounting', model: 'Ground Mount System', category: 'bos' as const, quantity: 1, unitPrice: 1300000, totalPrice: 1300000 }],
      installation: [{ id: '3', name: 'Labor & Installation', model: 'Site Prep & Electrical', category: 'installation' as const, quantity: 1, unitPrice: 1300000, totalPrice: 1300000 },
      { id: '4', name: 'Inverters', model: 'Utility String Inverters', category: 'bos' as const, quantity: 50, unitPrice: 13000, totalPrice: 650000 }]
    };
  }, []);

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
          {incentives.length > 0 ? (
            incentives.map((incentive, index) => (
              <IncentiveRow key={index} incentive={incentive} />
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

      <motion.div variants={itemVariants} className="rounded-xl border border-border bg-card">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-foreground">Equipment & Materials</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Detailed breakdown of system components
            </p>
          </div>
          <span className="text-sm font-semibold text-foreground tabular-nums">
            ${equipmentTotal.toLocaleString()}
          </span>
        </div>
        <div className="px-4 py-2">
          {(Object.keys(equipmentByCategory) as EquipmentLineItem['category'][])
            .filter(category => equipmentByCategory[category].length > 0)
            .map((category, index) => (
              <EquipmentCategory
                key={category}
                category={category}
                items={equipmentByCategory[category]}
                defaultExpanded={index === 0}
              />
            ))}
        </div>
      </motion.div>

      <CashFlowChart plan={plan} />

      <CostBreakdownChart plan={plan} />

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
