import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://andreygaag.com',
  i18n: {
    locales: ['en', 'ru'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en',
          ru: 'ru',
        },
      },
      serialize: addDefaultAlternate,
      filter: (page) => !/(?:^|\/)404(?:\/|\.html)?$/.test(new URL(page).pathname),
    }),
  ],
});

function addDefaultAlternate(page) {
  const english = page.links?.find(({ lang }) => lang === 'en');
  if (!english) {
    return page;
  }

  return {
    ...page,
    links: [...page.links, { lang: 'x-default', url: english.url }],
  };
}
