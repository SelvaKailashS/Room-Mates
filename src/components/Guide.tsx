import { useState } from "react";
import {
  ArrowRight,
  BellRing,
  Check,
  ChevronDown,
  CircleDot,
  Cloud,
  Coffee,
  Globe,
  HeartPulse,
  Home,
  PartyPopper,
  Rocket,
  Server,
  Share2,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react";
import { useStore } from "../lib/store";
import { BRAND } from "../lib/brand";
import { firstName } from "../lib/engine";
import { askPush, pushPermission } from "../lib/notify";
import { Btn, Card, SectionHead } from "./ui";
import { cn } from "../utils/cn";

export default function Guide({ onGo }: { onGo: (tab: string) => void }) {
  const { state, me, isAdmin } = useStore();
  const perm = pushPermission();

  const steps = [
    {
      icon: <Users size={16} />,
      title: "Add everyone who lives here",
      plain:
        "Put in each person's name and phone number. That's all the app needs to start sharing out the work.",
      done: state.roommates.length >= 2,
      doneText: `${state.roommates.length} people added`,
      cta: "Open Roommates",
      tab: "mates",
    },
    {
      icon: <Home size={16} />,
      title: "Check the list of jobs",
      plain:
        "Cooking, dishes, cleaning and grocery are already set up. Add anything else your home needs, like bathroom cleaning.",
      done: state.chores.length >= 1,
      doneText: `${state.chores.length} chores ready`,
      cta: "Open Chore Setup",
      tab: "chores",
    },
    {
      icon: <Share2 size={16} />,
      title: "Send everyone the join code",
      plain:
        "One tap sends a WhatsApp invite. When they open the link they see the exact same duty list as you — always in sync.",
      done: state.roommates.filter((r) => r.joined !== false).length >= 2,
      doneText: "Invites ready to send",
      cta: "Get Invite Link",
      tab: "access",
    },
    {
      icon: <BellRing size={16} />,
      title: "Switch on reminders",
      plain:
        "The app will tap each person on the shoulder before their turn, so nobody can say “I forgot”.",
      done: perm === "granted",
      doneText: "Reminders are on",
      cta: "Turn On Alerts",
      tab: "access",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="cm-in space-y-5">
      <button
        onClick={() => onGo("today")}
        className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
      >
        <ArrowRight size={13} className="rotate-180" /> Back to Today&apos;s
        Roster
      </button>

      {/* hero */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-500/10 via-transparent to-sky-500/10 p-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-accent uppercase">
            <Sparkles size={11} /> {isAdmin ? "Admin guide" : "Your guide"}
          </span>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight">
            {BRAND.name}
            <span className="mt-1 block text-lg font-bold text-muted">
              Whose Turn Is It?
            </span>
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {me ? `Hi ${firstName(me.name)} 👋 ` : ""}
            {BRAND.pitch}
          </p>

          <div className="mt-4 grid max-w-3xl gap-2.5 sm:grid-cols-2">
            <div className="rounded-lg border border-red-500/25 bg-red-500/5 p-3">
              <p className="text-[10px] font-bold tracking-wider text-red-400 uppercase">
                The problem
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                {BRAND.problem}
              </p>
            </div>
            <div className="rounded-lg border border-accent/25 bg-accent/5 p-3">
              <p className="text-[10px] font-bold tracking-wider text-accent uppercase">
                The solution
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                {BRAND.solution}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { icon: <CircleDot size={12} />, t: "No arguments — turns rotate automatically" },
              { icon: <HeartPulse size={12} />, t: "Sick? Your turn passes to the next person" },
              { icon: <PartyPopper size={12} />, t: "Holidays get 3 cooking turns, shared out" },
            ].map((b) => (
              <span
                key={b.t}
                className="flex items-center gap-1.5 rounded-lg border border-line bg-panel2 px-2.5 py-1.5 text-[11px] font-semibold"
              >
                {b.icon} {b.t}
              </span>
            ))}
          </div>
        </div>
      </Card>

      {/* setup checklist — admins only, members don't set anything up */}
      {isAdmin && (
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">Set it up in 4 easy steps</h3>
            <p className="mt-1 text-xs text-muted">
              Takes about five minutes. You only do this once.
            </p>
          </div>
          <span className="rounded-lg border border-line bg-panel2 px-3 py-1.5 text-xs font-bold">
            {doneCount} of 4 done
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className={cn(
                "rounded-xl border p-4 transition-colors",
                s.done
                  ? "border-accent/40 bg-accent/5"
                  : "border-line bg-panel2",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm font-bold",
                    s.done
                      ? "border-accent/40 bg-accent/15 text-accent"
                      : "border-line bg-panel text-muted",
                  )}
                >
                  {s.done ? <Check size={15} /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-bold">
                    {s.icon} {s.title}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">
                    {s.plain}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <Btn
                      variant={s.done ? "ghost" : "soft"}
                      onClick={() => onGo(s.tab)}
                    >
                      {s.cta} <ArrowRight size={13} />
                    </Btn>
                    {s.done && (
                      <span className="text-[11px] font-semibold text-accent">
                        {s.doneText}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
      )}

      {/* daily use */}
      <Card className="p-5">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <Coffee size={17} className="text-muted" /> Using it every day takes 30
          seconds
        </h3>
        <p className="mt-1 text-xs text-muted">
          This is all a roommate ever needs to know.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              n: "1",
              t: "Open the app",
              d: "The first screen, Today's Roster, shows every job for today and whose name is on it.",
            },
            {
              n: "2",
              t: "Find your name",
              d: "Your photo circle sits next to the job you're responsible for. No name means nothing to do today.",
            },
            {
              n: "3",
              t: "Tap “Mark Task Completed”",
              d: "That's it. The bar at the top fills up and your work is added to your score.",
            },
            {
              n: "4",
              t: "Feeling unwell? Tap “Sick?”",
              d: "Your turn instantly moves to the next person, and you keep your place in the queue for next time.",
            },
          ].map((c) => (
            <div
              key={c.n}
              className="rounded-xl border border-line bg-panel2 p-4"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-xs font-extrabold text-accent">
                {c.n}
              </span>
              <p className="mt-2.5 text-sm font-bold">{c.t}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                {c.d}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* how turns are decided */}
      <Card className="p-5">
        <h3 className="text-lg font-bold">
          How does it decide whose turn it is?
        </h3>
        <p className="mt-1 text-xs text-muted">
          It works like passing a plate around the table — simple and completely
          predictable.
        </p>
        {state.roommates.length === 0 && (
          <p className="mt-4 rounded-lg border border-dashed border-line bg-panel2/40 px-4 py-6 text-center text-xs text-muted">
            Add your housemates and this will show your actual rotation order.
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {state.roommates.slice(0, 5).map((r, i) => (
            <span key={r.id} className="flex items-center gap-2">
              {i > 0 && <ArrowRight size={13} className="text-muted" />}
              <span className="flex items-center gap-2 rounded-lg border border-line bg-panel2 px-2.5 py-1.5">
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white",
                    r.color,
                  )}
                >
                  {r.name[0]}
                </span>
                <span className="text-xs font-semibold">
                  {firstName(r.name)}
                </span>
                <span className="font-mono text-[10px] text-muted">
                  Day {i + 1}
                </span>
              </span>
            </span>
          ))}
          {state.roommates.length > 0 && (
            <span className="flex items-center gap-2 text-xs text-muted">
              <ArrowRight size={13} /> back to the start
            </span>
          )}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            {
              t: "Everyone gets equal turns",
              d: "Each chore has its own order, so the same person isn't stuck cooking every time.",
            },
            {
              t: "Sick or away is handled",
              d: "The app skips that person for the day and gives the job to the next available roommate.",
            },
            {
              t: "Holidays need more cooking",
              d: "On a holiday, cooking becomes breakfast, lunch and dinner — given to three different people.",
            },
          ].map((x) => (
            <div key={x.t} className="rounded-lg border border-line bg-panel2 p-3">
              <p className="text-xs font-bold">{x.t}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                {x.d}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {isAdmin ? (
        <Automation onGo={onGo} />
      ) : (
        <Card className="p-5">
          <h3 className="flex items-center gap-2 text-lg font-bold">
            <BellRing size={17} className="text-muted" /> Never miss your turn
          </h3>
          <p className="mt-1 text-xs text-muted">
            One tap and {BRAND.name} will remind you before every duty.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-line bg-panel2 p-4">
              <p className="text-sm font-bold">📱 Put it on your home screen</p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                Android Chrome: ⋮ menu → “Add to Home screen”. iPhone Safari:
                Share → “Add to Home Screen”. It then opens like a normal app.
              </p>
            </div>
            <div
              className={cn(
                "rounded-xl border p-4",
                perm === "granted"
                  ? "border-accent/40 bg-accent/5"
                  : "border-line bg-panel2",
              )}
            >
              <p className="text-sm font-bold">
                {perm === "granted" ? "✅ Reminders are on" : "🔔 Turn on reminders"}
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                {perm === "granted"
                  ? "You'll get a nudge before each of your turns, and a follow-up if something is left undone."
                  : "Tap the button below and choose Allow. You'll be reminded before your turn starts."}
              </p>
              {perm !== "granted" && (
                <Btn
                  variant="solid"
                  className="mt-3"
                  onClick={() => askPush()}
                >
                  <BellRing size={13} /> Enable reminders
                </Btn>
              )}
            </div>
          </div>
          <p className="mt-3 rounded-lg border border-line bg-panel2 p-3 text-[11px] leading-relaxed text-muted">
            Something wrong with the roster, or need a chore changed? Ask your
            home admin
            {(() => {
              const admins = state.roommates.filter((r) => r.role === "admin");
              return admins.length
                ? ` — ${admins.map((a) => firstName(a.name)).join(" or ")}`
                : "";
            })()}
            . They can add people, edit chores and mark holidays.
          </p>
        </Card>
      )}
      <Faq isAdmin={isAdmin} />
    </div>
  );
}

/* ---------------- automation explained in plain words ---------------- */

function Automation({ onGo }: { onGo: (tab: string) => void }) {
  const [level, setLevel] = useState(1);

  const levels = [
    {
      id: 1,
      badge: "Easiest",
      time: "0 minutes",
      cost: "Free",
      icon: <Smartphone size={16} />,
      title: "Use it on your phone right now",
      who: "Best if you just want it working today.",
      what: [
        "Turns rotate by themselves every single day — you never set them again.",
        "Reminders pop up on your phone while the app is open in a tab.",
        "Everything is saved on your device automatically.",
      ],
      how: [
        "Open this website in Chrome on your phone.",
        "Tap the ⋮ menu → “Add to Home screen”. It now looks and opens like a normal app.",
        "Go to Access & Alerts and tap “Enable Browser Push” once, then “Allow”.",
        "Done. Reminders will start arriving before each duty.",
      ],
      limit:
        "Small catch: each phone keeps its own copy, and reminders only fire while the app is open somewhere.",
    },
    {
      id: 2,
      badge: "Recommended",
      time: "About 10 minutes",
      cost: "Free",
      icon: <Globe size={16} />,
      title: "Put it online so everyone can open it",
      who: "Best if you want one shared link for the whole house.",
      what: [
        "One web address everybody can open — no installing anything.",
        "You send the link once in the group chat and that's it.",
        "Updates you publish reach everyone instantly.",
      ],
      how: [
        "Create a free account at vercel.com (or netlify.com).",
        "Click “Add New Project” and drag in this project folder — or connect the GitHub repo.",
        "Leave the settings as they are and press Deploy. Wait about a minute.",
        "You get a link like room-mates.vercel.app. Paste it in your house group chat.",
        "Everyone opens it and adds it to their home screen.",
      ],
      limit:
        "Still no shared login yet — for that, take the next step whenever you're ready.",
    },
    {
      id: 3,
      badge: "Full automation",
      time: "About an hour",
      cost: "Free tier is enough",
      icon: <Server size={16} />,
      title: "Real accounts + reminders even when the app is closed",
      who: "Best if you want it to run properly, like a real product.",
      what: [
        "Each roommate logs in with their own email — one shared, live duty list.",
        "When someone ticks a job, everyone else's screen updates within a second.",
        "A robot on the internet sends the reminders on time, even at 6 AM with every phone locked.",
        "WhatsApp messages and emails, not just phone pop-ups.",
      ],
      how: [
        "Make a free project at supabase.com — this stores the shared data and handles logins.",
        "Copy the ready-made database setup from Access & Alerts → “How to automate this for real” → Step 1.",
        "Paste it into Supabase's SQL editor and run it. Your tables and permissions are created.",
        "Add the notification job from Step 4 — it checks every 5 minutes and sends what's due.",
        "For WhatsApp, connect a free Twilio sandbox number; for email, use Resend.",
        "Deploy again. Now the reminders run on their own, forever.",
      ],
      limit:
        "Every code snippet you need is already written for you in the Access & Alerts tab — you only copy and paste.",
    },
  ];

  const l = levels.find((x) => x.id === level)!;

  return (
    <Card className="p-5">
      <SectionHead
        icon={<Rocket size={18} className="text-accent" />}
        title="How to automate this — pick your level"
        sub="You don't need to be technical. Start at Level 1 today and move up whenever you feel like it."
      />

      <div className="mt-4 grid gap-2.5 md:grid-cols-3">
        {levels.map((x) => (
          <button
            key={x.id}
            onClick={() => setLevel(x.id)}
            className={cn(
              "rounded-xl border p-4 text-left transition-colors",
              level === x.id
                ? "border-accent/50 bg-accent/5"
                : "border-line bg-panel2 hover:border-accent/30",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold">
                {x.icon} Level {x.id}
              </span>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                  x.id === 2
                    ? "bg-accent/15 text-accent"
                    : "bg-panel text-muted",
                )}
              >
                {x.badge}
              </span>
            </div>
            <p className="mt-2 text-sm leading-snug font-bold">{x.title}</p>
            <p className="mt-1.5 font-mono text-[10px] text-muted">
              ⏱ {x.time} · 💸 {x.cost}
            </p>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-panel2 p-4">
          <p className="text-xs font-bold tracking-wider text-muted uppercase">
            What you get
          </p>
          <p className="mt-2 text-xs text-muted italic">{l.who}</p>
          <ul className="mt-3 space-y-2">
            {l.what.map((w) => (
              <li key={w} className="flex items-start gap-2 text-xs leading-relaxed">
                <Check size={14} className="mt-0.5 shrink-0 text-accent" />
                {w}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-line bg-panel2 p-4">
          <p className="text-xs font-bold tracking-wider text-muted uppercase">
            What to do
          </p>
          <ol className="mt-3 space-y-2.5">
            {l.how.map((h, i) => (
              <li key={h} className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-panel text-[10px] font-bold text-muted">
                  {i + 1}
                </span>
                <span className="text-xs leading-relaxed">{h}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/25 bg-amber-500/5 p-3">
        <p className="flex items-start gap-2 text-[11px] text-amber-300/90">
          <Cloud size={13} className="mt-0.5 shrink-0" /> {l.limit}
        </p>
        <Btn variant="soft" onClick={() => onGo("access")}>
          Open Access & Alerts <ArrowRight size={13} />
        </Btn>
      </div>
    </Card>
  );
}

/* ---------------- FAQ ---------------- */

function Faq({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState<number | null>(0);
  const all = [
    {
      q: "Do I need to create an account?",
      a: "Not for the basic version — just open the link and use it. Accounts only come in at Level 3, where each person logs in with their email so everybody shares one live list.",
    },
    {
      q: "What if someone forgets to tick their job?",
      a: "The app waits a while after the scheduled time, then sends an “overdue” nudge to that person. You can change how long it waits in Access & Alerts → Automation rules.",
    },
    {
      q: "Can I swap turns with a friend?",
      a: "Yes. On Today's Roster, tap “Swap” on any job and pick the person taking over. It's recorded in the history so it stays transparent.",
    },
    {
      q: "How do I add a holiday like Diwali?",
      a: "Go to the Holiday Mode tab and click that date on the calendar. Cooking for that day automatically becomes breakfast, lunch and dinner, shared between three different people.",
      adminOnly: true,
    },
    {
      q: "Is anyone able to delete roommates?",
      a: "No. Only Admins can add or remove people and change roles. Members can complete duties, swap turns, mark themselves sick, and suggest chore changes — but those suggestions need an admin's approval before they take effect.",
    },
    {
      q: "Will my data disappear?",
      a: "On Level 1 and 2 it's saved in your browser, so clearing browser data would erase it. Level 3 stores everything safely online with a proper database and backups.",
      adminOnly: true,
    },
    {
      q: "How do I add a chore or change a time?",
      a: "Open Chore Setup and edit anything you like — the pencil icon on a chore, or “Suggest a Chore” at the top. Your change is sent to the admin as a request instead of being applied straight away, so you can't break the roster by accident. You'll get a notification when they approve or decline it.",
      memberOnly: true,
    },
  ];
  const qs = all.filter((x) =>
    isAdmin ? !x.memberOnly : !x.adminOnly,
  );

  return (
    <Card className="p-5">
      <h3 className="text-lg font-bold">Common questions</h3>
      <div className="mt-3 divide-y divide-line">
        {qs.map((x, i) => (
          <div key={x.q}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-3 py-3 text-left"
            >
              <span className="text-sm font-semibold">{x.q}</span>
              <ChevronDown
                size={15}
                className={cn(
                  "shrink-0 text-muted transition-transform",
                  open === i && "rotate-180",
                )}
              />
            </button>
            {open === i && (
              <p className="pb-3 text-xs leading-relaxed text-muted">{x.a}</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
