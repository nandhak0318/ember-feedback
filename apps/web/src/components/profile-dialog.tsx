import { Button } from "@openheard/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@openheard/ui/components/dialog";
import { useLoaderData, useRouter } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { saveMyName } from "@/functions/profile";

import { AvatarCropper } from "./avatar-cropper";
import { Avatar } from "./bits";

// The picture with Upload / Remove, for the profile dialog and the dashboard's
// profile page. A chosen photo goes through the cropper first, which hands back
// a small square, so the server never resizes.
export function AvatarPicker({ name, image, size = 64 }: { name: string; image?: string | null; size?: number }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [cropping, setCropping] = useState<File | null>(null);

  async function send(method: "POST" | "DELETE", body?: Blob): Promise<boolean> {
    setBusy(true);
    try {
      const res = await fetch("/api/avatar", { method, body, headers: body ? { "content-type": body.type } : undefined });
      const out = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(out.error ?? "Could not save the picture");
      await router.invalidate();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the picture");
      return false;
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
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) setCropping(file);
        }}
      />
      <AvatarCropper
        file={cropping}
        onCancel={() => setCropping(null)}
        onDone={async (blob) => {
          if (await send("POST", blob)) setCropping(null);
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
