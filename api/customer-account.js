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
  let payload;
  if (req.method === 'POST') {
    if (req.headers.origin !== 'https://' + req.headers.host) {
      return fail(403, 'Submit this request from the website.');
    }
    try {
      const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (data?.action === 'sign-out') {
        payload = { action: 'sign-out' };
      } else if (data?.action === 'redeem' && typeof data.invite === 'string' && tokenPattern.test(data.invite)) {
        payload = { action: 'redeem', invite: data.invite };
      } else {
        return fail(400, 'This sign-in link is invalid.');
      }
    } catch {
      return fail(400, 'Invalid request.');
    }
  } else if (!tokenPattern.test(session)) {
    return fail(401, 'Sign in to view your bookings.');
  }

  try {
    const response = await fetch(backend + '/api/customer-account', {
      method: req.method,
      headers: {
        'OAI-Sites-Authorization': 'Bearer ' + accessToken,
        ...(tokenPattern.test(session) ? { 'X-Holostasis-Session': session } : {}),
        ...(payload ? { 'Content-Type': 'application/json', Origin: backend } : {}),
      },
      body: payload ? JSON.stringify(payload) : undefined,
      signal: AbortSignal.timeout(12000),
      redirect: 'error',
    });
    if (!response.headers.get('content-type')?.includes('application/json')) throw Error();
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error || 'My Bookings is temporarily unavailable.' });

    if (payload) {
      const signingOut = payload.action === 'sign-out';
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
