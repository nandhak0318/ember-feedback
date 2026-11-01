// Ember: mail goes through Resend when RESEND_API_KEY is set, since Cloudflare's
// Email Sending only reaches arbitrary inboxes on Workers Paid. Same shape as
// the Email binding, so callers don't change. Errors carry the binding's codes
// (E_RATE_LIMIT_EXCEEDED, E_DAILY_LIMIT_EXCEEDED) so notify.ts backs off the same way.

type Message = {
  to: string;
  from: { email: string; name: string };
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  headers?: Record<string, string>;
};

type Mailer = { send(m: Message): Promise<{ messageId?: string }> };

function resend(apiKey: string): Mailer {
  return {
    async send(m) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `${m.from.name} <${m.from.email}>`,
          to: [m.to],
          subject: m.subject,
          html: m.html,
          text: m.text,
          ...(m.replyTo ? { reply_to: m.replyTo } : {}),
          ...(m.headers ? { headers: m.headers } : {}),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { id?: string; name?: string; message?: string };
      if (!res.ok) {
        const quota = body.name === "daily_quota_exceeded" || body.name === "monthly_quota_exceeded";
        const code = quota ? "E_DAILY_LIMIT_EXCEEDED" : res.status === 429 ? "E_RATE_LIMIT_EXCEEDED" : `RESEND_${res.status}`;
        throw Object.assign(new Error(`Resend: ${body.message ?? res.statusText}`), { code });
      }
      return { messageId: body.id };
    },
  };
}

// The mailer for this env: Resend if keyed, else the EMAIL binding (or none).
export function mailer(env: unknown): Mailer | undefined {
  const vars = env as { RESEND_API_KEY?: string; EMAIL?: Mailer };
  return vars.RESEND_API_KEY ? resend(vars.RESEND_API_KEY) : vars.EMAIL;
}
