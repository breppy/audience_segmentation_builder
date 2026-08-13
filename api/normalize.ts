import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface LuminateRecommendation {
  primaryType: string;
  rationale: string;
  requiresDevIT: boolean;
  alternatives: string | null;
  suppressionApproach: string;
  confidence: 'clear' | 'unclear';
}

interface NormalizeResponse {
  inclusions: string[];
  exclusions: string[];
  recommendation: LuminateRecommendation;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { inclusionText, exclusionText, businessGoal, engagementRequirement, purposes } = req.body as {
    inclusionText: string;
    exclusionText?: string;
    businessGoal?: string;
    engagementRequirement?: string;
    purposes?: string[];
  };

  if (!inclusionText?.trim()) {
    return res.status(400).json({ error: 'inclusionText is required' });
  }

  const prompt = `You are helping a fundraising CRM and digital marketing team analyze an audience segment. Do two things in one response:

1. NORMALIZE the criteria into discrete, testable statements.
2. RECOMMEND how to build this segment in Luminate Online.

━━━ LUMINATE GROUP TYPES ━━━

CRM-Synced
  • Populated from CRM queries via a DevIT request
  • Use when: historical event participation, giving history, RSVPs, past attendance, relationships — anything that is a fact about the constituent's record in CRM
  • Preferred whenever data is CRM-queryable; requires DevIT involvement
  • DevIT required: YES

Query-Based
  • Built from constituent-level data directly in Luminate (Advanced Query)
  • Use when: email deliverability status, email engagement (opens/clicks), Luminate demographic fields, giving history queryable in Luminate
  • Fully dynamic, no DevIT needed for standard queries
  • DevIT required: NO

Report-Based
  • Populated by running a Luminate report; semi-static, manual refresh required
  • Use when: data only exists in report output, not on the constituent record — e.g., TeamRaiser registration detail (specific day, shift, wave, "ride tomorrow" timing)
  • DevIT required: NO (but requires discipline around refreshing)

Task-Based
  • Populated via Luminate Tasks; refreshed by re-running the task
  • Use when: collecting TeamRaiser participants at scale, reusable across campaigns, no day-specific detail needed
  • DevIT required: NO

Interaction-Based
  • Auto-populated by Luminate when an interaction occurs (donation, survey response, TeamRaiser registration broadly)
  • Use when: "who donated to this form," "who responded to this survey," "who registered for this TeamRaiser" — broad, system-driven, no filtering
  • Note: lives solely in Luminate, updates dynamically
  • DevIT required: NO

Manual Upload
  • Fully static; populated by file upload. Last resort only.
  • Use when: data is curated offline with no system source (e.g., matching recipients determined by staff)
  • DevIT required: NO (but highest manual effort)

Interest Group
  • Constituent-level opt-in for ongoing email communications
  • Use when: long-term program affinity or explicit email permission (not one-time actions)
  • DevIT required: NO

Unclear
  • Use when the data source is genuinely ambiguous between two types
  • Always name both candidate types and explain why DevIT review is needed

━━━ SUPPRESSION APPROACH ━━━
For the suppression recommendation, consider:
- Deliverability / opt-out safety suppressions → always Query-Based in Luminate
- CRM-queryable exclusion conditions (e.g., "exclude active major gift prospects") → CRM-Synced group or added to the CRM sync query upstream
- Interaction-specific suppressions (e.g., "already registered") → Interaction-Based group or Report-Based depending on whether detail is needed

━━━ NORMALIZATION RULES ━━━
- One testable condition per statement (no "and" combining multiple conditions in one item)
- Preserve specificity: years, event names, exact exclusion reasons
- Extract exclusions embedded in inclusion text ("who are not X", "excluding Y") into the exclusions array

━━━ INPUT ━━━
Business goal: ${businessGoal || '(not provided)'}
Inclusion criteria: ${inclusionText}${exclusionText?.trim() ? `\nExclusion criteria: ${exclusionText}` : ''}${engagementRequirement?.trim() ? `\nEngagement requirement: ${engagementRequirement}` : ''}${purposes?.length ? `\nSegment purposes: ${purposes.join(', ')}` : ''}

━━━ OUTPUT ━━━
Respond with valid JSON only — no markdown fences, no explanation:
{
  "inclusions": ["discrete criterion 1", "discrete criterion 2"],
  "exclusions": ["discrete criterion 1"],
  "recommendation": {
    "primaryType": "CRM-Synced",
    "rationale": "1-2 sentences explaining why this type fits this segment",
    "requiresDevIT": true,
    "alternatives": null,
    "suppressionApproach": "How the suppressions for this segment should be handled",
    "confidence": "clear"
  }
}

Valid values for primaryType: "CRM-Synced" | "Query-Based" | "Report-Based" | "Task-Based" | "Interaction-Based" | "Manual Upload" | "Interest Group" | "Unclear"
For "Unclear", set alternatives to: "Potentially [Type A] or [Type B] — need to review with DevIT to confirm."
For confidence: "clear" when one type obviously fits; "unclear" when genuinely ambiguous.`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}';
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    let parsed: NormalizeResponse;
    try {
      parsed = JSON.parse(text);
    } catch {
      return res.status(500).json({ error: 'Failed to parse AI response', raw });
    }

    if (!Array.isArray(parsed.inclusions) || !Array.isArray(parsed.exclusions)) {
      return res.status(500).json({ error: 'Unexpected AI response shape', raw: text });
    }

    return res.json(parsed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
