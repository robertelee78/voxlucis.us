import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://voxlux.us',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'never' },
  vite: { build: { assetsInlineLimit: 0 } },
  devToolbar: { enabled: false },
});
