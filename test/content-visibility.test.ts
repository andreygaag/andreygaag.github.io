import { describe, expect, test } from 'bun:test';
import { isContentVisible, isPublishedContent } from '../src/content/visibility';

describe('isContentVisible', () => {
  test('shows drafts only during development', () => {
    expect(isContentVisible(true, false)).toBe(true);
    expect(isContentVisible(true, true)).toBe(false);
    expect(isContentVisible(false, true)).toBe(true);
  });

  test('publishes only non-drafts', () => {
    expect(isPublishedContent(false)).toBe(true);
    expect(isPublishedContent(true)).toBe(false);
  });
});
