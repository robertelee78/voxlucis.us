import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://voxlucis.us',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'never' },
  vite: { build: { assetsInlineLimit: 0 } },
  devToolbar: { enabled: false },
});
