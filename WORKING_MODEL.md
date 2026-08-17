# Room Mates — Working Model · Database & Automation

> The app runs on a **swappable data layer**. It works offline today, and connects
> to a real shared database the moment you add two keys.

**Room Mates** — *Whose Turn Is It?* — Fair Duty Rotation for Shared Homes.

---

## 1. The core idea

Most apps hard-wire themselves to one database. This one doesn't. Every read and
write goes through a single interface called `DataAdapter`, and there are two
implementations of it:

| Adapter | Storage | Setup | When it's used |
|---|---|---|---|
| `LocalAdapter` | Browser `localStorage` | None | Default — no keys present |
| `SupabaseAdapter` | Postgres (Supabase) | ~20 min | Automatically, once `.env` has two keys |

```ts
// src/lib/db.ts — the entire switch
export const db: DataAdapter = hasSupabase
  ? new SupabaseAdapter()
  : new LocalAdapter();
```

Nothing else in the app imports either class. Components and the store only ever
call `db.load()`, `db.save()`, `db.subscribe()`. So going from *"a demo on my
laptop"* to *"a live database the whole house shares"* is a **config change, not
a rewrite**.

### The interface

```ts
export interface DataAdapter {
  readonly backend: "local" | "supabase";
  load(flatId: string): Promise<AppState | null>;
  save(flatId: string, state: AppState): Promise<void>;
  appendLog(flatId: string, row: Record<string, unknown>): Promise<void>;
  ping(): Promise<ConnInfo>;                                   // health check
  subscribe(flatId: string, cb: (s: AppState) => void): () => void;
}
```

`subscribe()` is what keeps everyone in sync. In `LocalAdapter` it listens to the
browser `storage` event (other tabs on the same device). In `SupabaseAdapter` it
polls the row every 5 seconds — swap in `supabase.channel()` for true websockets
and the callback signature stays identical.

---

## 2. How data actually moves

```
  PHONE A          PHONE B            SUPABASE                 ROBOT
  ───────          ───────            ────────                 ─────
  tap "done"
      │
      ├─ save ──────────────────────▶ flats.state (jsonb)
      │                                    │
      │                                    ├─ realtime ──▶ PHONE B
      │                                    │               roster updates
      ├─ insert ────────────────────▶ duty_log (audit trail)
                                           │
                                           ◀── read ────── cron every 5 min
                                           │                     │
                                      sent_alerts ◀── dedupe ────┤
                                                                 │
                            push / WhatsApp / email ◀────────────┘
```

1. **You tap a button.** React state updates instantly, so the UI never lags.
2. **The adapter saves it.** 800 ms later (debounced) the home state is written
   to Postgres as one row with one JSON column.
3. **Everyone else hears it.** Other devices are subscribed to that row and
   re-render without a refresh.
4. **The robot checks the clock.** Every 5 minutes a cron job reads the same
   data, recomputes whose turn it is, and sends reminders.

---

## 3. The database

Four tables. Full DDL lives in **`supabase/schema.sql`** — paste it into the
Supabase SQL Editor and press Run.

### `flats` — one row per home
```sql
create table flats (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default 'My Home',
  join_code  text unique not null,
  state      jsonb not null default '{}'::jsonb,   -- the whole app snapshot
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```
Keeping the live state as `jsonb` means the UI's data shape and the database can
never drift apart. Roster, chores, rules, holidays and meal sessions all live here.

### `flat_members` — access control + notification routing
```sql
create table flat_members (
  flat_id      uuid references flats(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete cascade,
  display_name text,
  role         text not null default 'member' check (role in ('admin','member')),
  status       text not null default 'active' check (status in ('active','sick','away')),
  phone        text,
  email        text,
  push_token   jsonb,   -- Web Push subscription object
  channels     jsonb not null default '{"push":true,"whatsapp":true,"email":false}',
  joined_at    timestamptz not null default now(),
  primary key (flat_id, user_id)
);
```

### `duty_log` — append-only audit trail
Powers the Fairness Score. Never updated, only inserted into.
```sql
create table duty_log (
  id         bigserial primary key,
  flat_id    uuid references flats(id) on delete cascade,
  user_id    uuid,
  chore_id   text not null,
  chore_name text not null,
  duty_date  date not null,
  action     text not null check (action in
               ('completed','sick-reassign','swap','skipped','holiday')),
  detail     text,
  created_at timestamptz not null default now()
);
```

### `sent_alerts` — the dedupe guard
```sql
create table sent_alerts (
  flat_id   uuid references flats(id) on delete cascade,
  alert_key text not null,           -- e.g. 'rem|c1|2026-08-11|450'
  sent_at   timestamptz not null default now(),
  primary key (flat_id, alert_key)
);
```
**This is why the cron job can safely run every 5 minutes.** Before sending, the
robot inserts the alert key. A primary-key violation means "already sent" — skip
it. No duplicate reminders, ever, even if a run overlaps or retries.

---

## 4. Security — Row Level Security

RLS is enabled on all four tables. The golden rule: *you can only touch rows for
a home you belong to.*

```sql
create or replace function my_flats() returns setof uuid
language sql stable security definer as $$
  select flat_id from flat_members where user_id = auth.uid();
$$;

create policy "read my flat" on flats
  for select using (id in (select my_flats()));

create policy "admins manage members" on flat_members
  for all using (
    exists (select 1 from flat_members m
            where m.flat_id = flat_members.flat_id
              and m.user_id = auth.uid()
              and m.role    = 'admin')
  );
```

Because of this, the `anon` key in the browser is **safe to expose** — it grants
nothing on its own. A signed-out visitor sees zero rows.

### Joining a home with a code
```sql
create or replace function join_flat(code text) returns uuid
language plpgsql security definer as $$
declare target uuid;
begin
  select id into target from flats where join_code = upper(code);
  if target is null then raise exception 'That join code does not exist'; end if;

  insert into flat_members (flat_id, user_id, display_name, email, role)
  values (target, auth.uid(),
          coalesce(auth.jwt() ->> 'name', split_part(auth.jwt() ->> 'email','@',1)),
          auth.jwt() ->> 'email',
          case when exists (select 1 from flat_members where flat_id = target)
               then 'member' else 'admin' end)   -- first person in becomes admin
  on conflict (flat_id, user_id) do nothing;

  return target;
end $$;
```
From the app: `supabase.rpc('join_flat', { code: 'FLAT-AB12-402' })`.

---

## 5. Automation — the reminder robot

**File:** `supabase/functions/remind/index.ts`

The single most important design decision: **the edge function re-implements the
same rotation engine as the UI.** Round-robin index, sick bypass, holiday meal
offsets — identical logic. That guarantees the 6 AM WhatsApp message matches
exactly what the app shows on screen.

```ts
function assignee(state, chore, date, offset) {
  const seq = chore.order.filter(id => state.roommates.some(r => r.id === id));
  const period = chore.frequency === "weekly"
    ? Math.floor((dayNum(date) - dayNum(state.anchor)) / 7)
    : dayNum(date) - dayNum(state.anchor);
  const idx = mod(period + offset, seq.length);     // offset = meal 0/1/2
  let pick = seq[idx];
  if (statusOf(pick) !== "active") {                // sick / away bypass
    for (let i = 1; i <= seq.length; i++) {
      const c = seq[mod(idx + i, seq.length)];
      if (statusOf(c) === "active") { pick = c; break; }
    }
  }
  return state.roommates.find(r => r.id === pick);
}
```

### What it sends
| Alert | When it fires | Key format |
|---|---|---|
| Turn reminder | `remindBefore` minutes before the duty | `rem\|<session>\|<date>\|<mins>` |
| Overdue nudge | `escalateAfter` minutes past, if not completed | `late\|<session>\|<date>\|<mins>` |
| Daily digest | At `digestTime` | `digest\|<date>` |
| Holiday plan | 7 AM on a holiday | `holiday\|<date>` |

### Delivery channels
- **Web Push** via `web-push` + VAPID keys → `public/sw.js` shows the notification
- **WhatsApp** via Twilio (free sandbox works)
- **Email** via Resend

Each roommate's `channels` column decides which ones they get.

### The schedule
**File:** `supabase/cron.sql`
```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule('room-mates-reminders', '*/5 * * * *', $$
  select net.http_post(
    url     := 'https://YOUR-PROJECT-REF.functions.supabase.co/remind',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer YOUR-SERVICE-ROLE-KEY')
  );
$$);

-- nightly housekeeping
select cron.schedule('room-mates-cleanup', '0 4 * * *',
  $$ delete from sent_alerts where sent_at < now() - interval '30 days'; $$);
```

---

## 6. Setup — 7 steps, about 20 minutes, all free tier

1. **Create a Supabase project** — supabase.com → New Project. Pick a nearby
   region, save the database password.
2. **Create the tables** — SQL Editor → paste all of `supabase/schema.sql` → Run.
3. **Copy your two keys** — Project Settings → API. Then:
   ```bash
   cp .env.example .env      # paste Project URL + anon public key
   ```
4. **Restart and confirm**
   ```bash
   npm run dev
   ```
   Open the **Database & Setup** tab — the status card should turn green and read
   *Mode 2 · Shared Postgres database*.
5. **Generate push keys**
   ```bash
   npx web-push generate-vapid-keys
   ```
   Paste both into Supabase → Edge Functions → Secrets.
6. **Deploy the robot and schedule it**
   ```bash
   supabase functions deploy remind --no-verify-jwt
   # then paste supabase/cron.sql (with your project ref + service key) → Run
   ```
7. **Prove it's running**
   ```sql
   select * from cron.job_run_details order by start_time desc limit 10;
   ```

### Environment variables

```bash
# Frontend — safe to expose, protected by RLS
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_FLAT_ID=00000000-0000-0000-0000-000000000402

# Server only — Supabase → Edge Functions → Secrets. NEVER commit.
SUPABASE_SERVICE_ROLE_KEY=...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
RESEND_API_KEY=...
```

---

## 7. File map

| File | Responsibility |
|---|---|
| `src/lib/db.ts` | The switch — `DataAdapter` interface + both implementations |
| `src/lib/engine.ts` | Rotation engine — round-robin, sick bypass, holiday sessions |
| `src/lib/notify.ts` | `planAlerts()` + the in-browser scheduler + service-worker registration |
| `src/lib/store.tsx` | React state, persistence, remote hydration, subscriptions |
| `supabase/schema.sql` | Tables, RLS policies, `join_flat()` |
| `supabase/functions/remind/index.ts` | The reminder robot |
| `supabase/cron.sql` | The every-5-minutes schedule |
| `public/sw.js` | Service worker — notifications while the app is closed |
| `.env.example` | Key template |

`planAlerts()` in `src/lib/notify.ts` is deliberately **pure** — same input,
same output, no side effects. That's what makes it liftable straight into the
edge function.

---

## 8. Three levels of deployment

| Level | Time | Cost | What you get |
|---|---|---|---|
| **1 · Local** | 0 min | Free | Rotation + reminders while a tab is open. Add to home screen. |
| **2 · Hosted** | ~10 min | Free | One link for the whole house (Vercel/Netlify drag-and-drop). |
| **3 · Full** | ~1 hour | Free tier | Real logins, live sync, reminders with every phone locked. |

---

## 9. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Status card stays blue (Mode 1) | `.env` not loaded | Restart the dev server — Vite only reads `.env` at boot |
| `401` on the ping | Wrong anon key | Re-copy from Project Settings → API |
| `404` on the ping | `schema.sql` never ran | Run it in the SQL Editor |
| Connected but no rows | RLS working as intended | Sign in, or call `join_flat()` with your code |
| No notifications | Permission not granted | Access & Alerts → "Enable Browser Push" → Allow |
| Duplicate reminders | `sent_alerts` missing | Re-run `schema.sql`; the primary key is the dedupe guard |
| Cron never fires | Extensions off / bad URL | `create extension pg_cron; pg_net;` then check `cron.job_run_details` |
| Wrong reminder times | Server runs in UTC | Store a timezone per home and offset `nowMins` in the function |

---

## 10. Verifying the model works

```sql
-- 1. is the home there?
select id, name, join_code, updated_at from flats;

-- 2. did a save land? (should change when you tick a chore)
select jsonb_array_length(state->'chores') as chores,
       jsonb_array_length(state->'roommates') as people,
       updated_at from flats;

-- 3. is the audit trail growing?
select duty_date, chore_name, action, created_at
from duty_log order by created_at desc limit 10;

-- 4. is the robot deduping properly?
select alert_key, sent_at from sent_alerts order by sent_at desc limit 10;

-- 5. is the schedule alive?
select jobname, schedule, active from cron.job;
select status, return_message, start_time
from cron.job_run_details order by start_time desc limit 5;
```

If query 4 grows and query 5 shows `succeeded`, the automation is running
end-to-end and nobody in your home will ever have to ask *"whose turn is it?"*
again.
