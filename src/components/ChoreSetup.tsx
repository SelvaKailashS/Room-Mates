import { useState } from "react";
import {
  CalendarDays,
  Check,
  Clock,
  Inbox,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useStore } from "../lib/store";
import { firstName, roommateById } from "../lib/engine";
import {
  Avatar,
  Btn,
  Card,
  Empty,
  Field,
  Modal,
  SectionHead,
  Tag,
  inputCls,
} from "./ui";
import { cn } from "../utils/cn";
import type { Chore, Frequency, Slot } from "../lib/types";

const blank = {
  name: "",
  desc: "",
  icon: "🧽",
  time: "07:00 PM",
  frequency: "daily" as Frequency,
  slot: "Morning" as Slot,
  cooking: false,
};

export default function ChoreSetup() {
  const {
    state,
    isAdmin,
    me,
    addChore,
    editChore,
    removeChore,
    requestChange,
    approveRequest,
    rejectRequest,
    pending,
  } = useStore();

  const [form, setForm] = useState<typeof blank | null>(null);
  const [editing, setEditing] = useState<Chore | null>(null);
  const [note, setNote] = useState("");

  const myPending = (state.requests ?? []).filter(
    (r) => r.status === "pending" && r.byId === me?.id,
  );
  const myRecent = (state.requests ?? [])
    .filter((r) => r.byId === me?.id && r.status !== "pending")
    .slice(0, 3);

  const openAdd = () => {
    setEditing(null);
    setNote("");
    setForm({ ...blank });
  };

  const openEdit = (c: Chore) => {
    setEditing(c);
    setNote("");
    setForm({
      name: c.name,
      desc: c.desc,
      icon: c.icon,
      time: c.time,
      frequency: c.frequency,
      slot: c.slot,
      cooking: !!c.cooking,
    });
  };

  /** describe what changed, for the admin to read at a glance */
  const diff = (c: Chore, f: typeof blank) => {
    const parts: string[] = [];
    if (c.name !== f.name) parts.push(`name → "${f.name}"`);
    if (c.time !== f.time) parts.push(`time → ${f.time}`);
    if (c.frequency !== f.frequency) parts.push(`frequency → ${f.frequency}`);
    if (c.slot !== f.slot) parts.push(`slot → ${f.slot}`);
    if (c.desc !== f.desc) parts.push("description updated");
    if (!!c.cooking !== f.cooking)
      parts.push(f.cooking ? "marked as cooking duty" : "no longer a cooking duty");
    return parts.length ? parts.join(", ") : "no visible changes";
  };

  const submit = () => {
    if (!form?.name.trim()) return;
    const payload = { ...form, name: form.name.trim() };

    if (isAdmin) {
      if (editing) editChore(editing.id, payload);
      else addChore(payload);
    } else {
      requestChange({
        kind: editing ? "edit" : "add",
        choreId: editing?.id ?? "",
        choreName: payload.name,
        payload,
        summary: editing
          ? `Edit "${editing.name}": ${diff(editing, form)}`
          : `Add new chore "${payload.name}" (${payload.frequency}, ${payload.time})`,
        note: note.trim() || undefined,
      });
    }
    setForm(null);
    setEditing(null);
  };

  const askDelete = (c: Chore) => {
    if (isAdmin) {
      if (confirm(`Delete "${c.name}"? This removes it from everyone's roster.`))
        removeChore(c.id);
    } else {
      const why = prompt(`Why should "${c.name}" be removed?`) ?? "";
      requestChange({
        kind: "delete",
        choreId: c.id,
        choreName: c.name,
        summary: `Remove the chore "${c.name}"`,
        note: why.trim() || undefined,
      });
    }
  };

  return (
    <div className="cm-in space-y-5">
      <SectionHead
        title="Chore Setup & Duty Engine"
        sub={
          isAdmin
            ? "Configure default and custom chores with frequency, time slots and rotation sequence"
            : "Suggest changes to any chore — your admin gets a message and approves or declines it"
        }
        right={
          <Btn
            variant="soft"
            onClick={openAdd}
            disabled={state.roommates.length === 0}
          >
            <Plus size={14} />
            {isAdmin ? "Add Custom Chore" : "Suggest a Chore"}
          </Btn>
        }
      />

      {/* ADMIN · approval queue */}
      {isAdmin && pending.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5 p-5">
          <h3 className="flex items-center gap-2 font-bold">
            <Inbox size={16} className="text-amber-400" />
            {pending.length} change request
            {pending.length === 1 ? "" : "s"} waiting for you
          </h3>
          <p className="mt-1 text-xs text-muted">
            Your roommates suggested these. Approving applies the change to
            everyone&apos;s roster immediately.
          </p>
          <div className="mt-4 space-y-2.5">
            {pending.map((r) => {
              const by = roommateById(state, r.byId);
              return (
                <div
                  key={r.id}
                  className="rounded-xl border border-line bg-panel p-3.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <Avatar rm={by} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold">
                          {r.byName}
                          <span
                            className={cn(
                              "ml-2 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                              r.kind === "delete"
                                ? "bg-red-500/15 text-red-400"
                                : r.kind === "add"
                                  ? "bg-emerald-500/15 text-emerald-400"
                                  : "bg-sky-500/15 text-sky-400",
                            )}
                          >
                            {r.kind}
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-muted">{r.summary}</p>
                        {r.note && (
                          <p className="mt-1 rounded-md border border-line bg-panel2 p-2 text-[11px] text-muted italic">
                            “{r.note}”
                          </p>
                        )}
                        <p className="mt-1 font-mono text-[10px] text-muted">
                          {new Date(r.at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Btn variant="solid" onClick={() => approveRequest(r.id)}>
                        <Check size={13} /> Approve
                      </Btn>
                      <Btn
                        variant="danger"
                        onClick={() =>
                          rejectRequest(
                            r.id,
                            prompt("Reason (optional):") ?? undefined,
                          )
                        }
                      >
                        <X size={13} /> Decline
                      </Btn>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* MEMBER · my requests */}
      {!isAdmin && (myPending.length > 0 || myRecent.length > 0) && (
        <Card className="p-5">
          <h3 className="flex items-center gap-2 font-bold">
            <Send size={15} className="text-muted" /> Your requests
          </h3>
          <div className="mt-3 space-y-2">
            {[...myPending, ...myRecent].map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-panel2 px-3 py-2.5"
              >
                <span className="min-w-0 text-xs">
                  <span className="font-semibold">{r.summary}</span>
                  {r.reason && (
                    <span className="mt-0.5 block text-[11px] text-muted italic">
                      Admin said: “{r.reason}”
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded px-2 py-0.5 text-[9px] font-bold uppercase",
                    r.status === "pending"
                      ? "bg-amber-500/15 text-amber-400"
                      : r.status === "approved"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-red-500/15 text-red-400",
                  )}
                >
                  {r.status === "pending" ? "Waiting for admin" : r.status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {!isAdmin && (
        <p className="rounded-lg border border-sky-500/25 bg-sky-500/5 p-3 text-[11px] leading-relaxed text-sky-300/90">
          You can suggest anything here. Nothing changes until an admin approves
          it, so you can&apos;t accidentally break the roster.
        </p>
      )}

      {state.chores.length === 0 && (
        <Empty
          icon={<Plus size={24} />}
          title="No chores yet"
          body={
            state.roommates.length === 0
              ? "Add your housemates first, then create chores like cooking, dishes or cleaning. Each one gets its own rotation order."
              : "Create the jobs your home needs — cooking, dishes, cleaning, bins. Each chore rotates through everyone in turn."
          }
          action={
            state.roommates.length === 0 ? "Add Roommates First" : "Add Chore"
          }
          onAction={() =>
            state.roommates.length === 0
              ? window.dispatchEvent(
                  new CustomEvent("rm:go", { detail: "mates" }),
                )
              : openAdd()
          }
          hint="Tip: tick “This is a cooking duty” so it splits into 3 meals on holidays"
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {state.chores.map((c) => {
          const locked = (state.requests ?? []).some(
            (r) => r.status === "pending" && r.choreId === c.id,
          );
          return (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-panel2 text-lg">
                    {c.icon}
                  </span>
                  <div>
                    <h3 className="font-bold">{c.name}</h3>
                    <p className="mt-0.5 text-xs text-muted">{c.desc}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {locked && (
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-400 uppercase">
                      Pending
                    </span>
                  )}
                  <button
                    onClick={() => openEdit(c)}
                    title={isAdmin ? "Edit chore" : "Suggest an edit"}
                    className="rounded p-1.5 text-muted hover:bg-panel2 hover:text-ink"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => askDelete(c)}
                    title={isAdmin ? "Delete chore" : "Request removal"}
                    className="rounded p-1.5 text-muted hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                <Tag>
                  <Clock size={10} /> {c.time}
                </Tag>
                <Tag>
                  <CalendarDays size={10} />{" "}
                  {c.frequency === "daily" ? "Daily Rotation" : "Weekly Rotation"}
                </Tag>
                <Tag>
                  <RefreshCw size={10} /> {c.slot}
                </Tag>
                {c.cooking && (
                  <Tag className="border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-300">
                    <UtensilsCrossed size={10} /> {state.holidayMeals.length}x on
                    holidays
                  </Tag>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-muted">Round-Robin Order:</span>
                <span className="flex flex-wrap items-center gap-1 text-[11px] font-bold">
                  {c.order.map((id, i) => {
                    const rm = roommateById(state, id);
                    if (!rm) return null;
                    return (
                      <span key={id} className="flex items-center gap-1">
                        {i > 0 && <span className="text-muted">➜</span>}
                        <span>{firstName(rm.name)}</span>
                      </span>
                    );
                  })}
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* add / edit form */}
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={
          isAdmin
            ? editing
              ? `Edit · ${editing.name}`
              : "Add Custom Chore"
            : editing
              ? `Suggest an edit · ${editing.name}`
              : "Suggest a new chore"
        }
      >
        {form && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="grid grid-cols-[70px_1fr] gap-3">
              <Field label="Icon">
                <input
                  className={inputCls + " text-center"}
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  maxLength={2}
                />
              </Field>
              <Field label="Chore Name">
                <input
                  autoFocus
                  className={inputCls}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Bathroom Scrub"
                />
              </Field>
            </div>
            <Field label="Description">
              <input
                className={inputCls}
                value={form.desc}
                onChange={(e) => setForm({ ...form, desc: e.target.value })}
                placeholder="What needs to be done"
              />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Time">
                <input
                  className={inputCls}
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </Field>
              <Field label="Frequency">
                <select
                  className={inputCls}
                  value={form.frequency}
                  onChange={(e) =>
                    setForm({ ...form, frequency: e.target.value as Frequency })
                  }
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </Field>
              <Field label="Slot">
                <select
                  className={inputCls}
                  value={form.slot}
                  onChange={(e) =>
                    setForm({ ...form, slot: e.target.value as Slot })
                  }
                >
                  <option>Morning</option>
                  <option>Afternoon</option>
                  <option>Night</option>
                </select>
              </Field>
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line bg-panel2 p-3">
              <input
                type="checkbox"
                checked={form.cooking}
                onChange={(e) => setForm({ ...form, cooking: e.target.checked })}
                className="mt-0.5 h-3.5 w-3.5 accent-fuchsia-500"
              />
              <span>
                <span className="flex items-center gap-1.5 text-xs font-bold">
                  <UtensilsCrossed size={12} className="text-fuchsia-400" />
                  This is a cooking duty
                </span>
                <span className="mt-0.5 block text-[11px] text-muted">
                  On holidays it splits into {state.holidayMeals.length} meal
                  sessions, each assigned to a different flatmate.
                </span>
              </span>
            </label>

            {!isAdmin && (
              <Field label="Note to your admin (optional)">
                <input
                  className={inputCls}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. 8am is too early, I leave for work at 7:30"
                />
              </Field>
            )}

            <Btn type="submit" variant="solid" className="w-full">
              {isAdmin ? (
                <>
                  <Check size={14} />
                  {editing ? "Save changes" : "Create Chore & Start Rotation"}
                </>
              ) : (
                <>
                  <Send size={14} /> Send request to admin
                </>
              )}
            </Btn>
            {!isAdmin && (
              <p className="text-center text-[11px] text-muted">
                Your admin gets a notification and can approve or decline.
              </p>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
}
