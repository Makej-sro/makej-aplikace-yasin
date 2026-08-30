-- ============================================================================
-- Online presence + read receipts (Zprávy v appce brigádníka)
-- ----------------------------------------------------------------------------
-- Additivní migrace. Pustit ručně v Supabase SQL editoru (Yasin/Jan).
-- Nic nepřepisuje: jen přidává 2 sloupce a 2 SECURITY DEFINER funkce,
-- takže nepotřebuje nové široké UPDATE RLS a nerozbije firemní dashboard.
-- Po spuštění doplnit záznam do DATABASE.md a přeposlat Samovi.
-- ============================================================================

-- 1) PRESENCE: kdy byl uživatel naposledy aktivní.
--    Appka volá touch_last_seen() heartbeatem ~každých 30 s, dokud je otevřená.
--    V UI: (now - last_seen) < 60 s → „Aktivní teď" (zelená), jinak „Aktivní před X".
alter table profiles add column if not exists last_seen timestamptz;

-- 2) READ RECEIPT: kdy PŘÍJEMCE zprávu přečetl. null = zatím nepřečteno.
--    Odesláno = řádek v DB; Doručeno = default pro odeslané; Přečteno = read_at != null.
alter table messages add column if not exists read_at timestamptz;

-- Rychlé dohledání nepřečtených v jednom vlákně.
create index if not exists messages_match_unread_idx
  on messages (match_id) where read_at is null;

-- 3) Heartbeat — každý smí zapsat jen SVŮJ last_seen (bez široké UPDATE RLS na profiles).
create or replace function touch_last_seen()
returns void
language sql
security definer
set search_path = public
as $$
  update profiles set last_seen = now() where id = auth.uid();
$$;

-- 4) Označit vlákno za přečtené — příjemce (NE odesílatel) orazítkuje došlé zprávy.
--    Účastníka ověřuje přes matches (worker_id / worker_b_id = peer-to-peer i job-worker strana).
--    Pozn.: „Přečteno" u zpráv brigádníka uvidí firma až firemní dashboard (Sam)
--    zavolá svou obdobu mark_thread_read na své straně.
create or replace function mark_thread_read(p_match_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update messages
     set read_at = now()
   where match_id = p_match_id
     and sender_id <> auth.uid()
     and read_at is null
     and exists (
       select 1 from matches m
        where m.id = p_match_id
          and (m.worker_id = auth.uid() or m.worker_b_id = auth.uid())
     );
$$;
