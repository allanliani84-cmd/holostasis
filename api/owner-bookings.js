const backend = 'https://holostasis-automotive-draft.a1n2rf.chatgpt.site';
const cookieName = '__Host-holostasis_account=';
const sessionPattern = /^[0-9a-f]{64}$/;
const customerPattern = /^[0-9a-f-]{36}$/;

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  const fail = (code, error) => res.status(code).json({ error });
  if (!['GET','POST'].includes(req.method)) return fail(405, 'Method not allowed.');
  const section = req.query?.section;
  if (!['customers','calendar'].includes(section)) return fail(400, 'Choose a booking area.');

  const cookie = (req.headers.cookie || '').split(';').map(value => value.trim())
    .find(value => value.startsWith(cookieName));
  const session = cookie?.slice(cookieName.length) || '';
  if (!sessionPattern.test(session)) return fail(403, 'Log in as the owner.');
  const token = process.env.HOLOSTASIS_REVIEWS_TOKEN;
  if (!token) return fail(503, 'The booking area is temporarily unavailable.');

  const path = section === 'customers' ? '/api/customer-account' : '/api/booking-calendar';
  const url = new URL(path, backend);
  url.searchParams.set('admin','1');
  url.searchParams.set('ownerSession','1');
  const customer = req.query?.customer;
  if (req.method==='GET' && section==='customers' && customer!==undefined) {
    if (typeof customer!=='string' || !customerPattern.test(customer)) return fail(400, 'Invalid customer.');
    url.searchParams.set('customer',customer);
  }

  let body;
  if (req.method==='POST') {
    if (req.headers.origin !== 'https://' + req.headers.host) return fail(403, 'Submit this request from the website.');
    const actions = section==='customers'
      ? ['create-customer','invite','revoke','save-booking']
      : ['create-slot','close-slot','link-guest','complete','cancel','move'];
    try {
      const data = typeof req.body==='string' ? JSON.parse(req.body) : req.body;
      if (!actions.includes(data?.action)) return fail(400, 'Invalid booking action.');
      body = JSON.stringify(data);
      if (body.length>5000) return fail(413, 'The request is too large.');
    } catch {
      return fail(400, 'Invalid booking request.');
    }
  }

  try {
    const upstream = await fetch(url, {
      method:req.method,
      headers:{
        'OAI-Sites-Authorization':'Bearer '+token,
        'X-Holostasis-Session':session,
        ...(body ? {'Content-Type':'application/json',Origin:backend} : {}),
      },
      body,
      signal:AbortSignal.timeout(12000),
      redirect:'error',
    });
    if (!upstream.headers.get('content-type')?.includes('application/json')) throw Error();
    return res.status(upstream.status).json(await upstream.json());
  } catch {
    return fail(503, 'The booking area is temporarily unavailable.');
  }
};
