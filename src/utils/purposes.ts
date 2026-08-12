import type { SegmentPurpose, AirtableSuppression } from '../types';

export const PURPOSE_OPTIONS: { value: SegmentPurpose; label: string; desc: string }[] = [
  { value: 'email', label: 'Email', desc: 'Outbound email communications. Opt-out and suppression lists are required.' },
  { value: 'sms', label: 'SMS', desc: 'Text message communications. Mobile opt-outs are required.' },
  { value: 'direct_mail', label: 'Direct Mail', desc: 'Physical mail pieces sent to constituents.' },
  { value: 'paid', label: 'Paid', desc: 'Audiences exported to paid media or advertising platforms.' },
  { value: 'export', label: 'Export', desc: 'Data exports to external platforms or partners.' },
  { value: 'reporting', label: 'Reporting Only', desc: 'Analytics and reporting use only — no outbound communications.' },
];

export const PURPOSE_LABEL: Record<SegmentPurpose, string> = {
  email: 'Email',
  sms: 'SMS',
  direct_mail: 'Direct Mail',
  paid: 'Paid',
  export: 'Export',
  reporting: 'Reporting Only',
};

// Matches the exact values in Airtable's "Applies To" multi-select
const PURPOSE_AIRTABLE_LABEL: Record<SegmentPurpose, string> = {
  email: 'Email',
  sms: 'SMS',
  direct_mail: 'Direct Mail',
  paid: 'Paid',
  export: 'Export',
  reporting: 'Reporting',
};

// Communication channels enforce opt-out suppressions
const COMM_PURPOSES = new Set<SegmentPurpose>(['email', 'sms', 'direct_mail', 'paid', 'export']);

export type SuppressionBehavior = 'always' | 'required' | 'suggested' | 'optional';

export function getSuppressionBehavior(
  s: AirtableSuppression,
  purposes: SegmentPurpose[],
): SuppressionBehavior {
  if (s.alwaysApply) return 'always';
  if (purposes.length === 0 || s.appliesTo.length === 0) return 'optional';

  const matchingPurposes = purposes.filter(p =>
    s.appliesTo.includes(PURPOSE_AIRTABLE_LABEL[p]),
  );
  if (matchingPurposes.length === 0) return 'optional';
  if (matchingPurposes.some(p => COMM_PURPOSES.has(p))) return 'required';
  return 'suggested';
}

export function getAutoAppliedIds(
  allSuppressions: AirtableSuppression[],
  purposes: SegmentPurpose[],
): string[] {
  return allSuppressions
    .filter(s => {
      const b = getSuppressionBehavior(s, purposes);
      return b === 'required' || b === 'suggested';
    })
    .map(s => s.recordId);
}
