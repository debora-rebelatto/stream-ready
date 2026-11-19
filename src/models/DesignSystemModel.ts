export interface DesignColorToken {
  name: string;
  cssVar: string;
  hex: string;
  usage: string;
  category: 'surface' | 'brand' | 'status' | 'text' | 'border';
}

export interface DesignTypographyToken {
  name: string;
  className: string;
  sizeLabel: string;
  usage: string;
}

export const DESIGN_COLOR_TOKENS: DesignColorToken[] = [
  // Surfaces
  {
    name: 'App Background',
    cssVar: '--bg-main',
    hex: '#0c0d14',
    usage: 'Main application backdrop across Landing, Dashboard, and Admin views',
    category: 'surface',
  },
  {
    name: 'Card Surface',
    cssVar: '--bg-card',
    hex: '#151824',
    usage: 'Movie cards, modal containers, KPI panels, and settings cards',
    category: 'surface',
  },
  {
    name: 'Card Hover',
    cssVar: '--bg-card-hover',
    hex: '#1c2030',
    usage: 'Interactive card hover state and highlighted rows',
    category: 'surface',
  },
  {
    name: 'Elevated Surface',
    cssVar: '--bg-surface',
    hex: '#1f2438',
    usage: 'Secondary buttons, nested panels, and dropdown triggers',
    category: 'surface',
  },
  {
    name: 'Input Surface',
    cssVar: '--bg-input',
    hex: '#1e2235',
    usage: 'Text inputs, search fields, select boxes, and poster placeholders',
    category: 'surface',
  },
  // Brand
  {
    name: 'Stremio Primary',
    cssVar: '--primary',
    hex: '#7b42f6',
    usage: 'Primary CTAs, active tabs, toggle switches, and watched badges',
    category: 'brand',
  },
  {
    name: 'Primary Hover',
    cssVar: '--primary-hover',
    hex: '#6a34e0',
    usage: 'Hover state for solid primary buttons and active pills',
    category: 'brand',
  },
  // Status
  {
    name: 'Ready / Good Quality',
    cssVar: '--ready-color',
    hex: '#10b981',
    usage: 'Confirmed 1080p/4K digital release status, active online dots, and success toasts',
    category: 'status',
  },
  {
    name: 'Waiting / Pending',
    cssVar: '--pending-color',
    hex: '#f59e0b',
    usage: 'Movies waiting for digital release, IMDb star rating badges, and warnings',
    category: 'status',
  },
  {
    name: 'Unreleased / Info',
    cssVar: '--info-color',
    hex: '#3b82f6',
    usage: 'Upcoming cinema titles, 1080p standard threshold indicators, and info alerts',
    category: 'status',
  },
  {
    name: 'Danger / Destructive',
    cssVar: '--danger-color',
    hex: '#f43f5e',
    usage: 'Delete movie, delete account danger zone, clear filters, and error alerts',
    category: 'status',
  },
  // Typography
  {
    name: 'Text Primary',
    cssVar: '--text-main',
    hex: '#f3f4f6',
    usage: 'Headings, movie titles, and primary interactive labels',
    category: 'text',
  },
  {
    name: 'Text Muted',
    cssVar: '--text-muted',
    hex: '#9ca3af',
    usage: 'Subtitles, descriptions, release years, and secondary metadata',
    category: 'text',
  },
  {
    name: 'Text Dim',
    cssVar: '--text-dim',
    hex: '#6b7280',
    usage: 'Placeholders, disabled states, and subtle captions',
    category: 'text',
  },
];

export const DESIGN_TYPOGRAPHY_TOKENS: DesignTypographyToken[] = [
  {
    name: 'Display Hero',
    className: 'text-3xl sm:text-4xl font-black tracking-tight',
    sizeLabel: '30px – 36px / 900',
    usage: 'Landing page hero headlines and major conversion banners',
  },
  {
    name: 'KPI Metric Value',
    className: 'text-2xl sm:text-3xl font-black tracking-tight',
    sizeLabel: '24px – 30px / 900',
    usage: 'Dashboard counters and Admin Analytics KPI cards',
  },
  {
    name: 'Section Heading (H2)',
    className: 'text-base sm:text-lg font-bold tracking-tight',
    sizeLabel: '16px – 18px / 700',
    usage: 'Modal titles, settings card headers, and view headers',
  },
  {
    name: 'Card Title (H4)',
    className: 'text-sm font-bold leading-tight',
    sizeLabel: '14px / 700',
    usage: 'MovieCard titles, list titles, and setting option titles',
  },
  {
    name: 'Body & Control Text',
    className: 'text-xs font-medium leading-relaxed',
    sizeLabel: '12px / 500',
    usage: 'Standard buttons, inputs, descriptions, and modal paragraphs',
  },
  {
    name: 'Micro Badge & Tag',
    className: 'text-[10px] font-bold uppercase tracking-wider',
    sizeLabel: '10px / 700',
    usage: 'Quality status badges, custom list chips, and keyboard shortcuts',
  },
];
