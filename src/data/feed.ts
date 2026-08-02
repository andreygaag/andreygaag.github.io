import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { isPublishedContent } from '../content/visibility';
import { contentSlug, getLocalizedArticles, getLocalizedNotes } from './collections';
import { localizedContentRoute, localizedRoute } from '../astro-i18n';
import { UI, type Locale } from '../i18n';

export async function createFeed(context: APIContext, locale: Locale): Promise<Response> {
  const site = context.site!;
  const feedSite = new URL(localizedRoute(locale), site);
  const notes = (await getLocalizedNotes(locale)).filter((entry) =>
    isPublishedContent(entry.data.draft),
  );
  const articles = (await getLocalizedArticles(locale)).filter((entry) =>
    isPublishedContent(entry.data.draft),
  );
  const items = [
    ...notes.map((entry) => ({ entry, section: 'notes' as const })),
    ...articles.map((entry) => ({ entry, section: 'blog' as const })),
  ]
    .map(({ entry, section }) => ({
      title: entry.data.title,
      pubDate: entry.data.pubDate,
      description: entry.data.description,
      link: new URL(localizedContentRoute(locale, section, contentSlug(entry)), site).href,
    }))
    .sort((first, second) => second.pubDate.valueOf() - first.pubDate.valueOf());

  return rss({
    title: UI[locale].site.feedTitle,
    description: UI[locale].site.feedDescription,
    site: feedSite,
    items,
    customData: `<language>${locale}</language>`,
  });
}
