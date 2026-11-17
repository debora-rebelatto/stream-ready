import React from 'react';
import { SettingsPage } from '../src/components/SettingsPage';

describe('SettingsPage Component', () => {
  it('is defined and instantiates properly', () => {
    expect(SettingsPage).toBeDefined();

    const element = React.createElement(SettingsPage, {
      onBack: jest.fn(),
      onOpenDeleteAccount: jest.fn(),
      onOpenInstallGuide: jest.fn(),
      onOpenQrModal: jest.fn(),
      manifestUrl: 'https://example.com/manifest.json',
      installUrl: 'stremio://example.com/manifest.json',
    });

    expect(React.isValidElement(element)).toBe(true);
  });
});
