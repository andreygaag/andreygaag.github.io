import { getCollection, type CollectionEntry } from 'astro:content';
import { getContentIdentity, assertValidContentPairs } from '../content/pairs';
import { isContentVisible } from '../content/visibility';
import type { Locale } from '../i18n';

export async function getLocalizedNotes(locale: Locale): Promise<CollectionEntry<'notes'>[]> {
  const notes = await getCollection('notes');
  assertValidContentPairs(notes, 'notes');
  return notes.filter((entry) => entry.data.lang === locale && isVisible(entry));
}

export async function getLocalizedArticles(
  locale: Locale,
): Promise<CollectionEntry<'articles'>[]> {
  const articles = await getCollection('articles');
  assertValidContentPairs(articles, 'articles');
  return articles.filter((entry) => entry.data.lang === locale && isVisible(entry));
}

export function contentSlug(entry: { id: string }): string {
  return getContentIdentity(entry.id).slug;
}

export const byPubDateDesc = (
  first: { data: { pubDate: Date } },
  second: { data: { pubDate: Date } },
) => second.data.pubDate.valueOf() - first.data.pubDate.valueOf();

function isVisible({ data }: CollectionEntry<'notes'> | CollectionEntry<'articles'>): boolean {
  return isContentVisible(data.draft, import.meta.env.PROD);
}
