// GET /api/export?key=YOUR_ADMIN_KEY  -> downloads all saved emails as a CSV file.
// Set ADMIN_KEY in Vercel environment variables (any long random text).
const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const key = (req.query && req.query.key) || '';
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return res.status(401).send('Unauthorized');
  }
  if (!URL_ || !TOKEN) return res.status(500).send('Upstash is not configured');

  try {
    const r = await fetch(URL_, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify(['ZRANGE', 'etsycalc:leads', 0, -1, 'WITHSCORES'])
    });
    const data = await r.json();
    const flat = data.result || [];
    let csv = 'email,signed_up_utc\n';
    for (let i = 0; i < flat.length; i += 2) {
      csv += flat[i].replace(/[",\n]/g, '') + ',' + new Date(Number(flat[i + 1])).toISOString() + '\n';
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="etsy-calculator-emails.csv"');
    return res.status(200).send(csv);
  } catch (err) {
    return res.status(500).send('Export failed: ' + String(err));
  }
};
