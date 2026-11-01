// Ember: PostHog on the public board, in the same project as ember.mov and its
// help center ("Ember Landing Page"). Every event goes through track(), which
// takes only short tokens, numbers and booleans: never a name, email, post
// title, comment or search. People stay anonymous (no identify), there are no
// session recordings and no click autocapture (clicked text can be a post
// title), and the search box's words are cut from every URL. Admins, the
// dashboard and the embed widget are never tracked; ?internal=1 turns it off in
// this browser, as on ember.mov.
import type { PostHog } from "posthog-js";

const KEY = "phc_mphe5Ka3gdtgLUWAcpoMPPfpC7kcdnMj9uDM4hAX5V4r";
const HOST = "https://us.i.posthog.com";

type Props = Record<string, string | number | boolean>;

let client: PostHog | null = null;
let starting = false;
const queued: [string, Props][] = [];

function internal(): boolean {
  try {
    const q = /[?&]internal=([01])(&|$)/.exec(location.search);
    if (q) {
      if (q[1] === "1") localStorage.setItem("ember-internal", "1");
      else localStorage.removeItem("ember-internal");
    }
    return localStorage.getItem("ember-internal") === "1";
  } catch {
    return false;
  }
}

// Drops the board's search words (?q=) from a URL; everything else stays.
function withoutSearch(value: string): string {
  if (!/^(https?:\/\/|\/)/.test(value) || !/[?&]q=/.test(value)) return value;
  try {
    const url = new URL(value, location.origin);
    url.searchParams.delete("q");
    return value.startsWith("/") ? url.pathname + url.search + url.hash : url.toString();
  } catch {
    return value;
  }
}

// Every URL anywhere in an event, nested ones included ($set_once,
// $session_entry_url, referrers...), so no property PostHog adds later slips by.
function scrub(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return withoutSearch(value);
  if (depth > 3 || !value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) out[k] = scrub(v, depth + 1);
  return out;
}

export function startAnalytics(opts: { admin: boolean; pathname: string }) {
  if (typeof window === "undefined" || client || starting) return;
  if (opts.admin || opts.pathname.startsWith("/dashboard") || opts.pathname.startsWith("/widget") || internal()) return;
  starting = true;
  import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(KEY, {
        api_host: HOST,
        defaults: "2026-05-30",
        person_profiles: "identified_only",
        autocapture: false,
        disable_session_recording: true,
        disable_surveys: true,
        before_send: (event) => {
          if (!event) return event;
          event.properties = scrub(event.properties) as typeof event.properties;
          if (event.$set) event.$set = scrub(event.$set) as typeof event.$set;
          if (event.$set_once) event.$set_once = scrub(event.$set_once) as typeof event.$set_once;
          return event;
        },
      });
      posthog.register({ site: "feedback" });
      client = posthog;
      for (const [e, p] of queued.splice(0)) client.capture(e, p);
    })
    .catch(() => {
      starting = false;
    });
}

// Stop for the rest of the visit, e.g. when an admin signs in.
export function stopAnalytics() {
  client?.opt_out_capturing();
  client = null;
  queued.length = 0;
}

export function track(event: string, props: Props = {}) {
  if (typeof window === "undefined") return;
  if (client) client.capture(event, props);
  else if (starting && queued.length < 20) queued.push([event, props]);
}
