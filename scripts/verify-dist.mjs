import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { installCommand, installerSourceUrl } from '../src/data/project.ts';
import { verifyInstallerConfig } from './installer-transport.mjs';

const root = path.resolve('dist');
const files = await readdir(root, { recursive: true });
const pages = files.filter(file => file.endsWith('.html'));
assert.deepEqual(pages.sort(), ['404.html', 'agents/index.html', 'docs/getting-started/index.html', 'index.html', 'security/index.html']);
let links = 0;
for (const file of pages) {
  const html = await readFile(path.join(root, file), 'utf8');
  assert.match(html, /<html lang="en"/u, `${file}: document language`);
  assert.match(html, /<title>[^<]+<\/title>/u, `${file}: title`);
  assert.match(html, /name="description"/u, `${file}: description`);
  assert.equal((html.match(/<h1\b/gu) || []).length, 1, `${file}: one main heading`);
  assert.doesNotMatch(html, /<script\b(?![^>]*\bsrc=)[^>]*>/u, `${file}: no inline script`);
  assert.doesNotMatch(html, /<(?:script|link)[^>]*(?:src|href)="https?:\/\/(?!voxlux\.us)/u, `${file}: no third-party script or stylesheet`);
  for (const match of html.matchAll(/\b(?:href|src)="([^"<>]+)"/gu)) {
    const value = match[1].replaceAll('&amp;', '&');
    const url = new URL(value, `https://voxlux.us/${file.replace(/index\.html$/u, '')}`);
    if (url.origin !== 'https://voxlux.us') continue;
    let target = path.join(root, decodeURIComponent(url.pathname));
    if (url.pathname.endsWith('/')) target = path.join(target, 'index.html');
    assert.equal((await stat(target)).isFile(), true, `${file}: broken local link ${value}`);
    if (url.hash && target.endsWith('.html')) {
      const destination = await readFile(target, 'utf8');
      assert.ok(destination.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`), `${file}: missing anchor ${value}`);
    }
    links++;
  }
}
assert.ok(files.includes('sitemap.xml'), 'sitemap exists');
assert.ok(files.includes('robots.txt'), 'robots.txt exists');
assert.ok(files.includes('favicon.svg'), 'Vox favicon exists');
const home = await readFile(path.join(root, 'index.html'), 'utf8');
assert.ok(!files.includes('install.sh'), 'GitHub is the only installer host; no dist/install.sh copy');
await assert.rejects(stat('public/install.sh'), { code: 'ENOENT' }, 'no public installer copy');
verifyInstallerConfig(await readFile('ops/apache/voxlux.us.conf', 'utf8'));
for (const file of ['index.html', 'docs/getting-started/index.html']) {
  const html = await readFile(path.join(root, file), 'utf8');
  assert.ok(html.includes(installCommand), `${file}: vanity installer command`);
  assert.ok(html.includes(`href="${installerSourceUrl}"`), `${file}: inspect original GitHub installer`);
}
for (const panel of ['room', 'keyring', 'services']) {
  assert.ok(home.includes(`id="view-${panel}"`), `app study includes ${panel}`);
  assert.ok(home.includes(`aria-controls="view-${panel}"`), `${panel} control names its panel`);
}
assert.ok(home.includes('not a released macOS app'), 'study is not represented as a shipping client');
assert.ok(home.includes('/milestone/2'), 'product direction links to the v0.3.0 milestone');
assert.doesNotMatch(home, /data-consent-demo|network-diagram/u, 'superseded draft is not in the artifact');
assert.ok(!files.some(file => /(?:^|\/)(?:\.env|\.git|node_modules|src|package\.json)/u.test(file)), 'only public output is built');
console.log(`Verified ${pages.length} HTML pages, ${links} local asset/link targets, page metadata, and static output boundaries.`);
