import { useState, useEffect } from 'react';
import type { AirtableUser, AirtableSuppression } from '../types';
import { fetchUsers, fetchSuppressions, airtableEnabled } from '../utils/airtable';

export interface AirtableRefData {
  users: AirtableUser[];
  suppressions: AirtableSuppression[];
  loading: boolean;
  error: string | null;
}

export function useAirtableRef(): AirtableRefData {
  const [users, setUsers] = useState<AirtableUser[]>([]);
  const [suppressions, setSuppressions] = useState<AirtableSuppression[]>([]);
  const [loading, setLoading] = useState(airtableEnabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!airtableEnabled) return;

    let cancelled = false;
    setLoading(true);

    const settle = <T,>(p: Promise<T>, fallback: T): Promise<T> =>
      p.catch((err: unknown) => {
        console.warn('Airtable table fetch failed:', err instanceof Error ? err.message : err);
        return fallback;
      });

    Promise.all([settle(fetchUsers(), []), settle(fetchSuppressions(), [])])
      .then(([u, s]) => {
        if (!cancelled) {
          setUsers(u);
          setSuppressions(s);
          setError(u.length === 0 && s.length === 0
            ? 'Could not load data from Airtable — check token and table names in browser console'
            : null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return { users, suppressions, loading, error };
}
