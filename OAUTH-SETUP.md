# Přihlášení přes Apple a Google — co je hotové a co ještě zbývá

Apple do App Store nepustí appku, která nabízí přihlášení přes jiné sociální sítě
(Google) a **nenabízí zároveň Sign in with Apple**. Proto jsou tam obě.

---

## Co už je v kódu hotové

| | |
|---|---|
| Tlačítka Google + Apple | na přihlášení i registraci (byla už dřív) |
| `www/index.html` | nový handler — nativní Apple, Google přes systémový prohlížeč, web fallback |
| Supabase klient | přepnut na `flowType: 'pkce'` (nutné pro návrat deep linkem) |
| `ios/App/App/Info.plist` | přidáno URL schéma `eu.makej.brigadnik` |
| `ios/App/App/App.entitlements` | vytvořen, obsahuje `com.apple.developer.applesignin` |
| npm balíčky | `@capacitor-community/apple-sign-in@6.0.0`, `@capacitor/browser`, `@capacitor/app` |
| `npx cap sync ios` | proběhlo, pody nainstalované |

### Proč zrovna takhle

- **Google nejde přes vestavěné webview** — vrací `403 disallowed_useragent`.
  Je to jejich politika a obejít se nedá. Proto se otevírá systémový prohlížeč
  (SFSafariViewController), který Google povoluje, a návrat řeší deep link.
- **Apple v appce vyžaduje nativní dialog** (ASAuthorization), ne webovou stránku.
- Použité pluginy jsou kompatibilní s **Capacitor 6**. Novější verze
  `@capacitor-community/apple-sign-in` (7.x) i `@capgo/capacitor-social-login`
  (7.x/8.x) už vyžadují Capacitor 7 resp. 8 — na ty se dá přejít později.

---

## ⚠️ Krok 0: než to půjde vůbec otestovat

`capacitor.config.json` má `server.url: http://192.168.0.64:4000` (živé načítání
z Macu). Přes `http://` **není zabezpečený kontext**, takže `crypto.subtle`
neexistuje — a ten je potřeba jak pro Apple nonce, tak pro PKCE u Googlu.
Ověřeno: `isSecureContext = false`, `crypto.subtle = undefined`.

Tlačítka v tomhle režimu skončí hláškou *„nejde testovat přes vývojový server"*.

**Na otestování OAuth tedy dočasně:**

1. v `capacitor.config.json` zakomentuj / smaž celý blok `"server"`
2. `npx cap sync ios`
3. build v Xcode — appka poběží z `capacitor://localhost`, což zabezpečený kontext **je**

Po testu si `server.url` můžeš vrátit zpět kvůli pohodlnému vývoji.
**Do produkčního buildu musí `server` pryč tak jako tak.**

---

## Krok 1: Apple Developer

1. **Certificates, Identifiers & Profiles → Identifiers →** App ID `eu.makej.brigadnik`
   → zaškrtnout **Sign in with Apple** → Save
2. **Identifiers → +** → **Services IDs** → vytvořit např. `eu.makej.brigadnik.web`
   - zaškrtnout Sign in with Apple → Configure
   - Primary App ID: `eu.makej.brigadnik`
   - Domains: `cxegfwfbgcgpwerfbvra.supabase.co`
   - Return URLs: `https://cxegfwfbgcgpwerfbvra.supabase.co/auth/v1/callback`
3. **Keys → +** → zaškrtnout Sign in with Apple → Configure → Primary App ID
   → Continue → Register → **stáhnout `.p8` soubor** (jde stáhnout jen jednou!)
   - poznamenat si **Key ID**
4. Poznamenat si **Team ID** (vpravo nahoře v účtu)

## Krok 2: Google Cloud Console

1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
2. Vytvořit **dva** klienty:
   - **iOS** → Bundle ID `eu.makej.brigadnik`
   - **Web application** → Authorized redirect URI:
     `https://cxegfwfbgcgpwerfbvra.supabase.co/auth/v1/callback`
3. Do Supabase se dává **webový** Client ID a Client Secret (ne iOS).
4. Vyplnit **OAuth consent screen** (název appky, logo, kontakt, odkazy na
   zásady soukromí a podmínky — Google i Apple to při schvalování kontrolují).

## Krok 3: Supabase

**Authentication → Providers:**

- **Apple** → Enable
  - Client IDs: `eu.makej.brigadnik` **a** Service ID z kroku 1.2, oddělené čárkou
    (bundle ID je potřeba pro nativní tok v appce, Service ID pro web)
  - Secret Key: vygenerovaný z `.p8` + Key ID + Team ID
- **Google** → Enable
  - Client ID / Secret: **webový** klient z kroku 2
  - zapnout „Skip nonce check" **jen** pokud by to hlásilo chybu nonce

**Authentication → URL Configuration → Redirect URLs** — přidat:
```
eu.makej.brigadnik://auth-callback
```
Bez toho Supabase přesměrování na custom schéma odmítne.

## Krok 4: Xcode

⚠️ **Stav k 3. 9. 2026: účet je zatím bezplatný (personal team).**
Poznalo se to podle provisioning profilu s platností 7 dní (placené členství
má roční) a podle toho, že profil neobsahuje `com.apple.developer.applesignin`.
Sign in with Apple na bezplatném účtu zapnout nejde.

Soubor `ios/App/App/App.entitlements` je připravený, ale **záměrně NENÍ
zapojený** do projektu — kdyby byl, Xcode by chtěl podepsat capability, kterou
profil nemá, a build by spadl. Proto je `CODE_SIGN_ENTITLEMENTS` z projektu
odebraný, aby appka šla normálně buildovat a vyvíjet.

**Až bude placené členství, zapojit zpět** — do obou konfigurací cíle App
(Debug i Release) v `ios/App/App.xcodeproj/project.pbxproj` přidat řádek:
```
CODE_SIGN_ENTITLEMENTS = App/App.entitlements;
```
hned nad `PRODUCT_BUNDLE_IDENTIFIER = eu.makej.brigadnik;`
(nebo prostě v Xcode: Target App → Signing & Capabilities → + Capability →
Sign in with Apple, což udělá totéž).

Pak zkontrolovat, že je vybraný **Team** (`K6UBDY7329`) a bundle ID
`eu.makej.brigadnik`, a dát Product → Clean Build Folder.

---

## Jak to pak funguje

```
Apple v appce:   nativní dialog → identityToken → signInWithIdToken(nonce)
Google v appce:  Supabase URL → systémový prohlížeč → deep link
                 eu.makej.brigadnik://auth-callback?code=… → exchangeCodeForSession
Web (www/):      klasický signInWithOAuth s přesměrováním
```

Účet vytvořený přes OAuth nemá roli — kód mu po prvním přihlášení automaticky
doplní `role: 'worker'` a u Applu i jméno (Apple ho pošle **jen jednou**, při
úplně první autorizaci — podruhé už ne, takže se ukládá hned).

---

## Nedořešené / na později

- **Přístupový klíč blokuje i OAuth.** `ACCESS_KEY = '8939'` v `www/index.html`
  zamyká vstup do appky. Apple recenzent se bez něj nedostane dál a shodí to pod
  Guideline 2.1. Buď mu klíč napsat do poznámek k review, nebo pro build do
  storu dát `ACCESS_KEY = ''`.
- **Mazání účtu.** Apple vyžaduje (Guideline 5.1.1(v)), aby appka, která umí
  založit účet, uměla účet i smazat — přímo v appce. Zatím tam není.
- **Android.** Tenhle postup řeší iOS. Pro Google na Androidu bude potřeba ještě
  Android OAuth client + SHA-1 otisk podpisového klíče.
