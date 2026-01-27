'use client';

import { useAppState } from '@/hooks/useAppState';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

const steps = [
  { number: 1, label: 'API Setup', shortLabel: 'Setup' },
  { number: 2, label: 'Upload Book', shortLabel: 'Upload' },
  { number: 3, label: 'Analyze & Review', shortLabel: 'Analyze' },
  { number: 4, label: 'Generate', shortLabel: 'Generate' },
];

export function Stepper() {
  const { currentStep, setCurrentStep, canProceedToStep } = useAppState();

  const handleStepClick = (stepNumber: number) => {
    if (canProceedToStep(stepNumber)) {
      setCurrentStep(stepNumber);
    }
  };

  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.number;
          const isCurrent = currentStep === step.number;
          const isClickable = canProceedToStep(step.number);

          return (
            <div key={step.number} className="flex items-center flex-1">
              {/* Step circle and label */}
              <div
                className={cn(
                  'flex flex-col items-center',
                  isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                )}
                onClick={() => handleStepClick(step.number)}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isCurrent
                      ? 'bg-blue-500 text-white ring-4 ring-blue-200'
                      : 'bg-gray-200 text-gray-500'
                  )}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : step.number}
                </div>
                <span
                  className={cn(
                    'mt-2 text-xs font-medium hidden sm:block',
                    isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                  )}
                >
                  {step.label}
                </span>
                <span
                  className={cn(
                    'mt-2 text-xs font-medium sm:hidden',
                    isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                  )}
                >
                  {step.shortLabel}
                </span>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-1 mx-2 rounded',
                    currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
