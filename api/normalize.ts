import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface NormalizeResponse {
  inclusions: string[];
  exclusions: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { inclusionText, exclusionText } = req.body as {
    inclusionText: string;
    exclusionText?: string;
  };

  if (!inclusionText?.trim()) {
    return res.status(400).json({ error: 'inclusionText is required' });
  }

  const prompt = `You are helping parse audience segment criteria for a fundraising CRM system. Convert the natural language description into discrete, unambiguous requirement statements that a database query builder can use.

Rules for each statement:
- One testable condition per statement (no "and" combining multiple conditions in one item)
- Clear, concise language — preserve specificity (years, event names, exact exclusion reasons)
- If exclusions are embedded in the inclusion text (e.g. "who are not X", "excluding Y"), extract them into the exclusions array

Input:
INCLUSION CRITERIA: ${inclusionText}${exclusionText?.trim() ? `\nEXCLUSION CRITERIA: ${exclusionText}` : ''}

Respond with valid JSON only — no markdown fences, no explanation:
{"inclusions":["...","..."],"exclusions":["..."]}`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}';
    // Strip markdown code fences if the model wrapped the JSON
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
