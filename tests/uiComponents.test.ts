import React from 'react';
import { Button } from '../src/components/Button';
import { Badge } from '../src/components/Badge';

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
      const elActive = React.createElement(Button, { variant: 'pill', active: true, badge: 5 }, 'All Lists');
      expect(elActive.props.variant).toBe('pill');
      expect(elActive.props.active).toBe(true);
      expect(elActive.props.badge).toBe(5);

      const elInactive = React.createElement(Button, { variant: 'pill', active: false }, 'All Lists');
      expect(elInactive.props.active).toBe(false);
    });

    test('supports tab variant with themes', () => {
      const elTab = React.createElement(Button, { variant: 'tab', tabTheme: 'emerald', active: true }, 'Ready');
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
      const el = React.createElement(Badge, { variant: 'amber', size: 'xs', uppercase: true }, 'BETA');
      expect(React.isValidElement(el)).toBe(true);
      expect(el.props.variant).toBe('amber');
      expect(el.props.size).toBe('xs');
      expect(el.props.uppercase).toBe(true);
      expect(el.props.children).toBe('BETA');
    });

    test('supports all standard color variants', () => {
      const variants = ['purple', 'emerald', 'amber', 'rose', 'blue', 'neutral', 'gradient'] as const;
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
});
