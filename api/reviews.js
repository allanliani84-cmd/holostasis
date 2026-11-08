const backend = 'https://holostasis-automotive-draft.a1n2rf.chatgpt.site';
const maxPhotoLength = 460000;
const photoPath = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-2]$/;

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const fail = (code, error) => res.status(code).json({ error });
  if (!['GET','POST'].includes(req.method)) return fail(405, 'Method not allowed.');
  if (req.query?.admin !== undefined) return fail(403, 'Manage reviews in the private owner dashboard.');
  const token = process.env.HOLOSTASIS_REVIEWS_TOKEN;
  if (!token) return fail(503, 'Reviews are temporarily unavailable. Please try again later.');

  const photo = req.method === 'GET' ? req.query?.photo : undefined;
  if (photo !== undefined && (typeof photo !== 'string' || !photoPath.test(photo))) {
    return fail(404, 'Photo not found.');
  }
  let body;
  if (req.method === 'POST') {
    let origin;
    try { origin = new URL(req.headers.origin).host; }
    catch { return fail(403, 'Please submit from the website.'); }
    if (origin !== req.headers.host) return fail(403, 'Please submit from the website.');
    try {
      const d = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!d || d.action) return fail(403, 'Review management is available only in the private dashboard.');
      const submission = { name: d.name, service: d.service, rating: d.rating, body: d.body, consent: d.consent, website: d.website };
      if (JSON.stringify(submission).length > 6000) return fail(413, 'Your review is too long.');
      if (d.photos !== undefined) {
        if (!Array.isArray(d.photos) || d.photos.length > 3 ||
            d.photos.some(value => typeof value !== 'string' || value.length > maxPhotoLength)) {
          return fail(400, 'Choose up to 3 valid photos and try again.');
        }
        submission.photos = d.photos;
      }
      body = JSON.stringify(submission);
    } catch {
      return fail(400, 'Please check your review.');
    }
  }

  const url = new URL('/api/reviews', backend);
  if (photo !== undefined) url.searchParams.set('photo', photo);
  try {
    const result = await fetch(url, {
      method: req.method,
      headers: {
        'OAI-Sites-Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        ...(req.method === 'POST' ? { Origin: backend } : {}),
      },
      body,
      signal: AbortSignal.timeout(15000),
      redirect: 'error',
    });
    const contentType = result.headers.get('content-type');
    if (photo !== undefined && result.ok && contentType === 'image/jpeg') {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.status(result.status).send(Buffer.from(await result.arrayBuffer()));
    }
    if (!contentType?.includes('application/json')) {
      console.warn('Review upstream', result.status, contentType);
      return fail(502, 'Reviews are temporarily unavailable.');
    }
    return res.status(result.status).json(await result.json());
  } catch {
    return fail(502, 'Reviews are temporarily unavailable.');
  }
};
