'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { usePlanStore } from '@/stores/plan-store';
import { AppShell } from '@/components/layout/app-shell';
import { PageTransition } from '@/components/layout/page-transition';
import { Button } from '@/components/ui/button';
import { PlanCard } from '@/components/home/plan-card';
import { EmptyState } from '@/components/home/empty-state';

export default function HomePage() {
  const { plans, initializeSampleData, initialized } = usePlanStore();

  useEffect(() => {
    initializeSampleData();
  }, [initializeSampleData]);

  // Don't render until initialized to avoid hydration mismatch with local storage
  if (!initialized && plans.length === 0) {
    return (
      <AppShell>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-12 w-12 bg-muted rounded-full mb-4"></div>
            <div className="h-4 w-32 bg-muted rounded"></div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageTransition className="flex-1 p-6 md:p-8 lg:p-12 max-w-7xl mx-auto w-full">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 md:mb-12">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Your Plans
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your energy projects and analyses
            </p>
          </div>
          
          {plans.length > 0 && (
            <Link href="/area-select">
              <Button className="shadow-sm hover:shadow-md transition-shadow">
                <Plus className="mr-2 h-4 w-4" />
                New Plan
              </Button>
            </Link>
          )}
        </header>

        {plans.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </PageTransition>
    </AppShell>
  );
}
