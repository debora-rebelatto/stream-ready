import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DESIGN_COLOR_TOKENS, DESIGN_TYPOGRAPHY_TOKENS } from '../src/models';
import {
  Button,
  Badge,
  Input,
  Select,
  Switch,
  Card,
  Alert,
  EmptyState,
  ProgressBar,
  StatCard,
  Avatar,
  Footer,
} from '../src/components';

describe('Design System Foundations & Atomic Primitives', () => {
  describe('Design Tokens Invariants', () => {
    it('exports a complete and valid catalog of CSS color tokens', () => {
      expect(DESIGN_COLOR_TOKENS.length).toBeGreaterThanOrEqual(12);
      for (const token of DESIGN_COLOR_TOKENS) {
        expect(token.name).toBeTruthy();
        expect(token.cssVar).toMatch(/^--[a-z0-9-]+$/);
        expect(token.hex).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(['surface', 'brand', 'status', 'text', 'border']).toContain(token.category);
      }
    });

    it('exports responsive typography hierarchy tokens', () => {
      expect(DESIGN_TYPOGRAPHY_TOKENS.length).toBeGreaterThanOrEqual(5);
      for (const typo of DESIGN_TYPOGRAPHY_TOKENS) {
        expect(typo.name).toBeTruthy();
        expect(typo.className).toContain('text-');
        expect(typo.sizeLabel).toBeTruthy();
      }
    });
  });

  describe('Existing Core Primitives (Button & Badge)', () => {
    it('renders Button variants and badges cleanly', () => {
      const html = renderToStaticMarkup(
        React.createElement(
          Button,
          { variant: 'pill', active: true, badge: 12 },
          'Sci-Fi Essentials'
        )
      );
      expect(html).toContain('Sci-Fi Essentials');
      expect(html).toContain('12');
      expect(html).toContain('bg-purple-600');
    });

    it('renders Badge variants with dot and uppercase', () => {
      const html = renderToStaticMarkup(
        React.createElement(
          Badge,
          { variant: 'emerald', uppercase: true, dot: true },
          'Good Quality'
        )
      );
      expect(html).toContain('Good Quality');
      expect(html).toContain('uppercase');
      expect(html).toContain('bg-emerald-400');
    });
  });

  describe('Expanded Form & Control Primitives (Input, Select, Switch)', () => {
    it('renders Input with label, helperText, error state, and clear button', () => {
      const normalHtml = renderToStaticMarkup(
        React.createElement(Input, {
          id: 'movie-search',
          label: 'Search Movie',
          value: 'Dune',
          onChange: () => {},
          onClear: () => {},
          helperText: 'Enter title or IMDb ID',
        })
      );
      expect(normalHtml).toContain('Search Movie');
      expect(normalHtml).toContain('Enter title or IMDb ID');
      expect(normalHtml).toContain('aria-label="Clear input"');

      const errorHtml = renderToStaticMarkup(
        React.createElement(Input, {
          id: 'movie-err',
          value: 'bad',
          onChange: () => {},
          error: 'Invalid IMDb ID',
        })
      );
      expect(errorHtml).toContain('Invalid IMDb ID');
      expect(errorHtml).toContain('aria-invalid="true"');
    });

    it('renders Select with options array', () => {
      const html = renderToStaticMarkup(
        React.createElement(Select, {
          id: 'quality-select',
          label: 'Target Quality',
          value: '4k',
          onChange: () => {},
          options: [
            { value: '1080p', label: '1080p Full HD' },
            { value: '4k', label: '4K UHD' },
          ],
        })
      );
      expect(html).toContain('Target Quality');
      expect(html).toContain('1080p Full HD');
      expect(html).toContain('4K UHD');
    });

    it('renders Switch in both standalone and labeled card layout', () => {
      const standaloneHtml = renderToStaticMarkup(
        React.createElement(Switch, {
          checked: true,
          onChange: () => {},
          title: 'Quick toggle',
        })
      );
      expect(standaloneHtml).toContain('role="switch"');
      expect(standaloneHtml).toContain('aria-checked="true"');

      const cardSwitchHtml = renderToStaticMarkup(
        React.createElement(Switch, {
          checked: false,
          onChange: () => {},
          label: 'Auto Sync Watched',
          description: 'Sync every 30 minutes',
        })
      );
      expect(cardSwitchHtml).toContain('Auto Sync Watched');
      expect(cardSwitchHtml).toContain('Sync every 30 minutes');
      expect(cardSwitchHtml).toContain('aria-checked="false"');
    });
  });

  describe('Expanded Layout, Feedback & Data Primitives', () => {
    it('renders Card with header, body, and footer slots', () => {
      const html = renderToStaticMarkup(
        React.createElement(
          Card,
          {
            variant: 'purple',
            header: React.createElement('span', null, 'Card Header'),
            footer: React.createElement('span', null, 'Card Footer'),
          },
          'Card Body Content'
        )
      );
      expect(html).toContain('Card Header');
      expect(html).toContain('Card Body Content');
      expect(html).toContain('Card Footer');
    });

    it('renders Alert across semantic variants', () => {
      const html = renderToStaticMarkup(
        React.createElement(
          Alert,
          { variant: 'warning', title: 'Low Seeders Warning', onDismiss: () => {} },
          'Waiting for healthier 4K stream sources.'
        )
      );
      expect(html).toContain('role="alert"');
      expect(html).toContain('Low Seeders Warning');
      expect(html).toContain('Waiting for healthier 4K stream sources.');
      expect(html).toContain('aria-label="Dismiss alert"');
    });

    it('renders EmptyState with icon, title, description, and actions', () => {
      const html = renderToStaticMarkup(
        React.createElement(EmptyState, {
          icon: '🍿',
          title: 'Watchlist Empty',
          description: 'Add movies using the search bar.',
          actions: React.createElement(Button, { variant: 'primary' }, 'Add First Movie'),
        })
      );
      expect(html).toContain('Watchlist Empty');
      expect(html).toContain('Add movies using the search bar.');
      expect(html).toContain('Add First Movie');
    });

    it('renders ProgressBar with clamped percentage calculation', () => {
      const html = renderToStaticMarkup(
        React.createElement(ProgressBar, {
          label: 'Season 2 Progress',
          value: 7,
          max: 10,
          showPercentage: true,
          variant: 'emerald',
        })
      );
      expect(html).toContain('role="progressbar"');
      expect(html).toContain('Season 2 Progress');
      expect(html).toContain('70%');
      expect(html).toContain('width:70%');
    });

    it('renders StatCard and Avatar with initials and presence dot', () => {
      const statHtml = renderToStaticMarkup(
        React.createElement(StatCard, {
          theme: 'emerald',
          pulseDot: true,
          label: 'Ready Movies',
          value: 842,
          subtitle: 'Quality confirmed',
        })
      );
      expect(statHtml).toContain('Ready Movies');
      expect(statHtml).toContain('842');
      expect(statHtml).toContain('Quality confirmed');

      const avatarHtml = renderToStaticMarkup(
        React.createElement(Avatar, {
          name: 'Debora Rebelatto',
          status: 'online',
          size: 'md',
        })
      );
      expect(avatarHtml).toContain('DR');
      expect(avatarHtml).toContain('bg-emerald-400');
    });

    it('renders Footer without exposing internal Design System links', () => {
      const footerHtml = renderToStaticMarkup(React.createElement(Footer));
      expect(footerHtml).toContain('Stremio Watchlist');
      expect(footerHtml).not.toContain('Design System');
      expect(footerHtml).not.toContain('#design-system');
    });
  });
});
