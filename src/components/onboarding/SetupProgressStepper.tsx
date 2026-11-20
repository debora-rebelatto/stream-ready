import React from 'react';
import { Check } from 'lucide-react';
import type { SetupStepDefinition } from '../../models';

export interface SetupProgressStepperProps {
  steps: readonly SetupStepDefinition[];
  currentStepIndex: number;
  onSelectStep: (index: number) => void;
}

type StepState = 'completed' | 'active' | 'upcoming';

function resolveStepState(index: number, current: number): StepState {
  if (index === current) return 'active';
  return index < current ? 'completed' : 'upcoming';
}

const PILL_CLASSES: Record<StepState, string> = {
  completed: 'text-emerald-300 hover:bg-emerald-500/10',
  active: 'bg-purple-500/20 border-purple-500/40 text-white',
  upcoming: 'text-gray-400 hover:bg-white/5 hover:text-gray-200',
};

const CIRCLE_CLASSES: Record<StepState, string> = {
  completed: 'bg-emerald-500 text-white',
  active: 'bg-purple-600 text-white',
  upcoming: 'bg-white/10 text-gray-300',
};

const SEGMENT_CLASSES: Record<StepState, string> = {
  completed: 'bg-emerald-500',
  active: 'bg-purple-500',
  upcoming: 'bg-white/10',
};

export const SetupProgressStepper: React.FC<SetupProgressStepperProps> = ({
  steps,
  currentStepIndex,
  onSelectStep,
}) => (
  <>
    <nav aria-label="Setup progress" className="hidden md:flex items-center gap-1.5">
      {steps.map((step, index) => {
        const state = resolveStepState(index, currentStepIndex);
        return (
          <React.Fragment key={step.id}>
            {index > 0 && (
              <span
                aria-hidden="true"
                className={`h-px w-5 ${index <= currentStepIndex ? 'bg-emerald-500/60' : 'bg-white/10'}`}
              />
            )}
            <button
              type="button"
              aria-current={state === 'active' ? 'step' : undefined}
              onClick={() => onSelectStep(index)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-transparent text-xs font-semibold transition-colors cursor-pointer ${PILL_CLASSES[state]}`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${CIRCLE_CLASSES[state]}`}
              >
                {state === 'completed' ? <Check size={12} strokeWidth={3} /> : step.stepNumber}
              </span>
              <span className="whitespace-nowrap">{step.shortTitle}</span>
            </button>
          </React.Fragment>
        );
      })}
    </nav>

    <div className="md:hidden w-full">
      <div className="flex items-center justify-between text-[11px] mb-1.5">
        <span className="font-bold text-purple-300">
          Step {currentStepIndex + 1} of {steps.length}
        </span>
        <span className="text-gray-400 font-medium">{steps[currentStepIndex]?.shortTitle}</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {steps.map((step, index) => (
          <button
            key={step.id}
            type="button"
            aria-label={`Go to step ${step.stepNumber}: ${step.shortTitle}`}
            onClick={() => onSelectStep(index)}
            className={`h-1.5 rounded-full cursor-pointer ${
              SEGMENT_CLASSES[resolveStepState(index, currentStepIndex)]
            }`}
          />
        ))}
      </div>
    </div>
  </>
);
