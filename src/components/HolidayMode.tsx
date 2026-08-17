import { useMemo, useState } from "react";
import {
  CalendarPlus,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  PartyPopper,
  Utensils,
} from "lucide-react";
import { useStore } from "../lib/store";
import {
  addDays,
  daySessions,
  firstName,
  fromKey,
  getAssignment,
  holidayLabel,
  isHoliday,
  pad,
  prettyDate,
  roommateById,
  toKey,
} from "../lib/engine";
import { Avatar, Btn, Card, SectionHead, inputCls } from "./ui";
import { cn } from "../utils/cn";
import type { Slot } from "../lib/types";

const WD = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function HolidayMode() {
  const { state, today, toggleHoliday, setAutoSunday, updateMeal } = useStore();
  const [cursor, setCursor] = useState(() => {
    const d = fromKey(today);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const grid = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const lead = first.getDay();
    const days = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const cells: (string | null)[] = Array(lead).fill(null);
    for (let i = 1; i <= days; i++)
      cells.push(`${cursor.y}-${pad(cursor.m + 1)}-${pad(i)}`);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  /** next holidays within 45 days */
  const upcoming = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < 45 && out.length < 4; i++) {
      const d = addDays(today, i);
      if (isHoliday(state, d)) out.push(d);
    }
    return out;
  }, [state, today]);

  const monthName = new Date(cursor.y, cursor.m, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="cm-in space-y-5">
      <SectionHead
        icon={<PartyPopper size={18} className="text-fuchsia-400" />}
        title="Holiday Mode & Triple Cooking Sessions"
        sub="On holidays everyone eats at home — cooking automatically splits into breakfast, lunch & dinner, each rotated to a different flatmate"
        right={
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-panel2 px-3 py-2 text-xs font-semibold">
            <input
              type="checkbox"
              checked={state.autoSundayHoliday}
              onChange={(e) => setAutoSunday(e.target.checked)}
              className="h-3.5 w-3.5 accent-fuchsia-500"
            />
            Treat every Sunday as holiday
          </label>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        {/* calendar */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold">
              <CalendarPlus size={15} className="text-muted" /> {monthName}
            </h3>
            <div className="flex items-center gap-1.5">
              <Btn
                className="px-2"
                onClick={() =>
                  setCursor((c) =>
                    c.m === 0 ? { y: c.y - 1, m: 11 } : { ...c, m: c.m - 1 },
                  )
                }
              >
                <ChevronLeft size={14} />
              </Btn>
              <Btn
                className="px-2"
                onClick={() =>
                  setCursor((c) =>
                    c.m === 11 ? { y: c.y + 1, m: 0 } : { ...c, m: c.m + 1 },
                  )
                }
              >
                <ChevronRight size={14} />
              </Btn>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center">
            {WD.map((w) => (
              <span key={w} className="pb-1 text-[10px] font-bold text-muted">
                {w}
              </span>
            ))}
            {grid.map((d, i) => {
              if (!d) return <span key={`e${i}`} />;
              const day = Number(d.slice(-2));
              const hol = isHoliday(state, d);
              const explicit = state.holidays.includes(d);
              return (
                <button
                  key={d}
                  onClick={() => toggleHoliday(d)}
                  className={cn(
                    "relative aspect-square rounded-lg border text-xs font-semibold transition-colors",
                    hol
                      ? "border-fuchsia-500/50 bg-fuchsia-500/15 text-fuchsia-300"
                      : "border-line bg-panel2 text-muted hover:border-accent/50 hover:text-ink",
                    d === today && "ring-1 ring-accent",
                  )}
                  title={
                    hol
                      ? `${prettyDate(d)} · ${holidayLabel(state, d)}`
                      : `Mark ${prettyDate(d)} as holiday`
                  }
                >
                  {day}
                  {hol && (
                    <span
                      className={cn(
                        "absolute right-1 bottom-1 h-1.5 w-1.5 rounded-full",
                        explicit ? "bg-fuchsia-400" : "bg-fuchsia-400/40",
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-line pt-3 text-[11px] text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-fuchsia-400" /> Marked
              holiday
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-fuchsia-400/40" /> Auto
              Sunday
            </span>
            <span className="flex items-center gap-1.5">
              <Info size={11} /> Click any date to toggle
            </span>
          </div>
        </Card>

        {/* meal session config */}
        <Card className="p-5">
          <h3 className="flex items-center gap-2 font-bold">
            <Utensils size={15} className="text-muted" /> Holiday Cooking
            Sessions
          </h3>
          <p className="mt-1 text-xs text-muted">
            These {state.holidayMeals.length} sessions replace the single
            cooking duty on every holiday. Rotation is shifted per meal so one
            person never cooks twice in a day.
          </p>
          <div className="mt-4 space-y-2.5">
            {state.holidayMeals.map((m, i) => (
              <div
                key={i}
                className="rounded-lg border border-line bg-panel2 p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-panel text-base">
                    {m.icon}
                  </span>
                  <input
                    value={m.name}
                    onChange={(e) => updateMeal(i, { name: e.target.value })}
                    className={inputCls + " flex-1 py-1.5 text-xs font-bold"}
                  />
                  <span className="rounded bg-fuchsia-500/10 px-1.5 py-1 text-[10px] font-bold text-fuchsia-400">
                    #{i + 1}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Clock
                      size={12}
                      className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted"
                    />
                    <input
                      value={m.time}
                      onChange={(e) => updateMeal(i, { time: e.target.value })}
                      className={inputCls + " py-1.5 pl-7 font-mono text-xs"}
                    />
                  </div>
                  <select
                    value={m.slot}
                    onChange={(e) =>
                      updateMeal(i, { slot: e.target.value as Slot })
                    }
                    className={inputCls + " py-1.5 text-xs"}
                  >
                    <option>Morning</option>
                    <option>Afternoon</option>
                    <option>Night</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* upcoming kitchen plan */}
      <Card className="p-5">
        <h3 className="flex items-center gap-2 font-bold">
          <ChefHat size={15} className="text-muted" /> Upcoming Holiday Kitchen
          Plan
        </h3>
        <p className="mt-1 text-xs text-muted">
          Who cooks what on the next holidays — share this with the flat so
          nobody argues on the day
        </p>

        {upcoming.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">
            No holidays in the next 45 days. Mark one on the calendar above.
          </p>
        )}

        <div className="mt-4 space-y-3">
          {upcoming.map((d) => {
            const meals = daySessions(state, d).filter((s) => s.mealIndex >= 0);
            const others = daySessions(state, d).filter(
              (s) => s.mealIndex < 0,
            ).length;
            return (
              <div
                key={d}
                className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/[0.05] p-4"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{prettyDate(d)}</span>
                    <span className="flex items-center gap-1 rounded bg-fuchsia-500/15 px-1.5 py-0.5 text-[10px] font-bold text-fuchsia-400 uppercase">
                      <PartyPopper size={10} /> {holidayLabel(state, d)}
                    </span>
                    {d === today && (
                      <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                        Today
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-muted">
                    {meals.length} cooking sessions + {others} other duties
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {meals.map((s) => {
                    const rm = roommateById(
                      state,
                      getAssignment(state, s, d).roommateId,
                    );
                    return (
                      <div
                        key={s.key}
                        className="flex items-center justify-between gap-2 rounded-lg border border-line bg-panel px-3 py-2.5"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="text-lg">{s.icon}</span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold">
                              {s.name.replace("Holiday ", "")}
                            </p>
                            <p className="font-mono text-[10px] text-muted">
                              {s.time}
                            </p>
                          </div>
                        </div>
                        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-panel2 px-1.5 py-1">
                          <Avatar rm={rm} size="xs" />
                          <span className="pr-1 text-[11px] font-semibold">
                            {rm ? firstName(rm.name) : "—"}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {upcoming.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
            <p className="text-[11px] text-muted">
              Next holiday:{" "}
              <span className="font-semibold text-ink">
                {prettyDate(upcoming[0])}
              </span>{" "}
              ·{" "}
              {Math.max(
                0,
                Math.round(
                  (fromKey(upcoming[0]).getTime() -
                    fromKey(toKey(new Date())).getTime()) /
                    86400000,
                ),
              )}{" "}
              day(s) away
            </p>
            <Btn
              variant="soft"
              onClick={() => {
                const meals = daySessions(state, upcoming[0]).filter(
                  (s) => s.mealIndex >= 0,
                );
                const text = [
                  `🏠 Room Mates · Holiday Kitchen Plan — ${prettyDate(upcoming[0])}`,
                  ...meals.map((s) => {
                    const rm = roommateById(
                      state,
                      getAssignment(state, s, upcoming[0]).roommateId,
                    );
                    return `${s.icon} ${s.name.replace("Holiday ", "")} (${s.time}) — ${rm?.name ?? "—"}`;
                  }),
                ].join("\n");
                navigator.clipboard?.writeText(text);
                alert("Holiday kitchen plan copied — paste it in the flat group!");
              }}
            >
              Copy Plan For Group Chat
            </Btn>
          </div>
        )}
      </Card>
    </div>
  );
}
