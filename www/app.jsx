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
    pay: 180,
    payUnit: 'Kč/h',
    total: 1440,
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
  },
  {
    id: 'j2',
    title: 'Hosteska na hudební festival',
    company: 'Pop Messe',
    logo: 'PM',
    logoColor: '#8AB4FF',
    pay: 220,
    payUnit: 'Kč/h',
    total: 2640,
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
  },
  {
    id: 'j3',
    title: 'Skladník na rampě — Po-Pá',
    company: 'Rohlík.cz',
    logo: 'R',
    logoColor: '#5BD68A',
    pay: 195,
    payUnit: 'Kč/h',
    total: 1560,
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
  },
  {
    id: 'j4',
    title: 'Foto asistent na svatbu',
    company: 'Studio Korunka',
    logo: 'SK',
    logoColor: '#E0B0FF',
    pay: 350,
    payUnit: 'Kč/h',
    total: 2800,
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
  },
  {
    id: 'j5',
    title: 'Promotér energetického nápoje',
    company: 'Tiger Energy',
    logo: 'T',
    logoColor: '#FF6B35',
    pay: 210,
    payUnit: 'Kč/h',
    total: 1260,
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
