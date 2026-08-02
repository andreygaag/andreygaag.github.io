export function isContentVisible(draft: boolean, isProduction: boolean): boolean {
  return !isProduction || isPublishedContent(draft);
}

export function isPublishedContent(draft: boolean): boolean {
  return !draft;
}
