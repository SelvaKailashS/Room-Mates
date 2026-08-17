import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  History,
  PartyPopper,
  Search,
  Shuffle,
} from "lucide-react";
import { useStore } from "../lib/store";
import { roommateById } from "../lib/engine";
import { Avatar, Btn, Card, inputCls } from "./ui";
import { cn } from "../utils/cn";

const actionStyle: Record<string, string> = {
  completed: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  "sick-reassign": "text-amber-400 bg-amber-500/10 border-amber-500/30",
  swap: "text-sky-400 bg-sky-500/10 border-sky-500/30",
  skipped: "text-red-400 bg-red-500/10 border-red-500/30",
  holiday: "text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/30",
};

export default function WorkLog() {
  const { state } = useStore();
  const [q, setQ] = useState("");
  const [action, setAction] = useState("all");
  const [who, setWho] = useState("all");

  const logs = useMemo(() => {
    const term = q.toLowerCase();
    return state.logs.filter((l) => {
      const rm = roommateById(state, l.roommateId);
      const hay = `${l.choreName} ${l.detail} ${rm?.name ?? ""}`.toLowerCase();
      return (
        (!term || hay.includes(term)) &&
        (action === "all" || l.action === action) &&
        (who === "all" || l.roommateId === who)
      );
    });
  }, [state, q, action, who]);

  const exportCsv = () => {
    const rows = [
      ["Date", "Time", "Chore", "Roommate", "Action", "Details"],
      ...logs.map((l) => [
        l.date,
        l.time,
        l.choreName,
        roommateById(state, l.roommateId)?.name ?? "—",
        l.action,
        l.detail,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "room-mates-work-log.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="cm-in space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
            <History size={18} className="text-accent" />
            Previous Work Data & Activity History
          </h2>
          <p className="mt-1 text-xs text-muted">
            Audit log of all completed chores, sick reassignments and roommate
            turns
          </p>
        </div>
        <Btn variant="soft" onClick={exportCsv}>
          <Download size={14} /> Export CSV Log
        </Btn>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="relative">
          <Search
            size={14}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-muted"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search chore, details or roommate..."
            className={inputCls + " pl-9"}
          />
        </div>
        <select
          className={inputCls}
          value={action}
          onChange={(e) => setAction(e.target.value)}
        >
          <option value="all">All Actions</option>
          <option value="completed">Completed</option>
          <option value="sick-reassign">Sick Reassignment</option>
          <option value="swap">Manual Swap</option>
          <option value="holiday">Holiday Mode</option>
        </select>
        <select
          className={inputCls}
          value={who}
          onChange={(e) => setWho(e.target.value)}
        >
          <option value="all">All Roommates</option>
          {state.roommates.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <Card className="divide-y divide-line">
        {logs.length === 0 && (
          <p className="p-8 text-center text-sm text-muted">
            No activity matches these filters yet.
          </p>
        )}
        {logs.map((l) => {
          const rm = roommateById(state, l.roommateId);
          return (
            <div
              key={l.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border",
                    actionStyle[l.action],
                  )}
                >
                  {l.action === "completed" ? (
                    <CheckCircle2 size={13} />
                  ) : l.action === "holiday" ? (
                    <PartyPopper size={12} />
                  ) : (
                    <Shuffle size={12} />
                  )}
                </span>
                <div>
                  <p className="flex flex-wrap items-center gap-2 text-sm font-bold">
                    {l.choreName}
                    <span
                      className={cn(
                        "rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase",
                        actionStyle[l.action],
                      )}
                    >
                      {l.action.replace("-", " ")}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{l.detail}</p>
                  <p className="mt-1 font-mono text-[11px] text-muted">
                    Date: <span className="text-ink">{l.date}</span> &nbsp;
                    Time: <span className="text-ink">{l.time}</span>
                  </p>
                </div>
              </div>
              <span className="flex items-center gap-2 rounded-full border border-line bg-panel2 py-1 pr-3 pl-1">
                <Avatar rm={rm} size="sm" />
                <span className="text-xs font-semibold">
                  {rm?.name ?? "System"}
                </span>
              </span>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
