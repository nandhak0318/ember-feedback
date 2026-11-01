import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Panel } from "@/components/admin/panel";
import { Avatar, TeamBadge } from "@/components/bits";
import { DashboardErrorState, DashboardPanelSkeleton } from "@/components/states";
import { listPeople } from "@/functions/people";
import { ago, fullDate } from "@/lib/time";

// Ember: everyone who posted, voted or commented, with their email. Admins only:
// the loader's server function refuses anyone else.
export const Route = createFileRoute("/dashboard/people/")({
  loader: () => listPeople(),
  head: () => ({ meta: [{ title: "People · Ember feedback" }] }),
  component: PeoplePage,
  errorComponent: ({ error }) => <DashboardErrorState message={(error as Error)?.message} retry="/dashboard/people" />,
  pendingComponent: DashboardPanelSkeleton,
});

const count = (n: number) => (n ? n : <span className="text-faint">–</span>);

function PeoplePage() {
  const people = Route.useLoaderData();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = needle ? people.filter((p) => p.name.toLowerCase().includes(needle) || p.email.toLowerCase().includes(needle)) : people;

  return (
    <Panel title="People" onSearch={setQ} searchLabel="Search people">
      {people.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-24 text-center">
          <p className="text-[15px] font-semibold">No one here yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">People show up once they post, vote or comment.</p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-background">
              <tr className="border-b text-xs font-medium text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">{shown.length === people.length ? `${people.length} people` : `${shown.length} of ${people.length}`}</th>
                <th className="w-20 px-3 py-2.5 text-right font-medium">Posts</th>
                <th className="w-20 px-3 py-2.5 text-right font-medium">Votes</th>
                <th className="w-24 px-3 py-2.5 text-right font-medium">Comments</th>
                <th className="hidden w-28 px-3 py-2.5 text-right font-medium md:table-cell">Joined</th>
                <th className="w-28 px-5 py-2.5 text-right font-medium">Active</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr
                  key={p.id}
                  tabIndex={0}
                  onClick={() => navigate({ to: "/dashboard/people/$id", params: { id: p.id } })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") navigate({ to: "/dashboard/people/$id", params: { id: p.id } });
                  }}
                  className="cursor-pointer border-b outline-none hover:bg-card/60 focus-visible:bg-card/60"
                >
                  <td className="px-5 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={p.name || p.email} image={p.image} size={32} />
                      <div className="flex min-w-0 flex-col">
                        <span className="flex items-center gap-2 font-semibold">
                          <span className="truncate">{p.name || "No name"}</span>
                          {p.team ? <TeamBadge /> : null}
                          {!p.verified ? <span className="shrink-0 text-[11px] font-medium text-faint" title="Imported, or never opened a sign-in link. Gets no emails until they sign in.">Not signed in yet</span> : null}
                        </span>
                        <span className="truncate text-[13px] text-muted-foreground">{p.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{count(p.posts)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{count(p.votes)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{count(p.comments)}</td>
                  <td className="hidden px-3 py-3 text-right text-[13px] text-faint tabular-nums md:table-cell" title={fullDate(p.joinedAt)}>
                    {ago(p.joinedAt)}
                  </td>
                  <td className="px-5 py-3 text-right text-[13px] text-faint tabular-nums" title={p.lastActive ? fullDate(p.lastActive) : undefined}>
                    {p.lastActive ? ago(p.lastActive) : "–"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
