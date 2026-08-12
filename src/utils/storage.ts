import type { Segment } from '../types';

const STORAGE_KEY = 'audience_segments';

function migrate(raw: unknown): Segment {
  const s = raw as Segment & { layer2: Record<string, unknown> };
  if (!Array.isArray(s.layer2.purposes)) {
    s.layer2 = { ...s.layer2, purposes: [] };
  }
  return s as Segment;
}

export function loadSegments(): Segment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown[] = JSON.parse(raw);
    return parsed.map(migrate);
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
