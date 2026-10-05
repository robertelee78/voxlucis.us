import { defineHastPlugin, defineMdastPlugin, markdownToMdast, type MdastNode, type HastNode, type HastVisitorContext } from 'satteri';

type ElementNode = Extract<HastNode, { type: 'element' }>;

export interface ManualPage {
  slug: string;
  path: string;
  title: string;
  description: string;
  appliesTo: string;
}

export const manualRoute = (slug: string) => slug === 'index' ? '/docs/manual/' : `/docs/manual/${slug}/`;
export const applicability = (value: string) => value === 'all' ? 'All readers' : value === 'development' ? 'Development · not the installed release' : `Released ${value}`;

export function validateManifest(value: unknown): ManualPage[] {
  if (!value || typeof value !== 'object') throw new Error('Manual manifest must be an object');
  const manifest = value as Record<string, unknown>;
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.pages) || manifest.pages.length < 1 || manifest.pages.length > 64) {
    throw new Error('Manual manifest requires schemaVersion 1 and 1–64 pages');
  }
  if (Object.keys(manifest).some(key => !['schemaVersion', 'pages'].includes(key))) throw new Error('Unknown manual manifest field');
  const slugs = new Set<string>();
  const paths = new Set<string>();
  const pages = manifest.pages.map((candidate: unknown) => {
    if (!candidate || typeof candidate !== 'object') throw new Error('Invalid manual page');
    const page = candidate as Record<string, unknown>;
    const keys = ['slug', 'path', 'title', 'description', 'appliesTo'];
    if (Object.keys(page).length !== keys.length || keys.some(key => typeof page[key] !== 'string' || !(page[key] as string).trim())) throw new Error('Invalid manual page fields');
    const parsed = page as unknown as ManualPage;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(parsed.slug) || parsed.slug.length > 80) throw new Error('Invalid manual slug');
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]*\.md$/.test(parsed.path) || parsed.path.length > 100) throw new Error('Manual paths must be flat Markdown filenames');
    if (!/^(?:all|development|v\d+\.\d+\.\d+)$/.test(parsed.appliesTo)) throw new Error('Invalid manual applicability');
    for (const field of [parsed.title, parsed.description]) {
      if (field.length > 400 || /[\x00-\x1f\x7f]/.test(field)) throw new Error('Invalid manual display text');
    }
    if (slugs.has(parsed.slug) || paths.has(parsed.path.toLowerCase())) throw new Error('Duplicate manual slug or path');
    slugs.add(parsed.slug); paths.add(parsed.path.toLowerCase());
    return parsed;
  });
  if (pages[0]?.slug !== 'index') throw new Error('The first manual page must be index');
  return pages;
}

function text(node: MdastNode): string {
  if (node.type === 'text' || node.type === 'inlineCode') return node.value;
  return 'children' in node ? node.children.map(child => text(child)).join('') : '';
}

export function resolveManualLink(destination: string, source: URL, pages: ManualPage[], commit: string): string {
  if (!destination || destination !== destination.trim() || /[\x00-\x20\x7f\\]/.test(destination)) throw new Error('Ambiguous manual link');
  if (destination.startsWith('//') || destination.startsWith('/')) throw new Error('Manual links must not be root-relative or protocol-relative');
  if (destination.startsWith('#')) return destination;
  if (/^[a-z][a-z\d+.-]*:/i.test(destination)) {
    const external = new URL(destination);
    if (!['https:', 'http:', 'mailto:'].includes(external.protocol) || external.username || external.password) throw new Error('Unsafe manual link scheme or credentials');
    return external.href;
  }
  // Source-relative paths are deliberately ASCII and unencoded. Fragments may be encoded.
  const relativePath = destination.split(/[?#]/, 1)[0];
  if (!/^[A-Za-z0-9._/-]+$/.test(relativePath)) throw new Error('Ambiguous or encoded manual path');
  const resolved = new URL(destination, source);
  const repositoryRoot = `/robertelee78/vox/blob/${commit}/`;
  if (resolved.origin !== 'https://github.com' || !resolved.pathname.startsWith(repositoryRoot) || resolved.search) throw new Error('Manual link escapes its immutable repository revision');
  const manualRoot = `${repositoryRoot}docs/manual/`;
  if (resolved.pathname.startsWith(manualRoot)) {
    const path = resolved.pathname.slice(manualRoot.length);
    const target = pages.find(page => page.path === path);
    if (!target) throw new Error(`Manual link has no published chapter: ${path}`);
    return manualRoute(target.slug) + resolved.hash;
  }
  return resolved.href;
}

export function validateChapter(markdown: string, page: ManualPage, source: URL, pages: ManualPage[], commit: string): void {
  const titles: string[] = [];
  const walk = (node: MdastNode) => {
    if (['html', 'image', 'imageReference', 'yaml', 'toml'].includes(node.type)) throw new Error(`${page.path}: manual content must be plain Markdown without HTML, images or frontmatter`);
    if (node.type === 'paragraph' && /^(?:import(?:\s+[\s\S]+?\s+from\s*|\s*)["']|export\s+(?:default\b|(?:const|let|var|function|class)\s|\{))/.test(text(node).trim())) throw new Error(`${page.path}: MDX imports and exports are not manual content`);
    if (node.type === 'heading' && node.depth === 1) titles.push(text(node).trim());
    if (node.type === 'link' || node.type === 'definition') resolveManualLink(node.url, source, pages, commit);
    if ('children' in node) node.children.forEach(walk);
  };
  walk(markdownToMdast(markdown));
  if (titles.length !== 1 || titles[0] !== page.title) throw new Error(`${page.path}: exactly one H1 must match the manifest title`);
}

export function manualLinkPolicy(pages: ManualPage[], commit: string) {
  return defineMdastPlugin({
    name: 'vox-manual-links',
    link(node, context) {
      if (!context.fileURL) throw new Error('Manual source URL is missing');
      context.setProperty(node, 'url', resolveManualLink(node.url, context.fileURL, pages, commit));
    },
    definition(node, context) {
      if (!context.fileURL) throw new Error('Manual source URL is missing');
      context.setProperty(node, 'url', resolveManualLink(node.url, context.fileURL, pages, commit));
    },
  });
}

export const manualReadingPolicy = defineHastPlugin({
  name: 'vox-manual-reading',
  element: [{
    filter: ['pre'],
    visit(node: Readonly<ElementNode>, context: HastVisitorContext) {
      const code = context.textContent(node);
      context.setProperty(node, 'tabIndex', 0);
      context.setProperty(node, 'aria-label', 'Code example');
      context.wrapNode(node, {
        type: 'element', tagName: 'div', properties: { className: ['code-block', 'manual-code'] }, children: [{
          type: 'element', tagName: 'div', properties: { className: ['code-toolbar'] }, children: [
            { type: 'element', tagName: 'span', properties: {}, children: [{ type: 'text', value: 'EXAMPLE' }] },
            { type: 'element', tagName: 'button', properties: { type: 'button', className: ['copy-button'], 'data-copy': code, hidden: true, 'aria-label': 'Copy code example' }, children: [{ type: 'element', tagName: 'span', properties: {}, children: [{ type: 'text', value: 'Copy' }] }] },
          ],
        }],
      });
    },
  }, {
    filter: ['table'],
    visit(node: Readonly<ElementNode>, context: HastVisitorContext) {
      context.wrapNode(node, { type: 'element', tagName: 'div', properties: { className: ['manual-table'], tabIndex: 0, role: 'region', 'aria-label': 'Scrollable table' }, children: [] });
    },
  }, {
    filter: ['script', 'style', 'iframe', 'img', 'object', 'embed', 'form'],
    visit() { throw new Error('Unsupported rendered manual element'); },
  }],
});
