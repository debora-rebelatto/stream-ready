import React, { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles, X } from 'lucide-react';
import { useSetupWizardController } from '../../controllers';
import type { SetupWizardMode } from '../../models';
import { Badge, Button } from '../common';
import { SetupProgressStepper } from './SetupProgressStepper';
import { SetupStepWelcome } from './SetupStepWelcome';
import { SetupStepInstallStremio } from './SetupStepInstallStremio';
import { SetupStepFeaturesTour } from './SetupStepFeaturesTour';
import { SetupStepNotifications } from './SetupStepNotifications';
import { SetupStepFirstMovies } from './SetupStepFirstMovies';

export interface FirstTimeSetupModalProps {
  isOpen: boolean;
  mode: SetupWizardMode;
  manifestUrl?: string;
  installUrl?: string;
  onClose: () => void;
  onCompleted: (hasMovies: boolean) => Promise<void> | void;
}

export const FirstTimeSetupModal: React.FC<FirstTimeSetupModalProps> = (props) => {
  const { isOpen, mode, onClose } = props;
  const wizard = useSetupWizardController(props);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollContainerRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' });
  }, [wizard.currentStepIndex]);

  if (!isOpen) return null;

  const { currentStep, steps } = wizard;

  const stepper = (
    <SetupProgressStepper
      steps={steps}
      currentStepIndex={wizard.currentStepIndex}
      onSelectStep={wizard.goToStep}
    />
  );

  const renderStep = () => {
    switch (currentStep.id) {
      case 'welcome':
        return <SetupStepWelcome />;
      case 'install':
        return (
          <SetupStepInstallStremio
            manifestUrl={wizard.effectiveManifestUrl}
            installUrl={wizard.installUrl}
            isInstallingToAccount={wizard.isInstallingToAccount}
            installedToAccount={wizard.installedToAccount}
            hasOpenedStremioApp={wizard.hasOpenedStremioApp}
            copiedManifest={wizard.copiedManifest}
            showInlineQr={wizard.showInlineQr}
            qrDataUrl={wizard.qrDataUrl}
            isGeneratingQr={wizard.isGeneratingQr}
            onInstallToAccount={wizard.handleInstallToAccount}
            onOpenStremioApp={wizard.handleOpenStremioApp}
            onCopyManifest={wizard.handleCopyManifest}
            onToggleQr={() => wizard.setShowInlineQr((prev) => !prev)}
          />
        );
      case 'features':
        return (
          <SetupStepFeaturesTour
            globalMinQuality={wizard.globalMinQuality}
            onSelectQuality={wizard.setGlobalMinQuality}
            trackWatchlistWatched={wizard.trackWatchlistWatched}
            onToggleTrackWatched={wizard.setTrackWatchlistWatched}
            autoSyncWatched={wizard.autoSyncWatched}
            onToggleAutoSync={wizard.setAutoSyncWatched}
          />
        );
      case 'notifications':
        return <SetupStepNotifications />;
      case 'movies':
        return (
          <SetupStepFirstMovies
            items={wizard.items}
            addingMovieId={wizard.addingMovieId}
            isBatchAdding={wizard.isBatchAdding}
            onQuickAddMovie={wizard.handleQuickAddMovie}
            onBatchAddStarterMovies={wizard.handleBatchAddStarterMovies}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-wizard-step-title"
      className="fixed inset-0 z-50 bg-[#0c0d14]/98 backdrop-blur-xl flex flex-col overflow-hidden"
    >
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-xl h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <header className="relative z-10 border-b border-white/10 bg-[#10121d]/80 px-4 sm:px-6 py-3 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300">
              <Sparkles size={16} />
            </span>
            <span className="text-sm font-black text-white whitespace-nowrap">Quick Start Setup</span>
          </div>
          <div className="hidden md:block">{stepper}</div>
          {mode === 'review' ? (
            <Button variant="outline" size="sm" onClick={onClose} icon={<X size={14} />}>
              Close Guide
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={wizard.handleFinishSetup}
              className="text-gray-400 hover:text-white text-xs"
            >
              Skip Setup
            </Button>
          )}
        </div>
        <div className="md:hidden">{stepper}</div>
      </header>

      <div ref={scrollContainerRef} className="relative z-10 flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
          <div className="space-y-2">
            <Badge variant="purple" pill>
              Step {currentStep.stepNumber} of {steps.length}
            </Badge>
            <h1 id="setup-wizard-step-title" className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {currentStep.title}
            </h1>
            <p className="text-sm text-gray-400">{currentStep.subtitle}</p>
          </div>
          {renderStep()}
        </div>
      </div>

      <footer className="relative z-10 border-t border-white/10 bg-[#10121d]/90 px-4 sm:px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={wizard.goBack}
            disabled={wizard.isFirstStep}
            icon={<ArrowLeft size={14} />}
          >
            Back
          </Button>
          <div className="flex items-center gap-3 min-w-0">
            {wizard.isLastStep ? (
              <Button
                variant="primary"
                size="md"
                onClick={wizard.handleFinishSetup}
                isLoading={wizard.isCompleting}
                icon={<CheckCircle2 size={15} />}
              >
                Finish Setup & Open Dashboard
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={wizard.goNext}
                icon={<ArrowRight size={14} />}
                iconPosition="right"
              >
                Continue
              </Button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};
