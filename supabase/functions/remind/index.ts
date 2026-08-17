/**
 * Room Mates · reminder robot
 * ---------------------------------------------------------------
 * Runs on Supabase Edge Functions. A cron job pokes it every 5 minutes.
 * It re-runs the SAME rotation logic the UI uses, finds duties that are
 * due, and sends push / WhatsApp / email — then records what it sent so
 * nobody ever gets the same reminder twice.
 *
 * Deploy:   supabase functions deploy remind --no-verify-jwt
 * Schedule: see cron.sql
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // service role bypasses RLS
);

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_FROM = Deno.env.get("TWILIO_WHATSAPP_FROM"); // 'whatsapp:+14155238886'
const RESEND_KEY = Deno.env.get("RESEND_API_KEY");

webpush.setVapidDetails("mailto:hello@roommates.app", VAPID_PUBLIC, VAPID_PRIVATE);

/* ---------- the rotation engine (mirror of src/lib/engine.ts) ---------- */

const mod = (a: number, n: number) => ((a % n) + n) % n;
const dayNum = (d: string) => Math.floor(Date.parse(d + "T00:00:00Z") / 86400000);

function assignee(state: any, chore: any, date: string, offset: number) {
  const seq: string[] = chore.order.filter((id: string) =>
    state.roommates.some((r: any) => r.id === id),
  );
  if (!seq.length) return null;
  const period =
    chore.frequency === "weekly"
      ? Math.floor((dayNum(date) - dayNum(state.anchor)) / 7)
      : dayNum(date) - dayNum(state.anchor);
  const idx = mod(period + offset, seq.length);
  const override = state.overrides?.[`${chore.id}|${date}`];
  if (override) return state.roommates.find((r: any) => r.id === override);

  let pick = seq[idx];
  const statusOf = (id: string) =>
    state.roommates.find((r: any) => r.id === id)?.status ?? "active";
  if (statusOf(pick) !== "active") {
    for (let i = 1; i <= seq.length; i++) {
      const c = seq[mod(idx + i, seq.length)];
      if (statusOf(c) === "active") { pick = c; break; }
    }
  }
  return state.roommates.find((r: any) => r.id === pick);
}

const isHoliday = (state: any, date: string) =>
  state.holidays?.includes(date) ||
  (state.autoSundayHoliday && new Date(date + "T00:00:00Z").getUTCDay() === 0);

function sessions(state: any, chore: any, date: string) {
  if (chore.cooking && isHoliday(state, date)) {
    return (state.holidayMeals ?? []).map((m: any, i: number) => ({
      key: `${chore.id}#m${i}`, name: m.name, time: m.time, offset: i,
    }));
  }
  return [{ key: chore.id, name: chore.name, time: chore.time, offset: 0 }];
}

function parseTimes(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/(\d{1,2}):(\d{2})\s*(AM|PM)/gi)) {
    let h = Number(m[1]) % 12;
    if (m[3].toUpperCase() === "PM") h += 12;
    out.push(h * 60 + Number(m[2]));
  }
  return out.length ? out : [540];
}

/* ---------- build the list of alerts that are due right now ---------- */

function dueAlerts(state: any, date: string, nowMins: number) {
  const rules = state.rules ?? { remindBefore: 30, escalateAfter: 90 };
  const out: any[] = [];

  for (const chore of state.chores ?? []) {
    for (const s of sessions(state, chore, date)) {
      const who = assignee(state, chore, date, s.offset);
      if (!who) continue;
      for (const t of parseTimes(s.time)) {
        const remindAt = t - rules.remindBefore;
        if (remindAt <= nowMins && nowMins - remindAt < 10) {
          out.push({
            key: `rem|${s.key}|${date}|${t}`,
            title: `${chore.icon} ${s.name} — your turn`,
            body: `${who.name}, ${s.name} starts soon.`,
            who,
          });
        }
        const lateAt = t + rules.escalateAfter;
        const done = state.completed?.[`${s.key}|${date}`];
        if (!done && lateAt <= nowMins && nowMins - lateAt < 10) {
          out.push({
            key: `late|${s.key}|${date}|${t}`,
            title: `⏰ Overdue: ${s.name}`,
            body: `${who.name}, ${s.name} still isn't marked complete.`,
            who,
          });
        }
      }
    }
  }
  return out;
}

/* ---------- delivery ---------- */

async function sendWhatsApp(to: string, text: string) {
  if (!TWILIO_SID || !TWILIO_TOKEN) return;
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      From: TWILIO_FROM!,
      To: `whatsapp:${to}`,
      Body: text,
    }),
  });
}

async function sendEmail(to: string, subject: string, text: string) {
  if (!RESEND_KEY) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: "Room Mates <duty@roommates.app>", to, subject, text }),
  });
}

/* ---------- main ---------- */

Deno.serve(async () => {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const nowMins = now.getUTCHours() * 60 + now.getUTCMinutes(); // adjust for TZ
  let sentCount = 0;

  const { data: flats } = await supabase.from("flats").select("id, state");

  for (const flat of flats ?? []) {
    const state = flat.state as any;
    if (!state?.chores?.length) continue;

    for (const alert of dueAlerts(state, date, nowMins)) {
      // dedupe guard — insert fails silently if we already sent this one
      const { error } = await supabase
        .from("sent_alerts")
        .insert({ flat_id: flat.id, alert_key: alert.key });
      if (error) continue; // duplicate key = already sent

      const { data: member } = await supabase
        .from("flat_members")
        .select("push_token, phone, email, channels")
        .eq("flat_id", flat.id)
        .eq("display_name", alert.who.name)
        .maybeSingle();

      const ch = member?.channels ?? { push: true, whatsapp: false, email: false };
      const text = `${alert.title}\n${alert.body}`;

      if (ch.push && member?.push_token) {
        await webpush
          .sendNotification(
            member.push_token,
            JSON.stringify({ title: alert.title, body: alert.body }),
          )
          .catch(() => {});
      }
      if (ch.whatsapp && member?.phone) await sendWhatsApp(member.phone, text);
      if (ch.email && member?.email) await sendEmail(member.email, alert.title, alert.body);

      sentCount++;
    }
  }

  return new Response(JSON.stringify({ ok: true, date, sent: sentCount }), {
    headers: { "Content-Type": "application/json" },
  });
});
