import type { AppState, Chore, LogEntry, Meal, Roommate, Slot } from "./types";

/* ---------------- date helpers ---------------- */

export const pad = (n: number) => String(n).padStart(2, "0");

export function toKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(k: string) {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(k: string, n: number) {
  const d = fromKey(k);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function dayNumber(k: string) {
  const d = fromKey(k);
  return Math.floor(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000,
  );
}

export function prettyDate(k: string) {
  return fromKey(k).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function shortDate(k: string) {
  return fromKey(k).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function relativeLabel(k: string, today: string) {
  if (k === today) return "Today";
  if (k === addDays(today, 1)) return "Tomorrow";
  if (k === addDays(today, -1)) return "Yesterday";
  return shortDate(k);
}

/* ---------------- rotation engine ---------------- */

export interface Assignment {
  choreId: string;
  date: string;
  roommateId: string;
  /** original turn holder before a sick bypass */
  originalId: string | null;
  bypassed: boolean;
  manual: boolean;
  done: boolean;
}

/* ---------------- holiday handling ---------------- */

export const DEFAULT_MEALS: Meal[] = [
  { name: "Holiday Breakfast", time: "08:30 AM", slot: "Morning", icon: "🍳" },
  { name: "Holiday Lunch", time: "01:00 PM", slot: "Afternoon", icon: "🍛" },
  { name: "Holiday Dinner", time: "08:30 PM", slot: "Night", icon: "🍲" },
];

export function isHoliday(state: AppState, date: string) {
  if (state.holidays?.includes(date)) return true;
  return !!state.autoSundayHoliday && fromKey(date).getDay() === 0;
}

export function holidayLabel(state: AppState, date: string) {
  if (state.holidays?.includes(date)) return "Marked Holiday";
  if (state.autoSundayHoliday && fromKey(date).getDay() === 0)
    return "Sunday Holiday";
  return null;
}

/** A single executable duty slot on a given day (a chore, or one holiday meal). */
export interface Session {
  /** unique per day; used for completion/override keys */
  key: string;
  chore: Chore;
  name: string;
  time: string;
  slot: Slot;
  icon: string;
  /** rotation shift so each meal lands on a different flatmate */
  offset: number;
  mealIndex: number; // -1 when not a holiday meal
}

export function sessionsFor(
  state: AppState,
  chore: Chore,
  date: string,
): Session[] {
  const meals = state.holidayMeals?.length ? state.holidayMeals : DEFAULT_MEALS;
  if (chore.cooking && isHoliday(state, date)) {
    return meals.map((m, i) => ({
      key: `${chore.id}#m${i}`,
      chore,
      name: m.name,
      time: m.time,
      slot: m.slot,
      icon: m.icon,
      offset: i,
      mealIndex: i,
    }));
  }
  return [
    {
      key: chore.id,
      chore,
      name: chore.name,
      time: chore.time,
      slot: chore.slot,
      icon: chore.icon,
      offset: 0,
      mealIndex: -1,
    },
  ];
}

/** Every duty slot for a date, holiday meals expanded inline. */
export function daySessions(state: AppState, date: string): Session[] {
  return state.chores.flatMap((c) => sessionsFor(state, c, date));
}

export function periodIndex(chore: Chore, date: string, anchor: string) {
  const diff = dayNumber(date) - dayNumber(anchor);
  if (chore.frequency === "weekly") return Math.floor(diff / 7);
  return diff;
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

export function getAssignment(
  state: AppState,
  session: Session,
  date: string,
): Assignment {
  const chore = session.chore;
  const key = `${session.key}|${date}`;
  const roster = chore.order.filter((id) =>
    state.roommates.some((r) => r.id === id),
  );
  const extra = state.roommates
    .map((r) => r.id)
    .filter((id) => !roster.includes(id));
  const seq = [...roster, ...extra];
  const done = key in state.completed;

  if (state.overrides[key]) {
    return {
      choreId: chore.id,
      date,
      roommateId: state.overrides[key],
      originalId: null,
      bypassed: false,
      manual: true,
      done,
    };
  }

  if (seq.length === 0) {
    return {
      choreId: chore.id,
      date,
      roommateId: "",
      originalId: null,
      bypassed: false,
      manual: false,
      done,
    };
  }

  const idx = mod(
    periodIndex(chore, date, state.anchor) + session.offset,
    seq.length,
  );
  const originalId = seq[idx];
  const statusOf = (id: string) =>
    state.roommates.find((r) => r.id === id)?.status ?? "active";

  let picked = originalId;
  let bypassed = false;
  if (statusOf(originalId) !== "active") {
    for (let i = 1; i <= seq.length; i++) {
      const cand = seq[mod(idx + i, seq.length)];
      if (statusOf(cand) === "active") {
        picked = cand;
        bypassed = true;
        break;
      }
    }
  }

  return {
    choreId: chore.id,
    date,
    roommateId: picked,
    originalId: bypassed ? originalId : null,
    bypassed,
    manual: false,
    done,
  };
}

export function roommateById(state: AppState, id: string): Roommate | undefined {
  return state.roommates.find((r) => r.id === id);
}

export function initials(name: string) {
  return name.trim().charAt(0).toUpperCase();
}

export function firstName(name: string) {
  return name.trim().split(" ")[0];
}

/* ---------------- seed data ---------------- */

const COLORS = [
  "bg-emerald-500",
  "bg-blue-500",
  "bg-amber-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-rose-500",
  "bg-lime-500",
];

export const pickColor = (n: number) => COLORS[n % COLORS.length];

/**
 * A completely empty home. No people, no chores, no history.
 * You add everything yourself from the Roommates and Chore Setup tabs.
 */
export function seedState(): AppState {
  const today = toKey(new Date());

  const roommates: Roommate[] = [];
  const chores: Chore[] = [];
  const logs: LogEntry[] = [];

  return {
    roommates,
    chores,
    logs,
    overrides: {},
    completed: {},
    anchor: today,
    holidays: [],
    autoSundayHoliday: true,
    holidayMeals: DEFAULT_MEALS.map((m) => ({ ...m })),
  };
}

/** No pre-seeded history — the fairness board fills from real completions. */
export const BASE_HISTORY: Record<string, number> = {};
