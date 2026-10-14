// Server-only Groq client. Talks to Groq's OpenAI-compatible endpoint directly so
// we don't pull in another SDK on top of the three WebGL/physics libs the UI needs.

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

// Verified live against this account's key. gpt-oss-120b is a reasoning model, so
// every call pins reasoning_effort low — these are structured extraction tasks, not
// puzzles, and the default effort triples latency for no gain in answer quality.
const PRIMARY_MODEL = 'openai/gpt-oss-120b';
const FALLBACK_MODEL = 'openai/gpt-oss-20b';

const TIMEOUT_MS = 25_000;

export class GroqError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = 'GroqError';
    this.status = status;
  }
}

function apiKey() {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new GroqError(
      'GROQ_API_KEY is not set. Add it to .env (see .env.example) and restart the dev server.',
      503
    );
  }
  return key;
}

async function callModel(model, { system, user, temperature, maxTokens }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature,
        max_completion_tokens: maxTokens,
        reasoning_effort: 'low',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      })
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new GroqError(`Groq returned ${res.status}: ${detail.slice(0, 300)}`, res.status);
    }

    const payload = await res.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (!content) throw new GroqError('Groq returned an empty completion.');
    return content;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ask Groq for a JSON object. Retries once on the smaller model, because a 120b
 * rate-limit or a malformed object is almost always recoverable there.
 *
 * @param {object} opts
 * @param {string} opts.system   Instructions. Must demand raw JSON.
 * @param {string} opts.user     The task.
 * @param {number} [opts.temperature]
 * @param {number} [opts.maxTokens]
 * @returns {Promise<object>}
 */
export async function groqJson({ system, user, temperature = 0.65, maxTokens = 1600 }) {
  let lastError;

  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const raw = await callModel(model, { system, user, temperature, maxTokens });
      return parseJson(raw);
    } catch (error) {
      lastError = error;
      // A missing key or a bad request won't fix itself on a smaller model.
      if (error instanceof GroqError && (error.status === 503 || error.status === 400)) throw error;
      if (error.name === 'AbortError') lastError = new GroqError('Groq request timed out.', 504);
    }
  }

  throw lastError ?? new GroqError('Groq request failed.');
}

// Reasoning models occasionally wrap JSON in a fence or prepend a stray sentence
// even in JSON mode, so recover the outermost object rather than failing the request.
function parseJson(raw) {
  const cleaned = raw.replace(/```json\s*|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    throw new GroqError('Groq did not return parseable JSON.');
  }
}

/** Clamp an AI-supplied number into a 0-100 score, tolerating strings and nulls. */
export function score(value, fallback = 50) {
  const n = typeof value === 'string' ? Number.parseFloat(value) : value;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Trim an AI-supplied string, tolerating non-strings. */
export function text(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}
