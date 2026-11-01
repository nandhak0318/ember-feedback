import { EnvelopeSimpleIcon, MagicWandIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "@openheard/ui/lib/utils";

import { Button } from "@openheard/ui/components/button";
import { GoogleIcon } from "@/components/icons";
import { authClient } from "@/lib/auth-client";
import { track } from "@/lib/ember-analytics";

function Field({ icon, children, invalid }: { icon: React.ReactNode; children: React.ReactNode; invalid?: boolean }) {
  return (
    <label className={cn("flex h-10 items-center gap-2.5 rounded-lg border bg-card px-3 text-faint transition-colors focus-within:ring-1", invalid ? "animate-shake border-red-500/70 focus-within:border-red-500 focus-within:ring-red-500/40 motion-reduce:animate-none" : "border-input focus-within:border-ring/60 focus-within:ring-ring/40")}>
      {icon}
      {children}
    </label>
  );
}

// Email link only: password sign-in is off on the server (packages/auth).
export function AuthForm({
  wsName,
  hasGoogle,
  callbackURL,
  showFirstAccountHint = false,
  onGoogleClick,
}: {
  wsName: string;
  hasGoogle: boolean;
  callbackURL: string;
  onSuccess: () => void;
  showFirstAccountHint?: boolean;
  onGoogleClick?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [magicSent, setMagicSent] = useState(false);

  function onError(err: { error: { message?: string; statusText: string } }) {
    setError(err.error.message || err.error.statusText);
    setBusy(false);
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    await authClient.signIn.magicLink(
      { email, callbackURL },
      {
        onSuccess: () => {
          track("feedback_sign_in_link_requested");
          setMagicSent(true);
          setBusy(false);
        },
        onError,
      },
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em]">{`Sign in to ${wsName}`}</h1>
        <p className="text-sm text-muted-foreground">Vote and comment as yourself. No password: we email you a link.</p>
      </div>

      {hasGoogle ? (
        <>
          <Button
            variant="secondary"
            full
            size="lg"
            disabled={busy}
            className="font-semibold"
            onClick={() => {
              onGoogleClick?.();
              setBusy(true);
              authClient.signIn.social({ provider: "google", callbackURL });
            }}
          >
            <GoogleIcon className="mr-1.5 size-4" /> Continue with Google
          </Button>
          <div className="flex w-full items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-faint">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      ) : null}

      {magicSent ? (
        <div className="flex w-full flex-col items-center gap-3 rounded-lg border bg-card px-5 py-6 text-center">
          <MagicWandIcon className="size-6 text-faint" />
          <p className="text-sm">Check your email for a sign-in link.</p>
          <button type="button" onClick={() => setMagicSent(false)} className="text-xs text-faint hover:text-foreground">
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={sendMagicLink} className="flex w-full flex-col gap-2.5">
          <Field icon={<EnvelopeSimpleIcon className="size-[15px]" />} invalid={!!error}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={busy} autoComplete="email" placeholder="you@example.com" className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-faint disabled:opacity-60" />
          </Field>
          {error ? <p role="alert" className="text-[13px] text-red-400">{error}</p> : null}
          <Button type="submit" full arrow size="lg" disabled={busy} className="mt-1">
            {busy ? "Sending…" : "Email me a link"}
          </Button>
        </form>
      )}

      {showFirstAccountHint ? (
        <p className="text-center text-xs text-faint">You're setting up this install. This account will be the admin.</p>
      ) : null}
    </div>
  );
}
