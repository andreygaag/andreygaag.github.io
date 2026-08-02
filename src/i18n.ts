export const LOCALES = ['en', 'ru'] as const;

export type Locale = (typeof LOCALES)[number];

interface Messages {
  site: {
    title: string;
    description: string;
    footer: string;
    feedTitle: string;
    feedDescription: string;
  };
  navigation: {
    home: string;
    notes: string;
    blog: string;
    projects: string;
    about: string;
    primaryLabel: string;
    contactsLabel: string;
    languageLabel: string;
    primaryLinksLabel: string;
  };
  home: {
    lead: string;
    latestNotes: string;
    allNotes: string;
    featuredProjects: string;
    allProjects: string;
  };
  notes: {
    heading: string;
    description: string;
    empty: string;
  };
  blog: {
    heading: string;
    description: string;
    empty: string;
  };
  projects: {
    heading: string;
    description: string;
    projectsHeading: string;
    openSourceHeading: string;
    openSourceDescription: string;
    linksLabel: string;
  };
  about: {
    heading: string;
    description: string;
    body: string[];
  };
  notFound: {
    heading: string;
    description: string;
    body: string;
    homeLink: string;
  };
  common: {
    draft: string;
    translationPending: string;
  };
}

export const UI = {
  en: {
    site: {
      title: 'Andrey Gaag - Agent Engineering',
      description:
        'Personal research lab of Andrey Gaag: field notes and long-form writing on AI agents, LLM systems, and agent reliability.',
      footer: 'Agent Engineering',
      feedTitle: 'Andrey Gaag - Field Notes & Articles',
      feedDescription:
        'Field notes and long-form articles on AI agents, LLM systems, and agent reliability.',
    },
    navigation: {
      home: 'Home',
      notes: 'Notes',
      blog: 'Blog',
      projects: 'Projects',
      about: 'About',
      primaryLabel: 'Primary navigation',
      contactsLabel: 'Contacts',
      languageLabel: 'Language',
      primaryLinksLabel: 'Primary links',
    },
    home: {
      lead:
        'I build production software, developer tools, and AI-agent systems. Most of my current work is about making agents useful and reliable: giving them memory, planning, tools, and clear boundaries. I write here about what I learn while building them.',
      latestNotes: 'Latest field notes',
      allNotes: 'All notes',
      featuredProjects: 'Featured projects',
      allProjects: 'All projects',
    },
    notes: {
      heading: 'Field Notes',
      description:
        'Curated engineering field notes on AI agents, LLM systems, and agent reliability.',
      empty: 'No notes yet. Check back soon.',
    },
    blog: {
      heading: 'Blog',
      description: 'Long-form articles on AI agents, LLM systems, and agent architectures.',
      empty: 'No articles yet. Check back soon.',
    },
    projects: {
      heading: 'Projects',
      description:
        'Projects and open-source contributions by Andrey Gaag.',
      projectsHeading: 'Projects',
      openSourceHeading: 'Open Source',
      openSourceDescription: 'Contributions to open-source projects.',
      linksLabel: 'links',
    },
    about: {
      heading: 'About me',
      description:
        'Andrey Gaag - agentic systems developer with a backend engineering background since 2010.',
      body: [
        'I am an agentic systems developer with a strong backend engineering background. I have been building backend systems since 2010: services, APIs, integrations, background jobs, and data-heavy applications that have to keep working in production.',
        'Today I apply that experience to AI agents. I lead a small team that designs, builds, and deploys agentic systems for clients, from the initial architecture to production. I build systems that work with context, memory, planning, tools, and recovery instead of treating a model response as the whole product. I care about what happens in real use: whether the system preserves state, detects problems, respects boundaries, and can provide evidence for its result.',
        'I also work on developer tools, local LLM setups, mobile and desktop products, and open-source software. This site collects practical notes and longer articles from that work.',
      ],
    },
    notFound: {
      heading: 'Page not found',
      description: 'The requested page does not exist.',
      body: 'The page may have moved, or the address may be incorrect.',
      homeLink: 'Go to the home page',
    },
    common: {
      draft: 'Draft',
      translationPending: 'Translation pending',
    },
  },
  ru: {
    site: {
      title: 'Андрей Гааг - Инженерия AI-агентов',
      description:
        'Личная исследовательская лаборатория Андрея Гаага: заметки и статьи об AI-агентах, LLM-системах и надёжности агентов.',
      footer: 'Инженерия AI-агентов',
      feedTitle: 'Андрей Гааг - заметки и статьи',
      feedDescription:
        'Инженерные заметки и статьи об AI-агентах, LLM-системах и надёжности агентов.',
    },
    navigation: {
      home: 'Главная',
      notes: 'Заметки',
      blog: 'Блог',
      projects: 'Проекты',
      about: 'Обо мне',
      primaryLabel: 'Основная навигация',
      contactsLabel: 'Контакты',
      languageLabel: 'Язык',
      primaryLinksLabel: 'Основные ссылки',
    },
    home: {
      lead:
        'Я создаю production-системы, инструменты для разработчиков и AI-агентов. Сейчас в моей работе главное - сделать агентов полезными и надёжными: дать им память, планирование, инструменты и понятные границы. Здесь я рассказываю о том, что узнаю, пока их строю.',
      latestNotes: 'Свежие полевые заметки',
      allNotes: 'Все заметки',
      featuredProjects: 'Основные проекты',
      allProjects: 'Все проекты',
    },
    notes: {
      heading: 'Полевые заметки',
      description:
        'Проверенные инженерные заметки об AI-агентах, LLM-системах и надёжности агентов.',
      empty: 'Заметок пока нет.',
    },
    blog: {
      heading: 'Блог',
      description: 'Подробные статьи об AI-агентах, LLM-системах и архитектуре агентов.',
      empty: 'Статей пока нет.',
    },
    projects: {
      heading: 'Проекты',
      description:
        'Проекты и вклад Андрея Гаага в open source.',
      projectsHeading: 'Проекты',
      openSourceHeading: 'Open Source',
      openSourceDescription: 'Вклад в открытые проекты.',
      linksLabel: 'ссылки',
    },
    about: {
      heading: 'Обо мне',
      description:
        'Андрей Гааг - разработчик агентных систем с большим бэкграундом в backend-разработке с 2010 года.',
      body: [
        'Я разработчик агентных систем с большим бэкграундом в backend-разработке. С 2010 года занимаюсь backend-системами: сервисами, API, интеграциями, фоновыми процессами и приложениями, работающими с данными и production-ограничениями.',
        'Сейчас я применяю этот опыт к AI-агентам. Я руковожу небольшой командой, которая проектирует, разрабатывает и внедряет агентские системы для клиентов - от архитектуры до запуска в production. Мы создаём системы, которые работают с контекстом, памятью, планированием, инструментами и восстановлением после ошибок, а не просто выдают ответ модели. Мне важно, как система ведёт себя в реальной работе: сохраняет ли состояние, обнаруживает ли проблемы, соблюдает ли границы и может ли подтвердить результат.',
        'Также я занимаюсь developer tools, локальными LLM-системами, мобильными и desktop-продуктами и open-source. На этом сайте собираю практические заметки и более подробные статьи о такой работе.',
      ],
    },
    notFound: {
      heading: 'Страница не найдена',
      description: 'Запрошенной страницы не существует.',
      body: 'Возможно, страница переехала или в адресе есть ошибка.',
      homeLink: 'Перейти на главную',
    },
    common: {
      draft: 'Черновик',
      translationPending: 'Перевод готовится',
    },
  },
} satisfies Record<Locale, Messages>;

export function normalizeLocalizedRoute(route: string, path = ''): string {
  const normalizedPath = path.replace(/^\/+|\/+$/g, '');
  if (!normalizedPath) {
    return route.endsWith('/') ? route : `${route}/`;
  }

  const isPage = !normalizedPath.split('/').at(-1)?.includes('.');
  return isPage ? `${route.replace(/\/$/, '')}/` : route.replace(/\/$/, '');
}
