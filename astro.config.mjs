import { defineConfig } from 'astro/config';
import solid from '@astrojs/solid-js';
import UnoCSS from 'unocss/astro';
import { pmcAvatarPlaceholderPlugin } from './src/mocks/avatar-placeholder-plugin.ts';

// https://astro.build/config
export default defineConfig({
  integrations: [solid(), UnoCSS({ injectReset: false })],
  vite: {
    // Mock layer (see src/mocks/avatar-placeholder-plugin.mjs): dev/preview
    // answer /api/data/pmc_avatars/* so avatar <img> requests never 404.
    plugins: [pmcAvatarPlaceholderPlugin()],
  },
});
