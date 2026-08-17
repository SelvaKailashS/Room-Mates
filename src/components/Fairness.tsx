import { useMemo } from "react";
import { CheckCircle2, Medal, Scale, ShieldCheck, Trophy } from "lucide-react";
import { useStore } from "../lib/store";
import { BASE_HISTORY, firstName } from "../lib/engine";
import { Avatar, Card, Empty } from "./ui";
import { cn } from "../utils/cn";

export default function Fairness() {
  const { state } = useStore();

  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    state.roommates.forEach((r) => {
      counts[r.id] = BASE_HISTORY[r.id] ?? 0;
    });
    state.logs
      .filter((l) => l.action === "completed")
      .forEach((l) => {
        if (l.roommateId in counts) counts[l.roommateId] += 1;
      });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const n = state.roommates.length || 1;
    const equal = total / n;
    const dev =
      Object.values(counts).reduce((a, b) => a + Math.abs(b - equal), 0) / n;
    const fairness = total ? Math.max(0, 100 - (dev / total) * 100) : 100;
    const rows = state.roommates
      .map((r) => ({
        rm: r,
        count: counts[r.id],
        pct: total ? Math.round((counts[r.id] / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
    return { rows, total, fairness, equalPct: Math.round(100 / n) };
  }, [state]);

  const top = data.rows[0];

  return (
    <div className="cm-in space-y-4">
      <Card className="p-5">
        <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
          <Scale size={18} className="text-accent" />
          Chore Fairness Index & Roommate Leaderboard
        </h2>
        <p className="mt-1 text-xs text-muted">
          Real-time workload distribution analysis ensuring equal turns and zero
          chore disputes
        </p>
      </Card>

      {state.roommates.length === 0 && (
        <Empty
          icon={<Scale size={24} />}
          title="Nothing to measure yet"
          body="Once you add housemates and they start completing chores, this page shows exactly how the workload is split — and flags anyone doing more than their share."
          action="Add Roommates"
          onAction={() =>
            window.dispatchEvent(new CustomEvent("rm:go", { detail: "mates" }))
          }
        />
      )}

      {state.roommates.length > 0 && (
      <div className="grid gap-4 md:grid-cols-3">
        <Stat
          label="Total Chores Completed"
          value={String(data.total)}
          hint="Logged across all roommate turns"
          icon={<CheckCircle2 size={20} className="text-emerald-400" />}
        />
        <Stat
          label="Flat Fairness Score"
          value={`${data.fairness.toFixed(1)}%`}
          hint="Balanced round-robin distribution"
          icon={<ShieldCheck size={20} className="text-emerald-400" />}
        />
        <Stat
          label="Top Contributor"
          value={top ? firstName(top.rm.name) : "—"}
          hint={top ? `${top.count} chores finished` : "No data yet"}
          icon={<Trophy size={20} className="text-amber-400" />}
        />
      </div>
      )}

      {state.roommates.length > 0 && (
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-bold">
              <Medal size={16} className="text-muted" />
              Roommate Contribution Breakdown
            </h3>
            <p className="mt-1 text-xs text-muted">
              Percentage of total household work completed by each roommate
            </p>
          </div>
          <span className="rounded-md border border-line bg-panel2 px-2.5 py-1 font-mono text-[11px] text-muted">
            Equal Target: ~{data.equalPct}% each
          </span>
        </div>

        <div className="mt-5 space-y-3">
          {data.rows.map((row, i) => (
            <div
              key={row.rm.id}
              className="rounded-lg border border-line bg-panel2 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs text-muted">#{i + 1}</span>
                  <Avatar rm={row.rm} size="sm" />
                  <span className="text-sm font-semibold">{row.rm.name}</span>
                  {row.rm.status !== "active" && (
                    <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 uppercase">
                      {row.rm.status}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-muted">
                    {row.count} chores completed
                  </span>
                  <span className="w-9 text-right font-mono text-xs font-bold">
                    {row.pct}%
                  </span>
                </div>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-panel">
                <div
                  className={cn("h-full rounded-full", row.rm.color)}
                  style={{
                    width: `${Math.min(
                      100,
                      (row.pct / Math.max(1, data.equalPct)) * 100,
                    )}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <p className="text-[11px] text-muted">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        {icon}
        <span className="text-3xl font-extrabold tracking-tight">{value}</span>
      </div>
      <p className="mt-2 text-[11px] text-muted">{hint}</p>
    </Card>
  );
}
