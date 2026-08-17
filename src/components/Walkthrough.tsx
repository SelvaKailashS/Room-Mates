import { useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  CircleAlert,
  Cloud,
  Copy,
  Eye,
  Globe,
  Play,
  Radio,
  RotateCcw,
} from "lucide-react";
import { Btn, Card } from "./ui";
import { cn } from "../utils/cn";

interface Step {
  n: number;
  title: string;
  why: string;
  action: string;
  cmd?: string;
  expect: string;
  gotcha?: string;
}

interface Phase {
  id: string;
  label: string;
  time: string;
  icon: React.ReactNode;
  tone: string;
  goal: string;
  steps: Step[];
}

const PHASES: Phase[] = [
  {
    id: "run",
    label: "Phase 1 · Get it running",
    time: "5 minutes",
    icon: <Play size={15} />,
    tone: "text-sky-400 border-sky-500/40 bg-sky-500/10",
    goal: "The app works on your machine, with your real housemates in it. No accounts, no keys, nothing to sign up for.",
    steps: [
      {
        n: 1,
        title: "Install the dependencies",
        why: "Downloads React, Vite and the icon library the project needs.",
        action: "Open a terminal in the project folder and run:",
        cmd: "npm install",
        expect:
          "A node_modules folder appears and the terminal ends with 'added N packages'.",
        gotcha:
          "If npm isn't found, install Node.js 18+ from nodejs.org first.",
      },
      {
        n: 2,
        title: "Start the app",
        why: "Runs a local dev server that reloads whenever you change a file.",
        action: "In the same terminal:",
        cmd: "npm run dev",
        expect:
          "A link like http://localhost:5173 appears. Open it and you'll see the Welcome popup, then the Start Here guide.",
      },
      {
        n: 3,
        title: "Add the people you live with",
        why: "The rotation engine needs to know who's in the pool before it can share out turns.",
        action:
          "Go to the Roommates tab → 'Add Roommate' → type each person's name and phone.",
        expect:
          "Each new person is appended to the end of every chore's round-robin order automatically.",
      },
      {
        n: 4,
        title: "Try a full day",
        why: "Proves the engine, the logging and the fairness maths all work together.",
        action:
          "Today's Roster → tap 'Mark Task Completed' on one chore, then tap 'Sick?' on another.",
        expect:
          "The progress bar moves, the sick person's duty jumps to the next active housemate, and both events appear in Previous Work Data.",
      },
    ],
  },
  {
    id: "share",
    label: "Phase 2 · Put it online",
    time: "10 minutes",
    icon: <Globe size={15} />,
    tone: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
    goal: "One web link the whole house can open on their phones. Still free, still no database.",
    steps: [
      {
        n: 5,
        title: "Build the production version",
        why: "Compiles everything into a single optimised file that any host can serve.",
        action: "Stop the dev server (Ctrl+C) and run:",
        cmd: "npm run build",
        expect: "A dist/ folder appears containing index.html.",
      },
      {
        n: 6,
        title: "Deploy it",
        why: "Puts that folder on the internet with a real URL.",
        action:
          "Go to vercel.com/new (or app.netlify.com/drop) and drag the dist folder onto the page. No config needed.",
        expect:
          "After about a minute you get a link like room-mates.vercel.app.",
        gotcha:
          "Free tier is plenty — this app is one static file, it costs nothing to host.",
      },
      {
        n: 7,
        title: "Send the link to everyone",
        why: "This is the moment it stops being your app and becomes the house's app.",
        action:
          "Access & Alerts → copy the invite link → paste it in your house group chat.",
        expect:
          "Everyone can open it. Note: at this stage each phone still keeps its own copy of the data.",
      },
      {
        n: 8,
        title: "Everyone installs it",
        why: "Makes it feel like a real app and lets notifications work properly.",
        action:
          "On Android Chrome: ⋮ menu → 'Add to Home screen'. On iPhone Safari: Share → 'Add to Home Screen'.",
        expect:
          "A Room Mates icon on the home screen that opens fullscreen with no browser bar.",
      },
    ],
  },
  {
    id: "db",
    label: "Phase 3 · Connect the database",
    time: "20 minutes",
    icon: <Cloud size={15} />,
    tone: "text-fuchsia-400 border-fuchsia-500/40 bg-fuchsia-500/10",
    goal: "One shared list everybody edits. Tick a chore on your phone, it changes on theirs.",
    steps: [
      {
        n: 9,
        title: "Create a free Supabase project",
        why: "This is your Postgres database plus the login system, in one place.",
        action:
          "supabase.com → New Project. Choose a region near you and save the database password somewhere safe.",
        expect: "The project finishes provisioning in about two minutes.",
      },
      {
        n: 10,
        title: "Create the tables",
        why: "Sets up flats, flat_members, duty_log and sent_alerts, plus the security rules that stop people reading other homes.",
        action:
          "SQL Editor → New query → paste the entire contents of supabase/schema.sql → Run.",
        cmd: "-- paste supabase/schema.sql, then press Run",
        expect:
          "'Success. No rows returned.' Check Table Editor — four new tables are listed.",
        gotcha:
          "The file is safe to run more than once, so re-run it if you're unsure.",
      },
      {
        n: 11,
        title: "Copy your two keys",
        why: "This is the entire switch. The app checks for these on boot and changes adapter.",
        action:
          "Project Settings → API. Copy the Project URL and the anon public key into a new .env file.",
        cmd: "cp .env.example .env\n# then paste:\n# VITE_SUPABASE_URL=https://xxxx.supabase.co\n# VITE_SUPABASE_ANON_KEY=eyJhbGci...",
        expect: "A .env file in the project root with both values filled in.",
        gotcha:
          "The anon key is safe in the browser — Row Level Security is what actually protects the data.",
      },
      {
        n: 12,
        title: "Restart and confirm",
        why: "Vite only reads .env when it boots, so a restart is required.",
        action: "Start the server again, then open the Database & Setup tab.",
        cmd: "npm run dev",
        expect:
          "The status card at the top of this tab turns green and reads 'Mode 2 · Shared Postgres database — Healthy'.",
        gotcha:
          "Still blue? The .env file is in the wrong folder or the server wasn't fully restarted.",
      },
    ],
  },
  {
    id: "auto",
    label: "Phase 4 · Turn on the automation",
    time: "25 minutes",
    icon: <Radio size={15} />,
    tone: "text-amber-400 border-amber-500/40 bg-amber-500/10",
    goal: "Reminders that arrive at 6 AM with every phone locked and the app closed.",
    steps: [
      {
        n: 13,
        title: "Generate the push keys",
        why: "VAPID keys are how a server proves it's allowed to send notifications to a browser.",
        action: "Run this once and keep both keys:",
        cmd: "npx web-push generate-vapid-keys",
        expect: "A public key and a private key printed in the terminal.",
      },
      {
        n: 14,
        title: "Store the server secrets",
        why: "These must never sit in the frontend — only the robot needs them.",
        action:
          "Supabase → Edge Functions → Secrets. Add VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and SUPABASE_SERVICE_ROLE_KEY. Add the Twilio and Resend keys too if you want WhatsApp and email.",
        expect: "The secrets are listed in the dashboard.",
        gotcha:
          "The service role key bypasses all security rules. Never put it in .env or commit it.",
      },
      {
        n: 15,
        title: "Deploy the reminder robot",
        why: "This is the function that recomputes whose turn it is and actually sends the messages.",
        action: "With the Supabase CLI installed:",
        cmd: "supabase functions deploy remind --no-verify-jwt",
        expect:
          "'Deployed Function remind'. You can now call its URL and get back {\"ok\":true}.",
      },
      {
        n: 16,
        title: "Schedule it",
        why: "Tells Postgres to wake the robot every five minutes, forever.",
        action:
          "Open supabase/cron.sql, replace YOUR-PROJECT-REF and YOUR-SERVICE-ROLE-KEY with your real values, then paste it into the SQL Editor and Run.",
        cmd: "-- paste supabase/cron.sql, then press Run",
        expect: "Two jobs created: room-mates-reminders and room-mates-cleanup.",
      },
      {
        n: 17,
        title: "Prove it's alive",
        why: "The final check — this is how you know the automation is genuinely running.",
        action: "Run these two queries in the SQL Editor:",
        cmd: "select jobname, schedule, active from cron.job;\n\nselect status, return_message, start_time\nfrom cron.job_run_details\norder by start_time desc limit 5;",
        expect:
          "Both jobs show active = true, and recent runs show status 'succeeded'. Reminders now send themselves.",
        gotcha:
          "Times look wrong? The server runs in UTC — store a timezone per home and offset nowMins in the function.",
      },
    ],
  },
];

const KEY = "roommates-walkthrough";

export default function Walkthrough() {
  const [done, setDone] = useState<Record<number, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? "{}");
    } catch {
      return {};
    }
  });
  const [open, setOpen] = useState<number | null>(1);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(done));
  }, [done]);

  const all = PHASES.flatMap((p) => p.steps);
  const doneCount = all.filter((s) => done[s.n]).length;
  const pct = Math.round((doneCount / all.length) * 100);
  const next = all.find((s) => !done[s.n]);

  const toggle = (n: number) => setDone((d) => ({ ...d, [n]: !d[n] }));

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold">
            The complete step-by-step process
          </h3>
          <p className="mt-1 max-w-2xl text-xs text-muted">
            17 steps across 4 phases, from an empty folder to reminders that
            send themselves. Each phase is genuinely useful on its own — you can
            stop after Phase 1 and still have a working app.
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl font-extrabold">{pct}%</p>
          <p className="text-[11px] text-muted">
            {doneCount} of {all.length} steps
          </p>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-panel2">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {next ? (
          <p className="text-xs text-muted">
            Next up:{" "}
            <button
              onClick={() => setOpen(next.n)}
              className="font-semibold text-accent hover:underline"
            >
              Step {next.n} · {next.title}
            </button>
          </p>
        ) : (
          <p className="text-xs font-semibold text-accent">
            🎉 All done — your home is fully automated.
          </p>
        )}
        <button
          onClick={() => setDone({})}
          className="flex items-center gap-1.5 text-[11px] text-muted hover:text-ink"
        >
          <RotateCcw size={11} /> Reset progress
        </button>
      </div>

      <div className="mt-5 space-y-5">
        {PHASES.map((phase) => {
          const pDone = phase.steps.filter((s) => done[s.n]).length;
          const complete = pDone === phase.steps.length;
          return (
            <div key={phase.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold",
                    phase.tone,
                  )}
                >
                  {phase.icon} {phase.label}
                  {complete && <Check size={13} />}
                </span>
                <span className="font-mono text-[10px] text-muted">
                  ⏱ {phase.time} · {pDone}/{phase.steps.length} done
                </span>
              </div>
              <p className="mt-2 mb-2.5 text-[11px] leading-relaxed text-muted italic">
                Goal: {phase.goal}
              </p>

              <div className="space-y-2">
                {phase.steps.map((s) => {
                  const isOpen = open === s.n;
                  const isDone = !!done[s.n];
                  return (
                    <div
                      key={s.n}
                      className={cn(
                        "rounded-xl border transition-colors",
                        isDone
                          ? "border-accent/40 bg-accent/5"
                          : "border-line bg-panel2",
                      )}
                    >
                      <div className="flex items-start gap-3 p-3">
                        <button
                          onClick={() => toggle(s.n)}
                          className={cn(
                            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold transition-colors",
                            isDone
                              ? "border-accent/50 bg-accent/20 text-accent"
                              : "border-line bg-panel text-muted hover:text-ink",
                          )}
                        >
                          {isDone ? <Check size={13} /> : s.n}
                        </button>

                        <button
                          onClick={() => setOpen(isOpen ? null : s.n)}
                          className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left"
                        >
                          <span className="min-w-0">
                            <span
                              className={cn(
                                "block text-sm font-bold",
                                isDone && "text-muted line-through",
                              )}
                            >
                              {s.title}
                            </span>
                            {!isOpen && (
                              <span className="mt-0.5 block truncate text-[11px] text-muted">
                                {s.why}
                              </span>
                            )}
                          </span>
                          <ChevronDown
                            size={15}
                            className={cn(
                              "mt-0.5 shrink-0 text-muted transition-transform",
                              isOpen && "rotate-180",
                            )}
                          />
                        </button>
                      </div>

                      {isOpen && (
                        <div className="space-y-2.5 border-t border-line px-3 pt-3 pb-3.5 pl-12">
                          <p className="text-[11px] leading-relaxed text-muted">
                            <span className="font-bold text-ink">Why: </span>
                            {s.why}
                          </p>
                          <p className="text-[11px] leading-relaxed">
                            <span className="font-bold">Do this: </span>
                            {s.action}
                          </p>

                          {s.cmd && (
                            <div className="flex items-start gap-2">
                              <pre className="flex-1 overflow-x-auto rounded-md border border-line bg-panel p-2.5 font-mono text-[11px] leading-relaxed text-ink/90">
                                {s.cmd}
                              </pre>
                              <button
                                onClick={() =>
                                  navigator.clipboard?.writeText(s.cmd!)
                                }
                                className="mt-0.5 shrink-0 rounded-md border border-line p-2 text-muted hover:text-ink"
                              >
                                <Copy size={13} />
                              </button>
                            </div>
                          )}

                          <p className="flex items-start gap-2 rounded-md border border-emerald-500/25 bg-emerald-500/5 p-2.5 text-[11px] leading-relaxed text-emerald-300/90">
                            <Eye size={13} className="mt-0.5 shrink-0" />
                            <span>
                              <span className="font-bold">
                                You should see:{" "}
                              </span>
                              {s.expect}
                            </span>
                          </p>

                          {s.gotcha && (
                            <p className="flex items-start gap-2 rounded-md border border-amber-500/25 bg-amber-500/5 p-2.5 text-[11px] leading-relaxed text-amber-300/90">
                              <CircleAlert size={13} className="mt-0.5 shrink-0" />
                              <span>
                                <span className="font-bold">Watch out: </span>
                                {s.gotcha}
                              </span>
                            </p>
                          )}

                          <div className="flex justify-end gap-2 pt-0.5">
                            <Btn
                              variant={isDone ? "ghost" : "solid"}
                              onClick={() => {
                                toggle(s.n);
                                if (!isDone) {
                                  const nx = all.find(
                                    (x) => x.n > s.n && !done[x.n],
                                  );
                                  setOpen(nx ? nx.n : null);
                                }
                              }}
                            >
                              {isDone ? "Mark not done" : "Done — next step"}
                            </Btn>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
