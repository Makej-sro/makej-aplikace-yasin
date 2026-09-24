// Makej — interactive prototype
// Worker app: swipe job offers, match modal, chat list & thread, profile.
// Brand: deep blue (#0020F6 brand) + dark gradient app shell (#0014A3 → #050510).

const { useState, useEffect, useRef, useMemo } = React;

// ─────────────────────────────────────────────────────────────
// Status bar (hodiny + ikonky nahoře) — jen v nativní appce (Capacitor).
// iOS umí jen dvě barvy: bílou nebo černou. Přepínáme podle obrazovky:
//   'photo' = za status barem je fotka (Lidé tržiště, hero inzerátu) → BÍLÉ ikonky.
//   'light' = světlá béžová obrazovka (Práce, Zprávy, Profil)        → ČERNÉ ikonky.
// Capacitor mapování je opačné: Style 'DARK' = bílý text, 'LIGHT' = tmavý text.
// ─────────────────────────────────────────────────────────────
function wStatusBar(mode) {
  try {
    const C = typeof window !== 'undefined' && window.Capacitor;
    const S = C && C.Plugins && C.Plugins.StatusBar;
    if (S && S.setStyle) S.setStyle({ style: mode === 'photo' ? 'DARK' : 'LIGHT' });
  } catch (e) { /* web / neni nativni obal — nevadi */ }
}

// ─────────────────────────────────────────────────────────────
// Profilový obrázek z iniciál — vygeneruje SVG „logo" (data URI),
// aby firma bez nahraného loga vypadala jako opravdová profilovka:
// iniciály na barevném gradientu, barva je pro každou firmu jiná
// (deterministicky podle názvu). Použití: wLogoImg('KP', 'Kafe Punkt').
// ─────────────────────────────────────────────────────────────
const _W_LOGO_PALETA = ['#2A6DF4', '#7A5CFF', '#E8552E', '#1E9E52', '#F0A600', '#D6336C', '#0EA5A5', '#5B54E6', '#E06C00', '#3B7A57'];
function _wStrHash(s) { let h = 0; s = String(s || ''); for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; } return h; }
function _wShade(hex, amt) {   // amt: -100 (ztmavit) … +100 (zesvětlit)
  let c = String(hex || '#2a2ab5').replace('#', ''); if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const n = parseInt(c, 16); const f = amt / 100;
  const adj = v => Math.max(0, Math.min(255, Math.round(v + (amt < 0 ? v : (255 - v)) * f)));
  const r = adj((n >> 16) & 255), g = adj((n >> 8) & 255), b = adj(n & 255);
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}
// Lupa do search barů — jednotná ikonka (kruh + krátká rukojeť), aby byla všude stejná.
function WSearchIco({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
      <circle cx="10.5" cy="10.5" r="7.3" stroke={color} strokeWidth="2.1" />
      <path d="M15.9 15.9 L21 21" stroke={color} strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}

function wLogoImg(text, seed) {
  const initials = String(text || '?').slice(0, 2).toUpperCase();
  const base = _W_LOGO_PALETA[_wStrHash(seed || text) % _W_LOGO_PALETA.length];
  const dark = _wShade(base, -26);
  const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'>"
    + "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>"
    + "<stop offset='0' stop-color='" + base + "'/><stop offset='1' stop-color='" + dark + "'/></linearGradient></defs>"
    + "<rect width='120' height='120' fill='url(#g)'/>"
    + "<text x='60' y='63' font-family='Poppins, Arial, sans-serif' font-size='50' font-weight='700' letter-spacing='0.5' fill='#ffffff' text-anchor='middle' dominant-baseline='central'>" + initials + "</text>"
    + "</svg>";
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

// ─────────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────────
const JOBS = [
  {
    id: 'j1',
    title: 'Barista do specialty kavárny',
    isco: '5132',
    company: 'Kafe Punkt',
    logo: 'KP',
    logoColor: '#F4A261',
    verified: true,
    boosted: true,
    pay: 180,
    payUnit: 'Kč/h',
    total: 1440,
    payBand: { min: 140, avg: 165, max: 210 },
    expectations: ['Spolehlivost a dochvilnost', 'Chuť učit se a příjemné vystupování k hostům', 'Zvládneš tempo při ranním náporu', 'Věk 18+'],
    bonuses: ['Zkušenost z kavárny nebo gastra', 'Základy latte art'],
    offer: ['Zaučíme tě do všeho — kávu i obsluhu', 'Férový přístup a pohodový tým', 'Flexibilní domluva směn', 'Možnost dlouhodobé spolupráce'],
    contract: 'DPP',
    payout: 'Týdně',
    posted: 'dnes',
    jobType: 'part_time',
    obor: 'gastro',
    recurrence: 'Pravidelná',
    duties: 'Přijdeš v 6:45, převezmeš směnu a spustíš kávovar (La Marzocco) i mlýnky — necháme tě nastavit gramáž a espresso podle naší kalibrace.\n\nDopoledne stojíš hlavně za barem: připravuješ espresso, filtr a mléčné nápoje (naučíme tě latte art), bereš objednávky na kase a obsluhuješ hosty u pultu i na place. Průběžně doplňuješ zrno, mléko a čisté nádobí, utíráš pákový kávovar a udržuješ bar v čistotě. Kolem poledne spolupracuješ s druhým parťákem na náporu přes oběd — jeden dělá kávu, druhý kasu.\n\nKe konci směny (14:30–15:00) propláchneš a uklidíš kávovar, doplníš zásoby pro odpolední směnu a předáš bar. Pracuješ v prostoru kavárny (bar + zázemí s myčkou a skladem), celou dobu na nohou, v malém pohodovém týmu.',
    location: 'Brno — Veveří',
    distance: 1.2,
    when: 'Pá 9. května',
    time: '7:00 – 15:00',
    rating: 4.8,
    reviews: 127,
    tags: ['Gastro', 'Ranní směna', 'Bez zkušeností'],
    desc: 'Hledáme parťáka do dopolední směny. Naučíme tě latte art, espresso a obsluhu hostů. Káva od pražírny Doubleshot.',
    perks: ['Káva zdarma', 'Nástup ihned', 'Týmovka 1× měsíc'],
    accent: '#F4A261',
    photos: [
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&q=70&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=900&q=70&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=900&q=70&auto=format&fit=crop',
    ],
    employer: {
      industry: 'Kavárna · specialty coffee',
      bio: 'Specialty kavárna kousek od centra Brna. Děláme poctivé espresso i filtry z lokálních pražíren, k tomu domácí dezerty. Jsme malý tým, co si zakládá na pohodové atmosféře a férovém přístupu k brigádníkům — zaučíme tě a bereme tě jako parťáka.',
      kraj: 'jihomoravsky',
      address: 'Veveří, Brno',
      website: 'kafepunkt.cz',
      founded: 2018,
      openPositions: 3,
      reviews: [
        { id: 'kp-r1', rating: 5, text: 'Skvělá parta, latte art mě naučili za týden. Výplata vždy včas.', reviewer: { name: 'Tereza N.' }, date: '7/2026', role: 'Barista', shifts: 4 },
        { id: 'kp-r2', rating: 5, text: 'Pohodové prostředí, vstřícný šéf. Doporučuju.', reviewer: { name: 'Martin K.' }, date: '6/2026', role: 'Výpomoc na akci', shifts: 1 },
        { id: 'kp-r3', rating: 4, text: 'Fajn brigáda, jen o víkendu bývá nával.', reviewer: { name: 'Adéla P.' }, date: '5/2026', role: 'Barista', shifts: 2, reply: 'Díky za zpětnou vazbu. O víkendech už jezdíme ve třech, tak by to mělo být klidnější.' },
      ],
    },
  },
  {
    id: 'j2',
    title: 'Hosteska na hudební festival',
    isco: '5241',
    company: 'Pop Messe',
    logo: 'PM',
    logoColor: '#8AB4FF',
    verified: true,
    boosted: true,
    pay: 220,
    payUnit: 'Kč/h',
    total: 2640,
    payBand: { min: 180, avg: 205, max: 250 },
    expectations: ['Příjemné a komunikativní vystupování', 'Spolehlivost a dochvilnost', 'Zvládneš celý den na nohou venku', 'Věk 18+'],
    bonuses: ['Angličtina pro zahraniční návštěvníky', 'Zkušenost z eventů'],
    offer: ['Zázemí a občerstvení po celou akci', 'Parta lidí a festivalová atmosféra', 'Reference na další eventy'],
    contract: 'DPP',
    payout: 'Hned po akci',
    posted: 'před 2 dny',
    jobType: 'jednrazova_vypomoc',
    obor: 'promo',
    recurrence: 'Jednorázová',
    duties: 'Sraz máš 30 minut před otevřením bran u produkčního stanu, kde dostaneš tričko, akreditaci a krátký briefing.\n\nPřes den jsi u vstupu nebo u infostánku: kontroluješ vstupenky a náramky, navádíš návštěvníky k pódiím, WC a stánkům a odpovídáš na dotazy. Používáš čtečku náramků a vysílačku, kterou se domlouváš s koordinátorem. Na pauzy se střídáš s ostatními hostesami.\n\nPo skončení programu pomůžeš s úklidem svého stanoviště a vrátíš vybavení. Pracuješ venku v areálu festivalu, hodně na nohou a v kontaktu s lidmi.',
    location: 'Brno — Výstaviště',
    distance: 3.4,
    when: 'So 10. – Ne 11. května',
    time: '12:00 – 24:00',
    rating: 4.9,
    reviews: 348,
    tags: ['Eventy', 'Víkend', 'Tým', 'Pro studenty'],
    desc: 'Rozdávání pásek, kontrola vstupů, info pro návštěvníky. Pohodový tým, večeře v ceně, festivalové triko.',
    perks: ['Jídlo + pití', 'Festival pas zdarma', 'Doprava zpět'],
    accent: '#8AB4FF',
    photos: [
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900&q=70&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=900&q=70&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=900&q=70&auto=format&fit=crop',
    ],
    employer: {
      industry: 'Eventy · festivaly',
      bio: 'Pořádáme hudební festivaly a kulturní akce po celé Moravě. Sháníme spolehlivé lidi do týmu hostesů, na vstupy a info stánky. U nás zažiješ akci zevnitř, dostaneš najíst a festivalovou vstupenku k tomu.',
      kraj: 'jihomoravsky',
      address: 'Výstaviště, Brno',
      website: 'popmesse.cz',
      founded: 2016,
      openPositions: 8,
      reviews: [
        { id: 'pm-r1', rating: 5, text: 'Nejlepší brigáda léta, super organizace i tým.', reviewer: { name: 'Jakub H.' }, date: '8/2026', role: 'Hosteska', shifts: 3 },
        { id: 'pm-r2', rating: 5, text: 'Vše klaplo, platba hned po akci.', reviewer: { name: 'Nikola S.' }, date: '7/2026', role: 'Vstupy', shifts: 2 },
      ],
    },
  },
  {
    id: 'j3',
    title: 'Skladník na rampě — Po-Pá',
    isco: '8344',
    company: 'Rohlík.cz',
    logo: 'R',
    logoColor: '#5BD68A',
    verified: true,
    boosted: true,
    pay: 195,
    payUnit: 'Kč/h',
    total: 1560,
    payBand: { min: 160, avg: 180, max: 230 },
    expectations: ['Fyzická zdatnost — práce ve stoje a v pohybu', 'Spolehlivost a pečlivost', 'Ochota pracovat od 6:00 ráno', 'Věk 18+'],
    bonuses: ['Zkušenost ze skladu', 'Průkaz na vozík (VZV)'],
    offer: ['Zaučení a jasný systém práce', 'Pravidelné směny a dlouhodobá spolupráce', 'Stabilní tým a férové vedení'],
    // Nový model formy práce (makej-badge.jsx): firma nechává otevřené DPP i HPP
    // → badge se odvodí na „Dle domluvy", karta ukáže „DPP · Pracovní smlouva".
    contract_types: ['DPP', 'EMPLOYMENT_CONTRACT'], hours_per_week: 40,
    contract: 'HPP', rozsah: 'plný', doba: 'neurčitá',
    payout: 'Měsíčně',
    posted: 'před 4 dny',
    jobType: 'full_time',
    obor: 'sklad',
    recurrence: 'Pravidelná',
    duties: 'Nástup v 6:00 u výdejny pomůcek, kde dostaneš vestu a čtečku.\n\nPřes den vychystáváš objednávky podle terminálu (systém WMS): projdeš regály, naskenuješ a nachystáš zboží na paletu nebo do boxu. Používáš ruční skener a paletový vozík (paťák), u těžších palet i nízkozdvižný vozík (zaučíme, průkaz není nutný). Průběžně kontroluješ počty a kvalitu a doplňuješ obalový materiál.\n\nKe konci směny uklidíš své stanoviště, vrátíš vozík na místo a předáš rozdělanou práci další směně. Pracuješ v hale skladu (teplota kolem 18 °C), většinu času v pohybu.',
    location: 'Modřice',
    distance: 7.1,
    when: 'Po 12. – Pá 16. května',
    time: '6:00 – 14:00',
    rating: 4.5,
    reviews: 891,
    tags: ['Sklad', 'Dlouhodobě', 'Doprava ZDARMA'],
    desc: 'Nakládání palet, balení boxů, kontrola objednávek. Svačiny, fitko v areálu a doprava z centra Brna zdarma.',
    perks: ['Doprava zdarma', 'Týdenní výplata', 'Stálá pozice'],
    accent: '#5BD68A',
    photos: [
      'https://images.unsplash.com/photo-1553413077-190dd305871c?w=900&q=70&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=900&q=70&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=900&q=70&auto=format&fit=crop',
    ],
    employer: {
      industry: 'E-commerce · logistika',
      bio: 'Rozvážíme potraviny a hlídáme, aby dorazily čerstvé a včas. Na brněnském skladu bereme brigádníky na rampu, balení a kontrolu objednávek. Stabilní firma, týdenní výplaty a doprava z centra zdarma.',
      kraj: 'jihomoravsky',
      address: 'Modřice',
      website: 'rohlik.cz',
      founded: 2014,
      openPositions: 12,
      reviews: [
        { id: 'r-r1', rating: 5, text: 'Jasné pokyny, dobrá organizace směn.', reviewer: { name: 'Petr V.' }, date: '8/2026', role: 'Skladník', shifts: 12 },
        { id: 'r-r2', rating: 4, text: 'Fyzicky náročné, ale zaplaceno férově.', reviewer: { name: 'Lukáš D.' }, date: '7/2026', role: 'Rampa', shifts: 6 },
        { id: 'r-r3', rating: 4, text: 'Doprava zdarma je super bonus.', reviewer: { name: 'Ondřej M.' }, date: '6/2026', role: 'Balení', shifts: 8, reply: 'Díky! Svozy z centra jezdí i o víkendu, klidně napiš koordinátorovi.' },
      ],
    },
  },
  {
    id: 'j4',
    title: 'Foto asistent na svatbu',
    isco: '3431',
    company: 'Studio Korunka',
    logo: 'SK',
    logoColor: '#E0B0FF',
    verified: false,
    boosted: true,
    pay: 350,
    payUnit: 'Kč/h',
    total: 2800,
    payBand: { min: 310, avg: 330, max: 400 },
    expectations: ['Smysl pro detail a pečlivost', 'Spolehlivost a dochvilnost', 'Zvládneš lehčí přenášení techniky', 'Věk 18+'],
    bonuses: ['Zkušenost z ateliéru nebo focení', 'Orientace v technice (světla, stativy)'],
    offer: ['Zaučení od profíka a náhled do produkce', 'Kreativní prostředí ateliéru', 'Reference a portfolio ze spolupráce'],
    contract: 'DPP',
    payout: 'Do 14 dní',
    posted: 'včera',
    jobType: 'jednrazova_vypomoc',
    obor: 'foto',
    recurrence: 'Jednorázová',
    duties: 'Sraz v 9:30 v ateliéru na krátký briefing s fotografem — projdete plán focení a shot list.\n\nPřes den asistuješ u produktového focení: připravuješ a stavíš produkty do scény, hlídáš čistotu a detaily (otisky, prach), podáváš rekvizity a pomáháš se světly a odrazkami. Obsluhuješ jednoduché vybavení — stativy, softboxy, tethering k notebooku — a průběžně zálohuješ snímky. Mezi sety pomáháš s přestavbou scény.\n\nNa konci pomůžeš techniku sbalit a uklidit set. Pracuješ v ateliéru (uvnitř, v teple), střídáš stání a lehčí přenášení techniky.',
    location: 'Slavkov u Brna',
    distance: 22,
    when: 'So 17. května',
    time: '10:00 – 18:00',
    rating: 5.0,
    reviews: 42,
    tags: ['Foto', 'Víkend', 'Kreativní', 'Pro studenty'],
    desc: 'Pomoc s nošením světel, reflektorů a baterií. Není potřeba focení, jen ruce a dobrá nálada. Doprava ze studia.',
    perks: ['Doprava + oběd', 'Reference do CV', 'Tip 500 Kč'],
    accent: '#E0B0FF',
    photos: [
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=900&q=70&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=900&q=70&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=900&q=70&auto=format&fit=crop',
    ],
    employer: {
      industry: 'Foto · video studio',
      bio: 'Svatební a portrétní studio ze Slavkova u Brna. Fotíme svatby, rodinné i firemní akce. Hledáme šikovné asistenty, co nám pomůžou s technikou a světly — focení neřešíš, stačí ruce a dobrá nálada.',
      kraj: 'jihomoravsky',
      address: 'Slavkov u Brna',
      website: 'studiokorunka.cz',
      founded: 2020,
      openPositions: 1,
      reviews: [
        { id: 'sk-r1', rating: 5, text: 'Milí lidi, hezky mě provedli celým dnem.', reviewer: { name: 'Klára Ž.' }, date: '6/2026', role: 'Foto asistent', shifts: 1 },
      ],
    },
  },
  {
    id: 'j5',
    title: 'Promotér energetického nápoje',
    isco: '5211',
    company: 'Tiger Energy',
    logo: 'T',
    logoColor: '#FF6B35',
    verified: true,
    boosted: true,
    pay: 210,
    payUnit: 'Kč/h',
    total: 1260,
    payBand: { min: 170, avg: 190, max: 250 },
    expectations: ['Komunikativnost a chuť oslovovat lidi', 'Spolehlivost a dochvilnost', 'Zvládneš odpoledne na nohou v centru', 'Věk 18+'],
    bonuses: ['Zkušenost z promo akcí', 'Angličtina'],
    offer: ['Zaškolení a podpora týmu na place', 'Flexibilní termíny akcí', 'Bonusy za výkon'],
    contract: 'DPP',
    payout: 'Týdně',
    posted: 'před 3 dny',
    jobType: 'brigada',
    obor: 'promo',
    recurrence: 'Jednorázová',
    duties: 'Sraz ve 13:45 na místě u promo týmu, kde převezmeš tričko a vzorky.\n\nPřes odpoledne oslovuješ kolemjdoucí v centru, představuješ produkt, rozdáváš vzorky a letáky a sbíráš krátkou zpětnou vazbu do tabletu. Používáš promo stánek, tablet a QR kódy pro registrace. Hlídáš zásobu vzorků a doplňuješ ji ze zázemí. Na pauzy se střídáš s parťákem.\n\nNa konci spočítáš rozdané vzorky, sbalíš stánek a předáš vybavení. Pracuješ venku v centru města, celou dobu na nohou a v kontaktu s lidmi.',
    location: 'Brno — Galerie Vaňkovka',
    distance: 0.8,
    when: 'Čt 15. května',
    time: '14:00 – 20:00',
    rating: 4.3,
    reviews: 56,
    tags: ['Promo', 'Centrum', 'Bonus', 'Od 15 let'],
    desc: 'Rozdávání vzorků a komunikace s lidmi v obchoďáku. Energický tým, bonus za vzorky.',
    perks: ['Bonus 500 Kč', 'Triko + cap', 'Občerstvení'],
    accent: '#FF6B35',
    photos: [
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=900&q=70&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=900&q=70&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=900&q=70&auto=format&fit=crop',
    ],
    employer: {
      industry: 'Marketing · promo akce',
      bio: 'Značka energetických nápojů, co jezdí po eventech a obchoďácích. Sháníme energické promotéry na ochutnávky a komunikaci s lidmi. Dostaneš merch, občerstvení a bonus za rozdané vzorky.',
      kraj: 'jihomoravsky',
      address: 'Galerie Vaňkovka, Brno',
      website: 'tigerenergy.cz',
      founded: 2019,
      openPositions: 4,
      reviews: [
        { id: 't-r1', rating: 4, text: 'Zábava mezi lidmi, čas rychle utekl.', reviewer: { name: 'Denis R.' }, date: '8/2026', role: 'Promotér', shifts: 2 },
        { id: 't-r2', rating: 4, text: 'Bonus za vzorky motivuje.', reviewer: { name: 'Eliška T.' }, date: '7/2026', role: 'Promotér', shifts: 3 },
      ],
    },
  },

  // ── Číšník na svatbu — jednorázovka, solidní, bez odznaku Zakládající partner
  {
    id: 'j6', title: 'Číšník na svatební hostinu', company: 'Chateau Catering', logo: 'CC', logoColor: '#C69B6D',
    verified: true, boosted: false, pay: 200, payUnit: 'Kč/h', total: 1600, payBand: { min: 160, avg: 190, max: 230 },
    jobType: 'jednrazova_vypomoc', obor: 'gastro', payout: 'Hned po akci', posted: 'dnes', recurrence: 'Jednorázová',
    contract: 'DPP', location: 'Brno — Líšeň', distance: 4.5, when: 'So 24. května', time: '16:00 – 24:00',
    rating: 4.2, reviews: 38, tags: ['Gastro', 'Víkend', 'Spropitné'], accent: '#C69B6D',
    duties: 'Sraz v 15:30, převezmeš sektor a nachystáš stoly (příbory, sklo). Přes večer roznášíš menu a nápoje, sbíráš použité nádobí a doléváš víno. Ke konci pomáháš s úklidem sálu.',
    expectations: ['Reprezentativní vystupování', 'Zvládneš roznos plných táců', 'Věk 18+'],
    offer: ['Zaučení na místě', 'Teplá večeře', 'Spropitné navíc'],
    perks: ['Spropitné', 'Večeře v ceně', 'Platba hned'],
    desc: 'Obsluha svatební hostiny — roznos jídla a nápojů, péče o hosty. Elegantní prostředí zámku.',
    photos: ['https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=900&q=70&auto=format&fit=crop'],
    employer: {
      industry: 'Catering · eventy', founded: 2015, kraj: 'jihomoravsky', address: 'Líšeň, Brno', website: 'chateaucatering.cz', openPositions: 5,
      bio: 'Zajišťujeme catering na svatby a firemní akce v okolí Brna. Bereme spolehlivé číšníky a výpomoc do kuchyně na jednotlivé akce.',
      reviews: [
        { id: 'cc-r1', rating: 5, text: 'Super akce, spropitné slušné.', reviewer: { name: 'Klára V.' }, date: '7/2026', role: 'Číšník', shifts: 2 },
        { id: 'cc-r2', rating: 3, text: 'Dlouhý večer, ale platba proběhla hned.', reviewer: { name: 'Tomáš L.' }, date: '6/2026', role: 'Číšník', shifts: 1 },
      ],
    },
  },

  // ── Vychystávání v e-shopu — pravidelná, NIŽŠÍ hodnocení (kritické recenze)
  {
    id: 'j7', title: 'Vychystávání objednávek v e-shopu', company: 'BoxDepo', logo: 'BD', logoColor: '#7C8AA5',
    verified: true, boosted: false, pay: 165, payUnit: 'Kč/h', total: 1320, payBand: { min: 150, avg: 168, max: 190 },
    jobType: 'part_time', obor: 'sklad', payout: 'Měsíčně', posted: 'před 5 dny', recurrence: 'Pravidelná',
    contract: 'HPP', rozsah: '0,5', doba: 'neurčitá', forma: ['Směnný provoz'], location: 'Brno — Slatina', distance: 6.2, when: 'Po – Pá', time: '8:00 – 16:00',
    rating: 3.4, reviews: 64, tags: ['Sklad', 'Dlouhodobě'], accent: '#7C8AA5',
    duties: 'Podle terminálu procházíš regály a vychystáváš objednávky do boxů. Balení, lepení štítků, příprava k odvozu.',
    expectations: ['Práce ve stoje celou směnu', 'Pečlivost u počtů', 'Věk 18+'],
    offer: ['Zaučení', 'Pravidelné směny'],
    perks: ['Stálá pozice'],
    desc: 'Vychystávání a balení objednávek ve skladu e-shopu.',
    photos: ['https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=900&q=70&auto=format&fit=crop'],
    employer: {
      industry: 'E-commerce · sklad', founded: 2017, kraj: 'jihomoravsky', address: 'Slatina, Brno', openPositions: 6,
      bio: 'Provozujeme sklad pro menší e-shopy. Bereme brigádníky na vychystávání a balení.',
      reviews: [
        { id: 'bd-r1', rating: 2, text: 'Výplata dorazila později, než slibovali. Vedoucí nekomunikoval.', reviewer: { name: 'Radek P.' }, date: '8/2026', role: 'Sklad', shifts: 5 },
        { id: 'bd-r2', rating: 3, text: 'Práce ok, ale zmatek v organizaci směn.', reviewer: { name: 'Marek J.' }, date: '7/2026', role: 'Balení', shifts: 3 },
        { id: 'bd-r3', rating: 4, text: 'Kolektiv fajn, jen tempo je vysoké.', reviewer: { name: 'Simona H.' }, date: '6/2026', role: 'Sklad', shifts: 8 },
      ],
    },
  },

  // ── Roznos letáků — CHUDÝ inzerát (min. info), neověřeno, bez hodnocení
  {
    id: 'j8', title: 'Roznos letáků', company: 'Direct Mail', logo: 'DM', logoColor: '#9AA1BD',
    verified: false, boosted: false, pay: 150, payUnit: 'Kč/h', total: 600,
    jobType: 'brigada', obor: 'promo', payout: 'Týdně', posted: 'včera', recurrence: 'Jednorázová',
    location: 'Brno — okolí', distance: 2.1, when: 'Dle domluvy', time: '9:00 – 13:00',
    rating: 0, reviews: 0, tags: ['Venku'], accent: '#9AA1BD',
    desc: 'Roznos letáků do schránek v přidělené oblasti.',
    photos: ['https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=900&q=70&auto=format&fit=crop'],
  },

  // ── Prodavač v pekárně — pravidelná, Zakládající partner, dobré hodnocení
  {
    id: 'j9', title: 'Prodavač/ka v pekárně', company: 'Pekařství Kváskov', logo: 'PK', logoColor: '#E0A458',
    verified: true, boosted: true, pay: 145, payUnit: 'Kč/h', total: 1160, payBand: { min: 130, avg: 150, max: 175 },
    jobType: 'part_time', obor: 'prodej', payout: 'Měsíčně', posted: 'před 2 dny', recurrence: 'Pravidelná',
    contract: 'Agentura', location: 'Brno — Královo Pole', distance: 1.5, when: 'Út – So', time: '6:00 – 14:00',
    rating: 4.6, reviews: 73, tags: ['Prodej', 'Ranní směna', 'Pečivo domů'], accent: '#E0A458',
    duties: 'Ráno převezmeš pekárnu, naskládáš čerstvé pečivo do vitríny, obsluhuješ zákazníky a účtuješ na kase. Průběžně doplňuješ zboží a udržuješ čistotu.',
    expectations: ['Příjemné vystupování', 'Ranní vstávání ti nevadí', 'Věk 18+'],
    bonuses: ['Zkušenost z prodeje'],
    offer: ['Zaučení', 'Pečivo domů zdarma', 'Pravidelné směny'],
    perks: ['Pečivo zdarma', 'Stálá pozice'],
    desc: 'Prodej čerstvého pečiva, obsluha zákazníků, kasa. Rodinná pekárna.',
    photos: ['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=900&q=70&auto=format&fit=crop'],
    employer: {
      industry: 'Pekařství · prodej', founded: 2013, kraj: 'jihomoravsky', address: 'Královo Pole, Brno', website: 'kvaskov.cz', openPositions: 2,
      bio: 'Rodinné pekařství s vlastním kváskem. Pečeme každé ráno a hledáme milé lidi za pult. U nás voní práce a pečivo si nosíš domů.',
      reviews: [
        { id: 'pk-r1', rating: 5, text: 'Nejmilejší šéfová, pečivo domů super bonus.', reviewer: { name: 'Aneta K.' }, date: '8/2026', role: 'Prodej', shifts: 14 },
        { id: 'pk-r2', rating: 4, text: 'Brzké vstávání, ale pohodová práce.', reviewer: { name: 'Veronika S.' }, date: '7/2026', role: 'Prodej', shifts: 9 },
      ],
    },
  },

  // ── Kameraman výpomoc — jednorázovka, špičkové hodnocení (málo recenzí)
  {
    id: 'j10', title: 'Pomoc na natáčení (kamera)', company: 'Studio Korunka', logo: 'SK', logoColor: '#B39DDB',
    verified: true, boosted: false, pay: 280, payUnit: 'Kč/h', total: 2240, payBand: { min: 220, avg: 270, max: 340 },
    jobType: 'jednrazova_vypomoc', obor: 'foto', payout: 'Do 14 dní', posted: 'dnes', recurrence: 'Jednorázová',
    contract: 'DPP', location: 'Brno — Zábrdovice', distance: 3.0, when: 'Čt 22. května', time: '9:00 – 17:00',
    rating: 5.0, reviews: 12, tags: ['Foto/video', 'Kreativa'], accent: '#B39DDB',
    duties: 'Pomáháš štábu při natáčení: příprava techniky (stativy, světla), přenášení a hlídání kabeláže, drobná asistence u kamery. Zkušenost výhodou, ale hlavně spolehlivost.',
    expectations: ['Spolehlivost a dochvilnost', 'Fyzická zdatnost (technika)', 'Věk 18+'],
    bonuses: ['Zkušenost z natáčení', 'Vlastní znalost techniky'],
    offer: ['Zkušenost ze štábu', 'Reference do portfolia'],
    perks: ['Občerstvení', 'Reference'],
    desc: 'Asistence na natáčení reklamního spotu. Příprava techniky, práce se štábem.',
    photos: ['https://images.unsplash.com/photo-1485846234645-a62644f84728?w=900&q=70&auto=format&fit=crop'],
    employer: {
      industry: 'Foto · video produkce', founded: 2016, kraj: 'jihomoravsky', address: 'Zábrdovice, Brno', website: 'studiokorunka.cz', openPositions: 1,
      bio: 'Produkční studio na reklamu a klipy. Sháníme šikovné lidi na výpomoc při natáčení.',
      reviews: [
        { id: 'sk-r1', rating: 5, text: 'Skvělá zkušenost, super parta u kamery.', reviewer: { name: 'Filip N.' }, date: '8/2026', role: 'Asistence', shifts: 1 },
      ],
    },
  },

  // ── Pokladní — full-time, ŠPATNÉ hodnocení (kritické recenze), neboostováno
  {
    id: 'j11', title: 'Pokladní v supermarketu', company: 'Market Plus', logo: 'MP', logoColor: '#6FB1E0',
    verified: true, boosted: false, pay: 155, payUnit: 'Kč/h', total: 1240, payBand: { min: 145, avg: 158, max: 180 },
    jobType: 'full_time', obor: 'prodej', payout: 'Měsíčně', posted: 'před 6 dny', recurrence: 'Pravidelná',
    contract: 'HPP', rozsah: 'plný', doba: 'určitá', forma: ['Pružná pracovní doba'], location: 'Brno — Bohunice', distance: 5.5, when: 'Po – Ne (směny)', time: '7:00 – 15:00',
    rating: 3.1, reviews: 210, tags: ['Prodej', 'Směnný provoz'], accent: '#6FB1E0',
    duties: 'Účtuješ nákupy na pokladně, řešíš dotazy zákazníků, doplňuješ drobné zboží u kasy. Střídání ranních a odpoledních směn.',
    expectations: ['Práce se zákazníky', 'Rychlost a přesnost', 'Věk 18+'],
    offer: ['Zaučení', 'Směny dle rozpisu'],
    perks: ['Sleva na nákup'],
    desc: 'Práce na pokladně v supermarketu, směnný provoz.',
    photos: ['https://images.unsplash.com/photo-1601599963565-b7ba29c8a3d1?w=900&q=70&auto=format&fit=crop'],
    employer: {
      industry: 'Retail · supermarket', founded: 2011, kraj: 'jihomoravsky', address: 'Bohunice, Brno', openPositions: 9,
      bio: 'Řetězec supermarketů. Bereme brigádníky na pokladny a doplňování zboží.',
      reviews: [
        { id: 'mp-r1', rating: 2, text: 'Vysoké tempo, málo pauz, nadřízený pod tlakem.', reviewer: { name: 'Denisa K.' }, date: '8/2026', role: 'Pokladní', shifts: 20 },
        { id: 'mp-r2', rating: 3, text: 'Peníze chodí včas, ale atmosféra spíš chladná.', reviewer: { name: 'Pavel R.' }, date: '7/2026', role: 'Pokladní', shifts: 15 },
        { id: 'mp-r3', rating: 4, text: 'Když si zvykneš na tempo, dá se.', reviewer: { name: 'Iveta M.' }, date: '6/2026', role: 'Doplňování', shifts: 11 },
      ],
    },
  },

  // ── Ochutnávky — brigáda, neověřeno, střední info
  {
    id: 'j12', title: 'Ochutnávky v hypermarketu', company: 'TastePro', logo: 'TP', logoColor: '#7FC8A9',
    verified: false, boosted: false, pay: 175, payUnit: 'Kč/h', total: 1400, payBand: { min: 150, avg: 172, max: 200 },
    jobType: 'brigada', obor: 'promo', payout: 'Týdně', posted: 'před 3 dny', recurrence: 'Jednorázová',
    contract: 'DPP', location: 'Brno — Ivanovice', distance: 7.8, when: 'Pá – So', time: '10:00 – 18:00',
    rating: 4.0, reviews: 29, tags: ['Promo', 'Komunikace'], accent: '#7FC8A9',
    duties: 'U stánku nabízíš zákazníkům ochutnávku produktu, komunikuješ o značce a eviduješ počty rozdaných vzorků.',
    expectations: ['Komunikativnost', 'Úsměv a energie', 'Věk 18+'],
    offer: ['Zaučení na místě', 'Bonus za vzorky'],
    perks: ['Bonus za vzorky'],
    desc: 'Ochutnávková akce v hypermarketu — komunikace se zákazníky, propagace značky.',
    photos: ['https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=900&q=70&auto=format&fit=crop'],
    employer: {
      industry: 'Promo · marketing', founded: 2020, kraj: 'jihomoravsky', address: 'Ivanovice, Brno', openPositions: 4,
      bio: 'Zajišťujeme ochutnávky a promo akce v obchodních řetězcích.',
      reviews: [
        { id: 'tp-r1', rating: 4, text: 'Den rychle utekl, lidi milí.', reviewer: { name: 'Karolína B.' }, date: '7/2026', role: 'Promo', shifts: 2 },
      ],
    },
  },

  // ── Stěhování — CHUDÝ inzerát, neověřeno, ŠPATNÉ hodnocení
  {
    id: 'j13', title: 'Výpomoc při stěhování', company: 'Rychlé stěhování', logo: 'RS', logoColor: '#B0855B',
    verified: false, boosted: false, pay: 230, payUnit: 'Kč/h', total: 1380,
    jobType: 'jednrazova_vypomoc', obor: 'sklad', payout: 'Hned po akci', posted: 'včera', recurrence: 'Jednorázová',
    location: 'Brno', distance: 9.0, when: 'Dle domluvy', time: '8:00 – 14:00',
    rating: 2.8, reviews: 17, tags: ['Fyzicky náročné'], accent: '#B0855B',
    desc: 'Nakládání a stěhování nábytku a krabic. Fyzicky náročné.',
    photos: ['https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=900&q=70&auto=format&fit=crop'],
    employer: {
      industry: 'Stěhování', kraj: 'jihomoravsky', address: 'Brno',
      bio: 'Stěhovací služby po Brně a okolí.',
      reviews: [
        { id: 'rs-r1', rating: 2, text: 'Domluva na poslední chvíli, chaos na místě.', reviewer: { name: 'Jan P.' }, date: '8/2026', role: 'Stěhování', shifts: 1 },
        { id: 'rs-r2', rating: 3, text: 'Zaplatili hned, ale fyzicky brutál.', reviewer: { name: 'Michal T.' }, date: '7/2026', role: 'Stěhování', shifts: 2 },
      ],
    },
  },

  // ── Barista víkendy — pravidelná, Zakládající partner, dobré hodnocení
  {
    id: 'j14', title: 'Barista — víkendové směny', company: 'Kavárna Zrno', logo: 'KZ', logoColor: '#C98A5E',
    verified: true, boosted: true, pay: 185, payUnit: 'Kč/h', total: 1480, payBand: { min: 160, avg: 182, max: 220 },
    jobType: 'part_time', obor: 'gastro', payout: 'Týdně', posted: 'před 1 týdnem', recurrence: 'Pravidelná',
    contract: 'DPP', location: 'Brno — střed', distance: 1.1, when: 'So – Ne', time: '8:00 – 16:00',
    rating: 4.7, reviews: 88, tags: ['Gastro', 'Víkend', 'Káva zdarma'], accent: '#C98A5E',
    duties: 'Víkendové směny za barem: espresso, filtr, mléčné nápoje, obsluha hostů a kasa. Zaučíme tě do naší kalibrace.',
    expectations: ['Chuť učit se', 'Příjemné vystupování', 'Věk 18+'],
    bonuses: ['Zkušenost z kavárny', 'Latte art'],
    offer: ['Zaučení', 'Káva zdarma', 'Pravidelné víkendy'],
    perks: ['Káva zdarma', 'Týdenní výplata'],
    desc: 'Víkendová obsluha kavárny. Naučíme tě espresso i latte art.',
    photos: ['https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=900&q=70&auto=format&fit=crop'],
    employer: {
      industry: 'Kavárna', founded: 2019, kraj: 'jihomoravsky', address: 'střed, Brno', website: 'kavarnazrno.cz', openPositions: 2,
      bio: 'Kavárna v centru s vlastní pražírnou. Sháníme baristy na víkendy — zaučíme i začátečníky.',
      reviews: [
        { id: 'kz-r1', rating: 5, text: 'Pohodové víkendy, super tým.', reviewer: { name: 'Ondra V.' }, date: '8/2026', role: 'Barista', shifts: 10 },
        { id: 'kz-r2', rating: 4, text: 'Nával přes víkend, ale zábava.', reviewer: { name: 'Lucie H.' }, date: '7/2026', role: 'Barista', shifts: 6 },
      ],
    },
  },

  // ── Foto editor — pravidelná/z domu, zatím bez hodnocení, střední info
  {
    id: 'j15', title: 'Úprava fotek (foto editor)', company: 'PhotoLab', logo: 'PL', logoColor: '#8E9BE0',
    verified: true, boosted: false, pay: 260, payUnit: 'Kč/h', total: 1560, payBand: { min: 220, avg: 255, max: 300 },
    jobType: 'part_time', obor: 'foto', payout: 'Měsíčně', posted: 'před 2 dny', recurrence: 'Pravidelná',
    contract: 'OSVČ', forma: ['Home office'], location: 'Brno — z domu', distance: 2.4, when: 'Flexibilně', time: 'dle domluvy',
    rating: 0, reviews: 0, tags: ['Foto/video', 'Z domu', 'Flexibilně'], accent: '#8E9BE0',
    duties: 'Retušuješ a upravuješ produktové a portrétní fotky v Lightroomu/Photoshopu podle zadání. Práce z domu, termíny dle domluvy.',
    expectations: ['Znalost Lightroom / Photoshop', 'Smysl pro detail', 'Vlastní počítač'],
    bonuses: ['Portfolio úprav', 'Rychlost'],
    offer: ['Práce z domu', 'Flexibilní termíny'],
    perks: ['Home office', 'Flexibilní čas'],
    desc: 'Postprodukce fotek na dálku — retuš, barvy, ořezy.',
    photos: ['https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=900&q=70&auto=format&fit=crop'],
    employer: {
      industry: 'Foto · postprodukce', founded: 2021, kraj: 'jihomoravsky', address: 'z domu', website: 'photolab.cz', openPositions: 1,
      bio: 'Studio na produktovou fotografii. Sháníme editory na úpravu fotek na dálku.',
    },
  },
];

const CHATS = [
  { id: 'c1', name: 'Kafe Punkt', logo: 'KP', logoColor: '#F4A261', last: 'Super, tak se uvidíme zítra v 7! ☕', time: '12:42', unread: 2, online: true, role: 'Barista' },
  { id: 'c2', name: 'Pop Messe', logo: 'PM', logoColor: '#8AB4FF', last: 'Pošleš mi prosím fotku OP?', time: '11:08', unread: 0, online: true, role: 'Hosteska' },
  { id: 'c3', name: 'Studio Korunka', logo: 'SK', logoColor: '#E0B0FF', last: 'Díky za zájem, ozveme se do pátku.', time: 'Včera', unread: 0, online: false, role: 'Foto asistent' },
  { id: 'c4', name: 'Rohlík.cz', logo: 'R', logoColor: '#5BD68A', last: 'Nástup je možný hned od pondělí.', time: 'Pá', unread: 0, online: false, role: 'Skladník' },
];

const THREAD = [
  { from: 'them', text: 'Ahoj Tome! Díky za swajp 💙 Máme rádi rychlé.', time: '12:30' },
  { from: 'me', text: 'Ahoj! Mám dotaz — vařil jsem espresso, ale latte art jen základ. Vadí?', time: '12:32' },
  { from: 'them', text: 'Vůbec ne, naučíme. První směna je hlavně o seznámení s tým a kávou.', time: '12:33' },
  { from: 'shift', shift: { date: 'Pá 9. května', time: '7:00 – 15:00', pay: 1440 }, time: '12:35' },
  { from: 'me', text: 'Beru! Dorazím v 6:50.', time: '12:40' },
  { from: 'them', text: 'Super, tak se uvidíme zítra v 7! ☕', time: '12:42' },
];

// ─────────────────────────────────────────────────────────────
// Tokens
// ─────────────────────────────────────────────────────────────
const T = {
  bg: 'linear-gradient(180deg, #0014A3 0%, #050510 100%)',
  card: '#16163b',
  cardSoft: 'rgba(255,255,255,0.06)',
  primary: '#0020F6',
  primaryDeep: '#0014A3',
  light: '#E8EBFF',
  text: '#ffffff',
  muted: '#9999cc',
  mutedSoft: '#6e6ea8',
  destructive: '#f43f5e',
  super: '#FFD166',
  border: 'rgba(255,255,255,0.08)',
  fontUI: '"Plus Jakarta Sans", -apple-system, system-ui, sans-serif',
  fontHead: '"Inter", -apple-system, system-ui, sans-serif',
  fontMono: '"JetBrains Mono", ui-monospace, monospace',
  fontDeco: '"Playfair Display", Georgia, serif',
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const Icon = ({ name, size = 20, color = 'currentColor' }) => (
  // noobserver = vypne líný IntersectionObserver iconify-icon → ikonka se vykreslí
  // hned, ne až když na ni scrollem najedeš (jinak v dlouhých detailech „naskakují").
  <iconify-icon icon={`solar:${name}`} width={size} height={size} noobserver="" style={{ color, display: 'inline-flex', verticalAlign: 'middle' }}></iconify-icon>
);

function fmtKc(n) {
  return n.toLocaleString('cs-CZ').replace(/,/g, ' ') + ' Kč';
}

// ─────────────────────────────────────────────────────────────
// Job card — the swipeable thing
// ─────────────────────────────────────────────────────────────
function JobCard({ job, drag, onTap, isTop, depth = 0 }) {
  const x = isTop ? drag.x : 0;
  const y = isTop ? drag.y : 0;
  const rot = isTop ? (x / 18) : 0;
  const opacity = isTop ? 1 : (1 - depth * 0.08);
  const scale = isTop ? 1 : (1 - depth * 0.04);
  const translateY = isTop ? 0 : (depth * 12);

  const likeShown = isTop && x > 40;
  const passShown = isTop && x < -40;
  const superShown = isTop && y < -60;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        transform: `translate(${x}px, ${y + translateY}px) rotate(${rot}deg) scale(${scale})`,
        opacity,
        transition: drag.dragging ? 'none' : 'transform .35s cubic-bezier(.2,.8,.2,1), opacity .35s',
        willChange: 'transform',
        zIndex: 10 - depth,
        pointerEvents: isTop ? 'auto' : 'none',
      }}
      onClick={() => isTop && !drag.moved && onTap?.()}
    >
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: 28,
        overflow: 'hidden',
        background: T.card,
        boxShadow: '0 30px 60px -20px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.06) inset, 0 0 0 1px rgba(255,255,255,0.05)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Hero block — gradient + abstract company mark */}
        <div style={{
          position: 'relative',
          flex: '1 1 58%',
          background: `linear-gradient(155deg, ${job.accent} 0%, ${T.primaryDeep} 70%, ${T.card} 100%)`,
          overflow: 'hidden',
        }}>
          {/* abstract shapes */}
          <svg viewBox="0 0 400 500" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.7 }}>
            <defs>
              <radialGradient id={`g-${job.id}`} cx="0.7" cy="0.2" r="0.9">
                <stop offset="0" stopColor="#fff" stopOpacity="0.3" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="400" height="500" fill={`url(#g-${job.id})`} />
            <circle cx="320" cy="120" r="80" fill="rgba(255,255,255,0.12)" />
            <circle cx="60" cy="380" r="120" fill="rgba(0,0,0,0.18)" />
          </svg>

          {/* Big company mark */}
          <div style={{
            position: 'absolute', top: 28, left: 24,
            width: 56, height: 56, borderRadius: 16,
            background: 'rgba(255,255,255,0.95)',
            color: job.accent,
            display: 'grid', placeItems: 'center',
            fontFamily: T.fontHead, fontWeight: 800, fontSize: 22,
            letterSpacing: -0.5,
            boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
          }}>
            {job.logo}
          </div>

          {/* Distance pill */}
          <div style={{
            position: 'absolute', top: 36, right: 20,
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 12px', borderRadius: 999,
            background: 'rgba(0,0,0,0.32)',
            backdropFilter: 'blur(10px)',
            color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: T.fontUI,
          }}>
            <Icon name="map-point-bold" size={14} color="#fff" />
            {job.distance} km
          </div>

          {/* Decorative big pay */}
          <div style={{
            position: 'absolute', right: 20, bottom: 88,
            color: '#fff', textAlign: 'right',
            textShadow: '0 2px 8px rgba(0,0,0,0.35)',
          }}>
            <div style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 56, lineHeight: 0.95, letterSpacing: -2 }}>
              {job.pay}
            </div>
            <div style={{ fontFamily: T.fontUI, fontSize: 13, opacity: 0.9, marginTop: 2 }}>{job.payUnit}</div>
          </div>

          {/* Bottom gradient + title */}
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            padding: '60px 22px 18px',
            background: 'linear-gradient(180deg, rgba(22,22,59,0) 0%, rgba(22,22,59,0.85) 100%)',
          }}>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600, fontFamily: T.fontUI, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              {job.company}
              {job.rating > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: T.super }}>
                  <WStar size={12} color={T.super} />
                  <span style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 12 }}>{job.rating.toFixed(1)}</span>
                </span>
              )}
              {job.verified && (
                <Icon name="verified-check-bold" size={13} color="#6F80FF" />
              )}
            </div>
            <div style={{
              color: '#fff', fontSize: 22, lineHeight: 1.15, fontWeight: 700,
              fontFamily: T.fontHead, letterSpacing: -0.4,
              textWrap: 'balance',
            }}>
              {job.title}
            </div>
          </div>

          {/* LIKE / NOPE / SUPER stamps */}
          <Stamp show={likeShown} angle={-12} pos={{ top: 32, left: 22 }} color="#5BD68A" label="MÁM ZÁJEM" intensity={Math.min(1, x / 120)} />
          <Stamp show={passShown} angle={14} pos={{ top: 32, right: 22 }} color={T.destructive} label="PŘESKOČIT" intensity={Math.min(1, -x / 120)} />
          <Stamp show={superShown} angle={-4} pos={{ top: '40%', left: '50%', transform: 'translate(-50%,-50%)' }} color={T.super} label="SUPER" big intensity={Math.min(1, -y / 140)} />
        </div>

        {/* Footer block */}
        <div style={{ flex: '0 0 auto', padding: '14px 20px 18px', background: T.card, borderTop: '1px solid ' + T.border }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: T.muted, fontSize: 12, fontFamily: T.fontUI, marginBottom: 12 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Icon name="calendar-minimalistic-linear" size={14} /> {job.when}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Icon name="clock-circle-linear" size={14} /> {job.time}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {job.tags.map(t => (
              <span key={t} style={{
                padding: '6px 10px', borderRadius: 999,
                background: 'rgba(208,208,255,0.08)',
                color: T.light, fontSize: 11, fontWeight: 600, fontFamily: T.fontUI,
                border: '1px solid rgba(208,208,255,0.12)',
              }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stamp({ show, angle, pos, color, label, big, intensity = 1 }) {
  return (
    <div style={{
      position: 'absolute',
      ...pos,
      padding: big ? '14px 26px' : '8px 16px',
      border: `3px solid ${color}`,
      borderRadius: 10,
      color, background: 'rgba(15,15,45,0.4)',
      backdropFilter: 'blur(4px)',
      transform: `${pos.transform || ''} rotate(${angle}deg) scale(${0.9 + intensity * 0.2})`,
      transformOrigin: 'center',
      fontFamily: T.fontHead, fontWeight: 900,
      fontSize: big ? 28 : 18,
      letterSpacing: 1,
      opacity: show ? Math.max(0.5, intensity) : 0,
      transition: 'opacity .15s',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
    }}>{label}</div>
  );
}

// ─────────────────────────────────────────────────────────────
// DRUHY UPOZORNĚNÍ
// Jeden vypínač na všechno je málo: kdo nechce mít telefon plný nabídek,
// vypne dnes i zprávy od firmy, se kterou se domlouvá. Proto se každý druh
// přepíná zvlášť. Uloženo v prohlížeči (`makej-notif-<klíč>`), výchozí je
// zapnuto — nová appka má oznámení posílat, ne mlčet.
// ─────────────────────────────────────────────────────────────
const W_NOTIF_DRUHY = [
  { key: 'zpravy',    label: 'Zprávy',                popis: 'Nová zpráva v chatu' },
  { key: 'smeny',     label: 'Brigády a směny',       popis: 'Přijetí, nabídka směny, pozvánka na pohovor' },
  { key: 'nabidky',   label: 'Nové brigády v okolí',  popis: 'Když se objeví brigáda, která ti sedí' },
  { key: 'hodnoceni', label: 'Hodnocení',             popis: 'Připomenutí, ať ohodnotíš dokončenou brigádu' },
];

// Dřív existoval jediný přepínač `makej-notifs`. Komu byl vypnutý, tomu by po
// téhle změně zmizelo ovládání a oznámení by mlčela napořád — nová obrazovka
// ten stav neumí ukázat. Převedeme ho proto jednorázově na všechny druhy.
(function wNotifMigrace() {
  try {
    if (localStorage.getItem('makej-notifs') === 'off') {
      W_NOTIF_DRUHY.forEach(d => localStorage.setItem('makej-notif-' + d.key, 'off'));
      localStorage.setItem('makej-notifs', 'on');
    }
  } catch (e) { /* soukromé okno / zakázané úložiště — nevadí */ }
})();

function wNotifPovoleno(druh) {
  if (!druh) return true;   // neznámý druh raději pustíme, než abychom ho utopili
  try { return localStorage.getItem('makej-notif-' + druh) !== 'off'; } catch (e) { return true; }
}
function wNotifNastav(druh, zap) {
  try { localStorage.setItem('makej-notif-' + druh, zap ? 'on' : 'off'); } catch (e) {}
}

// Ze záznamu oznámení určí, pod který přepínač spadá.
function wNotifDruh(n) {
  if (!n) return null;
  const k = n.kind || '';
  const t = n.type || '';
  if (k === 'chat')   return 'zpravy';
  if (k === 'review' || t === 'review') return 'hodnoceni';
  if (t === 'shift' || t === 'interview' || k === 'shift' || k === 'interview') return 'smeny';
  if (k === 'job' || t === 'job' || t === 'nabidka') return 'nabidky';
  return null;
}

// ─────────────────────────────────────────────────────────────
// Otevření odkazu ven z appky (podmínky, ochrana soukromí, nápověda).
// V nativním obalu přes Capacitor Browser = vestavěný prohlížeč s tlačítkem
// Hotovo. `window.open` by v obalu otevřelo okno, ze kterého není cesty zpět,
// protože appka nemá adresní řádek ani tlačítko zpět.
// ─────────────────────────────────────────────────────────────
function wOtevriOdkaz(url) {
  if (!url) return;
  try {
    const C = typeof window !== 'undefined' && window.Capacitor;
    const B = C && C.Plugins && C.Plugins.Browser;
    if (B && B.open) { B.open({ url, presentationStyle: 'popover' }); return; }
  } catch (e) { /* není nativní obal — spadneme na window.open */ }
  try { window.open(url, '_blank', 'noopener,noreferrer'); } catch (e) {}
}

// Právní odkazy na jednom místě — kdyby se měnila doména nebo cesty,
// ať se to nemusí hledat po komponentách.
const W_ODKAZY = {
  soukromi: 'https://makej.eu/privacy.html',
  podminky: 'https://makej.eu/terms.html',
};

// ─────────────────────────────────────────────────────────────
// SPODNÍ ROLETKY — jednotné zavírání
//
// Roletka se nesmí odpojit hned, jinak zmizí skokem. Proto se zavírá přes stav:
// nejdřív sjede dolů a závoj vybledne, a teprve po dojetí se zavolá onClose,
// který ji odpojí. Volá se z těla komponenty jako hook.
//
//   const R = wRoletka(onClose, { panelIn: 'wSheetUp .34s ...' });
//   <div {...R.zavojProps} style={{ …, animation: R.zavojAnim }}>
//     <div {...R.panelProps} style={{ …, animation: R.panelAnim }}> … </div>
//
// Zavírá se i zevnitř (křížek, „Zrušit", hotovo) — přes R.zavri(), ne onClose,
// jinak by ta cesta pořád skákala. R.zavri(fce) fci spustí až po dojezdu.
//
// `otevreno` se předává jen tam, kde roletka NENÍ samostatná komponenta a
// zůstává připojená i zavřená — bez toho by si nesla `zaviram` z minula.
// ─────────────────────────────────────────────────────────────
function wRoletka(onClose, nast) {
  const o = nast || {};
  const DOLU = o.dolu || 250;                                  // ms, jak dlouho sjíždí dolů
  const POJISTKA = o.pojistka == null ? 220 : o.pojistka;      // ms, než začne brát kliky mimo
  const otevreno = o.otevreno == null ? true : !!o.otevreno;

  const [zaviram, setZaviram] = useState(false);
  const [pripraven, setPripraven] = useState(false);
  const [minule, setMinule] = useState(otevreno);

  // Reset ještě během renderu, ne až v efektu: jinak by první snímek po
  // znovuotevření běžel se starým `zaviram`, tedy s animací dolů.
  if (otevreno !== minule) {
    setMinule(otevreno);
    if (otevreno) { setZaviram(false); setPripraven(false); }
  }

  // Krátká pojistka po otevření. Prst, kterým se roletka otevřela, umí doklepnout
  // na závoj a zavřít ji dřív, než si jí uživatel vůbec stihne všimnout.
  useEffect(() => {
    if (!otevreno) return;
    const t = setTimeout(() => setPripraven(true), POJISTKA);
    return () => clearTimeout(t);
  }, [otevreno]);

  function zavri(pak) {
    if (zaviram) return;
    setZaviram(true);
    setTimeout(() => {
      if (typeof pak === 'function') pak();
      if (onClose) onClose();
    }, DOLU);
  }

  return {
    zaviram, zavri,
    // stopPropagation je nutný: roletky sedí uvnitř obrazovek, které samy mají
    // onClick (třeba plný inzerát). Bez něj by klik propadl a zavřel i je.
    zavojProps: { onClick: e => { e.stopPropagation(); if (pripraven) zavri(); } },
    zavojAnim: zaviram ? 'wFadeOut .24s ease forwards' : (o.zavojIn || 'wScrimIn .24s ease'),
    panelProps: { onClick: e => e.stopPropagation() },
    panelAnim: zaviram
      ? 'wSheetDown ' + (DOLU / 1000) + 's cubic-bezier(.4,0,1,1) forwards'
      : (o.panelIn || 'wSheetUp .34s cubic-bezier(.24,1,.32,1) both'),
  };
}

// ─────────────────────────────────────────────────────────────
// Klávesnice a rolování
//
// Když se klepne do pole, prohlížeč si ho odroluje sám — jenže míří na střed
// CELÉ stránky, a ten je po vyjetí klávesnice schovaný pod ní. Řádek zmizí
// přesně ve chvíli, kdy do něj člověk začne psát.
//
// Tohle ho srovná na střed toho, co je opravdu vidět (visualViewport = plocha
// nad klávesnicí). Volá se znovu při každé změně výšky, protože klávesnice
// nevyjede naráz a první výpočet by počítal s ještě celou obrazovkou.
// ─────────────────────────────────────────────────────────────
function wNajdiRolovac(el) {
  for (let p = el && el.parentElement; p; p = p.parentElement) {
    const s = getComputedStyle(p).overflowY;
    if ((s === 'auto' || s === 'scroll') && p.scrollHeight > p.clientHeight + 4) return p;
  }
  return null;
}
function wDoZorneho(el) {
  if (!el) return;
  const vv = window.visualViewport;
  const box = el.getBoundingClientRect();
  const vrch = vv ? vv.offsetTop : 0;
  const vyska = vv ? vv.height : window.innerHeight;
  const posun = (box.top + box.height / 2) - (vrch + vyska / 2);
  if (Math.abs(posun) < 8) return;
  const rolovac = wNajdiRolovac(el);
  if (rolovac) rolovac.scrollBy({ top: posun, behavior: 'smooth' });
  else window.scrollBy({ top: posun, behavior: 'smooth' });
}
// Podrž pole v zorném poli, dokud se klávesnice neustálí.
function wDrzVZornem(el) {
  if (!el) return;
  const vv = window.visualViewport;
  setTimeout(() => wDoZorneho(el), 60);
  if (!vv) { setTimeout(() => wDoZorneho(el), 340); return; }
  const znovu = () => wDoZorneho(el);
  vv.addEventListener('resize', znovu);
  setTimeout(() => vv.removeEventListener('resize', znovu), 1400);
}

// ─────────────────────────────────────────────────────────────
// Věkový limit
//
// Závislou práci smí podle § 35 občanského zákoníku vykonávat až ten, komu je
// 15 a má ukončenou povinnou školní docházku — obě podmínky naráz. Flexinovela
// od 1. 6. 2025 pustila ke lehkým pracím i čtrnáctileté, ale jen o hlavních
// prázdninách, s písemným souhlasem zákonného zástupce a s vlastními limity
// (max. 7 h denně, zákaz práce 20–6). To appka neumí ohlídat, takže hranice
// je 15 a níž nikoho nepustíme.
// ─────────────────────────────────────────────────────────────
const W_MIN_VEK = 15;

// Věk k dnešku z „RRRR-MM-DD". Vrací null, když datum nedává smysl.
function wVekZDatumu(datum) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datum || '');
  if (!m) return null;
  const r = +m[1], me = +m[2], d = +m[3];
  const dnes = new Date();
  let vek = dnes.getFullYear() - r;
  // Letos ještě neměl narozeniny → o rok míň.
  const mesic = dnes.getMonth() + 1;
  if (mesic < me || (mesic === me && dnes.getDate() < d)) vek--;
  return vek >= 0 && vek < 130 ? vek : null;
}
function wVekStaci(datum) {
  const v = wVekZDatumu(datum);
  return v == null ? false : v >= W_MIN_VEK;
}

// Roletka „ještě si počkej". Nic nenabízí a nikam nevede — mladší patnácti
// let u nás práci nenajde, tak ať to ví hned a narovinu, ne až u smlouvy.
function WVekStop({ vek, onClose }) {
  const R = wRoletka(onClose, { panelIn: 'wSheetUp .34s cubic-bezier(.24,1,.32,1) both' });
  const zbyva = vek == null ? null : Math.max(1, W_MIN_VEK - vek);
  return (
    <div {...R.zavojProps} style={{
      position: 'fixed', inset: 0, zIndex: 9300, background: 'rgba(12,16,52,.44)',
      display: 'flex', alignItems: 'flex-end', animation: R.zavojAnim,
    }}>
      <div {...R.panelProps} style={{
        width: '100%', background: T.bg, borderRadius: '22px 22px 0 0',
        padding: '10px 22px calc(22px + env(safe-area-inset-bottom))',
        animation: R.panelAnim,
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 999, background: T.border, margin: '0 auto 18px' }} />
        <div style={{ fontFamily: T.fontHead, fontSize: 21, fontWeight: 800, color: T.ink, letterSpacing: -0.4, lineHeight: 1.25 }}>
          Omlouváme se, ještě si musíš počkat
        </div>
        <div style={{ marginTop: 8, fontFamily: T.fontUI, fontSize: 14.5, color: T.muted, lineHeight: 1.6 }}>
          Brigádu u nás můžeš vzít od {W_MIN_VEK} let, až budeš mít za sebou povinnou školní docházku. Tak to máme podle zákona a nemůžeme si vybírat.
          {zbyva != null && <span> Vrať se za {zbyva === 1 ? 'rok' : (zbyva < 5 ? zbyva + ' roky' : zbyva + ' let')} — účet ti tu zůstane.</span>}
        </div>
        <button onClick={() => R.zavri()} style={{
          width: '100%', marginTop: 20, border: 'none', borderRadius: 16, padding: 17,
          background: T.primary, color: '#fff', fontFamily: T.fontUI, fontSize: 15.5, fontWeight: 800,
          cursor: 'pointer',
        }}>Rozumím</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// WNavod — vizuální navedení „udělej tohle"
//
// Přes obrazovku lehne SVĚTLÝ matný závoj a v něm zůstanou čistá okýnka
// u toho, co má člověk vyplnit. Popis se dopisuje po znacích a na konci
// bliká kurzor.
//
// Proč světlý, a ne tmavý: tmavá modrá přes appku vypadala jako chybová
// vrstva. Matné bílo s tmavým písmem je klidnější a nerve to s obsahem.
//
// Okýnek může být VÍC. Když se rozbalí výběr data, nevyřízne se jeden velký
// obdélník od řádku k panelu — mezi nimi je totiž obsah, který s datem
// nesouvisí (e-mail, popisky), a ten pak prosvítal a dělal nepořádek.
// Místo toho dostane každý kus vlastní kulaté okýnko.
//
// Rohy jsou kulaté díky masce (SVG, evenodd). Maska ale nehlídá klepání,
// proto je pod ní druhá, neviditelná vrstva s ostrými dírami.
//
//   const ref = useRefW(null);
//   <div ref={ref}> … pole … </div>
//   {navod && <WNavod cil={ref} titul="…" text="…" onPreskocit={…} />}
// ─────────────────────────────────────────────────────────────
const _W_NAVOD_ZNAK_TITUL = 26;   // ms na znak — rychleji než běžný typewriter
const _W_NAVOD_ZNAK_TEXT  = 13;
const _W_NAV_BTN = {
  flex: 'none', border: 0, borderRadius: 999, padding: '9px 15px', cursor: 'pointer',
  fontFamily: T.fontHead, fontSize: 13.5, fontWeight: 800,
  WebkitTapHighlightColor: 'transparent',
};

// `bezOtazky`: odchod bez druhého ptaní. Patří ke krokům, které nejsou
// průvodce, ale zákonná podmínka — tam „Zatím ne" nic nepřeskakuje, jen
// člověka pustí pryč bez toho, aby si o brigádu řekl.
function WNavod({ cil, titul, text, onPreskocit, preskocitText, bezOtazky, mezera, radius, krok, kroku, akce }) {
  const [okna, setOkna] = useState(null);
  const [napsano, setNapsano] = useState({ t: '', x: '' });
  // Přeskočení se ptá podruhé. Průvodce je krátký a kdo ho odklikne omylem,
  // už se k němu sám nevrátí — druhé klepnutí stojí vteřinu a ušetří mrzení.
  const [ptamSe, setPtamSe] = useState(false);
  // Kolik z obrazovky je vidět. Klávesnice ji zmenší zespodu a `innerHeight`
  // o tom na iOSu neví — ví to jen visualViewport.
  const [vidu, setVidu] = useState(() => ({
    vrch: 0, vyska: (window.visualViewport ? window.visualViewport.height : window.innerHeight),
  }));
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const zmer = () => setVidu({ vrch: vv.offsetTop, vyska: vv.height });
    zmer();
    vv.addEventListener('resize', zmer);
    vv.addEventListener('scroll', zmer);
    return () => { vv.removeEventListener('resize', zmer); vv.removeEventListener('scroll', zmer); };
  }, []);
  const drzena = useRef(null);
  // Bez lemu: okýnko sedne přesně na řádek, takže uvnitř je jen jeho text
  // a nic z okolní karty. S lemem kolem prosvítalo pozadí a oválek vypadal
  // jako bílý obdélník uvnitř oválu.
  const pad = mezera == null ? 0 : mezera;
  // Pořádně kulaté rohy. Malý poloměr se na vysokém okýnku (rozbalený výběr
  // data) ztratí a hrany vypadají ostré. Clamp na polovinu kratší strany níž
  // z toho u nízkého řádku udělá skoro pilulku.
  const rr = radius == null ? 30 : radius;

  // ── Značka „běží návod" pro zbytek appky ──
  // Roletky a výběry se běžně zavírají klepnutím vedle. Za běhu návodu je to
  // ale skoro vždycky omyl — a zavřít kvůli omylu celé navedení je ta nejhorší
  // možná odpověď. Kdo čte tuhle značku, nechá se zavřít jedině tlačítkem.
  // Počítadlo, ne true/false: návodů může být za sebou víc a překrýt se.
  useEffect(() => {
    window.__wNavodBezi = (window.__wNavodBezi || 0) + 1;
    return () => { window.__wNavodBezi = Math.max(0, (window.__wNavodBezi || 1) - 1); };
  }, []);

  // ── Poloha okýnek ──
  useEffect(() => {
    let bezi = true;
    const dojed = (a, b) => a ? {
      x1: a.x1 + (b.x1 - a.x1) * 0.22, y1: a.y1 + (b.y1 - a.y1) * 0.22,
      x2: a.x2 + (b.x2 - a.x2) * 0.22, y2: a.y2 + (b.y2 - a.y2) * 0.22,
    } : b;
    function tik() {
      if (!bezi) return;
      const el = cil && cil.current;
      if (el) {
        // JEDNO okýnko přes všechno — řádek i rozbalený výběr data. Roste
        // plynule dolů, jak se panel objeví (viz dojed() níž), místo aby
        // naskočilo druhé okno vedle.
        const b = el.getBoundingClientRect();
        let x1 = b.left, y1 = b.top, x2 = b.right, y2 = b.bottom;
        el.querySelectorAll('[data-navod-rozsir]').forEach(p2 => {
          const q = p2.getBoundingClientRect();
          if (q.width < 2 || q.height < 2) return;
          x1 = Math.min(x1, q.left); y1 = Math.min(y1, q.top);
          x2 = Math.max(x2, q.right); y2 = Math.max(y2, q.bottom);
        });
        const cile = [{ x1: x1 - pad, y1: y1 - pad, x2: x2 + pad, y2: y2 + pad }];
        const stara = drzena.current || [];
        const nova = cile.map((c, i) => dojed(stara[i], c));
        drzena.current = nova;
        const zmena = !okna || okna.length !== nova.length || nova.some((n, i) =>
          Math.abs(n.x1 - okna[i].x1) > 0.4 || Math.abs(n.y1 - okna[i].y1) > 0.4 ||
          Math.abs(n.x2 - okna[i].x2) > 0.4 || Math.abs(n.y2 - okna[i].y2) > 0.4);
        if (zmena) setOkna(nova);
      }
      requestAnimationFrame(tik);
    }
    tik();
    return () => { bezi = false; };
  });

  // ── Dopisování ──
  useEffect(() => {
    let bezi = true, casovac = null;
    const T1 = titul || '', T2 = text || '';
    let i = 0, j = 0;
    function krokTitul() {
      if (!bezi) return;
      i++; setNapsano({ t: T1.slice(0, i), x: '' });
      if (i < T1.length) casovac = setTimeout(krokTitul, _W_NAVOD_ZNAK_TITUL);
      else casovac = setTimeout(krokText, 130);
    }
    function krokText() {
      if (!bezi) return;
      j++; setNapsano({ t: T1, x: T2.slice(0, j) });
      if (j < T2.length) casovac = setTimeout(krokText, _W_NAVOD_ZNAK_TEXT);
    }
    setPtamSe(false);   // nový krok → případná otázka „opravdu?" jde pryč
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) setNapsano({ t: T1, x: T2 });
    else casovac = setTimeout(krokTitul, 220);
    return () => { bezi = false; clearTimeout(casovac); };
  }, [titul, text]);

  if (!okna || !okna.length) return null;
  const W = window.innerWidth, H = window.innerHeight;

  function kulatyObdelnik(o) {
    const x1 = Math.max(0, o.x1), y1 = Math.max(0, o.y1), x2 = o.x2, y2 = o.y2;
    const w = Math.max(1, x2 - x1), h = Math.max(1, y2 - y1);
    const a = Math.min(rr, w / 2, h / 2);
    return 'M' + (x1 + a) + ' ' + y1 + 'H' + (x2 - a) + 'A' + a + ' ' + a + ' 0 0 1 ' + x2 + ' ' + (y1 + a) +
      'V' + (y2 - a) + 'A' + a + ' ' + a + ' 0 0 1 ' + (x2 - a) + ' ' + y2 +
      'H' + (x1 + a) + 'A' + a + ' ' + a + ' 0 0 1 ' + x1 + ' ' + (y2 - a) +
      'V' + (y1 + a) + 'A' + a + ' ' + a + ' 0 0 1 ' + (x1 + a) + ' ' + y1 + 'Z';
  }
  const cesta = 'M0 0H' + W + 'V' + H + 'H0Z ' + okna.map(kulatyObdelnik).join(' ');
  const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='" + W + "' height='" + H + "'>" +
              "<path fill='#fff' fill-rule='evenodd' d='" + cesta + "'/></svg>";
  const maska = 'url("data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '")';

  // Zábrana proti klepání mimo okýnko: ČTYŘI PRUHY kolem díry, ne jedna vrstva
  // přes celou obrazovku s vyříznutým otvorem.
  //
  // Proč: `clip-path` platí jen pro klepání (elementFromPoint). Posouvání prstem
  // ale na iOSu řeší kompozitor, a ten clip-path neřeší — vrstva si gesto vezme,
  // i když je v tom místě „vyříznutá". Projevilo se to přesně takhle: na datum
  // šlo klepnout, ale kolečky se nedalo jezdit. Pruhy se díry nedotýkají, takže
  // nad ní nic neleží a gesto má volnou cestu.
  const o0 = okna.reduce((a, o) => ({
    x1: Math.min(a.x1, o.x1), y1: Math.min(a.y1, o.y1),
    x2: Math.max(a.x2, o.x2), y2: Math.max(a.y2, o.y2),
  }));
  const hx1 = Math.max(0, o0.x1), hy1 = Math.max(0, o0.y1);
  const hx2 = Math.min(W, o0.x2), hy2 = Math.min(H, o0.y2);
  // touchAction 'none': tažení po zamlženém okolí nemá rolovat stránkou pod ním.
  const pruh = { position: 'absolute', pointerEvents: 'auto', touchAction: 'none' };
  const pruhy = [
    { ...pruh, left: 0, right: 0, top: 0, height: Math.max(0, hy1) },
    { ...pruh, left: 0, right: 0, top: Math.max(0, hy2), bottom: 0 },
    { ...pruh, left: 0, top: hy1, width: Math.max(0, hx1), height: Math.max(0, hy2 - hy1) },
    { ...pruh, left: hx2, right: 0, top: hy1, height: Math.max(0, hy2 - hy1) },
  ];

  // Bublina sedí NAD výřezem, dokud je nad ním dost místa. U výřezu při horním
  // okraji se překlopí pod něj. Rozhoduje se podle místa nahoře, ne podle
  // místa dole — jinak by se přesunula ve chvíli, kdy se výřez roztáhne
  // (rozbalený výběr data), a to by poskočilo přímo pod prstem.
  const prvni = okna[0];
  // Nad výřezem, dokud je nad ním místo — a měří se místo VIDITELNÉ, ne celá
  // obrazovka. S vyjetou klávesnicí je spodní třetina pryč a bublina pod
  // výřezem by skončila za ní.
  const mistoNad = prvni.y1 - vidu.vrch;
  const mistoPod = (vidu.vrch + vidu.vyska) - prvni.y2;
  const podNim = mistoNad < 190 && mistoPod > mistoNad;
  const kurzor = <span style={{
    display: 'inline-block', width: 2, height: '1em', marginLeft: 3, verticalAlign: '-0.14em',
    background: 'currentColor', animation: 'obBlink 1.06s steps(1) infinite',
  }} />;

  // ── Bublina ──
  // Vzor „spotlight": ztmavená plocha, čistý výřez a bublina se šipkou, která
  // na něj ukazuje. Sedí pod výřezem, a když tam není místo, překlopí se nad něj.
  const BUB_S = 12;                       // velikost šipky
  const BUB_OKRAJ = 18;                   // odstup bubliny od kraje obrazovky
  const bubSirka = Math.min(330, W - BUB_OKRAJ * 2);
  const stredDiry = (prvni.x1 + prvni.x2) / 2;
  let bubLeft = Math.round(stredDiry - bubSirka / 2);
  bubLeft = Math.max(BUB_OKRAJ, Math.min(bubLeft, W - BUB_OKRAJ - bubSirka));
  // Šipka míří na střed díry, ale nesmí vylézt z oblouku bubliny.
  const sipkaX = Math.max(18, Math.min(bubSirka - 18, Math.round(stredDiry - bubLeft)));

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9200, pointerEvents: 'none' }}>
      {/* Ztmavená plocha s vyříznutým okýnkem. Žádné rozmazání — spotlight
          se pozná podle toho, že okolí ztmavne a zůstane ostré. */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'rgba(9, 12, 32, .66)',
        maskImage: maska, WebkitMaskImage: maska,
        maskSize: '100% 100%', WebkitMaskSize: '100% 100%',
        maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat',
        animation: 'wFadeIn .28s ease both',
      }} />
      {/* Jemný světlý lem kolem výřezu, ať je na ztmavené ploše vidět hrana */}
      {okna.map((o, i) => (
        <div key={'r' + i} style={{
          position: 'absolute', left: o.x1, top: o.y1,
          width: Math.max(1, o.x2 - o.x1), height: Math.max(1, o.y2 - o.y1),
          borderRadius: Math.min(rr, (o.x2 - o.x1) / 2, (o.y2 - o.y1) / 2),
          boxShadow: '0 0 0 2px rgba(255,255,255,.34), 0 0 34px rgba(255,255,255,.18)',
          pointerEvents: 'none',
        }} />
      ))}
      {/* Zábrana kolem okýnka — čtyři pruhy, samotná díra zůstává volná */}
      {pruhy.map((s, i) => <div key={'p' + i} style={s} />)}

      {/* Bublina s popisem */}
      <div style={{
        position: 'absolute', left: bubLeft, width: bubSirka,
        top: podNim ? (prvni.y2 + BUB_S + 6) : undefined,
        bottom: podNim ? undefined : (H - prvni.y1 + BUB_S + 6),
        background: T.primary, color: '#fff', borderRadius: 18,
        padding: '15px 17px 16px', pointerEvents: 'auto',
        boxShadow: '0 18px 40px -12px rgba(0,0,0,.45)',
        animation: 'wFadeIn .3s ease both',
      }}>
        {/* Šipka — jen otočený roh bubliny, takže má vždy stejnou barvu */}
        <span style={{
          position: 'absolute', left: sipkaX - BUB_S / 2, width: BUB_S, height: BUB_S,
          top: podNim ? -BUB_S / 2 : undefined, bottom: podNim ? undefined : -BUB_S / 2,
          background: T.primary, transform: 'rotate(45deg)', borderRadius: 3,
        }} />
        {titul && (
          <div style={{ fontFamily: T.fontHead, fontSize: 17, fontWeight: 800,
                        letterSpacing: -0.3, minHeight: 22 }}>
            {napsano.t}{napsano.x.length === 0 && kurzor}
          </div>
        )}
        <div style={{ marginTop: titul ? 5 : 0, fontFamily: T.fontUI, fontSize: 14,
                      lineHeight: 1.5, color: 'rgba(255,255,255,.88)' }}>
          {napsano.x}{napsano.x.length > 0 && kurzor}
        </div>
        {/* Patička se ukáže, až se text dopíše — dřív by přetahovala pozornost
            od toho, co si má člověk přečíst. */}
        {napsano.x.length === (text || '').length && (onPreskocit || akce || kroku > 1) && (
          <div style={{ marginTop: 14, animation: 'wFadeIn .3s ease both' }}>
            {ptamSe ? (
              <div>
                <div style={{ fontFamily: T.fontHead, fontSize: 14.5, fontWeight: 800, marginBottom: 10 }}>
                  Opravdu chceš průvodce přeskočit?
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={onPreskocit} style={{ ..._W_NAV_BTN, background: '#fff', color: T.primary }}>Ano, přeskočit</button>
                  <button onClick={() => setPtamSe(false)} style={{ ..._W_NAV_BTN, background: 'rgba(255,255,255,.16)', color: '#fff' }}>Ne, pokračovat</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Tečky: kolik kroků průvodce má a kde v něm člověk stojí. */}
                {kroku > 1 && (
                  <div style={{ display: 'flex', gap: 6, flex: 'none' }} aria-label={'Krok ' + (krok + 1) + ' z ' + kroku}>
                    {Array.from({ length: kroku }, (_, i) => (
                      <span key={i} style={{
                        width: i === krok ? 18 : 7, height: 7, borderRadius: 999,
                        background: i <= krok ? '#fff' : 'rgba(255,255,255,.34)',
                        transition: 'width .22s ease, background .22s ease',
                      }} />
                    ))}
                  </div>
                )}
                <div style={{ flex: 1 }} />
                {onPreskocit && (
                  <button onClick={() => (bezOtazky ? onPreskocit() : setPtamSe(true))} style={{
                    ..._W_NAV_BTN, padding: '8px 12px', background: 'transparent',
                    color: 'rgba(255,255,255,.82)',
                  }}>{preskocitText || 'Přeskočit'}</button>
                )}
                {akce && (
                  <button onClick={akce.hotovo ? akce.onClick : undefined} disabled={!akce.hotovo} style={{
                    ..._W_NAV_BTN, background: '#fff', color: T.primary,
                    opacity: akce.hotovo ? 1 : 0.42, cursor: akce.hotovo ? 'pointer' : 'default',
                  }}>{akce.text}</button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { JOBS, CHATS, THREAD, T, Icon, fmtKc, JobCard, Stamp, wRoletka, WNavod, wOtevriOdkaz, W_ODKAZY,
  W_MIN_VEK, wVekZDatumu, wVekStaci, WVekStop, wDoZorneho, wDrzVZornem,
  W_NOTIF_DRUHY, wNotifPovoleno, wNotifNastav, wNotifDruh });
