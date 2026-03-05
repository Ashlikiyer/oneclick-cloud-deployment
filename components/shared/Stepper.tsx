/**
 * Stepper Component
 * 
 * Compact horizontal step progress indicator.
 */

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Step {
  id: number;
  title: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className={cn("flex items-center", !isLast && "flex-1")}>
              {/* Step with Label */}
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300',
                    isCompleted
                      ? 'bg-blue-600 text-white'
                      : isCurrent
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                        : 'bg-slate-200 text-slate-500'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    step.id
                  )}
                </div>
                <span
                  className={cn(
                    'text-sm font-medium hidden sm:block',
                    isCurrent ? 'text-slate-900' : isCompleted ? 'text-slate-600' : 'text-slate-400'
                  )}
                >
                  {step.title}
                </span>
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div className="flex-1 mx-3">
                  <div
                    className={cn(
                      'h-0.5 rounded-full transition-all duration-500',
                      isCompleted ? 'bg-blue-600' : 'bg-slate-200'
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
