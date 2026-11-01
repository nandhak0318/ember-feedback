import { createFileRoute } from "@tanstack/react-router";

import { AVATAR_ID, AVATAR_USER, avatarKey, avatarPath } from "@/lib/avatar";

const notFound = () => new Response("Not found", { status: 404, headers: { "content-type": "text/plain", "cache-control": "no-store" } });

// Ember: serves a profile picture. Only the picture a user has now resolves, so
// a replaced or removed one is gone; each upload has a new path, so a day of
// caching never shows a stale face.
export const Route = createFileRoute("/avatar/$userId/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!AVATAR_USER.test(params.userId) || !AVATAR_ID.test(params.id)) return notFound();
        const path = avatarPath(params.userId, params.id);
        const [{ createDb, user }, { uploadsBucket }, { eq }] = await Promise.all([import("@openheard/db"), import("@/lib/attachment-db"), import("drizzle-orm")]);
        const [row] = await createDb().select({ image: user.image }).from(user).where(eq(user.id, params.userId)).limit(1);
        if (row?.image !== path) return notFound();
        const object = await uploadsBucket()?.get(avatarKey(path)!);
        if (!object) return notFound();
        return new Response(object.body, {
          headers: {
            "content-type": object.httpMetadata?.contentType ?? "application/octet-stream",
            "content-length": String(object.size),
            "cache-control": "public, max-age=86400",
            "x-content-type-options": "nosniff",
            "content-security-policy": "default-src 'none'; sandbox",
          },
        });
      },
    },
  },
});
