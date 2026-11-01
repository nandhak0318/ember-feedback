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

- Ember's look: `packages/ui/src/styles/globals.css` holds Ember's light and dark
  palettes (from ember.mov's "ember" theme), ember for links, focus, votes and the
  main button (`apps/web/src/index.css`), the system font instead of Geist, warm
  primary buttons, Ember swatches in Settings > Statuses. Status chips draw text
  in the status colour on both themes, so each colour is picked to read on both.

- People (dashboard, admins only): `apps/web/src/functions/people.ts` and
  `apps/web/src/routes/dashboard/people/`. A list of everyone who posted, voted
  or commented, with email and counts, and a page per person with their activity
  and a Delete for deletion requests (their votes go, posts and comments stay
  without a name). Every function checks `requireAdmin` on the server; the
  public board only ever loads id, name and image.

- Profile pictures and names, for everyone: "Your profile" in the account
  menu (it opens by itself once for an account with no name).
  A chosen photo opens a crop step (`components/avatar-cropper.tsx`: drag,
  zoom by slider, wheel or pinch, arrow keys) that hands back a 256px square;
  `apps/web/src/routes/api/avatar.ts` stores it; it is stored as `avatars/<id>` in the uploads bucket and
  served at `/avatar/<userId>/<id>` only while it is that person's picture.
  `lib/attachment-db.ts` keeps current pictures in the nightly sweep. A user
  update in `packages/auth` refuses any picture that is not the person's own
  `/avatar/...` path. Without a picture, a coloured letter (`components/bits.tsx`).

- PostHog (`apps/web/src/lib/ember-analytics.ts`): the "Ember Landing Page"
  project, like ember.mov, every event tagged `site: feedback`. Anonymous (no
  identify), no session recordings, no click autocapture, `?q=` search words
  scrubbed from every URL in an event. Not for admins, /dashboard or the widget;
  `?internal=1` turns it off in a browser. Events: feedback_post_created,
  feedback_voted, feedback_commented, feedback_sign_in_link_requested,
  feedback_changelog_subscribed, feedback_picture_set/removed, feedback_name_set.

Board content (statuses, tags, tagline) lives in the database, not the code:
statuses New / Considering / Planned / In progress / Waiting on App Store /
Shipped / Closed (Waiting on App Store, key `appstore`, kind progress: fixed or
built, in a build Apple is still reviewing; move it to Shipped once the version
is live); tags for
Ember's surfaces (Journal, People, Worlds, ...) and platforms (iPhone, iPad, Mac).

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
4. `cd packages/infra && bunx alchemy deploy --stage prod --yes`. Run alchemy
   directly: `bun run deploy` goes through `--filter`, which never passes your
   answer to its first prompt. The deploy also attaches `feedback.ember.mov`
   (the host in `BETTER_AUTH_URL`) as the worker's custom domain; it fails if
   another DNS record already holds that name (Sleekplan did, until 2026-11-01).
5. Wait for https://feedback.ember.mov to load (a few minutes for the
   certificate).
6. Open https://feedback.ember.mov and sign in first: the first account
   becomes the admin.

Later deploys: step 4 again. Pull upstream with
`git pull upstream main`.

## Try it locally

```bash
bun install && bun run db:push:local && bun run dev:local
```

http://localhost:3001. Locally no email goes out; look for the sign-in link in
the dev server's output.
