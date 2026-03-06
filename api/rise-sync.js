export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const wallet = (req.query.wallet || '').trim();
  if (!wallet) return res.status(400).json({ error: 'wallet address required' });

  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const url =
    `https://api.etherscan.io/v2/api` +
    `?chainid=42161&module=account&action=tokentx` +
    `&address=${wallet}&sort=desc&offset=200&page=1&apikey=${apiKey}`;

  try {
    const upstream = await fetch(url);
    const data = await upstream.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
}
