// Ember: profile pictures. Each upload gets a fresh random id, stored in the
// uploads bucket under avatars/<id> and served at /avatar/<userId>/<id>; the
// user's `image` holds that path. Keep this file free of server imports: the
// UI reads it too.
export const AVATAR_ID = /^[A-Za-z0-9_-]{16,40}$/;
export const AVATAR_USER = /^[A-Za-z0-9_-]{1,64}$/;
// The client resizes to this square before upload; the server caps the bytes.
export const AVATAR_SIZE = 256;
export const MAX_AVATAR_BYTES = 512 * 1024;

export const avatarPath = (userId: string, id: string) => `/avatar/${userId}/${id}`;

// The bucket key for an image path this board serves, or null for anything else
// (an empty image, or a picture hosted elsewhere).
export function avatarKey(image: string | null | undefined): string | null {
  const m = /^\/avatar\/([^/]+)\/([^/]+)$/.exec(image ?? "");
  return m && AVATAR_USER.test(m[1]!) && AVATAR_ID.test(m[2]!) ? `avatars/${m[2]}` : null;
}
