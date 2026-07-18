# Makej! — mobilní aplikace pro brigádníky

Nativní mobilní appka (iOS + Android) postavená jako **Capacitor obal** webového
rozhraní pro brigádníky z `makej-web/worker/`. Kód je stejný jako na webu, jen
zabalený tak, aby šel nahrát na **App Store** a **Google Play**.

- **appId:** `eu.makej.brigadnik`
- **appName:** `Makej`
- **webDir:** `www/` (kompletní appka — funguje i samostatně jako web)
- Sdílí **stejnou Supabase** a `storageKey: 'makej-auth'` jako web i employer dashboard.

---

## Co je uvnitř

```
makej-aplikace/
├── capacitor.config.json     # appId, appName, StatusBar, SplashScreen
├── package.json              # Capacitor závislosti + skripty
├── www/                      # celá appka (100 % offline, žádné CDN)
│   ├── index.html            # nativní viewport, safe-area, no-zoom, auth gate
│   ├── app.jsx               # sdílené tokeny (T) + komponenty (kopie z employer/app.jsx)
│   ├── worker-*.jsx          # rozhraní brigádníka (swipe, zprávy, profil, historie)
│   ├── fonts.css + fonts/    # Plus Jakarta Sans, Inter, JetBrains Mono (lokálně)
│   └── vendor/               # React, ReactDOM, Supabase, Babel, iconify + offline ikony
├── ios/                      # vygeneruje `npx cap add ios`   (není v repu do 1. buildu)
└── android/                  # vygeneruje `npx cap add android`
```

### Proč offline vendoring
App Store i Google Play vyžadují, aby appka měla smysl i bez okamžitého CDN.
Všechny knihovny, fonty i ikony (sada **Solar** přes `IconifyPreload`) jsou proto
staženy lokálně do `www/vendor/` a `www/fonts/`. Jediné, co appka potřebuje síť
pro, je samotná Supabase (přihlášení, nabídky, chat) — což je normální backend.

---

## Rychlý lokální test (bez Xcode)

`www/` je běžná statická webová appka. Otestuj v prohlížeči přes server
(ne `file://` — Babel načítá `.jsx` přes fetch):

```bash
cd makej-aplikace
npm run serve          # http://localhost:4000
```

Otevři `http://localhost:4000` v prohlížeči (ideálně v mobilním režimu DevTools).

---

## Předpoklady pro nativní build

| Nástroj | K čemu | Instalace |
|---|---|---|
| Node.js 18+ | Capacitor CLI | nodejs.org |
| Xcode 15+ + CocoaPods | iOS build | App Store / `sudo gem install cocoapods` |
| Android Studio | Android build | developer.android.com/studio |
| Apple Developer účet (99 $/rok) | App Store submission | developer.apple.com |
| Google Play Developer účet (25 $ jednorázově) | Play submission | play.google.com/console |

---

## První nastavení (jednou)

```bash
cd makej-aplikace
npm install                        # nainstaluje Capacitor
npx cap add ios                    # vygeneruje ios/ (Xcode projekt)
npx cap add android                # vygeneruje android/ (Gradle projekt)
npx cap sync                       # nakopíruje www/ + pluginy do obou platforem
```

### Ikony a splash screen
Připrav si zdrojový obrázek ikony **1024×1024 px** (`resources/icon.png`) a splash
**2732×2732 px** (`resources/splash.png`), pak vygeneruj všechny velikosti:

```bash
npm install -D @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor '#0020F6' --splashBackgroundColor '#2a2ab5'
```

(Ikony můžeš odvodit z brandu — logo „makej!“ na modrém `#0020F6`.)

---

## Build & spuštění

```bash
# iOS — otevře Xcode, tam vyber zařízení a Run (⌘R)
npx cap open ios

# Android — otevře Android Studio, tam Run
npx cap open android
```

> **Po jakékoli změně v `www/`** spusť `npx cap sync`, jinak se změna do nativní
> appky nepropíše.

---

## Publikace na App Store (iOS)

1. V Xcode → target **App** → **Signing & Capabilities**: vyber svůj Apple Developer Team.
2. Nastav **Bundle Identifier** = `eu.makej.brigadnik` (musí sedět s App Store Connect).
3. Zvyš **Version** a **Build** číslo.
4. Menu **Product → Archive** → po dokončení **Distribute App → App Store Connect → Upload**.
5. Na [App Store Connect](https://appstoreconnect.apple.com) vytvoř appku, doplň
   screenshoty, popis, **Privacy** (viz níže) a pošli k **review**.

### App Privacy (povinné)
Appka posílá data do Supabase. V App Store Connect → App Privacy uveď:
- **Contact Info → Email** (registrace), **User Content** (profil, zprávy) — *linked to identity, App Functionality*.
- Appka **nepoužívá tracking SDK** (Google Analytics z webové verze zde není) → „Data Not Used to Track You“.

> **Pozor na guideline 4.2 (Minimum Functionality):** appka nesmí být jen „obalený
> web“. Tahle jí není — je to plnohodnotné nativní rozhraní (swipe, chat, push-ready),
> ale pro jistotu do buildu přidej alespoň jeden nativní plugin s hodnotou
> (doporučeno **Push Notifications** na nové matche/zprávy — viz „Další kroky“).

---

## Publikace na Google Play (Android)

1. V Android Studiu **Build → Generate Signed Bundle / APK → Android App Bundle (.aab)**.
   Vytvoř/uchovej **upload keystore** (neztratit!).
2. `applicationId` = `eu.makej.brigadnik` (v `android/app/build.gradle`).
3. Zvyš `versionCode` a `versionName`.
4. Na [Play Console](https://play.google.com/console) založ appku → nahraj `.aab`
   do **Internal testing**, doplň **Data safety** formulář (stejný princip jako App Privacy),
   store listing a pošli k review.

---

## Aktualizace appky (workflow)

Rozhraní brigádníka je vlastně ta samá appka jako `makej-web/worker/`. Když ho na
webu upravíš, promítni změny sem:

```bash
# z rootu Makej-projekt/ (makej-web a makej-aplikace jsou sourozenci)
cp makej-web/employer/app.jsx    makej-aplikace/www/app.jsx
cp makej-web/worker/worker-*.jsx makej-aplikace/www/
cd makej-aplikace && npx cap sync
```

> Do budoucna zvaž symlink nebo build skript, aby se `www/` generovalo z `worker/`
> automaticky a kód se neduplikoval.

---

## Poznámky a další kroky (volitelné vylepšení)

- **Babel v prohlížeči:** appka transformuje `.jsx` za běhu (jednoduché, funguje).
  Pro rychlejší cold start je možné JSX předkompilovat do `.js` a Babel z `www/vendor/`
  odstranit — není nutné pro schválení, jen výkonová optimalizace.
- **Push notifikace:** přidej `@capacitor/push-notifications` (FCM/APNs) na nové
  matche a zprávy — zvyšuje „nativní hodnotu“ pro App Store review i retenci.
- **Potvrzení emailu:** Supabase posílá potvrzovací e-mail s odkazem na web.
  Pro appku zvaž nastavení Supabase redirect URL / deep linku (`eu.makej.brigadnik://`).
- **Fonty:** vloženy jen subsety `latin` + `latin-ext` (čeština). Pokud přidáš jiný
  jazyk, dostáhni další subset do `www/fonts/`.
