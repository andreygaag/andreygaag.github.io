import type { Locale } from '../i18n';

export interface ProjectLink {
  label: string;
  url: string;
}

export interface Project {
  name: string;
  description: string;
  links?: ProjectLink[];
}

export interface OpenSourceContribution {
  name: string;
  description: string;
  links: ProjectLink[];
}

interface ProjectDefinition {
  name: string;
  description: Record<Locale, string>;
  links: ProjectLink[];
}

export function getProjects(locale: Locale): Project[] {
  return PROJECTS.map((project) => ({
    name: project.name,
    description: project.description[locale],
    links: project.links,
  }));
}

const PROJECTS: ProjectDefinition[] = [
  {
    name: 'QuickBrowser',
    description: {
      en: 'A minimalist macOS browser picker that routes links to the right browser and learns repeated choices.',
      ru: 'Минималистичный macOS-пикер браузеров, который направляет ссылки в нужный браузер и запоминает повторяющиеся выборы.',
    },
    links: [{ label: 'GitHub', url: 'https://github.com/andreygaag/quickbrowser' }],
  },
];

const OPEN_SOURCE_CONTRIBUTIONS: Record<Locale, OpenSourceContribution[]> = {
  en: [
    {
      name: 'LazySQL',
      description: 'Contribution to the open-source LazySQL project.',
      links: [{ label: 'Pull request #303', url: 'https://github.com/jorgerojas26/lazysql/pull/303' }],
    },
  ],
  ru: [
    {
      name: 'LazySQL',
      description: 'Вклад в развитие открытого проекта LazySQL.',
      links: [{ label: 'Pull request #303', url: 'https://github.com/jorgerojas26/lazysql/pull/303' }],
    },
  ],
};

export function getOpenSourceContributions(locale: Locale): OpenSourceContribution[] {
  return OPEN_SOURCE_CONTRIBUTIONS[locale];
}
