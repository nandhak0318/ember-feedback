import { createFileRoute, redirect } from "@tanstack/react-router";

import { getLegalUrl } from "../functions/workspace";

export const Route = createFileRoute("/terms")({
  loader: async () => {
    const url = await getLegalUrl({ data: "terms" });
    if (url) throw redirect({ href: url });
  },
  head: () => ({
    meta: [
      { title: "Terms of Service" },
      { property: "og:title", content: "Terms of Service" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12 md:py-20">
      <h1 className="text-2xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Effective November 1, 2026</p>

      <div className="prose-policy mt-10 flex flex-col gap-8 text-[15px] leading-[1.7] text-muted-foreground [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
        <section>
          <h2>The board</h2>
          <p>
            This is the feedback board for Ember, where you can suggest ideas, vote and follow what is planned and shipped. It is run by Ember's developer. By signing in or posting, you agree to these terms. Using the Ember app is covered by the <a href="https://ember.mov/terms/" className="text-foreground underline underline-offset-2">Ember terms</a>.
          </p>
        </section>

        <section>
          <h2>What you post</h2>
          <p>
            You keep ownership of what you post. By posting, you let us show it on this board, and use your ideas to improve Ember without owing you anything for them. Posts, comments and display names are public, so please leave out private details about yourself or anyone else.
          </p>
        </section>

        <section>
          <h2>Be kind</h2>
          <ul>
            <li>No spam, ads, or anything unlawful, hateful or harassing.</li>
            <li>No other people's private information, and nothing you do not have the right to share.</li>
            <li>No attempts to get into other accounts or to break or overload the board.</li>
          </ul>
        </section>

        <section>
          <h2>Moderation</h2>
          <p>
            We may edit, merge, hide or remove posts, and suspend accounts that break these terms. An idea on the board, its votes or its place on the roadmap is not a promise that it will be built or when.
          </p>
        </section>

        <section>
          <h2>No guarantees</h2>
          <p>
            The board is free and provided as it is. It may be down at times, change, or close. To the fullest extent the law allows, we are not liable for any loss arising from your use of it. Nothing here limits liability that cannot be limited by law.
          </p>
        </section>

        <section>
          <h2>Changes</h2>
          <p>
            If these terms change, we will post the new version here with a new date. Using the board after that means you accept them.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            Questions about these terms? Email <a href="mailto:nandha@ember.mov" className="text-foreground underline underline-offset-2">nandha@ember.mov</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
