import { createFileRoute } from "@tanstack/react-router";

import { AVATAR_ID, MAX_AVATAR_BYTES, avatarKey, avatarPath } from "@/lib/avatar";
import { isDemo } from "@/lib/demo";
import { readCapped } from "@/lib/read-capped";

const json = (body: unknown, status = 200, headers?: Headers) => {
  const h = new Headers(headers);
  h.set("content-type", "application/json");
  return new Response(JSON.stringify(body), { status, headers: h });
};

// Sets the signed-in user's picture and returns the auth library's cookies, so
// the cached session (and the header avatar) picks up the change at once.
async function setImage(request: Request, image: string | null) {
  const { createAuth } = await import("@openheard/auth");
  const res = await createAuth().api.updateUser({ body: { image }, headers: request.headers, asResponse: true });
  const cookies = new Headers();
  for (const c of res.headers.getSetCookie()) cookies.append("set-cookie", c);
  return { ok: res.ok, cookies };
}

async function session(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return { error: json({ error: "Cross-origin requests are not allowed" }, 403) };
  const { getSessionContext } = await import("@/lib/session");
  const { user, workspace } = await getSessionContext(request);
  if (!user) return { error: json({ error: "Sign in to change your picture" }, 401) };
  if (isDemo(workspace)) return { error: json({ error: "Pictures are off in the demo" }, 403) };
  return { user };
}

// Ember: profile pictures. POST the image bytes (the page has already cropped
// and resized it); DELETE removes the picture. Only your own.
export const Route = createFileRoute("/api/avatar")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const s = await session(request);
        if (s.error) return s.error;
        const { user } = s;

        const { uploadAllowed } = await import("@/lib/rate-limit");
        if (!(await uploadAllowed(user.id, request.headers.get("cf-connecting-ip")))) return json({ error: "Too many uploads. Try again in a minute." }, 429);

        const declared = Number(request.headers.get("content-length") ?? "");
        if (declared > MAX_AVATAR_BYTES) return json({ error: "That picture is too large." }, 413);
        const bytes = await readCapped(request, MAX_AVATAR_BYTES);
        if (!bytes) return json({ error: "That picture is too large." }, 413);
        if (!bytes.byteLength) return json({ error: "That file is empty." }, 400);

        const [{ sniffImageType }, { uploadsBucket }] = await Promise.all([import("@/lib/attachments"), import("@/lib/attachment-db")]);
        const type = sniffImageType(bytes);
        if (!type || type === "image/gif") return json({ error: "Use a PNG, JPEG or WebP picture." }, 415);
        const bucket = uploadsBucket();
        if (!bucket) return json({ error: "Pictures are not available right now." }, 503);

        const raw = crypto.getRandomValues(new Uint8Array(16));
        const id = btoa(String.fromCharCode(...raw)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        if (!AVATAR_ID.test(id)) return json({ error: "Could not save that picture." }, 500);
        const image = avatarPath(user.id, id);
        await bucket.put(avatarKey(image)!, bytes, { httpMetadata: { contentType: type } });

        const previous = avatarKey(user.image);
        const { ok, cookies } = await setImage(request, image);
        if (!ok) {
          await bucket.delete(avatarKey(image)!);
          return json({ error: "Could not save that picture." }, 500);
        }
        // The old picture stops resolving at once; the nightly sweep would get it too.
        if (previous) await bucket.delete(previous).catch(() => {});
        return json({ image }, 201, cookies);
      },
      DELETE: async ({ request }) => {
        const s = await session(request);
        if (s.error) return s.error;
        const previous = avatarKey(s.user.image);
        const { ok, cookies } = await setImage(request, null);
        if (!ok) return json({ error: "Could not remove the picture." }, 500);
        if (previous) {
          const { uploadsBucket } = await import("@/lib/attachment-db");
          await uploadsBucket()?.delete(previous).catch(() => {});
        }
        return json({ image: null }, 200, cookies);
      },
    },
  },
});
