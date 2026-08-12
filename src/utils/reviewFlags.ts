import type { ReviewFlag, SegmentPurpose, AirtableSuppression } from '../types';

interface FormValues {
  businessGoal: string;
  inclusions: string[];
  exclusions: string[];
  engagementRequirement: string;
  suppressions: string[];
  purposes: SegmentPurpose[];
}

function flag(id: string, question: string, hint: string): ReviewFlag {
  return { id, question, hint, resolution: null, answer: '' };
}

export function generateFlags(
  values: FormValues,
  allSuppressions: AirtableSuppression[],
): ReviewFlag[] {
  const flags: ReviewFlag[] = [];
  const searchText = [values.businessGoal, ...values.inclusions].join(' ').toLowerCase();

  // Timeframe — very common gap in fundraising segments
  const hasTimeframe = /\d{4}|last \d|past \d|year|month|quarter|cycle|recent|since|before|after/.test(searchText);
  if (!hasTimeframe) {
    flags.push(flag(
      'timeframe',
      'What date range or timeframe defines this audience?',
      'e.g. Participants from Jan 2022 – Dec 2025, or anyone active in the last 3 years',
    ));
  }

  // Engagement threshold
  if (!values.engagementRequirement.trim()) {
    flags.push(flag(
      'engagement',
      'Is there a minimum engagement threshold, or is this audience unrestricted?',
      'e.g. Opened at least one email in the past 12 months — or — No engagement requirement',
    ));
  }

  // Exclusion check — inclusions without exclusions is often an oversight
  if (values.inclusions.length > 0 && values.exclusions.length === 0) {
    flags.push(flag(
      'exclusions',
      'Are there people who technically qualify but should be kept out?',
      'e.g. Already registered for the current cycle, event staff, major gift prospects in active cultivation',
    ));
  }

  // Suppression impact — lots of suppressions can significantly reduce audience
  const alwaysOnCount = allSuppressions.filter(s => s.alwaysApply).length;
  if (values.suppressions.length + alwaysOnCount >= 3) {
    flags.push(flag(
      'suppression_impact',
      'Multiple suppressions are active — do you have a minimum viable audience size in mind?',
      'e.g. We need at least 2,000 records to justify the campaign cost',
    ));
  }

  // Reporting-only — what decision or report will this feed?
  if (values.purposes.includes('reporting') && values.purposes.length === 1) {
    flags.push(flag(
      'reporting_use',
      'What specific report or decision will this data feed?',
      'e.g. FY2027 board deck participation projections, venue capacity planning for CFS',
    ));
  }

  // Success metric — always included, almost always underspecified
  flags.push(flag(
    'success_metric',
    'How will you measure whether this segment was successful?',
    'e.g. 15% registration rate, 500 new participants, meaningful improvement over the 2026 cohort',
  ));

  return flags;
}
