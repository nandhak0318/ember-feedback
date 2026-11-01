// Ember: the people behind the posts, for admins only. Every function here
// checks requireAdmin on the server, so a visitor or member never receives an
// email address; the public board only ever loads id, name and image.
import { changelogSubscriber, comment, createDb, emailOptout, membership, post, user, vote } from "@openheard/db";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { DEMO_ADMIN_ID, assertNotDemo } from "@/lib/demo";
import { requireAdmin, sessionMiddleware } from "@/lib/session";

// Counts and last activity for one user, scoped to this workspace's posts.
function stats(ws: string) {
  return {
    posts: sql<number>`(select count(*) from post p where p.author_id = "user"."id" and p.workspace_id = ${ws})`,
    votes: sql<number>`(select count(*) from vote v join post p on p.id = v.post_id where v.user_id = "user"."id" and p.workspace_id = ${ws})`,
    comments: sql<number>`(select count(*) from comment c join post p on p.id = c.post_id where c.author_id = "user"."id" and c.internal = 0 and p.workspace_id = ${ws})`,
    lastActive: sql<number | null>`max(
      coalesce((select max(p.created_at) from post p where p.author_id = "user"."id" and p.workspace_id = ${ws}), 0),
      coalesce((select max(v.created_at) from vote v join post p on p.id = v.post_id where v.user_id = "user"."id" and p.workspace_id = ${ws}), 0),
      coalesce((select max(c.created_at) from comment c join post p on p.id = c.post_id where c.author_id = "user"."id" and p.workspace_id = ${ws}), 0)
    )`,
    team: sql<number>`exists(select 1 from membership m where m.user_id = "user"."id" and m.workspace_id = ${ws} and m.role = 'admin')`,
    member: sql<number>`exists(select 1 from membership m where m.user_id = "user"."id" and m.workspace_id = ${ws})`,
  };
}

const columns = { id: user.id, name: user.name, email: user.email, image: user.image, verified: user.emailVerified, joinedAt: user.createdAt };

export type PersonRow = Awaited<ReturnType<typeof listPeople>>[number];

// Everyone who belongs to this workspace or has posted, voted or commented in it.
export const listPeople = createServerFn({ method: "GET" })
  .middleware([sessionMiddleware])
  .handler(async ({ context }) => {
    requireAdmin(context.user);
    const ws = context.workspace.id;
    const rows = await createDb().select({ ...columns, ...stats(ws) }).from(user);
    return rows
      .filter((r) => r.id !== DEMO_ADMIN_ID && (r.member || r.posts || r.votes || r.comments))
      .map((r) => ({ ...r, team: !!r.team, lastActive: r.lastActive || null }))
      .sort((a, b) => (b.lastActive ?? 0) - (a.lastActive ?? 0) || +b.joinedAt - +a.joinedAt);
  });

export const getPerson = createServerFn({ method: "GET" })
  .middleware([sessionMiddleware])
  .validator((d: unknown) => z.object({ id: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    const me = requireAdmin(context.user);
    const ws = context.workspace.id;
    const db = createDb();
    const [person] = await db.select({ ...columns, ...stats(ws) }).from(user).where(eq(user.id, data.id)).limit(1);
    if (!person || person.id === DEMO_ADMIN_ID) throw new Error("Person not found");

    const LIMIT = 200;
    const [posts, votes, comments, optouts, subscriber] = await db.batch([
      db.select({ at: post.createdAt, postId: post.id, title: post.title }).from(post).where(and(eq(post.authorId, data.id), eq(post.workspaceId, ws))).orderBy(desc(post.createdAt)).limit(LIMIT),
      db.select({ at: vote.createdAt, postId: post.id, title: post.title }).from(vote).innerJoin(post, eq(post.id, vote.postId)).where(and(eq(vote.userId, data.id), eq(post.workspaceId, ws))).orderBy(desc(vote.createdAt)).limit(LIMIT),
      db.select({ at: comment.createdAt, postId: post.id, title: post.title, body: comment.body, internal: comment.internal }).from(comment).innerJoin(post, eq(post.id, comment.postId)).where(and(eq(comment.authorId, data.id), eq(post.workspaceId, ws))).orderBy(desc(comment.createdAt)).limit(LIMIT),
      db.select({ kind: emailOptout.kind }).from(emailOptout).where(and(eq(emailOptout.workspaceId, ws), eq(emailOptout.email, person.email.toLowerCase()))),
      db.select({ confirmedAt: changelogSubscriber.confirmedAt }).from(changelogSubscriber).where(and(eq(changelogSubscriber.workspaceId, ws), eq(changelogSubscriber.email, person.email.toLowerCase()))).limit(1),
    ] as const);

    const activity = [
      ...posts.map((p) => ({ kind: "post" as const, at: +p.at, postId: p.postId, title: p.title })),
      ...votes.map((v) => ({ kind: "vote" as const, at: +v.at, postId: v.postId, title: v.title })),
      ...comments.map((c) => ({ kind: c.internal ? ("note" as const) : ("comment" as const), at: +c.at, postId: c.postId, title: c.title, body: c.body.slice(0, 280) })),
    ].sort((a, b) => b.at - a.at);

    const off = new Set(optouts.map((o) => o.kind));
    return {
      ...person,
      team: !!person.team,
      lastActive: person.lastActive || null,
      activity,
      emails: {
        // Status emails need a verified address; an imported account is unverified until its owner signs in.
        statusUpdates: person.verified && !off.has("status"),
        changelog: subscriber[0] ? (subscriber[0].confirmedAt ? "subscribed" : "pending") : "no",
      },
      self: person.id === me.id,
    };
  });

// Deletes a person's account, name and email, for a deletion request. Their
// votes go and the posts' counts follow; their posts and comments stay,
// without a name. Team members are removed from the team first, not here.
export const deletePerson = createServerFn({ method: "POST" })
  .middleware([sessionMiddleware])
  .validator((d: unknown) => z.object({ id: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    const me = requireAdmin(context.user);
    assertNotDemo(context.workspace);
    if (data.id === me.id) throw new Error("You can't delete your own account here");
    const db = createDb();
    const [target] = await db.select({ id: user.id, email: user.email, role: user.role }).from(user).where(eq(user.id, data.id)).limit(1);
    if (!target || target.id === DEMO_ADMIN_ID) throw new Error("Person not found");
    const [onTeam] = await db.select({ role: membership.role }).from(membership).where(and(eq(membership.userId, data.id), eq(membership.role, "admin"))).limit(1);
    if (target.role === "admin" || onTeam) throw new Error("Remove them from the team first");

    const voted = (await db.select({ postId: vote.postId }).from(vote).where(eq(vote.userId, data.id))).map((v) => v.postId);
    const email = target.email.toLowerCase();
    await db.batch([
      db.delete(emailOptout).where(eq(emailOptout.email, email)),
      db.delete(changelogSubscriber).where(eq(changelogSubscriber.email, email)),
      // Cascades to sessions, accounts, memberships, votes and reactions; posts,
      // comments and timeline rows keep their text with no author.
      db.delete(user).where(eq(user.id, data.id)),
    ]);
    // Take their one vote off each post. Not a recount: imported posts carry
    // counts with no vote rows behind them.
    if (voted.length) {
      await db
        .update(post)
        .set({ voteCount: sql`max(${post.voteCount} - 1, 0)` })
        .where(inArray(post.id, voted));
    }
    return { ok: true };
  });
