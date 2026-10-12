import { defineConfig } from 'astro/config';
import solid from '@astrojs/solid-js';
import UnoCSS from 'unocss/astro';

// https://astro.build/config
export default defineConfig({
  integrations: [solid(), UnoCSS({ injectReset: false })],
});
