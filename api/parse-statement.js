export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let { text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in Vercel environment variables' });

  // Cap text length to avoid exceeding token limits (~40k chars ≈ ~10k tokens)
  if (text.length > 40000) text = text.slice(0, 40000);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: `You are a financial data extractor. Extract every transaction from the text below and return a JSON array.

Return ONLY the raw JSON array — no markdown, no code fences, no explanation. Start your response with [ and end with ].

Each transaction object must have exactly these fields:
- "date": string in YYYY-MM-DD format (guess the year from context if not explicit)
- "description": string, the merchant, sender, or counterparty name
- "amount": number, always positive (use absolute value)
- "type": "income" if money was received, "expense" if money was paid/sent
- "suggestedFirm": string or null — for income, the prop trading firm name if identifiable
- "suggestedCat": string or null — for expenses, one of: "Challenge Fee", "TradingView / Platform", "VPS / Hosting", "EA / Automation", "Education / Course", "Data Feed", "Hardware", "Accounting / Legal", "Other"

Rules:
- Include ALL monetary transactions you can find, even if the purpose is unclear
- Do NOT skip transactions — it is better to include too many than too few
- For ambiguous transactions, set type based on whether money came in or went out
- If date format is ambiguous (e.g. MM/DD/YYYY vs DD/MM/YYYY), use the most likely interpretation

Statement text:
${text}`
        }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });

    const content = data.content?.[0]?.text || '';

    // Extract JSON array from response
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) {
      // Claude returned something but no JSON array — return raw for debugging
      return res.status(200).json({ transactions: [], debug: content.slice(0, 500) });
    }

    let transactions;
    try {
      transactions = JSON.parse(match[0]);
    } catch {
      return res.status(200).json({ transactions: [], debug: match[0].slice(0, 500) });
    }

    res.status(200).json({ transactions });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
}
