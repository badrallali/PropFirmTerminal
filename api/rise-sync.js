export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const wallet = (req.query.wallet || '').trim();
  if (!wallet) return res.status(400).json({ error: 'wallet address required' });

  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ALCHEMY_API_KEY not set in Vercel environment variables' });

  try {
    const response = await fetch(
      `https://arb-mainnet.g.alchemy.com/v2/${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'alchemy_getAssetTransfers',
          params: [{
            toAddress: wallet,
            category: ['erc20'],
            withMetadata: true,
            excludeZeroValue: true,
            maxCount: '0xC8' // 200 results
          }],
          id: 1
        })
      }
    );

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });
    res.status(200).json({ transfers: data.result?.transfers || [] });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
}
