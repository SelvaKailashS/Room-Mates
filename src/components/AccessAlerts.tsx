import { useMemo, useState } from "react";
import {
  BellRing,
  Check,
  Copy,
  Crown,
  KeyRound,
  Link2,
  Mail,
  MessageCircle,
  RefreshCw,
  Send,
  Server,
  ShieldCheck,
  Smartphone,
  Timer,
  UserCheck,
} from "lucide-react";
import { useStore } from "../lib/store";
import { toKey } from "../lib/engine";
import {
  accessOf,
  askPush,
  fireNative,
  fmtMins,
  minsNow,
  planAlerts,
  pushPermission,
  pushSupported,
} from "../lib/notify";
import { Avatar, Btn, Card, SectionHead, inputCls } from "./ui";
import { cn } from "../utils/cn";
import type { Channels } from "../lib/types";

const kindStyle: Record<string, string> = {
  reminder: "text-sky-400 border-sky-500/30 bg-sky-500/10",
  overdue: "text-red-400 border-red-500/30 bg-red-500/10",
  digest: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  holiday: "text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/10",
  system: "text-muted border-line bg-panel2",
};

export default function AccessAlerts() {
  const {
    state,
    me,
    isAdmin,
    setRole,
    setChannel,
    updateMate,
    setRules,
    regenCode,
    emit,
    setFlatName,
  } = useStore();
  const rules = state.rules!;
  const [perm, setPerm] = useState(pushPermission());
  const [copied, setCopied] = useState("");

  const today = toKey(new Date());
  const plan = useMemo(() => planAlerts(state, today), [state, today]);
  const now = minsNow();
  const flat = state.flatName ?? "our home";
  // ?code= is what JoinFlow looks for — opening this link shows the join screen
  const inviteLink = `${location.origin}${location.pathname}?code=${state.joinCode}`;

  const copy = (text: string, tag: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(tag);
    setTimeout(() => setCopied(""), 1600);
  };

  const waInvite = (phone: string, name: string) =>
    `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(
      `Hey ${name.split(" ")[0]}! 👋\n\nYou're invited to join *${flat}* on Room Mates — the app that decides whose turn it is to cook, wash up and clean, so nobody has to keep track.\n\nTap the link, enter your name and phone, and you're in:\n${inviteLink}\n\n(Or open the app and enter code: ${state.joinCode})`,
    )}`;

  return (
    <div className="cm-in space-y-5">
      <SectionHead
        icon={<ShieldCheck size={18} className="text-accent" />}
        title="Access Control & Notification Automation"
        sub="Invite every roommate, set roles & channels, then let the scheduler send duty reminders automatically"
        right={
          <div className="flex items-center gap-2">
            <Btn
              variant={perm === "granted" ? "solid" : "soft"}
              onClick={async () => setPerm(await askPush())}
            >
              <BellRing size={14} />
              {perm === "granted" ? "Push Enabled" : "Enable Browser Push"}
            </Btn>
            <Btn
              onClick={() => {
                fireNative(
                  "🔔 Room Mates test alert",
                  "Reminders like this will fire automatically before each duty.",
                );
                emit({
                  kind: "system",
                  title: "🔔 Test alert sent",
                  body: "Delivered to enabled channels for this device.",
                  target: me?.id ?? "",
                  at: new Date().toISOString(),
                });
              }}
            >
              <Send size={14} /> Send Test
            </Btn>
          </div>
        }
      />

      {/* STEP 1 — invite */}
      <Card className="p-5">
        <h3 className="flex items-center gap-2 font-bold">
          <KeyRound size={15} className="text-muted" /> Step 1 · Give every
          roommate access
        </h3>
        <p className="mt-1 text-xs text-muted">
          Share the code or send a personal invite. Opening the link shows a
          welcome screen that asks for their <strong>full name</strong> and{" "}
          <strong>phone</strong> — once they submit, they&apos;re greeted by
          name, appended to the end of every chore&apos;s rotation, and see the
          same live roster as you.
        </p>
        <button
          onClick={() => window.open(inviteLink, "_blank")}
          className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent hover:underline"
        >
          Preview what your roommates will see →
        </button>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-line bg-panel2 p-3">
            <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">
              Home Name
            </p>
            <input
              value={state.flatName ?? ""}
              disabled={!isAdmin}
              onChange={(e) => setFlatName(e.target.value)}
              placeholder="e.g. Flat #402"
              className={inputCls + " mt-2 font-bold"}
            />
            <p className="mt-1.5 text-[10px] text-muted">
              Appears in the header and in every invite you send.
            </p>
          </div>
          <div className="rounded-lg border border-line bg-panel2 p-3">
            <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">
              Flat Join Code
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 rounded-md border border-line bg-panel px-3 py-2 font-mono text-sm font-bold tracking-widest text-accent">
                {state.joinCode}
              </code>
              <Btn onClick={() => copy(state.joinCode!, "code")}>
                {copied === "code" ? <Check size={14} /> : <Copy size={14} />}
              </Btn>
              {isAdmin && (
                <Btn onClick={regenCode}>
                  <RefreshCw size={14} />
                </Btn>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-line bg-panel2 p-3">
            <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">
              Invite Link
            </p>
            <div className="mt-2 flex items-center gap-2">
              <input readOnly value={inviteLink} className={inputCls + " font-mono text-xs"} />
              <Btn onClick={() => copy(inviteLink, "link")}>
                {copied === "link" ? <Check size={14} /> : <Link2 size={14} />}
              </Btn>
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] tracking-wide text-muted uppercase">
                <th className="py-2 font-semibold">Roommate</th>
                <th className="py-2 font-semibold">Email (login)</th>
                <th className="py-2 font-semibold">Role</th>
                <th className="py-2 font-semibold">Access</th>
                <th className="py-2 text-right font-semibold">Invite</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {state.roommates.map((r) => {
                const acc = accessOf(r);
                return (
                  <tr key={r.id}>
                    <td className="py-2.5">
                      <span className="flex items-center gap-2">
                        <Avatar rm={r} size="sm" />
                        <span className="font-semibold">{r.name}</span>
                        {r.id === me?.id && (
                          <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold text-accent uppercase">
                            You
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <input
                        value={acc.email}
                        onChange={(e) => updateMate(r.id, { email: e.target.value })}
                        className={inputCls + " w-52 py-1 font-mono text-[11px]"}
                      />
                    </td>
                    <td className="py-2.5">
                      <select
                        value={acc.role}
                        disabled={!isAdmin}
                        onChange={(e) =>
                          setRole(r.id, e.target.value as "admin" | "member")
                        }
                        className={inputCls + " w-28 py-1 text-xs"}
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                      </select>
                    </td>
                    <td className="py-2.5">
                      <button
                        onClick={() => updateMate(r.id, { joined: !acc.joined })}
                        className={cn(
                          "flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-bold uppercase",
                          acc.joined
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-400",
                        )}
                      >
                        {acc.joined ? <UserCheck size={11} /> : <Timer size={11} />}
                        {acc.joined ? "Joined" : "Invite pending"}
                      </button>
                    </td>
                    <td className="py-2.5 text-right">
                      <span className="inline-flex gap-1.5">
                        <a
                          href={waInvite(r.phone, r.name)}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-line p-1.5 text-emerald-400 hover:bg-panel2"
                          title="Invite on WhatsApp"
                        >
                          <MessageCircle size={14} />
                        </a>
                        <a
                          href={`mailto:${acc.email}?subject=${encodeURIComponent(`You're invited to join ${flat}`)}&body=${encodeURIComponent(`Hi ${r.name.split(" ")[0]},\n\nYou're invited to join ${flat} on Room Mates — it works out whose turn it is to cook, wash up and clean, and reminds each person before their turn.\n\nOpen this link, enter your name and phone, and you're in:\n${inviteLink}\n\nOr enter this code in the app: ${state.joinCode}\n`)}`}
                          className="rounded-md border border-line p-1.5 text-sky-400 hover:bg-panel2"
                          title="Invite by email"
                        >
                          <Mail size={14} />
                        </a>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!isAdmin && (
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-400">
            <Crown size={11} /> You are signed in as a Member — only Admins can
            change roles or rotate the join code.
          </p>
        )}
      </Card>

      {/* STEP 2 — channels */}
      <Card className="p-5">
        <h3 className="flex items-center gap-2 font-bold">
          <Smartphone size={15} className="text-muted" /> Step 2 · Choose
          notification channels per roommate
        </h3>
        <p className="mt-1 text-xs text-muted">
          Browser push works right now on this device. WhatsApp & email are
          delivered by the backend job described below.
        </p>
        <div className="mt-4 grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {state.roommates.map((r) => {
            const ch = accessOf(r).channels;
            const items: { k: keyof Channels; label: string; icon: React.ReactNode }[] = [
              { k: "push", label: "Push", icon: <BellRing size={12} /> },
              { k: "whatsapp", label: "WhatsApp", icon: <MessageCircle size={12} /> },
              { k: "email", label: "Email", icon: <Mail size={12} /> },
            ];
            return (
              <div key={r.id} className="rounded-lg border border-line bg-panel2 p-3">
                <div className="flex items-center gap-2">
                  <Avatar rm={r} size="sm" />
                  <span className="text-sm font-semibold">{r.name}</span>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {items.map((it) => (
                    <button
                      key={it.k}
                      onClick={() => setChannel(r.id, it.k, !ch[it.k])}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors",
                        ch[it.k]
                          ? "border-accent/40 bg-accent/10 text-accent"
                          : "border-line text-muted hover:text-ink",
                      )}
                    >
                      {it.icon} {it.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* STEP 3 — rules */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="flex items-center gap-2 font-bold">
            <Timer size={15} className="text-muted" /> Step 3 · Automation rules
          </h3>
          <p className="mt-1 text-xs text-muted">
            The scheduler evaluates these every 20 seconds and fires alerts on
            time — no manual reminding.
          </p>
          <div className="mt-4 space-y-3">
            <label className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel2 p-3">
              <span className="text-xs font-semibold">
                Remind assignee before duty
                <span className="mt-0.5 block text-[11px] font-normal text-muted">
                  Fires ahead of every chore & meal session
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={240}
                  value={rules.remindBefore}
                  onChange={(e) => setRules({ remindBefore: Number(e.target.value) })}
                  className={inputCls + " w-20 py-1 text-center font-mono text-xs"}
                />
                <span className="text-[11px] text-muted">min</span>
              </span>
            </label>

            <label className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel2 p-3">
              <span className="text-xs font-semibold">
                Overdue nudge
                <span className="mt-0.5 block text-[11px] font-normal text-muted">
                  If still not marked complete after…
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={5}
                  max={480}
                  value={rules.escalateAfter}
                  onChange={(e) => setRules({ escalateAfter: Number(e.target.value) })}
                  className={inputCls + " w-20 py-1 text-center font-mono text-xs"}
                />
                <span className="text-[11px] text-muted">min</span>
              </span>
            </label>

            <label className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel2 p-3">
              <span className="text-xs font-semibold">
                Daily duty digest to whole flat
              </span>
              <span className="flex items-center gap-2">
                <input
                  type="time"
                  value={rules.digestTime}
                  onChange={(e) => setRules({ digestTime: e.target.value })}
                  className={inputCls + " w-28 py-1 font-mono text-xs"}
                />
                <input
                  type="checkbox"
                  checked={rules.dailyDigest}
                  onChange={(e) => setRules({ dailyDigest: e.target.checked })}
                  className="h-4 w-4 accent-emerald-500"
                />
              </span>
            </label>

            {[
              { k: "holidayBlast" as const, label: "Holiday kitchen plan blast (3 cooking sessions)" },
              { k: "reassignAlert" as const, label: "Alert flat when sick bypass reassigns a duty" },
            ].map((row) => (
              <label
                key={row.k}
                className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel2 p-3"
              >
                <span className="text-xs font-semibold">{row.label}</span>
                <input
                  type="checkbox"
                  checked={rules[row.k]}
                  onChange={(e) => setRules({ [row.k]: e.target.checked })}
                  className="h-4 w-4 accent-emerald-500"
                />
              </label>
            ))}
          </div>
          {!pushSupported() && (
            <p className="mt-3 text-[11px] text-amber-400">
              This browser doesn&apos;t support the Notification API — in-app
              inbox still works.
            </p>
          )}
        </Card>

        {/* today's alert timeline */}
        <Card className="p-5">
          <h3 className="flex items-center gap-2 font-bold">
            <BellRing size={15} className="text-muted" /> Today&apos;s automated
            alert timeline
          </h3>
          <p className="mt-1 text-xs text-muted">
            {plan.length} alerts queued for {today} · green = already sent
          </p>
          <div className="mt-4 max-h-[430px] space-y-2 overflow-y-auto pr-1">
            {plan.map((p) => {
              const sent = p.at <= now;
              const rm = state.roommates.find((r) => r.id === p.target);
              return (
                <div
                  key={p.key}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border border-line bg-panel2 p-2.5",
                    sent && "opacity-60",
                  )}
                >
                  <span className="w-20 shrink-0 font-mono text-[11px] text-muted">
                    {fmtMins(p.at)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold">{p.title}</p>
                    <p className="truncate text-[11px] text-muted">{p.body}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {rm ? (
                      <Avatar rm={rm} size="xs" />
                    ) : (
                      <span className="rounded bg-panel px-1.5 py-0.5 text-[9px] font-bold text-muted uppercase">
                        Flat
                      </span>
                    )}
                    <span
                      className={cn(
                        "rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase",
                        kindStyle[p.kind],
                      )}
                    >
                      {p.kind}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* blueprint */}
      <Blueprint />
    </div>
  );
}

function Blueprint() {
  const [tab, setTab] = useState(0);
  const steps = [
    {
      title: "1 · Auth + shared flat data",
      tool: "Supabase (Postgres + Auth)",
      body: "Every roommate signs in with email magic-link or Google. A `flats` row holds the join code; `flat_members(flat_id, user_id, role)` grants access. Row Level Security makes sure a user only reads their own flat.",
      code: `-- one flat, many members
create table flats (
  id uuid primary key default gen_random_uuid(),
  name text, join_code text unique
);
create table flat_members (
  flat_id uuid references flats(id),
  user_id uuid references auth.users(id),
  role text default 'member',
  push_token text, phone text, email text,
  primary key (flat_id, user_id)
);

-- RLS: only my flat's rows are visible
alter table chores enable row level security;
create policy "same flat" on chores for all using (
  flat_id in (select flat_id from flat_members
              where user_id = auth.uid())
);

-- joining with a code
create function join_flat(code text) returns uuid
language sql security definer as $$
  insert into flat_members(flat_id, user_id)
  select id, auth.uid() from flats where join_code = code
  returning flat_id;
$$;`,
    },
    {
      title: "2 · Realtime sync for everyone",
      tool: "Supabase Realtime",
      body: "When one roommate marks a chore complete, every other phone updates instantly — no refresh. Subscribe once on app load and merge changes into the same state this demo keeps in localStorage.",
      code: `supabase
  .channel('flat-402')
  .on('postgres_changes',
      { event: '*', schema: 'public', table: 'duty_log',
        filter: 'flat_id=eq.' + flatId },
      payload => applyChange(payload.new))
  .subscribe();

// completing a duty = one insert, everyone sees it
await supabase.from('duty_log').insert({
  flat_id: flatId, chore_id, date, user_id, action: 'completed'
});`,
    },
    {
      title: "3 · Push notifications",
      tool: "Web Push / FCM",
      body: "Register a service worker, ask permission (the Enable Push button above), store the subscription against the member row, then send from the server. Works when the app is closed; on Android it installs as a PWA.",
      code: `// client: save the subscription
const reg = await navigator.serviceWorker.register('/sw.js');
const sub = await reg.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: VAPID_PUBLIC_KEY
});
await supabase.from('flat_members')
  .update({ push_token: JSON.stringify(sub) })
  .eq('user_id', user.id);

// sw.js
self.addEventListener('push', e => {
  const d = e.data.json();
  e.waitUntil(self.registration.showNotification(d.title,
    { body: d.body, icon: '/icon.png' }));
});`,
    },
    {
      title: "4 · The automation job",
      tool: "pg_cron + Edge Function",
      body: "Run a function every 5 minutes. It recomputes the same rotation this app uses, finds duties starting within `remindBefore`, and fans out to push / WhatsApp / email. Idempotency: log every send so nobody gets a duplicate.",
      code: `-- run the reminder function every 5 minutes
select cron.schedule('duty-reminders', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://<proj>.functions.supabase.co/remind',
    headers := '{"Authorization":"Bearer <service-key>"}'::jsonb
  );
$$);

// supabase/functions/remind/index.ts
const due = planAlerts(state, today())        // same engine as the UI
  .filter(a => a.at <= nowMins() && !alreadySent(a.key));

for (const a of due) {
  if (ch.push)     await webpush.send(token, a);
  if (ch.whatsapp) await twilio.messages.create({
      from: 'whatsapp:+14155238886',
      to:   'whatsapp:' + member.phone,
      body: a.title + '\\n' + a.body });
  if (ch.email)    await resend.emails.send({ to: member.email, ... });
  await log(a.key);                            // dedupe guard
}`,
    },
  ];
  const s = steps[tab];

  return (
    <Card className="p-5">
      <h3 className="flex items-center gap-2 font-bold">
        <Server size={15} className="text-muted" /> How to automate this for real
        (production blueprint)
      </h3>
      <p className="mt-1 text-xs text-muted">
        This demo runs the scheduler in your browser. Move these four pieces to
        a backend and reminders keep firing even when the app is closed.
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {steps.map((st, i) => (
          <button
            key={st.title}
            onClick={() => setTab(i)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
              i === tab
                ? "border-line bg-panel2 text-ink"
                : "border-transparent text-muted hover:text-ink",
            )}
          >
            {st.title}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <span className="rounded-md border border-accent/30 bg-accent/10 px-2 py-1 text-[10px] font-bold tracking-wider text-accent uppercase">
            {s.tool}
          </span>
          <p className="mt-3 text-sm leading-relaxed text-muted">{s.body}</p>
          <Btn
            className="mt-3"
            variant="soft"
            onClick={() => navigator.clipboard?.writeText(s.code)}
          >
            <Copy size={13} /> Copy snippet
          </Btn>
        </div>
        <pre className="overflow-x-auto rounded-lg border border-line bg-panel2 p-3 font-mono text-[11px] leading-relaxed text-ink/90">
          {s.code}
        </pre>
      </div>
    </Card>
  );
}
