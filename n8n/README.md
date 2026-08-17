# Room Mates × n8n — Automation Setup Guide

This n8n workflow fires every **5 minutes**, reads your Supabase flat state,
finds duties due within your reminder window, and sends WhatsApp / email alerts
— exactly once per duty per day (deduplicated via the `sent_alerts` table).

---

## 1 · Import the Workflow

1. Open your n8n instance (local: `http://localhost:5678` | cloud: `app.n8n.cloud`)
2. **Settings → Import workflow** → upload `room-mates-reminders.json`
3. The workflow appears in your list — click **Open**

---

## 2 · Set Variables

In n8n, go to **Settings → Variables** and create:

| Variable name | Value |
|---|---|
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (your anon key) |
| `TWILIO_ACCOUNT_SID` | Your Twilio account SID (optional) |
| `TWILIO_WHATSAPP_FROM` | e.g. `+14155238886` (optional) |

> The workflow already uses `$vars.SUPABASE_ANON_KEY` — just set the variable and it applies everywhere.

---

## 3 · Configure Credentials

### WhatsApp via Twilio
1. **Credentials → Add → HTTP Basic Auth**
2. Name it exactly **`Twilio Basic Auth`**
3. Username = your Twilio Account SID
4. Password = your Twilio Auth Token

### Email (SMTP)
1. **Credentials → Add → SMTP**
2. Fill your email provider's SMTP settings (Gmail, Outlook, Resend, etc.)
3. The **Send Email** node will automatically use it

---

## 4 · Activate

Click **Activate** (top-right toggle). The cron starts immediately.

---

## 5 · Test Manually

1. Click **Execute Workflow** to run once now
2. Check the **Fetch Flat State** node output — you should see your flat's JSON
3. The **Plan Alerts** node outputs one item per pending alert
4. **Mark Sent** writes to `sent_alerts` — verify in your Supabase Table Editor

---

## How the dedup works

```
alert generated
    → check sent_alerts (flat_id, alert_key)
    → if already exists: skip
    → if new: send notification + insert into sent_alerts
```

`alert_key` format: `rem|<choreId>|<date>|<minuteOfDay>` — unique per duty per day.

---

## Flat ID reference

```
FLAT_ID = 00000000-0000-0000-0000-000000000402
Supabase URL = https://jhlkebjfhatnvttsuwtr.supabase.co
```
