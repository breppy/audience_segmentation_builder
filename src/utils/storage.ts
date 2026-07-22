import type { Segment } from '../types';

const STORAGE_KEY = 'audience_segments';

export function loadSegments(): Segment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSegments(segments: Segment[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(segments));
}

export function generateSegmentId(name: string): string {
  const year = new Date().getFullYear();
  const slug = name
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
  const timestamp = Date.now().toString().slice(-3);
  return `SEG_${year}_${slug}_${timestamp}`;
}

export function generateId(): string {
  return crypto.randomUUID();
}
