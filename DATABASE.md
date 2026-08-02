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

---

## Historie provedených změn

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
