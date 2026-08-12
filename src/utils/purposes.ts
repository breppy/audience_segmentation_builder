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

// Matches the exact values in Airtable's "Applies To" and "Required For" multi-selects
const PURPOSE_AIRTABLE_LABEL: Record<SegmentPurpose, string> = {
  email: 'Email',
  sms: 'SMS',
  direct_mail: 'Direct Mail',
  paid: 'Paid',
  export: 'Export',
  reporting: 'Reporting',
};

export type SuppressionBehavior = 'always' | 'required' | 'suggested' | 'optional';

export function getSuppressionBehavior(
  s: AirtableSuppression,
  purposes: SegmentPurpose[],
): SuppressionBehavior {
  if (s.alwaysApply) return 'always';
  if (purposes.length === 0) return 'optional';

  const labels = purposes.map(p => PURPOSE_AIRTABLE_LABEL[p]);

  // "Required For" = locked on for these purposes
  if (s.requiredFor?.some(v => labels.includes(v))) return 'required';

  // "Applies To" = default-on but editable for these purposes
  if (s.appliesTo?.some(v => labels.includes(v))) return 'suggested';

  return 'optional';
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
