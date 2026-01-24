'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TreePine, 
  Car, 
  Home, 
  Leaf,
  Wind,
  Droplets,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Plan } from '@/types/plan';

interface EnvironmentalTabProps {
  plan: Plan | null;
  className?: string;
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

interface ImpactCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  gradient: string;
  size?: 'normal' | 'large';
}

function ImpactCard({ icon, label, value, subtext, gradient, size = 'normal' }: ImpactCardProps) {
  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        'rounded-xl border border-border bg-card p-4',
        size === 'large' && 'col-span-2'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'flex shrink-0 items-center justify-center rounded-lg',
          gradient,
          size === 'large' ? 'h-12 w-12' : 'h-10 w-10'
        )}>
          <div className="text-white">{icon}</div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p className={cn(
            'mt-1 font-semibold text-foreground tabular-nums',
            size === 'large' ? 'text-2xl' : 'text-xl'
          )}>
            {value}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtext}</p>
        </div>
      </div>
    </motion.div>
  );
}

interface EquivalencyCardProps {
  icon: React.ReactNode;
  value: string;
  description: string;
  color: string;
}

function EquivalencyCard({ icon, value, description, color }: EquivalencyCardProps) {
  return (
    <motion.div
      variants={itemVariants}
      className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
    >
      <div className={cn(
        'flex h-12 w-12 shrink-0 items-center justify-center rounded-full',
        color
      )}>
        {icon}
      </div>
      <div>
        <p className="text-lg font-semibold text-foreground tabular-nums">{value}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </motion.div>
  );
}

export function EnvironmentalTab({ plan, className }: EnvironmentalTabProps) {
  const metrics = useMemo(() => {
    if (!plan?.analysis) {
      return {
        annualCO2: 0,
        lifetimeCO2: 0,
        treesEquivalent: 0,
        carsOffRoad: 0,
        homesPowered: 0,
        gallonsGas: 0,
      };
    }

    const { co2OffsetTons, annualProductionKwh } = plan.analysis;
    const lifetimeCO2 = co2OffsetTons * 25;
    const treesEquivalent = Math.round(co2OffsetTons * 16.5);
    const carsOffRoad = Math.round(co2OffsetTons / 4.6);
    const homesPowered = Math.round(annualProductionKwh / 10500);
    const gallonsGas = Math.round(co2OffsetTons * 113);

    return {
      annualCO2: co2OffsetTons,
      lifetimeCO2,
      treesEquivalent,
      carsOffRoad,
      homesPowered,
      gallonsGas,
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
          Carbon Impact
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <ImpactCard
            icon={<Leaf className="h-6 w-6" />}
            label="Annual CO2 Offset"
            value={`${metrics.annualCO2.toFixed(1)} tons`}
            subtext="Per year"
            gradient="bg-gradient-to-br from-emerald-500 to-green-600"
            size="large"
          />
          <ImpactCard
            icon={<Wind className="h-5 w-5" />}
            label="25-Year Impact"
            value={`${metrics.lifetimeCO2.toFixed(0)} tons`}
            subtext="Lifetime offset"
            gradient="bg-gradient-to-br from-teal-500 to-cyan-500"
          />
          <ImpactCard
            icon={<Droplets className="h-5 w-5" />}
            label="Gas Equivalent"
            value={`${metrics.gallonsGas.toLocaleString()} gal`}
            subtext="Not burned per year"
            gradient="bg-gradient-to-br from-blue-500 to-indigo-500"
          />
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
          Environmental Equivalencies
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Your annual carbon offset is equivalent to:
        </p>
        <div className="space-y-3">
          <EquivalencyCard
            icon={<TreePine className="h-6 w-6 text-emerald-600" />}
            value={`${metrics.treesEquivalent.toLocaleString()} trees`}
            description="Seedlings grown for 10 years"
            color="bg-emerald-100 dark:bg-emerald-500/10"
          />
          <EquivalencyCard
            icon={<Car className="h-6 w-6 text-blue-600" />}
            value={`${metrics.carsOffRoad} cars`}
            description="Taken off the road for one year"
            color="bg-blue-100 dark:bg-blue-500/10"
          />
          <EquivalencyCard
            icon={<Home className="h-6 w-6 text-amber-600" />}
            value={`${metrics.homesPowered} homes`}
            description="Powered for one year"
            color="bg-amber-100 dark:bg-amber-500/10"
          />
        </div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="rounded-xl border border-border bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 p-5"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
            <Globe className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h4 className="text-base font-semibold text-foreground">
              Your Contribution Matters
            </h4>
            <p className="text-sm text-muted-foreground mt-2">
              By generating clean energy on your property, you&apos;re directly contributing 
              to reducing greenhouse gas emissions and building a more sustainable future 
              for your community.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
