# Holostasis website update

This branch replaces the old static website files with the updated desktop website, including Auto Clean, the package finder, photography and remote editing enquiry forms, review UI and archived Fiverr links.

## Deployment blocker

Do not promote this branch to production until review storage and owner authentication are configured on Vercel. The review UI calls `/api/reviews`; the existing working preview uses a Cloudflare D1-backed API and ChatGPT owner authentication. Those services are not included in this static desktop export and cannot be assumed to exist on Vercel.

Vercel account access is still needed to inspect the existing project, provision or connect persistent review storage, implement compatible owner authentication, test the deployment and promote it.

Enquiry buttons open an email draft; customers must press Send. Uber travel remains awaiting a separate quote.
