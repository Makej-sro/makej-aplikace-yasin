-- ═══════════════════════════════════════════════════════════════════════════
-- ŠKÁLOVÁNÍ FEEDU — aby appka fungovala i po letech a stovkách swajpů denně
-- ───────────────────────────────────────────────────────────────────────────
-- ⚠️  TOHLE JE TA NALÉHAVÁ ČÁST. Nemá žádné předpoklady, dá se spustit hned.
--     (Karty v Lidé řeší migration_lide_strankovani.sql, ta čeká na ostatní.)
--
-- PROBLÉM, který to řeší (změřeno 2026-09-20 proti ostré databázi):
--
-- Appka si dnes při každém přihlášení stáhne seznam všeho, co člověk kdy
-- odswajpoval, a pošle ho serveru zpátky v adrese dotazu jako výčet ID
-- („tyhle mi neposílej"). Ten výčet roste donekonečna:
--
--     500 odmítnutých → adresa 18 kB → ještě projde
--    1000 odmítnutých → HTTP 400
--    2000 odmítnutých → HTTP 414 URI Too Long
--
-- Tedy: po zhruba tisícovce swajpů se feed přestane načítat ÚPLNĚ. Při dvaceti
-- swajpech denně je to necelé dva měsíce používání.
--
-- Navíc se stahují všechny aktivní inzeráty naráz bez limitu (1,08 kB na
-- inzerát → 500 inzerátů = 541 kB při každém přihlášení).
--
-- ŘEŠENÍ: výčet se přestane posílat. Server si sám sáhne do `rejections`
-- a `matches` — ty řádky tam už leží — a vrátí rovnou stránku toho, co člověk
-- ještě neviděl. Z pohledu uživatele se nemění nic; „projít odmítnuté" na konci
-- zásobníku funguje dál, jen se ptá opačně.
--
-- Appka funguje i BEZ téhle migrace — spadne na původní cestu. Jen jí zůstává
-- ten strop kolem tisícovky swajpů.
--
-- Spustit ručně v Supabase → SQL Editor (Claude nemá service-role přístup).
-- Vše je idempotentní, dá se pustit opakovaně.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── 1) Indexy ──────────────────────────────────────────────────────────────
-- Bez nich by „co tenhle člověk ještě neviděl" znamenalo projít celou tabulku
-- odmítnutí při každém načtení feedu. S nimi je to skok do indexu.

create index if not exists rejections_worker_job_idx
  on public.rejections (worker_id, job_id);

create index if not exists matches_worker_job_idx
  on public.matches (worker_id, job_id);

-- Řazení feedu: aktivní inzeráty od nejnovějších.
create index if not exists jobs_feed_idx
  on public.jobs (status, created_at desc);


-- ── 2) Feed inzerátů ───────────────────────────────────────────────────────
-- Vrací jsonb, ne `setof jobs` — ke každému inzerátu patří i kousek profilu
-- firmy (hodnocení, název, ověření), který appka kreslí na kartu. Tvar je
-- schválně stejný jako u dosavadního dotazu z klienta, aby se v appce nemuselo
-- přepisovat vykreslování: { ...inzerát, employer: { ... } }.
--
-- security definer: funkce čte `rejections` a `matches` přihlášeného člověka.
-- Filtruje se vždy podle auth.uid(), takže cizí data z ní vytáhnout nejde.

create or replace function public.get_feed_jobs(
  p_limit  int default 50,
  p_offset int default 0
)
returns setof jsonb
language sql
security definer
set search_path = public
stable
as $$
  select to_jsonb(j) || jsonb_build_object(
           'employer', jsonb_build_object(
             'rating',       e.rating,
             'name',         e.name,
             'company_name', e.company_name,
             'verified',     e.verified))
  from public.jobs j
  left join public.profiles e on e.id = j.employer_id
  where j.status = 'active'
    -- naplánované na později se ještě neukazují
    and (j.publish_at is null or j.publish_at <= now())
    -- co už odswajpoval doleva
    and not exists (
      select 1 from public.rejections r
      where r.worker_id = auth.uid() and r.job_id = j.id)
    -- co už odswajpoval doprava (má na to match)
    and not exists (
      select 1 from public.matches m
      where m.worker_id = auth.uid() and m.job_id = j.id)
  -- zaplacené vyzdvižení nahoru, jinak od nejnovějších
  order by (j.top_until is not null and j.top_until > now()) desc,
           j.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 200))
  offset greatest(0, coalesce(p_offset, 0));
$$;

grant execute on function public.get_feed_jobs(int, int) to authenticated;


-- ── 3) Odmítnuté inzeráty („projít znovu" na konci zásobníku) ──────────────
-- Stejný problém obráceně: dnes si appka stáhne všechna ID odmítnutých a pak
-- se na ně doptá výčtem v adrese. Tady vrací server rovnou celé inzeráty.
-- Jen ty, které jsou pořád aktivní — ať počet na tlačítku odpovídá realitě.

create or replace function public.get_rejected_jobs(
  p_limit  int default 50,
  p_offset int default 0
)
returns setof jsonb
language sql
security definer
set search_path = public
stable
as $$
  select to_jsonb(j) || jsonb_build_object(
           'employer', jsonb_build_object(
             'rating',       e.rating,
             'name',         e.name,
             'company_name', e.company_name,
             'verified',     e.verified))
  from public.rejections r
  join public.jobs j on j.id = r.job_id
  left join public.profiles e on e.id = j.employer_id
  where r.worker_id = auth.uid()
    and j.status = 'active'
    and (j.publish_at is null or j.publish_at <= now())
  order by r.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 200))
  offset greatest(0, coalesce(p_offset, 0));
$$;

grant execute on function public.get_rejected_jobs(int, int) to authenticated;

-- Kolik jich odmítl celkem (i těch, co už nejsou aktivní) — číslo na tlačítku.
create or replace function public.count_rejected_jobs()
returns int
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::int from public.rejections
  where worker_id = auth.uid() and job_id is not null;
$$;

grant execute on function public.count_rejected_jobs() to authenticated;


-- ── Kontrola po spuštění ───────────────────────────────────────────────────
-- Mělo by vrátit řádky (nebo prázdno, když nejsou aktivní inzeráty) a hlavně
-- NE chybu „function does not exist":
--     select * from public.get_feed_jobs(5, 0);
--     select public.count_rejected_jobs();
