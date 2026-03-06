export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in Vercel environment variables' });

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
          content: `Parse this financial statement and extract all transactions. Return ONLY a valid JSON array, no other text, no markdown.

Each item must have:
- date: YYYY-MM-DD format
- description: merchant or sender name (keep it short)
- amount: positive number (absolute value, no currency symbols)
- type: "income" (money received — payouts from prop firms) or "expense" (fees paid, subscriptions, tools)
- suggestedFirm: for income, the prop firm name if identifiable, else null
- suggestedCat: for expenses, one of exactly: "Challenge Fee", "TradingView / Platform", "VPS / Hosting", "EA / Automation", "Education / Course", "Data Feed", "Hardware", "Accounting / Legal", "Other" — else null

Skip transactions that are clearly internal transfers, refunds of prior charges, or unrelated to trading/prop firms.

Statement text:
${text}`
        }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });

    const content = data.content?.[0]?.text || '';
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) return res.status(200).json({ transactions: [] });

    const transactions = JSON.parse(match[0]);
    res.status(200).json({ transactions });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
}
