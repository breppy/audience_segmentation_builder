import type { Segment, CampaignUsage, AirtableUser, AirtableSuppression } from '../types';

const BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID as string;
const TOKEN = import.meta.env.VITE_AIRTABLE_TOKEN as string;
const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}`;

export const airtableEnabled = Boolean(BASE_ID && TOKEN);

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

interface AirtableRecord<T> {
  id: string;
  fields: T;
}
interface AirtableList<T> {
  records: AirtableRecord<T>[];
  offset?: string;
}

async function fetchAll<T>(table: string): Promise<AirtableRecord<T>[]> {
  const records: AirtableRecord<T>[] = [];
  let offset: string | undefined;
  do {
    const params = offset ? `?offset=${offset}` : '';
    const page = await request<AirtableList<T>>(`${encodeURIComponent(table)}${params}`);
    records.push(...page.records);
    offset = page.offset;
  } while (offset);
  return records;
}

// ── Reference data ──────────────────────────────────────────────────────────

export async function fetchUsers(): Promise<AirtableUser[]> {
  const records = await fetchAll<Record<string, unknown>>('Users');
  return records
    .filter(r => r.fields['Active'] !== false)
    .map(r => ({
      recordId: r.id,
      name: String(r.fields['Name'] ?? ''),
      email: String(r.fields['Email'] ?? ''),
      role: String(r.fields['Role'] ?? ''),
      department: String(r.fields['Department'] ?? ''),
      active: r.fields['Active'] !== false,
    }));
}

export async function fetchSuppressions(): Promise<AirtableSuppression[]> {
  const records = await fetchAll<Record<string, unknown>>('Suppressions');
  return records.map(r => {
    const appliesTo = r.fields['Applies To'];
    return {
      recordId: r.id,
      suppressionId: String(r.fields['Suppression ID'] ?? ''),
      name: String(r.fields['Suppression Name'] ?? r.fields['Name'] ?? ''),
      category: String(r.fields['Category'] ?? 'Other'),
      description: String(r.fields['Description'] ?? ''),
      alwaysApply: r.fields['Always Apply'] === true || r.fields['Always Apply'] === 'checked',
      appliesTo: typeof appliesTo === 'string'
        ? appliesTo.split(',').map(s => s.trim())
        : Array.isArray(appliesTo) ? appliesTo as string[] : [],
    };
  });
}

// ── Segment sync ─────────────────────────────────────────────────────────────

function segmentToFields(segment: Segment): Record<string, unknown> {
  const { layer2, layer3 } = segment;
  const fields: Record<string, unknown> = {
    'Segment Name': segment.name,
    'Status': statusLabel(segment.status),
    'Notes': segment.notes || undefined,
    'Business Goal': layer2.businessGoal || undefined,
    'Engagement Requirement': layer2.engagementRequirement || undefined,
    'Inclusions': layer2.inclusions.join('\n') || undefined,
    // Business Owner / Approver / Assignee are written separately since
    // they may be linked record or collaborator fields in Airtable
  };

  // Known Suppressions = linked records from Suppressions table
  if (layer2.suppressions.length) {
    fields['Known Suppressions'] = layer2.suppressions;
  }

  if (layer3) {
    fields['LO Group Name'] = layer3.loGroupName || undefined;
    fields['BBCRM Query Name'] = layer3.bbcrmQueryName || undefined;
    fields['Suppressions'] = layer3.dataSources.join('\n') || undefined;
    fields['Refresh Schedule'] = layer3.refreshSchedule || undefined;
    fields['Refresh Logic'] = layer3.refreshLogic || undefined;
    fields['Technical Details'] = [layer3.loGroupName, layer3.bbcrmQueryName]
      .filter(Boolean).join(' / ') || undefined;
    if (layer3.deviations && layer3.deviations !== 'None') {
      fields['Notes'] = [segment.notes, `Deviations: ${layer3.deviations}`]
        .filter(Boolean).join('\n\n');
    }
  }

  if (segment.dateLocked) {
    fields['Date Locked'] = segment.dateLocked;
  }

  return Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
}

// Minimal safe fields — used as fallback if full write fails
function segmentToMinimalFields(segment: Segment): Record<string, unknown> {
  return {
    'Segment Name': segment.name,
    'Status': statusLabel(segment.status),
    ...(segment.notes ? { 'Notes': segment.notes } : {}),
    ...(segment.layer2.businessGoal ? { 'Business Goal': segment.layer2.businessGoal } : {}),
  };
}

function statusLabel(status: Segment['status']): string {
  const map: Record<string, string> = {
    draft: 'Draft',
    pending_approval: 'Pending Approval',
    feasibility_review: 'Feasibility Review',
    building: 'Building',
    locked: 'Locked',
    active: 'Active',
    retired: 'Retired',
    on_hold: 'On Hold',
  };
  return map[status] ?? status;
}

export async function createSegmentRecord(segment: Segment): Promise<string> {
  const table = encodeURIComponent('Segment Library');
  try {
    const result = await request<AirtableRecord<unknown>>(table, {
      method: 'POST',
      body: JSON.stringify({ fields: segmentToFields(segment) }),
    });
    return result.id;
  } catch (err) {
    // Retry with minimal fields in case some columns are typed fields (linked records, etc.)
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('422') || msg.includes('400') || msg.includes('UNKNOWN_FIELD_NAME') || msg.includes('INVALID_VALUE_FOR_COLUMN')) {
      const result = await request<AirtableRecord<unknown>>(table, {
        method: 'POST',
        body: JSON.stringify({ fields: segmentToMinimalFields(segment) }),
      });
      return result.id;
    }
    throw err;
  }
}

export async function updateSegmentRecord(airtableId: string, segment: Segment): Promise<void> {
  const path = `${encodeURIComponent('Segment Library')}/${airtableId}`;
  try {
    await request(path, {
      method: 'PATCH',
      body: JSON.stringify({ fields: segmentToFields(segment) }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('422') || msg.includes('400') || msg.includes('UNKNOWN_FIELD_NAME') || msg.includes('INVALID_VALUE_FOR_COLUMN')) {
      await request(path, {
        method: 'PATCH',
        body: JSON.stringify({ fields: segmentToMinimalFields(segment) }),
      });
      return;
    }
    throw err;
  }
}

// ── Campaign Usage sync ───────────────────────────────────────────────────────

function usageToFields(segmentAirtableId: string, usage: CampaignUsage): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    'Campaign Name': usage.campaignName,
    'Segment Library': [segmentAirtableId], // linked record
    'Send Date': usage.sendDate || undefined,
    'Channel': usage.channel ? capitalize(usage.channel) : undefined,
    'Intended Segment Size': usage.intendedSegmentSize || undefined,
    'Campaign Goal': usage.campaignGoal || undefined,
    'Campaign Owner': usage.campaignOwner || undefined,
    'Creative/Message Theme': usage.creativeTheme || undefined,
    'Notes': usage.notes || undefined,
  };
  return Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function createCampaignUsageRecord(segmentAirtableId: string, usage: CampaignUsage): Promise<string> {
  const body = { fields: usageToFields(segmentAirtableId, usage) };
  const result = await request<AirtableRecord<unknown>>(`${encodeURIComponent('Campaign Usage')}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return result.id;
}
