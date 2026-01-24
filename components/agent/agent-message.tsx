'use client';

import { motion } from 'framer-motion';
import { Loader2, Check, Info, AlertCircle, Search, Cpu, Zap, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AgentMessageType = 'loading' | 'success' | 'info' | 'error' | 'search' | 'processing' | 'analysis' | 'result';

export interface AgentMessageData {
  id: string;
  type: AgentMessageType;
  text: string;
  timestamp: Date;
}

interface AgentMessageProps {
  message: AgentMessageData;
  className?: string;
}

const iconMap: Record<AgentMessageType, React.ElementType> = {
  loading: Loader2,
  success: Check,
  info: Info,
  error: AlertCircle,
  search: Search,
  processing: Cpu,
  analysis: Zap,
  result: FileText,
};

const iconColorMap: Record<AgentMessageType, string> = {
  loading: 'text-primary',
  success: 'text-emerald-500',
  info: 'text-muted-foreground',
  error: 'text-red-500',
  search: 'text-blue-500',
  processing: 'text-amber-500',
  analysis: 'text-purple-500',
  result: 'text-primary',
};

const bgColorMap: Record<AgentMessageType, string> = {
  loading: 'bg-primary/10',
  success: 'bg-emerald-500/10',
  info: 'bg-muted',
  error: 'bg-red-500/10',
  search: 'bg-blue-500/10',
  processing: 'bg-amber-500/10',
  analysis: 'bg-purple-500/10',
  result: 'bg-primary/10',
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function AgentMessage({ message, className }: AgentMessageProps) {
  const Icon = iconMap[message.type];
  const isLoading = message.type === 'loading';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        type: 'spring', 
        damping: 25, 
        stiffness: 300,
        duration: 0.3 
      }}
      className={cn(
        'flex items-start gap-3 py-3',
        className
      )}
    >
      <div 
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          bgColorMap[message.type]
        )}
      >
        <Icon 
          className={cn(
            'h-4 w-4',
            iconColorMap[message.type],
            isLoading && 'animate-spin'
          )} 
        />
      </div>
      
      <div className="flex-1 min-w-0 pt-0.5">
        <p className={cn(
          'text-sm leading-relaxed',
          message.type === 'error' ? 'text-red-600 dark:text-red-400' : 'text-foreground'
        )}>
          {message.text}
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          {formatRelativeTime(message.timestamp)}
        </p>
      </div>
    </motion.div>
  );
}
