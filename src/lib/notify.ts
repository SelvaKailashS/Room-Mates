import { useEffect, useRef } from "react";
import type { AppState, Channels, Notice, Roommate, Rules } from "./types";
import { daySessions, getAssignment, isHoliday, pad, toKey } from "./engine";

export const DEFAULT_RULES: Rules = {
  remindBefore: 30,
  dailyDigest: true,
  digestTime: "08:00",
  escalateAfter: 90,
  holidayBlast: true,
  reassignAlert: true,
};

export const DEFAULT_CHANNELS: Channels = {
  push: true,
  whatsapp: true,
  email: false,
};

export const accessOf = (r: Roommate) => ({
  role: r.role ?? "member",
  email: r.email ?? `${r.name.split(" ")[0].toLowerCase()}@flat402.in`,
  channels: r.channels ?? DEFAULT_CHANNELS,
  joined: r.joined ?? true,
});

export const makeJoinCode = () =>
  `FLAT-${Math.random().toString(36).slice(2, 6).toUpperCase()}-402`;

/* ---------------- browser push ---------------- */

export function pushSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function pushPermission(): NotificationPermission {
  return pushSupported() ? Notification.permission : "denied";
}

export async function askPush() {
  if (!pushSupported()) return "denied" as NotificationPermission;
  try {
    const result = await Notification.requestPermission();
    if (result === "granted") await registerSW();
    return result;
  } catch {
    return "denied" as NotificationPermission;
  }
}

/**
 * Registers the service worker that shows notifications while the app is
 * closed. Returns the PushSubscription you would store on the member row
 * (flat_members.push_token) so the cron job can reach this device.
 */
export async function registerSW(vapidPublicKey?: string) {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    if (!vapidPublicKey || !("pushManager" in reg)) return reg;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
    return sub;
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function fireNative(title: string, body: string) {
  if (pushSupported() && Notification.permission === "granted") {
    try {
      new Notification(title, { body, icon: "/favicon.ico", tag: title });
    } catch {
      /* ignore */
    }
  }
}

/* ---------------- time helpers ---------------- */

/** Pull every "HH:MM AM/PM" out of a chore time string -> minutes of day. */
export function parseTimes(text: string): number[] {
  const out: number[] = [];
  const re = /(\d{1,2}):(\d{2})\s*(AM|PM)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    let h = Number(m[1]) % 12;
    if (m[3].toUpperCase() === "PM") h += 12;
    out.push(h * 60 + Number(m[2]));
  }
  return out.length ? out : [9 * 60];
}

export const minsNow = (d = new Date()) => d.getHours() * 60 + d.getMinutes();

export const fmtMins = (m: number) => {
  const mm = ((m % 1440) + 1440) % 1440;
  const h24 = Math.floor(mm / 60);
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${pad(h)}:${pad(mm % 60)} ${h24 < 12 ? "AM" : "PM"}`;
};

/* ---------------- planned alert timeline ---------------- */

export interface PlannedAlert {
  key: string;
  at: number; // minutes of day
  kind: Notice["kind"];
  title: string;
  body: string;
  target: string;
}

/** Everything the automation will send for a given date. */
export function planAlerts(state: AppState, date: string): PlannedAlert[] {
  const rules = state.rules ?? DEFAULT_RULES;
  const out: PlannedAlert[] = [];

  if (rules.dailyDigest) {
    const [h, m] = rules.digestTime.split(":").map(Number);
    const n = daySessions(state, date).length;
    out.push({
      key: `digest|${date}`,
      at: h * 60 + m,
      kind: "digest",
      title: "🌅 Daily Duty Digest",
      body: `${n} duties scheduled today. Open Room Mates to see your turn.`,
      target: "",
    });
  }

  if (rules.holidayBlast && isHoliday(state, date)) {
    out.push({
      key: `holiday|${date}`,
      at: 7 * 60,
      kind: "holiday",
      title: "🎉 Holiday Kitchen Plan",
      body: `Holiday today — cooking is split into ${
        state.holidayMeals?.length ?? 3
      } sessions. Check who cooks what.`,
      target: "",
    });
  }

  for (const s of daySessions(state, date)) {
    const a = getAssignment(state, s, date);
    const rm = state.roommates.find((r) => r.id === a.roommateId);
    if (!rm) continue;
    for (const t of parseTimes(s.time)) {
      out.push({
        key: `rem|${s.key}|${date}|${t}`,
        at: t - rules.remindBefore,
        kind: "reminder",
        title: `${s.icon} ${s.name} — your turn`,
        body: `${rm.name}, ${s.name} starts at ${fmtMins(t)} (in ${
          rules.remindBefore
        } min).`,
        target: rm.id,
      });
      out.push({
        key: `late|${s.key}|${date}|${t}`,
        at: t + rules.escalateAfter,
        kind: "overdue",
        title: `⏰ Overdue: ${s.name}`,
        body: `${s.name} was due at ${fmtMins(t)} and isn't marked complete. Nudging ${rm.name}.`,
        target: rm.id,
      });
    }
  }

  return out.sort((a, b) => a.at - b.at);
}

/* ---------------- the automation loop ---------------- */

/**
 * Client-side scheduler. Ticks every 20s, fires any alert whose time has
 * arrived (once per key, per day) and pushes it into the in-app inbox.
 * In production this same `planAlerts` output is what a cron job would send.
 */
export function useReminderEngine(
  state: AppState,
  emit: (n: Omit<Notice, "id" | "read">) => void,
  enabled: boolean,
) {
  const sent = useRef<Set<string>>(new Set());
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      const s = stateRef.current;
      const date = toKey(new Date());
      const now = minsNow();
      for (const p of planAlerts(s, date)) {
        if (p.at > now || now - p.at > 120) continue; // only fire fresh ones
        if (sent.current.has(p.key)) continue;
        // skip overdue nudges for duties already completed
        if (p.kind === "overdue") {
          const sk = p.key.split("|")[1];
          if (s.completed[`${sk}|${date}`]) continue;
        }
        sent.current.add(p.key);
        emit({ kind: p.kind, title: p.title, body: p.body, target: p.target, at: new Date().toISOString() });
        const me = s.currentUserId;
        const rm = s.roommates.find((r) => r.id === me);
        const wantsPush = rm ? accessOf(rm).channels.push : true;
        if (wantsPush && (!p.target || p.target === me)) fireNative(p.title, p.body);
      }
    };
    tick();
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, [enabled, emit]);
}
