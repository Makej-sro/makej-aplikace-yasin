-- ═══════════════════════════════════════════════════════════════════════════
-- KARTY V LIDECH — stránkovaně a s výlukou na serveru
-- ───────────────────────────────────────────────────────────────────────────
-- ⚠️  POŘADÍ: tahle migrace potřebuje sloupce a tabulky z ostatních. Spustit
--     AŽ PO (jinak skončí chybou „column ... does not exist"):
--         1. migration_people_cards.sql   → profiles.card_enabled, rejections.target_id
--         2. migration_karta_fotky.sql    → profiles.card_photos
--         3. migration_blocks.sql         → tabulka blocks
--     Ověřeno 2026-09-20: ani jedna z nich zatím neběžela.
--
--     migration_feed_skalovani.sql je naproti tomu samostatná a naléhavá —
--     ta se dá pustit hned a nezávisle na téhle.
--
-- PROBLÉM: get_people_cards(exclude_ids) nemá žádný limit ani stránkování,
-- takže vrací všechny karty naráz. Při deseti tisících profilech s bio,
-- nabídkou, štítky a až dvaceti fotkami jsou to desítky MB v jednom dotazu —
-- a výluka se navíc posílá z telefonu jako výčet ID, stejná past jako u feedu.
--
-- ŘEŠENÍ: stránkování + výluka (zablokovaní, už přeskočení) na serveru.
-- Stará funkce zůstává vedle (jiný počet parametrů = overload), ať se nic
-- nerozbije, než se appka aktualizuje.
--
-- POZNÁMKA K DOTAŽENÍ: appka si zatím bere prvních ~180 karet a filtruje je
-- v telefonu. Než tržiště naroste, je potřeba přesunout filtr (kraj, obor,
-- dojezd) do SQL a přidat donačítání při scrollu. Viz DATABASE.md.
--
-- Spustit ručně v Supabase → SQL Editor. Idempotentní.
-- ═══════════════════════════════════════════════════════════════════════════

-- Bez indexu by se „koho už přeskočil" hledalo průchodem celé tabulky.
create index if not exists rejections_worker_target_idx
  on public.rejections (worker_id, target_id);

-- Vrací jen bezpečné sloupce profilu: ŽÁDNÝ e-mail, telefon ani datum narození.
create or replace function public.get_people_cards_page(
  p_limit  int default 60,
  p_offset int default 0
)
returns table (
  id uuid, name text, bio text, city text, kraj text,
  skills text[], card_offer text, card_tags text[], card_photos text[],
  rating numeric, verified boolean, avatar_url text, created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.name, p.bio, p.city, p.kraj, p.skills, p.card_offer, p.card_tags,
         coalesce(p.card_photos, '{}'), p.rating, p.verified, p.avatar_url, p.created_at
  from public.profiles p
  where p.card_enabled = true
    and p.id <> auth.uid()
    -- koho jsem zablokoval
    and not exists (
      select 1 from public.blocks b
      where b.blocker_id = auth.uid() and b.blocked_id = p.id)
    -- koho jsem už přeskočil
    and not exists (
      select 1 from public.rejections r
      where r.worker_id = auth.uid() and r.target_id = p.id)
  order by p.rating desc nulls last, p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 60), 200))
  offset greatest(0, coalesce(p_offset, 0));
$$;

grant execute on function public.get_people_cards_page(int, int) to authenticated;

-- Kontrola po spuštění:
--     select * from public.get_people_cards_page(5, 0);
