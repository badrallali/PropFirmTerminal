// USDC contract addresses on Arbitrum One
const USDC_CONTRACTS = [
  '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Native USDC (Circle)
  '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // USDC.e (bridged)
  '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // USDT on Arbitrum
];

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
            contractAddresses: USDC_CONTRACTS, // only stablecoins
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
    res.status(200).json({ transfers: data.result?.transfers || [] });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
}
