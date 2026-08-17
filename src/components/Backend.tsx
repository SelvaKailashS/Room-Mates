import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  Cloud,
  Copy,
  Database,
  Download,
  FileCode2,
  FileText,
  HardDrive,
  Loader2,
  LogOut,
  Radio,
  RefreshCw,
  RotateCcw,
  Terminal,
  Timer,
  Zap,
} from "lucide-react";
import { useStore } from "../lib/store";
import {
  FLAT_ID,
  SUPABASE_URL,
  db,
  hasSupabase,
  type ConnInfo,
} from "../lib/db";
import { Btn, Card, SectionHead } from "./ui";
import Walkthrough from "./Walkthrough";
import { cn } from "../utils/cn";
// single source of truth: the doc file itself, bundled at build time
import workingModelMd from "../../WORKING_MODEL.md?raw";

export default function Backend() {
  const [conn, setConn] = useState<ConnInfo | null>(null);
  const [busy, setBusy] = useState(false);

  const test = async () => {
    setBusy(true);
    setConn(await db.ping());
    setBusy(false);
  };

  const downloadDoc = () => {
    const blob = new Blob([workingModelMd], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "WORKING_MODEL.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    test();
  }, []);

  return (
    <div className="cm-in space-y-5">
      <SectionHead
        icon={<Database size={18} className="text-accent" />}
        title="Working Model · Database & Automation"
        sub="The app runs on a swappable data layer. It works offline today, and connects to a real shared database the moment you add two keys."
        right={
          <div className="flex items-center gap-2">
            <Btn variant="solid" onClick={downloadDoc}>
              <Download size={14} /> Download WORKING_MODEL.md
            </Btn>
            <Btn variant="soft" onClick={test} disabled={busy}>
              {busy ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              Test Connection
            </Btn>
          </div>
        }
      />

      {/* live status */}
      <Card
        className={cn(
          "p-5",
          conn?.ok
            ? hasSupabase
              ? "border-emerald-500/40 bg-emerald-500/5"
              : "border-sky-500/40 bg-sky-500/5"
            : "border-red-500/40 bg-red-500/5",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl border",
                hasSupabase
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-sky-500/40 bg-sky-500/10 text-sky-400",
              )}
            >
              {hasSupabase ? <Cloud size={20} /> : <HardDrive size={20} />}
            </span>
            <div>
              <p className="flex items-center gap-2 font-bold">
                {hasSupabase
                  ? "Mode 2 · Shared Postgres database"
                  : "Mode 1 · Local browser storage"}
                <span
                  className={cn(
                    "flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                    conn?.ok
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-red-500/15 text-red-400",
                  )}
                >
                  <Activity size={9} /> {conn?.ok ? "Healthy" : "Not connected"}
                </span>
              </p>
              <p className="mt-1 text-xs text-muted">
                {conn?.detail ?? "Checking…"}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 font-mono text-[10px] text-muted">
                <span>
                  adapter:{" "}
                  <span className="text-ink">{db.backend}Adapter</span>
                </span>
                <span>
                  home id: <span className="text-ink">{FLAT_ID.slice(0, 8)}…</span>
                </span>
                {conn?.latencyMs !== undefined && (
                  <span>
                    latency: <span className="text-ink">{conn.latencyMs}ms</span>
                  </span>
                )}
                {SUPABASE_URL && (
                  <span>
                    host:{" "}
                    <span className="text-ink">
                      {SUPABASE_URL.replace("https://", "")}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {!hasSupabase && (
            <div className="rounded-lg border border-line bg-panel2 p-3 text-[11px] text-muted">
              Add <code className="text-accent">VITE_SUPABASE_URL</code> and{" "}
              <code className="text-accent">VITE_SUPABASE_ANON_KEY</code> to a{" "}
              <code className="text-accent">.env</code> file, restart, and this
              panel flips to Mode 2 automatically.
            </div>
          )}
        </div>
      </Card>

      {/* Household Settings & Controls */}
      <HouseholdSettings />

      <DocViewer md={workingModelMd} onDownload={downloadDoc} />
      <Architecture />
      <Walkthrough />
      <Files />
    </div>
  );
}

function HouseholdSettings() {
  const { state, leaveHome, reset } = useStore();
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <Card className="p-5 border-amber-500/30">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold text-ink">
            <LogOut size={16} className="text-amber-400" />
            Household Management & Data Controls
          </h3>
          <p className="mt-1 text-xs text-muted">
            Switch between households or reset your local browser cache without affecting cloud data.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Btn
            variant="soft"
            onClick={() => leaveHome()}
          >
            <LogOut size={14} /> Switch / Leave Home
          </Btn>

          <Btn
            variant="danger"
            onClick={() => setConfirmReset(true)}
          >
            <RotateCcw size={14} /> Reset Local Browser Data
          </Btn>
        </div>
      </div>

      {confirmReset && (
        <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-4 space-y-3">
          <p className="text-xs font-semibold text-red-400">
            ⚠️ Are you sure you want to clear your local browser data? This resets the local cache for &quot;{state.flatName}&quot;.
          </p>
          <div className="flex items-center gap-2">
            <Btn
              variant="danger"
              onClick={() => {
                reset();
                setConfirmReset(false);
              }}
            >
              Yes, Reset Local Cache
            </Btn>
            <Btn
              variant="ghost"
              onClick={() => setConfirmReset(false)}
            >
              Cancel
            </Btn>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ---------------- the document itself ---------------- */

function DocViewer({
  md,
  onDownload,
}: {
  md: string;
  onDownload: () => void;
}) {
  const [open, setOpen] = useState(false);
  const lines = md.split("\n").length;
  const words = md.split(/\s+/).length;
  const sections = md
    .split("\n")
    .filter((l) => /^## /.test(l))
    .map((l) => l.replace(/^##\s*/, ""));

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-panel2 text-accent">
            <FileText size={20} />
          </span>
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold">
              WORKING_MODEL.md
            </h3>
            <p className="mt-1 max-w-2xl text-xs text-muted">
              The complete written specification — data layer, schema, security
              policies, the reminder robot, setup steps, troubleshooting and
              verification queries. It lives in the project root and is bundled
              here so it can never fall out of date.
            </p>
            <p className="mt-2 flex flex-wrap gap-3 font-mono text-[10px] text-muted">
              <span>{lines} lines</span>
              <span>{words.toLocaleString()} words</span>
              <span>{sections.length} sections</span>
              <span>markdown</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn variant="soft" onClick={() => setOpen((v) => !v)}>
            <FileCode2 size={14} /> {open ? "Hide" : "Read"} in app
          </Btn>
          <Btn onClick={() => navigator.clipboard?.writeText(md)}>
            <Copy size={14} /> Copy all
          </Btn>
          <Btn variant="solid" onClick={onDownload}>
            <Download size={14} /> Download
          </Btn>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {sections.map((s) => (
          <span
            key={s}
            className="rounded-md border border-line bg-panel2 px-2 py-1 text-[10px] font-semibold text-muted"
          >
            {s}
          </span>
        ))}
      </div>

      {open && (
        <pre className="mt-4 max-h-[520px] overflow-auto rounded-lg border border-line bg-panel2 p-4 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-ink/90">
          {md}
        </pre>
      )}
    </Card>
  );
}

/* ---------------- how data moves ---------------- */

function Architecture() {
  const flow = [
    {
      icon: <Zap size={15} />,
      t: "1 · You tap a button",
      d: "“Mark Task Completed” updates React state instantly, so the screen never feels slow.",
      tone: "text-sky-400 border-sky-500/30",
    },
    {
      icon: <Database size={15} />,
      t: "2 · The adapter saves it",
      d: "800ms later the whole home state is written to Postgres — one row, one JSON column.",
      tone: "text-emerald-400 border-emerald-500/30",
    },
    {
      icon: <Radio size={15} />,
      t: "3 · Everyone else hears it",
      d: "Other phones are subscribed to that row, so their roster updates without a refresh.",
      tone: "text-fuchsia-400 border-fuchsia-500/30",
    },
    {
      icon: <Timer size={15} />,
      t: "4 · The robot checks the clock",
      d: "Every 5 minutes a cron job reads the same data, works out who's next, and sends reminders.",
      tone: "text-amber-400 border-amber-500/30",
    },
  ];

  return (
    <Card className="p-5">
      <h3 className="text-lg font-bold">How your data actually moves</h3>
      <p className="mt-1 text-xs text-muted">
        Four steps, start to finish — this is the whole system.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {flow.map((f, i) => (
          <div key={f.t} className="relative rounded-xl border border-line bg-panel2 p-4">
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg border bg-panel",
                f.tone,
              )}
            >
              {f.icon}
            </span>
            <p className="mt-2.5 text-sm font-bold">{f.t}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">{f.d}</p>
            {i < flow.length - 1 && (
              <ArrowRight
                size={14}
                className="absolute top-1/2 -right-2.5 hidden text-muted xl:block"
              />
            )}
          </div>
        ))}
      </div>

      <pre className="mt-4 overflow-x-auto rounded-lg border border-line bg-panel2 p-4 font-mono text-[10.5px] leading-relaxed text-muted">
{`  PHONE A          PHONE B            SUPABASE                 ROBOT
  ───────          ───────            ────────                 ─────
  tap "done"
      │
      ├─ save ──────────────────────▶ flats.state (jsonb)
      │                                    │
      │                                    ├─ realtime ──▶ PHONE B
      │                                    │               roster updates
      ├─ insert ────────────────────▶ duty_log (audit trail)
                                           │
                                           ◀── read ────── cron every 5 min
                                           │                     │
                                      sent_alerts ◀── dedupe ────┤
                                                                 │
                            push / WhatsApp / email ◀────────────┘`}
      </pre>
    </Card>
  );
}

/* ---------------- file map ---------------- */

function Files() {
  const files = [
    {
      p: "src/lib/db.ts",
      w: "The switch. Defines one DataAdapter interface with two implementations — LocalAdapter and SupabaseAdapter. Picks automatically based on your .env.",
    },
    {
      p: "supabase/schema.sql",
      w: "Your database. Four tables, Row Level Security so people only see their own home, and the join_flat() function that turns a code into membership.",
    },
    {
      p: "supabase/functions/remind/index.ts",
      w: "The robot. Re-implements the rotation engine server-side, finds duties that are due, and sends push, WhatsApp and email.",
    },
    {
      p: "supabase/cron.sql",
      w: "The schedule. Tells Postgres to poke the robot every five minutes, plus a nightly cleanup.",
    },
    {
      p: "public/sw.js",
      w: "The service worker. Receives pushes and shows the notification when the app is closed.",
    },
    {
      p: ".env.example",
      w: "The template for your keys. Copy to .env and fill in — never commit the real one.",
    },
  ];

  return (
    <Card className="p-5">
      <h3 className="flex items-center gap-2 text-lg font-bold">
        <FileCode2 size={17} className="text-muted" /> The files that make it work
      </h3>
      <p className="mt-1 text-xs text-muted">
        All of these already exist in the project — nothing to write from scratch.
      </p>
      <div className="mt-4 divide-y divide-line">
        {files.map((f) => (
          <div key={f.p} className="flex flex-wrap gap-x-6 gap-y-1 py-3">
            <code className="flex w-64 shrink-0 items-center gap-1.5 font-mono text-xs font-bold text-accent">
              <Terminal size={12} className="text-muted" />
              {f.p}
            </code>
            <p className="flex-1 text-[11px] leading-relaxed text-muted">{f.w}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
