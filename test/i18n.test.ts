import { describe, expect, test } from 'bun:test';
import { normalizeLocalizedRoute } from '../src/i18n';

describe('normalizeLocalizedRoute', () => {
  test('normalizes page routes returned by Astro', () => {
    expect(normalizeLocalizedRoute('/', '')).toBe('/');
    expect(normalizeLocalizedRoute('/ru', '')).toBe('/ru/');
    expect(normalizeLocalizedRoute('/about', '/about/')).toBe('/about/');
    expect(normalizeLocalizedRoute('/ru/about/', 'about')).toBe('/ru/about/');
  });

  test('does not append a slash to endpoint routes', () => {
    expect(normalizeLocalizedRoute('/rss.xml/', 'rss.xml')).toBe('/rss.xml');
    expect(normalizeLocalizedRoute('/ru/rss.xml', 'rss.xml')).toBe('/ru/rss.xml');
  });
});
