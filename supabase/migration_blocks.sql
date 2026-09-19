-- ═══════════════════════════════════════════════════════════════════════════
-- BLOKOVÁNÍ UŽIVATELŮ
-- ───────────────────────────────────────────────────────────────────────────
-- Vyžaduje App Store Guideline 1.2 (User-Generated Content). Appka s chatem
-- musí mít čtyři věci: filtr nevhodného obsahu, nahlašování, REAKCI na hlášení
-- a MOŽNOST ZABLOKOVAT obtěžujícího uživatele. Recenzent poslední bod aktivně
-- zkouší — bez něj appku neschválí.
--
-- Blokace je jednosměrná a nesymetrická: koho zablokuju, ten mi nesmí psát,
-- a ani já jemu. Druhá strana se to nedozví (žádné oznámení) — jinak by se
-- blokace stala nástrojem k dalšímu obtěžování.
--
-- Spustit v Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.blocks (
  blocker_id  uuid not null references public.profiles(id) on delete cascade,
  blocked_id  uuid not null references public.profiles(id) on delete cascade,
  duvod       text,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_ne_sam_sebe check (blocker_id <> blocked_id)
);

-- Odblokování v nastavení potřebuje seznam „koho jsem zablokoval" seřazený od
-- posledního; primární klíč na to neposlouží, ten řadí podle blocker_id.
create index if not exists blocks_moje_datum
  on public.blocks (blocker_id, created_at desc);

-- Trigger níž se ptá „zablokoval mě někdo?" — tedy hledá podle blocked_id.
create index if not exists blocks_kdo_me
  on public.blocks (blocked_id);

alter table public.blocks enable row level security;

-- Vidím a spravuju VÝHRADNĚ svoje blokace. Cizí nevidím — jinak by šlo zjistit,
-- kdo mě zablokoval, což je přesně to, co se druhá strana nemá dozvědět.
drop policy if exists "blocks_select_vlastni" on public.blocks;
create policy "blocks_select_vlastni" on public.blocks
  for select to authenticated
  using (auth.uid() = blocker_id);

drop policy if exists "blocks_insert_vlastni" on public.blocks;
create policy "blocks_insert_vlastni" on public.blocks
  for insert to authenticated
  with check (auth.uid() = blocker_id);

drop policy if exists "blocks_delete_vlastni" on public.blocks;
create policy "blocks_delete_vlastni" on public.blocks
  for delete to authenticated
  using (auth.uid() = blocker_id);

-- Žádná update policy: blokace se ruší smazáním, ne přepsáním.


-- ═══════════════════════════════════════════════════════════════════════════
-- ZPRÁVY SE PŘI BLOKACI NESMÍ ULOŽIT
-- Schovat konverzaci jen v appce NESTAČÍ — kdokoli si otevře vývojářskou
-- konzoli a zavolá insert do `messages` napřímo. Blokaci proto drží databáze.
--
-- security definer je tu nutné: pisatel svoje RLS na `blocks` má, ale na řádek
-- „on zablokoval mě" nevidí (viz policy výš), takže by kontrola vyšla naprázdno.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.zabran_zpravu_pri_blokaci()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  protistrana uuid;
begin
  -- Kdo je na druhé straně konverzace. U people-matche jsou to dva brigádníci
  -- (worker_id ↔ worker_b_id), u běžného matche brigádník ↔ zaměstnavatel.
  select case
           when m.worker_id   = new.sender_id then coalesce(m.worker_b_id, j.employer_id)
           when m.worker_b_id = new.sender_id then m.worker_id
           else m.worker_id                                  -- píše zaměstnavatel
         end
    into protistrana
    from public.matches m
    left join public.jobs j on j.id = m.job_id
   where m.id = new.match_id;

  if protistrana is null then
    return new;   -- konverzaci neumíme přiřadit → blokaci neřešíme
  end if;

  -- Stačí blokace v KTERÉMKOLI směru. Kdo zablokoval, nechce už ani psát.
  if exists (
    select 1 from public.blocks b
     where (b.blocker_id = new.sender_id and b.blocked_id = protistrana)
        or (b.blocker_id = protistrana   and b.blocked_id = new.sender_id)
  ) then
    raise exception 'Zprávu nelze odeslat — konverzace je zablokovaná.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists messages_kontrola_blokace on public.messages;
create trigger messages_kontrola_blokace
  before insert on public.messages
  for each row execute function public.zabran_zpravu_pri_blokaci();


-- ═══════════════════════════════════════════════════════════════════════════
-- KONTROLA: po spuštění má vrátit tabulku, 3 politiky a 1 trigger.
-- ═══════════════════════════════════════════════════════════════════════════
-- select table_name from information_schema.tables
--   where table_schema = 'public' and table_name = 'blocks';
-- select policyname, cmd from pg_policies
--   where schemaname = 'public' and tablename = 'blocks';
-- select tgname from pg_trigger where tgname = 'messages_kontrola_blokace';
