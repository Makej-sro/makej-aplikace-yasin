// Makej Worker — Lidé (tržiště dovedností). Brigádníci si navzájem nabízejí
// pomoc; ostatní procházejí mřížku a vyhledávají. ŽÁDNÝ swipe — je to
// marketplace. Kontakt je přímý ("Napsat"). Návrh: LideTrziste.html (1a + 1b).

// Bez diakritiky + lowercase → odolné hledání ("doucovani" najde "Doučování").
const _pNorm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const _pInitials = name => (name || '?').split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '?';
const _pShort = name => { const p = (name || '').trim().split(/\s+/); return p.length > 1 ? p[0] + ' ' + (p[p.length - 1][0] || '') + '.' : (p[0] || 'Brigádník'); };

// Kategorie do čipů. `kw` = klíčová slova bez diakritiky (hledá se v nabídce+štítcích).
const _P_KATEGORIE = [
  { key: 'vse',       label: 'Vše',        kw: null },
  { key: 'remesla',   label: 'Řemesla',    kw: ['remesl', 'oprav', 'hodinar', 'hodink', 'elektro', 'instalat', 'truhl', 'kutil', 'kolo', 'zasuvk'] },
  { key: 'doucovani', label: 'Doučování',  kw: ['douc', 'matemat', 'fyzik', 'vyuk', 'jazyk', 'anglict', 'uceni'] },
  { key: 'it',        label: 'IT',         kw: ['web', 'appk', 'program', 'kod', 'pocitac', 'e-shop', 'eshop'] },
  { key: 'foto',      label: 'Foto/Video', kw: ['fot', 'video', 'strih', 'kamer'] },
  { key: 'gastro',    label: 'Gastro',     kw: ['var', 'catering', 'gastro', 'kuchy', 'barist', 'kav', 'pec', 'dort'] },
  { key: 'stehovani', label: 'Stěhování',  kw: ['stehov', 'dodavk', 'odvoz', 'preprav', 'sila'] },
  { key: 'hudba',     label: 'Hudba',      kw: ['kytar', 'hud', 'hraj', 'zpev', 'nastroj'] },
];

// Klíčová slova pro typewriter efekt v placeholderu vyhledávání.
const _P_HLEDEJ = ['doučování', 'opravy', 'foto', 'stěhování', 'web na míru', 'dort', 'kytaru', 'hodinky', 'úklid'];

// Volby pro editor karty.
const _P_ODMENA = [['free', 'Zdarma'], ['deal', 'Dohodou'], ['from', 'Od…']];
const _P_DOSTUP = ['Přes den', 'Večery', 'Víkendy', 'Flexibilně'];
const _P_KDE    = ['U tebe', 'U mě', 'Online'];
function _pPriceStr(type, amount) {
  if (type === 'free') return 'Zdarma';
  if (type === 'from') return amount ? ('Od ' + amount + ' Kč') : '';
  if (type === 'deal') return 'Dohodou';
  return '';
}

// ── Demo data — appka teprve startuje, reálné karty zatím nejsou. ──
function _pDemoPeople() {
  return [
    { id: 'demo-p-1', name: 'Petr Hlaváč', verified: true, city: 'Brno', district: 'Brno — Veveří', rating: 4.9, ratingCount: 23,
      card_offer: 'Jednou týdně opravuju hodinky, rád pomůžu. Vyměním baterii, řemínek i sklíčko, u mechanik zvládnu vyčištění a seřízení. Přines to kdykoli večer, většinou to mám hotové do druhého dne.',
      bio: 'Hodinky mě baví od malička — začínal jsem u dědy v dílně a teď to dělám i profesionálně v servisu. Nejsem žádná velká značka, ale poctivě a rád. Když si nebudeš vědět rady, poradím i po telefonu.',
      experience: '4 roky v hodinářském servisu', price: 'Dohodou', availability: ['Večery', 'Víkendy'],
      card_tags: ['Řemesla', 'Hodinky', 'Drobné opravy'], replyTime: 'do 2 hodin', helpCount: 31, mode: 'U mě i osobně',
      reviews: [{ text: 'Vyměnil mi řemínek za dvacet minut a nechtěl za to nic. Moc příjemné jednání.', author: 'Klára V.', month: 'červenec' }] },
    { id: 'demo-p-2', name: 'Tereza Nová', verified: true, city: 'Brno', district: 'Brno — střed', rating: 4.8, ratingCount: 41,
      card_offer: 'Doučuju matiku a fyziku, základka i střední. Připravím i na přijímačky a maturitu, vysvětlím to lidsky. Chodím k tobě nebo online.',
      bio: 'Studuju učitelství matematiky a doučování je pro mě radost, ne jen přivýdělek. Umím látku vysvětlit několika způsoby, dokud to nesedne. S dětmi mám trpělivost a nebojím se ani slabších studentů.',
      experience: 'Doučuju 3 roky, studuju učitelství', price: 'Od 250 Kč', availability: ['Večery', 'Víkendy'],
      card_tags: ['Doučování', 'Matematika', 'Fyzika'], replyTime: 'do 1 hodiny', helpCount: 58, mode: 'U tebe i online',
      reviews: [{ text: 'Syn konečně pochopil zlomky. Trpělivá a připravená.', author: 'Jana P.', month: 'červen' }] },
    { id: 'demo-p-3', name: 'Martin Kraus', verified: true, city: 'Praha', district: 'Praha 7', rating: 5.0, ratingCount: 12,
      card_offer: 'Fotím portréty a akce, mám vlastní techniku i světla. Portréty, produktovku i menší eventy. Fotky dodám upravené do týdne.',
      bio: 'Focení dělám pátým rokem, mám vlastní ateliér i mobilní vybavení na výjezdy. Rád domluvím koncept dopředu, ať odcházíš s fotkami, které se ti opravdu líbí. Ukázky pošlu na požádání.',
      experience: 'Fotím 5 let, vlastní ateliér', price: 'Od 500 Kč', availability: ['Flexibilně'],
      card_tags: ['Foto/Video', 'Portréty', 'Eventy'], replyTime: 'do 3 hodin', helpCount: 9, mode: 'U mě',
      reviews: [{ text: 'Skvělé portréty do portfolia, rychlé dodání.', author: 'Filip N.', month: 'srpen' }] },
    { id: 'demo-p-4', name: 'Adéla Pokorná', verified: false, city: 'Ostrava', district: 'Ostrava — Poruba', rating: 4.7, ratingCount: 16,
      card_offer: 'Pomůžu se stěhováním, mám dodávku a sílu. Naložím, odvezu i vynosím do patra. Klidně i o víkendu.',
      bio: 'Stěhování dělám při škole, mám dodávku po tátovi a partu spolehlivých kluků, když je potřeba víc rukou. Na čas dorazím, s nábytkem umím a nic ti nepoškrábu.',
      experience: 'Stěhuju 2 roky, vlastní dodávka', price: 'Od 200 Kč', availability: ['Víkendy', 'Flexibilně'],
      card_tags: ['Stěhování', 'Dodávka'], replyTime: 'do 5 hodin', helpCount: 22, mode: 'U tebe',
      reviews: [{ text: 'Přijela na čas, byt jsme stěhovali rychle. Doporučuju.', author: 'Ondřej M.', month: 'květen' }] },
    { id: 'demo-p-5', name: 'Jakub Souček', verified: true, city: 'Brno', district: 'Brno — Královo Pole', rating: 4.6, ratingCount: 19,
      card_offer: 'Postavím jednoduchý web nebo spravím počítač. Prezentaci, e-shop na míru i odvirování a zrychlení notebooku.',
      bio: 'Programuju při studiu na VUT a weby dělám od střední. Nejsem agentura, takže cena je férová a domluva rychlá. Web ti nejen udělám, ale i tě naučím ho spravovat, ať nejsi na mně závislý.',
      experience: 'Weby dělám 4 roky, student VUT', price: 'Dohodou', availability: ['Večery', 'Víkendy'],
      card_tags: ['IT', 'Weby'], replyTime: 'do 4 hodin', helpCount: 14, mode: 'U tebe i online',
      reviews: [{ text: 'Web mi udělal za víkend a naučil mě ho spravovat.', author: 'Lucie H.', month: 'červenec' }] },
    { id: 'demo-p-6', name: 'Klára Veselá', verified: true, city: 'Praha', district: 'Praha 3', rating: 4.9, ratingCount: 34,
      card_offer: 'Upeču dort na oslavu, zvládnu i bezlepkový. Dorty, cupcakes i cukroví podle přání. Objednávej pár dní dopředu.',
      bio: 'Peču z lásky už roky a nejvíc mě baví, když má být dort podle konkrétní představy. Zvládnu i bezlepkové a veganské varianty. Domluvíme se na chuti i vzhledu předem, ať tě nic nepřekvapí.',
      experience: 'Peču na objednávku 4 roky', price: 'Od 350 Kč', availability: ['Flexibilně'],
      card_tags: ['Gastro', 'Pečení', 'Dorty'], replyTime: 'do 2 hodin', helpCount: 27, mode: 'U mě',
      reviews: [{ text: 'Nejlepší dort na oslavu, všem chutnal. Domluva bez problému.', author: 'Petra K.', month: 'srpen' }] },
    { id: 'demo-p-7', name: 'Filip Marek', verified: false, city: 'Zlín', district: 'Zlín — střed', rating: 0, ratingCount: 0,
      card_offer: 'Opravím ti zásuvku nebo světlo, mám papíry na elektro. Drobné elektroinstalace a výměny po bytě.',
      bio: 'Jsem vyučený elektrikář a brigádně pomáhám i s drobnostmi po bytě, na které elektrikáři nechtějí jezdit. Dělám to bezpečně a podle předpisů — u elektřiny se nešidí.',
      experience: 'Vyučený elektrikář', price: 'Dohodou', availability: ['Přes den', 'Víkendy'],
      card_tags: ['Řemesla', 'Elektro'], replyTime: 'do 6 hodin', helpCount: 0, mode: 'U tebe', reviews: [] },
    { id: 'demo-p-8', name: 'Nikol Urbanová', verified: false, city: 'Olomouc', district: 'Olomouc — Nová Ulice', rating: 0, ratingCount: 0,
      card_offer: 'Učím kytaru začátečníky, docházím i domů. Akordy, doprovod k písničkám, tempo dle tebe.',
      bio: 'Hraju na kytaru přes deset let a učení mě baví. Začátečníky vezmu úplně od nuly — první písničku zvládneš rychleji, než čekáš. Tempo i styl přizpůsobím tomu, co chceš hrát.',
      experience: 'Hraju 10 let', price: 'Od 300 Kč', availability: ['Večery'],
      card_tags: ['Hudba', 'Kytara', 'Výuka'], replyTime: 'do 1 dne', helpCount: 0, mode: 'U tebe i online', reviews: [] },
  ];
}

// ── Malé obrysové ikonky (styl návrhu) ────────────────────────────
const _PIco = {
  search: c => <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="6.6" fill="none" stroke={c} strokeWidth="1.5" /><path d="M14 14l3 3" stroke={c} strokeWidth="1.5" strokeLinecap="round" /></svg>,
  plus: c => <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3.2v9.6M3.2 8h9.6" stroke={c} strokeWidth="1.7" strokeLinecap="round" /></svg>,
  sort: c => <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.4 4.4h11.2M4.4 8h7.2M6.6 11.6h2.8" stroke={c} strokeWidth="1.5" strokeLinecap="round" /></svg>,
  back: c => <svg width="11" height="18" viewBox="0 0 12 20" aria-hidden="true"><path d="M9.4 2L2.6 10l6.8 8" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  share: c => <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true"><circle cx="13.5" cy="4" r="2.6" fill="none" stroke={c} strokeWidth="1.5" /><circle cx="4.5" cy="9" r="2.6" fill="none" stroke={c} strokeWidth="1.5" /><circle cx="13.5" cy="14" r="2.6" fill="none" stroke={c} strokeWidth="1.5" /><path d="M6.9 7.8l4.2-2.4M6.9 10.2l4.2 2.4" stroke={c} strokeWidth="1.5" /></svg>,
  clock: c => <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7.2" fill="none" stroke={c} strokeWidth="1.5" /><path d="M9 5.2v4l2.6 1.8" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  starOutline: c => <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true"><path d="M9 1.8l2.2 4.45 4.9.72-3.55 3.45.84 4.88L9 12.99 4.61 15.3l.84-4.88L1.9 6.97l4.9-.72L9 1.8z" fill="none" stroke={c} strokeWidth="1.5" strokeLinejoin="round" /></svg>,
  pin: c => <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true"><path d="M9 1.6a5.2 5.2 0 0 1 5.2 5.2c0 3.6-5.2 9.6-5.2 9.6S3.8 10.4 3.8 6.8A5.2 5.2 0 0 1 9 1.6Z" fill="none" stroke={c} strokeWidth="1.5" /><circle cx="9" cy="6.8" r="1.9" fill="none" stroke={c} strokeWidth="1.5" /></svg>,
  chat: c => <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><path d="M2.8 6.6A3 3 0 0 1 5.8 3.6h8.4a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H8.6L4.4 17.8v-3.2A3 3 0 0 1 2.8 11.6Z" fill="none" stroke={c} strokeWidth="1.6" strokeLinejoin="round" /></svg>,
  coin: c => <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7.2" fill="none" stroke={c} strokeWidth="1.5" /><path d="M9 5v8M6.9 6.9c.4-.8 1.2-1.1 2.2-1.1 1.2 0 2 .5 2 1.4 0 .8-.7 1.1-2 1.3-1.3.2-2.1.6-2.1 1.4 0 .9.9 1.4 2.1 1.4 1 0 1.8-.3 2.2-1" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  calendar: c => <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true"><rect x="2.8" y="4" width="12.4" height="11.2" rx="2.4" fill="none" stroke={c} strokeWidth="1.5" /><path d="M6 2.6v2.8M12 2.6v2.8M2.8 7.6h12.4" stroke={c} strokeWidth="1.5" strokeLinecap="round" /></svg>,
};

// ── Vyhledávání s typewriter efektem v placeholderu ───────────────
// Samostatná komponenta → animace překresluje jen search bar, ne celý grid.
function WPeopleSearch({ value, onChange }) {
  const empty = !value;
  const [typed, setTyped] = useStateW('');
  const [blink, setBlink] = useStateW(true);

  useEffectW(() => {
    if (!empty) return;
    let alive = true, wi = 0, ci = 0, del = false, t = null;
    const step = () => {
      if (!alive) return;
      const w = _P_HLEDEJ[wi % _P_HLEDEJ.length];
      if (!del) { ci++; t = setTimeout(step, ci >= w.length ? 1500 : 85); if (ci >= w.length) del = true; }
      else { ci--; if (ci <= 0) { del = false; wi++; ci = 0; t = setTimeout(step, 420); } else t = setTimeout(step, 42); }
      setTyped(w.slice(0, Math.max(0, ci)));
    };
    t = setTimeout(step, 450);
    return () => { alive = false; clearTimeout(t); };
  }, [empty]);

  useEffectW(() => {
    if (!empty) return;
    const iv = setInterval(() => setBlink(b => !b), 530);
    return () => clearInterval(iv);
  }, [empty]);

  const ph = empty ? ('Hledej ' + typed + (blink ? '|' : ' ')) : '';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid ' + T.border, borderRadius: 16, padding: '13px 15px' }}>
      {_PIco.search(T.muted)}
      <input value={value} onChange={onChange} placeholder={ph} aria-label="Hledat pomoc"
        style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none', fontFamily: T.fontUI, fontSize: 14, color: T.ink }} />
      {value && <button onClick={() => onChange({ target: { value: '' } })} title="Vymazat" style={{ border: 'none', background: 'none', color: T.muted, cursor: 'pointer', fontSize: 14, padding: 0 }}>✕</button>}
    </div>
  );
}

// ── Kartička v mřížce (2 sloupce) ─────────────────────────────────
function WPersonGridCard({ person, onTap }) {
  const tags = (Array.isArray(person.card_tags) ? person.card_tags : []).slice(0, 1);
  return (
    <button onClick={onTap} style={{
      textAlign: 'left', cursor: 'pointer', width: '100%',
      background: '#fff', border: '1px solid ' + T.border, borderRadius: 22, padding: 14,
      display: 'flex', flexDirection: 'column', gap: 9, WebkitTapHighlightColor: 'transparent',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ width: 44, height: 44, flex: 'none', borderRadius: 999, background: T.heroGrad, color: '#fff', display: 'grid', placeItems: 'center', fontFamily: T.fontHead, fontWeight: 800, fontSize: 15 }}>{_pInitials(person.name)}</div>
        {person.rating > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: T.fontHead, fontSize: 12.5, fontWeight: 800, color: T.ink }}>
            <WStar size={13} color={T.super} />{Number(person.rating).toFixed(1).replace('.', ',')}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
          <span style={{ fontFamily: T.fontHead, fontSize: 14.5, fontWeight: 700, color: T.ink, letterSpacing: -0.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{_pShort(person.name)}</span>
          {person.verified && <Icon name="verified-check-bold" size={13} color={T.primary} />}
        </span>
        {person.city && <span style={{ fontFamily: T.fontUI, fontSize: 12, color: T.muted }}>{person.city}</span>}
      </div>
      {person.card_offer && (
        <span style={{ fontFamily: T.fontUI, fontSize: 12.5, color: T.ink, lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{person.card_offer}</span>
      )}
      {(person.price || tags.length > 0) && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          {person.price && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: T.fontHead, fontSize: 11, fontWeight: 800, color: T.primary, background: T.tint, padding: '5px 9px', borderRadius: 999 }}>{_PIco.coin(T.primary)}{person.price}</span>}
          {tags.slice(0, 1).map((t, i) => <span key={i} style={{ fontFamily: T.fontUI, fontSize: 11, fontWeight: 700, color: T.ink, background: T.surfaceAlt, padding: '5px 9px', borderRadius: 999 }}>{t}</span>)}
        </div>
      )}
    </button>
  );
}

// ── Detail člověka (celá obrazovka) ───────────────────────────────
function WPersonDetail({ person, onClose, onContact }) {
  const tags = Array.isArray(person.card_tags) ? person.card_tags : [];
  const [saved, setSaved] = useStateW(() => _pIsSaved(person.id));
  const reviews = Array.isArray(person.reviews) ? person.reviews : [];
  const cardBox = { background: '#fff', border: '1px solid ' + T.border, borderRadius: 22, padding: '16px 17px', display: 'flex', flexDirection: 'column', gap: 9 };
  const cardH = { fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, color: T.ink };

  const avail = Array.isArray(person.availability) ? person.availability.join(' · ') : '';
  const trust = [
    avail && { ico: _PIco.calendar, k: 'Dostupnost', v: avail },
    person.mode && { ico: _PIco.pin, k: 'Kde', v: person.mode },
    person.replyTime && { ico: _PIco.clock, k: 'Odpovídá obvykle', v: person.replyTime },
    person.helpCount > 0 && { ico: _PIco.starOutline, k: 'Pomoc v komunitě', v: person.helpCount + '×' },
  ].filter(Boolean);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: T.bg, display: 'flex', flexDirection: 'column', animation: 'wPop .28s cubic-bezier(.2,.8,.2,1)' }}>
      {/* Hero */}
      <div style={{ flex: 'none', background: T.heroGrad, padding: '52px 20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <button onClick={onClose} title="Zpět na tržiště" style={{ width: 38, height: 38, flex: 'none', border: 'none', borderRadius: 999, background: 'rgba(255,255,255,0.16)', display: 'grid', placeItems: 'center', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>{_PIco.back('#fff')}</button>
          <button onClick={() => { try { navigator.share && navigator.share({ title: person.name, text: person.card_offer || '' }); } catch (e) {} }} title="Sdílet" style={{ width: 38, height: 38, flex: 'none', border: 'none', borderRadius: 999, background: 'rgba(255,255,255,0.16)', display: 'grid', placeItems: 'center', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>{_PIco.share('#fff')}</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          <span style={{ width: 72, height: 72, flex: 'none', borderRadius: 999, background: 'rgba(255,255,255,0.18)', border: '2px solid rgba(255,255,255,0.35)', color: '#fff', display: 'grid', placeItems: 'center', fontFamily: T.fontHead, fontSize: 24, fontWeight: 800 }}>{_pInitials(person.name)}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fff', fontFamily: T.fontHead, fontSize: 23, fontWeight: 800, letterSpacing: -0.4 }}>
              {person.name}
              {person.verified && <Icon name="verified-check-bold" size={17} color="#fff" />}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'rgba(255,255,255,0.85)', fontFamily: T.fontUI, fontSize: 13, fontWeight: 600 }}>
              {person.district || person.city}
              {person.rating > 0
                ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#fff', fontWeight: 700 }}><WStar size={13} color={T.super} />{Number(person.rating).toFixed(1).replace('.', ',')}{person.ratingCount ? ' · ' + person.ratingCount + ' hodnocení' : ''}</span>
                : <span style={{ color: 'rgba(255,255,255,0.85)' }}>Zatím bez hodnocení</span>}
            </span>
          </div>
        </div>
      </div>

      {/* Obsah */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 16px' }}>
        {person.card_offer && (
          <div style={cardBox}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span style={cardH}>Nabízí</span>
              {person.price && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flex: 'none', fontFamily: T.fontHead, fontSize: 13, fontWeight: 800, color: T.primary, background: T.tint, padding: '6px 11px', borderRadius: 999 }}>{_PIco.coin(T.primary)}{person.price}</span>}
            </div>
            <span style={{ fontFamily: T.fontUI, fontSize: 14, color: T.ink, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{person.card_offer}</span>
            {tags.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 2 }}>
                {tags.map((t, i) => <span key={i} style={{ fontFamily: T.fontUI, fontSize: 12, fontWeight: 700, color: T.primary, background: T.tint, padding: '7px 12px', borderRadius: 999 }}>{t}</span>)}
              </div>
            )}
          </div>
        )}

        {(person.bio || person.experience) && (
          <div style={cardBox}>
            <span style={cardH}>O mně</span>
            {person.bio && <span style={{ fontFamily: T.fontUI, fontSize: 14, color: T.ink, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{person.bio}</span>}
            {person.experience && <span style={{ fontFamily: T.fontUI, fontSize: 13, color: T.muted, marginTop: 2 }}><b style={{ color: T.ink, fontWeight: 700 }}>Zkušenost:</b> {person.experience}</span>}
          </div>
        )}

        {trust.length > 0 && (
          <div style={{ background: '#fff', border: '1px solid ' + T.border, borderRadius: 22, padding: '4px 17px' }}>
            {trust.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderTop: i ? '1px solid ' + T.border : 'none' }}>
                <span style={{ width: 34, height: 34, flex: 'none', borderRadius: 12, background: T.tint, display: 'grid', placeItems: 'center' }}>{r.ico(T.primary)}</span>
                <span style={{ flex: 1, minWidth: 0, fontFamily: T.fontUI, fontSize: 13.5, color: T.muted }}>{r.k}</span>
                <span style={{ fontFamily: T.fontHead, fontSize: 13.5, fontWeight: 700, color: T.ink }}>{r.v}</span>
              </div>
            ))}
          </div>
        )}

        {reviews.length > 0 && (
          <div style={{ ...cardBox, gap: 11 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span style={cardH}>Co říkají ostatní</span>
              {person.ratingCount > 0 && <span style={{ fontFamily: T.fontHead, fontSize: 12.5, fontWeight: 700, color: T.primary }}>Všech {person.ratingCount}</span>}
            </div>
            {reviews.slice(0, 1).map((rv, i) => (
              <div key={i} style={{ background: T.bg, borderRadius: 16, padding: '13px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                <span style={{ fontFamily: T.fontUI, fontSize: 13, color: T.ink, lineHeight: 1.5 }}>{rv.text}</span>
                <span style={{ fontFamily: T.fontUI, fontSize: 11.5, fontWeight: 600, color: T.mutedSoft }}>{rv.author}{rv.month ? ' · ' + rv.month : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ulepená lišta */}
      <div style={{ flex: 'none', background: '#fff', borderTop: '1px solid ' + T.border, padding: '14px 16px calc(16px + env(safe-area-inset-bottom))', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => { const nv = !saved; setSaved(nv); _pSetSaved(person.id, nv); }} title={saved ? 'Uloženo' : 'Uložit'} style={{ width: 54, height: 54, flex: 'none', borderRadius: 16, background: '#fff', border: '1px solid ' + T.border, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
          <svg width="16" height="19" viewBox="0 0 16 19" fill={saved ? T.primary : 'none'} aria-hidden="true"><path d="M2.4 3.2A1.8 1.8 0 0 1 4.2 1.4h7.6a1.8 1.8 0 0 1 1.8 1.8v13.4L8 13.2l-5.6 3.4V3.2Z" stroke={saved ? T.primary : T.ink} strokeWidth="1.5" strokeLinejoin="round" /></svg>
        </button>
        <button onClick={() => onContact(person)} style={{ flex: 1, height: 54, border: 'none', borderRadius: 16, background: T.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, fontFamily: T.fontHead, fontSize: 16, fontWeight: 700, color: '#fff', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
          {_PIco.chat('#fff')}Napsat
        </button>
      </div>
    </div>
  );
}

// Uložené karty lidí — zatím lokálně (jako uložené brigády).
function _pSavedSet() { try { return new Set(JSON.parse(localStorage.getItem('makej-saved-people') || '[]')); } catch (e) { return new Set(); } }
function _pIsSaved(id) { return _pSavedSet().has(id); }
function _pSetSaved(id, on) { const s = _pSavedSet(); on ? s.add(id) : s.delete(id); try { localStorage.setItem('makej-saved-people', JSON.stringify([...s])); } catch (e) {} }

// ── Potvrzení kontaktu / „Nabídni se" (demo — backend Lidé zatím neběží) ──
function WPeopleInfo({ title, text, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9200, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'wPop .3s cubic-bezier(.2,.8,.2,1)' }}>
      <div onClick={e => e.stopPropagation()} style={{ textAlign: 'center', padding: '30px 34px', maxWidth: 340 }}>
        <div style={{ width: 66, height: 66, borderRadius: 999, background: T.primary, display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>{_PIco.chat('#fff')}</div>
        <div style={{ color: '#fff', fontFamily: T.fontHead, fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>{title}</div>
        <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 13.5, marginTop: 10, lineHeight: 1.6 }}>{text}</div>
        <button onClick={onClose} style={{ marginTop: 22, padding: '12px 34px', borderRadius: 999, background: '#fff', border: 'none', color: T.ink, fontFamily: T.fontHead, fontSize: 14.5, fontWeight: 800, cursor: 'pointer' }}>Rozumím</button>
      </div>
    </div>
  );
}

// ── Moje karta (Nabídni se) — editor vlastní karty ────────────────
const _P_VZOR = 'Jednou týdně opravuju hodinky a drobnou elektroniku, rád pomůžu. Vyměním baterii, řemínek i sklíčko, u mechanik zvládnu vyčištění a seřízení. Přines to kdykoli večer.';
const _P_STITKY_NAV = ['Doučování', 'Stěhování', 'Foto/Video', 'Řemesla', 'IT', 'Gastro', 'Hudba', 'Úklid'];

// Karta se zatím ukládá lokálně (backend Lidé neběží). Až se spustí, `save`
// zapíše i do profilu (card_enabled/offer/tags) — to už je připravené.
const _P_CARD_DEF = { enabled: false, offer: '', bio: '', experience: '', priceType: 'deal', priceAmount: '', availability: [], modes: [], tags: [] };
function _pMyCard() { try { return { ..._P_CARD_DEF, ...JSON.parse(localStorage.getItem('makej-my-card') || '{}') }; } catch (e) { return { ..._P_CARD_DEF }; } }
function _pSaveMyCard(c) { try { localStorage.setItem('makej-my-card', JSON.stringify(c)); } catch (e) {} }

function WMyCard({ onClose }) {
  const init = _pMyCard();
  const [enabled, setEnabled] = useStateW(init.enabled);
  const [offer, setOffer] = useStateW(init.offer);
  const [bio, setBio] = useStateW(init.bio || W_PROFILE.bio || '');   // „O mně" sdílené s profilem
  const [experience, setExperience] = useStateW(init.experience || '');
  const [priceType, setPriceType] = useStateW(init.priceType || 'deal');
  const [priceAmount, setPriceAmount] = useStateW(init.priceAmount || '');
  const [availability, setAvailability] = useStateW(Array.isArray(init.availability) ? init.availability : []);
  const [modes, setModes] = useStateW(Array.isArray(init.modes) ? init.modes : []);
  const [tags, setTags] = useStateW(Array.isArray(init.tags) ? init.tags : []);
  const [adding, setAdding] = useStateW(false);
  const [tagInput, setTagInput] = useStateW('');
  const [saved, setSaved] = useStateW(false);
  const MAX = 240, MAXB = 500, MAXTAGS = 5;

  const addTag = t => { const s = (t || '').trim(); if (!s || tags.includes(s) || tags.length >= MAXTAGS) return; setTags([...tags, s]); };
  const removeTag = i => setTags(tags.filter((_, idx) => idx !== i));
  const toggle = (arr, set, v) => set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
  const priceStr = _pPriceStr(priceType, priceAmount);

  async function save() {
    const card = { enabled, offer: offer.slice(0, MAX), bio: bio.slice(0, MAXB), experience, priceType, priceAmount, availability, modes, tags, price: priceStr, mode: modes.join(' · ') };
    _pSaveMyCard(card);
    try { const uid = (await sb.auth.getSession()).data.session?.user?.id; if (uid) await updateProfileW(uid, { card_enabled: card.enabled, card_offer: card.offer, card_tags: card.tags, bio: card.bio }); } catch (e) {}
    setSaved(true); setTimeout(() => setSaved(false), 1600);
  }

  const name = W_PROFILE.name || W_PROFILE.full_name || 'Brigádník';
  const city = W_PROFILE.city || '';
  const rating = Number(W_PROFILE.rating) || 0;
  const verified = !!W_PROFILE.verified;
  const suggest = _P_STITKY_NAV.filter(t => !tags.includes(t)).slice(0, 4);

  const label = { fontFamily: T.fontUI, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: T.mutedSoft, margin: '4px 2px 10px' };
  const hint = { fontFamily: T.fontUI, fontSize: 12.5, color: T.mutedSoft, lineHeight: 1.5, margin: '9px 2px 0' };
  const cardBox = { background: '#fff', border: '1px solid ' + T.border, borderRadius: 20, padding: '16px 17px' };
  const chip = (opts, sel, onT, single) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {opts.map(o => { const val = Array.isArray(o) ? o[0] : o; const lab = Array.isArray(o) ? o[1] : o; const on = single ? sel === val : sel.includes(val);
        return <button key={val} onClick={() => onT(val)} style={{ padding: '9px 14px', borderRadius: 999, cursor: 'pointer', border: '1px solid ' + (on ? T.primary : T.border), background: on ? T.tint : '#fff', color: on ? T.primary : T.ink, fontFamily: T.fontHead, fontSize: 13.5, fontWeight: 700, WebkitTapHighlightColor: 'transparent' }}>{lab}</button>;
      })}
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: T.bg, display: 'flex', flexDirection: 'column', animation: 'wPop .28s cubic-bezier(.2,.8,.2,1)' }}>
      {/* Header */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '48px 16px 12px' }}>
        <button onClick={onClose} title="Zpět" style={{ width: 40, height: 40, flex: 'none', border: '1px solid ' + T.border, borderRadius: 999, background: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>{_PIco.back(T.ink)}</button>
        <span style={{ flex: 1, fontFamily: T.fontHead, fontSize: 22, fontWeight: 800, color: T.ink, letterSpacing: -0.4 }}>Moje karta</span>
        <button onClick={save} style={{ border: 'none', background: 'none', color: T.primary, fontFamily: T.fontHead, fontSize: 15.5, fontWeight: 800, cursor: 'pointer', padding: '6px 4px' }}>{saved ? 'Uloženo ✓' : 'Uložit'}</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 16px calc(28px + env(safe-area-inset-bottom))' }}>
        {/* Switch */}
        <div style={{ ...cardBox, display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <span style={{ width: 44, height: 44, flex: 'none', borderRadius: 14, background: T.tint, display: 'grid', placeItems: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7.2" fill="none" stroke={T.primary} strokeWidth="1.5" /><path d="M5.6 9.2L8 11.5 12.4 6.4" fill="none" stroke={T.primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: T.fontHead, fontSize: 15.5, fontWeight: 800, color: T.ink }}>Karta je {enabled ? 'zapnutá' : 'vypnutá'}</div>
            <div style={{ fontFamily: T.fontUI, fontSize: 12.5, color: T.muted, marginTop: 2, lineHeight: 1.4 }}>{enabled ? 'Objevíš se v tržišti a lidé ti můžou napsat' : 'V tržišti tě nikdo nevidí'}</div>
          </div>
          <button onClick={() => setEnabled(v => !v)} title="Zapnout / vypnout" style={{ width: 52, height: 30, flex: 'none', borderRadius: 999, border: 'none', cursor: 'pointer', position: 'relative', background: enabled ? T.primary : 'rgba(18,18,26,0.18)', transition: 'background .2s' }}>
            <span style={{ position: 'absolute', top: 3, left: enabled ? 25 : 3, width: 24, height: 24, borderRadius: 999, background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', transition: 'left .2s' }} />
          </button>
        </div>

        {/* Co nabízíš */}
        <div style={label}>Co nabízíš</div>
        <div style={{ ...cardBox, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea value={offer} onChange={e => setOffer(e.target.value.slice(0, MAX))} rows={3}
            placeholder="Krátce, s čím pomůžeš. Např. Opravuju hodinky — baterie, řemínky, sklíčka."
            style={{ width: '100%', border: 'none', outline: 'none', background: 'none', resize: 'vertical', fontFamily: T.fontUI, fontSize: 14.5, color: T.ink, lineHeight: 1.55 }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <button onClick={() => setOffer(_P_VZOR)} style={{ border: 'none', background: 'none', color: T.primary, fontFamily: T.fontHead, fontSize: 13.5, fontWeight: 800, cursor: 'pointer', padding: 0 }}>Vložit vzorový text</button>
            <span style={{ fontFamily: T.fontUI, fontSize: 12.5, color: offer.length >= MAX ? T.destructive : T.mutedSoft, fontWeight: 600 }}>{offer.length} / {MAX}</span>
          </div>
        </div>
        <div style={hint}>Krátká věta navrch. Detaily napiš do „O mně".</div>

        {/* O mně */}
        <div style={{ ...label, marginTop: 20 }}>O mně</div>
        <div style={{ ...cardBox, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea value={bio} onChange={e => setBio(e.target.value.slice(0, MAXB))} rows={5}
            placeholder="Napiš pár vět o sobě — kdo jsi, odkud to umíš a proč ti lidi můžou věřit. Čím víc řekneš, tím spíš si tě vyberou."
            style={{ width: '100%', border: 'none', outline: 'none', background: 'none', resize: 'vertical', fontFamily: T.fontUI, fontSize: 14.5, color: T.ink, lineHeight: 1.6 }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <span style={{ fontFamily: T.fontUI, fontSize: 12.5, color: bio.length >= MAXB ? T.destructive : T.mutedSoft, fontWeight: 600 }}>{bio.length} / {MAXB}</span>
          </div>
        </div>
        <div style={hint}>Sdílí se s tvým profilem — píšeš jen jednou. Uvidí to lidé v tvém detailu.</div>

        {/* Zkušenost */}
        <div style={{ ...label, marginTop: 20 }}>Zkušenost</div>
        <div style={cardBox}>
          <input value={experience} onChange={e => setExperience(e.target.value.slice(0, 80))}
            placeholder="Např. 4 roky v servisu / samouk, dělám to 5 let"
            style={{ width: '100%', border: 'none', outline: 'none', background: 'none', fontFamily: T.fontUI, fontSize: 14.5, color: T.ink }} />
        </div>
        <div style={hint}>Odkud to umíš — praxe, škola, koníček. Klidně stručně.</div>

        {/* Odměna */}
        <div style={{ ...label, marginTop: 20 }}>Odměna</div>
        <div style={{ ...cardBox, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {chip(_P_ODMENA, priceType, setPriceType, true)}
          {priceType === 'from' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: T.fontUI, fontSize: 14, color: T.muted }}>Od</span>
              <input value={priceAmount} onChange={e => setPriceAmount(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} inputMode="numeric" placeholder="300"
                style={{ width: 90, padding: '10px 12px', borderRadius: 12, border: '1px solid ' + T.border, outline: 'none', fontFamily: T.fontHead, fontSize: 15, fontWeight: 700, color: T.ink }} />
              <span style={{ fontFamily: T.fontHead, fontSize: 14, fontWeight: 700, color: T.ink }}>Kč</span>
            </div>
          )}
        </div>
        <div style={hint}>Ať se to neřeší v každém chatu znovu. „Dohodou" je taky v pohodě.</div>

        {/* Dostupnost */}
        <div style={{ ...label, marginTop: 20 }}>Dostupnost</div>
        <div style={cardBox}>{chip(_P_DOSTUP, availability, v => toggle(availability, setAvailability, v))}</div>
        <div style={hint}>Kdy se ti to hodí. Vyber klidně víc.</div>

        {/* Kde a jak */}
        <div style={{ ...label, marginTop: 20 }}>Kde a jak</div>
        <div style={cardBox}>{chip(_P_KDE, modes, v => toggle(modes, setModes, v))}</div>
        <div style={hint}>U tebe, u sebe, nebo online — jak to obvykle děláš.</div>

        {/* Štítky */}
        <div style={{ ...label, marginTop: 20 }}>Štítky</div>
        <div style={cardBox}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {tags.map((t, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 12px', borderRadius: 999, background: T.tint, color: T.primary, fontFamily: T.fontHead, fontSize: 13.5, fontWeight: 800 }}>
                {t}<span onClick={() => removeTag(i)} style={{ cursor: 'pointer', display: 'flex' }}><svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke={T.primary} strokeWidth="1.8" strokeLinecap="round" /></svg></span>
              </span>
            ))}
            {tags.length < MAXTAGS && !adding && (
              <button onClick={() => setAdding(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 13px', borderRadius: 999, background: 'none', border: '1px dashed ' + T.mutedSoft, color: T.muted, fontFamily: T.fontHead, fontSize: 13.5, fontWeight: 800, cursor: 'pointer' }}>{_PIco.plus(T.muted)}Přidat</button>
            )}
            {adding && (
              <input autoFocus value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); setTagInput(''); setAdding(false); } if (e.key === 'Escape') { setTagInput(''); setAdding(false); } }}
                onBlur={() => { addTag(tagInput); setTagInput(''); setAdding(false); }}
                placeholder="Štítek…" style={{ padding: '8px 13px', borderRadius: 999, border: '1px solid ' + T.primary, outline: 'none', fontFamily: T.fontUI, fontSize: 13.5, color: T.ink, width: 120 }} />
            )}
          </div>
          {suggest.length > 0 && tags.length < MAXTAGS && (
            <>
              <div style={{ height: 1, background: T.border, margin: '14px 0' }} />
              <div style={{ fontFamily: T.fontUI, fontSize: 12.5, fontWeight: 600, color: T.muted, marginBottom: 10 }}>Nejčastěji hledané</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {suggest.map(t => <button key={t} onClick={() => addTag(t)} style={{ padding: '8px 13px', borderRadius: 999, background: T.surfaceAlt, border: '1px solid ' + T.border, color: T.ink, fontFamily: T.fontHead, fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>{t}</button>)}
              </div>
            </>
          )}
        </div>
        <div style={hint}>Nejvýš pět štítků. Podle nich tě lidé najdou ve vyhledávání.</div>

        {/* Náhled */}
        <div style={{ ...label, marginTop: 20 }}>Náhled</div>
        <div style={cardBox}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ width: 48, height: 48, flex: 'none', borderRadius: 999, background: T.heroGrad, color: '#fff', display: 'grid', placeItems: 'center', fontFamily: T.fontHead, fontWeight: 800, fontSize: 16 }}>{_pInitials(name)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{_pShort(name)}</span>
                  {verified && <Icon name="verified-check-bold" size={13} color={T.primary} />}
                </span>
                {rating > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: T.fontHead, fontSize: 13, fontWeight: 800, color: T.ink }}><WStar size={13} color={T.super} />{rating.toFixed(1).replace('.', ',')}</span>}
              </div>
              <div style={{ fontFamily: T.fontUI, fontSize: 12.5, color: T.muted, marginTop: 1 }}>{city || 'Tvé město'}</div>
              <div style={{ fontFamily: T.fontUI, fontSize: 13, color: T.ink, marginTop: 6, lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{offer || 'Sem přijde tvoje nabídka…'}</div>
              {(priceStr || tags.length > 0) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {priceStr && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: T.fontHead, fontSize: 11.5, fontWeight: 800, color: T.primary, background: T.tint, padding: '5px 9px', borderRadius: 999 }}>{_PIco.coin(T.primary)}{priceStr}</span>}
                  {tags.slice(0, 1).map((t, i) => <span key={i} style={{ fontFamily: T.fontUI, fontSize: 11, fontWeight: 700, color: T.primary, background: T.tint, padding: '5px 9px', borderRadius: 999 }}>{t}</span>)}
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={hint}>Takhle tě uvidí ostatní v tržišti. Odměnu, dostupnost i „O mně" uvidí po otevření tvé karty.</div>

        {/* Info */}
        <div style={{ ...cardBox, display: 'flex', alignItems: 'flex-start', gap: 11, marginTop: 16, background: T.surfaceAlt, borderColor: 'transparent' }}>
          <span style={{ flex: 'none', display: 'flex', marginTop: 1 }}><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7.2" fill="none" stroke={T.primary} strokeWidth="1.5" /><path d="M9 8.4v4" stroke={T.primary} strokeWidth="1.6" strokeLinecap="round" /><circle cx="9" cy="5.7" r="0.9" fill={T.primary} /></svg></span>
          <span style={{ fontFamily: T.fontUI, fontSize: 12.5, color: T.muted, lineHeight: 1.5 }}>Jméno, fotka, město a hodnocení se berou z tvého profilu. Uprav je v Profilu.</span>
        </div>
      </div>
    </div>
  );
}

// ── Hlavní záložka Lidé — tržiště ──────────────────────────────────
function WPeople({ tick }) {
  const [people, setPeople] = useStateW([]);
  const [loading, setLoading] = useStateW(true);
  const [search, setSearch] = useStateW('');
  const [cat, setCat] = useStateW('vse');
  const [detailPerson, setDetailPerson] = useStateW(null);
  const [info, setInfo] = useStateW(null);               // { title, text }
  const [showCard, setShowCard] = useStateW(false);      // editor „Moje karta"

  useEffectW(() => {
    let live = true;
    (async () => {
      setLoading(true);
      let cards = [];
      try { cards = await fetchPeopleCardsW([]); } catch (e) { cards = []; }
      if (!cards || cards.length === 0) cards = _pDemoPeople();
      if (live) { setPeople(cards); setLoading(false); }
    })();
    return () => { live = false; };
  }, [tick]);

  const q = _pNorm(search.trim());
  const catDef = _P_KATEGORIE.find(c => c.key === cat);
  let filtered = people.filter(p => {
    const hay = _pNorm([p.name, p.card_offer, (p.card_tags || []).join(' '), (p.skills || []).join(' '), p.city].filter(Boolean).join(' '));
    if (q && !hay.includes(q)) return false;
    if (catDef && catDef.kw && !catDef.kw.some(k => hay.includes(k))) return false;
    return true;
  });
  filtered = [...filtered].sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));

  function contact(person) {
    // Backend Lidé zatím neběží → ukázka. Až se spustí: createPeopleMatchW + chat.
    setDetailPerson(null);
    setInfo({ title: 'Napsat ' + _pShort(person.name).split(' ')[0], text: 'Až se Lidé spustí naživo, tímhle se rovnou otevře chat. Teď je to ukázka rozhraní.' });
  }
  function openCard() { setShowCard(true); }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>

      {/* Hlavička tržiště */}
      <div style={{ flexShrink: 0, padding: '52px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontFamily: T.fontHead, fontSize: 27, fontWeight: 900, color: T.ink, letterSpacing: -0.8 }}>Lidé</span>
          <button onClick={openCard} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: T.primary, color: '#fff', fontFamily: T.fontHead, fontSize: 13.5, fontWeight: 700, border: 'none', padding: '11px 16px', borderRadius: 14, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>{_PIco.plus('#fff')}Nabídni se</button>
        </div>

        <WPeopleSearch value={search} onChange={e => setSearch(e.target.value)} />

        <div className="wfilter-strip" style={{ display: 'flex', gap: 7, overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', margin: '0 -16px', padding: '0 16px' }}>
          {_P_KATEGORIE.map(c => {
            const on = cat === c.key;
            return <button key={c.key} onClick={() => setCat(c.key)} style={{ flex: 'none', border: 'none', fontFamily: T.fontUI, fontSize: 13, fontWeight: 700, color: on ? '#fff' : T.primary, background: on ? T.primary : T.tint, padding: '9px 15px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap', WebkitTapHighlightColor: 'transparent' }}>{c.label}</button>;
          })}
        </div>

        <div style={{ fontFamily: T.fontUI, fontSize: 13, fontWeight: 600, color: T.muted }}>{filtered.length} {_wPlural(filtered.length, 'člověk v okolí', 'lidé v okolí', 'lidí v okolí')}</div>
      </div>

      {/* Mřížka lidí */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px calc(20px + env(safe-area-inset-bottom))' }}>
        {loading ? (
          <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 13.5, textAlign: 'center', padding: '40px 0' }}>Načítám…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '46px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 60, height: 60, borderRadius: 999, background: T.tint, display: 'grid', placeItems: 'center' }}><Icon name="users-group-rounded-bold" size={26} color={T.primary} /></div>
            <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 16, fontWeight: 800 }}>Zatím tu nikdo takový není</div>
            <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 13, lineHeight: 1.5 }}>Zkus jiné hledání nebo kategorii — nebo <button onClick={openCard} style={{ border: 'none', background: 'none', color: T.primary, fontWeight: 800, cursor: 'pointer', padding: 0, fontFamily: T.fontHead, fontSize: 13 }}>buď první</button>.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {filtered.map(p => <WPersonGridCard key={p.id} person={p} onTap={() => setDetailPerson(p)} />)}
          </div>
        )}
      </div>

      {detailPerson && <WPersonDetail person={detailPerson} onClose={() => setDetailPerson(null)} onContact={contact} />}
      {info && <WPeopleInfo title={info.title} text={info.text} onClose={() => setInfo(null)} />}
      {showCard && <WMyCard onClose={() => setShowCard(false)} />}
    </div>
  );
}
