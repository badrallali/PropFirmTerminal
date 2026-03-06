// Kept as a proxy fallback — client now calls Blockscout directly.
// This endpoint is no longer required but kept for future use.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const wallet = (req.query.wallet || '').trim();
  if (!wallet) return res.status(400).json({ error: 'wallet address required' });

  const url =
    `https://arbitrum.blockscout.com/api?module=account&action=tokentx` +
    `&address=${encodeURIComponent(wallet)}&sort=desc&offset=200&page=1`;

  try {
    const upstream = await fetch(url);
    const data = await upstream.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
}
