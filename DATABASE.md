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
Hodnoty `type`: `text` (výchozí), `shift_offer`, `interview_offer` a od 2026-09-28
`job_offer` — firma z dashboardu pošle kartu svého aktivního inzerátu, `metadata` =
`{ job_id, title, pay, pay_unit, location, date }`. Appka kartu ukáže ve zprávách
(`WJobOfferCard`), po klepnutí načte inzerát a nabídne „Mám zájem" (vznikne běžný
match na ten inzerát). Bez změny schématu — pokud by na `type` byl CHECK, je potřeba
`job_offer` přidat.

### notifications
`id`, `user_id`, `match_id`, `type`, `read`, `created_at`. Plní je trigger
`notify_on_message` při vložení zprávy.

---

## Připravené změny (ještě nespuštěné)

### 2026-10-02 · Yasin (Claude) · Žádost o ověření firmy (`overeni_firem`)
**Soubor: `makej-web-sam/supabase/migration_overeni_firem.sql`. Čeká, až ho Yasin spustí.**
Dashboard (Profil firmy → Dokončeno → Ověřit firmu) chce kontaktní e-mail a IČO, IČO dohledá v ARES
a zapíše žádost. Nová tabulka `overeni_firem` (`id`, `firma_id` → profiles, `ico` 8 číslic, `email`,
`nazev_ares`, `adresa_ares`, `stav` ceka/schvaleno/zamitnuto, `created_at`, `vyrizeno_at`); RLS: firma
vidí a vkládá jen svoje (stav `ceka`), update/delete nemá. Jedna čekající žádost na firmu (unikátní
index), max. 3 za den (trigger). Trigger `overeni_firem_nova` (before insert, security definer) pošle
přes `makej_posli_email` e-mail na **podpora@makej.eu**; když e-mail selže, žádost se stejně uloží.
Trigger `overeni_firem_vyrizeni` (before update): `stav` → `schvaleno` zapne `profiles.verified` a pošle
firmě e-mail „Vaše firma je ověřená", přepnutí ze `schvaleno` jinam ho vypne. Appka se nemění
(odznak čte z `profiles.verified` jako dřív).

### 2026-10-02 · Yasin (Claude) · Úložiště `uploads` jen obrázky do 5 MB
Bucket `uploads` (fotky z dashboardu: logo, úvodní fotka, fotky firmy, fotky inzerátů — appka ho
nepoužívá) má teď i na serveru `file_size_limit = 5242880` a `allowed_mime_types = image/jpeg, image/png,
image/webp, image/gif`. Dashboard navíc odmítne soubor nad 15 MB / ne-obrázek a každou fotku přepíše do
JPEG, takže reálně jde nahoru pár set kB. **Spustil Yasin 2. 10., ověřeno jeho kontrolním dotazem.**
```sql
update storage.buckets set file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'] where id = 'uploads';
```

### 2026-10-02 · Yasin (Claude) · Druhá dávka: fotky karet v Lidech, stránkování, datum zhlédnutí, kraje
Ověřeno přes REST 2. 10.: chyběly `profiles.card_photos` (appka posílá kartu Lidí jedním `update`
i s fotkami, takže **karta se do DB vůbec neukládala**), `get_people_cards_page`, `job_views.created_at`.
Yasin spouští najednou: `migration_karta_fotky.sql` (bucket `karta-fotky` + politiky + `card_photos`
+ `get_people_cards` s fotkami; **opraveno: před ní `drop function`**, protože `create or replace`
neumí změnit návratový typ), `migration_lide_strankovani.sql`, `job_views.created_at` (bez výchozí
hodnoty pro staré řádky, `default now()` jen pro nové) a převod krajů z
`makej-web-sam/supabase/migration_jobs_pocet_a_hodiny.sql`. Nespuštěno záměrně:
`migration_read_presence.sql` (online/přečteno, appka ho zatím nepoužívá), `launch_list_pocet`
(ukáže na webu skutečný počet na čekacím listu, čeká na rozhodnutí), `reset_test_account` (nástroj na test).
**Spuštěno a ověřeno 2. 10.** (REST: `card_photos`, `job_views.created_at`, `get_people_cards_page` jsou).
Kontrolní dotaz ukázal, že chybí jen `launch_list_pocet`, `touch_last_seen`, `mark_thread_read` (záměrně)
a **`worker_trust_stats`** (odznak důvěry u kandidátů) → Yasin spustil `migration_worker_trust.sql`, ověřeno voláním.
Všechny triggery (oznámení, blokování, e-maily), úložiště a pg_cron/pg_net jsou.

### 2026-10-02 · Yasin (Claude) · Ověření, hodnocení a tarif si nikdo nezmění sám
**Soubor: `makej-web-sam/supabase/migration_profil_chranene_sloupce.sql`.** Pravidlo „Users can
update own profile" (`(auth.uid() = id) OR can_act_as(id)`) pouští celý řádek, triggery na
`profiles` žádné nebyly (Yasin 2. 10. přes `pg_policies`/`pg_trigger`). Firma si tak mohla dát
`verified = true`, `rating` nebo `plan`. Trigger `profiles_chranene_sloupce` (before insert or
update): když zapisuje `authenticated`/`anon`, tyhle tři sloupce nechá (insert: false / 0 / null).
SQL Editor, service role (budoucí Stripe webhook pro `plan`) a security definer funkce je měnit
můžou. **Spustil Yasin 2. 10., ověřeno** na test@makej.eu: PATCH `verified=true, rating=5,
plan='maximalni'` vrátil beze změny (false / 0 / `starter`). Pozn.: `plan` má výchozí `'starter'`.

### 2026-10-02 · Yasin (dashboard + appka, Claude) · Urgentní označuje firma — `jobs.urgent_until` + tabulka `job_urgentni`
**Soubor: `makej-web-sam/supabase/migration_urgentni.sql`** — nový sloupec `jobs.urgent_until
timestamptz` a tabulka `job_urgentni` (`job_id`, `employer_id default auth.uid()`, `started_at`,
`ends_at`) se stejnými RLS jako `job_topovani` (firma čte a zapisuje jen svoje, mazat nesmí).
Dřív byl inzerát urgentní sám (směna do 2 dnů). Teď ho firma označí v dashboardu („Označit
urgentní") a platí do začátku směny: `urgent_until` = datum + čas od. Appka podle
`urgent_until > now()` ukazuje fialovou pilulku Urgentní a odpočet (feed `get_feed_jobs` vrací
`to_jsonb(j)`, sloupec jde sám). Limit tarifu za měsíc: Dynamický 1, Maximální 2, Vlastní 3
(`EMPLOYER_URGENT_MESICNE` v `employer-pages.jsx`). **Bez sloupce `urgent_until` označení nejde
uložit** (dashboard ukáže „Nepovedlo se") a urgentní nebude nikde. Bez tabulky se limit počítá
odhadem ze sloupce. **Chce se říct Samovi.**

### 2026-09-29 · Yasin (dashboard, Claude) · Topování inzerátů — tabulka `job_topovani`
**Soubor: `makej-web-sam/supabase/migration_topovani.sql`** — nová tabulka `job_topovani`
(`job_id`, `employer_id default auth.uid()`, `started_at`, `ends_at`) + RLS: firma čte a zapisuje
jen svoje řádky a jen k vlastním inzerátům; mazat/upravovat nesmí (jinak by si vynulovala limit).
Tlačítko „Topovat" v dashboardu nastaví `jobs.top_until = now() + 72 h` (sloupec už existuje,
`get_feed_jobs` podle něj řadí; appka topované dává na začátek i po filtrech a ukazuje pilulku TOP)
a zapíše řádek sem. Z řádků od začátku měsíce se počítá limit tarifu (Základní 0, Výhodný 1,
Dynamický 3, Maximální 5, Vlastní 5 — `EMPLOYER_TOP_MESICNE` v `employer-pages.jsx`).
Dokud tabulka není, dashboard počítá odhadem z `jobs.top_until` a nic nespadne. Limit zatím hlídá
jen dashboard — tarif firmy v DB není; až bude, patří kontrola do RPC. **Chce se říct Samovi.**

### 2026-09-28 · Yasin (dashboard, Claude) · Inzerát: počet volných míst + hodiny týdně
**Soubor: `makej-web-sam/supabase/migration_jobs_pocet_a_hodiny.sql`** — additivní sloupce v `jobs`:
`positions integer default 1` (appka: „N volných míst" v detailu inzerátu) a `hours_per_week integer`
(appka: štítek Plný / Zkrácený / Částečný úvazek u pracovní smlouvy + „30 h/týden" na kartě —
`normalizeHours` v `www/makej-badge.jsx`). K tomu volitelný `update`, který převede staré názvy krajů
(„Jihomoravský") na id („jihomoravsky") — appka filtruje podle id.
Okno Nový / Upravit inzerát v dashboardu teď zapisuje i už existující sloupce z 2026-08-22
(`contract, recurrence, payout, duties, expectations, bonuses, offer, perks`). `positions` a
`hours_per_week` posílá taky; dokud sloupce nejsou, zápis je vynechá (PostgREST PGRST204 → zkusí
znovu bez nich), takže nic nespadne. **Chce se říct Samovi.**

### 2026-09-28 · Yasin (dashboard, Claude) · Stupeň důvěry brigádníka pro firmy
**Soubor: `makej-web-sam/supabase/migration_worker_trust.sql`** — nová funkce, žádná tabulka:
`worker_trust_stats(worker_ids uuid[])` → `(worker_id, dokoncene, zrusene)`, `security definer`,
spustit smí jen `authenticated`. Dashboard z ní ukazuje u kandidáta stejný odznak jako appka
(Nový / Spolehlivý / Ověřený / Top, hranice z `W_TIERS` ve `www/worker-supabase.jsx`) — firma
přes RLS nevidí matches jiných firem, proto to počítá DB. Dokud funkce chybí, odznak se
nezobrazí. Zároveň z dashboardu zmizely `profiles.level` a `profiles.jobs_done` (appka je nikdy
nezapisuje, u všech bylo „Level 1 · 0 směn"). **Chce se říct Samovi.**

### 2026-09-26 · Yasin (dashboard, Claude) · Profil firmy — fotka pozadí, kontakty, otevírací doba
**Soubor: `makej-web-sam/supabase/migration_profil_firmy.sql`** — jen additivní sloupce v `profiles`:
```sql
alter table public.profiles add column if not exists cover_url     text;
alter table public.profiles add column if not exists founded       text;
alter table public.profiles add column if not exists career_url    text;
alter table public.profiles add column if not exists phone         text;
alter table public.profiles add column if not exists contact_email text;
alter table public.profiles add column if not exists opening_hours jsonb;
```
Dashboard (nová záložka Profil firmy) je ukládá druhým `update` zvlášť od stávajících
sloupců — dokud chybí, uloží se základ a firma dostane hlášku. `socials` nově může mít
i klíč `youtube`. Appka zatím ukazuje jen `founded` (už ho čte); `cover_url`, kontakty
a otevírací dobu v profilu firmy (WEmployerModal) teprve napojit. **Chce se říct Samovi.**
**Doplněno 2. 10.:** ověřeno přes REST, že pořád chybí `cover_url`, `career_url`,
`contact_email`, `opening_hours`. Dokud chybí, dashboard je ukládá do `profiles.branding.<sloupec>`
(jsonb). Na konci migrace je proto `update`, který je přesune do sloupců (nepřepíše vyplněné)
a z `branding` smaže, takže se po spuštění nic neztratí. **Spustil Yasin 2. 10.** (spolu
s `migration_urgentni.sql`, `migration_topovani.sql` a `jobs.hours_per_week`), ověřeno přes REST.

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
- `contract`: `DPP` | `DPČ` | `HPP` | `IČO` | `Dohodou` (volnější, jen se zobrazuje).
  `Dohodou` (od 2026-09-29) = firma smlouvu neuvádí: na kartě štítek „Dle domluvy",
  ve filtru smlouvy se inzerát neukáže, v detailu dlaždice Smlouva „Dohodou". Žádná změna schématu.
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
