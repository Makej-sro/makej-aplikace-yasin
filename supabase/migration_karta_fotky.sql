-- ═══════════════════════════════════════════════════════════════════════════
-- Makej — fotky na kartě Lidé (ukázky práce) do Supabase Storage
--
-- Dosud žily fotky jen v telefonu (localStorage jako data: URL), takže je
-- nikdo jiný neviděl a vešlo se jich sedm. Tahle migrace zakládá úložiště,
-- práva k němu a sloupec, kde si karta pamatuje odkazy.
--
-- Pustit ručně v Supabase → SQL editor. Je to idempotentní, jde spustit
-- víckrát. Souvisí s supabase/migration_people_cards.sql (ten musí běžet dřív).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1) Bucket ──────────────────────────────────────────────────────────────
-- Veřejný schválně: ukázky práce visí na kartě, kterou si sám autor přepnul na
-- „Veřejná“, a veřejný bucket znamená obyčejnou <img src> bez podepisování URL
-- (rychlejší, cacheovatelné). Soukromá data do něj nepatří — chatové přílohy
-- zůstávají v privátním 'chat-prilohy' se signed URL.
-- allowed_mime_types = pojistka proti nahrání php/svg/exe přes upravený klient.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('karta-fotky', 'karta-fotky', true, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp'];

-- ── 2) Práva ───────────────────────────────────────────────────────────────
-- Cesta je vždy '<user_id>/<nazev>', takže se vlastník pozná z první složky.
drop policy if exists "karta-fotky: cte kdokoli"      on storage.objects;
drop policy if exists "karta-fotky: vlastnik nahrava" on storage.objects;
drop policy if exists "karta-fotky: vlastnik meni"    on storage.objects;
drop policy if exists "karta-fotky: vlastnik maze"    on storage.objects;

create policy "karta-fotky: cte kdokoli" on storage.objects
  for select using (bucket_id = 'karta-fotky');

create policy "karta-fotky: vlastnik nahrava" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'karta-fotky'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "karta-fotky: vlastnik meni" on storage.objects
  for update to authenticated using (
    bucket_id = 'karta-fotky'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "karta-fotky: vlastnik maze" on storage.objects
  for delete to authenticated using (
    bucket_id = 'karta-fotky'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── 3) Kde si karta pamatuje odkazy ────────────────────────────────────────
alter table public.profiles
  add column if not exists card_photos text[] default '{}';

-- ── 4) Fotky musí ven i ostatním ───────────────────────────────────────────
-- get_people_cards vrací jen bezpečné sloupce profilu (ne e-mail/telefon/datum
-- narození). Přidává se card_photos; zbytek beze změny.
create or replace function public.get_people_cards(exclude_ids uuid[])
returns table (
  id uuid, name text, bio text, city text, kraj text,
  skills text[], card_offer text, card_tags text[], card_photos text[],
  rating numeric, verified boolean, avatar_url text, created_at timestamptz
)
language sql security definer set search_path = public
as $$
  select id, name, bio, city, kraj, skills, card_offer, card_tags,
         coalesce(card_photos, '{}'), rating, verified, avatar_url, created_at
  from profiles
  where card_enabled = true
    and id <> auth.uid()
    and not (id = any(exclude_ids));
$$;
grant execute on function public.get_people_cards(uuid[]) to authenticated;
