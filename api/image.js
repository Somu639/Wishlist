const { getProduct } = require('./_catalog');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const product = getProduct(req.query.id);
  if (!product?.image_url) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const upstream = await fetch(product.image_url, { signal: controller.signal });
    if (!upstream.ok) {
      return res.status(502).json({ error: 'Could not load product image' });
    }
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(buffer);
  } catch {
    return res.status(502).json({ error: 'Could not load product image' });
  } finally {
    clearTimeout(timer);
  }
};
