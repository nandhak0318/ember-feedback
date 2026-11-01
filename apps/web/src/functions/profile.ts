// Ember: anyone signed in sets their own display name. Goes through the auth
// library so the cached session (and the header) shows the new name at once;
// tanstackStartCookies forwards the refreshed cookie.
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { assertNotDemoIdentity } from "@/lib/demo";
import { requireUser, sessionMiddleware } from "@/lib/session";

export const saveMyName = createServerFn({ method: "POST" })
  .middleware([sessionMiddleware])
  .validator((d: unknown) => z.object({ name: z.string().trim().min(1, "Add a name").max(60) }).parse(d))
  .handler(async ({ data, context }) => {
    const u = requireUser(context.user);
    assertNotDemoIdentity(u);
    const { createAuth } = await import("@openheard/auth");
    await createAuth().api.updateUser({ body: { name: data.name }, headers: getRequest().headers });
    return { ok: true };
  });
