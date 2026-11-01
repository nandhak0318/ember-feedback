import { Button } from "@openheard/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@openheard/ui/components/dialog";
import { useLoaderData, useRouter } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { saveMyName } from "@/functions/profile";
import { AVATAR_SIZE } from "@/lib/avatar";

import { Avatar } from "./bits";

// Ember: crop to the centre square and shrink to AVATAR_SIZE in the browser, so
// a phone photo uploads as a few kilobytes and the server never resizes.
async function toSquare(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  bitmap.close();
  const webp = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.86));
  if (webp?.type === "image/webp") return webp;
  const jpeg = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.88));
  if (!jpeg) throw new Error("Could not read that picture");
  return jpeg;
}

// The picture with Upload / Remove, for the profile dialog and the dashboard's profile page.
export function AvatarPicker({ name, image, size = 64 }: { name: string; image?: string | null; size?: number }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function send(method: "POST" | "DELETE", body?: Blob) {
    setBusy(true);
    try {
      const res = await fetch("/api/avatar", { method, body, headers: body ? { "content-type": body.type } : undefined });
      const out = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(out.error ?? "Could not save the picture");
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the picture");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name} image={image} size={size} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? "Saving…" : image ? "Change picture" : "Add a picture"}
        </Button>
        {image ? (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => send("DELETE")}>
            Remove
          </Button>
        ) : null}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          try {
            await send("POST", await toSquare(file));
          } catch {
            toast.error("That file isn't a picture this browser can read. Try a JPEG or PNG.");
          }
        }}
      />
    </div>
  );
}

export function ProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const root = useLoaderData({ from: "__root__" });
  const router = useRouter();
  const me = root.user;
  const [name, setName] = useState(me?.name ?? "");
  const [saving, setSaving] = useState(false);
  if (!me) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim() === me!.name) return onOpenChange(false);
    setSaving(true);
    try {
      await saveMyName({ data: { name } });
      await router.invalidate();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error && !err.message.startsWith("[") ? err.message : "Add a name of up to 60 characters");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) setName(me.name);
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Your profile</DialogTitle>
          <DialogDescription>Your name and picture show next to your posts, votes and comments. Your email never does.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="flex flex-col gap-5 pt-2">
          <AvatarPicker name={name || me.email} image={me.image} />
          <label className="flex flex-col gap-1.5 text-[13px] font-medium">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              required
              autoComplete="name"
              placeholder="How you'd like to appear"
              className="h-10 rounded-lg border border-input bg-card px-3 text-sm font-normal outline-none focus:border-ring/60"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving || !name.trim()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
