'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, StopCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AgentMessageStream } from './agent-message-stream';
import { AgentProgress, type AnalysisPhase } from './agent-progress';
import type { AgentMessageData } from './agent-message';

interface AgentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  onStop?: () => void;
  onComplete?: () => void;
  onMapWidthChange?: (width: string) => void;
  messages: AgentMessageData[];
  currentPhase: AnalysisPhase;
  isAnalyzing: boolean;
  className?: string;
}

export function AgentSidebar({
  isOpen,
  onClose,
  onBack,
  onStop,
  onComplete,
  onMapWidthChange,
  messages,
  currentPhase,
  isAnalyzing,
  className,
}: AgentSidebarProps) {
  const isComplete = currentPhase === 'complete';

  useEffect(() => {
    if (isOpen) {
      onMapWidthChange?.('calc(100% - 420px)');
    } else {
      onMapWidthChange?.('100%');
    }
    
    return () => {
      onMapWidthChange?.('100%');
    };
  }, [isOpen, onMapWidthChange]);

  const handleStop = useCallback(() => {
    onStop?.();
  }, [onStop]);

  const handleViewPlan = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className={cn(
            'fixed right-0 top-0 z-50 flex h-full w-[420px] flex-col',
            'bg-background border-l border-border shadow-2xl',
            'pointer-events-auto',
            className
          )}
          role="complementary"
          aria-label="AI Analysis"
        >
          {/* Header */}
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Go back to constraints"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <h2 className="text-base font-semibold text-foreground">
                AI Analysis
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {isAnalyzing && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <motion.div
                    className="h-2 w-2 rounded-full bg-primary"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <span>Analyzing...</span>
                </div>
              )}
              <button
                onClick={onClose}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Close agent sidebar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          {/* Progress Indicator */}
          <div className="shrink-0 border-b border-border px-6 py-4 bg-muted/30">
            <AgentProgress currentPhase={currentPhase} />
          </div>

          {/* Message Stream */}
          <div className="flex-1 overflow-hidden px-6">
            <AgentMessageStream
              messages={messages}
              className="h-full py-4"
            />
          </div>

          {/* Footer */}
          <footer className="shrink-0 border-t border-border bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <AnimatePresence mode="wait">
              {isComplete ? (
                <motion.div
                  key="complete"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-center gap-2 py-2">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 15, stiffness: 300, delay: 0.1 }}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10"
                    >
                      <svg
                        className="h-5 w-5 text-emerald-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.div>
                    <span className="text-sm font-medium text-foreground">
                      Analysis Complete
                    </span>
                  </div>
                  <Button
                    className="w-full gap-2"
                    size="lg"
                    onClick={handleViewPlan}
                  >
                    View Your Energy Plan
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="analyzing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Button
                    variant="outline"
                    className="w-full gap-2 text-muted-foreground hover:text-foreground"
                    size="lg"
                    onClick={handleStop}
                    disabled={!isAnalyzing}
                  >
                    <StopCircle className="h-4 w-4" />
                    Stop Analysis
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </footer>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
