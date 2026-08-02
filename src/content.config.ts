import { glob } from 'astro/loaders';
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';

const localizedContentFields = {
  title: z.string(),
  pubDate: z.coerce.date(),
  description: z.string(),
  tags: z.array(z.string()).default([]),
  lang: z.enum(['en', 'ru']),
  draft: z.boolean(),
};

const requirePublishedText = (
  content: { title: string; description: string; draft: boolean },
  context: z.core.$RefinementCtx,
) => {
  if (content.draft) {
    return;
  }

  for (const field of ['title', 'description'] as const) {
    if (!content[field].trim()) {
      context.addIssue({
        code: 'custom',
        path: [field],
        message: `${field} must not be empty when draft is false`,
        input: content[field],
      });
    }
  }
};

const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
  schema: z
    .object({
      ...localizedContentFields,
      source: z.literal('field-note').optional(),
    })
    .superRefine(requirePublishedText),
});

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object(localizedContentFields).superRefine(requirePublishedText),
});

export const collections = { notes, articles };
