const { createHmac } = require('node:crypto');
const { isIP } = require('node:net');
const backend = 'https://holostasis-automotive-draft.a1n2rf.chatgpt.site';
const cookieName = '__Host-holostasis_account';
const tokenPattern = /^[0-9a-f]{64}$/;
const lifetime = 30 * 86400;

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  const fail = (code, error) => res.status(code).json({ error });
  if (!['GET', 'POST'].includes(req.method)) return fail(405, 'Method not allowed.');
  const accessToken = process.env.HOLOSTASIS_REVIEWS_TOKEN;
  if (!accessToken) return fail(503, 'My Bookings is temporarily unavailable.');

  const cookie = (req.headers.cookie || '').split(';').map(item => item.trim())
    .find(item => item.startsWith(cookieName + '='));
  const session = cookie?.slice(cookieName.length + 1) || '';
  const sessionOnly = req.method==='GET' && req.query?.session==='1';
  let payload;

  if (req.method === 'POST') {
    if (req.headers.origin !== 'https://' + req.headers.host) {
      return fail(403, 'Submit this request from the website.');
    }
    try {
      const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (data?.action === 'sign-out') {
        payload = { action:'sign-out' };
      } else if (data?.action === 'login' && typeof data.email === 'string' &&
                 typeof data.password === 'string' && data.email.length<=254 && data.password.length<=72) {
        payload = { action:'login', email:data.email, password:data.password };
      } else if (data?.action === 'signup' && typeof data.name === 'string' && data.name.length<=100 &&
                 typeof data.email === 'string' && data.email.length<=254 &&
                 typeof data.password === 'string' && data.password.length<=72) {
        payload = { action:'signup', name:data.name, email:data.email, password:data.password };
      } else if (data?.action === 'setup' && typeof data.invite === 'string' && tokenPattern.test(data.invite) &&
                 typeof data.password === 'string' && data.password.length<=72) {
        payload = { action:'setup', invite:data.invite, password:data.password };
      } else {
        return fail(400, 'Check your sign-in details.');
      }
    } catch {
      return fail(400, 'Invalid request.');
    }
  } else if (!tokenPattern.test(session)) {
    return fail(401, 'Log in to view your bookings.');
  }

  const ip = req.headers['x-vercel-forwarded-for'];
  const signupClient = payload?.action==='signup' && typeof ip==='string' && isIP(ip)
    ? createHmac('sha256',accessToken).update(ip).digest('hex') : '';
  try {
    const response = await fetch(backend + '/api/customer-account' + (sessionOnly?'?session=1':''), {
      method: req.method,
      headers: {
        'OAI-Sites-Authorization': 'Bearer ' + accessToken,
        ...(signupClient ? { 'X-Holostasis-Hold-Client':signupClient } : {}),
        ...(tokenPattern.test(session) ? { 'X-Holostasis-Session': session } : {}),
        ...(payload ? { 'Content-Type': 'application/json', Origin: backend } : {}),
      },
      body: payload ? JSON.stringify(payload) : undefined,
      signal: AbortSignal.timeout(15000),
      redirect: 'error',
    });
    if (!response.headers.get('content-type')?.includes('application/json')) throw Error();
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error || 'My Bookings is temporarily unavailable.' });

    if (payload) {
      const signingOut = payload.action === 'sign-out' || payload.action === 'setup';
      const nextSession = signingOut ? '' : data.session;
      if (!signingOut && !tokenPattern.test(nextSession || '')) throw Error();
      res.setHeader('Set-Cookie', cookieName + '=' + nextSession +
        '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + (signingOut ? 0 : lifetime));
      return res.status(200).json({ ok: true });
    }
    return res.status(200).json({ customer: data.customer, bookings: data.bookings });
  } catch {
    return fail(503, 'My Bookings is temporarily unavailable.');
  }
};
