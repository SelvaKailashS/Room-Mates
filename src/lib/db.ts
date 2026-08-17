/**
 * DATA LAYER — one interface, two backends.
 *
 *  LocalAdapter   → browser localStorage. Works offline, zero setup. (default)
 *  SupabaseAdapter→ real Postgres over the REST API. Activates automatically
 *                   the moment VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY exist.
 *
 * The rest of the app never imports either one directly — it calls `db`.
 * That means switching from "demo on my laptop" to "live shared database"
 * is a config change, not a rewrite.
 */
import type { AppState } from "./types";

export type Backend = "local" | "supabase";

export interface ConnInfo {
  backend: Backend;
  ok: boolean;
  detail: string;
  url?: string;
  latencyMs?: number;
}

export interface DataAdapter {
  readonly backend: Backend;
  /** load the whole flat state */
  load(flatId: string): Promise<AppState | null>;
  /** persist the whole flat state (debounced by the caller) */
  save(flatId: string, state: AppState): Promise<void>;
  /** append one immutable activity row */
  appendLog(flatId: string, row: Record<string, unknown>): Promise<void>;
  /** health check for the status panel */
  ping(): Promise<ConnInfo>;
  /** subscribe to remote changes; returns an unsubscribe fn */
  subscribe(flatId: string, onChange: (s: AppState) => void): () => void;
}

const ENV = import.meta.env as Record<string, string | undefined>;
export const SUPABASE_URL = ENV.VITE_SUPABASE_URL ?? "";
export const SUPABASE_KEY = ENV.VITE_SUPABASE_ANON_KEY ?? "";
export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);

/* ------------------------------------------------------------------ */
/* LOCAL                                                               */
/* ------------------------------------------------------------------ */

const LS_KEY = "roommates-state-v2";

export class LocalAdapter implements DataAdapter {
  readonly backend = "local" as const;

  async load(): Promise<AppState | null> {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AppState;
    } catch {
      return null;
    }
  }

  async save(_flatId: string, state: AppState) {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }

  async appendLog() {
    /* logs already live inside the saved state blob */
  }

  async ping(): Promise<ConnInfo> {
    const t = performance.now();
    try {
      localStorage.setItem("__rm_ping", "1");
      localStorage.removeItem("__rm_ping");
      return {
        backend: "local",
        ok: true,
        detail: "Saving to this browser only. No account needed.",
        latencyMs: Math.round(performance.now() - t),
      };
    } catch {
      return {
        backend: "local",
        ok: false,
        detail: "Browser storage blocked (private mode?).",
      };
    }
  }

  /** cross-tab sync: other tabs on this device stay in step */
  subscribe(_flatId: string, onChange: (s: AppState) => void) {
    const h = (e: StorageEvent) => {
      if (e.key === LS_KEY && e.newValue) {
        try {
          onChange(JSON.parse(e.newValue) as AppState);
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener("storage", h);
    return () => window.removeEventListener("storage", h);
  }
}

/* ------------------------------------------------------------------ */
/* SUPABASE (REST — no SDK dependency)                                 */
/* ------------------------------------------------------------------ */

export class SupabaseAdapter implements DataAdapter {
  readonly backend = "supabase" as const;
  private base = `${SUPABASE_URL}/rest/v1`;
  private headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
  };

  async load(flatId: string): Promise<AppState | null> {
    const r = await fetch(
      `${this.base}/flats?id=eq.${flatId}&select=state`,
      { headers: this.headers },
    );
    if (!r.ok) throw new Error(`load failed: ${r.status}`);
    const rows = (await r.json()) as { state: AppState }[];
    return rows[0]?.state ?? null;
  }

  async save(flatId: string, state: AppState) {
    // upsert the flat row; also sync the top-level `name` column
    await fetch(`${this.base}/flats`, {
      method: "POST",
      headers: { ...this.headers, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({
        id: flatId,
        name: state.flatName ?? "My Home",
        join_code: state.joinCode,
        state,
        updated_at: new Date().toISOString(),
      }),
    });

    // mirror every roommate into flat_members so the table stays in sync
    await this.syncMembers(flatId, state);
  }

  /**
   * Upsert all roommates from the app state into the flat_members table.
   * Uses the app-generated roommate ID as user_id (no Supabase Auth needed).
   */
  private async syncMembers(flatId: string, state: AppState) {
    if (!state.roommates?.length) return;
    const rows = state.roommates.map((r) => ({
      flat_id: flatId,
      user_id: r.id,
      display_name: r.name,
      role: r.role ?? "member",
      status: r.status ?? "active",
      phone: r.phone ?? null,
      email: r.email ?? null,
      channels: r.channels ?? { push: true, whatsapp: true, email: false },
      joined_at: (r as unknown as Record<string, unknown>).joinedAt ?? new Date().toISOString(),
    }));
    await fetch(`${this.base}/flat_members`, {
      method: "POST",
      headers: { ...this.headers, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(rows),
    });
  }

  async appendLog(flatId: string, row: Record<string, unknown>) {
    await fetch(`${this.base}/duty_log`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ flat_id: flatId, ...row }),
    });
  }

  async ping(): Promise<ConnInfo> {
    const t = performance.now();
    try {
      const r = await fetch(`${this.base}/flats?select=id&limit=1`, {
        headers: this.headers,
      });
      const latencyMs = Math.round(performance.now() - t);
      return r.ok
        ? {
            backend: "supabase",
            ok: true,
            detail: "Connected to your shared Postgres database.",
            url: SUPABASE_URL,
            latencyMs,
          }
        : {
            backend: "supabase",
            ok: false,
            detail: `Database replied ${r.status}. Check the anon key and that schema.sql has been run.`,
            url: SUPABASE_URL,
            latencyMs,
          };
    } catch (e) {
      return {
        backend: "supabase",
        ok: false,
        detail: `Could not reach the database: ${(e as Error).message}`,
        url: SUPABASE_URL,
      };
    }
  }

  /**
   * Poll every 5s for remote edits. Swap for the realtime websocket by
   * installing @supabase/supabase-js and using .channel() — same callback.
   */
  subscribe(flatId: string, onChange: (s: AppState) => void) {
    let alive = true;
    let last = "";
    const tick = async () => {
      if (!alive) return;
      try {
        const s = await this.load(flatId);
        if (s) {
          const sig = JSON.stringify(s).length + ":" + (s.notices?.length ?? 0);
          if (last && sig !== last) onChange(s);
          last = sig;
        }
      } catch {
        /* offline — try again next tick */
      }
    };
    const id = setInterval(tick, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }
}

/* ------------------------------------------------------------------ */

export const db: DataAdapter = hasSupabase
  ? new SupabaseAdapter()
  : new LocalAdapter();

export const FLAT_ID = ENV.VITE_FLAT_ID ?? "00000000-0000-0000-0000-000000000402";
