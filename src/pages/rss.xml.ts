import type { APIContext } from 'astro';
import { createFeed } from '../data/feed';

export async function GET(context: APIContext) {
  return createFeed(context, 'en');
}
