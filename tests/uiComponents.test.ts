import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  Button,
  Badge,
  Spinner,
  LoadingState,
  RecommendedBanner,
  WatchInStremioButton,
  WatchlistActionButton,
  MovieCardActionButton,
  MOVIE_CARD_ACTION_VARIANTS,
  MOVIE_STATUS_BADGE_MAP,
  MovieCardSpecsOverlay,
  MovieCardListMenu,
  Footer,
  GitHubRepoButton,
} from '../src/components';

describe('UI Reusable Components (Button & Badge)', () => {
  describe('Button Component', () => {
    test('is defined and renders a valid React element', () => {
      expect(Button).toBeDefined();
      const el = React.createElement(Button, { variant: 'primary' }, 'Click me');
      expect(React.isValidElement(el)).toBe(true);
      expect(el.props.variant).toBe('primary');
      expect(el.props.children).toBe('Click me');
    });

    test('supports pill variant with active state', () => {
      const elActive = React.createElement(
        Button,
        { variant: 'pill', active: true, badge: 5 },
        'All Lists'
      );
      expect(elActive.props.variant).toBe('pill');
      expect(elActive.props.active).toBe(true);
      expect(elActive.props.badge).toBe(5);

      const elInactive = React.createElement(
        Button,
        { variant: 'pill', active: false },
        'All Lists'
      );
      expect(elInactive.props.active).toBe(false);
    });

    test('supports tab variant with themes', () => {
      const elTab = React.createElement(
        Button,
        { variant: 'tab', tabTheme: 'emerald', active: true },
        'Ready'
      );
      expect(elTab.props.variant).toBe('tab');
      expect(elTab.props.tabTheme).toBe('emerald');
    });

    test('supports icon-only and loading props', () => {
      const elIcon = React.createElement(Button, { isIconOnly: true, isLoading: true });
      expect(elIcon.props.isIconOnly).toBe(true);
      expect(elIcon.props.isLoading).toBe(true);
    });
  });

  describe('Badge Component', () => {
    test('is defined and renders a valid React element', () => {
      expect(Badge).toBeDefined();
      const el = React.createElement(
        Badge,
        { variant: 'amber', size: 'xs', uppercase: true },
        'BETA'
      );
      expect(React.isValidElement(el)).toBe(true);
      expect(el.props.variant).toBe('amber');
      expect(el.props.size).toBe('xs');
      expect(el.props.uppercase).toBe(true);
      expect(el.props.children).toBe('BETA');
    });

    test('supports all standard color variants', () => {
      const variants = [
        'purple',
        'emerald',
        'amber',
        'rose',
        'blue',
        'cyan',
        'neutral',
        'gradient',
      ] as const;
      variants.forEach((v) => {
        const el = React.createElement(Badge, { variant: v }, v);
        expect(el.props.variant).toBe(v);
      });
    });

    test('supports dot indicator and pill shape', () => {
      const el = React.createElement(Badge, { dot: true, pill: true, pulse: true }, 'Online');
      expect(el.props.dot).toBe(true);
      expect(el.props.pill).toBe(true);
      expect(el.props.pulse).toBe(true);
    });
  });

  describe('WatchInStremioButton Component', () => {
    test('is defined and renders a valid React element with ready and unready states', () => {
      expect(WatchInStremioButton).toBeDefined();
      const elReady = React.createElement(WatchInStremioButton, {
        movieId: 'tt1234567',
        isReady: true,
      });
      expect(React.isValidElement(elReady)).toBe(true);
      expect(elReady.props.movieId).toBe('tt1234567');
      expect(elReady.props.isReady).toBe(true);

      const elUnready = React.createElement(WatchInStremioButton, {
        movieId: 'tt1234567',
        isReady: false,
      });
      expect(elUnready.props.isReady).toBe(false);
    });

    test('supports custom label and onClick handler', () => {
      const onClickMock = jest.fn();
      const elCustom = React.createElement(WatchInStremioButton, {
        movieId: 'tt1234567',
        label: 'Play Movie',
        onClick: onClickMock,
      });
      expect(elCustom.props.label).toBe('Play Movie');
      expect(elCustom.props.onClick).toBe(onClickMock);
    });
  });

  describe('WatchlistActionButton Component', () => {
    test('is defined and renders a valid React element', () => {
      expect(WatchlistActionButton).toBeDefined();
      const elAdd = React.createElement(WatchlistActionButton, {
        movieId: 'tt1234567',
        movieName: 'Inception',
        isInWatchlist: false,
      });
      expect(React.isValidElement(elAdd)).toBe(true);
      expect(elAdd.props.movieId).toBe('tt1234567');
      expect(elAdd.props.isInWatchlist).toBe(false);
    });

    test('supports in-watchlist state and loading props', () => {
      const elInWatchlist = React.createElement(WatchlistActionButton, {
        movieId: 'tt1234567',
        isInWatchlist: true,
      });
      expect(elInWatchlist.props.isInWatchlist).toBe(true);

      const elLoading = React.createElement(WatchlistActionButton, {
        movieId: 'tt1234567',
        isLoading: true,
      });
      expect(elLoading.props.isLoading).toBe(true);
    });
  });

  describe('Footer Component', () => {
    test('is defined and renders a valid React element', () => {
      expect(Footer).toBeDefined();
      const el = React.createElement(Footer);
      expect(React.isValidElement(el)).toBe(true);
    });

    test('accepts optional action link callbacks and custom className', () => {
      const onCopy = jest.fn();
      const onLogin = jest.fn();
      const el = React.createElement(Footer, {
        className: 'custom-footer-class',
        onCopyManifest: onCopy,
        onOpenLogin: onLogin,
      });
      expect(el.props.className).toBe('custom-footer-class');
      expect(el.props.onCopyManifest).toBe(onCopy);
      expect(el.props.onOpenLogin).toBe(onLogin);
    });
  });

  describe('GitHubRepoButton Component', () => {
    test('is defined and renders a valid React element', () => {
      expect(GitHubRepoButton).toBeDefined();
      const el = React.createElement(GitHubRepoButton, { size: 'sm' });
      expect(React.isValidElement(el)).toBe(true);
      expect(el.props.size).toBe('sm');
    });
  });

  describe('MovieCardActionButton Component', () => {
    test('is defined and supports all action variants', () => {
      expect(MovieCardActionButton).toBeDefined();
      const variants = ['purple', 'emerald', 'danger', 'neutral'] as const;
      variants.forEach((v) => {
        expect(MOVIE_CARD_ACTION_VARIANTS[v]).toBeDefined();
        const el = React.createElement(MovieCardActionButton, {
          variant: v,
          title: `Action ${v}`,
          'aria-label': `Action ${v}`,
        });
        expect(React.isValidElement(el)).toBe(true);
        expect(el.props.variant).toBe(v);
      });
    });
  });

  describe('MovieCard Minimalist Subcomponents & Status Badges', () => {
    test('MOVIE_STATUS_BADGE_MAP uses compact non-pulsing labels', () => {
      expect(MOVIE_STATUS_BADGE_MAP.new.label).toBe('NEW');
      expect(MOVIE_STATUS_BADGE_MAP.new.pulse).toBeUndefined();
      expect(MOVIE_STATUS_BADGE_MAP.ready.label).toBe('Ready');
      expect(MOVIE_STATUS_BADGE_MAP.waiting.label).toBe('Waiting');
      expect(MOVIE_STATUS_BADGE_MAP.unreleased.label).toBe('Soon');
      expect(MOVIE_STATUS_BADGE_MAP.watched.label).toBe('Watched');
    });

    test('MovieCardSpecsOverlay creates a valid React element', () => {
      const el = React.createElement(MovieCardSpecsOverlay, {
        isWatched: false,
        isReady: true,
        isUnreleased: false,
        qualityLabel: '4K UHD',
        streamsLabel: '149 sources',
        streamCount: 149,
        hasAtmos: true,
        isLosslessAudio: false,
        audioFormat: 'Dolby Atmos',
      });
      expect(React.isValidElement(el)).toBe(true);
      expect(el.props.qualityLabel).toBe('4K UHD');
      expect(el.props.hasAtmos).toBe(true);
    });

    test('MovieCardListMenu creates a valid React element', () => {
      const el = React.createElement(MovieCardListMenu, {
        isOpen: true,
        customLists: [{ id: 'list-1', name: 'Favorites', emoji: '⭐' }],
        itemCustomListIds: ['list-1'],
        onToggleList: jest.fn(),
        onClose: jest.fn(),
      });
      expect(React.isValidElement(el)).toBe(true);
      expect(el.props.isOpen).toBe(true);
    });
  });

  describe('Spinner & LoadingState Components', () => {
    test('Spinner renders accessible status role by default and hides when decorative', () => {
      const standaloneHtml = renderToString(
        React.createElement(Spinner, { size: 'lg', variant: 'brand', label: 'Syncing...' })
      );
      expect(standaloneHtml).toContain('role="status"');
      expect(standaloneHtml).toContain('aria-label="Syncing..."');
      expect(standaloneHtml).toContain('animate-spin');
      expect(standaloneHtml).toContain('w-8 h-8');

      const decorativeHtml = renderToString(
        React.createElement(Spinner, { size: 'sm', variant: 'white', decorative: true })
      );
      expect(decorativeHtml).not.toContain('role="status"');
      expect(decorativeHtml).toContain('aria-hidden="true"');
      expect(decorativeHtml).toContain('border-t-white');
    });

    test('LoadingState renders fullscreen, section, compact, and inline variants', () => {
      const fullscreenHtml = renderToString(
        React.createElement(LoadingState, {
          variant: 'fullscreen',
          title: 'Checking Stremio session...',
          description: 'Loading your profile and quality tracker',
        })
      );
      expect(fullscreenHtml).toContain('role="status"');
      expect(fullscreenHtml).toContain('min-h-screen');
      expect(fullscreenHtml).toContain('Checking Stremio session...');
      expect(fullscreenHtml).toContain('Loading your profile and quality tracker');

      const inlineHtml = renderToString(
        React.createElement(LoadingState, {
          variant: 'inline',
          title: 'Searching movies...',
        })
      );
      expect(inlineHtml).toContain('inline-flex');
      expect(inlineHtml).toContain('Searching movies...');
    });

    test('Button renders standardized Spinner when isLoading is true', () => {
      const primaryHtml = renderToString(
        React.createElement(Button, { variant: 'primary', isLoading: true }, 'Saving...')
      );
      expect(primaryHtml).toContain('animate-spin');
      expect(primaryHtml).toContain('border-t-white');
      expect(primaryHtml).toContain('disabled=""');
    });
  });

  describe('RecommendedBanner Description Clamp', () => {
    test('uses sm:line-clamp-2 without sm:block override so long descriptions stay clamped', () => {
      const html = renderToString(React.createElement(RecommendedBanner));
      expect(html).toContain('hidden sm:line-clamp-2');
      expect(html).not.toContain('hidden sm:block');
    });
  });
});
