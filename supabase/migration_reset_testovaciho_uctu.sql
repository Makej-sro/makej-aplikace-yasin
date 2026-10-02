-- ═══════════════════════════════════════════════════════════════════════════
-- RESET TESTOVACÍHO ÚČTU — appka se má chovat, jako by tam ten člověk nikdy nebyl
-- ───────────────────────────────────────────────────────────────────────────
-- ⚠️  TOHLE JE NÁSTROJ NA TESTOVÁNÍ. PŘED SPUŠTĚNÍM SMAZAT (viz konec souboru).
--
-- K čemu to je: účet clovek@makej.eu slouží k procházení onboardingu pořád
-- dokola — zkouší se na něm, kde všude appka člověka zastaví, než ho pustí
-- dál (věk, profil, karta). Aby to šlo opakovat, musí se po každém vstupu
-- uvést do výchozího stavu.
--
-- Proč funkce a ne mazání z appky: RLS mazání vlastních řádků nedovolí.
-- Ověřeno 2026-09-21 — DELETE na `rejections` vrátí HTTP 200, ale smaže
-- NULA řádků. (Pozor na to i jinde: 200 neznamená, že se něco stalo.)
--
-- Proč ne obyčejné DELETE politiky: musely by platit pro všechny uživatele.
-- U `matches` by to znamenalo, že si brigádník může smazat konverzaci
-- i druhé straně. Tahle funkce je proti tomu zamčená na jeden e-mail.
--
-- Spustit ručně v Supabase → SQL Editor. Idempotentní.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.reset_test_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid  uuid;
  mail text;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'reset_test_account: nikdo není přihlášený';
  end if;

  select email into mail from auth.users where id = uid;

  -- Zámek: funguje VÝHRADNĚ pro testovacího člověka. Kdyby se sem omylem
  -- dostal kdokoli jiný, nesmí si smazat vlastní data.
  if mail is distinct from 'clovek@makej.eu' then
    raise exception 'reset_test_account: jen pro testovací účet, ne pro %', mail;
  end if;

  -- Zprávy musí ven dřív než konverzace, na kterých visí.
  delete from public.messages
   where match_id in (select id from public.matches
                       where worker_id = uid or worker_b_id = uid);
  delete from public.matches     where worker_id = uid or worker_b_id = uid;
  delete from public.rejections  where worker_id = uid;
  delete from public.notifications where user_id = uid;
  delete from public.reviews     where reviewer_id = uid or reviewed_id = uid;

  -- Profil zpátky na prázdný. `name` se schválně nechává — je to jeho jméno,
  -- ne nasbíraný stav. birth_date je tu to hlavní: bez něj se znovu spustí
  -- věková zábrana, což je přesně to, co se na tomhle účtu zkouší.
  update public.profiles set
    birth_date = null, city = null, kraj = null, address = null, bio = null,
    education = null, skills = null, avatar_url = null, cv_url = null, phone = null,
    card_enabled = false, card_offer = null, card_tags = null
  where id = uid;
end;
$$;

grant execute on function public.reset_test_account() to authenticated;

-- Kontrola po spuštění (přihlášený jako clovek@makej.eu):
--     select public.reset_test_account();
-- Kdokoli jiný musí dostat chybu „jen pro testovací účet".

-- ── PŘED SPUŠTĚNÍM NAOSTRO ─────────────────────────────────────────────────
--     drop function if exists public.reset_test_account();
-- a smazat účet clovek@makej.eu v Authentication → Users.
