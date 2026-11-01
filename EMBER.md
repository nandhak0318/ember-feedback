# Ember's feedback board

openheard, with one change: people sign in by email link only (no passwords,
no Google). Served at https://feedback.ember.mov.

Settings live in `packages/infra/.env` (not committed; it holds the secret).

## Changes from upstream

- `packages/auth/src/index.ts`: password sign-in turned off.
- `apps/web/src/components/auth-form.tsx`: the form is one email box.
- `packages/env/src/mailer.ts`: mail goes through Resend when `RESEND_API_KEY`
  is set (Cloudflare Email Sending only reaches any inbox on Workers Paid,
  $5/month). Without the key there is no Email binding and nothing is sent.

AGPL: a modified copy that runs as a service must publish its source. The
footer's Source link (`SOURCE_URL`) points at the public fork,
github.com/nandhak0318/ember-feedback/tree/ember, which holds these
changes. Push the `ember` branch after every change you deploy.

## Deploy, once

1. Cloudflare dashboard: R2 → turn it on (free tier is enough).
2. resend.com (free: 3,000 emails a month, 100 a day): add the domain
   `ember.mov`, add the DNS records it shows in Cloudflare, wait for
   "Verified", then create an API key with "Sending access" and paste it into
   `packages/infra/.env` as `RESEND_API_KEY`. Without it no sign-in link is
   ever delivered.
3. Install and log in:
   ```bash
   brew install oven-sh/bun/bun
   bun install
   cd packages/infra && bunx alchemy login --configure && cd ../..
   ```
4. `bun run deploy`. It prints a `*.workers.dev` URL.
5. Dashboard → Workers → the openheard worker → Settings → Domains & Routes →
   add `feedback.ember.mov`. Sign-in links point there, so do this before
   step 6.
6. Open https://feedback.ember.mov and sign in first: the first account
   becomes the admin.

Later deploys: `bun run deploy` again. Pull upstream with
`git pull upstream main`.

## Try it locally

```bash
bun install && bun run db:push:local && bun run dev:local
```

http://localhost:3001. Locally no email goes out; look for the sign-in link in
the dev server's output.
