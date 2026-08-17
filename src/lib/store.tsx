import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  AppState,
  ChangeRequest,
  Channels,
  Chore,
  RequestKind,
  LogAction,
  Meal,
  Notice,
  Role,
  Roommate,
  Rules,
  Status,
} from "./types";
import { DEFAULT_MEALS, isHoliday, pad, pickColor, seedState, toKey } from "./engine";
import {
  DEFAULT_CHANNELS,
  DEFAULT_RULES,
  makeJoinCode,
  useReminderEngine,
} from "./notify";
import { FLAT_ID, db } from "./db";
import { BRAND } from "./brand";

// v2 = demo data removed. Bumping the key means any browser still holding the
// old seeded flat starts fresh instead of resurrecting Rahul, Vikram & co.
const KEY = "roommates-state-v2";
const THEME_KEY = "roommates-theme";

interface Ctx {
  state: AppState;
  today: string;
  theme: "dark" | "light";
  toggleTheme: () => void;
  reset: () => void;
  log: (e: {
    choreId: string;
    choreName: string;
    roommateId: string;
    detail: string;
    date: string;
    action: LogAction;
  }) => void;
  complete: (choreId: string, choreName: string, date: string, roommateId: string) => void;
  uncomplete: (choreId: string, date: string) => void;
  swap: (choreId: string, choreName: string, date: string, roommateId: string, fromId: string) => void;
  setStatus: (roommateId: string, status: Status) => void;
  addRoommate: (name: string, phone: string) => void;
  /** someone accepting an invite adds themselves and is signed in */
  joinFlat: (name: string, phone: string) => string;
  setFlatName: (name: string) => void;
  removeRoommate: (id: string) => void;
  addChore: (c: Omit<Chore, "id" | "order" | "custom">) => void;
  editChore: (id: string, patch: Partial<Chore>) => void;
  removeChore: (id: string) => void;
  /* member change requests */
  requestChange: (r: {
    kind: RequestKind;
    choreId: string;
    choreName: string;
    payload?: Partial<Chore>;
    summary: string;
    note?: string;
  }) => void;
  approveRequest: (id: string) => void;
  rejectRequest: (id: string, reason?: string) => void;
  pending: ChangeRequest[];
  toggleHoliday: (date: string) => void;
  setAutoSunday: (v: boolean) => void;
  updateMeal: (index: number, patch: Partial<Meal>) => void;
  isHolidayDate: (date: string) => boolean;
  /* access & alerts */
  me: Roommate | undefined;
  isAdmin: boolean;
  signInAs: (id: string) => void;
  setRole: (id: string, role: Role) => void;
  setChannel: (id: string, ch: keyof Channels, v: boolean) => void;
  updateMate: (id: string, patch: Partial<Roommate>) => void;
  setRules: (patch: Partial<Rules>) => void;
  regenCode: () => void;
  emit: (n: Omit<Notice, "id" | "read">) => void;
  markAllRead: () => void;
  clearNotices: () => void;
}

const StoreCtx = createContext<Ctx | null>(null);

/** fill in every field added after the first release */
function normalize(s: AppState): AppState {
  const roommates = s.roommates.map((r, i) => ({
    ...r,
    role: r.role ?? (i === 0 ? "admin" : "member"),
    email:
      r.email ?? `${r.name.split(" ")[0].toLowerCase().replace(/\W/g, "")}@flat402.in`,
    channels: r.channels ?? { ...DEFAULT_CHANNELS },
    joined: r.joined ?? true,
  }));
  return {
    ...s,
    roommates,
    chores: s.chores.map((c) =>
      c.cooking === undefined && /cook/i.test(c.name) ? { ...c, cooking: true } : c,
    ),
    holidays: s.holidays ?? [],
    autoSundayHoliday: s.autoSundayHoliday ?? true,
    holidayMeals: s.holidayMeals?.length
      ? s.holidayMeals
      : DEFAULT_MEALS.map((m) => ({ ...m })),
    flatName: s.flatName ?? BRAND.flat,
    currentUserId: s.currentUserId ?? roommates[0]?.id ?? "",
    joinCode: s.joinCode ?? makeJoinCode(),
    rules: { ...DEFAULT_RULES, ...(s.rules ?? {}) },
    notices: s.notices ?? [],
    requests: s.requests ?? [],
  };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.roommates && parsed.chores) return normalize(parsed);
    }
  } catch {
    /* ignore */
  }
  return normalize(seedState());
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load);
  const [theme, setTheme] = useState<"dark" | "light">(
    () => (localStorage.getItem(THEME_KEY) as "dark" | "light") || "dark",
  );
  const today = useMemo(() => toKey(new Date()), []);

  /* persist through the data adapter (localStorage or Postgres) */
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state));
    if (db.backend !== "local") {
      const t = setTimeout(() => {
        db.save(FLAT_ID, state).catch(() => {});
      }, 800); // debounce so typing doesn't hammer the API
      return () => clearTimeout(t);
    }
  }, [state]);

  /* hydrate from the remote database, then listen for other people's edits */
  useEffect(() => {
    let cancelled = false;
    if (db.backend !== "local") {
      db.load(FLAT_ID)
        .then((remote) => {
          if (remote && !cancelled) setState(normalize(remote));
        })
        .catch(() => {});
    }
    const off = db.subscribe(FLAT_ID, (remote) => {
      if (!cancelled) setState(normalize(remote));
    });
    return () => {
      cancelled = true;
      off();
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const nowTime = () => {
    const d = new Date();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const log: Ctx["log"] = useCallback((e) => {
    setState((s) => ({
      ...s,
      logs: [
        {
          id: `l${Date.now()}${Math.random().toString(16).slice(2, 6)}`,
          time: nowTime(),
          ...e,
        },
        ...s.logs,
      ],
    }));
  }, []);

  const complete: Ctx["complete"] = useCallback(
    (choreId, choreName, date, roommateId) => {
      setState((s) => ({
        ...s,
        completed: { ...s.completed, [`${choreId}|${date}`]: roommateId },
        logs: [
          {
            id: `l${Date.now()}${Math.random().toString(16).slice(2, 6)}`,
            choreId,
            choreName,
            roommateId,
            detail: "Duty marked completed",
            date,
            time: nowTime(),
            action: "completed" as LogAction,
          },
          ...s.logs,
        ],
      }));
    },
    [],
  );

  const uncomplete: Ctx["uncomplete"] = useCallback((choreId, date) => {
    setState((s) => {
      const completed = { ...s.completed };
      delete completed[`${choreId}|${date}`];
      return { ...s, completed };
    });
  }, []);

  const swap: Ctx["swap"] = useCallback((choreId, choreName, date, roommateId, fromId) => {
    setState((s) => ({
      ...s,
      overrides: { ...s.overrides, [`${choreId}|${date}`]: roommateId },
      logs: [
        {
          id: `l${Date.now()}${Math.random().toString(16).slice(2, 6)}`,
          choreId,
          choreName,
          roommateId,
          detail: `Duty reassigned from ${
            s.roommates.find((r) => r.id === fromId)?.name ?? "roster"
          }`,
          date,
          time: nowTime(),
          action: "swap" as LogAction,
        },
        ...s.logs,
      ],
    }));
  }, []);

  const setStatus: Ctx["setStatus"] = useCallback((roommateId, status) => {
    setState((s) => {
      const rm = s.roommates.find((r) => r.id === roommateId);
      const extraLog =
        status !== "active" && rm
          ? [
              {
                id: `l${Date.now()}${Math.random().toString(16).slice(2, 6)}`,
                choreId: "-",
                choreName: "Roster Bypass",
                roommateId,
                detail: `${rm.name} marked ${status} — duties auto-passed to next in rotation`,
                date: toKey(new Date()),
                time: nowTime(),
                action: "sick-reassign" as LogAction,
              },
            ]
          : [];
      return {
        ...s,
        roommates: s.roommates.map((r) =>
          r.id === roommateId ? { ...r, status } : r,
        ),
        logs: [...extraLog, ...s.logs],
      };
    });
  }, []);

  const addRoommate: Ctx["addRoommate"] = useCallback((name, phone) => {
    setState((s) => {
      const id = `r${Date.now().toString(36)}`;
      const nr: Roommate = {
        id,
        name,
        phone,
        color: pickColor(s.roommates.length),
        status: "active",
        joinedAt: new Date().toISOString(),
      } as Roommate & { joinedAt: string };
      const first = s.roommates.length === 0;
      return {
        ...s,
        // the first person added becomes the admin and the signed-in user
        roommates: [...s.roommates, first ? { ...nr, role: "admin" as const } : nr],
        chores: s.chores.map((c) => ({ ...c, order: [...c.order, id] })),
        currentUserId: first ? id : s.currentUserId,
      };
    });
  }, []);

  const joinFlat: Ctx["joinFlat"] = useCallback((name, phone) => {
    const id = `r${Date.now().toString(36)}`;
    setState((s) => {
      const first = s.roommates.length === 0;
      const nr: Roommate = {
        id,
        name,
        phone,
        color: pickColor(s.roommates.length),
        status: "active",
        role: first ? "admin" : "member",
        email: `${name.split(" ")[0].toLowerCase().replace(/\W/g, "")}@flat.local`,
        channels: { ...DEFAULT_CHANNELS },
        joined: true,
        joinedAt: new Date().toISOString(),
      } as Roommate & { joinedAt: string };
      return {
        ...s,
        roommates: [...s.roommates, nr],
        chores: s.chores.map((c) => ({ ...c, order: [...c.order, id] })),
        currentUserId: id,
        notices: [
          {
            id: `n${Date.now()}`,
            kind: "system" as const,
            title: `🎉 ${name.split(" ")[0]} joined ${s.flatName ?? "the home"}`,
            body: first
              ? "You're the first one here, so you're the admin. Add your chores next."
              : "You've been added to every chore rotation. Your first turn is on the roster.",
            target: id,
            at: new Date().toISOString(),
            read: false,
          },
          ...(s.notices ?? []),
        ],
      };
    });
    return id;
  }, []);

  const setFlatName: Ctx["setFlatName"] = useCallback((name) => {
    setState((s) => ({ ...s, flatName: name.trim() || "My Home" }));
  }, []);

  const removeRoommate: Ctx["removeRoommate"] = useCallback((id) => {
    setState((s) => ({
      ...s,
      roommates: s.roommates.filter((r) => r.id !== id),
      chores: s.chores.map((c) => ({
        ...c,
        order: c.order.filter((x) => x !== id),
      })),
    }));
  }, []);

  const addChore: Ctx["addChore"] = useCallback((c) => {
    setState((s) => ({
      ...s,
      chores: [
        ...s.chores,
        {
          ...c,
          id: `c${Date.now().toString(36)}`,
          custom: true,
          order: s.roommates.map((r) => r.id),
        },
      ],
    }));
  }, []);

  const editChore: Ctx["editChore"] = useCallback((id, patch) => {
    setState((s) => ({
      ...s,
      chores: s.chores.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }, []);

  const removeChore: Ctx["removeChore"] = useCallback((id) => {
    setState((s) => ({ ...s, chores: s.chores.filter((c) => c.id !== id) }));
  }, []);

  /* ---------------- member change requests ---------------- */

  const requestChange: Ctx["requestChange"] = useCallback((r) => {
    setState((s) => {
      const me = s.roommates.find((x) => x.id === s.currentUserId);
      const req: ChangeRequest = {
        id: `q${Date.now().toString(36)}`,
        status: "pending",
        byId: me?.id ?? "",
        byName: me?.name ?? "A roommate",
        at: new Date().toISOString(),
        ...r,
      };
      const admins = s.roommates.filter((x) => x.role === "admin");
      return {
        ...s,
        requests: [req, ...(s.requests ?? [])],
        // one notice per admin so it lands in their inbox
        notices: [
          ...admins.map((a, i) => ({
            id: `n${Date.now()}${i}`,
            kind: "system" as const,
            title: `📝 ${req.byName} requested a chore change`,
            body: `${req.summary} — open Chore Setup to approve or decline.`,
            target: a.id,
            at: new Date().toISOString(),
            read: false,
          })),
          ...(s.notices ?? []),
        ],
      };
    });
  }, []);

  const applyRequest = (s: AppState, req: ChangeRequest): AppState["chores"] => {
    if (req.kind === "delete")
      return s.chores.filter((c) => c.id !== req.choreId);
    if (req.kind === "edit")
      return s.chores.map((c) =>
        c.id === req.choreId ? { ...c, ...(req.payload ?? {}) } : c,
      );
    // add
    return [
      ...s.chores,
      {
        id: `c${Date.now().toString(36)}`,
        name: req.choreName,
        desc: "Requested by a roommate",
        icon: "🧽",
        time: "07:00 PM",
        frequency: "daily",
        slot: "Morning",
        custom: true,
        order: s.roommates.map((r) => r.id),
        ...(req.payload ?? {}),
      } as Chore,
    ];
  };

  const approveRequest: Ctx["approveRequest"] = useCallback((id) => {
    setState((s) => {
      const req = (s.requests ?? []).find((r) => r.id === id);
      if (!req) return s;
      const admin = s.roommates.find((x) => x.id === s.currentUserId);
      return {
        ...s,
        chores: applyRequest(s, req),
        requests: (s.requests ?? []).map((r) =>
          r.id === id
            ? {
                ...r,
                status: "approved" as const,
                decidedBy: admin?.name,
                decidedAt: new Date().toISOString(),
              }
            : r,
        ),
        notices: [
          {
            id: `n${Date.now()}`,
            kind: "system" as const,
            title: "✅ Your chore request was approved",
            body: `${admin?.name ?? "The admin"} approved: ${req.summary}`,
            target: req.byId,
            at: new Date().toISOString(),
            read: false,
          },
          ...(s.notices ?? []),
        ],
      };
    });
  }, []);

  const rejectRequest: Ctx["rejectRequest"] = useCallback((id, reason) => {
    setState((s) => {
      const req = (s.requests ?? []).find((r) => r.id === id);
      if (!req) return s;
      const admin = s.roommates.find((x) => x.id === s.currentUserId);
      return {
        ...s,
        requests: (s.requests ?? []).map((r) =>
          r.id === id
            ? {
                ...r,
                status: "rejected" as const,
                decidedBy: admin?.name,
                decidedAt: new Date().toISOString(),
                reason,
              }
            : r,
        ),
        notices: [
          {
            id: `n${Date.now()}`,
            kind: "system" as const,
            title: "❌ Your chore request was declined",
            body: reason
              ? `${admin?.name ?? "The admin"} said: ${reason}`
              : `${admin?.name ?? "The admin"} declined: ${req.summary}`,
            target: req.byId,
            at: new Date().toISOString(),
            read: false,
          },
          ...(s.notices ?? []),
        ],
      };
    });
  }, []);

  const toggleHoliday: Ctx["toggleHoliday"] = useCallback((date) => {
    setState((s) => {
      const on = s.holidays.includes(date);
      const holidays = on
        ? s.holidays.filter((d) => d !== date)
        : [...s.holidays, date].sort();
      return {
        ...s,
        holidays,
        logs: [
          {
            id: `l${Date.now()}${Math.random().toString(16).slice(2, 6)}`,
            choreId: "-",
            choreName: "Holiday Mode",
            roommateId: "",
            detail: on
              ? `${date} unmarked — cooking back to a single duty`
              : `${date} marked as holiday — cooking split into ${s.holidayMeals.length} sessions`,
            date,
            time: nowTime(),
            action: "holiday" as LogAction,
          },
          ...s.logs,
        ],
      };
    });
  }, []);

  const setAutoSunday: Ctx["setAutoSunday"] = useCallback((v) => {
    setState((s) => ({ ...s, autoSundayHoliday: v }));
  }, []);

  const updateMeal: Ctx["updateMeal"] = useCallback((index, patch) => {
    setState((s) => ({
      ...s,
      holidayMeals: s.holidayMeals.map((m, i) =>
        i === index ? { ...m, ...patch } : m,
      ),
    }));
  }, []);

  /* ---------------- access & alerts ---------------- */

  const emit: Ctx["emit"] = useCallback((n) => {
    setState((s) => ({
      ...s,
      notices: [
        { id: `n${Date.now()}${Math.random().toString(16).slice(2, 6)}`, read: false, ...n },
        ...(s.notices ?? []),
      ].slice(0, 60),
    }));
  }, []);

  const signInAs: Ctx["signInAs"] = useCallback((id) => {
    setState((s) => ({ ...s, currentUserId: id }));
  }, []);

  const setRole: Ctx["setRole"] = useCallback((id, role) => {
    setState((s) => ({
      ...s,
      roommates: s.roommates.map((r) => (r.id === id ? { ...r, role } : r)),
    }));
  }, []);

  const setChannel: Ctx["setChannel"] = useCallback((id, ch, v) => {
    setState((s) => ({
      ...s,
      roommates: s.roommates.map((r) =>
        r.id === id
          ? { ...r, channels: { ...DEFAULT_CHANNELS, ...r.channels, [ch]: v } }
          : r,
      ),
    }));
  }, []);

  const updateMate: Ctx["updateMate"] = useCallback((id, patch) => {
    setState((s) => ({
      ...s,
      roommates: s.roommates.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  }, []);

  const setRules: Ctx["setRules"] = useCallback((patch) => {
    setState((s) => ({
      ...s,
      rules: { ...DEFAULT_RULES, ...(s.rules ?? {}), ...patch },
    }));
  }, []);

  const regenCode: Ctx["regenCode"] = useCallback(() => {
    setState((s) => ({ ...s, joinCode: makeJoinCode() }));
  }, []);

  const markAllRead: Ctx["markAllRead"] = useCallback(() => {
    setState((s) => ({
      ...s,
      notices: (s.notices ?? []).map((n) => ({ ...n, read: true })),
    }));
  }, []);

  const clearNotices: Ctx["clearNotices"] = useCallback(() => {
    setState((s) => ({ ...s, notices: [] }));
  }, []);

  useReminderEngine(state, emit, true);

  const reset = useCallback(() => {
    setState(normalize(seedState()));
  }, []);

  const value: Ctx = {
    state,
    today,
    theme,
    toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    reset,
    log,
    complete,
    uncomplete,
    swap,
    setStatus,
    addRoommate,
    joinFlat,
    setFlatName,
    removeRoommate,
    addChore,
    editChore,
    removeChore,
    requestChange,
    approveRequest,
    rejectRequest,
    pending: (state.requests ?? []).filter((r) => r.status === "pending"),
    toggleHoliday,
    setAutoSunday,
    updateMeal,
    isHolidayDate: (date: string) => isHoliday(state, date),
    me: state.roommates.find((r) => r.id === state.currentUserId),
    // an empty home has no admin yet — whoever is setting it up gets full rights
    isAdmin:
      state.roommates.length === 0 ||
      (state.roommates.find((r) => r.id === state.currentUserId)?.role ??
        "member") === "admin",
    signInAs,
    setRole,
    setChannel,
    updateMate,
    setRules,
    regenCode,
    emit,
    markAllRead,
    clearNotices,
  };

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
