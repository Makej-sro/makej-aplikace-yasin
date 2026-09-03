-- ═══════════════════════════════════════════════════════════════════════════
-- NAHLAŠOVÁNÍ OBSAHU
-- ───────────────────────────────────────────────────────────────────────────
-- Vyžaduje App Store Guideline 1.2 (User-Generated Content): appka s obsahem
-- od uživatelů musí mít způsob, jak nevhodný obsah nahlásit, a musí na hlášení
-- reagovat. Bez toho Apple appku s chatem a profily neschválí.
--
-- Tabulka je záměrně obecná (typ + id), aby se dala použít i na profily lidí,
-- firmy a konverzace, ne jen na inzeráty.
--
-- Spustit v Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references public.profiles(id) on delete cascade,
  -- Co se nahlašuje. 'job' = inzerát, 'person' = karta člověka v Lidech,
  -- 'employer' = profil firmy, 'thread' = konverzace, 'review' = recenze.
  target_type  text not null check (target_type in ('job','person','employer','thread','review')),
  target_id    uuid not null,
  duvod        text not null check (duvod in ('sexualni','nenavist','podvod','obtezovani','spam','jine')),
  poznamka     text,
  -- Stav vyřízení. Mění jen obsluha (service_role), uživatel do toho nevidí.
  stav         text not null default 'nove' check (stav in ('nove','resi_se','vyrizeno','zamitnuto')),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);

-- Jeden člověk nahlásí tutéž věc jen jednou — jinak by šlo hlášení sypat
-- dokola a zkreslit tím statistiky.
create unique index if not exists reports_unikat
  on public.reports (reporter_id, target_type, target_id);

-- Řazení ve frontě vyřizování.
create index if not exists reports_stav_datum
  on public.reports (stav, created_at desc);

alter table public.reports enable row level security;

-- Uživatel smí hlášení POUZE vytvořit a vidět svoje. Cizí hlášení nevidí a
-- nic nesmí měnit ani mazat — jinak by šlo hlášení proti sobě smazat.
drop policy if exists "reports_insert_vlastni" on public.reports;
create policy "reports_insert_vlastni" on public.reports
  for insert to authenticated
  with check (auth.uid() = reporter_id);

drop policy if exists "reports_select_vlastni" on public.reports;
create policy "reports_select_vlastni" on public.reports
  for select to authenticated
  using (auth.uid() = reporter_id);

-- Žádná update ani delete policy → měnit stav může jen service_role
-- (obsluha přes dashboard nebo edge funkci).


-- ═══════════════════════════════════════════════════════════════════════════
-- POHLED PRO VYŘIZOVÁNÍ
-- Kolikrát byla která věc nahlášena — podle toho se dá řadit, co řešit dřív.
-- Čte se jen přes service_role.
--
-- POZOR: pohled se ve výchozím stavu spouští s právy VLASTNÍKA, takže by RLS
-- na `reports` obešel a každý přihlášený by přes něj viděl cizí hlášení.
-- `security_invoker = on` = pohled se řídí právy toho, kdo se ptá (PG 15+,
-- což Supabase má). Grants dole to pak stejně zavřou jen pro service_role.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace view public.reports_souhrn
with (security_invoker = on) as
select
  target_type,
  target_id,
  count(*)                                    as poctu_hlaseni,
  min(created_at)                             as prvni_hlaseni,
  max(created_at)                             as posledni_hlaseni,
  array_agg(distinct duvod)                   as duvody,
  count(*) filter (where stav = 'nove')       as nevyrizenych
from public.reports
group by target_type, target_id;

-- Pohled je jen pro obsluhu — klientské role k němu nemají co čichnout.
revoke all on public.reports_souhrn from anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- KONTROLA: po spuštění by tohle mělo vrátit 1 řádek s tabulkou a 2 politiky.
-- ═══════════════════════════════════════════════════════════════════════════
-- select table_name from information_schema.tables
--   where table_schema = 'public' and table_name = 'reports';
-- select policyname, cmd from pg_policies
--   where schemaname = 'public' and tablename = 'reports';
