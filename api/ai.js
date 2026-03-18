const ALLOWED_MODELS = new Set([
  'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001',
]);
const MAX_TOKENS_CAP = 1000;
const MAX_PROMPT_LENGTH = 4000;
const MAX_SYSTEM_LENGTH = 1000;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const { messages, system, model, max_tokens } = req.body || {};

  // Validate messages array
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  const firstMsg = messages[0];
  if (!firstMsg || typeof firstMsg.content !== 'string') {
    return res.status(400).json({ error: 'Invalid request' });
  }

  // Build a clean, constrained body — never pass raw req.body to Anthropic
  const body = {
    model: ALLOWED_MODELS.has(model) ? model : 'claude-sonnet-4-20250514',
    max_tokens: Math.min(Math.max(1, Number(max_tokens) || 400), MAX_TOKENS_CAP),
    messages: [{ role: 'user', content: firstMsg.content.slice(0, MAX_PROMPT_LENGTH) }],
  };
  if (system && typeof system === 'string') {
    body.system = system.slice(0, MAX_SYSTEM_LENGTH);
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return res.status(response.ok ? 200 : response.status).json(data);
  } catch {
    return res.status(500).json({ error: 'Proxy error' });
  }
}
