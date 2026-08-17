-- ============================================================
--  Room Mates · the automation schedule
--  Run once in Supabase → SQL Editor, AFTER deploying the function.
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Wake the reminder robot every 5 minutes, forever.
select cron.schedule(
  'room-mates-reminders',
  '*/5 * * * *',
  $$
    select net.http_post(
      url     := 'https://YOUR-PROJECT-REF.functions.supabase.co/remind',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer YOUR-SERVICE-ROLE-KEY'
      )
    );
  $$
);

-- Housekeeping: forget alert keys older than 30 days so the table stays small.
select cron.schedule(
  'room-mates-cleanup',
  '0 4 * * *',
  $$ delete from sent_alerts where sent_at < now() - interval '30 days'; $$
);

-- Useful checks -------------------------------------------------
-- see everything scheduled:
--   select * from cron.job;
-- see recent runs and any errors:
--   select * from cron.job_run_details order by start_time desc limit 20;
-- stop the robot:
--   select cron.unschedule('room-mates-reminders');
