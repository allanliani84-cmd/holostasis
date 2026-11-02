# Holostasis deployment

The holostasis-kjng Vercel project serves holostasis.co.uk and www.holostasis.co.uk. Review reading/submission is connected server-side to the existing private Cloudflare D1-backed service, using the approved HOLOSTASIS_REVIEWS_TOKEN secret stored in Vercel production and preview. Never put its value in source or browser files.

Owner review moderation redirects to the private ChatGPT-authenticated dashboard. Publishing feedback still requires owner approval. The separate holostasis Vercel project does not serve the custom domain and has not been configured with the private reviews connection.

Staged production checks: homepage and all four service pages return HTTP 200 with the expected forms; review reading returns JSON; invalid submissions return HTTP 400; public moderation is denied with HTTP 403. Enquiries open email drafts that customers must send. Uber travel remains separately quoted.
