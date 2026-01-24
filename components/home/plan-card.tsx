'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { MapPin, Calendar, Zap, Trash2, Battery, Leaf } from 'lucide-react';
import { Plan } from '@/types/plan';
import { usePlanStore } from '@/stores/plan-store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface PlanCardProps {
  plan: Plan;
}

export function PlanCard({ plan }: PlanCardProps) {
  const deletePlan = usePlanStore((state) => state.deletePlan);
  const [isHovered, setIsHovered] = useState(false);

  const statusColors = {
    draft: 'bg-muted text-muted-foreground hover:bg-muted/80',
    analyzing: 'bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 dark:text-amber-400',
    complete: 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 dark:text-emerald-400',
  };

  const statusLabels = {
    draft: 'Draft',
    analyzing: 'Analyzing',
    complete: 'Complete',
  };

  const formattedDate = format(new Date(plan.createdAt), 'MMM d, yyyy');

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deletePlan(plan.id);
  };

  return (
    <Link href={`/plan/${plan.id}`} className="block h-full outline-none group/card">
      <Card 
        className={cn(
          "h-full overflow-hidden border transition-all duration-300 relative",
          "hover:border-primary/50 hover:shadow-lg dark:hover:shadow-primary/5",
          "group-hover/card:-translate-y-1"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CardHeader className="pb-3 relative z-10">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1.5 flex-1 min-w-0">
              <Badge 
                variant="secondary" 
                className={cn("mb-2 font-medium border-0", statusColors[plan.status])}
              >
                {statusLabels[plan.status]}
              </Badge>
              <CardTitle className="text-xl leading-tight truncate pr-2 group-hover/card:text-primary transition-colors">
                {plan.name}
              </CardTitle>
              {plan.area.address && (
                <CardDescription className="flex items-center gap-1.5 text-xs truncate">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{plan.area.address}</span>
                </CardDescription>
              )}
            </div>
          </div>
          
          <div className="absolute top-4 right-4 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 z-20">
            <AlertDialog>
              <AlertDialogTrigger
                className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete plan</span>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this plan?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete "{plan.name}" and all associated analysis data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        
        <CardContent className="pb-3">
          {plan.status === 'complete' && plan.analysis ? (
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
                  <Zap className="h-3 w-3" />
                  <span>System Size</span>
                </div>
                <div className="font-semibold text-sm">
                  {plan.analysis.systemSizeKw.toFixed(1)} <span className="text-xs text-muted-foreground font-normal">kW</span>
                </div>
              </div>
              <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
                  <Leaf className="h-3 w-3" />
                  <span>Offset</span>
                </div>
                <div className="font-semibold text-sm">
                  {plan.analysis.co2OffsetTons.toFixed(1)} <span className="text-xs text-muted-foreground font-normal">tons</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[72px] flex items-center justify-center bg-muted/20 rounded-lg border border-dashed border-border/50">
              <p className="text-xs text-muted-foreground italic">
                {plan.status === 'draft' ? 'Complete setup to analyze' : 'Analysis in progress...'}
              </p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="pt-2 pb-4 text-xs text-muted-foreground flex items-center gap-1.5 border-t bg-muted/10">
          <Calendar className="h-3 w-3" />
          <span>Created on {formattedDate}</span>
        </CardFooter>
      </Card>
    </Link>
  );
}
