import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  SETUP_WIZARD_STEPS,
  type SetupStepId,
  type SetupWizardMode,
  type StremioUser,
} from '../models';
import { useAuth, useWatchlist, useToast } from '../context/useAppContext';
import { trackEvent } from '../utils';

export function isUserOnboardingCompleted(user: StremioUser | null): boolean {
  if (!user) return true;
  return Boolean(user.onboardingCompleted);
}

export interface SetupStepActivity {
  installedToAccount: boolean;
  hasOpenedStremioApp: boolean;
  hasCopiedManifest: boolean;
  watchlistCount: number;
}

/** Describes what the user actually did on a step (analytics only — steps are never gated). */
export function resolveStepActionTaken(stepId: SetupStepId, activity: SetupStepActivity): string {
  switch (stepId) {
    case 'welcome':
      return 'viewed_intro';
    case 'install':
      if (activity.installedToAccount) return 'cloud_install';
      if (activity.hasOpenedStremioApp) return 'open_app';
      if (activity.hasCopiedManifest) return 'copy_manifest';
      return 'skipped_install';
    case 'features':
      return 'reviewed_features';
    case 'notifications':
      return 'reviewed_notifications';
    case 'movies':
      return activity.watchlistCount > 0 ? 'added_movies' : 'skipped_movies';
    default:
      return 'completed';
  }
}

export interface UseSetupWizardControllerOptions {
  isOpen: boolean;
  mode: SetupWizardMode;
  manifestUrl?: string;
  installUrl?: string;
  onClose: () => void;
  onCompleted: (hasMovies: boolean) => Promise<void> | void;
}

export function useSetupWizardController({
  isOpen,
  mode,
  manifestUrl,
  installUrl,
  onClose,
  onCompleted,
}: UseSetupWizardControllerOptions) {
  const { installToAccount } = useAuth();
  const {
    items,
    globalMinQuality,
    setGlobalMinQuality,
    trackWatchlistWatched,
    setTrackWatchlistWatched,
    autoSyncWatched,
    setAutoSyncWatched,
    addItem,
  } = useWatchlist();
  const { showToast } = useToast();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Step 2: Stremio install
  const [isInstallingToAccount, setIsInstallingToAccount] = useState(false);
  const [installedToAccount, setInstalledToAccount] = useState(false);
  const [hasOpenedStremioApp, setHasOpenedStremioApp] = useState(false);
  const [hasCopiedManifest, setHasCopiedManifest] = useState(false);
  const [copiedManifest, setCopiedManifest] = useState(false);
  const [showInlineQr, setShowInlineQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);

  // Step 4: Add first movies
  const [addingMovieId, setAddingMovieId] = useState<string | null>(null);
  const [isBatchAdding, setIsBatchAdding] = useState(false);
  const [moviesAddedInWizard, setMoviesAddedInWizard] = useState(0);

  const [isCompleting, setIsCompleting] = useState(false);

  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectiveManifestUrl = manifestUrl || 'https://stremiowatchlist.vercel.app/manifest.json';
  const effectiveQrTarget = installUrl || effectiveManifestUrl;

  const currentStep = SETUP_WIZARD_STEPS[currentStepIndex] || SETUP_WIZARD_STEPS[0];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === SETUP_WIZARD_STEPS.length - 1;

  const activity: SetupStepActivity = {
    installedToAccount,
    hasOpenedStremioApp,
    hasCopiedManifest,
    watchlistCount: items.length,
  };

  // Reset transient wizard progression whenever opened
  useEffect(() => {
    if (!isOpen) return;
    setCurrentStepIndex(0);
    setIsInstallingToAccount(false);
    setInstalledToAccount(false);
    setHasOpenedStremioApp(false);
    setHasCopiedManifest(false);
    setCopiedManifest(false);
    setShowInlineQr(false);
    setAddingMovieId(null);
    setIsBatchAdding(false);
    setMoviesAddedInWizard(0);
    setIsCompleting(false);
  }, [isOpen]);

  // Clear copy feedback timer on unmount
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
        copyTimerRef.current = null;
      }
    };
  }, []);

  // Lock background page scroll while full-screen modal is open
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Track step views
  useEffect(() => {
    if (!isOpen) return;
    trackEvent('onboarding_step_viewed', {
      stepId: currentStep.id,
      stepNumber: currentStep.stepNumber,
      mode,
    });
  }, [isOpen, currentStep.id, currentStep.stepNumber, mode]);

  // Generate inline QR code on demand for Step 2
  useEffect(() => {
    if (!isOpen || !showInlineQr) return;
    let isMounted = true;
    setIsGeneratingQr(true);

    QRCode.toDataURL(effectiveQrTarget, {
      width: 240,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
      .then((dataUrl) => {
        if (isMounted) setQrDataUrl(dataUrl);
      })
      .catch((err) => {
        console.warn('[SetupWizard] QR code generation failed:', err);
        if (isMounted) setQrDataUrl('');
      })
      .finally(() => {
        if (isMounted) setIsGeneratingQr(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, showInlineQr, effectiveQrTarget]);

  const trackStepCompleted = () => {
    trackEvent('onboarding_step_completed', {
      stepId: currentStep.id,
      stepNumber: currentStep.stepNumber,
      actionTaken: resolveStepActionTaken(currentStep.id, activity),
    });
  };

  const goNext = () => {
    if (isLastStep) return;
    trackStepCompleted();
    setCurrentStepIndex((prev) => Math.min(prev + 1, SETUP_WIZARD_STEPS.length - 1));
  };

  const goBack = () => {
    if (isFirstStep) return;
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  };

  const goToStep = (index: number) => {
    if (index < 0 || index >= SETUP_WIZARD_STEPS.length) return;
    setCurrentStepIndex(index);
  };

  const handleInstallToAccount = async () => {
    if (isInstallingToAccount) return;
    setIsInstallingToAccount(true);
    try {
      const res = await installToAccount();
      if (res.success) setInstalledToAccount(true);
    } finally {
      setIsInstallingToAccount(false);
    }
  };

  const handleOpenStremioApp = () => {
    trackEvent('addon_install_clicked', { location: 'setup_wizard' });
    setHasOpenedStremioApp(true);
    if (installUrl && typeof window !== 'undefined') {
      window.location.href = installUrl;
    }
  };

  const handleCopyManifest = () => {
    trackEvent('addon_manifest_copied', { location: 'setup_wizard' });
    setHasCopiedManifest(true);

    const markCopied = () => {
      setCopiedManifest(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => {
        setCopiedManifest(false);
        copyTimerRef.current = null;
      }, 2000);
      showToast('Manifest link copied! Paste into Stremio Addons search bar.', 'success');
    };

    const promptFallback = () => {
      if (typeof window !== 'undefined') {
        window.prompt('Copy addon link:', effectiveManifestUrl);
      }
    };

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(effectiveManifestUrl).then(markCopied).catch(promptFallback);
    } else {
      promptFallback();
    }
  };

  const handleQuickAddMovie = async (movieId: string, movieName: string) => {
    if (addingMovieId || isBatchAdding) return;
    setAddingMovieId(movieId);
    try {
      const ok = await addItem(movieId, 'recommendations');
      if (ok) {
        setMoviesAddedInWizard((prev) => prev + 1);
        trackEvent('onboarding_quick_add_clicked', {
          movieIds: [movieId],
          source: 'setup_wizard_single',
        });
      }
    } catch {
      showToast(`Failed to add "${movieName}".`, 'error');
    } finally {
      setAddingMovieId(null);
    }
  };

  const handleBatchAddStarterMovies = async (movies: Array<{ id: string; name: string }>) => {
    if (isBatchAdding || addingMovieId) return;
    const existingIds = new Set(items.map((item) => item.id));
    const pendingMovies = movies.filter((m) => !existingIds.has(m.id));
    if (pendingMovies.length === 0) return;

    setIsBatchAdding(true);
    let addedCount = 0;
    try {
      for (const movie of pendingMovies) {
        const ok = await addItem(movie.id, 'recommendations');
        if (ok) addedCount++;
      }

      if (addedCount > 0) {
        setMoviesAddedInWizard((prev) => prev + addedCount);
        trackEvent('onboarding_quick_add_clicked', {
          movieIds: pendingMovies.map((m) => m.id),
          source: 'setup_wizard_batch',
        });
        showToast(`${addedCount} starter movies added to your watchlist!`, 'success');
      }
    } finally {
      setIsBatchAdding(false);
    }
  };

  const handleFinishSetup = async () => {
    if (isCompleting) return;
    setIsCompleting(true);
    try {
      const hasMovies = items.length > 0;
      trackStepCompleted();
      trackEvent('onboarding_completed', {
        mode,
        installedInWizard: installedToAccount || hasOpenedStremioApp || hasCopiedManifest,
        moviesAddedCount: moviesAddedInWizard,
        minQuality: globalMinQuality,
      });
      await onCompleted(hasMovies);
    } finally {
      setIsCompleting(false);
    }
  };

  // Allow closing in review mode or finishing setup on Escape in first-login mode
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (mode === 'first-login') {
        void handleFinishSetup();
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, mode, onClose, handleFinishSetup]);

  return {
    steps: SETUP_WIZARD_STEPS,
    currentStepIndex,
    currentStep,
    isFirstStep,
    isLastStep,
    effectiveManifestUrl,
    installUrl,
    items,
    globalMinQuality,
    setGlobalMinQuality,
    trackWatchlistWatched,
    setTrackWatchlistWatched,
    autoSyncWatched,
    setAutoSyncWatched,
    isInstallingToAccount,
    installedToAccount,
    hasOpenedStremioApp,
    hasCopiedManifest,
    copiedManifest,
    showInlineQr,
    setShowInlineQr,
    qrDataUrl,
    isGeneratingQr,
    addingMovieId,
    isBatchAdding,
    moviesAddedInWizard,
    isCompleting,
    goNext,
    goBack,
    goToStep,
    handleInstallToAccount,
    handleOpenStremioApp,
    handleCopyManifest,
    handleQuickAddMovie,
    handleBatchAddStarterMovies,
    handleFinishSetup,
  };
}
