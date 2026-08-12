export type SegmentPurpose = 'email' | 'sms' | 'direct_mail' | 'paid' | 'export' | 'reporting';
export type Channel = 'email' | 'sms' | 'paid' | 'mail';
export type SegmentStatus =
  | 'draft'
  | 'pending_approval'
  | 'feasibility_review'
  | 'building'
  | 'locked'
  | 'active'
  | 'retired'
  | 'on_hold';
export type WorkflowStage = 1 | 2 | 3 | 4 | 5;

export interface Layer2Definition {
  businessGoal: string;
  campaignIntent: string;
  engagementRequirement: string;
  inclusions: string[];
  exclusions: string[];
  suppressions: string[]; // Airtable Known Suppressions record IDs
  purposes: SegmentPurpose[];
}

export interface Layer3Technical {
  loGroupName: string;
  bbcrmQueryName: string;
  dataSources: string[];     // syncs to Airtable "Suppressions" column
  refreshSchedule: string;   // was refreshStrategy → Airtable "Refresh Schedule"
  refreshLogic: string;      // was refreshFrequencyDetails → Airtable "Refresh Logic"
  deviations: string;
  layer3CompletedDate: string;
}

export interface CampaignUsage {
  id: string;
  airtableId?: string;
  campaignName: string;
  campaignGoal: string;
  campaignOwner: string;
  sendDate: string;
  channel: Channel;
  intendedSegmentSize: number;
  deliveryAudienceSize: number;
  creativeTheme: string;
  notes: string;
}

export interface Segment {
  id: string;
  airtableId?: string;
  segmentId: string;
  name: string;
  status: SegmentStatus;
  stage: WorkflowStage;

  layer2: Layer2Definition;
  layer3: Layer3Technical | null;

  owner: string;
  approver: string;

  dateCreated: string;
  dateSubmittedForApproval: string | null;
  dateApproved: string | null;
  dateSentToDevIT: string | null;
  dateLocked: string | null;

  campaignUsage: CampaignUsage[];
  notes: string;
}

// Airtable reference data types
export interface AirtableUser {
  recordId: string;
  name: string;
  email: string;
  role: string;
  department: string;
  active: boolean;
}

export interface AirtableSuppression {
  recordId: string;
  suppressionId: string;
  name: string;
  category: string;
  description: string;
  alwaysApply: boolean;
  appliesTo: string[];
}
