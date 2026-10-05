import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { githubManualLoader } from './loaders/github-manual';

const manual = defineCollection({
  loader: githubManualLoader(),
  schema: z.object({
    slug: z.string(), path: z.string(), title: z.string(), description: z.string(), appliesTo: z.string(),
    order: z.number().int().nonnegative(), route: z.string(), sourceRef: z.string(),
    sourceCommit: z.string().regex(/^[a-f0-9]{40}$/), sourceUpdatedAt: z.string(), sourceUrl: z.url(),
    sourceSha256: z.string().regex(/^[a-f0-9]{64}$/), sourceByteLength: z.number().int().positive(), manifestSha256: z.string().regex(/^[a-f0-9]{64}$/),
  }),
});
export const collections = { manual };
