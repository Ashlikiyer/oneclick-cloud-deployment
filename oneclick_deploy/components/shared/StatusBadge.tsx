/**
 * StatusBadge Component
 * 
 * Visual indicator for EC2 instance states.
 */

import { cn } from '@/lib/utils';
import type { InstanceState } from '@/domain/deployment';

interface StatusBadgeProps {
  state: InstanceState;
  className?: string;
}

const stateConfig: Record<InstanceState, { 
  label: string; 
  bgColor: string; 
  textColor: string; 
  dotColor: string;
  pulse?: boolean;
}> = {
  pending: {
    label: 'Pending',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    dotColor: 'bg-amber-500',
    pulse: true,
  },
  running: {
    label: 'Running',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    dotColor: 'bg-emerald-500',
  },
  stopping: {
    label: 'Stopping',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    dotColor: 'bg-orange-500',
    pulse: true,
  },
  stopped: {
    label: 'Stopped',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-600',
    dotColor: 'bg-slate-400',
  },
  'shutting-down': {
    label: 'Shutting Down',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    dotColor: 'bg-red-500',
    pulse: true,
  },
  terminated: {
    label: 'Terminated',
    bgColor: 'bg-red-50',
    textColor: 'text-red-600',
    dotColor: 'bg-red-400',
  },
};

export function StatusBadge({ state, className }: StatusBadgeProps) {
  const config = stateConfig[state] || stateConfig.pending;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
        config.bgColor,
        config.textColor,
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        {config.pulse && (
          <span 
            className={cn(
              'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
              config.dotColor
            )} 
          />
        )}
        <span className={cn('relative inline-flex rounded-full h-2 w-2', config.dotColor)} />
      </span>
      {config.label}
    </span>
  );
}
