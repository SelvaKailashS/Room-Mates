import { useState } from "react";
import {
  ArrowRight,
  BellRing,
  Check,
  Home,
  PartyPopper,
  Scale,
  Users,
} from "lucide-react";
import { useStore } from "../lib/store";
import { BRAND } from "../lib/brand";
import { firstName } from "../lib/engine";
import { Avatar, Btn, Field, inputCls } from "./ui";
import { cn } from "../utils/cn";

/**
 * Shown full-screen when someone opens an invite link (?code=FLAT-XXXX-402)
 * or when the home is brand new. Welcomes them, then asks for their details
 * using the same Add Roommate fields the admin sees.
 */
export default function JoinFlow({
  code,
  onDone,
}: {
  code: string | null;
  onDone: () => void;
}) {
  const { state, joinFlat } = useStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [welcomed, setWelcomed] = useState<string | null>(null);

  const flat = state.flatName ?? BRAND.flat;
  const codeOk = !code || code.toUpperCase() === (state.joinCode ?? "").toUpperCase();
  const existing = state.roommates;
  const isFirst = existing.length === 0;

  /* ---------- step 2: the welcome message ---------- */
  if (welcomed) {
    const me = state.roommates.find((r) => r.id === welcomed);
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-6">
        <div className="cm-in w-full max-w-lg text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-accent/40 bg-accent/10 text-4xl">
            🎉
          </div>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight">
            Welcome to {flat},<br />
            {me ? firstName(me.name) : "friend"}!
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
            {isFirst
              ? "You're the first one here, so you're the admin. Add your housemates and the chores you want shared, and Room Mates will handle the turns from there."
              : `You've been added to the end of every chore's rotation. From now on ${flat} will tell you exactly when it's your turn — no more guessing, no more nagging.`}
          </p>

          <div className="mt-6 flex items-center justify-center gap-2">
            <Avatar rm={me} size="lg" />
            <div className="text-left">
              <p className="text-sm font-bold">{me?.name}</p>
              <p className="font-mono text-[11px] text-muted">{me?.phone}</p>
            </div>
            {me?.role === "admin" && (
              <span className="ml-1 rounded bg-amber-500/15 px-2 py-1 text-[9px] font-bold text-amber-400 uppercase">
                Admin
              </span>
            )}
          </div>

          <div className="mt-6 grid gap-2 text-left sm:grid-cols-3">
            {[
              {
                i: <Users size={14} />,
                t: "Fair turns",
                d: "Everyone gets an equal share, automatically.",
              },
              {
                i: <BellRing size={14} />,
                t: "Reminders",
                d: "A nudge before your turn starts.",
              },
              {
                i: <Scale size={14} />,
                t: "No arguments",
                d: "Every completed chore is logged.",
              },
            ].map((b) => (
              <div
                key={b.t}
                className="rounded-xl border border-line bg-panel2 p-3"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-panel text-accent">
                  {b.i}
                </span>
                <p className="mt-2 text-xs font-bold">{b.t}</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
                  {b.d}
                </p>
              </div>
            ))}
          </div>

          <Btn variant="solid" className="mt-6 w-full py-3" onClick={onDone}>
            {isFirst ? "Set up my home" : "See today's roster"}{" "}
            <ArrowRight size={14} />
          </Btn>
        </div>
      </div>
    );
  }

  /* ---------- step 1: the join form ---------- */
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="cm-in w-full max-w-md">
        <div className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-gradient-to-br from-emerald-500/20 to-sky-500/20 text-lg font-extrabold">
            {BRAND.short}
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
            {isFirst ? `Welcome to ${BRAND.name}` : `You're invited to ${flat}`}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {isFirst
              ? "Let's start by adding you. Whoever joins first becomes the admin."
              : `${existing.length} ${existing.length === 1 ? "person" : "people"} already share this home. Add your details to join the rotation.`}
          </p>

          {code && (
            <span
              className={cn(
                "mt-3 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[11px] font-bold",
                codeOk
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-red-500/40 bg-red-500/10 text-red-400",
              )}
            >
              {codeOk ? <Check size={11} /> : null}
              {code.toUpperCase()}
            </span>
          )}
        </div>

        {existing.length > 0 && (
          <div className="mt-5 flex items-center justify-center gap-2">
            <span className="flex -space-x-2">
              {existing.slice(0, 6).map((r) => (
                <Avatar key={r.id} rm={r} size="sm" ring />
              ))}
            </span>
            <span className="text-[11px] text-muted">
              {existing
                .slice(0, 3)
                .map((r) => firstName(r.name))
                .join(", ")}
              {existing.length > 3 && ` +${existing.length - 3} more`}
            </span>
          </div>
        )}

        <form
          className="mt-6 space-y-3 rounded-2xl border border-line bg-panel p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            const id = joinFlat(name.trim(), phone.trim() || "—");
            setWelcomed(id);
          }}
        >
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Home size={15} className="text-muted" /> Add Roommate
          </h2>

          <Field label="Full Name">
            <input
              autoFocus
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Karthik Raj"
            />
          </Field>

          <Field label="Phone">
            <input
              className={inputCls}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 90000 00000"
            />
          </Field>

          <p className="flex items-start gap-2 rounded-lg border border-line bg-panel2 p-2.5 text-[11px] leading-relaxed text-muted">
            <PartyPopper size={13} className="mt-0.5 shrink-0 text-accent" />
            New flatmates are appended to the end of every chore&apos;s
            round-robin sequence.
          </p>

          <Btn
            type="submit"
            variant="solid"
            className="w-full py-2.5"
            disabled={!name.trim()}
          >
            Join {flat} <ArrowRight size={14} />
          </Btn>
        </form>

        <button
          onClick={onDone}
          className="mx-auto mt-4 block text-[11px] text-muted hover:text-ink"
        >
          Just looking around — skip for now
        </button>
      </div>
    </div>
  );
}
