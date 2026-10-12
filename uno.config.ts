// UnoCSS (owner direction 2026-10-12: battle-tested atomic CSS alongside the
// token system). The theme mirrors src/styles/tokens.css 1:1 via the CSS custom
// properties, so utilities like `text-accent`, `bg-surface-raised`,
// `text-muted`, `rounded-lg` resolve to the same WCAG-computed values in light
// and dark without duplicating hex anywhere. Semantic component classes remain
// in component CSS; Uno is for layout/spacing utilities going forward.
import {
  defineConfig,
  presetWind3,
  transformerDirectives,
} from 'unocss';

const tokenColors = {
  surface: 'var(--color-surface)',
  'surface-raised': 'var(--color-surface-raised)',
  'surface-overlay': 'var(--color-surface-overlay)',
  border: 'var(--color-border)',
  primary: 'var(--color-text-primary)',
  muted: 'var(--color-text-muted)',
  accent: 'var(--color-accent)',
  'accent-contrast': 'var(--color-accent-contrast)',
  focus: 'var(--color-focus)',
  success: 'var(--color-success)',
  error: 'var(--color-error)',
  warning: 'var(--color-warning)',
  info: 'var(--color-info)',
};

export default defineConfig({
  presets: [presetWind3()],
  transformers: [transformerDirectives()],
  theme: {
    colors: {
      surface: tokenColors,
      text: { primary: tokenColors.primary, muted: tokenColors.muted },
      accent: { DEFAULT: tokenColors.accent, contrast: tokenColors['accent-contrast'] },
      focus: { DEFAULT: tokenColors.focus },
      success: { DEFAULT: tokenColors.success },
      error: { DEFAULT: tokenColors.error },
      warning: { DEFAULT: tokenColors.warning },
      info: { DEFAULT: tokenColors.info },
    },
    borderRadius: {
      sm: 'var(--radius-sm)',
      md: 'var(--radius-md)',
      lg: 'var(--radius-lg)',
      full: 'var(--radius-full)',
    },
    breakpoints: {
      sm: '40rem',
      md: '48rem',
      lg: '64rem',
      xl: '80rem',
    },
  },
});
