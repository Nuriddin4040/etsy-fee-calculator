// POST /api/subscribe  { email, company (honeypot), source }
// Saves the email in Upstash Redis (a sorted set called "etsycalc:leads", score = signup time).
// Needs two environment variables in Vercel (either naming works):
//   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN   or   KV_REST_API_URL + KV_REST_API_TOKEN
const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  // honeypot: real people never fill this hidden field, bots do. Pretend success.
  if (body.company) return res.status(200).json({ ok: true });

  const email = String(body.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 200) {
    return res.status(400).json({ ok: false, error: 'Invalid email' });
  }

  if (!URL_ || !TOKEN) {
    // Visible in Vercel > project > Logs, so a lead is never silently lost while setup is unfinished.
    console.error('LEAD_NOT_STORED (Upstash env vars missing):', email);
    return res.status(200).json({ ok: true, stored: false });
  }

  try {
    const r = await fetch(URL_, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
      // NX = do not overwrite the original signup time if the email is already saved
      body: JSON.stringify(['ZADD', 'etsycalc:leads', 'NX', Date.now(), email])
    });
    if (!r.ok) throw new Error('Upstash responded ' + r.status);
    return res.status(200).json({ ok: true, stored: true });
  } catch (err) {
    console.error('LEAD_NOT_STORED:', email, String(err));
    return res.status(200).json({ ok: true, stored: false });
  }
};
