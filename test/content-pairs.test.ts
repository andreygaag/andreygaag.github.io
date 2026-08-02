import { describe, expect, test } from 'bun:test';
import { assertValidContentPairs, getContentIdentity } from '../src/content/pairs';
import type { Locale } from '../src/i18n';

interface TestRecord {
  id: string;
  body: string;
  data: {
    lang: Locale;
    pubDate: Date;
    tags: string[];
    draft: boolean;
    source?: string;
  };
}

describe('getContentIdentity', () => {
  test('normalizes flat and bundled ids', () => {
    expect(getContentIdentity('en/context-budget')).toEqual({
      locale: 'en',
      slug: 'context-budget',
    });
    expect(getContentIdentity('ru/agent-canon/index')).toEqual({
      locale: 'ru',
      slug: 'agent-canon',
    });
  });

  test('rejects ids outside a locale directory', () => {
    expect(() => getContentIdentity('context-budget')).toThrow('must start with en/ or ru/');
  });
});

describe('assertValidContentPairs', () => {
  test('accepts a complete pair', () => {
    expect(() => assertValidContentPairs(pair(), 'notes')).not.toThrow();
  });

  test('reports a missing translation', () => {
    expect(() => assertValidContentPairs(pair().slice(0, 1), 'notes')).toThrow(
      '"context-budget" is missing ru translation',
    );
  });

  test('reports language and metadata mismatches', () => {
    const records = pair();
    records[1]!.data.lang = 'en';
    records[1]!.data.tags = ['different'];

    expect(() => assertValidContentPairs(records, 'notes')).toThrow(
      'declares lang "en" but is stored under "ru"',
    );
    expect(() => assertValidContentPairs(records, 'notes')).toThrow(
      'different tags metadata',
    );
  });

  test('allows an empty draft and rejects an empty published body', () => {
    const drafts = pair().map((record) => ({
      ...record,
      body: '',
      data: { ...record.data, draft: true },
    }));
    expect(() => assertValidContentPairs(drafts, 'notes')).not.toThrow();

    expect(() => assertValidContentPairs(pair().map((record) => ({ ...record, body: '' })), 'notes'))
      .toThrow('has an empty body');
  });
});

function pair(): TestRecord[] {
  const pubDate = new Date('2026-06-16');
  return [record('en', pubDate), record('ru', pubDate)];
}

function record(locale: Locale, pubDate: Date): TestRecord {
  return {
    id: `${locale}/context-budget`,
    body: 'Body',
    data: {
      lang: locale,
      pubDate,
      tags: ['agents'],
      draft: false,
      source: 'field-note',
    },
  };
}
