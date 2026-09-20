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

### 2026-09-20 · Jan (appka, Claude) · Karty v Lidech bez limitu
**Soubor: `supabase/migration_lide_strankovani.sql` — POŘADÍ: už zbývá jen
`migration_karta_fotky.sql` před ní.** `migration_people_cards.sql`
i `migration_blocks.sql` doběhly 2026-09-20 (viz historie níž), takže chybí
poslední předpoklad: `profiles.card_photos`.

⚠️ **Do `migration_karta_fotky.sql` napřed doplnit `card_photo_notes text[]`.**
Appka kreslí u fotek práce popisky (`person.photoNotes` ve `worker-people.jsx`),
ale žádná migrace na ně sloupec nemá — bez doplnění by se reálným uživatelům
zahazovaly. Musí se přidat i do `get_people_cards` / `get_people_cards_page`
a do ukládání ve `wUlozFotkyKartyW`.

`get_people_cards(exclude_ids)` nemá limit ani stránkování → vrací všechny
karty naráz; při 10 000 profilech s fotkami jsou to desítky MB. Přidává
`get_people_cards_page(p_limit, p_offset)` s výlukou (blokovaní, přeskočení)
v SQL a index `rejections(worker_id, target_id)`. Stará funkce zůstává vedle
jako overload.

**Zbývá dodělat v appce:** záložka Lidé filtruje kraj/obor až v telefonu, takže
si teď bere prvních ~180 karet. Než tržiště naroste, přesunout filtr do SQL
a přidat donačítání při scrollu.


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

### Online presence + read receipts (Zprávy) — připraveno, ještě NEspuštěno
Zelená tečka „online" a stavy zpráv „Doručeno/Přečteno" v appce jsou zatím jen
demo (napevno v `www/worker-demo.jsx`). Reálně to potřebuje 2 additivní sloupce
a 2 SECURITY DEFINER funkce. Celé SQL je v `supabase/migration_read_presence.sql`.

- `profiles.last_seen timestamptz` — heartbeat z appky (`touch_last_seen()` ~30 s);
  UI: `now - last_seen < 60 s` → „Aktivní teď", jinak „Aktivní před X".
- `messages.read_at timestamptz` — orazítkuje příjemce přes `mark_thread_read(match_id)`
  při otevření vlákna; UI: `read_at != null` → „Přečteno", jinak „Doručeno".

```sql
alter table profiles add column if not exists last_seen timestamptz;
alter table messages add column if not exists read_at  timestamptz;
-- + funkce touch_last_seen(), mark_thread_read(uuid) — viz migrační soubor
```
**Chce se říct Samovi**: aby brigádník viděl „Přečteno", musí firemní dashboard
volat svou obdobu `mark_thread_read` při otevření vlákna; a `last_seen` firmy se
plní jen když i dashboard posílá heartbeat. Appka se napojí, jakmile SQL poteče.

---

## Historie provedených změn

### 2026-09-20 · Jan (appka, Claude) · SPUŠTĚNO: škálování feedu + karty lidí + blokace
Tři migrace v tomhle pořadí (pořadí bylo nutné, viz past níž):

1. **`migration_feed_skalovani.sql`** — `get_feed_jobs(p_limit, p_offset)`,
   `get_rejected_jobs(...)`, `count_rejected_jobs()` + indexy
   `rejections(worker_id, job_id)`, `matches(worker_id, job_id)`,
   `jobs(status, created_at desc)`.

   **Proč:** appka posílala seznam všeho odswajpovaného zpátky serveru v adrese
   dotazu. Změřeno proti ostré DB: 500 odmítnutých projde (adresa 18 kB),
   1000 → HTTP 400, 2000 → HTTP 414. Po ~1000 swajpech se feed přestal načítat
   úplně (při 20 swajpech denně necelé dva měsíce používání). Teď si výluku
   dělá server přes `not exists`, z telefonu neodchází žádný výčet.
   Vedlejší efekt: přihlášení zrychlilo ze 4,0 s na 2,9 s (ubyly dva dotazy).

2. **`migration_people_cards.sql`** — `profiles.card_enabled/card_offer/card_tags`,
   `matches.kind/worker_b_id`, `rejections.kind/target_id`, `get_people_cards`,
   `create_people_match`, `create_people_rejection`, 3 RLS politiky.

3. **`migration_blocks.sql`** — tabulka `blocks`, 3 RLS politiky, trigger
   `messages_kontrola_blokace`.

⚠️ **PAST, na kterou pozor i příště:** `migration_blocks.sql` se NESMÍ spustit
před `migration_people_cards.sql`. Její trigger na `messages` čte
`matches.worker_b_id`; protože je to plpgsql, funkce se vytvoří i bez toho
sloupce a spadne až za běhu — tedy **při první odeslané zprávě** a chat by
přestal fungovat. Ověřeno po spuštění: tabulka `blocks` čitelná, blokace sebe
sama odmítnuta (constraint, 400), blokace cizím jménem odmítnuta (RLS, 403),
`get_feed_jobs()` i `get_people_cards()` dál funkční.

**V appce k tomu:** `worker-supabase.jsx` (v=11) pozná, jestli RPC existuje
(`42883`/`PGRST202`), a bez migrace jede původní cestou — nasazení appky a DB
tedy nemusí být synchronní. `worker-main.jsx` (v=47) dotahuje zbytek feedu
na pozadí přes `dotahniZbytekFeeduW`.


### 2026-09-19 · Jan (appka, Claude) · ČEKÁ NA SPUŠTĚNÍ: fotky ukázek práce na kartě Lidé
Fotky na kartě Lidé dosud žily **jen v telefonu** (localStorage jako `data:` URL),
takže je nikdo jiný neviděl a vešlo se jich sedm (strop ~3,2 MB, co web v telefonu
dostane). Tohle je dává do Supabase Storage.

Celé SQL je v `supabase/migration_karta_fotky.sql` — **pustit ručně v Supabase →
SQL editor**, je idempotentní. Pozor: předpokládá, že už běžel
`supabase/migration_people_cards.sql` (ten podle záznamu z 2026-08-11 **taky ještě
nikdo nepustil**).

Co to dělá:
- **bucket `karta-fotky`**, veřejný, strop 5 MB na soubor, povolené typy jen
  `image/jpeg`, `image/png`, `image/webp`. Veřejný schválně — ukázky práce visí na
  kartě, kterou si autor sám přepnul na „Veřejná", a veřejný bucket znamená
  obyčejné `<img src>` bez podepisování URL. Chatové přílohy zůstávají v privátním
  `chat-prilohy` se signed URL, tam se nic nemění.
- **4 politiky na `storage.objects`**: číst smí kdokoli, nahrávat/měnit/mazat jen
  vlastník ve své složce (cesta je vždy `<user_id>/<timestamp>-<náhoda>.jpg`,
  vlastník se pozná z první složky).
- **`profiles.card_photos text[] default '{}'`** — odkazy na fotky karty.
- **`get_people_cards(exclude_ids)`** rozšířeno o `card_photos` (jinak beze změny,
  pořád vrací jen bezpečné sloupce profilu).

Appka je hotová a čeká (`worker-supabase.jsx`: `wNahrajFotkuKartyW`,
`wSmazFotkyKartyW`, `wUlozFotkyKartyW`; editor karty nahrává při uložení). Dokud
migrace neproběhne, nahrání selže a karta se uloží po staru do telefonu — jen se
k tomu napíše hláška. Nic se nerozbije.

**Chce se říct Samovi:** nový bucket + nový sloupec na `profiles` + změněná
signatura `get_people_cards` (přibyl sloupec `card_photos` ve výstupu).

**Ještě nedodělané:** zbytek karty (cena, dostupnost, vybavení, zkušenost, štítky
„ukazovat") pořád žije jen v telefonu — na server jdou zatím `card_enabled`,
`card_offer`, `card_tags`, `bio` a nově `card_photos`.

### 2026-09-03 · Yasin · SPUŠTĚNO: tabulka `reports` (nahlašování obsahu)
Yasin pustil v Supabase SQL Editoru (main/production) — `Success. No rows returned`.
Additivní, nesahá na žádnou stávající tabulku. Vyžaduje to **App Store Guideline 1.2**
(User-Generated Content): appka s chatem a profily musí umět nevhodný obsah nahlásit.

Celé SQL: `supabase/migration_reports.sql`. Co vzniklo:
- `public.reports` — `reporter_id` → `profiles.id`, `target_type`
  (`job|person|employer|thread|review`), `target_id uuid`, `duvod`, `poznamka`,
  `stav` (`nove|resi_se|vyrizeno|zamitnuto`), `created_at`, `resolved_at`.
  Záměrně obecná, ať jde použít i na profily a konverzace, ne jen na inzeráty;
- unique index `(reporter_id, target_type, target_id)` — jeden člověk nahlásí
  tutéž věc jen jednou; index `(stav, created_at desc)` na frontu vyřizování;
- RLS: přihlášený smí hlášení **jen vytvořit a číst svoje**. Update/delete
  policy schválně nejsou → stav mění jen `service_role` (obsluha);
- pohled `public.reports_souhrn` (kolikrát byla věc nahlášena) se
  `security_invoker = on` + `revoke` pro `anon`/`authenticated` — bez toho by
  pohled obešel RLS a každý přihlášený by přes něj četl cizí hlášení.

Appka po odeslání hlášení zároveň přidá inzerát mezi odmítnuté, takže tomu, kdo
ho nahlásil, hned zmizí z feedu — to je ta viditelná reakce, kterou Apple chce.

> **Zbývá:** vyřizování hlášení (změna `stav`) nemá zatím žádné UI — musí se
> dělat ručně v Supabase, nebo to Sam přidá do dashboardu.
> Pozn.: v demo režimu (`W_DEMO_ON = true`) mají inzeráty id typu `demo-h-1`,
> což není uuid — hlášení se u nich neuloží a appka to rovnou napíše.

### 2026-08-22 · Yasin · SPUŠTĚNO: sloupce jobs + profiles (detail karty + filtr)
Yasin sám pustil v Supabase SQL Editoru (main/production) additivní migraci —
sloupce, na kterých staví bohatý detail inzerátu a filtr v appce brigádníka.
Ověřeno přes anon API, že sloupce existují (zatím prázdné). **Nasazeno.**

```sql
alter table public.jobs
  add column if not exists contract    text,
  add column if not exists recurrence  text,
  add column if not exists obor         text,
  add column if not exists payout       text,
  add column if not exists duties       text,
  add column if not exists expectations text[] default '{}',
  add column if not exists bonuses      text[] default '{}',
  add column if not exists offer        text[] default '{}',
  add column if not exists perks        text[] default '{}',
  add column if not exists photos       text[] default '{}';
alter table public.profiles
  add column if not exists bio     text,
  add column if not exists founded int;
```

**Zbývá firemní strana (Sam):** dashboard musí umět tato pole vyplnit při
tvorbě/úpravě inzerátu (a profil firmy `bio`/`founded`). **DŮLEŽITÉ:** filtr
v appce porovnává PŘESNÉ hodnoty, takže tato pole musí být v dashboardu
**roletky s přesně danými hodnotami**, ne volný text:
- `job_type`: `brigada` | `part_time` | `full_time` | `jednrazova_vypomoc`
- `obor`: `gastro` | `sklad` | `promo` | `foto` | `prodej`
- `recurrence`: `Pravidelná` | `Jednorázová`
- `payout`: `Týdně` | `Hned po akci` | `Do 14 dní` | `Měsíčně`
- `contract`: `DPP` | `DPČ` | `HPP` | `IČO` (volnější, jen se zobrazuje)
Volný text/seznamy (bez vlivu na filtr): `duties` (víceřádkový popis),
`expectations`/`bonuses`/`offer`/`perks` (pole řádků), `photos` (URL z uploadu).

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
- `obor` text — kategorie brigády pro filtr (`gastro` / `sklad` / `promo` / `foto` /
  `prodej`). Nové pole kvůli filtru inzerátů (trychtýř). 2026-08-22.
  Filtr staví i na `job_type` (úvazek: brigada/part_time/full_time/jednrazova_vypomoc),
  `pay` (cenové pásmo), `payout` (výplata), `recurrence` — vše už výše.
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
  add column if not exists obor text,
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

### 2026-09-06 · Yasin (web) · SPUŠTĚNO: Evidence souhlasů s cookies — `consent_log` + RPC `log_consent`
Web makej.eu má novou lištu cookies (`consent.js`). Každé rozhodnutí posílá přes RPC
do tabulky `consent_log` — doložitelnost souhlasu (GDPR čl. 7, § 89 odst. 3 zák.
127/2005 Sb.). **Bez IP a bez plného user-agentu**, jen solený sha256 otisk; sůl leží
v `private.consent_salt` (schéma mimo API). Tabulka má RLS bez policy, zapisuje jen
funkce. Yasin pustil 2026-09-06 v SQL Editoru (main/production) včetně soli; ověřeno zápisem přes anon API (otisk + rodina prohlížeče se plní) a že tabulku zvenku číst nejde (42501).

Celý skript: `makej-web-sam/supabase/migration_consent_log.sql`. Po spuštění **vložit sůl**:
```sql
insert into private.consent_salt (salt)
  values (encode(extensions.gen_random_bytes(32), 'hex'))
  on conflict (id) do nothing;
```
Skartace (zásady slibují 3 roky): `delete from public.consent_log where decided_at < now() - interval '3 years';`
