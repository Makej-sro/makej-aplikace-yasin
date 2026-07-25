// Makej Worker — Supabase data layer
// Must load before worker-swipe/messages/profile/main

const useStateW = React.useState;
const useEffectW = React.useEffect;
const useRefW    = React.useRef;

// ── Globals (mutated in-place, React reads via tick) ───────────
const W_PROFILE  = {};
const W_JOBS     = [];   // active jobs not yet swiped
const W_THREADS  = [];   // one per accepted match
const W_HISTORY  = [];   // all matches (pending/upcoming/completed) for "Moje brigády"
const W_REVIEWS  = [];   // recenze, které dostal brigádník (o něm)

// ── Nepřečtené konverzace ──────────────────────────────────────
// Zdroj pravdy je tabulka `notifications` na serveru, ne značka v telefonu.
// Ke každé příchozí zprávě zakládá řádek trigger (od Sama) a nese `match_id`
// i `read`. Nepřečtené vlákno = kolik jeho oznámení má read=false. Výhody
// proti dřívější značce v localStorage: přežije to refresh i jiný telefon
// (mobilní Safari úložiště webu občas vyhodí) a staré testovací zprávy
// z doby před triggerem se nepočítají, protože k nim žádný řádek není.
// `review` sem nepatří — to není zpráva ve vlákně, ale výzva k hodnocení.
const W_UNREAD = {};   // match_id → počet nepřečtených oznámení

// Naplní W_UNREAD z nepřečtených oznámení. Volá se ve fetchWorkerData.
async function nactiNeprecteneW(userId) {
  Object.keys(W_UNREAD).forEach(k => delete W_UNREAD[k]);
  const { data, error } = await sb.from('notifications')
    .select('match_id, type').eq('user_id', userId).eq('read', false);
  if (error) { console.error('nactiNeprecteneW:', error); return; }
  (data || []).forEach(r => {
    if (!r.match_id || r.type === 'review') return;
    W_UNREAD[r.match_id] = (W_UNREAD[r.match_id] || 0) + 1;
  });
}

// Otevření vlákna = přečteno. Označí jeho oznámení na serveru za přečtená,
// takže tučné zmizí natrvalo, ne jen do refreshe. Vrací seznam id, kterých
// se to týkalo — zvoneček podle nich sladí svůj stav bez dalšího dotazu.
async function markThreadReadW(userId, matchId) {
  if (!userId || !matchId) return [];
  W_UNREAD[matchId] = 0;
  const t = W_THREADS.find(x => x.id === matchId);
  if (t) t.unread = 0;
  const { data, error } = await sb.from('notifications')
    .update({ read: true })
    .eq('user_id', userId).eq('match_id', matchId).eq('read', false)
    .select('id');
  if (error) { console.error('markThreadReadW:', error); return []; }
  return (data || []).map(r => r.id);
}

// ── Přílohy v chatu ────────────────────────────────────────────
// Bucket `chat-prilohy` je neveřejný, takže se obrázek nenačte prostou adresou.
// Ke každému se musí vyžádat podepsaný odkaz s omezenou platností — proto ta
// mezipaměť níž, ať se pro jednu fotku nepodepisuje při každém překreslení.
const W_BUCKET_PRILOHY   = 'chat-prilohy';
const W_PRILOHA_MAX      = 10 * 1024 * 1024;   // 10 MB (až po zmenšení)
const W_PRILOHA_PLATNOST = 3600;               // sekund

const _W_PODPISY = new Map();   // cesta → { url, doKdy }

async function wOdkazPrilohy(cesta) {
  if (!cesta) return null;
  const ted = Date.now();
  const drzeny = _W_PODPISY.get(cesta);
  // Minutová rezerva, ať odkaz nevyprší zrovna během načítání
  if (drzeny && drzeny.doKdy > ted + 60000) return drzeny.url;
  const { data, error } = await sb.storage
    .from(W_BUCKET_PRILOHY).createSignedUrl(cesta, W_PRILOHA_PLATNOST);
  if (error || !data) { console.error('wOdkazPrilohy:', error); return null; }
  _W_PODPISY.set(cesta, { url: data.signedUrl, doKdy: ted + W_PRILOHA_PLATNOST * 1000 });
  return data.signedUrl;
}

// Fotka z telefonu má běžně 4–5 MB. Než poputuje na server, zmenší se —
// šetří to data brigádníkovi i místo v úložišti. Malé obrázky nechá být,
// aby se zbytečně nezhoršila kvalita překódováním.
function wZmensiObrazek(file, maxHrana) {
  const max = maxHrana || 1600;
  return new Promise(resolve => {
    if (!/^image\//.test(file.type) || file.type === 'image/gif') { resolve(null); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const pomer = Math.min(1, max / Math.max(img.width, img.height));
      if (pomer === 1 && file.size < 900 * 1024) { resolve(null); return; }
      const c = document.createElement('canvas');
      c.width  = Math.round(img.width  * pomer);
      c.height = Math.round(img.height * pomer);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => resolve(b), 'image/jpeg', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

// Diakritika a mezery v názvu dělají v cestě neplechu
function _wBezpecnyNazev(n) {
  return (n || 'soubor')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/\.[^.]*$/, '')
    .slice(-50) || 'soubor';
}

// Nejčastější důvod selhání bude chybějící oprávnění v úložišti.
// Ať je to poznat z hlášky, a ne až z konzole.
function _wChybaUlozeni(e) {
  const s = ((e && (e.message || e.error)) || '').toLowerCase();
  if (s.includes('row-level security') || s.includes('unauthorized') || s.includes('policy') || s.includes('violates'))
    return 'Úložiště nahrání odmítlo — appka nemá oprávnění zapisovat.';
  if (s.includes('bucket not found')) return 'Úložiště na přílohy nebylo nalezeno.';
  if (s.includes('exceeded') || s.includes('payload') || s.includes('too large')) return 'Soubor je moc velký.';
  return 'Nahrání se nepovedlo. Zkus to prosím znovu.';
}

// Nahraje přílohu do úložiště a teprve pak založí zprávu. Vrací { ok, error, zprava }.
async function wPosliPrilohu(matchId, userId, file) {
  if (!matchId || !userId || !file) return { ok: false, error: 'Chybí konverzace nebo soubor.' };
  const jeObrazek = /^image\//.test(file.type);
  const zmenseny  = jeObrazek ? await wZmensiObrazek(file) : null;
  const telo      = zmenseny || file;
  if (telo.size > W_PRILOHA_MAX) return { ok: false, error: 'Soubor je moc velký (max 10 MB).' };

  const pripona = zmenseny ? 'jpg' : ((file.name || '').split('.').pop() || 'dat').toLowerCase();
  // Složka podle konverzace — na ni se dá navěsit pravidlo „vidí jen ti dva“
  const cesta = `${matchId}/${userId}-${Date.now()}-${_wBezpecnyNazev(file.name)}.${pripona}`;

  const { error: chybaUlozeni } = await sb.storage.from(W_BUCKET_PRILOHY).upload(cesta, telo, {
    contentType: zmenseny ? 'image/jpeg' : (file.type || 'application/octet-stream'),
    upsert: false,
  });
  if (chybaUlozeni) {
    console.error('wPosliPrilohu (úložiště):', chybaUlozeni);
    return { ok: false, error: _wChybaUlozeni(chybaUlozeni) };
  }

  const { data, error } = await sb.from('messages').insert({
    match_id: matchId, sender_id: userId, text: '',
    file_url: cesta,
    file_type: jeObrazek ? 'image' : 'file',
    file_name: file.name || 'příloha',
    file_size: telo.size,
  }).select().single();
  if (error) {
    console.error('wPosliPrilohu (messages):', error);
    // Zpráva nevznikla → ať v úložišti nezůstane soubor, ke kterému nikdo nedojde
    try { await sb.storage.from(W_BUCKET_PRILOHY).remove([cesta]); } catch (e) {}
    return { ok: false, error: 'Zprávu s přílohou se nepodařilo uložit.' };
  }
  return { ok: true, zprava: data };
}

// Přípona podle formátu nahrávky. Safari na iPhonu umí jen mp4/aac,
// Chrome a Android webm/opus — ať soubor v úložišti dostane správný název.
function _wAudioPripona(mime) {
  const m = (mime || '').toLowerCase();
  if (m.includes('mp4') || m.includes('aac') || m.includes('m4a')) return 'm4a';
  if (m.includes('ogg'))  return 'ogg';
  if (m.includes('mpeg') || m.includes('mp3')) return 'mp3';
  return 'webm';
}

// Nahraje hlasovku do úložiště a teprve pak založí zprávu typu audio.
// `delka` je v sekundách — uloží se do sloupce duration, aby šla délka
// ukázat ještě před stažením zvuku. Vrací { ok, error, zprava }.
async function wPosliHlasovku(matchId, userId, blob, delka) {
  if (!matchId || !userId || !blob || !blob.size)
    return { ok: false, error: 'Chybí konverzace nebo nahrávka.' };
  if (blob.size > W_PRILOHA_MAX) return { ok: false, error: 'Nahrávka je moc dlouhá.' };

  const pripona = _wAudioPripona(blob.type);
  const cesta = `${matchId}/${userId}-${Date.now()}-hlasovka.${pripona}`;

  const { error: chybaUlozeni } = await sb.storage.from(W_BUCKET_PRILOHY).upload(cesta, blob, {
    contentType: blob.type || 'audio/webm', upsert: false,
  });
  if (chybaUlozeni) {
    console.error('wPosliHlasovku (úložiště):', chybaUlozeni);
    return { ok: false, error: _wChybaUlozeni(chybaUlozeni) };
  }

  const { data, error } = await sb.from('messages').insert({
    match_id: matchId, sender_id: userId, text: '',
    file_url: cesta, file_type: 'audio', file_name: 'Hlasová zpráva',
    file_size: blob.size, duration: Math.max(1, Math.round(delka || 0)),
  }).select().single();
  if (error) {
    console.error('wPosliHlasovku (messages):', error);
    try { await sb.storage.from(W_BUCKET_PRILOHY).remove([cesta]); } catch (e) {}
    return { ok: false, error: 'Hlasovku se nepodařilo uložit.' };
  }
  return { ok: true, zprava: data };
}

// Řádek zprávy → tvar přílohy pro zobrazení
function _wPrilohaZRadku(msg) {
  return {
    cesta:    msg.file_url,
    typ:      msg.file_type || 'file',
    nazev:    msg.file_name || 'Příloha',
    velikost: msg.file_size || 0,
    delka:    msg.duration  || 0,
  };
}

// Co se ukáže v seznamu konverzací místo textu
function wNahledPrilohy(msg) {
  if (msg.file_type === 'image') return 'Fotka';
  if (msg.file_type === 'audio') return 'Hlasová zpráva';
  return msg.file_name || 'Příloha';
}

function wVelikostPrilohy(b) {
  if (!b) return '';
  return b < 1024 * 1024 ? Math.max(1, Math.round(b / 1024)) + ' kB'
                         : (b / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
}


// ── Stupně důvěry ──────────────────────────────────────────────
// Nahradilo XP levely s vymyšlenými tituly. Stupeň se počítá jen z toho,
// co jde ověřit v datech: kolik brigád má člověk odpracovaných, kolik
// potvrzených směn zrušil a jak ho hodnotí firmy. Je to signál pro
// zaměstnavatele, ne herní skóre — proto žádné XP a jen čtyři stupně.
const W_TIERS = [
  { key: 'novy',       nazev: 'Nový',       barva: '#6b7192', brigady: 0,  spolehlivost: 0,  hodnoceni: 0   },
  { key: 'overeny',    nazev: 'Ověřený',    barva: '#0020F6', brigady: 3,  spolehlivost: 90, hodnoceni: 0   },
  { key: 'spolehlivy', nazev: 'Spolehlivý', barva: '#16a34a', brigady: 10, spolehlivost: 95, hodnoceni: 4.5 },
  { key: 'top',        nazev: 'Top',        barva: '#F5A623', brigady: 30, spolehlivost: 98, hodnoceni: 4.8 },
];

// Statistiky pro stupeň — plní se ve fetchWorkerData z tabulky matches
const W_TRUST = { dokoncene: 0, zrusene: 0, spolehlivost: null };

function _wSplnenoPro(t, s) {
  return s.dokoncene >= t.brigady
    && (t.spolehlivost === 0 || (s.spolehlivost === null ? true : s.spolehlivost >= t.spolehlivost))
    && (t.hodnoceni === 0 || s.hodnoceni >= t.hodnoceni);
}

// Vrátí { tier, index, dalsi, splneno, pozadavky, jeMax }
function makejTrust(stats) {
  const s = {
    dokoncene:    Math.max(0, Number(stats && stats.dokoncene) || 0),
    zrusene:      Math.max(0, Number(stats && stats.zrusene) || 0),
    hodnoceni:    Math.max(0, Number(stats && stats.hodnoceni) || 0),
    spolehlivost: (stats && stats.spolehlivost != null) ? Number(stats.spolehlivost) : null,
  };

  // Nejvyšší stupeň, na který dosáhne (stupně se plní odspodu)
  let index = 0;
  for (let i = 0; i < W_TIERS.length; i++) if (_wSplnenoPro(W_TIERS[i], s)) index = i;

  const jeMax = index >= W_TIERS.length - 1;
  const dalsi = jeMax ? null : W_TIERS[index + 1];

  // Co konkrétně chybí do dalšího stupně — ať uživatel nehádá
  const pozadavky = dalsi ? [
    {
      klic: 'brigady', popis: 'Dokončené brigády',
      ted: s.dokoncene, cil: dalsi.brigady,
      splneno: s.dokoncene >= dalsi.brigady,
      text: s.dokoncene + ' z ' + dalsi.brigady,
    },
    dalsi.spolehlivost > 0 && {
      klic: 'spolehlivost', popis: 'Spolehlivost',
      ted: s.spolehlivost, cil: dalsi.spolehlivost,
      splneno: s.spolehlivost === null || s.spolehlivost >= dalsi.spolehlivost,
      text: (s.spolehlivost === null ? '—' : s.spolehlivost + ' %') + ' z ' + dalsi.spolehlivost + ' %',
    },
    dalsi.hodnoceni > 0 && {
      klic: 'hodnoceni', popis: 'Hodnocení od firem',
      ted: s.hodnoceni, cil: dalsi.hodnoceni,
      splneno: s.hodnoceni >= dalsi.hodnoceni,
      text: (s.hodnoceni > 0 ? s.hodnoceni.toFixed(1).replace('.', ',') : 'zatím žádné')
            + ' z ' + dalsi.hodnoceni.toFixed(1).replace('.', ','),
    },
  ].filter(Boolean) : [];

  // Postup do dalšího stupně = průměr splnění jednotlivých požadavků
  const progress = dalsi && pozadavky.length
    ? pozadavky.reduce((a, p) => a + (p.cil ? Math.min(1, (p.ted || 0) / p.cil) : 1), 0) / pozadavky.length
    : 1;

  return {
    tier: W_TIERS[index], index, dalsi, jeMax, pozadavky, progress,
    stupnu: W_TIERS.length, stats: s,
  };
}

// ── Výdělky ────────────────────────────────────────────────────
// Kolik brigádník dostal za jednu odpracovanou brigádu.
// Hodinovka × délka směny, u paušálu (Kč/směna, Kč/den) rovnou částka.
function _wVydelek(h) {
  const sazba = Number(h && h.pay) || 0;
  if (!sazba) return 0;
  const naHodinu = /(\/\s*hod|kč\/h|\/h)/i.test(h.payUnit || 'Kč/h');
  if (!naHodinu) return Math.round(sazba);
  const [od, doo] = String(h.timeText || '').split('–').map(s => s.trim());
  const hod = _wShiftHours(od, doo);
  return Math.round(sazba * (hod || 8));   // bez časů počítáme běžnou 8h směnu
}

// Statistiky výdělků ze skutečně odpracovaných brigád (W_HISTORY, phase 'completed').
// Vše se počítá z jednotlivých brigád, aby celkový součet vždy seděl s rozpisem.
function makejVydelky(history) {
  const hotove = (Array.isArray(history) ? history : [])
    .filter(h => h.phase === 'completed')
    .map(h => ({ ...h, castka: _wVydelek(h), hodin: (() => {
      const [od, doo] = String(h.timeText || '').split('–').map(s => s.trim());
      return _wShiftHours(od, doo) || 8;
    })() }))
    .sort((a, b) => (a.eventDate < b.eventDate ? 1 : -1));   // od nejnovější

  const celkem = hotove.reduce((a, h) => a + h.castka, 0);
  const hodin  = hotove.reduce((a, h) => a + h.hodin, 0);

  // Po měsících — posledních 6, včetně měsíců bez výdělku (jinak by graf lhal)
  const dnes = new Date();
  const mesice = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(dnes.getFullYear(), dnes.getMonth() - i, 1);
    const klic = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    mesice.push({ klic, rok: d.getFullYear(), mesic: d.getMonth(), castka: 0, pocet: 0 });
  }
  const podleKlice = {};
  mesice.forEach(m => { podleKlice[m.klic] = m; });
  hotove.forEach(h => {
    const m = podleKlice[String(h.eventDate || '').slice(0, 7)];
    if (m) { m.castka += h.castka; m.pocet += 1; }
  });

  // Podle firem — kde si vydělal nejvíc
  const firmy = {};
  hotove.forEach(h => {
    const f = firmy[h.company] || (firmy[h.company] = { company: h.company, castka: 0, pocet: 0 });
    f.castka += h.castka; f.pocet += 1;
  });
  const podleFirem = Object.values(firmy).sort((a, b) => b.castka - a.castka);

  return {
    hotove, celkem, hodin,
    pocet: hotove.length,
    naBrigadu: hotove.length ? Math.round(celkem / hotove.length) : 0,
    naHodinu:  hodin ? Math.round(celkem / hodin) : 0,
    mesice, podleFirem,
    tentoMesic: mesice[mesice.length - 1],          // poslední v řadě je běžící měsíc
    nejlepsiMesic: mesice.reduce((a, m) => (!a || m.castka > a.castka ? m : a), null),
  };
}

// Měsíční přehled mezi dvěma měsíci včetně ('RRRR-MM'). Prázdné měsíce
// zůstávají v řadě — bez nich by graf tvrdil, že se pracovalo nepřetržitě.
function makejMesice(hotove, odKlic, doKlic) {
  const [oy, om] = String(odKlic).split('-').map(Number);
  const [dy, dm] = String(doKlic).split('-').map(Number);
  if (!oy || !om || !dy || !dm) return [];
  const konec = dy * 12 + (dm - 1);
  const mesice = [];
  let y = oy, m = om - 1;
  while (y * 12 + m <= konec && mesice.length < 120) {
    mesice.push({ klic: y + '-' + String(m + 1).padStart(2, '0'), rok: y, mesic: m, castka: 0, pocet: 0 });
    m++; if (m > 11) { m = 0; y++; }
  }
  const podle = {};
  mesice.forEach(x => { podle[x.klic] = x; });
  (hotove || []).forEach(h => {
    const b = podle[String(h.eventDate || '').slice(0, 7)];
    if (b) { b.castka += h.castka; b.pocet += 1; }
  });
  return mesice;
}

// Posune měsíční klíč o N měsíců zpět: ('2026-07', 5) → '2026-02'
function _wMesicZpet(klic, n) {
  const [y, m] = String(klic).split('-').map(Number);
  const c = y * 12 + (m - 1) - n;
  return Math.floor(c / 12) + '-' + String((c % 12) + 1).padStart(2, '0');
}

// Je datum brigády už minulé? (event_date je ISO 'YYYY-MM-DD')
function _wJobPassed(eventDate) {
  if (!eventDate) return false;
  const d = new Date(eventDate + 'T23:59:59');
  if (isNaN(d)) return false;
  return d < new Date();  // celý den brigády už uplynul
}

// Formátuje ISO datum včetně roku: 'Pá 13. 12. 2025'
function _wFmtDateY(iso) {
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return '';
  const days = ['Ne','Po','Út','St','Čt','Pá','So'];
  return `${days[d.getDay()]} ${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
}

// Zjistí ISO datum brigády. Preferuje event_date; u starých dat bez roku
// (např. '13.12', 'So 5. 7.') odhadne rok podle vzniku matche.
function _wResolveEventDate(job, matchCreatedAt) {
  if (job.event_date) return job.event_date;
  const raw = (job.date || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const m = raw.match(/(\d{1,2})\s*\.\s*(\d{1,2})/);   // den.měsíc (i "So 5. 7.")
  if (!m) return null;
  const day = parseInt(m[1], 10), mon = parseInt(m[2], 10);
  if (!(day >= 1 && day <= 31 && mon >= 1 && mon <= 12)) return null;
  const anchor = matchCreatedAt ? new Date(matchCreatedAt) : new Date();
  const anchorYear = anchor.getFullYear();
  let best = null, bestDiff = Infinity;
  for (const y of [anchorYear - 1, anchorYear, anchorYear + 1]) {
    const d = new Date(y, mon - 1, day);
    const diff = Math.abs(d - anchor);
    if (diff < bestDiff) { bestDiff = diff; best = d; }
  }
  if (!best) return null;
  const mm = String(best.getMonth() + 1).padStart(2, '0');
  const dd = String(best.getDate()).padStart(2, '0');
  return `${best.getFullYear()}-${mm}-${dd}`;
}

// ── Helpers ────────────────────────────────────────────────────
function _wColor(str) {
  const cols = ['#F4A261','#8AB4FF','#5BD68A','#E0B0FF','#FF6B35','#FFD166','#6F80FF','#f43f5e'];
  let h = 0;
  for (let i = 0; i < (str || '').length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
  return cols[Math.abs(h) % cols.length];
}

// Jednotný podklad avatarů bez profilovky — značková modrá (jako navbar).
const W_AVATAR_BG = 'linear-gradient(150deg, #6F80FF, #6F80FF)';

function _wFmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const days = ['Ne','Po','Út','St','Čt','Pá','So'];
  const months = ['1.','2.','3.','4.','5.','6.','7.','8.','9.','10.','11.','12.'];
  return `${days[d.getDay()]} ${d.getDate()}. ${months[d.getMonth()]}`;
}

function _wFmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
}

// České skloňování podle počtu (1 / 2-4 / 5+)
function _wPlural(n, one, few, many) {
  const x = Math.abs(Number(n) || 0);
  if (x === 1) return one;
  if (x >= 2 && x <= 4) return few;
  return many;
}

// Počet hodin směny z časů 'HH:MM' – 'HH:MM' (fallback 8)
function _wShiftHours(start, end) {
  try {
    const p = s => { const [h, m] = String(s).split(':').map(Number); return h * 60 + (m || 0); };
    let diff = (p(end) - p(start)) / 60;
    if (diff < 0) diff += 24;           // přes půlnoc
    if (!(diff > 0 && diff <= 24)) return null;
    return Math.round(diff * 10) / 10;
  } catch (_) { return null; }
}

// Adapts a Supabase job row to the shape expected by JobCard (from app.jsx)
function jobToCard(job) {
  const emp    = job.employer || {};
  const name   = emp.company_name || emp.name || job.company || 'Firma';
  const logo   = name.split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '??';
  const accent = _wColor(job.id);
  const hours  = _wShiftHours(job.time_start, job.time_end);
  const perHour = /(\/\s*hod|kč\/h|\/h)/i.test(job.pay_unit || 'Kč/h');
  return {
    ...job,
    company:   name,
    logo,
    logoColor: accent,
    payUnit:   job.pay_unit || 'Kč/h',
    total:     job.pay * 8,
    shiftHours: hours,
    shiftTotal: (perHour && hours) ? Math.round(job.pay * hours) : null,
    when:      _wFmtDate(job.date),
    time:      [job.time_start, job.time_end].filter(Boolean).join(' – '),
    rating:    Number(emp.rating || 0),   // reálné hodnocení firmy (0 = zatím žádné)
    verified:  !!emp.verified,
    tags:      Array.isArray(job.tags) ? job.tags : [],
    accent,
    boosted:   !!(job.top_until && new Date(job.top_until) > new Date()),
    distance:  job.distance || null,
    desc:      job.description || '',
    requirements: Array.isArray(job.requirements) ? job.requirements : [],
    benefits:  Array.isArray(job.benefits) ? job.benefits : [],
    perks:     Array.isArray(job.requirements) ? job.requirements : [],
    positions: job.positions || 1,
    dressCode: job.dress_code || '',
    contactNote: job.contact_note || '',
    jobType:   job.job_type || 'brigada',
    tips:      !!job.tips,
    eventDate: job.event_date || null,
  };
}

// ── Main fetch ─────────────────────────────────────────────────
async function fetchWorkerData(workerId) {
  try {
    // Profile
    const { data: profile } = await sb.from('profiles').select('*').eq('id', workerId).single();
    Object.keys(W_PROFILE).forEach(k => delete W_PROFILE[k]);
    Object.assign(W_PROFILE, profile || {});

    // IDs to exclude (already swiped)
    const [rejRes, matchRes] = await Promise.all([
      sb.from('rejections').select('job_id').eq('worker_id', workerId),
      sb.from('matches').select('job_id').eq('worker_id', workerId),
    ]);
    const excludeIds = [
      ...(rejRes.data  || []).map(r => r.job_id),
      ...(matchRes.data || []).map(m => m.job_id),
    ];

    // Active jobs (s profilem firmy pro reálné hodnocení)
    let q = sb.from('jobs')
      .select('*, employer:profiles!jobs_employer_id_fkey(rating, name, company_name, verified)')
      .eq('status', 'active').order('created_at', { ascending: false });
    if (excludeIds.length > 0) q = q.not('id', 'in', `(${excludeIds.join(',')})`);
    const { data: jobs } = await q;
    const nowMs = Date.now();
    // skryj naplánované (publish_at v budoucnu); boostnuté (top_until v budoucnu) nahoru
    const visible = (jobs || [])
      .filter(j => !j.publish_at || new Date(j.publish_at).getTime() <= nowMs)
      .sort((a, b) => {
        const ab = a.top_until && new Date(a.top_until).getTime() > nowMs ? 1 : 0;
        const bb = b.top_until && new Date(b.top_until).getTime() > nowMs ? 1 : 0;
        return bb - ab;
      });
    W_JOBS.length = 0;
    visible.forEach(j => W_JOBS.push(j));

    // All matches → threads (accepted + pending that may have messages)
    const { data: matches } = await sb.from('matches')
      .select('*, job:jobs(*, employer:profiles!jobs_employer_id_fkey(*))')
      .eq('worker_id', workerId)
      .order('created_at', { ascending: false });

    const allMatches = matches || [];
    const matchIds   = allMatches.map(m => m.id);

    // Moje recenze (které jsem už napsal/a) — abych je podruhé nevyplňoval
    const { data: myReviews } = await sb.from('reviews')
      .select('match_id').eq('reviewer_id', workerId);
    const reviewedMatchIds = new Set((myReviews || []).map(r => r.match_id));

    // Recenze, které dostal brigádník (o něm) — pro profil
    const { data: aboutMe } = await sb.from('reviews')
      .select('*, reviewer:profiles!reviews_reviewer_id_fkey(name, company_name, verified), match:matches(job:jobs(title))')
      .eq('reviewed_id', workerId)
      .order('created_at', { ascending: false });
    W_REVIEWS.length = 0;
    (aboutMe || []).forEach(r => {
      const author = r.reviewer?.company_name || r.reviewer?.name || 'Zaměstnavatel';
      W_REVIEWS.push({
        id: r.id,
        reviewerId: r.reviewer_id,
        author,
        avatar: author.split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '??',
        color: W_AVATAR_BG,
        rating: Number(r.rating) || 0,
        verified: !!r.reviewer?.verified,
        text: r.text || '',
        jobTitle: r.match?.job?.title || '',
        when: r.created_at ? new Date(r.created_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' }) : '',
      });
    });

    let   messages  = [];

    if (matchIds.length > 0) {
      const { data: msgs } = await sb.from('messages')
        .select('*')
        .in('match_id', matchIds)
        .order('created_at', { ascending: false })
        .limit(400);
      messages = msgs || [];
    }

    // Nepřečtená vlákna ze serveru (musí být hotové před stavbou W_THREADS)
    await nactiNeprecteneW(workerId);

    // Only show threads that are accepted OR have at least one message
    const messageMatchIds = new Set(messages.map(m => m.match_id));
    const threadMatches = allMatches.filter(m => m.status === 'accepted' || messageMatchIds.has(m.id));

    const newThreads = threadMatches.map(match => {
      const job        = match.job || {};
      const employer   = job.employer || {};
      const company    = employer.company_name || employer.name || job.company || 'Zaměstnavatel';
      const logo       = company.split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '??';

      const threadMsgs = messages
        .filter(msg => msg.match_id === match.id)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .map(msg => {
          const isMe    = msg.sender_id === workerId;
          const from    = isMe ? 'me' : 'them';
          // `t` je čas pro oko, `ts` syrové razítko ze serveru — podle něj se pozná,
          // co je za značkou přečtení (hodiny telefonu se na to spolehnout nedají)
          if (msg.file_url) return { from, kind: 'file', file: _wPrilohaZRadku(msg), t: _wFmtTime(msg.created_at), ts: msg.created_at, id: msg.id };
          if (msg.type === 'shift_offer' && msg.metadata) return { from, kind: 'shift', shift: msg.metadata, t: _wFmtTime(msg.created_at), ts: msg.created_at, id: msg.id };
          if (msg.type === 'interview_offer' && msg.metadata) return { from, kind: 'interview', interview: msg.metadata, t: _wFmtTime(msg.created_at), ts: msg.created_at, id: msg.id };
          return { from, text: msg.text, t: _wFmtTime(msg.created_at), ts: msg.created_at, id: msg.id };
        });

      const lastMsg = threadMsgs[threadMsgs.length - 1];
      const lastPreview = lastMsg
        ? (lastMsg.kind === 'shift' ? 'Nabídka směny'
         : lastMsg.kind === 'interview' ? 'Pozvánka na pohovor'
         : lastMsg.kind === 'file' ? (lastMsg.file.typ === 'image' ? 'Fotka' : lastMsg.file.nazev)
         : lastMsg.text)
        : 'Nová shoda!';
      const lastTime = lastMsg
        ? _wFmtTime(messages.find(m => m.id === lastMsg.id)?.created_at || '')
        : _wFmtTime(match.created_at);

      return {
        id: match.id, match_id: match.id,
        employerId: job.employer_id || employer.id || null,
        confirmed: match.status === 'confirmed',   // směna už potvrzena
        name: company, avatar: logo,
        // Logo, které si firma nahrála v dashboardu. Když chybí, zůstanou iniciály.
        logoUrl: employer.logo_url || employer.avatar_url || null,
        color: W_AVATAR_BG,
        role: job.title || '',
        rating: Number(employer.rating || 0),
        verified: !!employer.verified,
        last: lastPreview, time: lastTime,
        // Nepřečtené = kolik oznámení k tomuto vláknu zůstalo na serveru nepřečtených
        unread: W_UNREAD[match.id] || 0, online: false,
        msgs: threadMsgs,
      };
    });

    W_THREADS.length = 0;
    newThreads.forEach(t => W_THREADS.push(t));

    // ── W_HISTORY (Moje brigády) ──────────────────────────────────
    // accepted = domlouváme se v chatu, confirmed = potvrzená směna
    const history = allMatches
      .filter(match => match.status === 'accepted' || match.status === 'confirmed')
      .map(match => {
        const job      = match.job || {};
        const employer = job.employer || {};
        const company  = employer.company_name || employer.name || job.company || 'Zaměstnavatel';
        const eventDate = _wResolveEventDate(job, match.created_at);
        const passed   = _wJobPassed(eventDate);
        let phase;
        if (match.status === 'accepted') phase = 'discuss';               // otevřený chat, ještě nepotvrzeno
        else                             phase = passed ? 'completed' : 'upcoming';  // confirmed
        const reviewed = reviewedMatchIds.has(match.id);
        const dateText = eventDate ? _wFmtDateY(eventDate) : (_wFmtDate(job.date) || job.date || '');
        const card = jobToCard(job);
        if (eventDate) card.when = _wFmtDateY(eventDate);   // detail ukáže rok
        return {
          id: match.id, match_id: match.id, job_id: match.job_id,
          employerId: job.employer_id || employer.id || null,
          jobTitle: job.title || 'Brigáda',
          company, avatar: company.split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '??',
          color: W_AVATAR_BG,
          dateText,
          eventDate,
          timeText: [job.time_start, job.time_end].filter(Boolean).join(' – '),
          location: job.location || '',
          pay: job.pay || 0, payUnit: job.pay_unit || 'Kč/h',
          status: match.status, phase,
          passed, reviewed,
          needsReview: phase === 'completed' && !reviewed,
          createdAt: match.created_at,
          card,   // plná data pro detail brigády
        };
      });

    W_HISTORY.length = 0;
    history.forEach(h => W_HISTORY.push(h));

    // ── Podklady pro stupeň důvěry ────────────────────────────────
    // Dokončená = potvrzená směna, jejíž den už uplynul.
    // Zrušená   = matches.status 'cancelled' (ruší se jen potvrzené směny).
    W_TRUST.dokoncene = history.filter(h => h.phase === 'completed').length;
    W_TRUST.zrusene   = allMatches.filter(m => m.status === 'cancelled').length;
    const zavazku = W_TRUST.dokoncene + W_TRUST.zrusene;
    W_TRUST.spolehlivost = zavazku === 0
      ? null                                                    // ještě není z čeho počítat
      : Math.round((W_TRUST.dokoncene / zavazku) * 100);

    return true;
  } catch (err) {
    console.error('[worker-supabase] fetchWorkerData error:', err);
    return false;
  }
}

async function createMatchW(workerId, jobId, isSuper) {
  const { data, error } = await sb.from('matches')
    .insert({ worker_id: workerId, job_id: jobId, status: 'pending', super: !!isSuper })
    .select().single();
  if (error && error.code !== '23505') console.error('createMatchW:', error);
  return data;
}

// Zaznamenat zhlédnutí inzerátu (1× na brigádníka/inzerát díky unikátnímu indexu)
const _wLoggedViews = new Set();
async function logJobViewW(jobId) {
  if (!jobId || _wLoggedViews.has(jobId)) return;
  _wLoggedViews.add(jobId);
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) { _wLoggedViews.delete(jobId); return; }
  const { error } = await sb.from('job_views').upsert(
    { job_id: jobId, viewer_id: session.user.id },
    { onConflict: 'job_id,viewer_id', ignoreDuplicates: true }
  );
  if (error) { console.error('logJobViewW:', error); _wLoggedViews.delete(jobId); }
}

// Napsat recenzi (brigádník → zaměstnavatel po dokončené brigádě)
async function submitReviewW(matchId, reviewedId, rating, text) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) return false;
  const { error } = await sb.from('reviews').insert({
    reviewer_id: session.user.id,
    reviewed_id: reviewedId,
    match_id: matchId,
    rating: Math.max(1, Math.min(5, parseInt(rating) || 0)),
    text: (text || '').trim(),
  });
  if (error) { console.error('submitReviewW:', error); return false; }
  // označ lokálně jako ohodnocené
  const h = W_HISTORY.find(x => x.match_id === matchId);
  if (h) { h.reviewed = true; h.needsReview = false; }
  return true;
}

// Načíst odpovědi ke skupině recenzí → { review_id: [reply, …] }
async function fetchReviewRepliesW(reviewIds) {
  if (!reviewIds || reviewIds.length === 0) return {};
  const { data, error } = await sb.from('review_replies')
    .select('*')
    .in('review_id', reviewIds)
    .order('created_at', { ascending: true });
  if (error) { console.error('fetchReviewRepliesW:', error); return {}; }
  const map = {};
  (data || []).forEach(r => { (map[r.review_id] = map[r.review_id] || []).push(r); });
  return map;
}

// Odpovědět na recenzi (brigádník ↔ zaměstnavatel)
async function postReviewReplyW(reviewId, text) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) return null;
  const clean = (text || '').trim();
  if (!clean) return null;
  const { data, error } = await sb.from('review_replies')
    .insert({ review_id: reviewId, author_id: session.user.id, text: clean })
    .select().single();
  if (error) { console.error('postReviewReplyW:', error); return null; }
  return data;
}

// Brigádník potvrdil směnu → match 'confirmed' (trigger naplní job)
async function confirmShiftW(matchId) {
  const { error } = await sb.from('matches').update({ status: 'confirmed' }).eq('id', matchId);
  if (error) { console.error('confirmShiftW:', error); return false; }
  return true;
}

// Brigádník zruší potvrzenou směnu → match 'cancelled' (trigger uvolní inzerát zpět na 'active')
async function cancelShiftW(matchId) {
  const { error } = await sb.from('matches').update({ status: 'cancelled' }).eq('id', matchId);
  if (error) { console.error('cancelShiftW:', error); return false; }
  return true;
}

// ── Upozornění (tabulka notifications) ──────────────────────────
// Sloupce: id, user_id, type, title, body, read, match_id, created_at
// `kind` v appce (chat/review) v tabulce není — odvozuje se z typu.
function _wNotifKind(type) { return type === 'review' ? 'review' : 'chat'; }

const _W_NOTIF_TYPES = ['message', 'match', 'shift', 'review', 'success', 'info'];

// Typ se ukládá do sloupce `type`. Dokud check constraint povoloval jen 'message',
// běžela obezlička, která skutečný typ schovávala na začátek `body` jako "typ::text".
// Constraint je rozšířený, takže se tak už nezapisuje — rozbalování zůstává jen
// kvůli řádkům, které tímhle způsobem vznikly. Časem se dá smazat.
function _wUnpackLegacy(body) {
  const s = body || '';
  const i = s.indexOf('::');
  if (i > 0) {
    const t = s.slice(0, i);
    if (_W_NOTIF_TYPES.includes(t)) return { type: t, text: s.slice(i + 2) };
  }
  return null;
}

async function fetchNotifsW(userId) {
  const { data, error } = await sb.from('notifications')
    .select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(40);
  if (error) { console.error('fetchNotifsW:', error); return []; }
  return (data || []).map(_wNotifZRadku);
}

// Řádek z tabulky notifications → tvar, který používá zvoneček.
// Sdílené s realtime odběrem, aby se to nerozešlo.
function _wNotifZRadku(r) {
  // Nové řádky mají typ ve sloupci; u starých se ještě zkusí odloupnout z textu.
  const legacy = r.type === 'message' ? _wUnpackLegacy(r.body) : null;
  const type = legacy ? legacy.type : (_W_NOTIF_TYPES.includes(r.type) ? r.type : 'info');
  const text = legacy ? legacy.text : (r.body || '');
  return {
    id: r.id,
    ts: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    read: !!r.read,
    type,
    title: r.title || '',
    text,
    matchId: r.match_id || null,
    kind: _wNotifKind(type),
  };
}

async function insertNotifW(userId, n) {
  const { data, error } = await sb.from('notifications').insert({
    user_id: userId,
    type: _W_NOTIF_TYPES.includes(n.type) ? n.type : 'info',
    title: n.title || '',
    body: n.text || '',
    match_id: n.matchId || null,
    read: false,
  }).select().single();
  if (error) { console.error('insertNotifW:', error); return null; }
  return data;
}

async function markNotifsReadW(userId) {
  const { error } = await sb.from('notifications')
    .update({ read: true }).eq('user_id', userId).eq('read', false);
  if (error) { console.error('markNotifsReadW:', error); return false; }
  return true;
}

async function createRejectionW(workerId, jobId) {
  const { error } = await sb.from('rejections').insert({ worker_id: workerId, job_id: jobId });
  if (error && error.code !== '23505') console.error('createRejectionW:', error);
}

// Odmítnuté nabídky pro "projít znovu" — jen čtení, historie odmítnutí zůstává.
// Vrací pouze ty, které jsou pořád aktivní, aby počet na tlačítku odpovídal realitě.
async function fetchRejectedJobsW(workerId) {
  const { data: rej, error: rejErr } = await sb.from('rejections')
    .select('job_id').eq('worker_id', workerId);
  if (rejErr) { console.error('fetchRejectedJobsW (rejections):', rejErr); return { jobs: [], celkem: 0 }; }
  const ids = (rej || []).map(r => r.job_id).filter(Boolean);
  if (!ids.length) return { jobs: [], celkem: 0 };

  const { data: jobs, error } = await sb.from('jobs')
    .select('*, employer:profiles!jobs_employer_id_fkey(rating, name, company_name, verified)')
    .eq('status', 'active').in('id', ids);
  if (error) { console.error('fetchRejectedJobsW (jobs):', error); return { jobs: [], celkem: ids.length }; }

  const nowMs = Date.now();
  const aktivni = (jobs || []).filter(j => !j.publish_at || new Date(j.publish_at).getTime() <= nowMs);
  // celkem = kolik jich odmítl vůbec; rozdíl oproti `jobs` = už nejsou aktivní
  return { jobs: aktivni, celkem: ids.length };
}

async function sendMessageW(matchId, senderId, text, type, metadata) {
  const payload = { match_id: matchId, sender_id: senderId, text };
  if (type && type !== 'text') payload.type = type;
  if (metadata) payload.metadata = metadata;
  const { data, error } = await sb.from('messages').insert(payload).select().single();
  if (error) console.error('sendMessageW:', error);
  return data;
}

async function updateProfileW(workerId, updates) {
  const { error } = await sb.from('profiles').update(updates).eq('id', workerId);
  if (error) { console.error('updateProfileW:', error); return false; }
  Object.assign(W_PROFILE, updates);
  return true;
}

Object.assign(window, {
  W_PROFILE, W_JOBS, W_THREADS, W_HISTORY, W_REVIEWS, W_TRUST, W_TIERS,
  fetchWorkerData, createMatchW, createRejectionW, fetchRejectedJobsW, sendMessageW, updateProfileW, submitReviewW, confirmShiftW, cancelShiftW, logJobViewW,
  fetchNotifsW, insertNotifW, markNotifsReadW, _wNotifZRadku,
  fetchReviewRepliesW, postReviewReplyW,
  jobToCard, makejTrust, makejVydelky, makejMesice, _wMesicZpet, _wVydelek, _wColor, _wFmtTime, _wFmtDate, _wFmtDateY, _wJobPassed, _wPlural, _wShiftHours,
});
