import { useEffect, useState } from "react";
import {
  Bell,
  BookOpen,
  CalendarCheck,
  CheckSquare,
  Database,
  History,
  KeyRound,
  Moon,
  PartyPopper,
  Pencil,
  RotateCcw,
  Scale,
  ShieldCheck,
  Sparkles,
  Sun,
  UserCircle2,
  Users,
} from "lucide-react";
import { StoreProvider, useStore } from "./lib/store";
import { BRAND } from "./lib/brand";
import TodayRoster from "./components/TodayRoster";
import ForwardSchedule from "./components/ForwardSchedule";
import Roommates from "./components/Roommates";
import ChoreSetup from "./components/ChoreSetup";
import WorkLog from "./components/WorkLog";
import Fairness from "./components/Fairness";
import HolidayMode from "./components/HolidayMode";
import AccessAlerts from "./components/AccessAlerts";
import Guide from "./components/Guide";
import Backend from "./components/Backend";
import AuthScreen from "./components/AuthScreen";
import Profile from "./components/Profile";
import { Avatar, Btn, Modal } from "./components/ui";
import { cn } from "./utils/cn";

type TabId =
  | "guide"
  | "today"
  | "forward"
  | "holiday"
  | "mates"
  | "chores"
  | "logs"
  | "fair"
  | "profile"
  | "access"
  | "backend";

function Shell() {
  const {
    state,
    theme,
    toggleTheme,
    reset,
    me,
    isAdmin,
    signInAs,
    markAllRead,
    clearNotices,
    setFlatName,
    pending,
    createNewHome,
    joinExistingHome,
  } = useStore();

  const urlCode = new URLSearchParams(location.search).get("code");
  const [showAuth, setShowAuth] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(state.flatName ?? "");
  const [tab, setTab] = useState<TabId>(() =>
    localStorage.getItem("roommates-welcomed") ? "today" : "guide",
  );
  const [inbox, setInbox] = useState(false);
  const [welcome, setWelcome] = useState(
    () => !localStorage.getItem("roommates-welcomed"),
  );
  const closeWelcome = () => {
    localStorage.setItem("roommates-welcomed", "1");
    setWelcome(false);
  };

  const copyInvite = () => {
    const url = `${location.origin}${location.pathname}?code=${state.joinCode ?? ""}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* lets any empty-state button jump to another tab */
  useEffect(() => {
    const go = (e: Event) => setTab((e as CustomEvent).detail as TabId);
    window.addEventListener("rm:go", go);
    return () => window.removeEventListener("rm:go", go);
  }, []);
  const notices = state.notices ?? [];
  const unread = notices.filter((n) => !n.read).length;

  /* `admin: true` = hidden from members entirely */
  const allTabs: {
    id: TabId;
    label: string;
    icon: React.ReactNode;
    admin?: boolean;
    badge?: number;
  }[] = [
    { id: "today", label: "Today's Roster", icon: <CalendarCheck size={15} /> },
    { id: "forward", label: "Forward Schedule", icon: <Sparkles size={15} /> },
    {
      id: "holiday",
      label: `Holiday Mode (${state.holidayMeals.length}x Cooking)`,
      icon: <PartyPopper size={15} />,
    },
    {
      id: "mates",
      label: `Roommates (${state.roommates.length})`,
      icon: <Users size={15} />,
    },
    {
      id: "chores",
      label: `Chore Setup (${state.chores.length})`,
      icon: <CheckSquare size={15} />,
      badge: isAdmin && pending.length > 0 ? pending.length : undefined,
    },
    { id: "logs", label: "Previous Work Data", icon: <History size={15} /> },
    { id: "fair", label: "Fairness Score", icon: <Scale size={15} /> },
    { id: "profile", label: "Profiles", icon: <UserCircle2 size={15} /> },
    {
      id: "access",
      label: "Access & Alerts",
      icon: <ShieldCheck size={15} />,
      admin: true,
    },
    {
      id: "backend",
      label: "Database & Setup",
      icon: <Database size={15} />,
      admin: true,
    },
  ];
  const tabs = allTabs.filter((t) => isAdmin || !t.admin);

  /* if a member is somehow on an admin page, bounce them home */
  useEffect(() => {
    const t = allTabs.find((x) => x.id === tab);
    if (t?.admin && !isAdmin) setTab("today");
  }, [isAdmin, tab]);

  if (!state.roommates.length || showAuth || !!urlCode) {
    return (
      <AuthScreen
        initialCode={urlCode}
        currentHomeName={state.flatName}
        onCancel={state.roommates.length > 0 ? () => setShowAuth(false) : undefined}
        onCreate={async (fName, aName, phone) => {
          await createNewHome(fName, aName, phone);
          setShowAuth(false);
          if (urlCode) history.replaceState(null, "", location.pathname);
        }}
        onJoin={async (code, name, phone) => {
          const err = await joinExistingHome(code, name, phone);
          if (!err) {
            setShowAuth(false);
            if (urlCode) history.replaceState(null, "", location.pathname);
          }
          return err;
        }}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-gradient-to-br from-emerald-500/20 to-sky-500/20 text-sm font-extrabold">
              {BRAND.short}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight">
                  {BRAND.name}
                </h1>
                {editingName ? (
                  <input
                    autoFocus
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onBlur={() => {
                      setFlatName(draftName);
                      setEditingName(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setFlatName(draftName);
                        setEditingName(false);
                      }
                      if (e.key === "Escape") setEditingName(false);
                    }}
                    className="w-32 rounded-md border border-accent/60 bg-panel2 px-2 py-0.5 font-mono text-[10px] text-ink outline-none"
                  />
                ) : (
                  <button
                    onClick={() => {
                      if (!isAdmin) return;
                      setDraftName(state.flatName ?? "");
                      setEditingName(true);
                    }}
                    title={isAdmin ? "Click to rename your home" : undefined}
                    className={cn(
                      "group flex items-center gap-1 rounded-md border border-line bg-panel2 px-2 py-0.5 font-mono text-[10px] text-muted",
                      isAdmin && "hover:border-accent/50 hover:text-ink",
                    )}
                  >
                    {state.flatName ?? BRAND.flat}
                    {isAdmin && (
                      <Pencil
                        size={9}
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    )}
                  </button>
                )}
              </div>
              <p className="text-[11px] text-muted">{BRAND.tagline}</p>
            </div>
          </div>
          <div className="relative flex items-center gap-2">
            {/* signed-in roommate switcher */}
            {state.roommates.length > 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-line bg-panel px-2 py-1.5">
                <Avatar rm={me} size="sm" />
                <select
                  value={state.currentUserId}
                  onChange={(e) => signInAs(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-ink outline-none"
                >
                  {state.roommates.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                    isAdmin
                      ? "bg-amber-500/15 text-amber-400"
                      : "bg-panel2 text-muted",
                  )}
                >
                  {isAdmin ? "Admin" : "Member"}
                </span>
              </div>
            ) : null}

            {/* Share Join Code Button */}
            {state.joinCode && (
              <button
                onClick={copyInvite}
                title="Click to copy shareable invite link for your roommates"
                className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-2 font-mono text-xs font-bold text-accent transition-colors hover:bg-accent/20"
              >
                <KeyRound size={13} />
                {copied ? "Copied!" : state.joinCode}
              </button>
            )}

            {/* start here / help */}
            <button
              onClick={() => setTab("guide")}
              title="Start Here — how Room Mates works"
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition-colors",
                tab === "guide"
                  ? "border-accent/50 bg-accent/10 text-accent"
                  : "border-line bg-panel text-muted hover:text-ink",
              )}
            >
              <BookOpen size={15} />
              <span className="hidden sm:inline">Start Here</span>
            </button>

            {/* notification inbox */}
            <button
              onClick={() => {
                setInbox((v) => !v);
                if (!inbox) markAllRead();
              }}
              className="relative rounded-lg border border-line bg-panel p-2 text-muted hover:text-ink"
            >
              <Bell size={15} />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {unread}
                </span>
              )}
            </button>
            {inbox && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setInbox(false)}
                />
                <div className="absolute top-12 right-0 z-40 w-80 rounded-xl border border-line bg-panel shadow-2xl">
                  <div className="flex items-center justify-between border-b border-line px-3 py-2">
                    <span className="text-xs font-bold">Notifications</span>
                    <button
                      onClick={clearNotices}
                      className="text-[11px] text-muted hover:text-ink"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notices.length === 0 && (
                      <p className="p-6 text-center text-xs text-muted">
                        No alerts yet. Duty reminders will appear here
                        automatically.
                      </p>
                    )}
                    {notices.map((n) => (
                      <div
                        key={n.id}
                        className="border-b border-line px-3 py-2.5 last:border-0"
                      >
                        <p className="text-xs font-bold">{n.title}</p>
                        <p className="mt-0.5 text-[11px] text-muted">{n.body}</p>
                        <p className="mt-1 font-mono text-[10px] text-muted">
                          {new Date(n.at).toLocaleTimeString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <button
              onClick={() => {
                if (
                  confirm(
                    "Erase everything — roommates, chores, history and holidays?\n\nThis cannot be undone.",
                  )
                )
                  reset();
              }}
              className="flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-xs font-semibold text-muted hover:text-ink"
            >
              <RotateCcw size={13} /> Clear All Data
            </button>
            <button
              onClick={toggleTheme}
              className="rounded-lg border border-line bg-panel p-2 text-muted hover:text-ink"
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>
      </header>

      <nav className="border-b border-line">
        <div className="mx-auto max-w-7xl overflow-x-auto px-6">
          <div className="flex min-w-max items-center gap-1 py-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-colors",
                  tab === t.id
                    ? "border border-line bg-panel text-ink"
                    : "border border-transparent text-muted hover:text-ink",
                )}
              >
                {t.icon}
                {t.label}
                {t.badge !== undefined && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-black">
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">
        {tab === "guide" && <Guide onGo={(t) => setTab(t as TabId)} />}
        {tab === "today" && <TodayRoster />}
        {tab === "forward" && <ForwardSchedule />}
        {tab === "holiday" && <HolidayMode />}
        {tab === "mates" && <Roommates />}
        {tab === "chores" && <ChoreSetup />}
        {tab === "logs" && <WorkLog />}
        {tab === "fair" && <Fairness />}
        {tab === "profile" && <Profile />}
        {tab === "access" && isAdmin && <AccessAlerts />}
        {tab === "backend" && isAdmin && <Backend />}
      </main>

      <Modal
        open={welcome}
        onClose={closeWelcome}
        title={`Welcome to ${BRAND.name} 👋`}
      >
        <p className="text-sm leading-relaxed text-muted">
          This app decides whose turn it is to cook, wash the dishes and clean —
          fairly, and automatically. Nobody has to keep track anymore.
        </p>
        <ul className="mt-3 space-y-2 text-xs">
          {[
            "Today's Roster shows the jobs for today and whose name is on each one.",
            "Tap “Mark Task Completed” when you finish. Tap “Sick?” to pass your turn.",
            "Reminders arrive before your turn, so you never have to be nagged.",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              {t}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-2">
          <Btn
            variant="solid"
            className="flex-1"
            onClick={() => {
              setTab("guide");
              closeWelcome();
            }}
          >
            Show me how it works
          </Btn>
          <Btn
            onClick={() => {
              setTab("today");
              closeWelcome();
            }}
          >
            Skip
          </Btn>
        </div>
      </Modal>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-6 py-4 text-[11px] text-muted">
          <span>{BRAND.footer}</span>
          <span>Automatic Sick Reassignment & Work Logs Active</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
