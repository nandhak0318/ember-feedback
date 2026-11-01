import { Button } from "@openheard/ui/components/button";
import { ArrowLeftIcon, CaretUpIcon, ChatCircleIcon, EnvelopeSimpleIcon, LockSimpleIcon, NotePencilIcon } from "@phosphor-icons/react";
import { Link, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Panel } from "@/components/admin/panel";
import { Avatar, TeamBadge } from "@/components/bits";
import { DashboardErrorState, DashboardPanelSkeleton } from "@/components/states";
import { deletePerson, getPerson } from "@/functions/people";
import { ago, fullDate, longDate } from "@/lib/time";
import { cn } from "@openheard/ui/lib/utils";

type Person = Awaited<ReturnType<typeof getPerson>>;

// Ember: one person's details and everything they did on the board. Admins only.
export const Route = createFileRoute("/dashboard/people/$id")({
  loader: ({ params }) => getPerson({ data: { id: params.id } }),
  head: () => ({ meta: [{ title: "Person · Ember feedback" }] }),
  component: PersonPage,
  errorComponent: ({ error }) => <DashboardErrorState message={(error as Error)?.message} retry="/dashboard/people" />,
  pendingComponent: DashboardPanelSkeleton,
});

const ACTIVITY = {
  post: { icon: NotePencilIcon, verb: "Posted" },
  vote: { icon: CaretUpIcon, verb: "Voted on" },
  comment: { icon: ChatCircleIcon, verb: "Commented on" },
  note: { icon: LockSimpleIcon, verb: "Left an internal note on" },
} as const;

function PersonPage() {
  const p = Route.useLoaderData();
  return (
    <Panel
      title={
        <Link to="/dashboard/people" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="size-4" /> People
        </Link>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-7 px-6 py-7 md:px-8">
          <header className="flex items-center gap-4">
            <Avatar name={p.name || p.email} image={p.image} size={64} />
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className="flex items-center gap-2 text-[22px] font-semibold">
                <span className="truncate">{p.name || "No name"}</span>
                {p.team ? <TeamBadge /> : null}
              </h1>
              <a href={`mailto:${p.email}`} className="truncate text-sm text-link hover:underline">
                {p.email}
              </a>
              <p className="text-[13px] text-faint">
                Joined {ago(p.joinedAt)} · {p.lastActive ? `active ${ago(p.lastActive)}` : "no activity yet"}
              </p>
            </div>
          </header>

          <div className="grid grid-cols-3 overflow-hidden rounded-xl border">
            {[
              ["Posts", p.posts],
              ["Votes", p.votes],
              ["Comments", p.comments],
            ].map(([label, n], i) => (
              <div key={label} className={cn("flex flex-col gap-1 px-5 py-4", i > 0 && "border-l")}>
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
                <span className="text-[24px] font-semibold tabular-nums">{n}</span>
              </div>
            ))}
          </div>

          <section className="flex flex-col gap-1">
            <h2 className="pb-2 text-xs font-medium text-muted-foreground">Activity</h2>
            {p.activity.length === 0 ? <p className="text-sm text-faint">Nothing on the board yet.</p> : null}
            {p.activity.map((a, i) => {
              const { icon: Icon, verb } = ACTIVITY[a.kind];
              return (
                <Link
                  key={`${a.kind}-${a.postId}-${a.at}-${i}`}
                  to="/dashboard/inbox"
                  search={{ post: a.postId }}
                  className="-mx-2 flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-card/60"
                >
                  <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md border text-faint">
                    <Icon className="size-3.5" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm">
                      <span className="text-muted-foreground">{verb} </span>
                      <span className="font-medium">{a.title}</span>
                      <span className="ml-2 text-xs text-faint tabular-nums" title={fullDate(a.at)}>
                        {ago(a.at)}
                      </span>
                    </span>
                    {"body" in a && a.body ? <span className="line-clamp-2 text-[13px] text-muted-foreground">{a.body}</span> : null}
                  </span>
                </Link>
              );
            })}
          </section>
        </div>

        <Details person={p} />
      </div>
    </Panel>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-[13px]">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right">{children}</span>
    </div>
  );
}

function Details({ person: p }: { person: Person }) {
  const router = useRouter();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const canDelete = !p.self && !p.team;

  async function remove() {
    setBusy(true);
    try {
      await deletePerson({ data: { id: p.id } });
      toast.success(`Deleted ${p.name || p.email}`);
      await router.invalidate();
      navigate({ to: "/dashboard/people" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
      setBusy(false);
    }
  }

  return (
    <aside className="flex shrink-0 flex-col gap-6 border-t px-6 py-7 lg:w-[300px] lg:border-t-0 lg:border-l lg:px-5">
      <section>
        <h2 className="pb-1.5 text-xs font-medium text-muted-foreground">Details</h2>
        <Row label="Name">{p.name || "–"}</Row>
        <Row label="Email">
          <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1.5 text-link hover:underline">
            <EnvelopeSimpleIcon className="size-3.5" /> {p.email}
          </a>
        </Row>
        <Row label="Joined">
          <span title={fullDate(p.joinedAt)}>{longDate(p.joinedAt)}</span>
        </Row>
        <Row label="Last active">{p.lastActive ? <span title={fullDate(p.lastActive)}>{ago(p.lastActive)}</span> : "–"}</Row>
        <Row label="Signed in">{p.verified ? "Yes" : <span className="text-faint">Not yet</span>}</Row>
        <Row label="Role">{p.team ? "Team" : "Member"}</Row>
      </section>

      <section>
        <h2 className="pb-1.5 text-xs font-medium text-muted-foreground">Emails from the board</h2>
        <Row label="Post updates">{p.emails.statusUpdates ? "On" : <span className="text-faint">{p.verified ? "Off" : "Off until they sign in"}</span>}</Row>
        <Row label="Changelog">{p.emails.changelog === "subscribed" ? "Subscribed" : p.emails.changelog === "pending" ? "Not confirmed" : <span className="text-faint">Not subscribed</span>}</Row>
      </section>

      {canDelete ? (
        <section className="mt-auto flex flex-col gap-2 border-t pt-5">
          {confirming ? (
            <>
              <p className="text-[13px] text-muted-foreground">Delete their account, name and email? Their votes go; their posts and comments stay, without a name. This can't be undone.</p>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" disabled={busy} onClick={remove}>
                  {busy ? "Deleting…" : "Delete"}
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="self-start text-[13px] font-medium text-destructive hover:underline">
              Delete person
            </button>
          )}
        </section>
      ) : null}
    </aside>
  );
}
