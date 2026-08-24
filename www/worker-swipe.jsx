// Makej Worker — Swipe UI

const KRAJE_W = [
  { id: 'praha', name: 'Praha' }, { id: 'stredocesky', name: 'Středočeský' },
  { id: 'jihocesky', name: 'Jihočeský' }, { id: 'plzensky', name: 'Plzeňský' },
  { id: 'karlovarsky', name: 'Karlovarský' }, { id: 'ustecky', name: 'Ústecký' },
  { id: 'liberecky', name: 'Liberecký' }, { id: 'kralovehradecky', name: 'Královéhradecký' },
  { id: 'pardubicky', name: 'Pardubický' }, { id: 'vysocina', name: 'Vysočina' },
  { id: 'jihomoravsky', name: 'Jihomoravský' }, { id: 'olomoucky', name: 'Olomoucký' },
  { id: 'zlinsky', name: 'Zlínský' }, { id: 'moravskoslezsky', name: 'Moravskoslezský' },
];
const _krajName = id => (KRAJE_W.find(k => k.id === id) || {}).name || id;

// ── Filtr inzerátů (trychtýř vpravo nahoře) ─────────────────────────────
// 5 sekcí, každá multi-výběr. Hodnoty se ukládají do localStorage a rovnou
// filtrují feed. Prázdná sekce = bez omezení. Mapováno na pole karty inzerátu.
const W_FILTERS = [
  // Filtr na TYP SMLOUVY (contract_types), ne na badge. Když uchazeč filtruje
  // „DPP", chce inzeráty s DPP — ne všechno, co spadlo do kategorie „Brigáda".
  // Filtr na ÚVAZEK = badge odvozená z typu smlouvy + hodin (makej-badge.jsx).
  // Zdroj kategorií: Zákoník práce (poměr plný/kratší, dohody DPP/DPČ). Vždy sedí s kartou.
  // Záměrně první — v pásu se objeví hned za záložkou „Profese".
  { key: 'uvazek', label: 'Úvazek', opts: [
    ['BRIGADA', 'Brigáda'], ['CASTECNY_UVAZEK', 'Částečný úvazek'], ['ZKRACENY_UVAZEK', 'Zkrácený úvazek'],
    ['PLNY_UVAZEK', 'Plný úvazek'], ['NA_ICO', 'Na IČO'], ['DLE_DOMLUVY', 'Dle domluvy'],
  ] },
  // Preferenční filtr — poznává se z textu inzerátu (viz _W_PROKOHO). Modré obdélníky.
  { key: 'proKoho', label: 'Pro koho', opts: [
    ['bez_praxe', 'Bez zkušeností'], ['student', 'Pro studenty'], ['od15', 'Od 15 let'], ['zauci', 'Zaučíme'],
  ] },
  { key: 'contractType', label: 'Typ smlouvy', opts: [
    ['DPP', 'DPP'], ['DPC', 'DPČ'], ['EMPLOYMENT_CONTRACT', 'Pracovní smlouva'], ['SELF_EMPLOYED', 'IČO'],
  ] },
  { key: 'obor', label: 'Obor', opts: [
    ['gastro', 'Gastro'], ['sklad', 'Sklad & logistika'], ['promo', 'Promo & eventy'], ['foto', 'Foto & video'], ['prodej', 'Prodej'],
  ] },
  { key: 'pay', label: 'Odměna', opts: [
    ['0-150', 'Do 150 Kč/h'], ['150-200', '150–200 Kč/h'], ['200-250', '200–250 Kč/h'], ['250-100000', '250+ Kč/h'],
  ] },
  { key: 'payout', label: 'Výplata', opts: [
    ['Týdně', 'Týdně'], ['Hned po akci', 'Hned po akci'], ['Do 14 dní', 'Do 14 dní'], ['Měsíčně', 'Měsíčně'],
  ] },
  { key: 'recurrence', label: 'Pravidelnost', opts: [
    ['Pravidelná', 'Pravidelná'], ['Jednorázová', 'Jednorázová'],
  ] },
];
const W_FILTER_EMPTY = { contractType: [], uvazek: [], proKoho: [], obor: [], pay: [], payout: [], recurrence: [] };
function _wLoadFilters() {
  try { return { ...W_FILTER_EMPTY, ...JSON.parse(localStorage.getItem('makej-worker-filters') || '{}') }; }
  catch (e) { return { ...W_FILTER_EMPTY }; }
}
// Území: vybrané město (střed) + poloměr okolí v km. Uloženo v localStorage.
function _wLoadLoc() {
  try {
    const l = JSON.parse(localStorage.getItem('makej-worker-loc') || 'null');
    return (l && typeof l === 'object') ? { center: l.center || null, radius: l.radius || 25 } : { center: null, radius: 25 };
  } catch (e) { return { center: null, radius: 25 }; }
}
// Spadá hodinovka do některé z vybraných cenových kategorií? (OR přes kategorie)
function _wPayInBands(pay, bands) {
  if (!bands || !bands.length) return true;
  return bands.some(b => { const [lo, hi] = b.split('-').map(Number); return pay >= lo && pay < hi; });
}
// Badge inzerátu (úvazek) — odvozená z typu smlouvy + hodin, respektuje override.
// Legacy/Agentura bez enumu → null (do žádné úvazkové kategorie nespadá).
function _wJobBadge(j) {
  const types = normalizeContractTypes(j);
  if (!types.length) return null;
  return effectiveBadge({ contract_types: types, hours_per_week: normalizeHours(j), badge_override: j.badge_override });
}
// „Pro koho" — preferenční filtr. Hodnoty se poznají podle textu inzerátu
// (tagy, požadavky, nabídka). Produktová sada, ne právní pojmy.
const _W_PROKOHO = {
  bez_praxe: ['bez zkušenost', 'bez praxe', 'praxe není', 'zkušenosti nejsou', 'začátečník', 'nováček', 'i bez zkušen'],
  student:   ['student', 'pro studenty', 'ke studiu', 'vedle školy'],
  od15:      ['15+', '15 let', 'od 15', 'mladistv', 'od patnácti'],
  zauci:     ['zauč', 'zaškol', 'naučíme', 'zacvič', 'zapracujeme'],
};
function _wJobProKohoHay(j) {
  const A = x => Array.isArray(x) ? x : [];
  const parts = [j.title, j.name, j.desc, j.duties]
    .concat(A(j.tags), A(j.expectations), A(j.bonuses), A(j.offer), A(j.perks));
  return _wStripD(parts.filter(Boolean).join(' '));
}
function _wJobMatchesProKoho(j, vals) {
  if (!vals || !vals.length) return true;
  const hay = _wJobProKohoHay(j);
  return vals.some(v => (_W_PROKOHO[v] || []).some(kw => hay.indexOf(_wStripD(kw)) !== -1));   // OR přes vybrané
}
// Projde inzerát aktivním filtrem? Prázdná dimenze = bez omezení.
function _wJobMatchesFilters(j, f) {
  if (!f) return true;
  if (f.contractType.length) {
    const jt = normalizeContractTypes(j);
    if (!f.contractType.some(t => jt.includes(t))) return false;
  }
  if (f.uvazek && f.uvazek.length) {
    const b = _wJobBadge(j);
    if (!b || !f.uvazek.includes(b)) return false;
  }
  if (f.proKoho && f.proKoho.length && !_wJobMatchesProKoho(j, f.proKoho)) return false;
  if (f.obor.length && !f.obor.includes(j.obor)) return false;
  if (f.payout.length && !f.payout.includes(j.payout)) return false;
  if (f.recurrence.length && !f.recurrence.includes(j.recurrence)) return false;
  if (f.pay.length && !_wPayInBands(Number(j.pay) || 0, f.pay)) return false;
  return true;
}
const _wFilterCount = f => f ? Object.keys(W_FILTER_EMPTY).reduce((n, k) => n + (f[k] ? f[k].length : 0), 0) : 0;

// ── Území: souřadnice, vzdálenost (haversine), našeptávač měst ──────────
const _wDeg = x => x * Math.PI / 180;
function _wHaversineKm(a, b) {
  if (!a || !b) return Infinity;
  const R = 6371;
  const dLat = _wDeg(b[0] - a[0]), dLon = _wDeg(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(_wDeg(a[0])) * Math.cos(_wDeg(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}
const _wCity = () => (typeof CZ_MESTA !== 'undefined' ? CZ_MESTA : []);
const _wStripD = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
// Centroid kraje z jeho měst (memoizováno) — fallback pro inzerát bez přesného města.
let _wKrajCentroids = null;
function _wKrajCentroid(krajId) {
  if (!_wKrajCentroids) {
    _wKrajCentroids = {}; const acc = {};
    _wCity().forEach(m => { (acc[m.k] = acc[m.k] || []).push(m.c); });
    Object.keys(acc).forEach(k => { const p = acc[k];
      _wKrajCentroids[k] = [p.reduce((s, x) => s + x[0], 0) / p.length, p.reduce((s, x) => s + x[1], 0) / p.length]; });
  }
  return _wKrajCentroids[krajId] || null;
}
// Vyhledání města podle názvu (bez diakritiky).
let _wCityByName = null;
function _wFindCity(name) {
  if (!name) return null;
  if (!_wCityByName) { _wCityByName = {}; _wCity().forEach(m => { _wCityByName[_wStripD(m.n)] = m; }); }
  return _wCityByName[_wStripD(name)] || null;
}
// Souřadnice inzerátu: explicitní → z názvu města v `location` → centroid kraje.
function _wJobCoord(job) {
  if (Array.isArray(job.coords) && job.coords.length >= 2) return job.coords;
  if (job.lat != null && (job.lng != null || job.lon != null)) return [Number(job.lat), Number(job.lng != null ? job.lng : job.lon)];
  const first = _wStripD(String(job.location || '').split(/[—–\-,(/]/)[0]);
  const c = first && _wFindCity(first);
  return c ? c.c : _wKrajCentroid(job.kraj);
}
// Našeptávač: nejdřív shody na začátku, pak kdekoli. Bez diakritiky.
function _wCitySuggest(query, limit) {
  const q = _wStripD(query); if (!q) return [];
  const lim = limit || 40; const starts = [], contains = [];
  for (const m of _wCity()) {
    const n = _wStripD(m.n);
    if (n.startsWith(q)) starts.push(m);
    else if (n.indexOf(q) !== -1) contains.push(m);
    if (starts.length >= lim) break;
  }
  return starts.concat(contains).slice(0, lim);
}

// ── Profese (CZ-ISCO): seznam, hledání, shoda s inzerátem ──────────────
const _wProfeseAll = () => (typeof CZ_PROFESE !== 'undefined' ? CZ_PROFESE : []);
// Prázdný dotaz → celý seznam (scroll). Jinak: shody na začátku, pak kdekoli.
function _wProfeseSuggest(query) {
  const q = _wStripD(query); const arr = _wProfeseAll();
  if (!q) return arr;
  const starts = [], contains = [];
  for (const p of arr) {
    const n = _wStripD(p.n), s = p.s ? _wStripD(p.s) : '';
    if (n.startsWith(q)) starts.push(p);
    else if (n.indexOf(q) !== -1 || (s && s.indexOf(q) !== -1)) contains.push(p);   // hledá i v hovorových synonymech
  }
  return starts.concat(contains);
}
let _wProfeseByCode = null;
function _wProfese(code) {
  if (!_wProfeseByCode) { _wProfeseByCode = {}; _wProfeseAll().forEach(p => { _wProfeseByCode[p.k] = p; }); }
  return _wProfeseByCode[code] || null;
}
// Inzerát odpovídá profesi: přímý CZ-ISCO tag (job.isco) → jinak volná shoda
// významného slova z názvu profese v roli/titulku/oboru (prefix kvůli skloňování).
function _wJobMatchesProfese(job, codes) {
  if (!codes || !codes.length) return true;
  if (job.isco && codes.indexOf(String(job.isco)) !== -1) return true;
  const hay = _wStripD([job.role, job.title, job.name, job.position, job.obor].filter(Boolean).join(' '));
  if (!hay) return false;
  for (const c of codes) {
    const p = _wProfese(c); if (!p) continue;
    const toks = _wStripD(p.n).split(/[^a-z0-9]+/).filter(w => w.length >= 4);
    for (const t of toks) { if (hay.indexOf(t.slice(0, 5)) !== -1) return true; }
  }
  return false;
}

// Zdroj feedu → filtr území (město+okolí NEBO kraje) → profese → filtr sekcí.
function _wComputeFeed(kraje, filters, loc, profese) {
  const real = W_JOBS.map(jobToCard);
  const src  = real.length ? real : _wDemoJobs();
  let geo;
  if (loc && loc.center) {                          // vybráno město → okolí do X km
    const c = loc.center.c, r = loc.radius || 25;
    geo = src.filter(j => _wHaversineKm(_wJobCoord(j), c) <= r);
  } else if (kraje && kraje.length) {               // jinak filtr krajů
    geo = src.filter(j => kraje.includes(j.kraj));
  } else {
    geo = src;
  }
  return geo.filter(j => _wJobMatchesProfese(j, profese) && _wJobMatchesFilters(j, filters));
}

// Badge (bublinka vlevo nahoře) se NIKDY nezadává ručně — ODVOZUJE se z typu
// smlouvy a hodin (viz makej-badge.jsx, jediný zdroj pravdy). Respektuje i
// povolený badge_override. Pro formy, které nový model nepokrývá (Agentura),
// spadneme na původní legacy popisek.
function _wUvazekLabel(job) {
  const types = normalizeContractTypes(job);
  if (types.length) {
    return badgeLabel(effectiveBadge({
      contract_types: types,
      hours_per_week: normalizeHours(job),
      badge_override: job.badge_override,
    }));
  }
  return _wLegacyUvazekLabel(job);
}
// Fallback jen pro staré formy mimo enum (např. Agentura).
function _wLegacyUvazekLabel(job) {
  const c = job.contract || job.smlouva || job.contractType || '';
  if (c === 'Agentura') return 'Přes agenturu';
  return 'Dle domluvy';
}

// ── Konec zásobníku — nikdy prázdná obrazovka, vždy nabídni další krok ──
function WDeckEnd({ kraje, otherCount, filterCount = 0, onClearFilters, onClearKraje, onRestored }) {
  // Odmítnuté načteme dopředu — tlačítko pak jen předá hotový seznam, nemá jak selhat
  const [rej, setRej] = useStateW(null);   // null = ještě načítáme; { jobs, celkem }

  useEffectW(() => {
    let live = true;
    sb.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id;
      if (!uid) { if (live) setRej({ jobs: [], celkem: 0 }); return; }
      fetchRejectedJobsW(uid).then(r => { if (live) setRej(r); });
    });
    return () => { live = false; };
  }, []);

  const rejectedJobs = rej ? rej.jobs : null;
  const rejected     = rejectedJobs ? rejectedJobs.length : 0;
  // odmítl nějaké, ale žádná už není aktivní → chceme to říct, ne mlčet
  const odmitnuteProsle = !!rej && rej.celkem > 0 && rejected === 0;

  // Nejsilnější dostupná cesta ven: zrušit filtr → rozšířit kraje → vrátit odmítnuté
  const loading    = rej === null;
  const hasFilters = filterCount > 0;
  const canWiden   = kraje.length > 0 && otherCount > 0;
  const canRestore = !canWiden && rejected > 0;

  // Texty bez rodu — vyhýbáme se příčestí minulému (prošel/la, odmítl/a)
  const title = hasFilters ? 'Nic neodpovídá filtru' : canWiden ? 'Ve vybraných krajích je hotovo' : 'Konec nabídek';

  const subtitle = hasFilters
    ? <>Zkus povolit víc možností, nebo filtr zruš.</>
    : canWiden
    ? <>Jinde v Česku ale brigády jsou.</>
    : canRestore
      ? <>Nové přibývají každý den. Zatím se můžeš vrátit k odmítnutým.</>
      : loading
        ? <>Moment…</>
        : odmitnuteProsle
          ? <>Dřív přeskočené brigády už nejsou dostupné. Nové ale přibývají průběžně.</>
          : <>Nové brigády přibývají průběžně. Zkus to za chvíli.</>;

  const btn = {
    width: '100%', height: 50, borderRadius: 16, border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    fontFamily: T.fontUI, fontSize: 14.5, fontWeight: 700,
  };

  return (
    <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '20px 22px' }}>
      <div style={{
        width: '100%', maxWidth: 380, padding: 26, borderRadius: 26,
        background: '#fff', border: '1px solid ' + T.border,
        boxShadow: '0 18px 40px -22px rgba(20,22,43,0.25)', textAlign: 'center',
      }}>
        <div style={{
          width: 62, height: 62, borderRadius: 20, background: T.tint,
          display: 'grid', placeItems: 'center', margin: '0 auto 16px',
        }}>
          {hasFilters ? <WIcoFilter size={28} color={T.primary} /> : <Icon name={canWiden ? 'map-point-bold' : 'check-circle-bold'} size={30} color={T.primary} />}
        </div>

        <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 19, fontWeight: 800, marginBottom: 8 }}>{title}</div>
        <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 13.5, lineHeight: 1.6, marginBottom: 20 }}>{subtitle}</div>

        {hasFilters && (
          <button onClick={onClearFilters} style={{ ...btn, background: T.primary, color: '#fff', boxShadow: '0 12px 24px -10px rgba(0,32,246,0.7)' }}>
            <WIcoFilter size={16} color="#fff" />
            Zrušit filtr
          </button>
        )}

        {canWiden && (
          <button onClick={onClearKraje} style={{ ...btn, background: hasFilters ? T.tint : T.primary, color: hasFilters ? T.primary : '#fff', marginTop: hasFilters ? 10 : 0, boxShadow: hasFilters ? 'none' : '0 12px 24px -10px rgba(0,32,246,0.7)' }}>
            <Icon name="magnifer-linear" size={17} color={hasFilters ? T.primary : '#fff'} />
            Zobrazit {otherCount} {_wPlural(otherCount, 'brigádu', 'brigády', 'brigád')} odjinud
          </button>
        )}

        {canRestore && (
          <button onClick={() => onRestored(rejectedJobs)} style={{ ...btn, background: T.primary, color: '#fff', boxShadow: '0 12px 24px -10px rgba(0,32,246,0.7)' }}>
            Prohlédnout již odmítnuté
          </button>
        )}

        {/* I když nic rozšířit nejde, obrazovka nikdy nezůstane bez akce */}
        {!hasFilters && !canWiden && !canRestore && !loading && (
          <button onClick={() => onRestored(null)} style={{ ...btn, background: T.tint, color: T.primary }}>
            <Icon name="refresh-bold" size={17} color={T.primary} />
            Zkusit znovu
          </button>
        )}

        {canWiden && kraje.length > 0 && (
          <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 12, marginTop: 14 }}>
            Filtr zůstane uložený — kdykoliv ho vrátíš nahoře.
          </div>
        )}
      </div>
    </div>
  );
}

// Appka teprve startuje — reálných inzerátů bývá málo/žádné. Ukázkové JOBS
// z app.jsx jsou už ve tvaru karty (žádný jobToCard netřeba). `_demo: true`
// zabrání zápisu do DB při swipu (fake id by insert stejně nepřežil).
function _wDemoJobs() {
  return (typeof JOBS !== 'undefined' ? JOBS : []).map(j => ({ ...j, _demo: true }));
}

// Potvrzení „Zájem odeslán" se ukazuje po přijetí brigády, dokud si ho uživatel
// nevypne přes „Příště nezobrazovat" (uloženo v zařízení).
const _zajemHidden = () => { try { return localStorage.getItem('makej-hide-zajem') === '1'; } catch (e) { return false; } };

// Otevři externí odkaz (mapy) tak, aby to nerozbilo appku na mobilu.
// window.open('_blank') ve standalone PWA (appka na ploše) nechá po návratu
// prázdné bílé okno, které se musí zavřít křížkem. Klepnutí na dočasný
// <a target="_blank" rel="noopener"> předá odkaz systému (Mapy/Safari jako
// samostatná appka) a Makej běží dál na pozadí — po návratu je pořád tam.
function _wOpenExternal(url) {
  try {
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    try { window.open(url, '_blank', 'noopener'); } catch (e2) {}
  }
}
// Vždy Google Mapy — na iPhonu i Androidu (univerzální odkaz otevře appku Google
// Map, pokud je nainstalovaná, jinak Mapy v prohlížeči).
function _wMapsUrl(query) {
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query);
}

// Otevři profil firmy. U demo firmy není profil v DB → pošli bohatá data z inzerátu
// (obor, o firmě, sídlo, web, založeno, otevřené pozice, fotky, recenze) jako fallback.
function _wEmployerFallback(job) {
  const base = { name: job.company, company_name: job.company, color: job.accent, rating: job.rating, verified: job.verified };
  return (job._demo && job.employer) ? { _demo: true, photos: job.photos, ...base, ...job.employer } : base;
}
function _wOpenEmployerFor(job) {
  if (typeof window !== 'undefined' && window.wOpenEmployer) window.wOpenEmployer(job._demo ? null : job.employer_id, _wEmployerFallback(job));
}
// Proklik z odměny → spodní panel „Odměna v okolí" (osa min–max obvyklé sazby v oboru/lokalitě).
function _wOpenPayFor(job) {
  if (typeof window === 'undefined' || !window.wOpenPay) return;
  const emp = job.employer || {};
  window.wOpenPay({
    pay: job.pay, unit: job.payUnit, band: job.payBand || null,
    category: (emp.industry || '').split('·')[0].trim(),
    locality: job.location || '',
    shiftTotal: job.shiftTotal || job.total || 0,
  });
}
// Proklik z „Kdy" → spodní panel „Pracovní doba" (datum, rozpad směny, tvůj týden).
function _wOpenWhenFor(job) {
  if (typeof window !== 'undefined' && window.wOpenWhen) window.wOpenWhen(job);
}
// Proklik z hodnocení → spodní panel s recenzemi té firmy (nic dalšího).
function _wOpenReviewsFor(job) {
  if (typeof window === 'undefined' || !window.wOpenReviews) return;
  const emp = job.employer || {};
  window.wOpenReviews(job._demo ? null : job.employer_id, {
    company: { name: job.company, logo: job.logo, color: job.accent, verified: job.verified, category: emp.industry || '', district: emp.address || '' },
    rating: job.rating,
    items: Array.isArray(emp.reviews) ? emp.reviews : [],
  });
}

// Ověřovací odznak firmy ve stylu Instagramu: modrá pečeť + bílá fajfka.
function WVerifiedBadge({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0, display: 'block' }}>
      <path fill="#3897f0" d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z" />
      <path d="M7.6 12.2l3 3 5.8-6" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Zlatý odznáček „Byl jsem u toho" — 1:1 podle webového waitlistu (style.css → .gold-badge):
// zlatý přechod, černý text, zlatý okraj, tekoucí lesk. Bez ikony (jako na webu).
function WGoldBadge({ label = 'Byl jsem u toho', icon = null }) {
  return (
    <span style={{
      position: 'relative', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', gap: icon ? 4 : 0,
      padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0,
      fontFamily: T.fontHead, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.2px',
      color: '#221A05', border: '1px solid #A5780C',
      background: 'linear-gradient(105deg, #B8860B 0%, #E8C56A 22%, #FDF3C8 42%, #D9A93C 62%, #A9770A 82%, #E4C069 100%)',
      backgroundSize: '260% 100%',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.65), inset 0 -1px 0 rgba(90,60,0,.35), 0 2px 6px -2px rgba(140,96,10,.5)',
      animation: 'wGoldFlow 7s ease-in-out infinite',
    }}>
      {icon && <Icon name={icon} size={12} color="#221A05" />}
      {label}
      <span aria-hidden="true" style={{
        position: 'absolute', top: '-40%', left: 0, width: 26, height: '180%', pointerEvents: 'none',
        background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.9) 50%, rgba(255,255,255,0) 100%)',
        animation: 'wGoldSheen 4.5s ease-in-out infinite',
      }} />
    </span>
  );
}

// Onyxový odznak „Zakládající partner" (firma) — 1:1 podle webového waitlistu
// (style.css → .founder-badge): tmavý kovový přechod, bílý text s tyrkysovým
// odleskem, přejíždějící světelný pruh.
function WFounderBadge({ label = 'Zakládající partner' }) {
  return (
    <span style={{
      position: 'relative', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0,
      border: '1px solid #2A3E52',
      background: 'linear-gradient(105deg, #060A12 0%, #14202E 22%, #2E4759 42%, #101A26 62%, #050810 82%, #24384B 100%)',
      backgroundSize: '260% 100%',
      boxShadow: '0 5px 14px -3px rgba(6,32,40,.7)',
      animation: 'wGoldFlow 3.6s ease-in-out infinite',
    }}>
      <span style={{
        position: 'relative', fontFamily: T.fontHead, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.3px', whiteSpace: 'nowrap',
        backgroundImage: 'linear-gradient(100deg, #FFFFFF 0%, #FFFFFF 36%, #3FC3D8 50%, #FFFFFF 64%, #FFFFFF 100%)',
        backgroundSize: '300% 100%',
        WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextFillColor: 'transparent',
        animation: 'wTextSheen 7.5s cubic-bezier(.5,0,.3,1) infinite',
      }}>{label}</span>
      <span aria-hidden="true" style={{
        position: 'absolute', top: '-40%', left: 0, width: 30, height: '180%', pointerEvents: 'none',
        background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(226,253,255,.9) 50%, rgba(255,255,255,0) 100%)',
        animation: 'wSheenSweep 7.5s cubic-bezier(.5,0,.3,1) infinite',
      }} />
    </span>
  );
}

// ── Trychtýř filtru vpravo nahoře (kde bývala profilovka) ─────────────────
// Klik rozjede sekce doleva → klik na sekci otevře roletku (multi-výběr) →
// filtr se aplikuje živě, klik na trychtýř / mimo zavře. Stav řídí WSwipe.
const UZEMI = '__uzemi';
const PROFESE = '__profese';
function WJobFilter({ filters, onToggle, onClear, count, kraje, onToggleKraj, loc, onPickCity, onClearCity, onSetRadius, profese, onToggleProfese }) {
  const [open, setOpen]       = useStateW(false);
  const [section, setSection] = useStateW(null);
  const [q, setQ]             = useStateW('');   // hledání ve filtru Území
  const [pq, setPq]           = useStateW('');   // hledání ve filtru Profese
  const active = open || count > 0;
  const openSec = W_FILTERS.find(s => s.key === section) || null;
  const uzemiCount = (kraje ? kraje.length : 0) + (loc && loc.center ? 1 : 0);
  const profeseCount = profese ? profese.length : 0;
  const suggestions = _wCitySuggest(q, 40);
  const profeseList = _wProfeseSuggest(pq);

  const chip = on => ({
    flex: 'none', height: 34, padding: '0 12px', borderRadius: 11,
    border: '1px solid ' + (on ? T.primary : T.border), background: on ? T.tint : '#fff',
    color: on ? T.primary : T.ink, fontFamily: T.fontUI, fontSize: 12.5, fontWeight: 700,
    display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
  });
  const numBadge = { minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999, background: T.primary, color: '#fff', fontSize: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };

  const closeAll = () => { setOpen(false); setSection(null); };

  return (
    <>
      {/* Scrim — klik mimo zavře (filtr se už aplikoval živě) */}
      {open && <div onClick={closeAll} style={{ position: 'fixed', inset: 0, zIndex: 8480, background: 'transparent' }} />}

      <div style={{ position: 'fixed', top: 8, right: 16, zIndex: 8500, display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Vysouvací pás se sekcemi (roste doleva) */}
        <div className="wfilter-strip" style={{
          display: 'flex', gap: 6, alignItems: 'center',
          maxWidth: open ? 'calc(100vw - 168px)' : 0, opacity: open ? 1 : 0,
          overflowX: 'auto', overflowY: 'visible', scrollbarWidth: 'none', msOverflowStyle: 'none',
          transition: 'max-width .34s cubic-bezier(.2,.8,.2,1), opacity .26s ease',
          pointerEvents: open ? 'auto' : 'none',
        }}>
          {count > 0 && (
            <button onClick={onClear} title="Vymazat filtr" style={{ ...chip(false), color: T.destructive, borderColor: 'rgba(226,86,74,0.35)' }}>Vymazat</button>
          )}
          {/* Území — zvláštní sekce (vyhledávač + kraje / našeptávač měst) */}
          <button onClick={() => setSection(section === UZEMI ? null : UZEMI)} style={chip(uzemiCount > 0 || section === UZEMI)}>
            Území{uzemiCount > 0 && <span style={numBadge}>{uzemiCount}</span>}
          </button>
          {/* Profese — zvláštní sekce (vyhledávač + scroll profesí CZ-ISCO) */}
          <button onClick={() => setSection(section === PROFESE ? null : PROFESE)} style={chip(profeseCount > 0 || section === PROFESE)}>
            Profese{profeseCount > 0 && <span style={numBadge}>{profeseCount}</span>}
          </button>
          {W_FILTERS.map(sec => {
            const n = (filters[sec.key] || []).length;
            const sel = n > 0 || section === sec.key;
            return (
              <button key={sec.key} onClick={() => setSection(section === sec.key ? null : sec.key)} style={chip(sel)}>
                {sec.label}{n > 0 && <span style={numBadge}>{n}</span>}
              </button>
            );
          })}
        </div>

        {/* Trychtýř */}
        <button onClick={() => { if (open) closeAll(); else setOpen(true); }} title="Filtr"
          style={{ position: 'relative', width: 40, height: 40, flex: 'none', borderRadius: 13, cursor: 'pointer',
            border: active ? 'none' : '1px solid ' + T.border, background: active ? T.primary : '#fff',
            display: 'grid', placeItems: 'center', WebkitTapHighlightColor: 'transparent' }}>
          <WIcoFilter size={20} color={active ? '#fff' : T.ink} />
          {count > 0 && !open && (
            <span style={{ position: 'absolute', top: -5, right: -5, minWidth: 17, height: 17, padding: '0 4px', borderRadius: 999, background: T.primary, color: '#fff', fontFamily: T.fontUI, fontSize: 10.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>{count}</span>
          )}
        </button>
      </div>

      {/* Roletka vybrané sekce */}
      {open && openSec && (
        <div style={{ position: 'fixed', top: 54, right: 16, zIndex: 8500, width: 244,
          background: '#fff', border: '1px solid ' + T.border, borderRadius: 16,
          boxShadow: '0 20px 44px -18px rgba(20,22,43,0.34)', padding: 8,
          maxHeight: '62vh', overflowY: 'auto', animation: 'wFilterDrop .2s cubic-bezier(.2,.8,.2,1)' }}>
          <div style={{ fontFamily: T.fontHead, fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: '#A6ADCB', padding: '4px 8px 8px' }}>{openSec.label}</div>
          {openSec.opts.map(([val, label]) => {
            const on = (filters[openSec.key] || []).includes(val);
            // Úvazek + Pro koho = modré obdélníky (jako kraje). Ostatní sekce = checkbox.
            if (openSec.key === 'uvazek' || openSec.key === 'proKoho') {
              return (
                <button key={val} onClick={() => onToggle(openSec.key, val)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '11px 12px', marginBottom: 4,
                    background: on ? T.primary : '#fff', border: '1px solid ' + (on ? T.primary : T.border),
                    cursor: 'pointer', textAlign: 'left', fontFamily: T.fontUI, fontSize: 14, fontWeight: on ? 800 : 600,
                    color: on ? '#fff' : T.ink, borderRadius: 11, WebkitTapHighlightColor: 'transparent',
                    transition: 'background .15s ease, color .15s ease, border-color .15s ease' }}>
                  {label}
                  {on && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 'auto', flex: 'none' }}><path d="M5 12.5l4.2 4.2L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </button>
              );
            }
            return (
              <button key={val} onClick={() => onToggle(openSec.key, val)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '10px 8px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: T.fontUI, fontSize: 14, fontWeight: 600, color: T.ink, borderRadius: 10, WebkitTapHighlightColor: 'transparent' }}>
                <span style={{ width: 20, height: 20, flex: 'none', borderRadius: 6, border: '2px solid ' + (on ? T.primary : '#CBD2E6'), background: on ? T.primary : '#fff', display: 'grid', placeItems: 'center' }}>
                  {on && <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </span>
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Roletka Území — vyhledávač → prázdný = kraje (scroll), psaní = našeptávač měst */}
      {open && section === UZEMI && (
        <div style={{ position: 'fixed', top: 54, right: 16, zIndex: 8500, width: 262,
          background: '#fff', border: '1px solid ' + T.border, borderRadius: 16,
          boxShadow: '0 20px 44px -18px rgba(20,22,43,0.34)', padding: 8,
          maxHeight: '68vh', overflowY: 'auto', animation: 'wFilterDrop .2s cubic-bezier(.2,.8,.2,1)' }}>
          {/* Vyhledávač */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 4px 8px' }}>
            <span style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Hledej město nebo obec…" autoComplete="off"
                style={{ width: '100%', boxSizing: 'border-box', height: 38, padding: '0 30px 0 12px', borderRadius: 11,
                  border: '1px solid ' + T.border, background: '#F6F7FC', fontFamily: T.fontUI, fontSize: 14, color: T.ink, outline: 'none' }} />
              {q && <button onClick={() => setQ('')} title="Smazat" style={{ position: 'absolute', right: 6, width: 22, height: 22, border: 0, borderRadius: 999, background: '#E2E6F2', color: '#5B6488', cursor: 'pointer', fontSize: 14, lineHeight: '22px', padding: 0 }}>×</button>}
            </span>
          </div>

          {q ? (
            /* Psaní → našeptávač měst/obcí */
            suggestions.length ? suggestions.map(m => (
              <button key={m.n + m.k} onClick={() => { onPickCity(m); setQ(''); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 8px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: T.fontUI, fontSize: 14, fontWeight: 600, color: T.ink, borderRadius: 10, WebkitTapHighlightColor: 'transparent' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                  <span style={{ flex: 'none', display: 'flex' }}><WIcoPin size={16} color={T.primary} /></span>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.n}</span>
                </span>
                <span style={{ flex: 'none', fontSize: 11.5, color: '#A6ADCB' }}>{_krajName(m.k)}</span>
              </button>
            )) : <div style={{ padding: '12px 10px', color: '#7A82A6', fontFamily: T.fontUI, fontSize: 13 }}>Nic nenalezeno.</div>
          ) : loc && loc.center ? (
            /* Vybrané město → okolí do X km */
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px', background: T.tint, borderRadius: 12, marginBottom: 8 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ flex: 'none', display: 'flex' }}><WIcoPin size={17} color={T.primary} /></span>
                  <span style={{ fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, color: '#0B1233', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{loc.center.n}</span>
                </span>
                <button onClick={onClearCity} title="Zrušit město" style={{ flex: 'none', width: 24, height: 24, border: 0, borderRadius: 999, background: '#fff', color: T.destructive, cursor: 'pointer', fontSize: 15, lineHeight: '24px', padding: 0 }}>×</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '2px 8px 10px' }}>
                <span style={{ fontFamily: T.fontHead, fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: '#A6ADCB' }}>Okolí</span>
                <span style={{ fontFamily: T.fontHead, fontSize: 16, fontWeight: 800, color: T.primary }}>do {loc.radius || 25} km</span>
              </div>
              <div style={{ padding: '0 10px 6px' }}>
                <input type="range" className="w-radius" min={5} max={100} step={5} value={loc.radius || 25}
                  onChange={e => onSetRadius(Number(e.target.value))} aria-label="Poloměr okolí v km" />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: T.fontUI, fontSize: 11, color: '#A6ADCB' }}>
                  <span>5 km</span><span>100 km</span>
                </div>
              </div>
            </div>
          ) : (
            /* Prázdné → kraje (scroll) */
            <div>
              <div style={{ fontFamily: T.fontHead, fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: '#A6ADCB', padding: '2px 8px 6px' }}>Kraje</div>
              {KRAJE_W.map(k => {
                const on = (kraje || []).includes(k.id);
                // Vybraný kraj = celý modrý obdélník; další klik ho odznačí.
                return (
                  <button key={k.id} onClick={() => onToggleKraj(k.id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '11px 12px', marginBottom: 4,
                      background: on ? T.primary : '#fff', border: '1px solid ' + (on ? T.primary : T.border),
                      cursor: 'pointer', textAlign: 'left', fontFamily: T.fontUI, fontSize: 14, fontWeight: on ? 800 : 600,
                      color: on ? '#fff' : T.ink, borderRadius: 11, WebkitTapHighlightColor: 'transparent',
                      transition: 'background .15s ease, color .15s ease, border-color .15s ease' }}>
                    {k.name}
                    {on && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 'auto', flex: 'none' }}><path d="M5 12.5l4.2 4.2L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Roletka Profese — vyhledávač + scroll profesí (CZ-ISCO). Modrý multi-select. */}
      {open && section === PROFESE && (
        <div style={{ position: 'fixed', top: 54, right: 16, zIndex: 8500, width: 288,
          background: '#fff', border: '1px solid ' + T.border, borderRadius: 16,
          boxShadow: '0 20px 44px -18px rgba(20,22,43,0.34)', padding: 8,
          maxHeight: '68vh', overflowY: 'auto', animation: 'wFilterDrop .2s cubic-bezier(.2,.8,.2,1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 4px 8px' }}>
            <span style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
              <input value={pq} onChange={e => setPq(e.target.value)} placeholder="Hledej profesi…" autoComplete="off"
                style={{ width: '100%', boxSizing: 'border-box', height: 38, padding: '0 30px 0 12px', borderRadius: 11,
                  border: '1px solid ' + T.border, background: '#F6F7FC', fontFamily: T.fontUI, fontSize: 14, color: T.ink, outline: 'none' }} />
              {pq && <button onClick={() => setPq('')} title="Smazat" style={{ position: 'absolute', right: 6, width: 22, height: 22, border: 0, borderRadius: 999, background: '#E2E6F2', color: '#5B6488', cursor: 'pointer', fontSize: 14, lineHeight: '22px', padding: 0 }}>×</button>}
            </span>
          </div>
          <div style={{ fontFamily: T.fontHead, fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: '#A6ADCB', padding: '2px 8px 6px' }}>
            {pq ? 'Profese' : 'Všechny profese'}{!pq && <span style={{ color: '#C4CADD' }}> · {profeseList.length}</span>}
          </div>
          {profeseList.length ? profeseList.map(p => {
            const on = (profese || []).includes(p.k);
            // Vybraná profese = modrý obdélník; další klik ji odznačí.
            return (
              <button key={p.k} onClick={() => onToggleProfese(p.k)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '11px 12px', marginBottom: 4,
                  background: on ? T.primary : '#fff', border: '1px solid ' + (on ? T.primary : T.border),
                  cursor: 'pointer', textAlign: 'left', fontFamily: T.fontUI, fontSize: 13.5, fontWeight: on ? 800 : 600,
                  color: on ? '#fff' : T.ink, borderRadius: 11, WebkitTapHighlightColor: 'transparent',
                  transition: 'background .15s ease, color .15s ease, border-color .15s ease' }}>
                <span style={{ flex: 'none', display: 'flex' }}><WIcoWork size={16} color={on ? '#fff' : T.primary} /></span>
                <span style={{ flex: 1, minWidth: 0 }}>{p.n}</span>
                {on && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flex: 'none' }}><path d="M5 12.5l4.2 4.2L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </button>
            );
          }) : <div style={{ padding: '12px 10px', color: '#7A82A6', fontFamily: T.fontUI, fontSize: 13 }}>Nic nenalezeno.</div>}
        </div>
      )}
    </>
  );
}

function WSwipe({ tick }) {
  const [jobs,       setJobs]       = useStateW(() => _wComputeFeed(
    (() => { try { return JSON.parse(localStorage.getItem('makej-worker-kraje') || '[]'); } catch (e) { return []; } })(),
    _wLoadFilters(), _wLoadLoc(),
    (() => { try { return JSON.parse(localStorage.getItem('makej-worker-profese') || '[]'); } catch (e) { return []; } })(),
  ));
  const [topIdx,     setTopIdx]     = useStateW(0);
  const [drag,       setDrag]       = useStateW({ x: 0, y: 0, dragging: false, moved: false, startX: 0, startY: 0 });
  const [matchAnim,  setMatchAnim]  = useStateW(null);
  const [hideInfo,   setHideInfo]   = useStateW(() => _zajemHidden());   // „Příště nezobrazovat"
  const [actionAnim, setActionAnim] = useStateW(null); // 'like' | 'pass' | 'super'
  const [flying,     setFlying]     = useStateW(0);    // 0=klid; 1/-1 = probíhá odlet → spodní karty se dorovnají o úroveň výš
  const [saveFly,    setSaveFly]    = useStateW(false); // odlet po uložení → potlač barevný (like/pass) filtr, ať karta „jen zmizí"
  const [detailJob,  setDetailJob]  = useStateW(null);
  const [detailClosing, setDetailClosing] = useStateW(false);   // detail se právě zavírá (animace běží) → filtr už můžeme vrátit, ať nečeká na doběh
  const [detailRect, setDetailRect] = useStateW(null);   // rect karty → detail se z ní „roztáhne"
  const [kraje,      setKraje]      = useStateW(() => { try { return JSON.parse(localStorage.getItem('makej-worker-kraje') || '[]'); } catch (e) { return []; } });
  const [filters,    setFilters]    = useStateW(_wLoadFilters);
  const [loc,        setLoc]        = useStateW(_wLoadLoc);   // území: { center, radius }
  const [profese,    setProfese]    = useStateW(() => { try { return JSON.parse(localStorage.getItem('makej-worker-profese') || '[]'); } catch (e) { return []; } });
  const userId  = useRefW(null);
  const dragRef = useRefW(drag);
  const deckRef = useRefW(null);   // kontejner karty → odkud se detail roztáhne

  useEffectW(() => { dragRef.current = drag; }, [drag]);

  useEffectW(() => {
    sb.auth.getSession().then(({ data: { session } }) => { userId.current = session?.user?.id || null; });
    setJobs(_wComputeFeed(kraje, filters, loc, profese));
    setTopIdx(0);
  }, [tick]);

  // Filtr (území + kraje + profese + sekce) — ulož + přefiltruj feed
  useEffectW(() => {
    try { localStorage.setItem('makej-worker-kraje', JSON.stringify(kraje)); } catch (e) {}
    try { localStorage.setItem('makej-worker-filters', JSON.stringify(filters)); } catch (e) {}
    try { localStorage.setItem('makej-worker-loc', JSON.stringify(loc)); } catch (e) {}
    try { localStorage.setItem('makej-worker-profese', JSON.stringify(profese)); } catch (e) {}
    setJobs(_wComputeFeed(kraje, filters, loc, profese));
    setTopIdx(0);
  }, [kraje, filters, loc, profese]);

  // Kraje a „město + okolí" jsou dva výlučné režimy území — výběr jednoho zruší druhý.
  const toggleKraj    = id => { setLoc(l => ({ center: null, radius: l.radius || 25 })); setKraje(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); };
  const pickCity      = city => { setKraje([]); setLoc(l => ({ center: city, radius: l.radius || 25 })); };   // vybrat město → okolí do X km
  const clearCity     = () => setLoc(l => ({ center: null, radius: l.radius || 25 }));
  const setRadius     = r => setLoc(l => ({ ...l, radius: r }));
  const toggleProfese = code => setProfese(prev => prev.includes(code) ? prev.filter(x => x !== code) : [...prev, code]);
  const toggleFilter  = (key, val) => setFilters(prev => { const cur = prev[key] || []; return { ...prev, [key]: cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val] }; });
  const clearFilters  = () => { setFilters({ ...W_FILTER_EMPTY }); setKraje([]); setLoc(l => ({ center: null, radius: l.radius || 25 })); setProfese([]); };
  const filterCount   = _wFilterCount(filters) + kraje.length + (loc.center ? 1 : 0) + profese.length;

  const currentJob   = jobs[topIdx] || null;
  const visibleCards = jobs.slice(topIdx, topIdx + 3);

  // Zaznamenat zhlédnutí, když se inzerát dostane navrch
  useEffectW(() => {
    if (currentJob && currentJob.id && typeof logJobViewW === 'function') logJobViewW(currentJob.id);
  }, [currentJob && currentJob.id]);
  const trust        = makejTrust({ ...W_TRUST, hodnoceni: Number(W_PROFILE.rating) || 0 });
  const remaining    = Math.max(0, jobs.length - topIdx);

  const snapBack = () => setDrag({ x: 0, y: 0, dragging: false, moved: false, startX: 0, startY: 0 });

  const closeMatch = () => setMatchAnim(null);

  // Panel „Zájem odeslán" se po dojetí 6s časomíry sám zavře (swipování pak jede dál).
  useEffectW(() => {
    if (!matchAnim) return;
    const t = setTimeout(() => setMatchAnim(null), 6000);
    return () => clearTimeout(t);
  }, [matchAnim]);

  const animateFly = (dir, cb) => {
    // Po tahu prstem má karta náběh → punchy daleký odjezd. Z tlačítka (bez tahu, x≈0)
    // stačí kousek za okraj — pomalejší, aby byl odjezd vidět a ne jen bleskl.
    const flung = Math.abs(dragRef.current.x) > 60;
    const dist = flung ? 1400 : (window.innerWidth + 40);
    if (dir === 'super') setDrag(d => ({ ...d, x: 0, y: -1400, dragging: false }));
    else setDrag(d => ({ ...d, x: dir === 'like' ? dist : -dist, y: 0, dragging: false }));
    setFlying(dir === 'pass' ? -1 : 1);   // spodní karty se během odletu dorovnají o úroveň výš
    setTimeout(() => { snapBack(); setFlying(0); cb(); }, 340);
  };

  // Po dojeté animaci „Uloženo" karta smooth odjede (jako like), ale BEZ barevného
  // filtru — jen plynule zmizí a naskočí další. Nezakládá match/rejection (save ≠ swipe).
  function flyAwaySaved() {
    if (!currentJob) return;
    setSaveFly(true);
    animateFly('like', () => { setTopIdx(i => i + 1); setSaveFly(false); });
  }

  async function doLike(sup) {
    if (!currentJob) return;
    const job = currentJob;
    setActionAnim(sup ? 'super' : 'like');
    setTimeout(() => setActionAnim(null), 700);   // potvrzovací popisek (Odesláno/Odmítnuto) drží 700 ms
    animateFly(sup ? 'super' : 'like', async () => {
      setTopIdx(i => i + 1);
      const uid = userId.current;
      if (uid && !job._demo) await createMatchW(uid, job.id, sup);
      if (uid && !_zajemHidden()) {
        setHideInfo(false);   // při zobrazení flag != '1' → checkbox odškrtnutý (i po zapnutí z Nastavení)
        setMatchAnim(job);    // spodní panel; feed zůstává vidět, horní lištu neschováváme
      }
    });
  }
  async function doPass() {
    if (!currentJob) return;
    const job = currentJob;
    setActionAnim('pass');
    setTimeout(() => setActionAnim(null), 700);   // potvrzovací popisek (Odesláno/Odmítnuto) drží 700 ms
    animateFly('pass', async () => {
      setTopIdx(i => i + 1);
      const uid = userId.current;
      if (uid && !job._demo) await createRejectionW(uid, job.id);
    });
  }

  // Otevři detail a zapamatuj si rect karty, ať se detail roztáhne přesně z ní
  const openDetail = (job) => {
    if (deckRef.current) setDetailRect(deckRef.current.getBoundingClientRect());
    setDetailClosing(false);
    setDetailJob(job);
  };

  const onPointerDown = e => {
    // Klik na tlačítko v kartě (záložka „Uložit") není tah karty — nech ho proběhnout
    // jako obyčejný klik, ať se nespustí drag ani otevření detailu.
    if (e.target && e.target.closest && e.target.closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ x: 0, y: 0, dragging: true, moved: false, startX: e.clientX, startY: e.clientY });
  };
  const onPointerMove = e => {
    const d = dragRef.current;
    if (!d.dragging) return;
    const x = e.clientX - d.startX;
    const y = e.clientY - d.startY;
    setDrag(prev => ({ ...prev, x, y, moved: Math.abs(x) > 8 || Math.abs(y) > 8 }));
  };
  const onPointerUp = e => {
    const d = dragRef.current;
    if (!d.dragging) return;
    if      (d.y < -110 && Math.abs(d.y) > Math.abs(d.x)) { snapBack(); if (currentJob) openDetail(currentJob); }
    else if (d.x >  90) doLike(false);
    else if (d.x < -90) doPass();
    else if (!d.moved && currentJob) { snapBack(); openDetail(currentJob); }
    else                snapBack();
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, paddingTop: 4, position: 'relative' }}>

      {/* Filtr inzerátů — trychtýř vpravo nahoře (kde bývala profilovka).
          Schová se jen po dobu plně otevřeného detailu; jakmile se detail začne
          zavírat, vrátí se hned (stejně jako levá lišta se zvonkem/kalendářem),
          ne až po doběhu zavírací animace. */}
      {(!detailJob || detailClosing) && <WJobFilter filters={filters} onToggle={toggleFilter} onClear={clearFilters} count={filterCount}
        kraje={kraje} onToggleKraj={toggleKraj} loc={loc} onPickCity={pickCity} onClearCity={clearCity} onSetRadius={setRadius}
        profese={profese} onToggleProfese={toggleProfese} />}

      {/* Odsazení pod plovoucí horní lištu (odznáček úrovně + profil vpravo nahoře).
          Stupeň důvěry se teď ukazuje tam, ať není dvakrát. */}
      <div style={{ padding: '8px 20px 8px', flexShrink: 0 }} aria-hidden="true">
        <div style={{ height: 36 }} />
      </div>

      {/* Filtr krajů má přijít do samostatného tlačítka filtrů, ne na hlavní plochu.
          Stav `kraje` (i uložení do localStorage) zůstává funkční — chybí jen ovládání. */}

      {/* Card stack */}
      {visibleCards.length === 0 ? (
        <WDeckEnd
          kraje={kraje}
          otherCount={Math.max(0, W_JOBS.length - jobs.length)}
          filterCount={filterCount}
          onClearFilters={clearFilters}
          onClearKraje={() => setKraje([])}
          onRestored={list => {
            // Odmítnuté zobrazujeme bez filtru krajů — brigádník si o ně řekl výslovně
            if (list && list.length) { setJobs(list.map(jobToCard)); setTopIdx(0); }
            else { setJobs(_wComputeFeed(kraje, filters, loc, profese)); setTopIdx(0); }
          }}
        />
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 5px 5px', minHeight: 0, gap: 10 }}>
        <div
          ref={deckRef}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 500,
            flex: 1, minHeight: 0,
            userSelect: 'none', touchAction: 'none',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {[...visibleCards].reverse().map((job, ri) => {
            const depth = visibleCards.length - 1 - ri;
            const isTop = depth === 0;
            // Během odletu vrchní karty se spodní posunou o úroveň výš (dorovnají se),
            // takže „další" karta plynule doroste na 1 už během letu, ne až po něm (žádné cuknutí).
            const shownDepth = flying && !isTop ? depth - 1 : depth;
            return (
              <WJobCard
                key={job.id}
                job={job}
                drag={isTop ? drag : { x: 0, y: 0, dragging: false, moved: false }}
                isTop={isTop}
                depth={shownDepth}
                onTap={() => openDetail(job)}
                onSave={flyAwaySaved}
                saveFly={isTop && saveFly}
              />
            );
          })}
        </div>

          {/* Akce pod kartou — malé „přeskočit" (křížek) + velké „Mám zájem".
              Fill + fajfka při přijetí, přeskok krátce zčervená. Vše nabité na naše
              doPass/doLike (odlet karty + panel „Zájem odeslán"); animace jen přes
              inline transitions, žádné keyframes — nekope se to s našimi animacemi. */}
          <div style={{ flex: 'none', width: '100%', maxWidth: 500, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0 4px' }}>
            {/* Přeskočit */}
            <button onClick={doPass} title="Nemám zájem" style={{
              width: 54, height: 54, flex: 'none', borderRadius: 17, boxSizing: 'border-box', padding: 0, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: actionAnim === 'pass' ? '#FDECEC' : '#fff',
              border: '1px solid ' + (actionAnim === 'pass' ? '#E5484D' : '#E6E9F5'),
              transform: actionAnim === 'pass' ? 'scale(.94)' : 'scale(1)',
              transition: 'background .18s ease, border-color .18s ease, transform .18s ease',
              WebkitTapHighlightColor: 'transparent',
            }}>
              <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 2l14 14M16 2L2 16" stroke={actionAnim === 'pass' ? '#E5484D' : '#5B6488'} strokeWidth="2.4" strokeLinecap="round" /></svg>
            </button>

            {/* Mám zájem */}
            <button onClick={() => doLike(false)} title="Mám zájem" style={{
              position: 'relative', flex: 1, height: 54, borderRadius: 17, boxSizing: 'border-box',
              border: 0, outline: 'none', cursor: 'pointer', overflow: 'hidden', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: T.primary, boxShadow: 'none',
              transform: actionAnim === 'like' ? 'scale(1.03)' : 'scale(1)',
              transition: 'transform .22s cubic-bezier(.34,1.2,.5,1)',
              WebkitTapHighlightColor: 'transparent',
            }}>
              {/* Fill sweep (přijetí) */}
              <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '100%', background: T.primaryDeep, transformOrigin: 'left', transform: actionAnim === 'like' ? 'scaleX(1)' : 'scaleX(0)', transition: 'transform .38s cubic-bezier(.4,0,.2,1)' }} />
              {/* Popisek + částka */}
              <span style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, fontFamily: T.fontHead, fontSize: 16, fontWeight: 800, color: '#fff', opacity: actionAnim === 'like' ? 0 : 1, transition: 'opacity .16s ease' }}>
                Mám zájem
              </span>
              {/* Fajfka */}
              <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: actionAnim === 'like' ? 1 : 0, transition: 'opacity .16s ease .1s' }}>
                <svg width="26" height="20" viewBox="0 0 27 21" aria-hidden="true"><path d="M2.5 11.5L9.8 18.5 24.5 2.5" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 32, strokeDashoffset: actionAnim === 'like' ? 0 : 32, transition: 'stroke-dashoffset .3s cubic-bezier(.4,0,.2,1) .08s' }} /></svg>
              </span>
            </button>
          </div>
        </div>
      )}

      {/* „Zájem odeslán" — panel vyjede zdola, feed zůstává vidět; 6s časomíra sama zavře */}
      {matchAnim && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          {/* Scrim — ztmaví feed, klik zavře */}
          <div onClick={closeMatch} style={{ position: 'absolute', inset: 0, background: 'rgba(11,18,51,0.28)', animation: 'wScrimIn .34s ease both' }} />

          {/* Panel */}
          <div role="dialog" aria-live="polite" aria-label="Zájem odeslán" style={{
            position: 'relative', background: '#fff', borderRadius: '26px 26px 0 0', overflow: 'hidden',
            boxShadow: '0 -14px 40px rgba(11,18,51,0.22)', animation: 'wSheetUp .34s cubic-bezier(.24,1,.32,1) both',
          }}>
            {/* Odpočet do automatického zavření */}
            <span style={{ display: 'block', height: 3, background: T.primary, animation: 'wBarGrow 6s linear both' }} />

            {/* Příště nezobrazovat — pravý horní roh */}
            <button onClick={() => { const v = !hideInfo; setHideInfo(v); try { localStorage.setItem('makej-hide-zajem', v ? '1' : '0'); } catch (e) {} }} style={{
              position: 'absolute', top: 17, right: 18, zIndex: 2, display: 'flex', alignItems: 'center', gap: 7,
              background: 'none', border: 'none', padding: 0, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            }}>
              <span style={{ width: 16, height: 16, flex: 'none', borderRadius: 5, border: '2px solid ' + (hideInfo ? T.primary : T.border), background: hideInfo ? T.primary : '#fff', display: 'grid', placeItems: 'center' }}>
                {hideInfo && <svg width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 7.5l3 3 7-7" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </span>
              <span style={{ fontFamily: T.fontUI, fontSize: 11, fontWeight: 700, color: T.mutedSoft }}>Příště nezobrazovat</span>
            </button>

            <div style={{ padding: '20px 20px calc(30px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Fajfka + nadpis — potvrzení ve stylu platby (kroužek → výplň → fajfka) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                <span style={{ position: 'relative', width: 52, height: 52, flex: 'none', display: 'grid', placeItems: 'center' }}>
                  <span style={{ position: 'absolute', width: 52, height: 52, borderRadius: '50%', background: T.primary, animation: 'wApHalo 1.1s cubic-bezier(.2,.7,.3,1) .5s both' }} />
                  <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true" style={{ position: 'relative' }}>
                    <circle cx="26" cy="26" r="23" fill={T.primary} style={{ transformOrigin: '26px 26px', animation: 'wApFill .5s cubic-bezier(.34,1.3,.5,1) .42s both' }} />
                    <circle cx="26" cy="26" r="23" fill="none" stroke={T.primary} strokeWidth="3" strokeLinecap="round" style={{ transform: 'rotate(-90deg)', transformOrigin: '26px 26px', strokeDasharray: 144.5, strokeDashoffset: 144.5, animation: 'wApRing .62s cubic-bezier(.3,0,.2,1) both' }} />
                    <path d="M16 26.6L23 33.4 36.5 19.4" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 30, strokeDashoffset: 30, animation: 'wApCheck .38s cubic-bezier(.4,0,.2,1) .72s forwards' }} />
                  </svg>
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0, paddingTop: 18 }}>
                  <div style={{ fontFamily: T.fontHead, fontSize: 19, fontWeight: 800, color: T.ink, letterSpacing: -0.3 }}>Zájem odeslán</div>
                  <div style={{ fontFamily: T.fontUI, fontSize: 12, color: T.muted, lineHeight: 1.45 }}>{matchAnim.company} odpovídá obvykle do hodiny. Pak se otevře chat.</div>
                </div>
              </div>

              {/* Připomínka brigády */}
              <div style={{ background: T.surfaceAlt, borderRadius: 14, padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 11 }}>
                <span style={{ width: 34, height: 34, flex: 'none', borderRadius: 11, background: T.primary, color: '#fff', fontFamily: T.fontHead, fontSize: 14, fontWeight: 800, display: 'grid', placeItems: 'center' }}>{matchAnim.logo}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: T.fontHead, fontSize: 13, fontWeight: 800, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{matchAnim.title}</span>
                  <span style={{ fontFamily: T.fontUI, fontSize: 11, color: T.muted }}>{[matchAnim.when, matchAnim.time].filter(Boolean).join(' · ')}</span>
                </div>
                {matchAnim.shiftTotal > 0 && <span style={{ flex: 'none', fontFamily: T.fontHead, fontSize: 12, fontWeight: 800, color: T.green, background: T.greenSoft, padding: '7px 10px', borderRadius: 9 }}>{matchAnim.shiftTotal.toLocaleString('cs-CZ').replace(/,/g, ' ')} Kč</span>}
              </div>

              {/* Cesta tří kroků: Odesláno → Firma se rozhoduje → Chat */}
              <div style={{ background: T.surfaceAlt, borderRadius: 14, padding: '12px 12px 11px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
                {/* Řádek 1 — spojnice + uzly (uzel vždy uprostřed svého sloupce) */}
                <span style={{ gridColumn: 1, gridRow: 1, display: 'flex', alignItems: 'center' }}>
                  <span style={{ flex: 1, height: 2 }} />
                  <span style={{ width: 22, height: 22, flex: 'none', borderRadius: '50%', background: T.green, display: 'grid', placeItems: 'center' }}>
                    <svg width="11" height="9" viewBox="0 0 11 9" aria-hidden="true"><path d="M1 4.6L4 7.6 10 1.4" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                  <span style={{ flex: 1, height: 2, background: T.green }} />
                </span>
                <span style={{ gridColumn: 2, gridRow: 1, display: 'flex', alignItems: 'center' }}>
                  <span style={{ flex: 1, height: 2, background: T.green }} />
                  <span style={{ width: 22, height: 22, flex: 'none', borderRadius: '50%', position: 'relative', display: 'grid', placeItems: 'center' }}>
                    <span style={{ position: 'absolute', width: 11, height: 11, borderRadius: '50%', border: '1.5px solid ' + T.primary, animation: 'wRadarSm 2.6s cubic-bezier(.2,.6,.3,1) infinite' }} />
                    <span style={{ position: 'absolute', width: 11, height: 11, borderRadius: '50%', border: '1.5px solid ' + T.primary, animation: 'wRadarSm 2.6s cubic-bezier(.2,.6,.3,1) 1.3s infinite' }} />
                    <span style={{ position: 'relative', width: 11, height: 11, borderRadius: '50%', background: T.primary, animation: 'wDotPulse 2.6s ease-in-out infinite' }} />
                  </span>
                  <span style={{ flex: 1, height: 2, background: T.border }} />
                </span>
                <span style={{ gridColumn: 3, gridRow: 1, display: 'flex', alignItems: 'center' }}>
                  <span style={{ flex: 1, height: 2, background: T.border }} />
                  <span style={{ width: 22, height: 22, flex: 'none', borderRadius: '50%', border: '1.5px dashed #c7cce3', background: T.surfaceAlt }} />
                  <span style={{ flex: 1, height: 2 }} />
                </span>
                {/* Řádek 2 — popisky */}
                <span style={{ gridColumn: 1, gridRow: 2, padding: '8px 2px 0', fontFamily: T.fontUI, fontSize: 10.5, fontWeight: 800, lineHeight: 1.2, textAlign: 'center', color: T.mutedSoft }}>Odesláno</span>
                <span style={{ gridColumn: 2, gridRow: 2, padding: '8px 2px 0', fontFamily: T.fontUI, fontSize: 10.5, fontWeight: 800, lineHeight: 1.2, textAlign: 'center', color: T.ink }}>Firma se rozhoduje</span>
                <span style={{ gridColumn: 3, gridRow: 2, padding: '8px 2px 0', fontFamily: T.fontUI, fontSize: 10.5, fontWeight: 800, lineHeight: 1.2, textAlign: 'center', color: T.mutedSoft }}>Chat</span>
              </div>

              {/* Pokračovat v hledání — zavře panel a vrátí feed */}
              <button onClick={closeMatch} style={{
                width: '100%', border: 'none', background: T.primary, color: '#fff',
                fontFamily: T.fontHead, fontSize: 16, fontWeight: 800, padding: 16, borderRadius: 16,
                boxShadow: '0 10px 22px rgba(0,32,246,0.28)', cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
              }}>Pokračovat v hledání</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail inzerátu */}
      {detailJob && (
        <WJobDetailModal
          job={detailJob}
          fromRect={detailRect}
          onCloseStart={() => setDetailClosing(true)}
          onClose={() => { setDetailJob(null); setDetailClosing(false); }}
          onLike={() => doLike(false)}
          onPass={() => doPass()}
        />
      )}
    </div>
  );
}

// ── Swipovací karta (light styl podle mockupu) ─────────────────
// Uložené brigády — zatím lokálně v prohlížeči (localStorage). Ukládá se celý
// snímek inzerátu (ne jen ID), aby šel zobrazit v profilu → Uložené i mimo feed.
// Backend/Supabase (tabulka saved_jobs) přijde později; teď se uloží na zařízení.
function _wSavedList() {
  try {
    const raw = JSON.parse(localStorage.getItem('makej-saved-jobs') || '[]');
    return Array.isArray(raw) ? raw.filter(x => x && typeof x === 'object' && x.id != null) : [];
  } catch (e) { return []; }
}
function _wIsSaved(id) { return _wSavedList().some(j => j.id === id); }
function _wSetSaved(id, on, job) {
  const list = _wSavedList().filter(j => j.id !== id);
  if (on && job) list.unshift({ ...job, savedAt: Date.now() });
  try { localStorage.setItem('makej-saved-jobs', JSON.stringify(list)); } catch (e) {}
}

// Celostránkový přehled uložených brigád (otevírá se z Profilu → Uložené).
// Klepnutí na řádek otevře detail (read-only), záložka na řádku brigádu odebere.
function WSavedPage({ onClose }) {
  const [list, setList]           = useStateW(() => _wSavedList());
  const [detailJob, setDetailJob] = useStateW(null);
  const remove = (id) => { _wSetSaved(id, false); setList(_wSavedList()); };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 140, background: T.bg, display: 'flex', flexDirection: 'column', animation: 'wPop .28s cubic-bezier(.2,.8,.2,1)' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: 'calc(12px + env(safe-area-inset-top)) 16px 12px', background: '#fff', borderBottom: '1px solid ' + T.border }}>
        <WZpet onClick={onClose} />
        <div>
          <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 18, fontWeight: 800 }}>Uložené brigády</div>
          <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 12.5 }}>{list.length} {_wPlural(list.length, 'brigáda', 'brigády', 'brigád')}</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px calc(20px + env(safe-area-inset-bottom))' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.length === 0 ? (
            <div style={{ padding: '52px 26px', borderRadius: 20, background: '#fff', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,32,246,0.06)' }}>
              <div style={{ margin: '0 auto 16px', width: 56, height: 56, borderRadius: 999, background: T.tint, display: 'grid', placeItems: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6.5 3.75h11a1.25 1.25 0 0 1 1.25 1.25v15.5l-6.75-3.7-6.75 3.7V5A1.25 1.25 0 0 1 6.5 3.75z" stroke={T.primary} strokeWidth="1.7" strokeLinejoin="round" /></svg>
              </div>
              <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Zatím nic uloženého</div>
              <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 13.5, lineHeight: 1.6 }}>Když u brigády ťukneš na záložku, uloží se sem, ať se k ní snadno vrátíš.</div>
            </div>
          ) : list.map(job => {
            const per   = /(\/\s*h|hod|kč\/h)/i.test(job.payUnit || '') ? '/h' : ((job.payUnit || '').replace(/\s*Kč\s*/i, '') || '');
            const total = Number(job.shiftTotal || job.total || 0);
            const payTxt = total > 0 ? fmtKc(total) : (job.pay != null ? job.pay + ' Kč' + per : '');
            const meta  = [job.company, job.location].filter(Boolean).join(' · ');
            return (
              <div key={job.id} onClick={() => setDetailJob(job)} style={{ display: 'flex', alignItems: 'center', gap: 13, background: '#fff', borderRadius: 18, padding: 14, boxShadow: '0 4px 20px rgba(0,32,246,0.06)', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                <span style={{ width: 46, height: 46, flex: 'none', borderRadius: 13, background: T.tint, color: T.primary, fontFamily: T.fontHead, fontSize: 17, fontWeight: 800, display: 'grid', placeItems: 'center' }}>{job.logo || (job.company || '?').slice(0, 1)}</span>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.title}</span>
                  {meta && <span style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta}</span>}
                  {payTxt && <span style={{ color: T.primary, fontFamily: T.fontHead, fontSize: 13.5, fontWeight: 800 }}>{payTxt}</span>}
                </div>
                <button onClick={(e) => { e.stopPropagation(); remove(job.id); }} title="Odebrat z uložených" style={{ flex: 'none', width: 38, height: 38, borderRadius: 12, border: '1px solid ' + T.border, background: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center', WebkitTapHighlightColor: 'transparent' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={T.primary} aria-hidden="true"><path d="M6.5 3.75h11a1.25 1.25 0 0 1 1.25 1.25v15.5l-6.75-3.7-6.75 3.7V5A1.25 1.25 0 0 1 6.5 3.75z" stroke={T.primary} strokeWidth="1.7" strokeLinejoin="round" /></svg>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {detailJob && <WJobDetailModal job={detailJob} readOnly onClose={() => setDetailJob(null)} />}
    </div>
  );
}

function WJobCard({ job, drag, isTop, depth = 0, onTap, onSave, saveFly }) {
  const [saved, setSaved]         = useStateW(() => _wIsSaved(job.id));
  const [savedPill, setSavedPill] = useStateW(false);   // „Uloženo" pilulka vyjetá z kolečka
  const saveMounted = useRefW(true);
  useEffectW(() => () => { saveMounted.current = false; }, []);
  // Klik na záložku: uloží hned; z kolečka vyjede „Uloženo", zase zajede a nakonec
  // se ikonka vyplní. Celé ~1,6 s. Znovu-klik uložené odebere (bez animace).
  const toggleSave = () => {
    if (savedPill) return;                                  // animace běží → ignoruj
    if (saved) { setSaved(false); _wSetSaved(job.id, false); return; }
    _wSetSaved(job.id, true, job);
    setSavedPill(true);                                     // modrá pilulka „Uloženo" (bílý text) vyjede z kolečka
    // Po ~1,25 s zajede zpět a v tu chvíli modrá „nateče" do ikonky (ta se vyplní).
    setTimeout(() => { if (saveMounted.current) { setSavedPill(false); setSaved(true); } }, 1250);
    // Chvíli je vyplněná ikonka vidět, pak karta smooth odjede a naskočí další.
    setTimeout(() => { if (saveMounted.current && onSave) onSave(); }, 1650);
  };
  const x = isTop ? drag.x : 0;
  const y = isTop ? drag.y : 0;
  const rot = isTop ? (x / 18) : 0;
  // Spodní karty leží přesně pod vrchní (stejný střed, žádný posun), jsou celé,
  // jen o kousek menší → schované za vrchní a při odletu plynule dorostou na 1.
  const opacity = 1;
  const scale = isTop ? 1 : (1 - depth * 0.08);   // depth1 = 0.92, depth2 = 0.84 (výraznější „doskok" dopředu)
  const translateY = 0;

  const likeShown = isTop && x > 40 && !saveFly;   // po uložení odlet bez zeleného filtru
  const passShown = isTop && x < -40 && !saveFly;

  // Forma (home office / pružná / směnný provoz) ukážeme jako štítky před ostatními.
  const tags = [...(Array.isArray(job.forma) ? job.forma : []), ...(Array.isArray(job.tags) ? job.tags : [])].slice(0, 4);
  const heroImg = job.image_url || job.image || job.cover_url || job.photo_url || (Array.isArray(job.photos) && job.photos[0]) || null;
  const distanceTxt = job.distance != null ? String(job.distance).replace('.', ',') + ' km' : null;
  const typeLabel = _wUvazekLabel(job);   // bublinka = úvazek odvozený z typu smlouvy (+ rozsah)
  const payPer = /(\/\s*h|hod|kč\/h)/i.test(job.payUnit || '') ? '/h' : ((job.payUnit || '').replace(/\s*Kč\s*/i, '') || '');
  // Řádek „Smlouva" = seznam VŠECH typů smlouvy (contract_types), čárkou oddělené.
  // Filtr i badge jedou přes stejný model — karta nikdy neukáže rozpornou kombinaci.
  const contractTypes = normalizeContractTypes(job);
  const contract = contractTypes.length ? formatContractTypes(contractTypes) : (job.contract || job.smlouva || '');
  const uvazekDetail = job.hours_per_week ? (job.hours_per_week + ' h/týden') : '';
  // Odměna: hlavní je celková částka za směnu, pod ní rozpad na hodinovku × hodiny.
  const shiftTotal = Number(job.shiftTotal || job.total || 0);
  const payNum     = Number(job.pay || 0);
  const shiftHrs   = (payNum > 0 && shiftTotal > 0) ? Math.round(shiftTotal / payNum) : 0;
  const hourlyTxt  = payNum > 0 ? (payNum + ' Kč' + (payPer || '/h')) : '';
  // Datum vložení inzerátu (čerstvost) — relativní popisek („dnes", „před 2 dny").
  const posted   = job.posted || job.postedAgo || '';
  // Pravidelnost brigády — mění se jen text (Pravidelná / Jednorázová), ikonka pořád stejná.
  const recurrenceTxt = job.recurrence || job.frequency || '';

  return (
    <div
      style={{
        position: 'absolute', inset: 0,
        transform: `translate(${x}px, ${y + translateY}px) rotate(${rot}deg) scale(${scale})`,
        opacity,
        transition: drag.dragging ? 'none' : (isTop
          ? 'transform .30s cubic-bezier(.4,0,.2,1), opacity .30s cubic-bezier(.4,0,.2,1)'
          : 'transform .34s cubic-bezier(.34,1.3,.64,1)'),   // spodní karty: pružný doskok dopředu
        willChange: 'transform', zIndex: 10 - depth,
        pointerEvents: isTop ? 'auto' : 'none',
      }}
      onClick={() => isTop && !drag.moved && onTap?.()}
    >
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 26, overflow: 'hidden',
        background: '#fff', display: 'flex', flexDirection: 'column',
        border: '1px solid ' + T.border,
      }}>
        {/* ── Fotka provozu (nahoře) ── */}
        <div style={{ position: 'relative', height: 240, flex: 'none', background: '#EEF1FF' }}>
          {heroImg
            ? <img src={heroImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : (<div style={{ position: 'absolute', inset: 0, background: T.heroGrad, display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.16) 1.3px, transparent 1.3px)', backgroundSize: '19px 19px', opacity: 0.5 }} />
                <span style={{ fontFamily: T.fontHead, fontWeight: 800, fontSize: 150, color: 'rgba(255,255,255,0.12)', letterSpacing: -3, lineHeight: 1 }}>{job.logo}</span>
              </div>)}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(11,18,51,.42) 0%, rgba(11,18,51,0) 38%, rgba(11,18,51,.55) 100%)' }} />

          {/* horní odznaky: typ (vlevo) + uložit (vpravo) */}
          <div style={{ position: 'absolute', top: 12, left: 14, right: 12, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontFamily: T.fontHead, fontSize: 12, fontWeight: 800, padding: '6px 11px', borderRadius: 999, color: '#0B1233', background: '#fff', marginTop: 2 }}>{typeLabel}</span>
            {/* Uložit (záložka) — kolečko, ze kterého při uložení vyjede pilulka „Uloženo",
                zase zajede a nakonec se ikonka vyplní (~1,6 s). Roste doleva (kotví vpravo).
                pointerdown zastavíme, ať deck nezačne tah/nezachytí pointer (jinak by „spolkl" klik);
                akci pustíme na pointerup (spolehlivé i na dotyku), klik jen zastavíme, ať neotevře detail. */}
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => { e.stopPropagation(); if (isTop) toggleSave(); }}
              onClick={(e) => e.stopPropagation()}
              title={saved ? 'Uloženo' : 'Uložit'} style={{
                height: 34, flex: 'none', borderRadius: 999, border: 'none', padding: 0, cursor: 'pointer',
                background: savedPill ? T.primary : '#fff', boxShadow: '0 2px 8px rgba(11,18,51,0.16)',
                display: 'inline-flex', alignItems: 'center', overflow: 'hidden',
                transition: 'background-color .3s ease',
                WebkitTapHighlightColor: 'transparent',
              }}>
              <span style={{
                whiteSpace: 'nowrap', overflow: 'hidden',
                maxWidth: savedPill ? 96 : 0, opacity: savedPill ? 1 : 0,
                paddingLeft: savedPill ? 13 : 0,
                transition: 'max-width .34s cubic-bezier(.2,.8,.2,1), opacity .26s ease, padding-left .34s cubic-bezier(.2,.8,.2,1)',
                fontFamily: T.fontHead, fontSize: 13.5, fontWeight: 800, color: '#fff',
              }}>Uloženo</span>
              <span style={{ width: 34, height: 34, flex: 'none', display: 'grid', placeItems: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? T.primary : 'none'} style={{ transition: 'fill .28s ease' }} aria-hidden="true">
                  <path d="M6.5 3.75h11a1.25 1.25 0 0 1 1.25 1.25v15.5l-6.75-3.7-6.75 3.7V5A1.25 1.25 0 0 1 6.5 3.75z" stroke={saved ? T.primary : (savedPill ? '#fff' : '#0B1233')} strokeWidth="1.7" strokeLinejoin="round" style={{ transition: 'stroke .28s ease' }} />
                </svg>
              </span>
            </button>
          </div>

          {/* dole: logo firmy + název + hodnocení (klik = profil firmy) */}
          <div
            onClick={(e) => { e.stopPropagation(); if (!drag.moved) _wOpenEmployerFor(job); }}
            title="Zobrazit profil firmy"
            style={{ position: 'absolute', left: 14, bottom: 14, right: 14, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <span style={{ width: 42, height: 42, flex: 'none', borderRadius: 14, background: '#fff', color: T.primary, fontFamily: T.fontHead, fontSize: 17, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{job.logo}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <span style={{ fontFamily: T.fontHead, fontSize: 14, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{job.company}</span>
                {job.verified && <WVerifiedBadge size={15} />}
              </span>
              {(job.rating > 0 || job.boosted) && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                  {job.rating > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: T.fontUI, fontSize: 12, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}><WStar size={12} color={T.super} />{job.rating.toFixed(1).replace('.', ',')}{job.ratingCount ? ' · ' + job.ratingCount + ' hodnocení' : ''}</span>}
                  {job.boosted && <WFounderBadge />}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Tělo karty ── */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 18px 12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ fontFamily: T.fontHead, fontSize: 23, fontWeight: 800, color: '#0B1233', letterSpacing: -0.4, lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{job.title}</div>
            {(job.location || distanceTxt || posted) && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ display: 'flex', alignItems: 'center', minWidth: 0, fontFamily: T.fontUI, fontSize: 13, color: '#7A82A6' }}>
                  {job.location && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{job.location}</span>}
                  {job.location && distanceTxt && <span style={{ flexShrink: 0 }}>&nbsp;·&nbsp;</span>}
                  {distanceTxt && <span style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>{distanceTxt} od tebe</span>}
                </span>
                {posted && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0, fontFamily: T.fontUI, fontSize: 12, color: '#9AA1BD' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="#9AA1BD" strokeWidth="1.8" /><path d="M12 7.5V12l3 1.8" stroke="#9AA1BD" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Přidáno {posted}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Odměna: velká celková částka za směnu + drobný rozpad (hodinovka × hodiny). */}
          <div style={{ background: '#EEF1FC', borderRadius: 16, padding: '13px 16px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontFamily: T.fontHead, fontSize: 27, fontWeight: 800, color: '#0B1233', letterSpacing: -0.6, lineHeight: 1 }}>{shiftTotal > 0 ? fmtKc(shiftTotal) : (job.pay + ' Kč' + payPer)}</span>
            {(hourlyTxt || shiftHrs > 0) && (
              <span style={{ fontFamily: T.fontUI, fontSize: 13.5, fontWeight: 700, color: '#7A82A6', whiteSpace: 'nowrap' }}>{[hourlyTxt, shiftHrs > 0 ? shiftHrs + ' h' : ''].filter(Boolean).join(' · ')}</span>
            )}
          </div>

          {/* Fakta */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(job.when || job.time) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <span style={{ width: 22, flex: 'none', display: 'flex', justifyContent: 'center' }}><WIcoCalendar size={20} color={T.primary} /></span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: T.fontHead, fontSize: 14, fontWeight: 700, color: '#0B1233' }}>{[job.when, job.time].filter(Boolean).join(' · ')}</span>
                  {job.shiftHours ? <span style={{ fontFamily: T.fontUI, fontSize: 12, color: '#7A82A6' }}>{job.shiftHours} {_wPlural(job.shiftHours, 'hodina', 'hodiny', 'hodin')}</span> : null}
                </div>
              </div>
            )}
            {recurrenceTxt && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <span style={{ width: 22, flex: 'none', display: 'flex', justifyContent: 'center' }}><WIcoRepeat size={19} color={T.primary} /></span>
                <span style={{ fontFamily: T.fontHead, fontSize: 14, fontWeight: 700, color: '#0B1233' }}>{recurrenceTxt}</span>
              </div>
            )}
            {contract && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <span style={{ width: 22, flex: 'none', display: 'flex', justifyContent: 'center' }}><WIcoDoc size={19} color={T.primary} /></span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: T.fontHead, fontSize: 14, fontWeight: 700, color: '#0B1233' }}>{contract}</span>
                  {uvazekDetail && <span style={{ fontFamily: T.fontUI, fontSize: 12, color: '#7A82A6' }}>{uvazekDetail}</span>}
                </div>
              </div>
            )}
          </div>

          {/* Tagy (max 4) */}
          {tags.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {tags.map((t, i) => <span key={i} style={{ fontFamily: T.fontUI, fontSize: 12, fontWeight: 700, color: '#3A4266', background: '#F1F3FB', padding: '7px 11px', borderRadius: 999 }}>{t}</span>)}
            </div>
          )}
        </div>

        {/* Nápověda „táhni nahoru" — plovoucí přes obsah (jen text + šipka),
            místo bílého bloku jen jemné zesvětlení, ať se obsah protáhne níž. */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '24px 0 12px', color: '#8990AE', fontFamily: T.fontUI, fontSize: 12, fontWeight: 700, background: 'linear-gradient(to top, #ffffff 26%, rgba(255,255,255,0.82) 58%, rgba(255,255,255,0) 100%)', pointerEvents: 'none' }}>
          <svg width="12" height="8" viewBox="0 0 12 8" aria-hidden="true" data-whint style={{ animation: 'wHintHop 2s cubic-bezier(.34,1.3,.5,1) infinite' }}><path d="M1 6.5L6 1.5l5 5" fill="none" stroke="#8990AE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Táhni nahoru pro celý inzerát
        </div>

        {/* swipe „barevná odezva": jen barevný filtr přes kartu, bez razítka.
            Opacity roste se vzdáleností tahu, drží se i při odletu. */}
        {isTop && (likeShown || passShown) && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: x > 0 ? 'rgba(22,128,61,.45)' : 'rgba(214,58,36,.45)',
            opacity: Math.min(Math.abs(x) / 120, 1),
            transition: drag.dragging ? 'none' : 'opacity .35s cubic-bezier(.2,.8,.2,1)',
          }} />
        )}

      </div>
    </div>
  );
}

// ── Detail inzerátu (reálná data od zaměstnavatele) ────────────
function WJobDetailModal({ job, fromRect, onClose, onCloseStart, onLike, onSuper, onPass, readOnly, statusLabel, onChat, onCancel }) {
  // „Expand" detailu z karty: po mountu se list roztáhne z rectu karty do celé
  // obrazovky (rohy 26→0, scale, fade), při zavření se smrskne zpět a pak odmountuje.
  const [shown, setShown] = useStateW(false);
  const [closing, setClosing] = useStateW(null);         // null | 'fast' | 'slow' — zavírání; při zmenšení se detail plynule ztratí (bez „pop" cuknutí)
  const [detailDone, setDetailDone] = useStateW(null);   // 'like'|'pass' → potvrzení (Odesláno/Odmítnuto) na tlačítku detailu
  const [photoIdx, setPhotoIdx] = useStateW(0);          // aktivní fotka v galerii
  const closeTimer = useRefW(null);
  useEffectW(() => {
    if (typeof window !== 'undefined' && window.wSetDetailOpen) window.wSetDetailOpen(true);   // schovej horní lištu
    let r2;
    const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setShown(true)); });
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); clearTimeout(closeTimer.current); if (typeof window !== 'undefined' && window.wSetDetailOpen) window.wSetDetailOpen(false); };
  }, []);
  // slow = pomalé „vrácení" šipkou zpět (detail se ~0.9s plynule zmenší na kartu).
  // Bez slow (po „Ano/Ne") je zavření rychlé, ať na něj naváže odlet karty.
  const animClose = (slow) => {
    setClosing(slow ? 'slow' : 'fast');
    setShown(false);
    if (onCloseStart) onCloseStart();   // hned vrať filtr (jako levou lištu), ať nečeká na doběh animace
    if (typeof window !== 'undefined' && window.wSetDetailOpen) window.wSetDetailOpen(false);   // vrať horní lištu
    // Odmountuj až po dojetí celé zavírací animace, ať se zmenšení stihne plynule
    // dohrát a nezmizí dřív, než dojede (dřív se to „useklo" na 360 ms).
    closeTimer.current = setTimeout(onClose, slow ? 720 : 440);
  };
  const EXP_CURVE = 'cubic-bezier(.32,.72,0,1)';
  const startTransform = fromRect
    ? (() => {
        const cx = fromRect.left + fromRect.width / 2;
        const cy = fromRect.top + fromRect.height / 2;
        const dx = Math.round(cx - window.innerWidth / 2);
        const dy = Math.round(cy - window.innerHeight / 2);
        return `translate(${dx}px, ${dy}px) scale(.9)`;
      })()
    : 'scale(.94)';
  // Cíl „vrácení" (varianta A) — detail se rovnoměrně (bez kroucení, zachová si
  // tvar) zmenší směrem ke kartě ve stacku a přitom se rozplyne. Uniform scale =
  // menší z poměrů, ať se vejde do karty; posun vede jeho střed na střed karty.
  const closeTransform = fromRect
    ? (() => {
        const MW = Math.min(window.innerWidth, 440);       // šířka detailu (maxWidth 440)
        const ML = (window.innerWidth - MW) / 2;           // jeho levý okraj (detail je vycentrovaný)
        const MH = window.innerHeight;                     // výška detailu (celá obrazovka)
        const scale = Math.min(fromRect.width / MW, fromRect.height / MH);   // uniform → tvar zůstane
        const tx = Math.round((fromRect.left + fromRect.width / 2) - (ML + MW / 2));   // střed detailu → střed karty
        const ty = Math.round((fromRect.top + fromRect.height / 2) - MH / 2);
        return `translate(${tx}px, ${ty}px) scale(${scale})`;
      })()
    : 'scale(.85)';
  const closeSlow = closing === 'slow';

  const JOB_TYPE_LABEL = {
    jednrazova_vypomoc: 'Jednorázová výpomoc',
    brigada: 'Brigáda', part_time: 'Part-time', full_time: 'Full-time',
  };
  const perHour = /(\/\s*h|hod)/i.test(job.payUnit || '');
  const row = (icon, label, value) => value != null && value !== '' ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: '1px solid ' + T.border }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: 'T.tint', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <Icon name={icon} size={18} color={T.primary} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</div>
        <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 15, fontWeight: 800 }}>{value}</div>
      </div>
    </div>
  ) : null;

  const sectionTitle = txt => (
    <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, margin: '20px 0 10px' }}>{txt}</div>
  );

  const bullets = (items, iconName, iconColor) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {items.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, color: T.inkSoft, fontFamily: T.fontUI, fontSize: 14, lineHeight: 1.4 }}>
          <span style={{ flexShrink: 0, marginTop: 1 }}>{iconName === 'star-bold' ? <WStar size={16} color={iconColor} /> : <Icon name={iconName} size={16} color={iconColor} />}</span>
          <span>{r}</span>
        </div>
      ))}
    </div>
  );

  const heroImg = job.image_url || job.image || job.cover_url || job.photo_url || null;
  const _reqAll = Array.isArray(job.requirements) ? job.requirements : [];
  const contract = (_reqAll.find(r => /^smluvní vztah/i.test(r)) || '').replace(/^smluvní vztah:\s*/i, '')
    || formatContractTypes(normalizeContractTypes(job))
    || (JOB_TYPE_LABEL[job.jobType] || 'Brigáda');
  const reqChips = _reqAll.filter(r => !/^smluvní vztah/i.test(r) && !/^hledáme/i.test(r));
  const payoutTag = (Array.isArray(job.tags) ? job.tags : []).find(t => /výplat/i.test(t)) || '';
  const kmTxt = job.distance != null ? String(job.distance).replace('.', ',') + ' km od tebe' : '';
  const ctaTotal = job.shiftTotal > 0 ? job.shiftTotal.toLocaleString('cs-CZ').replace(/,/g, ' ') + ' Kč' : '';

  // Galerie fotek provozu — víc fotek z inzerátu (job.photos / job.images), jinak jedna hero fotka.
  const photos = (Array.isArray(job.photos) && job.photos.length) ? job.photos
    : (Array.isArray(job.images) && job.images.length) ? job.images
    : (heroImg ? [heroImg] : []);
  // Prokliky: mapa (oblast — přesná adresa až v chatu) a profil firmy (s recenzemi).
  const openMaps = () => { if (job.location) _wOpenExternal(_wMapsUrl(job.location)); };
  const openEmployer = () => _wOpenEmployerFor(job);
  const openReviews = () => _wOpenReviewsFor(job);
  const openPay = () => _wOpenPayFor(job);
  const openWhen = () => _wOpenWhenFor(job);
  const revCount = ((job.employer && Array.isArray(job.employer.reviews)) ? job.employer.reviews.length : job.ratingCount) || 0;

  return (
    <div onClick={() => animClose(true)} style={{
      position: 'fixed', inset: 0, zIndex: 120,
      background: shown ? 'rgba(11,18,51,0.5)' : 'rgba(11,18,51,0)',
      backdropFilter: shown ? 'blur(4px)' : 'blur(0px)', WebkitBackdropFilter: shown ? 'blur(4px)' : 'blur(0px)',
      display: 'flex', alignItems: 'stretch', justifyContent: 'center',
      transition: 'background .34s ease, backdrop-filter .34s ease, -webkit-backdrop-filter .34s ease',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 440, height: '100%',
        background: '#fff',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(20,22,40,0.28)',
        borderRadius: shown ? 0 : 26,
        transform: shown ? 'none' : (closeSlow ? closeTransform : startTransform),
        transformOrigin: 'center center',
        // Při zavírání se detail během zmenšování plynule ztratí (jinak zůstane
        // viditelný a „cukne" pryč). Otevírání se z karty pořád roztáhne bez fadu.
        opacity: closing ? 0 : (shown ? 1 : (fromRect ? 1 : 0)),
        // „Vrácení" (šipka zpět, varianta A): 0.7s — detail se rovnoměrně zmenší
        // ke kartě a plynule se rozplyne (fade jede skoro celou dobu a končí spolu
        // s dojetím). Rychlé zavření (Ano/Ne) i otevírání zůstávají svižné.
        transition: closeSlow
          ? 'transform .7s cubic-bezier(.4,0,.2,1), border-radius .7s cubic-bezier(.4,0,.2,1), opacity .6s ease .1s'
          : `transform ${closing ? '.44s' : '.42s'} ${EXP_CURVE}, border-radius ${closing ? '.44s' : '.42s'} ${EXP_CURVE}, opacity ${closing ? '.44s' : '.30s'} ease`,
        willChange: 'transform, opacity',
      }}>
        {/* Scroll: fotka hero + obsah inzerátu */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>

          {/* Fotky provozu — galerie (swipe + tečky) */}
          <div style={{ position: 'relative', height: 240, flex: 'none', background: photos.length ? '#EEF1FF' : undefined, overflow: 'hidden' }}>
            {photos.length ? (
              <div className="wgallery"
                onScroll={e => { const w = e.currentTarget.clientWidth; if (w) setPhotoIdx(Math.round(e.currentTarget.scrollLeft / w)); }}
                style={{ display: 'flex', height: '100%', overflowX: 'auto', overflowY: 'hidden', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
                {photos.map((src, i) => (
                  <img key={i} src={src} alt="" style={{ width: '100%', height: '100%', flex: 'none', objectFit: 'cover', display: 'block', scrollSnapAlign: 'center' }} />
                ))}
              </div>
            ) : (
              <div style={{ position: 'absolute', inset: 0, background: T.heroGrad, display: 'grid', placeItems: 'center' }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.16) 1.3px, transparent 1.3px)', backgroundSize: '19px 19px', opacity: 0.5 }} />
                <span style={{ fontFamily: T.fontHead, fontWeight: 800, fontSize: 150, color: 'rgba(255,255,255,0.12)', letterSpacing: -3 }}>{job.logo}</span>
              </div>
            )}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(11,18,51,.4) 0%, rgba(11,18,51,0) 45%)' }} />

            {/* Počítadlo + tečky (jen když je víc fotek) */}
            {photos.length > 1 && (
              <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', padding: '4px 10px', borderRadius: 999, background: 'rgba(11,18,51,0.55)', color: '#fff', fontFamily: T.fontHead, fontSize: 11.5, fontWeight: 800, pointerEvents: 'none' }}>{photoIdx + 1}/{photos.length}</div>
            )}
            {photos.length > 1 && (
              <div style={{ position: 'absolute', bottom: 30, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6, pointerEvents: 'none' }}>
                {photos.map((_, i) => (
                  <span key={i} style={{ width: i === photoIdx ? 18 : 6, height: 6, borderRadius: 999, background: i === photoIdx ? '#fff' : 'rgba(255,255,255,0.55)', transition: 'width .2s, background .2s' }} />
                ))}
              </div>
            )}

            <div style={{ position: 'absolute', top: 14, left: 16, right: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <button onClick={() => animClose(true)} aria-label="Zpět na kartu" title="Zpět na kartu" style={{ width: 40, height: 40, borderRadius: '50%', border: 0, background: 'rgba(255,255,255,.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <svg width="11" height="18" viewBox="0 0 11 18" aria-hidden="true"><path d="M9 1L2 9l7 8" fill="none" stroke="#0B1233" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <button onClick={() => { try { if (navigator.share) navigator.share({ title: job.title, text: job.company + ' — ' + job.title }); } catch (e) {} }} aria-label="Sdílet inzerát" title="Sdílet" style={{ width: 40, height: 40, borderRadius: '50%', border: 0, background: 'rgba(255,255,255,.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="12" cy="3.5" r="2.4" fill="none" stroke="#0B1233" strokeWidth="1.6" /><circle cx="4" cy="8" r="2.4" fill="none" stroke="#0B1233" strokeWidth="1.6" /><circle cx="12" cy="12.5" r="2.4" fill="none" stroke="#0B1233" strokeWidth="1.6" /><path d="M6.1 6.9l3.8-2.2M6.1 9.1l3.8 2.2" stroke="#0B1233" strokeWidth="1.6" /></svg>
              </button>
            </div>
          </div>

          {/* Obsah */}
          <div style={{ position: 'relative', marginTop: -22, background: '#fff', borderRadius: '22px 22px 0 0', padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {job.positions > 1 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: T.fontHead, fontSize: 11, fontWeight: 800, padding: '5px 10px', borderRadius: 999, color: '#B96F06', background: '#FFF3E0' }}>{job.positions} volných míst</span>
                </div>
              )}
              <h1 style={{ margin: 0, fontFamily: T.fontHead, fontSize: 26, fontWeight: 800, color: '#0B1233', letterSpacing: -0.6, lineHeight: 1.15 }}>{job.title}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <button onClick={openEmployer} title="Zobrazit profil firmy" style={{ width: 36, height: 36, flex: 'none', borderRadius: 12, background: T.primary, color: '#fff', fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 0, padding: 0, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>{job.logo}</button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <button onClick={openEmployer} title="Zobrazit profil firmy" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', fontFamily: T.fontHead, fontSize: 14, fontWeight: 800, color: '#0B1233', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, WebkitTapHighlightColor: 'transparent' }}>{job.company}</button>
                    {job.verified && <WVerifiedBadge size={15} />}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    {job.rating > 0 ? (
                      <button onClick={openReviews} title="Zobrazit recenze firmy" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 0, padding: 0, cursor: 'pointer', fontFamily: T.fontUI, fontSize: 12, whiteSpace: 'nowrap', WebkitTapHighlightColor: 'transparent' }}>
                        <WStar size={12} color={T.super} />
                        <span style={{ color: '#0B1233', fontWeight: 800 }}>{job.rating.toFixed(1).replace('.', ',')}</span>
                        <span style={{ color: T.primary, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 2 }}>{revCount > 0 ? revCount + ' ' + _wPlural(revCount, 'recenze', 'recenze', 'recenzí') : 'recenze'}</span>
                      </button>
                    ) : (
                      <span style={{ fontFamily: T.fontUI, fontSize: 12, color: '#7A82A6', whiteSpace: 'nowrap' }}>Nová firma na Makej</span>
                    )}
                    {job.boosted && <WFounderBadge />}
                  </span>
                </div>
              </div>
            </div>

            {/* Čtyři klíčové údaje — „Kde" je proklik do map */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'start' }}>
              {[
                { l: 'Odměna', v: job.pay + ' ' + job.payUnit, s: job.shiftTotal > 0 ? (job.shiftTotal.toLocaleString('cs-CZ').replace(/,/g, ' ') + ' Kč za směnu') : '', onClick: job.payBand ? openPay : null, hint: 'Srovnat v okolí' },
                { l: 'Kdy', v: job.when || job.date || '—', onClick: openWhen, hint: ([job.time, job.shiftHours ? job.shiftHours + ' h' : ''].filter(Boolean).join(' · ')) || 'Rozpis směny' },
                { l: 'Kde', v: job.location || '—', s: kmTxt, onClick: job.location ? openMaps : null, hint: 'Ukázat na mapě', wrap: true },
                { l: 'Smlouva', v: contract, s: payoutTag },
              ].map((f, i) => {
                const El = f.onClick ? 'button' : 'div';
                return (
                  <El key={i} onClick={f.onClick || undefined} title={f.onClick ? f.hint : undefined} style={{
                    background: f.onClick ? T.tint : '#F6F7FC', borderRadius: 14, padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0,
                    border: 'none', textAlign: 'left', width: '100%', fontFamily: 'inherit',
                    cursor: f.onClick ? 'pointer' : 'default',
                    WebkitTapHighlightColor: 'transparent',
                  }}>
                    <span style={{ fontFamily: T.fontHead, fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: '#A6ADCB' }}>{f.l}</span>
                    <span style={{ fontFamily: T.fontHead, fontSize: 18, fontWeight: 800, color: '#0B1233', letterSpacing: -0.3, lineHeight: 1.2, ...(f.wrap ? { overflowWrap: 'break-word', wordBreak: 'break-word' } : { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }) }}>{f.v}</span>
                    {f.onClick
                      ? <span style={{ fontFamily: T.fontUI, fontSize: 12, fontWeight: 700, color: '#5B6488', whiteSpace: 'nowrap' }}>{f.hint} ›</span>
                      : (f.s ? <span style={{ fontFamily: T.fontUI, fontSize: 11, color: '#7A82A6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.s}</span> : null)}
                  </El>
                );
              })}
            </div>

            {job.employer && job.employer.bio && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                <span style={{ fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, color: '#0B1233' }}>O nás</span>
                <p style={{ margin: 0, fontFamily: T.fontUI, fontSize: 14, color: '#3A4266', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{job.employer.bio}</p>
                {(job.employer.founded || job.employer.industry) && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 1 }}>
                    {job.employer.founded && (
                      <span style={{ fontFamily: T.fontUI, fontSize: 12, fontWeight: 700, color: T.primary, background: T.tint, padding: '7px 12px', borderRadius: 999 }}>Na trhu od roku {job.employer.founded}</span>
                    )}
                    {job.employer.industry && (
                      <span style={{ fontFamily: T.fontUI, fontSize: 12, fontWeight: 700, color: '#3A4266', background: '#F1F3FB', padding: '7px 12px', borderRadius: 999 }}>{job.employer.industry}</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {(job.duties || job.desc) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                <span style={{ fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, color: '#0B1233' }}>Náplň tvojí práce</span>
                <p style={{ margin: 0, fontFamily: T.fontUI, fontSize: 14, color: '#3A4266', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{job.duties || job.desc}</p>
              </div>
            )}

            {/* Co od tebe čekáme — povinné (modrá fajfka) */}
            {Array.isArray(job.expectations) && job.expectations.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                <span style={{ fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, color: '#0B1233' }}>Co od tebe čekáme</span>
                {bullets(job.expectations, 'check-circle-bold', T.primary)}
              </div>
            )}

            {/* Co oceníme — nepovinné bonusy (zlatá hvězda) */}
            {Array.isArray(job.bonuses) && job.bonuses.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                <span style={{ fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, color: '#0B1233' }}>Co oceníme <span style={{ fontFamily: T.fontUI, fontSize: 12, fontWeight: 600, color: '#9AA1BD' }}>· výhodou</span></span>
                {bullets(job.bonuses, 'star-bold', T.super)}
              </div>
            )}

            {/* Co ti nabídneme — co firma dává (zelená fajfka) */}
            {Array.isArray(job.offer) && job.offer.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                <span style={{ fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, color: '#0B1233' }}>Co ti nabídneme</span>
                {bullets(job.offer, 'check-circle-bold', T.green)}
              </div>
            )}

            {/* Benefity — konkrétní perky (zelené odznaky s dárkem) */}
            {Array.isArray(job.perks) && job.perks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                <span style={{ fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, color: '#0B1233' }}>Benefity</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {job.perks.map((p, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: T.fontUI, fontSize: 12.5, fontWeight: 700, color: '#0B7B4B', background: '#E6F7EF', padding: '8px 12px', borderRadius: 999 }}>
                      <Icon name="gift-bold" size={13} color="#0B7B4B" />{p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {reqChips.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                <span style={{ fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, color: '#0B1233' }}>Co potřebuješ</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{reqChips.map((c, i) => <span key={i} style={{ fontFamily: T.fontUI, fontSize: 12, fontWeight: 700, color: '#3A4266', background: '#F1F3FB', padding: '8px 12px', borderRadius: 999 }}>{c.replace(/^(jazyk|vhodné pro):\s*/i, '')}</span>)}</div>
              </div>
            )}

            {Array.isArray(job.tags) && job.tags.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                <span style={{ fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, color: '#0B1233' }}>Vlastnosti brigády</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{job.tags.map((t, i) => <span key={i} style={{ fontFamily: T.fontUI, fontSize: 12, fontWeight: 700, color: '#3A4266', background: '#F1F3FB', padding: '8px 12px', borderRadius: 999 }}>{t}</span>)}</div>
              </div>
            )}

            <span style={{ fontFamily: T.fontUI, fontSize: 11, color: '#A6ADCB', lineHeight: 1.5 }}>Pravidla směny a přesnou adresu dostaneš do chatu, jakmile firma potvrdí zájem.</span>
          </div>
        </div>

        {/* Actions */}
        {readOnly ? (
          <div style={{ flexShrink: 0, padding: '12px 22px calc(14px + env(safe-area-inset-bottom))', borderTop: '1px solid ' + T.border, background: T.card }}>
            {statusLabel && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: T.light, fontFamily: T.fontUI, fontSize: 13, fontWeight: 700, marginBottom: onChat ? 12 : 0 }}>
                <Icon name="check-circle-bold" size={16} color={T.green} /> {statusLabel}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={animClose} style={{
                flex: '0 0 auto', borderRadius: 12, padding: '13px 22px',
                background: 'rgba(18,18,26,0.05)', border: '1px solid ' + T.border,
                color: T.light, fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, cursor: 'pointer',
              }}>Zavřít</button>
              {onChat && (
                <button onClick={onChat} style={{
                  flex: 1, borderRadius: 12, padding: '13px 0',
                  background: T.ink, border: 'none',
                  color: '#fff', fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}><Icon name="chat-round-bold" size={17} color="#fff" /> Otevřít chat</button>
              )}
            </div>
            {onCancel && (
              <button onClick={onCancel} style={{
                width: '100%', marginTop: 10, borderRadius: 12, padding: '11px 0',
                background: 'none', border: 'none',
                color: '#f43f5e', fontFamily: T.fontHead, fontSize: 13.5, fontWeight: 800, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}><Icon name="close-circle-bold" size={15} color="#f43f5e" /> Zrušit směnu</button>
            )}
          </div>
        ) : (
        <div style={{ flexShrink: 0, borderTop: '1px solid #E6E9F5', background: '#fff', padding: '12px 16px calc(16px + env(safe-area-inset-bottom))', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Stejná nová tlačítka jako na kartě — přeskočit (křížek) + Mám zájem (fill + fajfka).
              Chování zůstává: potvrdí se (detailDone), detail se zavře a karta odletí. */}
          <button onClick={() => { if (detailDone) return; setDetailDone('pass'); animClose(); setTimeout(onPass, 380); }} title="Nemám zájem" style={{
            width: 54, height: 54, flex: 'none', borderRadius: 17, boxSizing: 'border-box', padding: 0, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: detailDone === 'pass' ? '#FDECEC' : '#fff',
            border: '1px solid ' + (detailDone === 'pass' ? '#E5484D' : '#E6E9F5'),
            transform: detailDone === 'pass' ? 'scale(.94)' : 'scale(1)',
            transition: 'background .18s ease, border-color .18s ease, transform .18s ease',
            WebkitTapHighlightColor: 'transparent',
          }}>
            <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 2l14 14M16 2L2 16" stroke={detailDone === 'pass' ? '#E5484D' : '#5B6488'} strokeWidth="2.4" strokeLinecap="round" /></svg>
          </button>

          <button onClick={() => { if (detailDone) return; setDetailDone('like'); animClose(); setTimeout(onLike, 380); }} title="Mám zájem" style={{
            position: 'relative', flex: 1, height: 54, borderRadius: 17, boxSizing: 'border-box',
            border: 0, outline: 'none', cursor: 'pointer', overflow: 'hidden', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: T.primary,
            transform: detailDone === 'like' ? 'scale(1.03)' : 'scale(1)',
            transition: 'transform .22s cubic-bezier(.34,1.2,.5,1)',
            WebkitTapHighlightColor: 'transparent',
          }}>
            <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '100%', background: T.primaryDeep, transformOrigin: 'left', transform: detailDone === 'like' ? 'scaleX(1)' : 'scaleX(0)', transition: 'transform .38s cubic-bezier(.4,0,.2,1)' }} />
            <span style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, fontFamily: T.fontHead, fontSize: 16, fontWeight: 800, color: '#fff', opacity: detailDone === 'like' ? 0 : 1, transition: 'opacity .16s ease' }}>
              Mám zájem
            </span>
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: detailDone === 'like' ? 1 : 0, transition: 'opacity .16s ease .1s' }}>
              <svg width="26" height="20" viewBox="0 0 27 21" aria-hidden="true"><path d="M2.5 11.5L9.8 18.5 24.5 2.5" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 32, strokeDashoffset: detailDone === 'like' ? 0 : 32, transition: 'stroke-dashoffset .3s cubic-bezier(.4,0,.2,1) .08s' }} /></svg>
            </span>
          </button>
        </div>
        )}
      </div>
    </div>
  );
}
