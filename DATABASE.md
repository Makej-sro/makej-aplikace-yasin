# Databáze (Supabase) — sdílený stav a změny

Tuhle Supabase sdílí **appka brigádníka** (tenhle repo) a **firemní dashboard**
(Samův repo). Aby o změnách věděly obě strany i oba Claudi, platí dohoda:

> **Po každé session, kde se sáhlo na databázi** (přidání sloupce, funkce, RLS,
> trigger…), se sem zapíše záznam a přepošle druhé straně. Claude tenhle soubor
> **čte na začátku session** (ví, jak schéma vypadá) a **doplňuje na konci**.

Formát záznamu: **datum · kdo · co · přesné SQL**.

---

## Známé schéma (ověřeno, ne nutně kompletní výčet)

### profiles
`id`, `name`, `email`, `birth_date`, `city`, `kraj`, `address`, `bio`, `skills`,
`education`, `cv_url` (+ sloupce pro stupeň důvěry / hodnocení).
`kraj` = slug (`praha`, `jihomoravsky`, …) — seznam `KRAJE_W` v `www/worker-swipe.jsx`.

### messages (z práce na přílohách)
`id`, `match_id`, `sender_id`, `text`, `type`, `metadata`, `created_at`;
pro přílohy: `file_url`, `file_type` (`image` / `audio` / `file`), `file_name`,
`file_size`, `duration`.

### notifications
`id`, `user_id`, `match_id`, `type`, `read`, `created_at`. Plní je trigger
`notify_on_message` při vložení zprávy.

---

## Připravené změny (ještě nespuštěné)

> `availability` (dostupnost) zatím záměrně nepřidáváme — nemáme dořešený tvar
> (zaškrtávátka vs. dny). Doplní se jedním řádkem, až bude UI.

### Fotogalerie inzerátu — víc fotek (čeká na Sama: sloupec + nahrávání na dashboardu)
Detail inzerátu v appce brigádníka umí od 2026-08-16 **galerii fotek** (swipe +
tečky). Čte pole `job.photos` (pole URL); když chybí, spadne zpět na jednu hero
fotku (`image_url`/`image`/`cover_url`/`photo_url`). Aby galerie měla co ukazovat,
potřebuje **firemní strana**:
- sloupec na inzerátu, návrh `jobs.photos text[]` (pole veřejných URL fotek), a
- na dashboardu **nahrávání víc fotek** (storage bucket) → uloží URL do `jobs.photos`.

```sql
alter table public.jobs
  add column if not exists photos text[] default '{}';
```
Appka je připravená — jakmile `jobs.photos` poteče ven ve výběru inzerátů,
galerie se rozjede sama. **Chce se říct Samovi** (sdílené, firemní strana).

---

## Historie provedených změn

### 2026-08-11 · Jan (appka, Claude) · Lidé záložka: karty brigádníků + peer-to-peer chat
Nová funkce v appce brigádníka: kromě hledání práce si brigádník může zapnout
vlastní "kartu" (nabídne sám sebe — skill, čím by pomohl, ne nutně
full-time/brigáda), ostatní ji procházejí stejným swipe mechanismem jako
inzeráty. Při oboustranném zájmu vzniká match a chat — **oddělený** od chatů
k brigádám (nový sloupec `matches.kind`).

**Stav: SQL ještě NENÍ spuštěné** (Claude nemá service-role přístup k Supabase,
jen anon klíč). Kompletní migrace je v `supabase/migration_people_cards.sql`
v tomhle repu — než appka půjde spustit s Lidé záložkou, musí ho někdo
(Yasin/Jan) pustit ručně v Supabase SQL editoru.

Shrnutí změn (celé SQL viz soubor výš):
- `profiles`: `card_enabled boolean`, `card_offer text`, `card_tags text[]`.
- `matches`: `kind text` (`'job'`/`'people'`, default `'job'`), `worker_b_id uuid`
  (druhá strana u people-matche), `job_id` už není `not null`. Unique index na
  dvojici `(worker_id, worker_b_id)` pro `kind='people'` (nezávisle na směru).
- `rejections`: `kind text`, `target_id uuid`, `job_id` už není `not null`.
- Nové RPC (`security definer`, takže nepotřebují nové RLS na klientský
  insert/select z `matches`/`profiles`): `get_people_cards(exclude_ids)`
  (vrací jen bezpečné sloupce profilu, ne email/telefon/datum narození),
  `create_people_match(target_id, is_super)` (insert nebo oboustranné
  potvrzení na `accepted`), `create_people_rejection(target_id)`.
- Additive RLS (přidáno vedle stávajících politik, nic se nepřepisuje):
  `matches` SELECT pro `worker_b_id = auth.uid()`; `messages` SELECT/INSERT
  pro účastníka `worker_b_id` v people-matchi.
- **Nedodělané:** trigger `notify_on_message` (plní zvoneček) jeho definici
  appka nezná → zprávy v Lidé chatu zatím nepřidávají položku do zvonečku/
  toastu, jen se objeví ve vlákně přes realtime. Doplnit, až se trigger najde.

Chce se říct Samovi (sdílené) — nové sloupce na `matches`/`rejections`/`profiles`.

### 2026-07-26 · Yasin (web) · Nová tabulka `waitlist` (čekací list na marketingovém webu)
Marketingový web (`~/Desktop/makej-web 6.7`) zapisuje předregistrace na čekací list
před spuštěním appky. Zápis přes `sb.from('waitlist').insert({role,name,email,company_name,phone})`
(anon, `return=minimal`). Ověřeno anon INSERT → HTTP 201. Nemá SELECT/UPDATE/DELETE
policy (číst/mazat jde jen přes dashboard/service role).

```sql
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('worker','employer')),
  name text not null,
  email text not null,
  company_name text,
  phone text,
  created_at timestamptz not null default now(),
  unique (email, role)
);

alter table public.waitlist enable row level security;

create policy "anyone can join waitlist"
  on public.waitlist for insert
  to anon, authenticated
  with check (true);
```

### 2026-07-25 · Yasin · Auth: ověření e-mailu kódem (OTP) — SDÍLENÉ, týká se i webu
Ne SQL, ale nastavení Authentication (dotýká se i registrace na webu/dashboardu):
- Šablona **Confirm signup** rozšířena o 6místný kód `{{ .Token }}` (odkaz `{{ .ConfirmationURL }}`
  i tlačítko zůstaly → web funguje dál). Hlavička „Makej" (bez „!"), „swajp".
- **Email OTP expiration = 600 s** (10 min) — platí pro kód **i odkaz**.
- **Email OTP length = 6** (bylo 8).
- **Confirm email** = zapnuto.

Appka (`www/index.html`) po registraci ukazuje obrazovku na zadání kódu
(`verifyOtp` type `signup`), odpočet 10 min, „Poslat znovu", a při přihlášení
s nepotvrzeným e-mailem tam pošle rovnou. **Chce to říct Samovi** (sdílené).

### 2026-07-25 · Yasin (appka) · profiles: telefon, ověření, řidičák, auto
Nová pole profilu brigádníka. V `www/worker-profile.jsx` se ukládají přes
`updateProfileW` (`phone` = předvolba + číslo, např. `+420 777123456`).
`phone_verified` zůstává na budoucí SMS ověření (appka ho zatím nenastavuje).

```sql
alter table profiles
  add column if not exists phone text,
  add column if not exists phone_verified boolean default false,
  add column if not exists drivers_license boolean default false,
  add column if not exists has_car boolean default false;
```

### 2026-08-18 · Yasin (appka) · Rozšíření inzerátu (demo) — pole pro dashboard/DB
V appce (`www/worker-swipe.jsx` detail inzerátu) jsme na DEMO datech (`www/app.jsx`)
postavili bohatý inzerát. Až se to bude zadávat v dashboardu, tabulka `jobs`
(a profil firmy) bude potřebovat tato pole. Zatím ŽÁDNÁ změna DB nenasazena —
je to podklad, ať Sam ví, co chystat.

- `contract` text — typ smlouvy (DPP / DPČ / HPP / IČO), v kartě i detailu.
- `recurrence` text — pravidelnost brigády („Pravidelná" / „Jednorázová"); v kartě
  vlastní řádek s ikonkou (opakování vs. blesk). 2026-08-21.
- `payout` text — kdy je výplata (Týdně / Měsíčně / Hned po akci / Do 14 dní).
- `created_at` timestamptz — datum vložení → v kartě „Přidáno …" (relativní čas).
- `duties` text — podrobná náplň práce (víceřádkový popis celé směny).
- `expectations` text[] — „Co od tebe čekáme" (povinné).
- `bonuses` text[] — „Co oceníme" (nepovinné výhody).
- `offer` text[] — „Co ti nabídneme" (co firma dává).
- `perks` text[] — „Benefity" (konkrétní perky).
- `photos` text[] — galerie fotek (už dřív avizováno).

Profil firmy (employer/company) v „O nás":
- `bio` text — popis firmy (bez limitu délky).
- `founded` int — rok založení → „Na trhu od roku …".

```sql
-- až se bude nasazovat (návrh):
alter table public.jobs
  add column if not exists contract text,
  add column if not exists recurrence text,
  add column if not exists payout text,
  add column if not exists duties text,
  add column if not exists expectations text[] default '{}',
  add column if not exists bonuses text[] default '{}',
  add column if not exists offer text[] default '{}',
  add column if not exists perks text[] default '{}',
  add column if not exists photos text[] default '{}';
-- created_at už zpravidla existuje

-- profil firmy:
-- alter table public.profiles add column if not exists bio text;      -- pokud chybí
-- alter table public.profiles add column if not exists founded int;
```

### 2026-08-21 · Yasin (appka) · Uložené brigády — zatím jen localStorage
V kartě inzerátu je tlačítko „Uložit" (záložka). Zatím se ukládá **lokálně na
zařízení** (`localStorage`, klíč `makej-saved-jobs`), ŽÁDNÁ DB. Až se to bude
napojovat na účet (obrazovka „Uložené"), přidá se tabulka:

```sql
-- návrh (až se bude nasazovat):
create table if not exists public.saved_jobs (
  user_id uuid references auth.users on delete cascade,
  job_id  uuid references public.jobs on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, job_id)
);
alter table public.saved_jobs enable row level security;
create policy "own saved" on public.saved_jobs
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
```
