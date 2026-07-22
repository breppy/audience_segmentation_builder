export type Warmth = 'warm' | 'cold' | 'neutral';
export type ExpectedUse = 'multiple_campaigns' | 'one_time' | 'seasonal';
export type Channel = 'email' | 'sms' | 'paid' | 'mail';
export type SegmentStatus = 'draft' | 'pending_approval' | 'feasibility_review' | 'building' | 'locked' | 'active' | 'retired' | 'on_hold';

export type WorkflowStage = 1 | 2 | 3 | 4 | 5;

export interface Layer2Definition {
  businessGoal: string;
  inclusions: string[];
  exclusions: string[];
  suppressions: string[];
  warmth: Warmth;
  expectedUse: ExpectedUse;
}

export interface Layer3Technical {
  technicalBuild: string;
  dataSources: string[];
  refreshStrategy: string;
  deviations: string;
  estimatedBuildTime: string;
  layer3CompletedDate: string;
}

export interface CampaignUsage {
  id: string;
  campaignName: string;
  sendDate: string;
  channel: Channel;
  deliveryAudienceSize: number;
  notes: string;
}

export interface Segment {
  id: string;
  segmentId: string;
  name: string;
  status: SegmentStatus;
  stage: WorkflowStage;

  // Layer 2
  layer2: Layer2Definition;

  // Layer 3 (filled in after DevIT assessment)
  layer3: Layer3Technical | null;

  // Ownership
  owner: string;
  approver: string;

  // Dates
  dateCreated: string;
  dateSubmittedForApproval: string | null;
  dateApproved: string | null;
  dateSentToDevIT: string | null;
  dateLocked: string | null;

  // Campaign usage (Stage 4–5)
  campaignUsage: CampaignUsage[];

  // Notes/history
  notes: string;
}
