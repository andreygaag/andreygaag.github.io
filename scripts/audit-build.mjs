import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const CONTENT = new URL('../src/content/', import.meta.url).pathname;
const SITE = 'https://andreygaag.com';
const outputFiles = walk(DIST);
const htmlFiles = outputFiles.filter((path) => path.endsWith('.html'));
const pages = new Map(htmlFiles.map((path) => [routeFromFile(path), path]));

assert(
  !outputFiles.some((path) => /\.(?:c|m)?js$/.test(path)),
  'Build contains client-side JavaScript files',
);

for (const [route, path] of pages) {
  auditPage(route, path);
  assert(pages.has(counterpartRoute(route)), `${route || '/'} has no localized counterpart`);
}

auditFeeds();
auditSitemap();
auditDrafts();
auditHomepages();
console.log(`Build audit passed for ${pages.size} localized HTML pages.`);

function auditPage(route, path) {
  const html = readFileSync(path, 'utf8');
  const locale = route === 'ru' || route.startsWith('ru/') ? 'ru' : 'en';
  const translationPath = locale === 'ru' ? route.replace(/^ru\/?/, '') : route;
  const englishUrl = pageUrl('en', translationPath);
  const russianUrl = pageUrl('ru', translationPath);
  const canonicalUrl = locale === 'en' ? englishUrl : russianUrl;

  assert(html.includes(`<html lang="${locale}">`), `${route || '/'} has wrong html lang`);
  assert(html.includes(`<link rel="canonical" href="${canonicalUrl}">`), `${route || '/'} has wrong canonical`);
  assert(hasAlternate(html, 'en', englishUrl), `${route || '/'} has wrong en alternate`);
  assert(hasAlternate(html, 'ru', russianUrl), `${route || '/'} has wrong ru alternate`);
  assert(hasAlternate(html, 'x-default', englishUrl), `${route || '/'} has wrong x-default`);
  assert((html.match(/<h1(?:\s|>)/g) ?? []).length === 1, `${route || '/'} must have one h1`);
  assert(!/<script(?:\s|>)/.test(html), `${route || '/'} contains client-side JavaScript`);
  auditInternalTargets(html, route);
}

function auditFeeds() {
  const english = readFileSync(join(DIST, 'rss.xml'), 'utf8');
  const russian = readFileSync(join(DIST, 'ru/rss.xml'), 'utf8');
  assert(english.includes('<language>en</language>'), 'English RSS has wrong language');
  assert(russian.includes('<language>ru</language>'), 'Russian RSS has wrong language');
  assert(channelLink(english) === `${SITE}/`, 'English RSS has wrong channel link');
  assert(channelLink(russian) === `${SITE}/ru/`, 'Russian RSS has wrong channel link');

  const englishItems = english.match(/<item>/g) ?? [];
  const russianItems = russian.match(/<item>/g) ?? [];
  assert(englishItems.length === russianItems.length, 'RSS feeds contain different item counts');
  assert(
    JSON.stringify(contentPaths(english)) === JSON.stringify(contentPaths(russian)),
    'RSS feeds contain different localized entries',
  );
  assert(!/<item>[\s\S]*?<link>[^<]+\/ru\//.test(english), 'English RSS links to Russian content');
  assert(
    [...russian.matchAll(/<item>[\s\S]*?<link>([^<]+)<\/link>/g)].every((match) =>
      match[1].startsWith(`${SITE}/ru/`),
    ),
    'Russian RSS links outside Russian routes',
  );
}

function contentPaths(feed) {
  return [...feed.matchAll(/<item>[\s\S]*?<link>([^<]+)<\/link>/g)]
    .map((match) => new URL(match[1]).pathname.replace(/^\/ru(?=\/)/, ''))
    .sort();
}

function auditSitemap() {
  const sitemap = readFileSync(join(DIST, 'sitemap-0.xml'), 'utf8');
  assert(!sitemap.includes('/404'), 'Sitemap contains a 404 page');

  for (const route of pages.keys()) {
    if (route.endsWith('404')) {
      continue;
    }

    const locale = route === 'ru' || route.startsWith('ru/') ? 'ru' : 'en';
    const translationPath = locale === 'ru' ? route.replace(/^ru\/?/, '') : route;
    const englishUrl = pageUrl('en', translationPath);
    const russianUrl = pageUrl('ru', translationPath);
    const url = pageUrl(locale, translationPath);
    const entry = sitemapEntry(sitemap, url);

    assert(entry, `Sitemap is missing ${route || '/'}`);
    assert(hasSitemapAlternate(entry, 'en', englishUrl), `Sitemap has wrong en alternate for ${url}`);
    assert(hasSitemapAlternate(entry, 'ru', russianUrl), `Sitemap has wrong ru alternate for ${url}`);
    assert(
      hasSitemapAlternate(entry, 'x-default', englishUrl),
      `Sitemap has wrong x-default for ${url}`,
    );
  }
}

function auditDrafts() {
  const feeds = [join(DIST, 'rss.xml'), join(DIST, 'ru/rss.xml')]
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n');
  const sitemap = readFileSync(join(DIST, 'sitemap-0.xml'), 'utf8');

  for (const route of draftRoutes()) {
    const url = `${SITE}/${route}/`;
    assert(!pages.has(route), `Draft has a production route: ${route}`);
    assert(!feeds.includes(url), `Draft appears in RSS: ${route}`);
    assert(!sitemap.includes(url), `Draft appears in sitemap: ${route}`);
  }
}

function auditHomepages() {
  const homepages = [
    {
      path: join(DIST, 'index.html'),
      positioning: 'I test where agent systems lie to us and to themselves.',
      flagshipLabel: 'Read the flagship case study',
      flagshipHref: '/notes/2026-08-14-dynamic-system-prompt-tail-breaks-cache/',
      contactLabel: 'Discuss an agent system',
    },
    {
      path: join(DIST, 'ru/index.html'),
      positioning: 'Я проверяю, где агентные системы врут нам и самим себе.',
      flagshipLabel: 'Читать главный разбор',
      flagshipHref: '/ru/notes/2026-08-14-dynamic-system-prompt-tail-breaks-cache/',
      contactLabel: 'Обсудить агентную систему',
    },
  ];

  for (const homepage of homepages) {
    const html = readFileSync(homepage.path, 'utf8');
    assert(html.includes(homepage.positioning), `${homepage.path} has wrong positioning`);
    assert(
      hasCta(html, homepage.flagshipLabel, homepage.flagshipHref, 'cta-primary'),
      `${homepage.path} has wrong flagship CTA`,
    );
    assert(
      hasCta(html, homepage.contactLabel, 'https://t.me/moveax3', 'cta-secondary'),
      `${homepage.path} has wrong contact CTA`,
    );
  }
}

function hasCta(html, label, href, className) {
  const anchor = [...html.matchAll(/<a\b([^>]*)>([^<]+)<\/a>/g)].find(
    (match) => match[2] === label,
  );
  return Boolean(
    anchor &&
      anchor[1].includes(`href="${href}"`) &&
      anchor[1].match(new RegExp(`class="[^"]*\\b${className}\\b[^"]*"`)),
  );
}

function draftRoutes() {
  return ['notes', 'articles'].flatMap((collection) => {
    const directory = join(CONTENT, collection);
    const section = collection === 'articles' ? 'blog' : 'notes';
    return walk(directory)
      .filter((path) => path.endsWith('.md') && isDraft(path))
      .map((path) => contentRoute(directory, section, path));
  });
}

function isDraft(path) {
  const document = readFileSync(path, 'utf8');
  const frontmatter = document.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
  return /^draft:\s*true\s*$/m.test(frontmatter ?? '');
}

function contentRoute(directory, section, path) {
  const segments = relative(directory, path).replace(/\.md$/, '').split('/');
  const locale = segments.shift();
  if (segments.at(-1) === 'index') {
    segments.pop();
  }
  return `${locale === 'ru' ? 'ru/' : ''}${section}/${segments.join('/')}`;
}

function channelLink(feed) {
  return feed.match(/<channel>[\s\S]*?<link>([^<]+)<\/link>/)?.[1];
}

function sitemapEntry(sitemap, url) {
  return [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)]
    .map((match) => match[1])
    .find((entry) => entry.includes(`<loc>${url}</loc>`));
}

function hasSitemapAlternate(entry, locale, url) {
  return entry.includes(`rel="alternate" hreflang="${locale}" href="${url}"`);
}

function auditInternalTargets(html, sourceRoute) {
  const targets = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  for (const target of targets) {
    const internalPath = toInternalPath(target);
    if (!internalPath) {
      continue;
    }

    assert(outputExists(internalPath), `${sourceRoute || '/'} links to missing ${internalPath}`);
  }
}

function toInternalPath(target) {
  if (target.startsWith(SITE)) {
    return new URL(target).pathname;
  }
  if (!target.startsWith('/') || target.startsWith('//')) {
    return null;
  }
  return target.split(/[?#]/, 1)[0];
}

function outputExists(pathname) {
  if (pathname === '/404/' || pathname === '/404.html') {
    return existsSync(join(DIST, '404.html'));
  }
  if (pathname.endsWith('/')) {
    return existsSync(join(DIST, pathname, 'index.html'));
  }
  const directPath = join(DIST, pathname);
  return existsSync(directPath) || existsSync(join(directPath, 'index.html'));
}

function routeFromFile(path) {
  const outputPath = relative(DIST, path);
  if (outputPath === '404.html') {
    return '404';
  }
  return outputPath.replace(/(?:^|\/)index\.html$/, '').replace(/\/$/, '');
}

function counterpartRoute(route) {
  if (route === 'ru') {
    return '';
  }
  if (route.startsWith('ru/')) {
    return route.slice(3);
  }
  return route ? `ru/${route}` : 'ru';
}

function pageUrl(locale, translationPath) {
  const path = translationPath ? `${translationPath}/` : '';
  return `${SITE}/${locale === 'ru' ? 'ru/' : ''}${path}`;
}

function hasAlternate(html, locale, url) {
  return html.includes(`<link rel="alternate" hreflang="${locale}" href="${url}">`);
}

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
