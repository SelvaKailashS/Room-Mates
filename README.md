# Room Mates

### *Whose Turn Is It?* — Fair Duty Rotation for Shared Homes

> The shared-home duty planner that decides whose turn it is — and reminds them.

Room Mates ends the daily "who's cooking tonight?" argument. It automatically
rotates cooking, dishwashing and cleaning turns between everyone in a home,
reminds the right person before their turn, and instantly passes the duty on
when someone falls sick.

---

## Why

In shared homes, chores live in someone's head or a forgotten group chat. Turns
get skipped, the same two people end up doing everything, and it quietly turns
into resentment.

Room Mates is one shared screen that always knows whose turn it is, tells that
person on time, adapts when someone is unwell, and proves the work was split
fairly.

---

## Features

| | |
|---|---|
| 🔁 **Round-robin engine** | Every chore has its own rotation order, so nobody is stuck cooking every day |
| 🤒 **Sick-day bypass** | Mark yourself sick and the duty passes to the next active housemate automatically |
| 🎉 **Holiday mode** | On holidays cooking splits into breakfast, lunch & dinner — three different people |
| 🔔 **Automatic reminders** | A nudge before your turn, and an overdue follow-up if it's not done |
| ⚖️ **Fairness score** | Live workload breakdown so arguments end with data, not opinions |
| 👥 **Roles & approvals** | Members can suggest chore changes; admins approve or decline |
| 📜 **Audit log** | Every completed chore, swap and reassignment, exportable as CSV |
| 🌗 **Dark / light** | Plus a fully offline mode — no account required to start |

---

## Quick start

```bash
npm install
npm run dev
```

Open the link it prints. The app starts **empty** — add your housemates in the
**Roommates** tab (the first person becomes admin), then add your chores in
**Chore Setup**.

---

## Three levels of deployment

| Level | Time | Cost | What you get |
|---|---|---|---|
| **1 · Local** | 0 min | Free | Rotation + reminders while a tab is open. Add to home screen. |
| **2 · Hosted** | ~10 min | Free | One link for the whole house. |
| **3 · Full** | ~1 hour | Free tier | Real logins, live sync, reminders with every phone locked. |

Full instructions for every level are inside the app under
**Database & Setup → The complete step-by-step process**, and in
[`WORKING_MODEL.md`](./WORKING_MODEL.md).

---

## Connecting a database

The app runs on a **swappable data layer** — one interface, two backends:

```ts
// src/lib/db.ts
export const db: DataAdapter = hasSupabase
  ? new SupabaseAdapter()   // real Postgres
  : new LocalAdapter();     // browser storage
```

Nothing else in the app imports either one. To go live:

1. Create a free project at [supabase.com](https://supabase.com)
2. SQL Editor → paste [`supabase/schema.sql`](./supabase/schema.sql) → Run
3. `cp .env.example .env` and add your two keys
4. Restart — the status card in **Database & Setup** turns green

```bash
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

> The anon key is safe in the browser — Row Level Security is what protects the
> data. **Never** commit `.env` or the service role key.

---

## Automation

A cron job wakes an edge function every 5 minutes. It re-runs the *same*
rotation logic as the UI, finds duties that are due, and sends push / WhatsApp /
email — deduped via a `sent_alerts` table so nobody is messaged twice.

```
tap "done" → flats.state → realtime → other phones update
                  ↓
           cron every 5 min → sent_alerts (dedupe) → push / WhatsApp / email
```

- [`supabase/functions/remind/index.ts`](./supabase/functions/remind/index.ts) — the robot
- [`supabase/cron.sql`](./supabase/cron.sql) — the schedule
- [`public/sw.js`](./public/sw.js) — service worker for closed-app notifications

---

## Project structure

```
src/
  lib/
    engine.ts      rotation: round-robin, sick bypass, holiday meals
    notify.ts      planAlerts() + in-browser scheduler  (pure — reused server-side)
    db.ts          the swappable data layer
    store.tsx      React state, persistence, sync
    brand.ts       app name & pitch copy (single source of truth)
  components/      one file per tab
supabase/
  schema.sql       tables, RLS policies, join_flat()
  functions/       the reminder robot
  cron.sql         the every-5-minutes schedule
WORKING_MODEL.md   full technical specification
```

---

## Tech

React 19 · TypeScript · Vite · Tailwind CSS v4 · Supabase (optional) · lucide-react

## License

MIT
