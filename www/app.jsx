// Makej — interactive prototype
// Worker app: swipe job offers, match modal, chat list & thread, profile.
// Brand: deep blue (#0020F6 brand) + dark gradient app shell (#0014A3 → #050510).

const { useState, useEffect, useRef, useMemo } = React;

// ─────────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────────
const JOBS = [
  {
    id: 'j1',
    title: 'Barista do specialty kavárny',
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
    duties: 'Sraz máš 30 minut před otevřením bran u produkčního stanu, kde dostaneš tričko, akreditaci a krátký briefing.\n\nPřes den jsi u vstupu nebo u infostánku: kontroluješ vstupenky a náramky, navádíš návštěvníky k pódiím, WC a stánkům a odpovídáš na dotazy. Používáš čtečku náramků a vysílačku, kterou se domlouváš s koordinátorem. Na pauzy se střídáš s ostatními hostesami.\n\nPo skončení programu pomůžeš s úklidem svého stanoviště a vrátíš vybavení. Pracuješ venku v areálu festivalu, hodně na nohou a v kontaktu s lidmi.',
    location: 'Brno — Výstaviště',
    distance: 3.4,
    when: 'So 10. – Ne 11. května',
    time: '12:00 – 24:00',
    rating: 4.9,
    reviews: 348,
    tags: ['Eventy', 'Víkend', 'Tým'],
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
    contract: 'DPČ',
    payout: 'Měsíčně',
    posted: 'před 4 dny',
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
    duties: 'Sraz v 9:30 v ateliéru na krátký briefing s fotografem — projdete plán focení a shot list.\n\nPřes den asistuješ u produktového focení: připravuješ a stavíš produkty do scény, hlídáš čistotu a detaily (otisky, prach), podáváš rekvizity a pomáháš se světly a odrazkami. Obsluhuješ jednoduché vybavení — stativy, softboxy, tethering k notebooku — a průběžně zálohuješ snímky. Mezi sety pomáháš s přestavbou scény.\n\nNa konci pomůžeš techniku sbalit a uklidit set. Pracuješ v ateliéru (uvnitř, v teple), střídáš stání a lehčí přenášení techniky.',
    location: 'Slavkov u Brna',
    distance: 22,
    when: 'So 17. května',
    time: '10:00 – 18:00',
    rating: 5.0,
    reviews: 42,
    tags: ['Foto', 'Víkend', 'Kreativní'],
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
    duties: 'Sraz ve 13:45 na místě u promo týmu, kde převezmeš tričko a vzorky.\n\nPřes odpoledne oslovuješ kolemjdoucí v centru, představuješ produkt, rozdáváš vzorky a letáky a sbíráš krátkou zpětnou vazbu do tabletu. Používáš promo stánek, tablet a QR kódy pro registrace. Hlídáš zásobu vzorků a doplňuješ ji ze zázemí. Na pauzy se střídáš s parťákem.\n\nNa konci spočítáš rozdané vzorky, sbalíš stánek a předáš vybavení. Pracuješ venku v centru města, celou dobu na nohou a v kontaktu s lidmi.',
    location: 'Brno — Galerie Vaňkovka',
    distance: 0.8,
    when: 'Čt 15. května',
    time: '14:00 – 20:00',
    rating: 4.3,
    reviews: 56,
    tags: ['Promo', 'Centrum', 'Bonus'],
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
  <iconify-icon icon={`solar:${name}`} width={size} height={size} style={{ color, display: 'inline-flex', verticalAlign: 'middle' }}></iconify-icon>
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
                  <Icon name="star-bold" size={12} color={T.super} />
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

Object.assign(window, { JOBS, CHATS, THREAD, T, Icon, fmtKc, JobCard, Stamp });
