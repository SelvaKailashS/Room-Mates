import { useMemo, useState } from "react";
import {
  Award,
  CalendarDays,
  CheckCircle2,
  Clock,
  Flame,
  Mail,
  Phone,
  RotateCcw,
  Shield,
  SkipForward,
  UserCircle2,
  Zap,
} from "lucide-react";
import { useStore } from "../lib/store";
import { firstName, initials } from "../lib/engine";
import { Card, Empty, SectionHead } from "./ui";
import { cn } from "../utils/cn";
import type { LogEntry, Roommate } from "../lib/types";

/* ── helpers ─────────────────────────────────────────────── */

function actionMeta(action: LogEntry["action"]) {
  switch (action) {
    case "completed":
      return { icon: <CheckCircle2 size={13} />, color: "text-emerald-400", label: "Completed" };
    case "sick-reassign":
      return { icon: <SkipForward size={13} />, color: "text-amber-400", label: "Passed (sick/away)" };
    case "swap":
      return { icon: <RotateCcw size={13} />, color: "text-sky-400", label: "Swapped" };
    case "skipped":
      return { icon: <SkipForward size={13} />, color: "text-red-400", label: "Skipped" };
    case "holiday":
      return { icon: <CalendarDays size={13} />, color: "text-purple-400", label: "Holiday" };
  }
}

/** Longest consecutive-day streak of at least one completed chore. */
function calcStreak(logs: LogEntry[], roommateId: string): number {
  const days = [
    ...new Set(
      logs
        .filter((l) => l.roommateId === roommateId && l.action === "completed")
        .map((l) => l.date),
    ),
  ].sort().reverse();

  if (days.length === 0) return 0;
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const curr = new Date(days[i]);
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

/* ── avatar chip ─────────────────────────────────────────── */

function MateChip({
  rm,
  active,
  onClick,
}: {
  rm: Roommate;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all",
        active
          ? "border-accent/60 bg-accent/10 shadow-[0_0_0_1px_var(--color-accent)/20]"
          : "border-line bg-panel hover:border-line/80 hover:bg-panel2",
      )}
    >
      <span
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full text-lg font-extrabold text-white transition-transform",
          rm.color,
          active && "scale-105 shadow-lg",
        )}
      >
        {initials(rm.name)}
      </span>
      <span className="max-w-[72px] truncate text-[11px] font-semibold leading-tight">
        {firstName(rm.name)}
      </span>
      <span
        className={cn(
          "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
          rm.status === "active"
            ? "bg-emerald-500/15 text-emerald-400"
            : "bg-amber-500/15 text-amber-400",
        )}
      >
        {rm.status}
      </span>
    </button>
  );
}

/* ── stat pill ───────────────────────────────────────────── */

function StatPill({
  icon,
  label,
  value,
  color = "text-accent",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-line bg-panel2 px-4 py-3 text-center">
      <span className={cn("flex items-center gap-1", color)}>{icon}</span>
      <span className="text-2xl font-extrabold tracking-tight">{value}</span>
      <span className="text-[10px] text-muted uppercase tracking-wider">{label}</span>
    </div>
  );
}

/* ── main component ──────────────────────────────────────── */

export default function Profile() {
  const { state } = useStore();
  const [selectedId, setSelectedId] = useState<string>(
    () => state.currentUserId ?? state.roommates[0]?.id ?? "",
  );

  const rm = state.roommates.find((r) => r.id === selectedId);

  const stats = useMemo(() => {
    if (!rm) return null;
    const myLogs = state.logs.filter((l) => l.roommateId === rm.id);
    const completed = myLogs.filter((l) => l.action === "completed").length;
    const skipped = myLogs.filter(
      (l) => l.action === "skipped" || l.action === "sick-reassign",
    ).length;
    const swapped = myLogs.filter((l) => l.action === "swap").length;
    const streak = calcStreak(state.logs, rm.id);

    // chores this person appears in the rotation for
    const choreCount = state.chores.filter((c) => c.order.includes(rm.id)).length;

    return { completed, skipped, swapped, streak, choreCount };
  }, [rm, state.logs, state.chores]);

  const recentLogs = useMemo(
    () => state.logs.filter((l) => l.roommateId === rm?.id).slice(0, 30),
    [rm, state.logs],
  );

  if (state.roommates.length === 0) {
    return (
      <div className="cm-in">
        <Empty
          icon={<UserCircle2 size={24} />}
          title="No roommates yet"
          body="Add your housemates first. Each person's profile — stats, streaks, and history — will appear here."
          action="Add Roommates"
          onAction={() =>
            window.dispatchEvent(new CustomEvent("rm:go", { detail: "mates" }))
          }
        />
      </div>
    );
  }

  return (
    <div className="cm-in space-y-5">
      {/* page header */}
      <SectionHead
        icon={<UserCircle2 size={18} className="text-accent" />}
        title="Roommate Profiles"
        sub="Select a housemate to see their stats, chore history, and streak."
      />

      {/* roommate picker */}
      <Card className="p-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted">
          Housemates
        </p>
        <div className="flex flex-wrap gap-2">
          {state.roommates.map((r) => (
            <MateChip
              key={r.id}
              rm={r}
              active={r.id === selectedId}
              onClick={() => setSelectedId(r.id)}
            />
          ))}
        </div>
      </Card>

      {rm && stats && (
        <>
          {/* profile hero */}
          <Card className="overflow-hidden">
            {/* colour strip */}
            <div className={cn("h-2 w-full opacity-70", rm.color)} />
            <div className="flex flex-wrap items-start gap-5 p-5">
              {/* big avatar */}
              <span
                className={cn(
                  "flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-3xl font-extrabold text-white shadow-lg",
                  rm.color,
                )}
              >
                {initials(rm.name)}
              </span>

              {/* info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-extrabold tracking-tight">{rm.name}</h2>
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 text-[10px] font-bold uppercase",
                      rm.role === "admin"
                        ? "bg-amber-500/15 text-amber-400"
                        : "bg-panel2 text-muted",
                    )}
                  >
                    {rm.role ?? "member"}
                  </span>
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 text-[10px] font-bold uppercase",
                      rm.status === "active"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-red-500/15 text-red-400",
                    )}
                  >
                    {rm.status}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
                  {rm.phone && (
                    <span className="flex items-center gap-1">
                      <Phone size={11} /> {rm.phone}
                    </span>
                  )}
                  {rm.email && (
                    <span className="flex items-center gap-1">
                      <Mail size={11} /> {rm.email}
                    </span>
                  )}
                  {(rm as any).joinedAt && (
                    <span className="flex items-center gap-1">
                      <CalendarDays size={11} />
                      Joined{" "}
                      {new Date((rm as any).joinedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>

                {/* channel badges */}
                {rm.channels && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {rm.channels.push && (
                      <Badge icon={<Zap size={10} />} label="Push" />
                    )}
                    {rm.channels.whatsapp && (
                      <Badge icon={<Shield size={10} />} label="WhatsApp" />
                    )}
                    {rm.channels.email && (
                      <Badge icon={<Mail size={10} />} label="Email" />
                    )}
                    <Badge
                      icon={<Shield size={10} />}
                      label={`${stats.choreCount} chores`}
                    />
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* stats row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatPill
              icon={<CheckCircle2 size={15} />}
              label="Completed"
              value={stats.completed}
              color="text-emerald-400"
            />
            <StatPill
              icon={<Flame size={15} />}
              label="Day Streak"
              value={stats.streak}
              color="text-orange-400"
            />
            <StatPill
              icon={<RotateCcw size={15} />}
              label="Swaps"
              value={stats.swapped}
              color="text-sky-400"
            />
            <StatPill
              icon={<SkipForward size={15} />}
              label="Skipped"
              value={stats.skipped}
              color="text-red-400"
            />
          </div>

          {/* streak callout */}
          {stats.streak >= 3 && (
            <Card className="flex items-center gap-3 border-orange-500/30 bg-orange-500/5 p-4">
              <Award size={22} className="shrink-0 text-orange-400" />
              <div>
                <p className="text-sm font-bold text-orange-300">
                  {stats.streak}-day streak! 🔥
                </p>
                <p className="text-xs text-muted">
                  {firstName(rm.name)} has completed at least one chore every day for{" "}
                  {stats.streak} days in a row. Keep it up!
                </p>
              </div>
            </Card>
          )}

          {/* recent history timeline */}
          <Card className="p-5">
            <h3 className="flex items-center gap-2 font-bold">
              <Clock size={14} className="text-muted" />
              Chore History
              <span className="ml-1 rounded bg-panel2 px-1.5 py-0.5 font-mono text-[10px] text-muted">
                last {recentLogs.length}
              </span>
            </h3>

            {recentLogs.length === 0 ? (
              <p className="mt-6 text-center text-xs text-muted">
                No chore history yet — it will appear here as{" "}
                {firstName(rm.name)} completes duties.
              </p>
            ) : (
              <div className="mt-4 space-y-1">
                {recentLogs.map((log) => {
                  const meta = actionMeta(log.action);
                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-panel2"
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line bg-panel",
                          meta.color,
                        )}
                      >
                        {meta.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold">
                            {log.choreName}
                          </span>
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                              meta.color,
                              "bg-current/10",
                            )}
                          >
                            {meta.label}
                          </span>
                        </div>
                        {log.detail && (
                          <p className="mt-0.5 text-[11px] text-muted truncate">
                            {log.detail}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-[10px] text-muted">{log.date}</p>
                        <p className="font-mono text-[10px] text-muted/60">{log.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function Badge({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1 rounded-md border border-line bg-panel2 px-2 py-0.5 text-[10px] font-semibold text-muted">
      {icon}
      {label}
    </span>
  );
}
