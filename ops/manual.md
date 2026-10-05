# Canonical manual publication

Vox owns `docs/manual/manifest.json` and its Markdown chapters. This repository owns the
skin, not the instructions. Every normal build follows `robertelee78/vox` `main` anew;
there is no maintained manual SHA or checked-in chapter copy.

## Build and review

Use the Node version in `.nvmrc`, then `npm ci` and `npm run verify`. `VOX_MANUAL_REF`
can name a review branch, tag or full commit for a controlled build. For example:

```sh
VOX_MANUAL_REF=docs/manual-20261004 npm run verify
```

The loader resolves the ref once through GitHub's SHA response, then retrieves its date
from the immutable Git commit endpoint. The manifest and all chapters come from that same
revision. `GITHUB_TOKEN` is optional for GitHub API rate allowance and is used only in
API request headers. Never put tokens in URLs, build logs or deployment records.

`dist/docs/manual/provenance.json` records the source ref, full commit, revision date,
manifest SHA-256 and each chapter's source URL, applicability, byte length and SHA-256.
Each HTML chapter links its immutable source. The date is the commit date, not a claim that
the instructions were tested on that date. Source/rendered HTML are not executable inputs.

## Bounds and Markdown contract

- Requests have a 15-second deadline covering headers and body. Redirects and unsupported
  media types are refused. HTTP failure, invalid UTF-8, invalid JSON or truncated content
  prevents a candidate; there is no stale content fallback.
- Ref resolution is at most 128 bytes; Git commit metadata is at most 128 KiB; the manifest
  is at most 64 KiB; each chapter is at most 256 KiB; the whole manual including its manifest
  is at most 2 MiB. There are 1–64 chapters, fetched sequentially, with no unbounded retry.
- Schema version 1 uses `schemaVersion` and `pages`. Every page has exactly `slug`, `path`,
  `title`, `description`, `appliesTo`. Slugs and case-insensitive flat `.md` paths are unique;
  the first slug is `index`. Applicability is `all`, `development` or exact `vMAJOR.MINOR.PATCH`.
- Each chapter has exactly one H1 matching the manifest. Plain Markdown only: no raw HTML,
  images, frontmatter, MDX imports or executable components. Fenced code remains inert text.
  Remote syntax highlighting is disabled: the native escaped-code path renders commands,
  avoiding a highlighter interpreting unrecognized fence contents as markup.
- AST link rewriting maps manifest filenames to manual routes. Parent-relative source links
  may leave `docs/manual/` only while remaining within the same repository and resolved commit.
  Root-relative URLs, protocol-relative URLs, encoded/ambiguous relative paths, credentials,
  non-HTTP(S)/mailto schemes and escapes beyond that commit root are refused.
- Missing chapter targets and fragments fail the build. The artifact check also checks links
  to other same-origin pages, legacy bookmarks, route completeness and rendered provenance.
  HTTPS GitHub links can point to separately identified release/development evidence.

## Reader acceptance

Start `npm run preview -- --host 127.0.0.1 --port 4322` after a successful production build,
then run `npm run test:browser`. The existing browser journey includes every real upstream
chapter, keyboard chapter navigation, the mobile reading shortcut, copy and denied-clipboard
fallback, version distinction, 320-pixel and 200%-text reading, print, and JavaScript-disabled
reading/navigation. No fixture manual or new in-process unit-test gate is added.

Observe source-only updates by rebuilding at the changed upstream branch/ref and comparing
the rendered page and provenance; website prose and source-SHA settings need no edit. Refusal
probes are on-demand spikes against the actual build, not permanent synthetic unit gates.

## Publication boundary

Auto-skinning happens on the next website build. A source merge does **not** by itself publish
the website; no cron, webhook publisher or production credential is installed by this work.
Build from the accepted committed website with the intended upstream ref, review the exact
artifact, publish through the existing SSH deployment, and retain the previous directory.
Run `npm run verify:published` against that exact local `dist/`; it compares every public byte,
including all chapters and provenance. A failure must leave the old live site unchanged.

The `/docs/getting-started/` route preserves its eight old fragments as a task map linking the
canonical chapters. It no longer maintains an independent copy of the instructions. Installer
redirects and executable release promotion remain governed by `ops/installer.md`.

## Dependency patch

This work updates Astro 7.2.3 to 7.2.8, the patch named by
[GHSA-26w7-cxv4-gfx2](https://github.com/advisories/GHSA-26w7-cxv4-gfx2), which also moves beyond
the affected range of [GHSA-376h-93r7-7g6f](https://github.com/advisories/GHSA-376h-93r7-7g6f).
The static site does not expose an image-optimization endpoint and the manual refuses images;
the patch removes the known affected dependency rather than introducing that feature.
