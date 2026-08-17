import { useState } from "react";
import {
  ArrowLeftRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  PartyPopper,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { useStore } from "../lib/store";
import {
  addDays,
  daySessions,
  getAssignment,
  holidayLabel,
  isHoliday,
  prettyDate,
  roommateById,
  type Session,
} from "../lib/engine";
import { Avatar, Btn, Card, Empty, Modal, Tag } from "./ui";
import { cn } from "../utils/cn";

const slotStyle: Record<string, string> = {
  Morning: "text-amber-300 border-amber-400/30 bg-amber-400/10",
  Afternoon: "text-sky-300 border-sky-400/30 bg-sky-400/10",
  Night: "text-indigo-300 border-indigo-400/30 bg-indigo-400/10",
};

export default function TodayRoster() {
  const { state, today, complete, uncomplete, swap, setStatus, toggleHoliday, me, isAdmin } =
    useStore();
  const [date, setDate] = useState(today);
  const [swapFor, setSwapFor] = useState<Session | null>(null);

  const holiday = isHoliday(state, date);
  const label = holidayLabel(state, date);
  const sessions = daySessions(state, date);
  const rows = sessions.map((s) => ({ s, a: getAssignment(state, s, date) }));
  const doneCount = rows.filter((r) => r.a.done).length;
  const pct = rows.length ? Math.round((doneCount / rows.length) * 100) : 0;
  const mealRows = rows.filter((r) => r.s.mealIndex >= 0);

  return (
    <div className="cm-in space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-extrabold tracking-tight">
              Today&apos;s Duty Roster
            </h2>
            {date === today && (
              <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
                Live Today
              </span>
            )}
            {holiday && (
              <span className="flex items-center gap-1 rounded-md bg-fuchsia-500/15 px-2 py-1 text-[10px] font-bold tracking-wider text-fuchsia-400 uppercase">
                <PartyPopper size={11} /> {label}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted">
            Round-robin duty assignments with instant complete, sick bypass &
            custom reassignment
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Btn onClick={() => setDate(addDays(date, -1))} className="px-2.5">
            <ChevronLeft size={16} />
          </Btn>
          <button
            onClick={() => setDate(today)}
            className="flex items-center gap-2 rounded-lg border border-line bg-panel2 px-3 py-2 text-xs font-semibold text-ink"
          >
            <CalendarDays size={14} className="text-muted" />
            {prettyDate(date)}
          </button>
          <Btn onClick={() => setDate(addDays(date, 1))} className="px-2.5">
            <ChevronRight size={16} />
          </Btn>
        </div>
      </Card>

      {/* holiday control strip */}
      {rows.length > 0 && (
      <Card
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 px-5 py-4",
          holiday && "border-fuchsia-500/40 bg-fuchsia-500/5",
        )}
      >
        <div className="flex items-start gap-3">
          <UtensilsCrossed
            size={18}
            className={holiday ? "mt-0.5 text-fuchsia-400" : "mt-0.5 text-muted"}
          />
          <div>
            <p className="text-sm font-bold">
              {holiday
                ? `Holiday Mode ON · ${state.holidayMeals.length} cooking sessions today`
                : "Regular working day · single cooking duty"}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {holiday
                ? `Everyone is home, so cooking is split into ${state.holidayMeals
                    .map((m) => m.name.replace("Holiday ", ""))
                    .join(", ")} — each handled by a different flatmate.`
                : "Mark this date as a holiday/festival and the cooking duty auto-splits into breakfast, lunch & dinner turns."}
            </p>
          </div>
        </div>
        <Btn
          variant={holiday ? "danger" : "soft"}
          onClick={() => toggleHoliday(date)}
        >
          <PartyPopper size={14} />
          {state.holidays.includes(date)
            ? "Unmark Holiday"
            : holiday
              ? "Auto Sunday Holiday"
              : "Mark as Holiday"}
        </Btn>
      </Card>
      )}

      {holiday && mealRows.length > 0 && (
        <Card className="p-4">
          <p className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wider text-muted uppercase">
            <UtensilsCrossed size={13} /> Holiday Kitchen Plan
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {mealRows.map(({ s, a }) => {
              const rm = roommateById(state, a.roommateId);
              return (
                <div
                  key={s.key}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg border border-line bg-panel2 px-3 py-2.5",
                    a.done && "border-accent/40",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{s.icon}</span>
                    <div>
                      <p className="text-xs font-bold">
                        {s.name.replace("Holiday ", "")}
                      </p>
                      <p className="font-mono text-[10px] text-muted">
                        {s.time}
                      </p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 rounded-full bg-panel px-1.5 py-1">
                    <Avatar rm={rm} size="xs" />
                    <span className="pr-1 text-[11px] font-semibold">
                      {rm?.name.split(" ")[0] ?? "—"}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {rows.length === 0 && (
        <Empty
          icon={<CalendarDays size={24} />}
          title={
            state.roommates.length === 0
              ? "Nobody lives here yet"
              : "No chores set up yet"
          }
          body={
            state.roommates.length === 0
              ? "Add the people you share your home with, then create the chores you want rotated between them. The roster fills in automatically."
              : "You have housemates but no chores. Add one and it will start rotating from today."
          }
          action={
            state.roommates.length === 0 ? "Add Roommates" : "Add a Chore"
          }
          onAction={() =>
            window.dispatchEvent(
              new CustomEvent("rm:go", {
                detail: state.roommates.length === 0 ? "mates" : "chores",
              }),
            )
          }
        />
      )}

      {rows.length > 0 && (
      <Card className="flex items-center gap-4 px-5 py-4">
        <Sparkles size={16} className="text-muted" />
        <span className="text-sm font-semibold whitespace-nowrap">
          {doneCount} of {rows.length} Chores Completed
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel2">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="font-mono text-xs text-muted">{pct}%</span>
      </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map(({ s, a }) => {
          const rm = roommateById(state, a.roommateId);
          const orig = a.originalId ? roommateById(state, a.originalId) : null;
          return (
            <Card
              key={s.key}
              className={cn(
                "p-4 transition-colors",
                a.done && "border-accent/40 bg-accent/5",
                s.mealIndex >= 0 && !a.done && "border-fuchsia-500/30",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-panel2 text-lg">
                    {s.icon}
                  </span>
                  <div>
                    <h3 className="leading-tight font-bold">{s.name}</h3>
                    <p className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-muted">
                      <Clock size={11} /> {s.time}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={cn(
                      "rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase",
                      slotStyle[s.slot],
                    )}
                  >
                    {s.slot}
                  </span>
                  {s.mealIndex >= 0 && (
                    <span className="rounded-md border border-fuchsia-400/30 bg-fuchsia-400/10 px-2 py-0.5 text-[9px] font-bold tracking-wider text-fuchsia-300 uppercase">
                      Meal {s.mealIndex + 1}/{state.holidayMeals.length}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-line bg-panel2 p-3">
                <p className="text-[11px] text-muted">Duty Assigned To:</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Avatar rm={rm} />
                    <div>
                      <p className="text-sm font-semibold">
                        {rm?.name ?? "Unassigned"}
                      </p>
                      {(a.bypassed || a.manual) && (
                        <p className="text-[10px] text-amber-400">
                          {a.bypassed
                            ? `Bypassed ${orig?.name ?? ""} (${orig?.status})`
                            : "Manually reassigned"}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSwapFor(s)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
                  >
                    <ArrowLeftRight size={14} /> Swap
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                {a.done ? (
                  <Btn
                    variant="solid"
                    className="flex-1"
                    onClick={() => uncomplete(s.key, date)}
                  >
                    <CheckCircle2 size={14} /> Completed — Undo
                  </Btn>
                ) : (
                  <Btn
                    variant="soft"
                    className="flex-1"
                    onClick={() => complete(s.key, s.name, date, a.roommateId)}
                  >
                    <CheckCircle2 size={14} /> Mark Task Completed
                  </Btn>
                )}
                <Btn
                  variant="danger"
                  onClick={() => rm && setStatus(rm.id, "sick")}
                  disabled={!rm || rm.status === "sick" || (!isAdmin && rm.id !== me?.id)}
                  title={!isAdmin && rm?.id !== me?.id ? "Only this roommate or Admin can update status" : undefined}
                  className={cn(!isAdmin && rm?.id !== me?.id && "opacity-40 cursor-not-allowed")}
                >
                  Sick?
                </Btn>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal
        open={!!swapFor}
        onClose={() => setSwapFor(null)}
        title={`Reassign · ${swapFor?.name ?? ""}`}
      >
        <div className="space-y-2">
          {state.roommates.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                if (!swapFor) return;
                const cur = getAssignment(state, swapFor, date).roommateId;
                swap(swapFor.key, swapFor.name, date, r.id, cur);
                setSwapFor(null);
              }}
              className="flex w-full items-center justify-between rounded-lg border border-line bg-panel2 px-3 py-2.5 text-left hover:border-accent/60"
            >
              <span className="flex items-center gap-2">
                <Avatar rm={r} size="sm" />
                <span className="text-sm font-semibold">{r.name}</span>
              </span>
              <Tag
                className={cn(
                  r.status !== "active" && "text-amber-400 border-amber-400/30",
                )}
              >
                {r.status}
              </Tag>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
