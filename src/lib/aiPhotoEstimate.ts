// AI body-fat photo estimate — Phase 3a, onboarding shortcut only.
//
// Architecture (the chosen "option 1"): call the Anthropic Messages API DIRECTLY
// from the browser with a Vite-injected key — the same single-user tradeoff the
// Supabase anon key already makes. We hit the REST endpoint with `fetch` rather
// than bundling the full @anthropic-ai/sdk (which drags ~250kB + server-only
// credential code into the PWA for this one call); the browser-direct path is an
// explicitly supported header, not a workaround.
//
// When VITE_ANTHROPIC_API_KEY is absent (local dev, or simply not configured),
// isAiEstimateAvailable() is false and the BF% step degrades gracefully — the AI
// card is hidden and only the visual reference chart + Navy Method remain.
//
// Honesty constraint (from the spec): the model returns a RANGE, never a false
// precise number, and the UI labels it a rough estimate.

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-opus-4-8';

export function isAiEstimateAvailable(): boolean {
  return typeof API_KEY === 'string' && API_KEY.length > 0;
}

export interface BodyFatEstimate {
  low: number; // e.g. 15
  high: number; // e.g. 20
  summary: string; // one-line model note
}

// JSON shape the model is constrained to via structured outputs, so we never
// parse free-form prose. Forces a low/high range — not a single number.
const ESTIMATE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    low_pct: {
      type: 'integer',
      description: 'Low end of the estimated body-fat % range',
    },
    high_pct: {
      type: 'integer',
      description: 'High end of the estimated body-fat % range',
    },
    summary: {
      type: 'string',
      description: 'One short sentence describing what you see. No false precision.',
    },
  },
  required: ['low_pct', 'high_pct', 'summary'],
} as const;

const PROMPT =
  'You are estimating body composition from a photo for a personal fitness app. ' +
  'Give a ROUGH body-fat percentage RANGE for the person shown — never a single precise number. ' +
  'Keep the range realistic (typically 4–8 points wide). If the photo is unclear or unsuitable, ' +
  'widen the range and say so in the summary. This is a directional estimate, not a measurement.';

interface MessagesResponse {
  content?: { type: string; text?: string }[];
}

// Estimate from a base64-encoded image. Throws on a missing key or any API
// error so the caller can surface a friendly message and fall back to the tape.
export async function estimateBodyFatFromPhoto(
  base64Data: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp',
): Promise<BodyFatEstimate> {
  if (!API_KEY) throw new Error('AI estimate is not configured.');

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      // Required to call the API directly from a browser — a deliberate choice
      // for a client-side single-user PWA.
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      output_config: { format: { type: 'json_schema', schema: ESTIMATE_SCHEMA } },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Data },
            },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API error ${res.status}`);
  }

  const data = (await res.json()) as MessagesResponse;
  const textBlock = data.content?.find((b) => b.type === 'text' && b.text);
  if (!textBlock?.text) throw new Error('No estimate returned.');

  const parsed = JSON.parse(textBlock.text) as {
    low_pct: number;
    high_pct: number;
    summary: string;
  };
  const low = Math.min(parsed.low_pct, parsed.high_pct);
  const high = Math.max(parsed.low_pct, parsed.high_pct);
  return { low, high, summary: parsed.summary };
}
