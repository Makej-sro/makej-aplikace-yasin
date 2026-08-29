// Makej Worker — Demo data profilu (jen pro náhled)
// ─────────────────────────────────────────────────────────────────
// Stejný princip jako demo inzeráty (_wDemoJobs ve worker-swipe): dokud
// je účet prázdný, naplní se ukázkovými daty, ať je vidět, jak profil
// vypadá „naostro" — graf výdělků, statistiky, recenze, úroveň, fotka.
// Na reálném účtu s vlastními brigádami/recenzemi se demo NEPOUŽIJE.
//
// PŘED OSTRÝM PROVOZEM: přepnout W_DEMO_ON na false (nebo soubor smazat
// a odebrat <script> z index.html). Viz checklist „před ostrým provozem".

const W_DEMO_ON = true;   // ← před spuštěním na false

// Ukázkové odpracované brigády (posledních ~6 měsíců). Kompaktní zápis se
// níž rozbalí do plného tvaru W_HISTORY. Časy s pomlčkou „–" kvůli výpočtu hodin.
const _W_DEMO_BRIGADY = [
  { t: 'Barista',              f: 'Kavárna Pobřeží',      m: 'Praha 7',   p: 190, u: 'Kč/h',    od: '08:00', do: '14:00', d: '2026-08-22' },
  { t: 'Výpomoc na baru',      f: 'Café Lóla',            m: 'Praha 1',   p: 210, u: 'Kč/h',    od: '17:00', do: '23:00', d: '2026-08-15' },
  { t: 'Skladník — expedice',  f: 'Rohlík.cz',            m: 'Praha 9',   p: 175, u: 'Kč/h',    od: '06:00', do: '14:00', d: '2026-08-08' },
  { t: 'Hosteska na akci',     f: 'EventPro Agency',      m: 'Praha 5',   p: 1600, u: 'Kč/směna', od: '10:00', do: '18:00', d: '2026-08-02' },
  { t: 'Prodavač',             f: 'Sportisimo',           m: 'Praha 4',   p: 165, u: 'Kč/h',    od: '09:00', do: '15:00', d: '2026-07-26' },
  { t: 'Roznos letáků',        f: 'DIRECT marketing',     m: 'Praha',     p: 150, u: 'Kč/h',    od: '13:00', do: '18:00', d: '2026-07-18' },
  { t: 'Pomocná síla v kuchyni', f: 'Bistro Náplavka',    m: 'Praha 2',   p: 180, u: 'Kč/h',    od: '11:00', do: '17:00', d: '2026-07-11' },
  { t: 'Číšník',               f: 'Restaurace U Lva',     m: 'Praha 6',   p: 200, u: 'Kč/h',    od: '16:00', do: '23:00', d: '2026-07-04' },
  { t: 'Skladník',             f: 'Alza.cz',              m: 'Praha 9',   p: 185, u: 'Kč/h',    od: '07:00', do: '15:00', d: '2026-06-20' },
  { t: 'Promotér',             f: 'Red Bull',             m: 'Praha 1',   p: 260, u: 'Kč/h',    od: '12:00', do: '18:00', d: '2026-06-13' },
  { t: 'Výpomoc na festivalu', f: 'United Islands',       m: 'Praha 8',   p: 1500, u: 'Kč/směna', od: '14:00', do: '22:00', d: '2026-05-24' },
];

// Ukázkové recenze od firem (o brigádníkovi)
const _W_DEMO_RECENZE = [
  { f: 'Kavárna Pobřeží',   r: 5, v: true,  t: 'Super parťák do baru! Rychlý, milý na zákazníky a vždycky dorazil včas. Kdykoliv znovu.',        j: 'Barista',           w: '23. 8. 2026' },
  { f: 'Rohlík.cz',         r: 5, v: true,  t: 'Spolehlivý, výkonný a bez řečí. Ve skladu velká pomoc, doporučuju.',                              j: 'Skladník — expedice', w: '9. 8. 2026' },
  { f: 'EventPro Agency',   r: 4, v: false, t: 'Příjemné vystupování, dobře zvládl komunikaci s hosty. Malinko pozdější příchod, jinak paráda.', j: 'Hosteska na akci',  w: '3. 8. 2026' },
  { f: 'Restaurace U Lva',  r: 5, v: true,  t: 'Šikovný číšník, zvládl i nápor o víkendu s úsměvem. Rádi ho uvidíme zas.',                       j: 'Číšník',            w: '5. 7. 2026' },
];

// Iniciály z názvu firmy pro avatar recenze/brigády
function _wDemoInic(s) {
  return (s || '').split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '??';
}

let _W_DEMO_SEEDED = false;

// Naplní prázdný účet demo daty. Volá se na konci fetchWorkerData.
// Idempotentní — podruhé už nic nepřidá.
function wSeedDemoProfil() {
  if (!W_DEMO_ON || _W_DEMO_SEEDED) return;
  // Jen opravdu prázdný účet — kdo má vlastní brigády/recenze, demo nedostane.
  if (W_HISTORY.length > 0 || W_REVIEWS.length > 0) return;
  _W_DEMO_SEEDED = true;

  const barva = (typeof W_AVATAR_BG !== 'undefined') ? W_AVATAR_BG : '#6F80FF';

  // ── Brigády → W_HISTORY (vše „completed", ať se počítají do výdělku i úrovně) ──
  _W_DEMO_BRIGADY.forEach((b, i) => {
    const job = {
      id: 'demo-h-' + i,
      title: b.t, company: b.f,
      pay: b.p, pay_unit: b.u,
      time_start: b.od, time_end: b.do,
      date: b.d, event_date: b.d,
      location: b.m,
      description: '',
      employer: { company_name: b.f, rating: 4.9, verified: true },
    };
    const card = jobToCard(job);
    card.when = _wFmtDateY(b.d);
    W_HISTORY.push({
      id: 'demo-h-' + i, match_id: 'demo-h-' + i, job_id: 'demo-j-' + i,
      employerId: null,
      jobTitle: b.t, company: b.f, avatar: _wDemoInic(b.f), color: barva,
      dateText: _wFmtDateY(b.d), eventDate: b.d,
      timeText: b.od + ' – ' + b.do,
      location: b.m, pay: b.p, payUnit: b.u,
      status: 'confirmed', phase: 'completed',
      passed: true, reviewed: true, needsReview: false,
      createdAt: b.d, _demo: true, card,
    });
  });

  // ── Recenze → W_REVIEWS ──
  _W_DEMO_RECENZE.forEach((c, i) => {
    W_REVIEWS.push({
      id: 'demo-r-' + i, reviewerId: null,
      author: c.f, avatar: _wDemoInic(c.f), color: barva,
      rating: c.r, verified: c.v, text: c.t,
      jobTitle: c.j, when: c.w, _demo: true,
    });
  });

  // ── Demo konverzace → W_THREADS (ať jsou Zprávy k vidění i bez reálných matchů) ──
  // Ukázka celého chatu: seskupování zpráv, rozdělovníky dní, karta směny,
  // pozvánka na pohovor, fotka i peer-to-peer „Lidé" chat. Jen prázdný účet.
  if (typeof W_THREADS !== 'undefined' && W_THREADS.length === 0) {
    const den = 86400000, hod = 3600000, min = 60000, now = Date.now();
    const fT = ts => (typeof _wFmtTime === 'function' ? _wFmtTime(ts) : '');
    let _n = 0;
    const M   = (from, extra, ts) => Object.assign({ from, ts: new Date(ts).toISOString(), t: fT(new Date(ts).toISOString()), id: 'dm-' + (++_n) }, extra);
    const txt = (from, text, ts) => M(from, { text }, ts);
    const vlakna = [];

    // 1) Kavárna Pobřeží — barista: seskupení do balíků, karta směny, včera + dnes
    vlakna.push({ name: 'Kavárna Pobřeží', role: 'Barista', rating: 4.9, verified: true, unread: 0, msgs: [
      txt('them', 'Ahoj! 👋 Koukám, žes projevil zájem o baristu.', now - den - 10 * hod),
      txt('them', 'Umíš dělat latte art?', now - den - 10 * hod + 8000),
      txt('me',   'Ahoj! Jasně, latte art i espresso zvládám 🙂', now - den - 10 * hod + 22 * min),
      txt('me',   'Kdy byste mě potřebovali?', now - den - 10 * hod + 22 * min + 9000),
      M('them', { kind: 'shift', shift: { role: 'Barista', date: 'So 30. 8.', time: '8:00–14:00', pay: 1140, location: 'Praha 7 · Pobřeží 12' } }, now - 4 * hod),
      txt('them', 'Potvrď kdyžtak níž a jsme domluvení 🙌', now - 4 * hod + 40000),
      txt('me',   'Super, beru! Dorazím včas.', now - 3 * hod),
    ] });

    // 2) Rohlík.cz — skladník: fotka provozu + nepřečtené
    vlakna.push({ name: 'Rohlík.cz', role: 'Skladník — expedice', rating: 4.8, verified: true, unread: 2, online: true, msgs: [
      txt('them', 'Dobrý den, sháníme skladníka na expedici 📦', now - 90 * min),
      M('them', { kind: 'file', file: { typ: 'image', nahled: 'demo-lide/w3.jpg', nazev: 'sklad.jpg' } }, now - 90 * min + 40000),
      txt('them', 'Takhle to u nás vypadá. Zvládl bys ranní od 6:00?', now - 90 * min + 50000),
    ] });

    // 3) EventPro Agency — hosteska: pozvánka na pohovor (předevčírem)
    vlakna.push({ name: 'EventPro Agency', role: 'Hosteska na akci', rating: 4.7, verified: false, unread: 0, msgs: [
      txt('them', 'Ahoj! Zaujal nás tvůj profil na hostesku. 🙌', now - 2 * den - 3 * hod),
      M('them', { kind: 'interview', interview: { date: 'Čt 28. 8.', time: '15:00', location: 'Praha 5 · kancelář', note: 'Krátký pohovor, cca 20 minut.' } }, now - 2 * den - 3 * hod + 30000),
      txt('me', 'Děkuju! Na pohovor dorazím.', now - 2 * den - 3 * hod + 25 * min),
    ] });

    // 4) Lidé chat — Tereza (peer-to-peer, kind='people')
    vlakna.push({ name: 'Tereza Málková', role: 'Výpomoc na stěhování', kind: 'people', rating: 5.0, verified: true, unread: 1, msgs: [
      txt('them', 'Ahoj! Viděla jsem tvůj profil, sháním výpomoc na stěhování 📦', now - 55 * min),
      txt('me',   'Ahoj Terezo! Jasně, kdy to bude?', now - 50 * min),
      txt('them', 'Tuhle sobotu dopoledne, zvládneš?', now - 49 * min),
    ] });

    vlakna.forEach((v, i) => {
      const last = v.msgs[v.msgs.length - 1];
      const preview = last.kind === 'shift' ? 'Nabídka směny'
        : last.kind === 'interview' ? 'Pozvánka na pohovor'
        : last.kind === 'file' ? (last.file.typ === 'image' ? 'Fotka' : last.file.nazev)
        : last.text;
      W_THREADS.push({
        id: 'demo-t-' + i, match_id: 'demo-t-' + i, kind: v.kind || 'job',
        employerId: null, confirmed: false,
        name: v.name, avatar: _wDemoInic(v.name), color: barva, logoUrl: null,
        role: v.role || '', rating: v.rating || 0, verified: !!v.verified,
        last: preview, time: last.t, unread: v.unread || 0, online: !!v.online,
        msgs: v.msgs, _demo: true,
      });
    });
  }

  // ── Podklady úrovně (stupeň důvěry) — dají „Ověřený" ──
  W_TRUST.dokoncene = W_HISTORY.length;
  W_TRUST.zrusene = 0;
  W_TRUST.spolehlivost = 100;

  // ── Profil: doplní jen prázdná pole, reálné údaje nepřepíše ──
  if (!W_PROFILE.avatar_url) W_PROFILE.avatar_url = 'demo-avatar.svg';
  if (!W_PROFILE.rating)     W_PROFILE.rating = 4.9;
  if (!W_PROFILE.name || W_PROFILE.name === 'Brigádník') W_PROFILE.name = 'Yasin Bílek';
  if (!W_PROFILE.city)  W_PROFILE.city = 'Praha';
  if (!W_PROFILE.kraj)  W_PROFILE.kraj = 'praha';
  if (!W_PROFILE.bio)   W_PROFILE.bio = 'Student, spolehlivý a flexibilní. Mám zkušenosti z gastra i ze skladu, rychle se učím a nebojím se práce. Nejradši beru brigády po Praze, klidně i o víkendu.';
  if (!W_PROFILE.education) W_PROFILE.education = 'Středoškolské s maturitou — Ekonomie a administrativa';
  if (!Array.isArray(W_PROFILE.skills) || W_PROFILE.skills.length === 0) {
    W_PROFILE.skills = ['Pokladna', 'Barista / káva', 'Angličtina B2', 'Řidičák sk. B', 'Práce v týmu', 'Skladové systémy'];
  }
}

if (typeof window !== 'undefined') {
  Object.assign(window, { W_DEMO_ON, wSeedDemoProfil });
}
