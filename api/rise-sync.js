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
            contractAddresses: ['0x1b34bcc581d535d33c895fabce3c85f1bf3bdb33'], // RISEPAY token
            category: ['erc20'],
            withMetadata: true,
            excludeZeroValue: true,
            maxCount: '0xC8' // 200
          }],
          id: 1
        })
      }
    );

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });
    const transfers = data.result?.transfers || [];
    // Debug: log asset names so we can identify what token Rise uses
    console.log('Assets found:', [...new Set(transfers.map(t => `${t.asset} (${t.rawContract?.address})`))]);
    res.status(200).json({ transfers });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
}
