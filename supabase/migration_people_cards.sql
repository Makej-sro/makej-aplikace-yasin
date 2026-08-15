-- Lidé záložka: karty brigádníků + peer-to-peer chat, oddělený od chatů k brigádám.
-- Spustit ručně v Supabase SQL editoru (Claude nemá service-role přístup).
-- Jen ADDITIVE změny — nic stávajícího nemažeme ani nepřepisujeme.

-- 1) Karta na profilu brigádníka. bio/skills/city/kraj/name se recyklují
--    ze stávajícího profilu, tohle je jen to navíc pro kartu v Lidé.
alter table profiles
  add column if not exists card_enabled boolean not null default false,
  add column if not exists card_offer text,     -- "co nabízím / s čím pomůžu"
  add column if not exists card_tags text[];    -- rychlé štítky pro kartu

-- 2) matches: nový typ 'people' (peer-to-peer, bez job_id)
alter table matches
  add column if not exists kind text not null default 'job' check (kind in ('job','people')),
  add column if not exists worker_b_id uuid references profiles(id);
alter table matches alter column job_id drop not null;

create unique index if not exists uniq_people_match_pair
  on matches (least(worker_id, worker_b_id), greatest(worker_id, worker_b_id))
  where kind = 'people';

-- 3) rejections: "přeskočit" kartu člověka
alter table rejections
  add column if not exists kind text not null default 'job' check (kind in ('job','people')),
  add column if not exists target_id uuid references profiles(id);
alter table rejections alter column job_id drop not null;

-- 4) Bezpečné procházení karet — NE přímo tabulka profiles (má email/telefon/
--    datum narození, to cizím lidem nepatří). RPC vrací jen bezpečné sloupce.
create or replace function public.get_people_cards(exclude_ids uuid[])
returns table (
  id uuid, name text, bio text, city text, kraj text,
  skills text[], card_offer text, card_tags text[],
  rating numeric, verified boolean, avatar_url text, created_at timestamptz
)
language sql security definer set search_path = public
as $$
  select id, name, bio, city, kraj, skills, card_offer, card_tags,
         rating, verified, avatar_url, created_at
  from profiles
  where card_enabled = true
    and id <> auth.uid()
    and not (id = any(exclude_ids));
$$;
grant execute on function public.get_people_cards(uuid[]) to authenticated;

-- 5) Vytvoření/oboustranné potvrzení matche — přes RPC, ať nemusíme řešit
--    INSERT/UPDATE politiky na matches z klienta.
create or replace function public.create_people_match(target_id uuid, is_super boolean default false)
returns matches
language plpgsql security definer set search_path = public
as $$
declare m matches;
begin
  select * into m from matches
    where kind = 'people'
      and ((worker_id = target_id and worker_b_id = auth.uid())
        or (worker_id = auth.uid() and worker_b_id = target_id));
  if m.id is not null then
    if m.status <> 'accepted' then
      update matches set status = 'accepted' where id = m.id returning * into m;
    end if;
    return m;
  end if;
  insert into matches (worker_id, worker_b_id, kind, status, super)
    values (auth.uid(), target_id, 'people', 'pending', is_super)
    returning * into m;
  return m;
end;
$$;
grant execute on function public.create_people_match(uuid, boolean) to authenticated;

create or replace function public.create_people_rejection(target_id uuid)
returns void language sql security definer set search_path = public
as $$
  insert into rejections (worker_id, target_id, kind) values (auth.uid(), target_id, 'people')
  on conflict do nothing;
$$;
grant execute on function public.create_people_rejection(uuid) to authenticated;

-- 6) Additive RLS — ať worker_b_id strana vidí/píše do svých 'people' matchů.
--    Přidává se VEDLE stávajících politik, nic se nepřepisuje.
create policy "worker_b vidí své people matche" on matches
  for select to authenticated using (worker_b_id = auth.uid());

create policy "worker_b vidí zprávy ve svých people matchích" on messages
  for select to authenticated using (
    exists (select 1 from matches m where m.id = messages.match_id and m.worker_b_id = auth.uid())
  );

create policy "worker_b píše do svých people matchích" on messages
  for insert to authenticated with check (
    sender_id = auth.uid() and exists (
      select 1 from matches m where m.id = messages.match_id
        and m.worker_b_id = auth.uid() and m.status = 'accepted'
    )
  );

-- POZOR: trigger notify_on_message (plní zvoneček/notifications) tady není —
-- jeho definici Claude nemá k dispozici. Nové zprávy v 'people' chatu se
-- objeví normálně přes realtime na `messages`, ale zatím nepřidají položku
-- do zvonečku/toastu. Až se doplní definice triggeru, dá se rozšířit.
