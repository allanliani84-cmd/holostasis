# Holostasis deployment

The static pages run on Vercel. The server-only /api/reviews function is prepared to connect to the existing private reviews service using HOLOSTASIS_REVIEWS_TOKEN, once explicitly authorised and configured in the holostasis-kjng project. No secret is present in source or browser code.

Owner moderation redirects to the private ChatGPT-authenticated preview dashboard. Review submissions await owner approval. Travel remains separately quoted. Enquiries open email drafts that customers must send.

The holostasis-kjng project serves holostasis.co.uk and www.holostasis.co.uk. The separate holostasis project does not serve these domains. Do not promote until the review connection is configured and tested.
