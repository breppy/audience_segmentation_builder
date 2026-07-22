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
  return records.map(r => ({
    recordId: r.id,
    name: String(r.fields['Name'] ?? r.fields['Suppression Name'] ?? ''),
  }));
}

// ── Segment sync ─────────────────────────────────────────────────────────────

function segmentToFields(segment: Segment): Record<string, unknown> {
  const { layer2, layer3 } = segment;
  const fields: Record<string, unknown> = {
    'Segment Name': segment.name,
    'Status': statusLabel(segment.status),
    'Notes': segment.notes || undefined,
    'Campaign Intent': layer2.campaignIntent || undefined,
    'Business Goal': layer2.businessGoal || undefined,
    'Inclusions': layer2.inclusions.join('\n') || undefined,
    'Exclusions': layer2.exclusions.join('\n') || undefined,
    'Business Owner': segment.owner || undefined,
    'Approver': segment.approver || undefined,
    'Assignee': segment.owner || undefined,
  };

  if (layer2.suppressions.length) {
    fields['Suppressions'] = layer2.suppressions;
  }

  if (layer3) {
    fields['LO Group Name'] = layer3.loGroupName || undefined;
    fields['BBCRM Query Name'] = layer3.bbcrmQueryName || undefined;
    fields['Data Sources'] = layer3.dataSources.join('\n') || undefined;
    fields['Refresh Strategy'] = layer3.refreshStrategy || undefined;
    fields['Refresh Frequency Details'] = layer3.refreshFrequencyDetails || undefined;
    fields['Deviations from Layer 2'] = layer3.deviations || undefined;
    fields['Technical Build'] = [layer3.loGroupName, layer3.bbcrmQueryName].filter(Boolean).join(' / ') || undefined;
  }

  if (segment.dateLocked) {
    fields['Date Locked'] = segment.dateLocked;
  }

  // Strip undefined values — Airtable rejects them
  return Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
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
  const body = { fields: segmentToFields(segment) };
  const result = await request<AirtableRecord<unknown>>(`${encodeURIComponent('Segment Library')}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return result.id;
}

export async function updateSegmentRecord(airtableId: string, segment: Segment): Promise<void> {
  const body = { fields: segmentToFields(segment) };
  await request(`${encodeURIComponent('Segment Library')}/${airtableId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

// ── Campaign Usage sync ───────────────────────────────────────────────────────

function usageToFields(segmentAirtableId: string, usage: CampaignUsage): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    'Campaign Name': usage.campaignName,
    'Segment ID': [segmentAirtableId],
    'Send Date': usage.sendDate || undefined,
    'Channel': usage.channel ? usage.channel.toUpperCase() : undefined,
    'Intended Segment Size': usage.intendedSegmentSize || undefined,
    'Campaign Goal': usage.campaignGoal || undefined,
    'Campaign Owner': usage.campaignOwner || undefined,
    'Creative/Message Theme': usage.creativeTheme || undefined,
    'Notes': usage.notes || undefined,
  };
  return Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
}

export async function createCampaignUsageRecord(segmentAirtableId: string, usage: CampaignUsage): Promise<string> {
  const body = { fields: usageToFields(segmentAirtableId, usage) };
  const result = await request<AirtableRecord<unknown>>(`${encodeURIComponent('Campaign Usage')}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return result.id;
}
