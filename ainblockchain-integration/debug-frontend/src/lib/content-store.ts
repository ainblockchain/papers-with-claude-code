/**
 * In-memory content store for x402-gated course content.
 * Maps contentId -> { content, contentHash, title, price, payTo, description, createdAt }
 */

import crypto from 'crypto';

export interface StoredContent {
  content: string;
  contentHash: string;
  title: string;
  price: string;
  payTo: string;
  description: string;
  createdAt: number;
}

// Use globalThis to ensure the store is shared across all Next.js API route
// bundles (webpack creates separate module instances per route).
const GLOBAL_KEY = '__x402_content_store__';
const globalAny = globalThis as any;
if (!globalAny[GLOBAL_KEY]) {
  globalAny[GLOBAL_KEY] = new Map<string, StoredContent>();
}
const store: Map<string, StoredContent> = globalAny[GLOBAL_KEY];

function generateContentId(): string {
  return crypto.randomBytes(16).toString('hex');
}

function computeHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function publishContent(params: {
  content: string;
  title: string;
  price: string;
  payTo: string;
  description: string;
}): { contentId: string; contentHash: string } {
  const contentId = generateContentId();
  const contentHash = computeHash(params.content);

  store.set(contentId, {
    content: params.content,
    contentHash,
    title: params.title,
    price: params.price,
    payTo: params.payTo,
    description: params.description,
    createdAt: Date.now(),
  });

  return { contentId, contentHash };
}

export function getContent(contentId: string): StoredContent | undefined {
  return store.get(contentId);
}

export function listCourses(): Array<{
  contentId: string;
  title: string;
  price: string;
  payTo: string;
  description: string;
  contentHash: string;
  createdAt: number;
}> {
  const courses: Array<{
    contentId: string;
    title: string;
    price: string;
    payTo: string;
    description: string;
    contentHash: string;
    createdAt: number;
  }> = [];

  store.forEach((entry, contentId) => {
    courses.push({
      contentId,
      title: entry.title,
      price: entry.price,
      payTo: entry.payTo,
      description: entry.description,
      contentHash: entry.contentHash,
      createdAt: entry.createdAt,
    });
  });

  return courses;
}
