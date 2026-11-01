import { Button } from "@openheard/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@openheard/ui/components/dialog";
import { MagnifyingGlassMinusIcon, MagnifyingGlassPlusIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import { AVATAR_SIZE } from "@/lib/avatar";

// Ember: choose the part of a photo that becomes your picture. Drag to move,
// the slider, scroll wheel or a pinch to zoom, arrow keys to nudge. The
// picture always fills the circle, so there is never an empty edge.
const VIEW = 260; // the crop square on screen, in CSS pixels
const MAX_ZOOM = 5;

type Img = { bitmap: ImageBitmap; url: string; w: number; h: number };
type Pos = { zoom: number; x: number; y: number }; // x, y: the image's top-left inside the square

const base = (img: Img) => VIEW / Math.min(img.w, img.h); // scale at which the short side fills the square

function clamp(img: Img, p: Pos): Pos {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, p.zoom));
  const s = base(img) * zoom;
  const x = Math.min(0, Math.max(VIEW - img.w * s, p.x));
  const y = Math.min(0, Math.max(VIEW - img.h * s, p.y));
  return { zoom, x, y };
}

// Zoom about a point in the square (the centre by default), keeping it still.
function zoomTo(img: Img, p: Pos, zoom: number, at = { x: VIEW / 2, y: VIEW / 2 }): Pos {
  const s = base(img) * p.zoom;
  const next = Math.min(MAX_ZOOM, Math.max(1, zoom));
  const s2 = base(img) * next;
  const ix = (at.x - p.x) / s;
  const iy = (at.y - p.y) / s;
  return clamp(img, { zoom: next, x: at.x - ix * s2, y: at.y - iy * s2 });
}

async function render(img: Img, p: Pos): Promise<Blob> {
  const s = base(img) * p.zoom;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img.bitmap, -p.x / s, -p.y / s, VIEW / s, VIEW / s, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  const webp = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.86));
  if (webp?.type === "image/webp") return webp;
  const jpeg = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.88));
  if (!jpeg) throw new Error("Could not read that picture");
  return jpeg;
}

export function AvatarCropper({ file, onCancel, onDone }: { file: File | null; onCancel: () => void; onDone: (blob: Blob) => Promise<void> }) {
  const [img, setImg] = useState<Img | null>(null);
  const [pos, setPos] = useState<Pos>({ zoom: 1, x: 0, y: 0 });
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const drag = useRef<{ id: number; x: number; y: number; from: Pos } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; from: Pos } | null>(null);
  const square = useRef<HTMLDivElement>(null);

  // Decode once per file; createImageBitmap follows the photo's EXIF rotation.
  useEffect(() => {
    if (!file) return;
    let live = true;
    let loaded: Img | null = null;
    setImg(null);
    setFailed(false);
    createImageBitmap(file)
      .then((bitmap) => {
        if (!live) return bitmap.close();
        // <img> and createImageBitmap both apply the photo's rotation, so the
        // preview (the file itself) and the result (the bitmap) line up.
        loaded = { bitmap, url: URL.createObjectURL(file), w: bitmap.width, h: bitmap.height };
        const s = VIEW / Math.min(bitmap.width, bitmap.height);
        setPos({ zoom: 1, x: (VIEW - bitmap.width * s) / 2, y: (VIEW - bitmap.height * s) / 2 });
        setImg(loaded);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
      if (loaded) {
        URL.revokeObjectURL(loaded.url);
        loaded.bitmap.close();
      }
    };
  }, [file]);

  // Wheel zoom needs a non-passive listener to keep the page from scrolling.
  useEffect(() => {
    const el = square.current;
    if (!el || !img) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      setPos((p) => zoomTo(img, p, p.zoom * Math.exp(-e.deltaY * 0.0015), { x: e.clientX - r.left, y: e.clientY - r.top }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [img]);

  const s = img ? base(img) * pos.zoom : 1;

  async function save() {
    if (!img) return;
    setSaving(true);
    try {
      await onDone(await render(img, pos));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!file} onOpenChange={(o) => !o && !saving && onCancel()}>
      <DialogContent className="max-w-[340px]">
        <DialogHeader>
          <DialogTitle>Crop your picture</DialogTitle>
          <DialogDescription>Drag to move it. Zoom with the slider.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 pt-1">
          <div
            ref={square}
            role="img"
            aria-label="Crop area. Use the arrow keys to move the picture, plus and minus to zoom."
            tabIndex={0}
            className="relative shrink-0 cursor-grab touch-none overflow-hidden rounded-xl bg-muted outline-none select-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
            style={{ width: VIEW, height: VIEW }}
            onPointerDown={(e) => {
              if (!img) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
              if (pointers.current.size === 2) {
                const [a, b] = [...pointers.current.values()];
                pinch.current = { dist: Math.hypot(a!.x - b!.x, a!.y - b!.y), from: pos };
                drag.current = null;
              } else {
                drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, from: pos };
              }
            }}
            onPointerMove={(e) => {
              if (!img || !pointers.current.has(e.pointerId)) return;
              pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
              if (pinch.current && pointers.current.size === 2) {
                const [a, b] = [...pointers.current.values()];
                const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
                setPos(zoomTo(img, pinch.current.from, (pinch.current.from.zoom * dist) / pinch.current.dist));
              } else if (drag.current?.id === e.pointerId) {
                const d = drag.current;
                setPos(clamp(img, { zoom: d.from.zoom, x: d.from.x + e.clientX - d.x, y: d.from.y + e.clientY - d.y }));
              }
            }}
            onPointerUp={(e) => {
              pointers.current.delete(e.pointerId);
              if (pointers.current.size < 2) pinch.current = null;
              if (drag.current?.id === e.pointerId) drag.current = null;
            }}
            onPointerCancel={(e) => {
              pointers.current.delete(e.pointerId);
              pinch.current = null;
              drag.current = null;
            }}
            onKeyDown={(e) => {
              if (!img) return;
              const step = e.shiftKey ? 30 : 8;
              const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
              if (moves[e.key]) {
                e.preventDefault();
                const [dx, dy] = moves[e.key]!;
                setPos((p) => clamp(img, { ...p, x: p.x + dx, y: p.y + dy }));
              } else if (e.key === "+" || e.key === "=") {
                e.preventDefault();
                setPos((p) => zoomTo(img, p, p.zoom * 1.15));
              } else if (e.key === "-") {
                e.preventDefault();
                setPos((p) => zoomTo(img, p, p.zoom / 1.15));
              }
            }}
          >
            {img ? (
              <img
                src={img.url}
                alt=""
                draggable={false}
                className="pointer-events-none absolute top-0 left-0 max-w-none origin-top-left"
                style={{ width: img.w, height: img.h, transform: `translate(${pos.x}px, ${pos.y}px) scale(${s})` }}
              />
            ) : (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                {failed ? "This browser can't read that picture. Try a JPEG or PNG." : "Opening the picture…"}
              </div>
            )}
            {/* Everything outside the circle is dimmed; the circle is what people will see. */}
            <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] ring-2 ring-white/80" />
          </div>

          <div className="flex w-full items-center gap-3 px-1">
            <button type="button" aria-label="Zoom out" disabled={!img} onClick={() => img && setPos((p) => zoomTo(img, p, p.zoom / 1.25))} className="text-muted-foreground hover:text-foreground disabled:opacity-40">
              <MagnifyingGlassMinusIcon className="size-4" />
            </button>
            <input
              type="range"
              aria-label="Zoom"
              min={1}
              max={MAX_ZOOM}
              step={0.01}
              value={pos.zoom}
              disabled={!img}
              onChange={(e) => img && setPos((p) => zoomTo(img, p, Number(e.target.value)))}
              className="h-1 flex-1 cursor-pointer accent-[var(--link)]"
            />
            <button type="button" aria-label="Zoom in" disabled={!img} onClick={() => img && setPos((p) => zoomTo(img, p, p.zoom * 1.25))} className="text-muted-foreground hover:text-foreground disabled:opacity-40">
              <MagnifyingGlassPlusIcon className="size-4" />
            </button>
          </div>

          <div className="flex w-full justify-end gap-2">
            <Button size="sm" variant="ghost" disabled={saving} onClick={onCancel}>
              Cancel
            </Button>
            <Button size="sm" disabled={!img || saving} onClick={save}>
              {saving ? "Saving…" : "Use this picture"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
