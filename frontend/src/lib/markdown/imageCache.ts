import { useSyncExternalStore } from 'react';

export interface ImageDims {
  w: number;
  h: number;
}

const cache = new Map<string, ImageDims>();
const pending = new Map<string, Promise<ImageDims | null>>();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function probeImage(src: string): Promise<ImageDims | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (cache.has(src)) return Promise.resolve(cache.get(src)!);
  const existing = pending.get(src);
  if (existing) return existing;

  const p = new Promise<ImageDims | null>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const dims: ImageDims = { w: img.naturalWidth, h: img.naturalHeight };
      cache.set(src, dims);
      pending.delete(src);
      emit();
      resolve(dims);
    };
    img.onerror = () => {
      pending.delete(src);
      resolve(null);
    };
    img.src = src;
  });
  pending.set(src, p);
  return p;
}

export function preloadImages(srcs: string[]): void {
  for (const src of srcs) probeImage(src);
}

export function useImageDims(src: string): ImageDims | undefined {
  return useSyncExternalStore(
    subscribe,
    () => cache.get(src),
    () => undefined,
  );
}
