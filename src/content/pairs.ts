import { LOCALES, type Locale } from '../i18n';

interface LocalizedContentRecord {
  id: string;
  body?: string;
  data: {
    lang: Locale;
    pubDate: Date;
    tags: string[];
    draft: boolean;
    source?: string;
  };
}

export interface ContentIdentity {
  locale: Locale;
  slug: string;
}

export function getContentIdentity(id: string): ContentIdentity {
  const segments = id.replace(/\.md$/, '').split('/').filter(Boolean);
  const locale = segments.shift();

  if (!isLocale(locale)) {
    throw new Error(`Content id "${id}" must start with en/ or ru/.`);
  }

  if (segments.at(-1) === 'index') {
    segments.pop();
  }

  const slug = segments.join('/');
  if (!slug) {
    throw new Error(`Content id "${id}" has no slug.`);
  }

  return { locale, slug };
}

export function assertValidContentPairs(
  records: LocalizedContentRecord[],
  collectionName: string,
): void {
  const errors: string[] = [];
  const pairs = new Map<string, Map<Locale, LocalizedContentRecord>>();

  for (const record of [...records].sort((first, second) => first.id.localeCompare(second.id))) {
    collectRecord(record, pairs, errors);
  }

  for (const [slug, pair] of [...pairs].sort(([first], [second]) => first.localeCompare(second))) {
    validatePair(slug, pair, errors);
  }

  if (errors.length > 0) {
    throw new Error(`Invalid ${collectionName} translations:\n- ${errors.join('\n- ')}`);
  }
}

function collectRecord(
  record: LocalizedContentRecord,
  pairs: Map<string, Map<Locale, LocalizedContentRecord>>,
  errors: string[],
): void {
  let identity: ContentIdentity;
  try {
    identity = getContentIdentity(record.id);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    return;
  }

  if (identity.locale !== record.data.lang) {
    errors.push(
      `"${record.id}" declares lang "${record.data.lang}" but is stored under "${identity.locale}".`,
    );
  }

  if (!record.data.draft && !record.body?.trim()) {
    errors.push(`Published entry "${record.id}" has an empty body.`);
  }

  const pair = pairs.get(identity.slug) ?? new Map<Locale, LocalizedContentRecord>();
  if (pair.has(identity.locale)) {
    errors.push(`Duplicate ${identity.locale} entry for "${identity.slug}".`);
  }
  pair.set(identity.locale, record);
  pairs.set(identity.slug, pair);
}

function validatePair(
  slug: string,
  pair: Map<Locale, LocalizedContentRecord>,
  errors: string[],
): void {
  const missingLocales = LOCALES.filter((locale) => !pair.has(locale));
  if (missingLocales.length > 0) {
    errors.push(`"${slug}" is missing ${missingLocales.join(' and ')} translation.`);
    return;
  }

  const english = pair.get('en')!;
  const russian = pair.get('ru')!;
  const metadata = [
    ['pubDate', english.data.pubDate.toISOString(), russian.data.pubDate.toISOString()],
    ['tags', JSON.stringify(english.data.tags), JSON.stringify(russian.data.tags)],
    ['source', english.data.source ?? null, russian.data.source ?? null],
    ['draft', english.data.draft, russian.data.draft],
  ] as const;

  for (const [field, englishValue, russianValue] of metadata) {
    if (englishValue !== russianValue) {
      errors.push(`"${slug}" has different ${field} metadata in en and ru.`);
    }
  }
}

function isLocale(value: string | undefined): value is Locale {
  return LOCALES.some((locale) => locale === value);
}
