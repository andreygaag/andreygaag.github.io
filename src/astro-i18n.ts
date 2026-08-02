import { getRelativeLocaleUrl } from 'astro:i18n';
import { normalizeLocalizedRoute, type Locale } from './i18n';

export function localizedRoute(locale: Locale, path = ''): string {
  const normalizedPath = path.replace(/^\/+|\/+$/g, '');
  const route = getRelativeLocaleUrl(locale, normalizedPath);
  return normalizeLocalizedRoute(route, normalizedPath);
}

export function localizedContentRoute(
  locale: Locale,
  section: 'blog' | 'notes',
  slug: string,
): string {
  return localizedRoute(locale, `${section}/${slug}`);
}
