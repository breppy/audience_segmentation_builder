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

    Promise.all([fetchUsers(), fetchSuppressions()])
      .then(([u, s]) => {
        if (!cancelled) {
          setUsers(u);
          setSuppressions(s);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load Airtable data');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return { users, suppressions, loading, error };
}
