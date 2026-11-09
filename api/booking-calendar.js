const { createHmac } = require('node:crypto');
const { isIP } = require('node:net');
const backend = 'https://holostasis-automotive-draft.a1n2rf.chatgpt.site';
const cookieName = '__Host-holostasis_account=';
const tokenPattern = /^[0-9a-f]{64}$/;

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  const fail = (code, error) => res.status(code).json({ error });
  if (!['GET', 'POST'].includes(req.method)) return fail(405, 'Method not allowed.');
  const accessToken = process.env.HOLOSTASIS_REVIEWS_TOKEN;
  if (!accessToken) return fail(503, 'The booking calendar is temporarily unavailable.');

  const ip = req.headers['x-vercel-forwarded-for'];
  const holdClient = typeof ip === 'string' && isIP(ip) ? createHmac('sha256', accessToken).update(ip).digest('hex') : '';
  const cookie = (req.headers.cookie || '').split(';').map(item => item.trim())
    .find(item => item.startsWith(cookieName));
  const session = cookie?.slice(cookieName.length) || '';
  let body;
  if (req.method === 'POST') {
    if (req.headers.origin !== 'https://' + req.headers.host) return fail(403, 'Use the website to book.');
    try {
      const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!['availability','hold','release','book'].includes(data?.action)) return fail(400, 'Invalid booking action.');
      body = JSON.stringify({
        action:data.action,id:data.id,key:data.key,name:data.name,email:data.email,phone:data.phone,
        location:data.location,notes:data.notes,website:data.website,asGuest:data.asGuest,termsVersion:data.termsVersion,
        package:data.package,day:data.day,time:data.time,postcode:data.postcode,size:data.size,petHair:data.petHair,
        photos:data.photos,filming:data.filming,shortReels:data.shortReels,longVideos:data.longVideos,
      });
      if (body.length>5000) return fail(413, 'The request is too large.');
    } catch {
      return fail(400, 'Invalid booking request.');
    }
  }

  try {
    const response = await fetch(backend + '/api/booking-calendar', {
      method: req.method,
      headers: {
        'OAI-Sites-Authorization': 'Bearer ' + accessToken,
        ...(tokenPattern.test(session) ? { 'X-Holostasis-Session': session } : {}),
        ...(body && holdClient ? { 'X-Holostasis-Hold-Client': holdClient } : {}),
        ...(body ? { 'Content-Type': 'application/json', Origin: backend } : {}),
      },
      body,
      signal: AbortSignal.timeout(12000),
      redirect: 'error',
    });
    if (!response.headers.get('content-type')?.includes('application/json')) throw Error();
    return res.status(response.status).json(await response.json());
  } catch {
    return fail(503, 'The booking calendar is temporarily unavailable.');
  }
};
