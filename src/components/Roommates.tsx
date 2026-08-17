import { useState } from "react";
import {
  CheckCircle2,
  MoreVertical,
  Phone,
  Thermometer,
  Trash2,
  UserPlus,
  Zap,
} from "lucide-react";
import { useStore } from "../lib/store";
import {
  Avatar,
  Btn,
  Card,
  Empty,
  Field,
  Modal,
  SectionHead,
  inputCls,
} from "./ui";
import { cn } from "../utils/cn";
import type { Status } from "../lib/types";

const statusStyle: Record<Status, string> = {
  active: "text-emerald-400",
  sick: "text-amber-400",
  away: "text-sky-400",
};

export default function Roommates() {
  const { state, setStatus, addRoommate, removeRoommate, me, isAdmin } =
    useStore();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <div className="cm-in space-y-5">
      <SectionHead
        title="Roommate Directory"
        sub="Manage flatmates, contact details & update active/sick/away status"
        right={
          isAdmin ? (
            <Btn variant="soft" onClick={() => setOpen(true)}>
              <UserPlus size={14} /> Add Roommate
            </Btn>
          ) : (
            <span className="rounded-lg border border-line bg-panel2 px-3 py-2 text-[11px] text-muted">
              Member access · ask an admin to add flatmates
            </span>
          )
        }
      />

      {state.roommates.length === 0 && (
        <Empty
          icon={<UserPlus size={24} />}
          title="Add the first person"
          body="Start with yourself — the first person added becomes the admin and can invite everyone else. You'll need at least two people for turns to rotate."
          action="Add Roommate"
          onAction={() => setOpen(true)}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {state.roommates.map((r) => (
          <Card key={r.id} className="relative p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar rm={r} size="lg" />
                <div>
                  <p className="font-bold">{r.name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-muted">
                    <Phone size={11} /> {r.phone}
                  </p>
                </div>
              </div>
              <span className="flex items-center gap-1.5">
                {r.id === me?.id && (
                  <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold text-accent uppercase">
                    You
                  </span>
                )}
                {(r.role ?? "member") === "admin" && (
                  <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-400 uppercase">
                    Admin
                  </span>
                )}
                {isAdmin && (
                  <button
                    onClick={() => setMenu(menu === r.id ? null : r.id)}
                    className="rounded p-1 text-muted hover:bg-panel2 hover:text-ink"
                  >
                    <MoreVertical size={16} />
                  </button>
                )}
              </span>
              {menu === r.id && (
                <div className="absolute top-10 right-3 z-20 w-40 rounded-lg border border-line bg-panel p-1 shadow-xl">
                  <button
                    onClick={() => {
                      removeRoommate(r.id);
                      setMenu(null);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 size={13} /> Remove flatmate
                  </button>
                </div>
              )}
            </div>

            <p className="mt-4 flex items-center gap-2 text-[11px] text-muted">
              Status:
              <span
                className={cn(
                  "flex items-center gap-1 font-bold tracking-wider uppercase",
                  statusStyle[r.status],
                )}
              >
                <Zap size={11} /> {r.status}
              </span>
            </p>

            <div className="mt-3 flex items-center gap-1.5">
              <Btn
                className="flex-1"
                variant={r.status === "active" ? "solid" : "ghost"}
                onClick={() => setStatus(r.id, "active")}
              >
                <CheckCircle2 size={13} /> Active
              </Btn>
              <Btn
                className="flex-1"
                variant={r.status === "sick" ? "danger" : "ghost"}
                onClick={() => setStatus(r.id, "sick")}
              >
                <Thermometer size={13} /> Sick?
              </Btn>
              <button
                onClick={() => setStatus(r.id, "away")}
                className={cn(
                  "px-2 py-2 text-xs font-semibold",
                  r.status === "away" ? "text-sky-400" : "text-muted hover:text-ink",
                )}
              >
                Away
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Roommate">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            addRoommate(name.trim(), phone.trim() || "—");
            setName("");
            setPhone("");
            setOpen(false);
          }}
        >
          <Field label="Full Name">
            <input
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
              placeholder="+91 90000 00000"
            />
          </Field>
          <p className="text-[11px] text-muted">
            New flatmates are appended to the end of every chore&apos;s
            round-robin sequence.
          </p>
          <Btn type="submit" variant="solid" className="w-full">
            Add To Flat
          </Btn>
        </form>
      </Modal>
    </div>
  );
}
