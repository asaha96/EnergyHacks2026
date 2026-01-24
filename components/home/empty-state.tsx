'use client';

import Link from 'next/link';
import { Sun, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 animate-in fade-in duration-500">
      <div className="relative mb-6 group">
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="relative bg-background border rounded-2xl p-6 shadow-sm group-hover:shadow-md transition-shadow duration-300">
          <Sun className="h-12 w-12 text-primary" strokeWidth={1.5} />
        </div>
      </div>
      
      <h3 className="text-2xl font-semibold tracking-tight mb-2">
        No energy plans yet
      </h3>
      
      <p className="text-muted-foreground max-w-[400px] mb-8 text-balance">
        Start your journey to energy independence by selecting an area on the map to analyze.
      </p>
      
      <Link href="/area-select">
        <Button size="lg" className="rounded-full px-8 shadow-lg hover:shadow-primary/25 transition-all duration-300 flex items-center gap-2">
          Create Your First Plan
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
