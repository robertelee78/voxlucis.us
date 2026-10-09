import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { installCommand, installerSourceUrl } from '../src/data/project.ts';
import { verifyInstallerConfig } from './installer-transport.mjs';

const root = path.resolve('dist');
const files = await readdir(root, { recursive: true });
const pages = files.filter(file => file.endsWith('.html'));
const manual = JSON.parse(await readFile(path.join(root, 'docs/manual/provenance.json'), 'utf8'));
assert.equal(manual.schemaVersion, 1, 'PRODUCT: manual provenance is readable');
assert.ok(manual.pages.length > 0, 'PRODUCT: manual has chapters');
assert.match(manual.sourceCommit, /^[a-f0-9]{40}$/u, 'PRODUCT: manual records one source revision');
const manualPages = manual.pages.map(page => page.route.slice(1) + 'index.html');
assert.deepEqual(pages.sort(), ['404.html', 'agents/index.html', 'docs/getting-started/index.html', 'index.html', 'security/index.html', ...manualPages].sort(), 'PRODUCT: every manual chapter and existing route is published');
let links = 0;
for (const file of pages) {
  const html = await readFile(path.join(root, file), 'utf8');
  assert.match(html, /<html lang="en"/u, `${file}: document language`);
  assert.match(html, /<title>[^<]+<\/title>/u, `${file}: title`);
  assert.match(html, /name="description"/u, `${file}: description`);
  assert.equal((html.match(/<h1\b/gu) || []).length, 1, `${file}: one main heading`);
  const ids = [...html.matchAll(/\bid="([^"<>]+)"/gu)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, `PRODUCT: ${file} has unambiguous heading and control targets`);
  // Consume complete quoted attributes. A code example in data-copy is inert text,
  // even when its literal value contains tag-looking characters.
  for (const tag of html.matchAll(/<([a-z][\w:-]*)\b((?:[^"'<>]|"[^"]*"|'[^']*')*)>/giu)) {
    const name = tag[1].toLowerCase();
    const attributes = [...tag[2].matchAll(/\s+([^\s"'<>/=]+)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'<>`=]+))?/gu)].map(match => match[1].toLowerCase());
    assert.ok(name !== 'style' && (name !== 'script' || attributes.includes('src')), `PRODUCT: ${file} has no inline script/style elements`);
    assert.ok(!attributes.some(attribute => attribute === 'style' || /^on[a-z]/u.test(attribute)), `PRODUCT: ${file} has no inline handlers or styles`);
  }
  assert.doesNotMatch(html, /<(?:script|link)[^>]*(?:src|href)="https?:\/\/(?!voxlucis\.us)/u, `${file}: no third-party script or stylesheet`);
  for (const match of html.matchAll(/\b(?:href|src)="([^"<>]+)"/gu)) {
    const value = match[1].replaceAll('&amp;', '&');
    const url = new URL(value, `https://voxlucis.us/${file.replace(/index\.html$/u, '')}`);
    if (url.origin !== 'https://voxlucis.us') continue;
    if (url.pathname === '/install.sh' && !url.search && !url.hash) continue; // Validated redirect, deliberately not a second installer file.
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
for (const file of ['index.html', 'docs/manual/install/index.html']) {
  const html = await readFile(path.join(root, file), 'utf8');
  assert.ok(html.includes(installCommand), `${file}: vanity installer command`);
  if (file === 'index.html') assert.ok(html.includes(`href="${installerSourceUrl}"`), `${file}: inspect original GitHub installer`);
}
const sitemap = await readFile(path.join(root, 'sitemap.xml'), 'utf8');
for (const page of manual.pages) {
  const html = await readFile(path.join(root, page.route.slice(1), 'index.html'), 'utf8');
  assert.ok(html.includes(`data-source-commit="${manual.sourceCommit}"`), `PRODUCT: ${page.slug} records the common revision`);
  assert.ok(html.includes(`data-source-sha256="${page.sourceSha256}"`), `PRODUCT: ${page.slug} records its original bytes`);
  assert.ok(html.includes(`data-applicability="${page.appliesTo}"`), `PRODUCT: ${page.slug} states the applicable version`);
  assert.ok(html.includes(`href="${page.sourceUrl}"`), `PRODUCT: ${page.slug} links its immutable source`);
  assert.ok(sitemap.includes(`<loc>https://voxlucis.us${page.route}</loc>`), `PRODUCT: ${page.slug} is discoverable`);
  for (const chapter of manual.pages) assert.ok(html.includes(`href="${chapter.route}"`), `PRODUCT: ${page.slug} can navigate to ${chapter.slug}`);
}
const compatibility = await readFile(path.join(root, 'docs/getting-started/index.html'), 'utf8');
for (const anchor of ['install', 'app', 'identity', 'first-room', 'trust', 'anchors', 'tunnels', 'agents', 'sessions', 'updates']) assert.ok(compatibility.includes(`id="${anchor}"`), `PRODUCT: existing bookmark #${anchor} survives`);
for (const panel of ['room', 'keyring', 'services']) {
  assert.ok(home.includes(`id="view-${panel}"`), `app study includes ${panel}`);
  assert.ok(home.includes(`aria-controls="view-${panel}"`), `${panel} control names its panel`);
}
assert.ok(home.includes('not a live Vox connection'), 'the study is not represented as a live client');
assert.ok(home.includes('/releases/tag/v0.4.0'), 'the home page links the release it describes');
assert.doesNotMatch(home, /data-consent-demo|network-diagram/u, 'superseded draft is not in the artifact');
assert.ok(!files.some(file => /(?:^|\/)(?:\.env|\.git|node_modules|src|package\.json)/u.test(file)), 'only public output is built');
console.log(`Verified ${pages.length} HTML pages, ${links} local asset/link targets, page metadata, and static output boundaries.`);
