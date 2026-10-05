# ADR-001: Automatically skin the Vox user manual

**Status**: Accepted for implementation, 2026-10-04. Not yet implemented or published.
**Date**: 2026-10-04
**Deciders**: Robert E. Lee
**Tags**: documentation, static-site, upstream-content

## Context

The owner requested a canonical Vox manual and an automatically styled website, using the
existing hf2q.us approach. The product-owned contract is
[Vox ADR-027](https://github.com/robertelee78/vox/blob/docs/manual-20261004/docs/adr/ADR-027-user-manual-and-website-skin.md).
Its research and independent technical review support this website implementation.

## Decision

The website must implement Vox ADR-027 D4/D5 and M27.3: fetch `docs/manual/manifest.json` and its
chapters from current Vox `main` at build time, resolve one immutable commit per build, render
safe plain Markdown as static HTML, and expose provenance and version applicability. There is
no copied manual prose and no maintained source SHA in this repository. The existing
`/docs/getting-started/` entry must lead to canonical content rather than compete with it.

Navigation, routes and sitemap derive from the validated upstream manifest. Reuse the existing
Astro layout, typography and copy behavior. All text and navigation must work without JavaScript;
mobile and keyboard access are part of acceptance. Unsupported remote content, invalid navigation
or failed retrieval must prevent publication, leaving the known-good live site intact.

The existing SSH deployment remains the publication boundary. Build-time auto-skinning is not a
recurring production publisher. Record exact website and upstream commits, output digests,
verification results and public byte comparisons; retain rollback. No binary release is in scope.
The installed release-proof skill describes Brain plugin/package-specific receipts, not this
static website. Here the applicable proof is a clean committed website, exact tested static
artifact, independent review and post-publication byte comparison. Do not manufacture Brain/npm
or host-installation evidence for a site that contains neither.

## Acceptance and delivery

One source-bound work item owns the website outcome. It must demonstrate that an upstream-only
content edit appears on rebuild, every page uses the same source revision, all chapter links and
fragments work, source/input failures refuse a candidate, and readers can navigate with keyboard,
at narrow widths and without JavaScript. Existing landing, agent guide and installer behavior must
remain working. The accepted artifact must be publicly readable at `/docs/manual/` with exact
published bytes verified against local output. Delivery is that verified public deployment.

## Consequences

GitHub access is required to build, not to read the deployed manual. The strict plain-Markdown
contract initially excludes raw HTML, MDX and images. Future documentation edits occur in Vox;
website code changes only when the presentation or ingestion contract changes. The related Vox
work item owns command accuracy and the real-binary walkthrough; this work item owns the skin
and publication. Both are required for the public result.
