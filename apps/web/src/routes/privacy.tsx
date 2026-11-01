import { createFileRoute, redirect } from "@tanstack/react-router";

import { getLegalUrl } from "../functions/workspace";

export const Route = createFileRoute("/privacy")({
  loader: async () => {
    const url = await getLegalUrl({ data: "privacy" });
    if (url) throw redirect({ href: url });
  },
  head: () => ({
    meta: [
      { title: "Privacy Policy" },
      { property: "og:title", content: "Privacy Policy" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12 md:py-20">
      <h1 className="text-2xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Effective November 1, 2026</p>

      <div className="prose-policy mt-10 flex flex-col gap-8 text-[15px] leading-[1.7] text-muted-foreground [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
        <section>
          <h2>Who we are</h2>
          <p>
            This is the feedback board for Ember, the journal app for macOS, iOS and iPadOS. It is run by Ember's developer, a single person. You can reach us at <a href="mailto:sangainandhu18@gmail.com" className="text-foreground underline underline-offset-2">sangainandhu18@gmail.com</a>.
          </p>
        </section>

        <section>
          <h2>This board is separate from the app</h2>
          <p>
            Nothing from your Ember journal, people or stories ever reaches this board, and your board account is not linked to the app. The app has its own policy: the <a href="https://ember.mov/privacy/" className="text-foreground underline underline-offset-2">Ember privacy policy</a>.
          </p>
        </section>

        <section>
          <h2>What we collect</h2>
          <ul>
            <li><strong>Your email address</strong>, to send you sign-in links. It is never shown on the board.</li>
            <li><strong>Your display name</strong>, if you set one. It is shown next to what you post.</li>
            <li><strong>What you post</strong>: ideas, comments, votes, reactions and images you attach. Posts, comments and display names are public on the board.</li>
            <li><strong>Cookies and browser storage</strong>: a session cookie keeps you signed in. If you vote without signing in, your browser keeps a random ID so the board remembers your vote. PostHog keeps another random ID for the anonymous usage counts. No advertising cookies.</li>
            <li><strong>Network data</strong>: your IP address passes through Cloudflare, which hosts the board, to deliver pages and stop abuse. When you sign in, your IP address and browser name are kept with your sign-in session to keep your account safe, and deleted when the session ends.</li>
          </ul>
        </section>

        <section>
          <h2>Anonymous usage counts</h2>
          <p>
            We use PostHog to count how the board is used: pages visited and actions such as posting, voting, commenting or asking for a sign-in link. It is tied to a random ID in your browser, not to your account, and never includes your name, email, what you write or what you search for. There are no session recordings.
          </p>
        </section>

        <section>
          <h2>What we do not do</h2>
          <p>
            We do not sell your data, show ads, track you across other sites, or use your email for anything except sign-in links and the updates described below.
          </p>
        </section>

        <section>
          <h2>Emails</h2>
          <p>
            We email you a link each time you sign in. If you post, vote or comment on an idea, we email you when its status changes or it ships, and you can subscribe to the changelog. Every update email has an unsubscribe link.
          </p>
        </section>

        <section>
          <h2>Who processes your data</h2>
          <ul>
            <li><strong>Cloudflare</strong> hosts the board, its database and attached images.</li>
            <li><strong>Resend</strong> delivers the emails. It receives your email address and the text of each email.</li>
            <li><strong>PostHog</strong> counts how the board is used, as described above. It receives no email addresses or account details.</li>
          </ul>
        </section>

        <section>
          <h2>Keeping and deleting</h2>
          <p>
            We keep your account and posts while the board exists. To delete your account, email <a href="mailto:sangainandhu18@gmail.com" className="text-foreground underline underline-offset-2">sangainandhu18@gmail.com</a> from the address you sign in with. We delete your email address and display name within 30 days. Tell us if you want your posts removed too. You can also ask for a copy of your data, or for a correction, the same way.
          </p>
        </section>

        <section>
          <h2>Children</h2>
          <p>
            This board is not meant for anyone under 16. If we learn that a child under 16 has an account, we will delete it.
          </p>
        </section>

        <section>
          <h2>Changes</h2>
          <p>
            If this policy changes, we will post the new version here with a new date.
          </p>
        </section>
      </div>
    </main>
  );
}
