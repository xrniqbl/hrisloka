import {defineTheme, defineSyntaxTheme} from '@astryxdesign/core/theme';
import {neutralIconRegistry} from './icons';

const neutralSyntax = defineSyntaxTheme({
  name: 'hrisync',
  tokens: {
    keyword: ['#635BFF', '#818CF8'],
    string: ['#16A34A', '#86EFAC'],
    comment: ['#737373', '#a3a3a3'],
    number: ['#F59E0B', '#FCD34D'],
    function: ['#635BFF', '#93C5FD'],
    type: ['#635BFF', '#818CF8'],
    variable: ['#171717', '#e5e5e5'],
    operator: ['#737373', '#a3a3a3'],
    constant: ['#F59E0B', '#FCD34D'],
    tag: ['#DC2626', '#FCA5A5'],
    attribute: ['#F59E0B', '#FCD34D'],
    property: ['#16A34A', '#86EFAC'],
    punctuation: ['#a3a3a3', '#525252'],
    background: ['#fafafa', '#0a0a0a'],
  },
});

export const hrisyncTheme = defineTheme({
  name: 'hrisync',
  typography: {
    scale: {base: 14, ratio: 1.2},
    body: {
      family: 'Inter Tight',
      fallbacks: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    },
    heading: {
      family: 'Inter Tight',
      fallbacks: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      weights: {3: 'bold', 4: 'bold'},
    },
    code: {
      family: 'ui-monospace',
      fallbacks: '"SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    },
  },
  motion: {fast: 125, medium: 300, slow: 700, ratio: 0.75},
  syntax: neutralSyntax,
  tokens: {
    // Brand colors
    '--color-accent': '#635BFF',
    '--color-accent-hover': '#5449FF',
    '--color-accent-active': '#4F46E5',
    '--color-accent-muted': '#F0EEFF',
    
    // Semantic colors
    '--color-success': '#16A34A',
    '--color-success-muted': '#F0FDF4',
    '--color-warning': '#F59E0B',
    '--color-warning-muted': '#FFFBEB',
    '--color-error': '#DC2626',
    '--color-error-muted': '#FEF2F2',
    '--color-info': '#635BFF',
    '--color-info-muted': '#F0EEFF',
    
    // Backgrounds — landing soft canvas
    '--color-background-body': '#F7F7FB',
    '--color-background-surface': '#FFFFFF',
    '--color-background-card': '#FFFFFF',
    '--color-background-popover': '#FFFFFF',
    '--color-background-muted': '#F0EEFF',
    
    // Borders
    '--color-border': '#E5E5E5',
    '--color-border-emphasized': '#D4D4D4',
    
    // Text
    '--color-text-primary': '#171717',
    '--color-text-secondary': '#525252',
    '--color-text-muted': '#737373',
    
    // Status
    badge: {
      'variant:info': {
        backgroundColor: '#F0EEFF',
        '--color-accent': '#635BFF',
      },
      'variant:success': {
        backgroundColor: '#F0FDF4',
        '--color-success': '#16A34A',
      },
      'variant:warning': {
        backgroundColor: '#FFFBEB',
        '--color-warning': '#F59E0B',
      },
      'variant:error': {
        backgroundColor: '#FEF2F2',
        '--color-error': '#DC2626',
      },
    },
    banner: {
      'status:info': {
        backgroundColor: '#F0EEFF',
        '--color-text-primary': '#635BFF',
        '--color-accent': '#635BFF',
      },
      'status:success': {
        backgroundColor: '#F0FDF4',
        '--color-text-primary': '#16A34A',
        '--color-success': '#16A34A',
      },
      'status:warning': {
        backgroundColor: '#FFFBEB',
        '--color-text-primary': '#F59E0B',
        '--color-warning': '#F59E0B',
      },
      'status:error': {
        backgroundColor: '#FEF2F2',
        '--color-text-primary': '#DC2626',
        '--color-error': '#DC2626',
      },
    },
    card: {
      base: {
        padding: 'var(--spacing-3)',
      },
    },
    section: {
      base: {
        padding: 'var(--spacing-3)',
      },
    },
  },
  icons: neutralIconRegistry,
});
