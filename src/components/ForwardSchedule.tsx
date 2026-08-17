import { useState } from "react";
import { CalendarRange, Filter, PartyPopper } from "lucide-react";
import { useStore } from "../lib/store";
import {
  addDays,
  daySessions,
  firstName,
  getAssignment,
  holidayLabel,
  isHoliday,
  relativeLabel,
  roommateById,
} from "../lib/engine";
import { Avatar, Card, Empty } from "./ui";
import { cn } from "../utils/cn";

const RANGES = [7, 14, 30];

export default function ForwardSchedule() {
  const { state, today } = useStore();
  const [days, setDays] = useState(7);
  const [filter, setFilter] = useState<string>("all");

  const dates = Array.from({ length: days }, (_, i) => addDays(today, i));
  const sessionsOn = (d: string) =>
    daySessions(state, d).filter(
      (s) => filter === "all" || s.chore.id === filter,
    );
  const holidayCount = dates.filter((d) => isHoliday(state, d)).length;

  return (
    <div className="cm-in space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
            <CalendarRange size={18} className="text-accent" />
            Forward Duty Schedule Roster
          </h2>
          <p className="mt-1 text-xs text-muted">
            Predictive forecast roster showing upcoming turns for cooking,
            dishwashing, cleaning and custom chores
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-fuchsia-400">
            <PartyPopper size={12} />
            {holidayCount} holiday{holidayCount === 1 ? "" : "s"} in this window
            — cooking expands to {state.holidayMeals.length} sessions on those
            days
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Lookahead:</span>
          <div className="flex rounded-lg border border-line bg-panel2 p-1">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setDays(r)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                  days === r
                    ? "bg-panel text-ink shadow"
                    : "text-muted hover:text-ink",
                )}
              >
                {r} Days
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-2 px-1">
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <Filter size={12} /> Chore Filter:
        </span>
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "rounded-md border px-2.5 py-1 text-xs font-semibold",
            filter === "all"
              ? "border-line bg-panel2 text-ink"
              : "border-transparent text-muted hover:text-ink",
          )}
        >
          All Chores
        </button>
        {state.chores.map((c) => (
          <button
            key={c.id}
            onClick={() => setFilter(c.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold",
              filter === c.id
                ? "border-line bg-panel2 text-ink"
                : "border-transparent text-muted hover:text-ink",
            )}
          >
            <span>{c.icon}</span>
            {c.name}
          </button>
        ))}
      </div>

      {state.chores.length === 0 && (
        <Empty
          icon={<CalendarRange size={24} />}
          title="Nothing scheduled yet"
          body="Once you've added housemates and chores, this page forecasts who's on duty for the next 7, 14 or 30 days — including holiday cooking sessions."
          action="Set Up Chores"
          onAction={() =>
            window.dispatchEvent(new CustomEvent("rm:go", { detail: "chores" }))
          }
        />
      )}

      <div className="space-y-3">
        {state.chores.length > 0 && dates.map((d) => {
          const sessions = sessionsOn(d);
          const hol = isHoliday(state, d);
          const meals = sessions.filter((s) => s.mealIndex >= 0).length;
          return (
            <Card
              key={d}
              className={cn(
                "p-4",
                d === today && "border-accent/40",
                hol && "border-fuchsia-500/40 bg-fuchsia-500/[0.04]",
              )}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{relativeLabel(d, today)}</span>
                  <span className="font-mono text-[11px] text-muted">{d}</span>
                  {d === today && (
                    <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                      Current Day
                    </span>
                  )}
                  {hol && (
                    <span className="flex items-center gap-1 rounded bg-fuchsia-500/15 px-1.5 py-0.5 text-[10px] font-bold text-fuchsia-400">
                      <PartyPopper size={10} /> {holidayLabel(state, d)}
                      {meals > 0 && ` · ${meals} meals`}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-muted">
                  {sessions.length} Scheduled Tasks
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {sessions.map((s) => {
                  const a = getAssignment(state, s, d);
                  const rm = roommateById(state, a.roommateId);
                  return (
                    <div
                      key={s.key}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-lg border border-line bg-panel2 px-3 py-2",
                        s.mealIndex >= 0 && "border-fuchsia-500/30",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="text-sm">{s.icon}</span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold">{s.name}</p>
                          <p className="truncate font-mono text-[10px] text-muted">
                            {s.time}
                          </p>
                        </div>
                      </div>
                      <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-panel px-1.5 py-1">
                        <Avatar rm={rm} size="xs" />
                        <span className="pr-1 text-[11px] font-semibold">
                          {rm ? firstName(rm.name) : "—"}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
