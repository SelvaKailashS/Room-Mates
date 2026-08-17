export type Status = "active" | "sick" | "away";
export type Role = "admin" | "member";

export interface Channels {
  push: boolean;
  whatsapp: boolean;
  email: boolean;
}

export interface Roommate {
  id: string;
  name: string;
  phone: string;
  color: string; // tailwind bg class
  status: Status;
  /* --- access & notification layer (optional => migrated with defaults) --- */
  role?: Role;
  email?: string;
  channels?: Channels;
  /** invite accepted */
  joined?: boolean;
}

export interface Rules {
  /** minutes before a duty's start time to send the reminder */
  remindBefore: number;
  dailyDigest: boolean;
  digestTime: string; // "HH:MM" 24h
  /** minutes after start time before an overdue nudge fires */
  escalateAfter: number;
  /** blast the holiday kitchen plan the evening before */
  holidayBlast: boolean;
  /** notify when a sick/away bypass reassigns a duty */
  reassignAlert: boolean;
}

export type NoticeKind =
  | "reminder"
  | "overdue"
  | "digest"
  | "holiday"
  | "system";

export interface Notice {
  id: string;
  kind: NoticeKind;
  title: string;
  body: string;
  /** roommate the alert targets ("" = whole flat) */
  target: string;
  at: string; // ISO
  read: boolean;
}

export type Frequency = "daily" | "weekly";
export type Slot = "Morning" | "Afternoon" | "Night";

export interface Chore {
  id: string;
  name: string;
  desc: string;
  icon: string;
  time: string;
  frequency: Frequency;
  slot: Slot;
  /** roommate ids defining round robin sequence */
  order: string[];
  custom?: boolean;
  /** cooking duties split into multiple meal sessions on holidays */
  cooking?: boolean;
}

export interface Meal {
  name: string;
  time: string;
  slot: Slot;
  icon: string;
}

export type LogAction = "completed" | "sick-reassign" | "swap" | "skipped" | "holiday";

export interface LogEntry {
  id: string;
  choreId: string;
  choreName: string;
  roommateId: string;
  detail: string;
  date: string; // yyyy-mm-dd
  time: string; // HH:MM
  action: LogAction;
}

export type RequestKind = "add" | "edit" | "delete";
export type RequestStatus = "pending" | "approved" | "rejected";

/** A member's proposed change to a chore, awaiting admin approval. */
export interface ChangeRequest {
  id: string;
  kind: RequestKind;
  status: RequestStatus;
  /** who asked */
  byId: string;
  byName: string;
  /** target chore (empty for "add") */
  choreId: string;
  choreName: string;
  /** the proposed chore data for add/edit */
  payload?: Partial<Chore>;
  /** human-readable summary of what changes */
  summary: string;
  /** optional note from the member */
  note?: string;
  at: string;
  /** admin who actioned it */
  decidedBy?: string;
  decidedAt?: string;
  reason?: string;
}

export interface AppState {
  roommates: Roommate[];
  chores: Chore[];
  logs: LogEntry[];
  /** key `${sessionKey}|${date}` -> roommateId (manual swap) */
  overrides: Record<string, string>;
  /** key `${sessionKey}|${date}` -> roommateId who completed */
  completed: Record<string, string>;
  anchor: string; // yyyy-mm-dd that rotation index 0 maps to
  /** explicit holiday dates (yyyy-mm-dd) */
  holidays: string[];
  /** treat every Sunday as a holiday automatically */
  autoSundayHoliday: boolean;
  /** meal sessions generated for cooking chores on holidays */
  holidayMeals: Meal[];
  /** editable name of the home, e.g. "Flat #402" */
  flatName?: string;
  /** who is using the app right now (access control demo) */
  currentUserId?: string;
  /** shareable code roommates use to join the flat */
  joinCode?: string;
  rules?: Rules;
  notices?: Notice[];
  /** member-proposed chore changes */
  requests?: ChangeRequest[];
}
