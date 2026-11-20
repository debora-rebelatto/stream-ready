export type SetupStepId = 'welcome' | 'install' | 'features' | 'movies';

export type SetupWizardMode = 'first-login' | 'review';

export interface SetupStepDefinition {
  id: SetupStepId;
  stepNumber: number;
  shortTitle: string;
  title: string;
  subtitle: string;
}

export const SETUP_WIZARD_STEPS: readonly SetupStepDefinition[] = [
  {
    id: 'welcome',
    stepNumber: 1,
    shortTitle: 'How It Works',
    title: 'Welcome to Stremio Watchlist',
    subtitle: 'Understand how the web tracker connects to your Stremio player catalogs',
  },
  {
    id: 'install',
    stepNumber: 2,
    shortTitle: 'Install Addon',
    title: 'Install & Connect in Stremio',
    subtitle: 'Sync your personalized good-quality catalogs to Desktop, Mobile, and Smart TV',
  },
  {
    id: 'features',
    stepNumber: 3,
    shortTitle: 'Preferences',
    title: 'Configure Quality & Watched Sync',
    subtitle: 'Customize how releases are detected and watched movies are automatically archived',
  },
  {
    id: 'movies',
    stepNumber: 4,
    shortTitle: 'Add Movies',
    title: 'Add Your First Movies',
    subtitle: 'Populate your watchlist now so your Stremio rows are ready right away',
  },
] as const;
