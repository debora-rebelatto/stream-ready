import React from 'react';
import { Sparkles, Play } from 'lucide-react';
import {
  useLandingController,
  type UseLandingControllerProps,
} from '../controllers/useLandingController';
import { Navbar } from '../components/Navbar';
import { RecommendedBanner } from '../components/RecommendedBanner';
import { LandingHeroSection } from '../components/LandingHeroSection';
import { QualityComparisonSection } from '../components/QualityComparisonSection';
import { FeaturesGridSection } from '../components/FeaturesGridSection';
import { HowItWorksSection } from '../components/HowItWorksSection';
import { LandingFaqSection } from '../components/LandingFaqSection';
import { Footer } from '../components/Footer';
import { LoginModal } from '../components/LoginModal';
import { InstallGuideModal } from '../components/InstallGuideModal';
import { QrCodeModal } from '../components/QrCodeModal';

export type LandingPageProps = UseLandingControllerProps;

export const LandingPageView: React.FC<LandingPageProps> = (props) => {
  const {
    manifestUrl,
    installUrl,
    openFaq,
    setOpenFaq,
    isLoginOpen,
    setIsLoginOpen,
    isInstallGuideOpen,
    setIsInstallGuideOpen,
    isQrModalOpen,
    setIsQrModalOpen,
    handleOpenLogin,
    handleOpenInstallGuide,
    handleOpenQrModal,
    handleCopy,
    handleInstallClick,
    faqs,
  } = useLandingController(props);

  return (
    <div className="min-h-screen flex flex-col bg-[#0c0d14]">
      <Navbar
        onOpenLogin={handleOpenLogin}
        onOpenInstallGuide={handleOpenInstallGuide}
        onOpenQrModal={handleOpenQrModal}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="space-y-24 sm:space-y-32 py-4">
          <LandingHeroSection
            installUrl={installUrl}
            onOpenLogin={handleOpenLogin}
            onInstallClick={handleInstallClick}
            onCopy={handleCopy}
            onOpenQrModal={handleOpenQrModal}
          />

          <section className="max-w-5xl mx-auto px-4 -mt-10 sm:-mt-14">
            <RecommendedBanner onOpenLogin={handleOpenLogin} />
          </section>

          <QualityComparisonSection />
          <FeaturesGridSection />
          <HowItWorksSection />

          <LandingFaqSection faqs={faqs} openFaq={openFaq} setOpenFaq={setOpenFaq} />

          {/* Bottom Conversion CTA */}
          <section className="max-w-4xl mx-auto px-4 pb-12">
            <div className="relative rounded-3xl bg-linear-to-r from-purple-900/60 via-[#181a28] to-indigo-900/60 border border-purple-500/30 p-8 sm:p-12 text-center shadow-2xl overflow-hidden">
              <div className="absolute inset-0 bg-radial-gradient from-purple-500/10 via-transparent to-transparent pointer-events-none" />

              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4">
                Ready for pristine movie nights?
              </h2>
              <p className="text-sm text-gray-300 max-w-lg mx-auto mb-8 leading-relaxed">
                Stop gambling on stream qualities. Connect your Stremio account today and enjoy
                automated release tracking for free.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={handleOpenLogin}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-linear-to-r from-[#7b42f6] to-indigo-600 hover:from-[#6a34e0] hover:to-indigo-500 text-white font-bold text-sm shadow-[0_0_25px_rgba(123,66,246,0.6)] transition-all cursor-pointer transform hover:-translate-y-0.5"
                >
                  <Sparkles size={16} />
                  <span>Get Started Now — It's Free</span>
                </button>
                <a
                  href={installUrl || '#'}
                  onClick={handleInstallClick}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-sm transition-all cursor-pointer"
                >
                  <Play size={14} fill="currentColor" />
                  <span>Install Addon</span>
                </a>
              </div>
            </div>
          </section>

          <Footer onCopyManifest={handleCopy} onOpenLogin={handleOpenLogin} />
        </div>
      </main>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
      <InstallGuideModal
        isOpen={isInstallGuideOpen}
        onClose={() => setIsInstallGuideOpen(false)}
        onOpenLogin={handleOpenLogin}
        onOpenQrModal={handleOpenQrModal}
        installUrl={installUrl}
        manifestUrl={manifestUrl}
      />
      <QrCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        manifestUrl={manifestUrl}
        installUrl={installUrl}
      />
    </div>
  );
};
