import React, { useState, useEffect } from 'react';
import { systemService } from '../services';
import { trackEvent } from '../utils';
import { useToast } from '../context/useAppContext';

export interface UseLandingControllerProps {
  onOpenLogin?: () => void;
  onOpenInstallGuide?: () => void;
  onOpenQrModal?: () => void;
}

export const LANDING_FAQS = [
  {
    q: 'Do I need to create an account or sign in to use this?',
    a: 'Yes, connecting your Stremio account is required. Stremio addons are strictly read-only inside the player app and cannot display search bars or "add to watchlist" buttons inside Stremio. By connecting your Stremio account on this website, you can search and add cinema movies here, and our 24/7 cloud engine will automatically synchronize 1080p FHD & 4K UHD releases directly to your Stremio home screen across all your devices.',
  },
  {
    q: "Why can't I just install the addon in Stremio and add movies there?",
    a: "Stremio's addon protocol does not allow addons to create new database records or provide interactive search forms inside the video player. This website serves as your watchlist control center: you add movies here, and our background engine tracks stream sources continuously and pushes ready releases straight to your TV.",
  },
  {
    q: 'What happens if I install the addon without connecting my account?',
    a: 'If you install the generic addon directly in Stremio without connecting your account on this website, your Stremio catalog will display a setup notice card. The addon cannot know what movies you want to track until your account is linked.',
  },
  {
    q: 'What is Good Quality Tracker?',
    a: 'It is an automated Stremio release companion. You add movies you want to see, and our cloud engine continuously monitors stream providers every 30 minutes. It filters out fuzzy cinema phone recordings (CAM / Telesync). The moment a clean 1080p FHD or 4K UHD copy drops, it automatically promotes the film to your Stremio library with direct TV home row integration.',
  },
  {
    q: 'Does it work on my Smart TV (Samsung, LG, Android TV, Fire TV)?',
    a: 'Yes, 100%! When you connect your Stremio account, the addon is installed directly onto your official Stremio account in the cloud. It syncs automatically across all your devices: Samsung Tizen, LG webOS, Android TV, Google TV, Fire TV Stick, Apple Mac, Windows PC, iOS, and Android mobile.',
  },
  {
    q: 'Can I set it to only notify me when 4K UHD is available?',
    a: 'Yes! You can choose your global preference (1080p Full HD vs 4K Ultra HD) and audio target (Any, 5.1+ Surround, or Dolby Atmos) in Settings. Automated alerts only fire once a release meets your exact criteria.',
  },
  {
    q: 'How do automated release notifications work?',
    a: 'Under Settings → Notifications & Alerts, you can enable Telegram Bot (2-click connect), Email alerts, or a custom Discord Webhook. Whenever our background tracker detects a verified release for a movie on your watchlist, you receive a single notification with a direct link to open it in Stremio.',
  },
  {
    q: 'What happens when I finish watching a movie?',
    a: 'You can click the "Mark as Watched" eye button on any card to automatically archive it into your Watched History. This instantly declutters your active Stremio rows and active web dashboard, keeping your watchlist focused only on movies waiting to be watched.',
  },
  {
    q: 'Do I need Real-Debrid or Torrentio?',
    a: 'Good Quality Tracker works natively with community scrapers like Torrentio and detects streams regardless of whether you use Real-Debrid, AllDebrid, Premiumize, Torbox, or standard P2P torrent streams.',
  },
  {
    q: 'Is this free and safe for my account?',
    a: 'Yes! Good Quality Tracker is 100% free and open source. We never see or store your Stremio password. Your authentication tokens are encrypted using military-grade AES-256-GCM encryption in our database.',
  },
];

export function useLandingController({
  onOpenLogin: propsOnOpenLogin,
  onOpenInstallGuide: propsOnOpenInstallGuide,
  onOpenQrModal: propsOnOpenQrModal,
}: UseLandingControllerProps = {}) {
  const { showToast } = useToast();
  const [manifestUrl, setManifestUrl] = useState('');
  const [installUrl, setInstallUrl] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const handleOpenLogin = propsOnOpenLogin || (() => setIsLoginOpen(true));
  const handleOpenInstallGuide = propsOnOpenInstallGuide || (() => setIsInstallGuideOpen(true));
  const handleOpenQrModal = propsOnOpenQrModal || (() => setIsQrModalOpen(true));

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const source = searchParams.get('source');
    const context = searchParams.get('context') || 'stremio_tv';

    if (source === 'stremio_tv_qr' || source === 'stremio_configure') {
      setIsLoginOpen(true);

      if (source === 'stremio_tv_qr') {
        trackEvent('qr_landing_viewed', {
          source,
          context,
        });
        showToast(
          'Welcome from Stremio TV! Connect your Stremio account to sync movies to your TV.',
          'info'
        );
      } else {
        trackEvent('stremio_configure_opened', {
          source,
          context,
        });
        showToast(
          'Welcome from Stremio! Connect your Stremio account to configure the addon.',
          'info'
        );
      }
    }
  }, [showToast]);

  useEffect(() => {
    systemService
      .getInfo()
      .then((info) => {
        setManifestUrl(info.manifestUrl);
        setInstallUrl(info.stremioInstallUrl);
      })
      .catch(() => {
        const origin = window.location.origin;
        setManifestUrl(`${origin}/manifest.json`);
        setInstallUrl(`stremio://${window.location.host}/manifest.json`);
      });
  }, []);

  const handleCopy = () => {
    if (!manifestUrl) return;
    trackEvent('addon_manifest_copied', { location: 'landing_page' });
    navigator.clipboard
      .writeText(manifestUrl)
      .then(() =>
        showToast('Manifest link copied! Paste into Stremio Addons search bar.', 'success')
      )
      .catch(() => window.prompt('Copy addon link:', manifestUrl));
  };

  const handleInstallClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (handleOpenInstallGuide) {
      handleOpenInstallGuide();
      return;
    }
    if (installUrl) {
      trackEvent('addon_install_clicked', { location: 'landing_page' });
      showToast(
        'Reminder: After installing in Stremio, use the search bar on this site to add movies!',
        'info'
      );
      window.location.href = installUrl;
    }
  };

  return {
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
    faqs: LANDING_FAQS,
  };
}
