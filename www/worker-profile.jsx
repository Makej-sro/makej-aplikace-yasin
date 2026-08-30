// Makej Worker — Profile (mobilní design, App Store build)

// ── Jméno na profilu ────────────────────────────────────────────
// Tabulka profiles má jen jeden sloupec `name`. V editaci ho rozložíme do
// kolonek (titul, jméno, druhé jméno, příjmení, rodné příjmení) a při uložení
// zase složíme do jednoho řádku „Titul Jméno Druhé Příjmení [(roz. Rodné)]".
// Zobrazený profil pak čte pořád jen ten jeden řádek — vše na jednom místě.
const _W_TITULY = [
  '',
  // Před jménem — bakalářské a magisterské
  'Bc.', 'BcA.', 'Ing.', 'Ing. arch.', 'Mgr.', 'MgA.',
  // Před jménem — doktorské („malý doktorát")
  'MUDr.', 'MDDr.', 'MVDr.', 'JUDr.', 'PhDr.', 'RNDr.', 'PharmDr.',
  'ThLic.', 'ThDr.', 'ThMgr.', 'PaedDr.', 'PhMr.', 'RSDr.', 'Dr.',
  // Před jménem — vědecko-pedagogické
  'doc.', 'prof.',
  // Za jménem — doktorské a vědecké hodnosti
  'Ph.D.', 'Th.D.', 'CSc.', 'DrSc.', 'DSc.',
  // Za jménem — vyšší odborné a mezinárodní / profesní
  'DiS.', 'MBA', 'LL.M.', 'MSc.',
];

// Bez diakritiky — pro našeptávání i porovnání se seznamem sprostých slov.
function _bezDiakritiky(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Během psaní jen ořízne délku a zjevné nesmysly (čísla, emoji, symboly).
// Na výsledný titul se ale stejně bere jen to, co je v seznamu (viz WTitulPicker).
const _W_TITUL_MAX = 16;
function _wCistTitul(s) {
  return (s || '').replace(/[^\p{L}. ]/gu, '').replace(/\s+/g, ' ').replace(/^\s+/, '').slice(0, _W_TITUL_MAX);
}

// Platný titul = prázdný (žádný) nebo přesně ze seznamu (bez ohledu na diakritiku).
// Neplatný drží pole červené a nepustí uložení, dokud se neopraví.
function _wPlatnyTitul(v) {
  const s = (v || '').trim();
  if (!s) return true;
  const low = _bezDiakritiky(s.toLowerCase());
  return _W_TITULY.some(t => t && _bezDiakritiky(t.toLowerCase()) === low);
}

// Srovná titul na oficiální tvar ze seznamu („mudr." → „MUDr.").
function _wNormTitul(v) {
  const s = (v || '').trim();
  if (!s) return '';
  const low = _bezDiakritiky(s.toLowerCase());
  return _W_TITULY.find(t => t && _bezDiakritiky(t.toLowerCase()) === low) || s;
}

// Telefonní předvolby — celá EU + Ukrajina (občané EU smějí v ČR pracovat bez
// povolení; Ukrajinci jsou na brigádách taky hodně). Nejčastější nahoře.
const _W_PREDVOLBY = [
  { kod: '+420', vlajka: '🇨🇿' }, { kod: '+421', vlajka: '🇸🇰' },
  { kod: '+380', vlajka: '🇺🇦' }, { kod: '+48', vlajka: '🇵🇱' },
  { kod: '+32', vlajka: '🇧🇪' }, { kod: '+359', vlajka: '🇧🇬' },
  { kod: '+45', vlajka: '🇩🇰' }, { kod: '+372', vlajka: '🇪🇪' },
  { kod: '+358', vlajka: '🇫🇮' }, { kod: '+33', vlajka: '🇫🇷' },
  { kod: '+385', vlajka: '🇭🇷' }, { kod: '+353', vlajka: '🇮🇪' },
  { kod: '+39', vlajka: '🇮🇹' }, { kod: '+357', vlajka: '🇨🇾' },
  { kod: '+370', vlajka: '🇱🇹' }, { kod: '+371', vlajka: '🇱🇻' },
  { kod: '+352', vlajka: '🇱🇺' }, { kod: '+36', vlajka: '🇭🇺' },
  { kod: '+356', vlajka: '🇲🇹' }, { kod: '+49', vlajka: '🇩🇪' },
  { kod: '+31', vlajka: '🇳🇱' }, { kod: '+351', vlajka: '🇵🇹' },
  { kod: '+43', vlajka: '🇦🇹' }, { kod: '+40', vlajka: '🇷🇴' },
  { kod: '+30', vlajka: '🇬🇷' }, { kod: '+386', vlajka: '🇸🇮' },
  { kod: '+34', vlajka: '🇪🇸' }, { kod: '+46', vlajka: '🇸🇪' },
];
function _wRozlozTel(p) {
  const s = (p || '').trim();
  // Nejdřív delší předvolby, ať kratší omylem nezabere delší číslo
  const podle = _W_PREDVOLBY.map(x => x.kod).sort((a, b) => b.length - a.length);
  for (let i = 0; i < podle.length; i++) {
    if (s.startsWith(podle[i])) return { predvolba: podle[i], cislo: s.slice(podle[i].length).trim() };
  }
  return { predvolba: '+420', cislo: s };
}

function _wSlozJmeno(f) {
  const jadro = [f.titul, f.jmeno, f.druhe, f.prijmeni]
    .map(x => (x || '').trim()).filter(Boolean).join(' ');
  const za    = (f.titulZa || '').trim();
  const rodne = (f.rodne || '').trim();
  let out = jadro;
  if (za)    out += (out ? ', ' : '') + za;          // „Novák, Ph.D."
  if (rodne) out += (out ? ' ' : '') + '(roz. ' + rodne + ')';
  return out;
}

function _wRozlozJmeno(cele) {
  const out = { titul: '', titulZa: '', jmeno: '', druhe: '', prijmeni: '', rodne: '' };
  let s = (cele || '').trim();
  const m = s.match(/\(roz\.?\s*([^)]+)\)\s*$/i);   // „(roz. X)" na konci
  if (m) { out.rodne = m[1].trim(); s = s.slice(0, m.index).trim(); }
  // Titul za jménem: „, Ph.D." na konci (musí být ze seznamu)
  const mz = s.match(/,\s*([^,]+)$/);
  if (mz && _W_TITULY.includes(mz[1].trim())) { out.titulZa = mz[1].trim(); s = s.slice(0, mz.index).trim(); }
  const casti = s.split(/\s+/).filter(Boolean);
  // Titul může být jedno- i dvouslovný („Ing. arch."), nebo vlastní — ten
  // poznáme podle tečky na konci (běžné české tituly ji mají), ať se po
  // znovuotevření nesloučí do jména. Vždy necháme aspoň příjmení.
  if (casti.length >= 2 && _W_TITULY.includes(casti[0] + ' ' + casti[1])) {
    out.titul = casti.shift() + ' ' + casti.shift();
  } else if (casti.length && _W_TITULY.includes(casti[0])) {
    out.titul = casti.shift();
  } else {
    const t = [];
    while (casti.length > 1 && /\.$/.test(casti[0])) t.push(casti.shift());
    if (t.length) out.titul = t.join(' ');
  }
  if (casti.length) out.jmeno = casti.shift();
  if (casti.length) out.prijmeni = casti.pop();     // poslední slovo = příjmení
  if (casti.length) out.druhe = casti.join(' ');    // co zbylo mezi = druhé jméno
  return out;
}

// Políčko titulu s našeptáváním. Přijme jen titul ze seznamu — cokoli jiného
// (překlep, vymyšlené, vulgarita) se při opuštění pole zahodí. Používá se
// dvakrát: „Titul před" jménem a „Titul za" jménem.
function WTitulPicker({ value, onChange, placeholder, obal, shakeSignal }) {
  const [open,  setOpen]  = useStateW(false);
  const [chyba, setChyba] = useStateW(false);   // dotčeno a pořád neplatné → drž červené
  const [chvej, setChvej] = useStateW(false);   // jednorázové cuknutí
  const q = _bezDiakritiky((value || '').trim().toLowerCase());
  const navrhy = _W_TITULY.filter(Boolean).filter(t => _bezDiakritiky(t.toLowerCase()).startsWith(q));

  // Když se pokusíš uložit s neplatným titulem, rodič šťouchne přes shakeSignal
  useEffectW(() => {
    if (shakeSignal && !_wPlatnyTitul(value)) { setChyba(true); setChvej(true); }
  }, [shakeSignal]);

  function zkontroluj() {
    setOpen(false);
    const raw = (value || '').trim();
    if (!raw) { onChange(''); setChyba(false); return; }
    const low = _bezDiakritiky(raw.toLowerCase());
    const presne = _W_TITULY.find(t => t && _bezDiakritiky(t.toLowerCase()) === low);
    const zacina = _W_TITULY.filter(Boolean).filter(t => _bezDiakritiky(t.toLowerCase()).startsWith(low));
    const v = presne || (zacina.length === 1 ? zacina[0] : null);
    if (v) { onChange(v); setChyba(false); }
    // Neplatné → nech napsané, zčervenej a zatřes; červená zůstane, než se opraví
    else   { setChyba(true); setChvej(true); }
  }

  return (
    <div style={{ position: 'relative', ...(obal || {}) }}>
      <input value={value}
        onFocus={() => setOpen(true)}
        onBlur={zkontroluj}
        onAnimationEnd={() => setChvej(false)}
        onChange={e => { const nv = _wCistTitul(e.target.value); onChange(nv); setOpen(true); if (_wPlatnyTitul(nv)) setChyba(false); }}
        placeholder={placeholder}
        style={{ ...fieldStyle, width: '100%',
          border: '1px solid ' + (chyba ? T.destructive : T.border),
          background: chyba ? 'rgba(226,86,74,0.07)' : '#fff',
          color: chyba ? T.destructive : T.ink,
          animation: chvej ? 'wShake .45s ease' : 'none',
        }} />
      {open && navrhy.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 30,
          minWidth: '100%', width: 176, background: '#fff', border: '1px solid ' + T.border,
          borderRadius: 12, boxShadow: '0 12px 30px rgba(16,24,64,0.18)',
          maxHeight: 220, overflowY: 'auto', padding: 4,
        }}>
          {navrhy.map(t => (
            <div key={t}
              onMouseDown={e => { e.preventDefault(); onChange(t); setOpen(false); setChyba(false); }}
              style={{ padding: '9px 12px', borderRadius: 8, cursor: 'pointer', color: T.ink, fontFamily: T.fontUI, fontSize: 14, WebkitTapHighlightColor: 'transparent' }}>
              {t}
            </div>
          ))}
        </div>
      )}
      {chyba && <div style={{ color: T.destructive, fontFamily: T.fontUI, fontSize: 12, marginTop: 6 }}>Vyber titul ze seznamu.</div>}
    </div>
  );
}

// Datum narození ve stejném stylu jako výběr v Kalendáři — tři vodorovná
// „kolečka" (WWheel z worker-calendar) den · měsíc · rok, roluješ do středu.
// (_W_MESICE se sdílí s výpisem měsíců níž v souboru.)
const _W_ROKY = (() => {
  const letos = new Date().getFullYear();
  const a = [];
  for (let r = letos; r >= 1920; r--) a.push(r);   // od nejnovějšího
  return a;
})();
function _wRozlozDatum(v) {
  const mm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
  return mm ? { y: +mm[1], m: +mm[2] - 1, d: +mm[3] } : { y: 2005, m: 0, d: 1 };
}
function _wFmtDatum(v) {
  const mm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
  return mm ? (+mm[3] + '. ' + (+mm[2]) + '. ' + mm[1]) : '';
}

// Přepínač (on/off) ve stylu Nastavení — pro řidičák a auto.
const _wPrepinac = on => ({
  width: 48, height: 28, borderRadius: 999, flexShrink: 0, cursor: 'pointer', position: 'relative',
  background: on ? T.primary : 'rgba(18,18,26,0.18)', border: 'none', transition: 'background .2s',
});
const _wPrepinacKnob = on => ({
  position: 'absolute', top: 3, left: on ? 23 : 3, width: 22, height: 22, borderRadius: 999,
  background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', transition: 'left .2s',
});

function WDatumPicker({ value, onChange, row }) {
  const [open, setOpen] = useStateW(false);
  const [dmy, setDmy]   = useStateW(() => _wRozlozDatum(value));
  const ref = useRefW(null);
  useEffectW(() => { setDmy(_wRozlozDatum(value)); }, [value]);
  useEffectW(() => {
    if (!open) return;
    // Zavře jen KLEPNUTÍ mimo (click). Tažení prstem (scroll) klik nevyvolá,
    // takže se dá scrollovat a picker zůstane otevřený a posouvá se se stránkou.
    const onClick = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [open]);

  const dniVMesici = new Date(dmy.y, dmy.m + 1, 0).getDate();
  const DNY = [];
  for (let d = 1; d <= dniVMesici; d++) DNY.push(d);

  function zmen(nove) {
    const next = { ...dmy, ...nove };
    const dim = new Date(next.y, next.m + 1, 0).getDate();
    if (next.d > dim) next.d = dim;   // 31. → kratší měsíc → sklouzni na poslední den
    setDmy(next);
    onChange(next.y + '-' + String(next.m + 1).padStart(2, '0') + '-' + String(next.d).padStart(2, '0'));
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {row ? (
        <button onClick={() => setOpen(o => !o)} style={{
          display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          fontFamily: T.fontHead, fontWeight: 800, fontSize: 16, color: value ? T.ink : T.mutedSoft, WebkitTapHighlightColor: 'transparent',
        }}>
          <span>{value ? _wFmtDatum(value) : 'Vybrat'}</span>
          <svg width="8" height="13" viewBox="0 0 8 13" fill="none" stroke={T.mutedSoft} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1.5 1.5 6.5 6.5 1.5 11.5" /></svg>
        </button>
      ) : (
        <button onClick={() => setOpen(o => !o)} style={{
          ...fieldStyle, width: '100%', textAlign: 'left', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 9, color: value ? T.ink : T.mutedSoft,
        }}>
          <Icon name="calendar-bold" size={17} color={value ? T.primary : T.mutedSoft} />
          <span style={{ flex: 1 }}>{value ? _wFmtDatum(value) : 'Vyber datum narození'}</span>
        </button>
      )}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', zIndex: 61, marginTop: 10, padding: '10px 0 12px',
          ...(row ? { right: 0, left: 'auto', width: 'min(300px, 80vw)' } : { left: 0, right: 0 }),
          background: '#fff', border: '1px solid ' + T.border, borderRadius: 18,
          boxShadow: '0 18px 40px -14px rgba(20,22,40,0.28)',
          animation: 'wPop .18s cubic-bezier(.2,.8,.2,1)', overflow: 'hidden',
        }}>
          {/* Den se přemountuje při změně měsíce/roku, ať se srovná na platný počet dnů */}
          <WWheel key={'den-' + dmy.y + '-' + dmy.m} items={DNY} index={dmy.d - 1} itemW={62} onIndex={i => zmen({ d: i + 1 })} />
          <div style={{ height: 1, background: T.border, margin: '8px 14px' }} />
          <WWheel items={_W_MESICE} index={dmy.m} itemW={116} onIndex={i => zmen({ m: i })} />
          <div style={{ height: 1, background: T.border, margin: '8px 14px' }} />
          <WWheel items={_W_ROKY} index={Math.max(0, _W_ROKY.indexOf(dmy.y))} itemW={86} onIndex={i => zmen({ y: _W_ROKY[i] })} />
        </div>
      )}
    </div>
  );
}

// ── Vzdělání: stupeň + obor (výběr ze seznamu). Skládá se do jednoho pole `education`
//    ve tvaru „Stupeň — Obor" (žádná změna DB, stejný princip jako u jména).
const _W_STUPNE = [
  'Základní',
  'Střední odborné (výuční list)',
  'Středoškolské s maturitou',
  'Vyšší odborné (VOŠ)',
  'Vysokoškolské (Bc.)',
  'Vysokoškolské (Ing./Mgr.)',
  'Vysokoškolské (Ph.D.)',
];
const _W_OBORY = [
  'Gastronomie a pohostinství',
  'Obchod a služby',
  'Ekonomie a administrativa',
  'IT a programování',
  'Technika a strojírenství',
  'Elektrotechnika',
  'Stavebnictví',
  'Doprava a logistika',
  'Zdravotnictví a péče',
  'Sociální práce',
  'Pedagogika',
  'Právo a veřejná správa',
  'Marketing a média',
  'Umění a design',
  'Cestovní ruch',
  'Zemědělství a potravinářství',
  'Kadeřnictví a kosmetika',
  'Bezpečnost',
  'Přírodní vědy',
  'Humanitní obory',
  'Jiný obor',
];
function _wSlozVzdelani(stupen, obor) {
  return [stupen, obor].filter(Boolean).join(' — ');
}
function _wRozlozVzdelani(text) {
  const t = (text || '').trim();
  if (!t) return { stupen: '', obor: '' };
  const parts = t.split(' — ');
  const stupen = _W_STUPNE.includes(parts[0]) ? parts[0] : '';
  const obor = _W_OBORY.includes(parts[1]) ? parts[1]
             : (!stupen && _W_OBORY.includes(parts[0]) ? parts[0] : '');
  return { stupen, obor };
}

// Univerzální výběr ze seznamu (klepnu → rozbalí se seznam, vyberu jednu položku).
// Bez blokujícího překryvu: klepnutí mimo NEBO posun prstem po stránce roletku zavře,
// takže se dá normálně scrollovat. Scroll uvnitř samotného seznamu ji nezavře.
function WVyberPicker({ value, onChange, items, placeholder }) {
  const [open, setOpen] = useStateW(false);
  const ref = useRefW(null);
  useEffectW(() => {
    if (!open) return;
    // Zavře jen KLEPNUTÍ mimo (click). Tažení prstem (scroll) klik nevyvolá,
    // takže se dá scrollovat a roletka zůstane otevřená a posouvá se se stránkou.
    const onClick = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        ...fieldStyle, width: '100%', textAlign: 'left', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 9, color: value ? T.ink : T.mutedSoft,
      }}>
        <span style={{ flex: 1 }}>{value || placeholder}</span>
        <span style={{ color: T.mutedSoft, fontSize: 12, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 61, marginTop: 10,
          background: '#fff', border: '1px solid ' + T.border, borderRadius: 16,
          boxShadow: '0 18px 40px -14px rgba(20,22,40,0.28)',
          animation: 'wPop .18s cubic-bezier(.2,.8,.2,1)', overflow: 'hidden',
          maxHeight: 264, overflowY: 'auto',
        }}>
          {items.map(it => (
            <button key={it} onClick={() => { onChange(it === value ? '' : it); setOpen(false); }} style={{
              display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', border: 'none',
              background: it === value ? 'rgba(18,18,26,0.05)' : 'transparent', cursor: 'pointer',
              fontFamily: T.fontUI, fontSize: 14.5, fontWeight: it === value ? 800 : 500,
              color: it === value ? T.primary : T.ink,
            }}>{it}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function WProfile({ tick, onSignOut, onGoTab, onClose }) {
  const [editing, setEditing] = useStateW(false);
  const [saving,  setSaving]  = useStateW(false);
  const [form,    setForm]    = useStateW({ titul: '', titulZa: '', jmeno: '', druhe: '', prijmeni: '', rodne: '', datum: '', kraj: '', mesto: '', telPredvolba: '+420', telCislo: '', email: '', ridicak: false, auto: false, bio: '', skills: [], stupen: '', obor: '', cv_url: '' });
  const [uctuEmail, setUctuEmail] = useStateW('');   // přihlašovací e-mail (fallback do kontaktu)
  const [skillInput, setSkillInput] = useStateW('');
  const [titulShake, setTitulShake] = useStateW(0);   // šťouchnutí do polí titulu při zablokovaném uložení
  const [avatarPreview, setAvatarPreview] = useStateW('');   // náhled právě vybrané fotky (data URL)
  const [fotoMenu, setFotoMenu] = useStateW(false);          // spodní list Vyfotit / Galerie
  const [rozsireneOpen, setRozsireneOpen] = useStateW(false);// rozbalený rozšířený profil
  const [overitOpen, setOveritOpen] = useStateW(null);       // 'email' | 'phone' | null — spodní list s kódem
  const [kod, setKod] = useStateW('');                       // zadávaný ověřovací kód
  const [overStav, setOverStav] = useStateW('');             // '' | 'posilam' | 'cekam' | 'overuji' | 'ok' | 'chyba'
  const [overChyba, setOverChyba] = useStateW('');
  const [overene, setOverene] = useStateW({ email: '', tel: '' });   // co bylo ověřeno kódem v této session
  function otevritOvereni(ktere) {
    setOveritOpen(ktere); setKod(''); setOverChyba(''); setOverStav('');
    if (ktere === 'email') poslatKodEmail();
  }
  async function poslatKodEmail() {
    if (typeof sb === 'undefined' || !form.email.trim()) return;
    setOverStav('posilam'); setOverChyba('');
    try {
      const { error } = await sb.auth.signInWithOtp({ email: form.email.trim(), options: { shouldCreateUser: false } });
      if (error) throw error;
      setOverStav('cekam');
    } catch (e) { setOverStav('chyba'); setOverChyba('Kód se nepodařilo poslat. Zkontroluj e-mail a zkus to za chvíli.'); }
  }
  async function overitKodEmail() {
    if (typeof sb === 'undefined' || kod.trim().length < 4) return;
    setOverStav('overuji'); setOverChyba('');
    try {
      const { error } = await sb.auth.verifyOtp({ email: form.email.trim(), token: kod.trim(), type: 'email' });
      if (error) throw error;
      setOverene(o => ({ ...o, email: form.email.trim().toLowerCase() }));
      setOverStav('ok');
      setTimeout(() => { setOveritOpen(null); setKod(''); setOverStav(''); }, 1000);
    } catch (e) { setOverStav('chyba'); setOverChyba('Kód nesedí nebo vypršel. Zkus to znovu.'); }
  }
  const galerieRef = useRefW(null);
  const kameraRef  = useRefW(null);
  function nactiFotku(e) {
    const f = e.target.files && e.target.files[0];
    setFotoMenu(false);
    if (f) {
      const r = new FileReader();
      r.onload = () => {
        // Zmenšit na max 512 px (JPEG) — fotka z mobilu má klidně 5 MB, jako
        // data URL by to appku zbytečně sekalo. Malý čtvereček avataru bohatě stačí.
        const img = new Image();
        img.onload = () => {
          const max = 512;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          let url; try { url = c.toDataURL('image/jpeg', 0.85); } catch (er) { url = r.result; }
          setAvatarPreview(url); setForm(fm => ({ ...fm, avatar: url }));
        };
        img.onerror = () => { setAvatarPreview(r.result); setForm(fm => ({ ...fm, avatar: r.result })); };
        img.src = r.result;
      };
      r.readAsDataURL(f);
    }
    e.target.value = '';   // ať jde vybrat tutéž fotku znovu
  }
  const [userId,  setUserId]  = useStateW(null);
  const [showAllReviews, setShowAllReviews] = useStateW(false);
  const [reviewsPageOpen, setReviewsPageOpen] = useStateW(false);
  const [earningsOpen, setEarningsOpen]       = useStateW(false);
  const [trustOpen, setTrustOpen]             = useStateW(false);
  const [savedOpen, setSavedOpen]             = useStateW(false);
  const savedCount = _wSavedList().length;
  const [notifsOn, setNotifsOn] = useStateW(() => (typeof localStorage === 'undefined' || localStorage.getItem('makej-notifs') !== 'off'));
  const [soundOn, setSoundOn] = useStateW(() => (typeof localStorage === 'undefined' || localStorage.getItem('makej-notif-sound') !== 'off'));
  const [zajemOn, setZajemOn] = useStateW(() => (typeof localStorage === 'undefined' || localStorage.getItem('makej-hide-zajem') !== '1'));   // potvrzení „Zájem odeslán" po přijetí
  const [confirmDel, setConfirmDel] = useStateW(false);
  const [deleting, setDeleting] = useStateW(false);
  const [delPassword, setDelPassword] = useStateW('');   // heslo pro potvrzení smazání
  const [delErr, setDelErr] = useStateW('');

  function toggleNotifs() {
    setNotifsOn(v => {
      const nv = !v;
      try { localStorage.setItem('makej-notifs', nv ? 'on' : 'off'); } catch (e) {}
      return nv;
    });
  }
  function toggleSound() {
    setSoundOn(v => {
      const nv = !v;
      try { localStorage.setItem('makej-notif-sound', nv ? 'on' : 'off'); } catch (e) {}
      // Po zapnutí rovnou přehraj ukázku — uživatel slyší, co si zapnul
      if (nv && typeof wPlayBell === 'function') wPlayBell();
      return nv;
    });
  }
  function toggleZajem() {
    setZajemOn(v => {
      const nv = !v;   // zapnuto = potvrzení se ukazuje (flag NENÍ '1')
      try { localStorage.setItem('makej-hide-zajem', nv ? '0' : '1'); } catch (e) {}
      return nv;
    });
  }
  async function handleDeleteAccount() {
    if (deleting) return;
    const pw = (delPassword || '').trim();
    if (!pw) { setDelErr('Pro potvrzení zadej svoje heslo.'); return; }
    setDeleting(true);
    setDelErr('');
    // 1) Ověř heslo — re-přihlášení stejným účtem. Špatné heslo = konec.
    const { data: { session } } = await sb.auth.getSession();
    const email = session?.user?.email || uctuEmail || W_PROFILE.email || '';
    const { error: pwErr } = await sb.auth.signInWithPassword({ email, password: pw });
    if (pwErr) {
      setDeleting(false);
      setDelErr('Nesprávné heslo. Zkus to znovu.');
      return;
    }
    // 2) Heslo sedí → smaž účet (RPC delete_my_account) a odhlas.
    const { error } = await sb.rpc('delete_my_account');
    if (error) { setDeleting(false); setDelErr('Účet se nepodařilo smazat. Zkus to prosím znovu.'); return; }
    await sb.auth.signOut();
    window.location.href = '/';
  }

  useEffectW(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
      const em = session?.user?.email || '';
      setUctuEmail(em);
      // Když profil nemá vyplněný e-mail, předvyplň ten z účtu
      if (em) setForm(f => f.email ? f : { ...f, email: W_PROFILE.email || em });
    });
  }, []);

  // Formulář se plní z uloženého profilu — a přesně sem se vrací i „Zrušit".
  // Jeden řádek `name` se rozloží do kolonek jména.
  function formZProfilu() {
    const j = _wRozlozJmeno(W_PROFILE.name || W_PROFILE.full_name || '');
    const vz = _wRozlozVzdelani(W_PROFILE.education);
    return {
      titul: j.titul, titulZa: j.titulZa, jmeno: j.jmeno, druhe: j.druhe, prijmeni: j.prijmeni, rodne: j.rodne,
      datum: (W_PROFILE.birth_date || '').slice(0, 10),
      kraj:  W_PROFILE.kraj || '',
      mesto: W_PROFILE.city || '',
      telPredvolba: _wRozlozTel(W_PROFILE.phone).predvolba,
      telCislo:     _wRozlozTel(W_PROFILE.phone).cislo,
      email:   W_PROFILE.email || '',
      ridicak: !!W_PROFILE.drivers_license,
      auto:    !!W_PROFILE.has_car,
      bio:  W_PROFILE.bio  || '',
      skills: Array.isArray(W_PROFILE.skills) ? [...W_PROFILE.skills] : [],
      stupen: vz.stupen, obor: vz.obor,
      cv_url: W_PROFILE.cv_url || '',
    };
  }

  useEffectW(() => { setForm(formZProfilu()); }, [tick]);

  function addSkill() {
    const s = skillInput.trim();
    if (!s || form.skills.includes(s)) { setSkillInput(''); return; }
    setForm(f => ({ ...f, skills: [...f.skills, s] }));
    setSkillInput('');
  }
  function removeSkill(idx) {
    setForm(f => ({ ...f, skills: f.skills.filter((_, i) => i !== idx) }));
  }

  async function handleSave() {
    if (!userId || saving) return;
    // Špatně vyplněný titul nepustí uložit — políčka zčervenají a cuknou, čeká se na opravu
    if (!_wPlatnyTitul(form.titul) || !_wPlatnyTitul(form.titulZa)) {
      setTitulShake(n => n + 1);
      return;
    }
    setSaving(true);
    const norm = { ...form, titul: _wNormTitul(form.titul), titulZa: _wNormTitul(form.titulZa) };
    await updateProfileW(userId, {
      name: _wSlozJmeno(norm), bio: form.bio,
      birth_date: form.datum || null,
      kraj: form.kraj || null,
      city: form.mesto.trim() || null,
      email: form.email.trim() || null,
      phone: form.telCislo.trim() ? (form.telPredvolba + ' ' + form.telCislo.trim()) : null,
      drivers_license: form.ridicak,
      has_car: form.auto,
      skills: form.skills, education: _wSlozVzdelani(form.stupen, form.obor),
      cv_url: form.cv_url.trim(),
    });
    // Fotku zatím jen do zobrazení (session) — reálné nahrání do úložiště je backend krok.
    if (avatarPreview) W_PROFILE.avatar_url = avatarPreview;
    setSaving(false);
    setEditing(false);
  }

  // Zrušit — zahodí rozdělané změny (vrátí formulář na uložený stav) a zavře úpravy.
  // Zobrazený profil čte z W_PROFILE, takže se nic neuloženého nikam nepromítne.
  function handleCancel() {
    setForm(formZProfilu());
    setSkillInput('');
    setEditing(false);
  }

  const name    = W_PROFILE.name || W_PROFILE.full_name || 'Brigádník';
  const bio     = W_PROFILE.bio   || '';
  const avatarUrl = W_PROFILE.avatar_url || '';
  const initials = name.split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '?';

  const skills    = Array.isArray(W_PROFILE.skills) ? W_PROFILE.skills : [];
  const education = W_PROFILE.education || '';
  const cvUrl     = W_PROFILE.cv_url || '';
  const rating  = Number(W_PROFILE.rating)  || 0;
  const trust   = makejTrust({ ...W_TRUST, hodnoceni: rating });
  // Počty i výdělek se počítají z odpracovaných brigád, ne z předpočítaných
  // sloupců v profilu — jinak by hlavní číslo nesedělo s rozpisem ve statistikách.
  const vyd     = makejVydelky(W_HISTORY);
  const reviews = Array.isArray(W_REVIEWS) ? W_REVIEWS : [];

  const cardShadow = '0 4px 20px rgba(0,32,246,0.06)';
  // Jeden tvar pro všechny velké karty. Dřív jich tu bylo osm různých zaoblení
  // (12 až 24 px) a každá karta jiné odsazení — profil kvůli tomu nedržel pohromadě.
  // Systém: velká karta 20, malá dlaždice 16, pilulka 999.
  const KARTA = { background: '#fff', borderRadius: 20, boxShadow: cardShadow, padding: '18px 20px' };

  // „Doplň profil" — co ještě chybí. Karta se schová, jakmile je vše hotové.
  const todoItems = [
    { key: 'bio',    done: !!bio,          title: 'Napiš o sobě pár vět', note: 'Co umíš a kdy můžeš' },
    { key: 'skills', done: skills.length > 0, title: 'Přidej dovednosti', note: 'Pokladna, řidičák B, angličtina…' },
    { key: 'edu',    done: !!education,     title: 'Doplň vzdělání',       note: 'Stupeň a obor' },
  ];
  const todoLeft = todoItems.filter(t => !t.done).length;
  const heroMeta = W_PROFILE.city ? W_PROFILE.city : 'Doplň si profil';

  // „Ověřeno" u kontaktů: platí, dokud se hodnota shoduje s uloženou (= potvrzenou).
  // Po změně čísla/e-mailu odznak zmizí (reálně se pak pošle ověřovací kód).
  const curTel = form.telCislo.trim() ? (form.telPredvolba + ' ' + form.telCislo.trim()) : '';
  const telOvereno = !!curTel && curTel === overene.tel;   // reálně až přes SMS kód (zatím placeholder)
  const emailNorm = form.email.trim().toLowerCase();
  // E-mail účtu je potvrzený už z registrace → rovnou „Ověřeno". Jiný e-mail se ověří kódem.
  const emailOvereno = !!emailNorm && (emailNorm === (uctuEmail || '').trim().toLowerCase() || emailNorm === overene.email);

  return (
    <div style={{ flex: 1, overflowY: 'auto', marginTop: editing ? 0 : 'calc(-1 * env(safe-area-inset-top))' }}>
      <div style={{ maxWidth: 460, margin: '0 auto', width: '100%', padding: '24px 20px calc(28px + env(safe-area-inset-bottom))' }}>

        {editing ? (
          /* ── EDIT MODE ── */
          <>
          {/* Hlavička úprav: „Upravit profil" + Hotovo/Zrušit */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingRight: onClose ? 0 : 50 }}>
            <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 26, fontWeight: 800, letterSpacing: -0.6 }}>Upravit profil</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 'auto' }}>
              <button onClick={handleCancel} title="Zahodit změny" style={{
                padding: '8px 15px', borderRadius: 999, cursor: 'pointer',
                background: '#efeff1', border: '1px solid ' + T.border, color: '#252525',
                fontFamily: T.fontHead, fontSize: 14, fontWeight: 800,
                WebkitTapHighlightColor: 'transparent',
              }}>Zrušit</button>
              <button onClick={handleSave} disabled={saving} title="Uložit změny" style={{
                padding: '8px 17px', borderRadius: 999, cursor: 'pointer',
                background: T.green, border: 'none', color: '#fff',
                fontFamily: T.fontHead, fontSize: 14, fontWeight: 800,
                opacity: saving ? 0.6 : 1, boxShadow: '0 6px 14px rgba(31,157,92,0.30)',
                WebkitTapHighlightColor: 'transparent',
              }}>{saving ? 'Ukládám…' : 'Hotovo'}</button>
            </div>
          </div>

          {/* Skryté vstupy: fotoaparát (capture) + galerie */}
          <input ref={kameraRef} type="file" accept="image/*" capture="user" onChange={nactiFotku} style={{ display: 'none' }} />
          <input ref={galerieRef} type="file" accept="image/*" onChange={nactiFotku} style={{ display: 'none' }} />

          {/* Profilová fotka — klepnutím vyfotit nebo vybrat z galerie */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <button onClick={() => setFotoMenu(true)} title="Změnit fotku" style={{
              position: 'relative', width: 104, height: 104, borderRadius: 30, border: 'none', padding: 0, cursor: 'pointer',
              background: T.avatarGrad, WebkitTapHighlightColor: 'transparent', boxShadow: '0 16px 30px -16px rgba(0,32,246,0.55)',
            }}>
              <span style={{ position: 'absolute', inset: 0, borderRadius: 30, overflow: 'hidden', display: 'grid', placeItems: 'center', color: '#fff', fontFamily: T.fontHead, fontWeight: 800, fontSize: 36 }}>
                {(avatarPreview || avatarUrl)
                  ? <img src={avatarPreview || avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : initials}
              </span>
              <span style={{ position: 'absolute', right: -4, bottom: -4, width: 36, height: 36, borderRadius: 999, background: T.primary, border: '3px solid #fff', display: 'grid', placeItems: 'center', boxShadow: '0 4px 10px rgba(0,32,246,0.4)' }}>
                {_wIcoKamera('#fff', 18)}
              </span>
            </button>
            <button onClick={() => setFotoMenu(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.primary, fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, WebkitTapHighlightColor: 'transparent' }}>Změnit fotku</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* ── ZÁKLAD — bez těchto pár věcí nemůžeš vzít brigádu ── */}
            <div>
              <div style={labelStyle}>Osobní údaje</div>
              <div style={{ ...KARTA, padding: 0 }}>
                <div style={radek}>
                  <span style={radekLabel}>Jméno</span>
                  <input value={form.jmeno} onChange={e => setForm(f => ({ ...f, jmeno: e.target.value }))} placeholder="Zadej jméno" style={radekInput} />
                </div>
                <div style={{ ...radek, borderTop: '1px solid ' + T.border }}>
                  <span style={radekLabel}>Příjmení</span>
                  <input value={form.prijmeni} onChange={e => setForm(f => ({ ...f, prijmeni: e.target.value }))} placeholder="Zadej příjmení" style={radekInput} />
                </div>
                <div style={{ ...radek, borderTop: '1px solid ' + T.border, justifyContent: 'space-between' }}>
                  <span style={radekLabel}>Datum narození</span>
                  <WDatumPicker row value={form.datum} onChange={v => setForm(f => ({ ...f, datum: v }))} />
                </div>
              </div>
              <div style={poznamka}>Firmy vidí jméno a první písmeno příjmení. Datum narození potřebujeme kvůli věkovému limitu u některých směn.</div>
            </div>
            <div>
              <div style={labelStyle}>Kontaktní údaje</div>
              <div style={{ ...KARTA, padding: 0 }}>
                <div style={radek}>
                  <select value={form.telPredvolba} onChange={e => setForm(f => ({ ...f, telPredvolba: e.target.value }))}
                    style={{ border: 'none', outline: 'none', background: 'transparent', fontFamily: T.fontHead, fontWeight: 800, fontSize: 15, color: T.ink, cursor: 'pointer', flexShrink: 0 }}>
                    {_W_PREDVOLBY.map(p => <option key={p.kod} value={p.kod}>{p.vlajka + ' ' + p.kod}</option>)}
                  </select>
                  <input type="tel" inputMode="tel" value={form.telCislo} onChange={e => setForm(f => ({ ...f, telCislo: e.target.value }))} placeholder="Telefon" style={radekInput} />
                  {form.telCislo.trim() && (telOvereno ? <WOverenoPill /> : <WOveritBtn onClick={() => otevritOvereni('phone')} />)}
                </div>
                <div style={{ ...radek, borderTop: '1px solid ' + T.border }}>
                  <input type="email" inputMode="email" autoCapitalize="none" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="E-mail" style={{ ...radekInput, textAlign: 'left' }} />
                  {form.email.trim() && (emailOvereno ? <WOverenoPill /> : <WOveritBtn onClick={() => otevritOvereni('email')} />)}
                </div>
              </div>
              <div style={poznamka}>Kontakt uvidí jen firma, které potvrdíš zájem o směnu. Po změně čísla nebo e-mailu pošleme ověřovací kód.</div>
            </div>
            {/* ── ROZŠÍŘENÉ — nepovinné, ať si tě firmy spíš vyberou ── */}
            <button onClick={() => setRozsireneOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, ...KARTA, padding: '15px 18px', cursor: 'pointer', border: 'none', textAlign: 'left', WebkitTapHighlightColor: 'transparent' }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', color: T.ink, fontFamily: T.fontHead, fontSize: 16, fontWeight: 800 }}>Rozšířený profil</span>
                <span style={{ display: 'block', color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 12.5, marginTop: 2 }}>Nepovinné — ať si tě firmy spíš vyberou</span>
              </span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: rozsireneOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}><path d="M6 9l6 6 6-6" /></svg>
            </button>

            {rozsireneOpen && (<>
            <div>
              <div style={labelStyle}>Tituly ke jménu</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <WTitulPicker value={form.titul} onChange={v => setForm(f => ({ ...f, titul: v }))}
                  placeholder="Titul před" obal={{ flex: 1, minWidth: 0 }} shakeSignal={titulShake} />
                <WTitulPicker value={form.titulZa} onChange={v => setForm(f => ({ ...f, titulZa: v }))}
                  placeholder="Titul za" obal={{ flex: 1, minWidth: 0 }} shakeSignal={titulShake} />
              </div>
            </div>
            <div>
              <div style={labelStyle}>Kde působíš</div>
              <select value={form.kraj} onChange={e => setForm(f => ({ ...f, kraj: e.target.value }))}
                style={{ ...fieldStyle, width: '100%', cursor: 'pointer', color: form.kraj ? T.ink : T.mutedSoft }}>
                <option value="" style={{ color: '#111' }}>Vyber kraj</option>
                {KRAJE_W.map(k => <option key={k.id} value={k.id} style={{ color: '#111' }}>{k.name}</option>)}
              </select>
              <input value={form.mesto} onChange={e => setForm(f => ({ ...f, mesto: e.target.value }))} placeholder="Město (nepovinné)" style={{ ...fieldStyle, marginTop: 8 }} />
            </div>
            <div>
              <div style={labelStyle}>Doprava</div>
              <div style={{ ...KARTA, padding: 0, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 18px' }}>
                  <div style={{ flex: 1, minWidth: 0, color: T.ink, fontFamily: T.fontHead, fontSize: 14, fontWeight: 800 }}>Řidičský průkaz sk. B</div>
                  <button onClick={() => setForm(f => ({ ...f, ridicak: !f.ridicak }))} title="Mám / nemám řidičák" style={_wPrepinac(form.ridicak)}>
                    <span style={_wPrepinacKnob(form.ridicak)} />
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 18px', borderTop: '1px solid ' + T.border }}>
                  <div style={{ flex: 1, minWidth: 0, color: T.ink, fontFamily: T.fontHead, fontSize: 14, fontWeight: 800 }}>Vlastní auto</div>
                  <button onClick={() => setForm(f => ({ ...f, auto: !f.auto }))} title="Mám / nemám auto" style={_wPrepinac(form.auto)}>
                    <span style={_wPrepinacKnob(form.auto)} />
                  </button>
                </div>
              </div>
            </div>
            <div>
              <div style={labelStyle}>O mně</div>
              <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Napiš pár vět o sobě, zkušenostech nebo dostupnosti…" rows={3}
                style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.5 }} />
            </div>
            <div>
              <div style={labelStyle}>Dovednosti</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                {form.skills.map((sk, i) => (
                  <span key={i} style={{ ...pillStyle, display: 'inline-flex', alignItems: 'center', gap: 7 }}>{sk}
                    <span onClick={() => removeSkill(i)} style={{ cursor: 'pointer', color: '#f43f5e', fontWeight: 800, lineHeight: 1 }}>×</span>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }} placeholder="Např. Pokladna, Latte art…" style={{ ...fieldStyle, flex: 1 }} />
                <button onClick={addSkill} style={{ padding: '0 20px', borderRadius: 12, background: T.tint, border: '1px solid rgba(0,32,246,0.2)', color: T.primary, fontFamily: T.fontHead, fontSize: 14, fontWeight: 800, cursor: 'pointer', flexShrink: 0 }}>Přidat</button>
              </div>
            </div>
            <div>
              <div style={labelStyle}>Vzdělání</div>
              <div style={{ display: 'grid', gap: 10 }}>
                <WVyberPicker value={form.stupen} onChange={v => setForm(f => ({ ...f, stupen: v }))} items={_W_STUPNE} placeholder="Stupeň vzdělání" />
                <WVyberPicker value={form.obor} onChange={v => setForm(f => ({ ...f, obor: v }))} items={_W_OBORY} placeholder="Obor" />
              </div>
            </div>
            <div>
              <div style={labelStyle}>Životopis <span style={{ color: T.mutedSoft, fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>· nepovinné</span></div>
              <input value={form.cv_url} onChange={e => setForm(f => ({ ...f, cv_url: e.target.value }))} placeholder="Odkaz na životopis (PDF / Disk / LinkedIn)…" style={fieldStyle} />
              <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 12, marginTop: 6, lineHeight: 1.4 }}>Vlož veřejný odkaz na svůj životopis. Je to dobrovolné — zaměstnavatel ho uvidí u tvého profilu.</div>
            </div>
            </>)}
            {/* Ukládá se zeleným „Hotovo" nahoře — spodní tlačítko by bylo dvakrát */}
          </div>

          {/* Spodní list: Vyfotit / Vybrat z galerie */}
          {fotoMenu && (
            <div onClick={() => setFotoMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 9400, background: 'rgba(11,18,51,0.42)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '10px 14px calc(16px + env(safe-area-inset-bottom))', animation: 'wSheetUp .28s cubic-bezier(.2,.8,.2,1)' }}>
                <div style={{ width: 40, height: 5, borderRadius: 999, background: T.border, margin: '4px auto 12px' }} />
                <button onClick={() => { setFotoMenu(false); if (kameraRef.current) kameraRef.current.click(); }} style={fotoBtn}>{_wIcoKamera(T.primary, 21)}<span>Vyfotit</span></button>
                <button onClick={() => { setFotoMenu(false); if (galerieRef.current) galerieRef.current.click(); }} style={{ ...fotoBtn, borderTop: '1px solid ' + T.border }}>{_wIcoGalerie(T.primary, 21)}<span>Vybrat z galerie</span></button>
                {(avatarPreview || avatarUrl) && (
                  <button onClick={() => { setAvatarPreview(''); setForm(f => ({ ...f, avatar: '' })); setFotoMenu(false); }} style={{ ...fotoBtn, borderTop: '1px solid ' + T.border, color: '#E8552E' }}><Icon name="trash-bin-trash-bold" size={21} color="#E8552E" /><span>Odebrat fotku</span></button>
                )}
                <button onClick={() => setFotoMenu(false)} style={{ ...fotoBtn, marginTop: 8, justifyContent: 'center', color: T.muted, background: T.surfaceAlt, borderRadius: 14 }}>Zrušit</button>
              </div>
            </div>
          )}

          {/* Spodní list: ověřovací kód (e-mail funkční přes Supabase, telefon placeholder) */}
          {overitOpen && (
            <div onClick={() => setOveritOpen(null)} style={{ position: 'fixed', inset: 0, zIndex: 9400, background: 'rgba(11,18,51,0.42)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '10px 22px calc(20px + env(safe-area-inset-bottom))', animation: 'wSheetUp .28s cubic-bezier(.2,.8,.2,1)' }}>
                <div style={{ width: 40, height: 5, borderRadius: 999, background: T.border, margin: '4px auto 16px' }} />
                {overitOpen === 'phone' ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 19, fontWeight: 800, marginBottom: 8 }}>Ověření telefonu</div>
                    <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 14, lineHeight: 1.5, marginBottom: 18 }}>Ověření SMS kódem právě připravujeme. Zatím se číslo uloží i bez kódu.</div>
                    <button onClick={() => setOveritOpen(null)} style={{ width: '100%', padding: '13px 0', borderRadius: 14, background: T.primary, border: 'none', color: '#fff', fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>Rozumím</button>
                  </div>
                ) : (
                  <div>
                    <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 19, fontWeight: 800, marginBottom: 6 }}>Zadej kód z e-mailu</div>
                    <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 13.5, lineHeight: 1.5, marginBottom: 16 }}>Poslali jsme ověřovací kód na <b style={{ color: T.ink }}>{form.email}</b>.</div>
                    <input value={kod} onChange={e => setKod(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoFocus placeholder="000000"
                      style={{ width: '100%', textAlign: 'center', letterSpacing: 8, fontFamily: T.fontHead, fontSize: 26, fontWeight: 800, color: T.ink, padding: '12px 0', borderRadius: 14, border: '1.5px solid ' + (overStav === 'chyba' ? '#E8552E' : T.border), outline: 'none', background: T.surfaceAlt }} />
                    {overChyba && <div style={{ color: '#E8552E', fontFamily: T.fontUI, fontSize: 12.5, marginTop: 8 }}>{overChyba}</div>}
                    {overStav === 'ok' ? (
                      <div style={{ color: T.green, fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, textAlign: 'center', marginTop: 16 }}>Hotovo, e-mail ověřen ✓</div>
                    ) : (
                      <button onClick={overitKodEmail} disabled={overStav === 'overuji' || kod.length < 4} style={{ width: '100%', marginTop: 16, padding: '13px 0', borderRadius: 14, background: T.primary, border: 'none', color: '#fff', fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, cursor: 'pointer', opacity: (overStav === 'overuji' || kod.length < 4) ? 0.55 : 1 }}>{overStav === 'overuji' ? 'Ověřuji…' : 'Ověřit kód'}</button>
                    )}
                    <div style={{ textAlign: 'center', marginTop: 14, color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 13 }}>
                      {overStav === 'posilam' ? 'Posílám kód…' : <>Nepřišel kód? <button onClick={poslatKodEmail} style={{ background: 'none', border: 'none', color: T.primary, fontFamily: T.fontHead, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>Poslat znovu</button></>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          </>
        ) : (
          <>
            {/* ── Hlavička: jen identita. Klidný modrý gradient, žádné duhové
                   záře ani grafy. Výdělek a čísla jsou v přehledové kartě níž. ── */}
            <div style={{
              position: 'relative', overflow: 'hidden',
              margin: '-24px -20px 20px', borderRadius: '0 0 30px 30px',
              boxShadow: '0 20px 44px -24px rgba(0,20,163,0.75)',
              background: 'linear-gradient(168deg, #1B2CF5 0%, #0A18B8 58%, #060E86 100%)',
              padding: 'calc(env(safe-area-inset-top) + 22px) 22px 26px',
              display: 'flex', flexDirection: 'column', gap: 22,
            }}>
              {/* Jeden jemný lesk vpravo nahoře — dodá hloubku bez cirkusu */}
              <span aria-hidden="true" style={{
                position: 'absolute', top: -120, right: -60, width: 260, height: 260, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.14), transparent 66%)', pointerEvents: 'none',
              }} />
              {/* Řádek: Můj profil + Upravit + zavřít */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ color: '#fff', fontFamily: T.fontHead, fontSize: 20, fontWeight: 800, letterSpacing: -0.4 }}>Můj profil</div>
                <button onClick={() => setEditing(true)} title="Upravit profil" style={{
                  marginLeft: 'auto', flexShrink: 0, padding: '8px 16px', borderRadius: 999, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.16)', border: 'none', color: '#fff',
                  fontFamily: T.fontHead, fontSize: 13, fontWeight: 800, WebkitTapHighlightColor: 'transparent',
                }}>Upravit</button>
                {onClose && (
                  <button onClick={onClose} title="Zavřít" style={{
                    flexShrink: 0, width: 32, height: 32, borderRadius: 999, background: 'rgba(255,255,255,0.16)',
                    border: 'none', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 14,
                    WebkitTapHighlightColor: 'transparent',
                  }}>✕</button>
                )}
              </div>

              {/* Kdo: avatar + jméno + stupeň */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 15 }}>
                <div style={{
                  width: 66, height: 66, flex: 'none', borderRadius: 22, overflow: 'hidden', background: 'rgba(255,255,255,0.14)',
                  display: 'grid', placeItems: 'center', color: '#fff', fontFamily: T.fontHead, fontWeight: 800, fontSize: 25,
                  boxShadow: '0 0 0 2px rgba(255,255,255,0.4), 0 12px 24px -10px rgba(0,0,0,0.5)',
                }}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    : initials}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                  <span style={{ color: '#fff', fontFamily: T.fontHead, fontSize: 22, fontWeight: 800, letterSpacing: -0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                    <WLevelBadge level={trust.tier.blevel} label={trust.tier.nazev} sm />
                    <span style={{ color: '#C7D0FF', fontFamily: T.fontUI, fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{heroMeta}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* ── Přehled: výdělek za měsíc + hodnocení / brigády / odpracováno
                   v jedné klidné kartě. Bez grafu, bez zdvojených textů. ── */}
            <div style={{ ...KARTA, padding: '20px 22px', marginBottom: 16 }}>
              <button onClick={() => setEarningsOpen(true)} title="Zobrazit statistiky výdělků" style={{
                width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
                background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
              }}>
                <span>
                  <span style={{ display: 'block', color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 10.5, fontWeight: 800, letterSpacing: 1.1, textTransform: 'uppercase' }}>Vyděláno v {_W_MESICE_2[new Date().getMonth()]}</span>
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
                    <span style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 32, fontWeight: 800, letterSpacing: -1, lineHeight: 1 }}>{_wKc(vyd.tentoMesic.castka)}</span>
                    <span style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 15, fontWeight: 700 }}>Kč</span>
                  </span>
                </span>
                <span style={{ color: T.primary, fontFamily: T.fontHead, fontSize: 13, fontWeight: 800, flexShrink: 0, marginTop: 4 }}>Statistiky ›</span>
              </button>

              <div style={{ height: 1, background: T.border, margin: '18px -22px 0' }} />

              <div style={{ display: 'flex', alignItems: 'stretch', paddingTop: 16 }}>
                {[
                  { value: rating > 0 ? rating.toFixed(1).replace('.', ',') : '—', star: rating > 0, label: 'hodnocení', onClick: () => setReviewsPageOpen(true), title: 'Zobrazit recenze' },
                  { value: vyd.pocet, label: 'brigády', onClick: () => onGoTab && onGoTab('history'), title: 'Zobrazit brigády' },
                  { value: `${vyd.hodin} h`, label: 'odpracováno', onClick: () => setEarningsOpen(true), title: 'Zobrazit statistiky' },
                ].map((s, i) => (
                  <React.Fragment key={s.label}>
                    {i > 0 && <div style={{ width: 1, background: T.border, flexShrink: 0, margin: '2px 0' }} />}
                    <button onClick={s.onClick} title={s.title} style={{
                      flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                      background: 'none', border: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', fontFamily: 'inherit',
                    }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: T.ink, fontFamily: T.fontHead, fontSize: 20, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.1 }}>
                        {s.value}{s.star && <span style={{ color: T.super, fontSize: 15 }}>★</span>}
                      </span>
                      <span style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{s.label}</span>
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* ── Stupeň důvěry — klidná karta: eyebrow, cílový odznak, jeden
                   plynulý progress. Klepnutí otevře detail důvěry. ── */}
            {(() => {
              const pct = Math.round((trust.progress || 0) * 100);
              const cil = trust.jeMax ? trust.tier : trust.dalsi;   // odznak vpravo = cíl (u max sám sebe)
              return (
            <button onClick={() => setTrustOpen(true)} title="Co je stupeň důvěry" style={{
              ...KARTA, width: '100%', textAlign: 'left', marginBottom: 16, padding: '20px 20px 18px',
              border: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            }}>
              {/* Hlavička: nadpis vlevo, cílový odznak vpravo */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 10.5, fontWeight: 800, letterSpacing: 1.1, textTransform: 'uppercase' }}>Stupeň důvěry</span>
                  <span style={{ display: 'block', color: T.ink, fontFamily: T.fontHead, fontSize: 18, fontWeight: 800, letterSpacing: -0.4, marginTop: 3 }}>
                    {trust.jeMax ? 'Nejvyšší stupeň' : 'Cesta na ' + trust.dalsi.nazev}
                  </span>
                </span>
                <span style={{ flexShrink: 0 }}>
                  <WLevelBadge level={cil.blevel} label={cil.nazev} locked={!trust.jeMax} />
                </span>
              </div>

              {/* Jeden plynulý progress s jemným gradientem a puntíkem na konci */}
              <div style={{ position: 'relative', height: 10, borderRadius: 999, background: T.tint, overflow: 'visible', marginBottom: 10 }}>
                <div style={{
                  position: 'absolute', inset: 0, width: Math.max(6, pct) + '%', borderRadius: 999,
                  background: 'linear-gradient(90deg, #0A27FF, #5A72FF)',
                  boxShadow: '0 2px 10px rgba(0,32,246,0.35)', transition: 'width .5s cubic-bezier(.2,.8,.2,1)',
                }}>
                  {!trust.jeMax && (
                    <span style={{
                      position: 'absolute', right: -3, top: '50%', transform: 'translateY(-50%)',
                      width: 14, height: 14, borderRadius: 999, background: '#fff',
                      boxShadow: '0 0 0 3px #5A72FF, 0 2px 6px rgba(0,0,0,0.2)',
                    }} />
                  )}
                </div>
              </div>

              {/* Jedna věta pod pásem + % vpravo */}
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 12.5, lineHeight: 1.45, flex: 1, minWidth: 0 }}>
                  {trust.jeMax
                    ? 'Nejvyšší stupeň. Drž si ho a firmy tě uvidí mezi prvními.'
                    : <>Teď jsi <b style={{ color: T.ink, fontFamily: T.fontHead }}>{trust.tier.nazev}</b> · do {trust.dalsi.nazev} ti chybí {_wChybi(trust)}.</>}
                </span>
                {!trust.jeMax && <span style={{ color: T.primary, fontFamily: T.fontHead, fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{pct} %</span>}
              </div>
            </button>
              );
            })()}

            {/* ── Recenze od firem — ukázka přímo na profilu, klik otevře všechny ── */}
            {reviews.length > 0 && (
              <div style={{ ...KARTA, padding: '4px 20px 12px', marginBottom: 24 }}>
                {reviews.slice(0, 2).map((r, i) => (
                  <div key={i} style={{ padding: '14px 0', borderTop: i > 0 ? '1px solid ' + T.border : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: r.text ? 8 : 0 }}>
                      <span style={{ flex: 1, minWidth: 0, color: T.ink, fontFamily: T.fontHead, fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.author}</span>
                      <span style={{ display: 'flex', gap: 1.5, flexShrink: 0 }}>{[1, 2, 3, 4, 5].map(n => <WStar key={n} size={13} color={n <= r.rating ? T.super : 'rgba(18,18,26,0.14)'} />)}</span>
                    </div>
                    {r.text && <div style={{ color: T.inkSoft, fontFamily: T.fontUI, fontSize: 13.5, lineHeight: 1.55 }}>„{r.text}"</div>}
                  </div>
                ))}
                <button onClick={() => setReviewsPageOpen(true)} style={{ marginTop: 2, border: 'none', background: 'none', padding: '8px 0 0', fontFamily: T.fontHead, fontSize: 13, fontWeight: 800, color: T.primary, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                  {reviews.length > 2 ? 'Všech ' + reviews.length + ' ' + _wPlural(reviews.length, 'recenze', 'recenze', 'recenzí') : 'Zobrazit recenze'} ›
                </button>
              </div>
            )}

            {/* ── Uložené brigády — přehled toho, co sis uložil(a) záložkou na kartě ── */}
            <button onClick={() => setSavedOpen(true)} title="Uložené brigády" style={{
              ...KARTA, width: '100%', textAlign: 'left', marginBottom: 24,
              border: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <span style={{ width: 44, height: 44, flex: 'none', borderRadius: 13, background: T.tint, display: 'grid', placeItems: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6.5 3.75h11a1.25 1.25 0 0 1 1.25 1.25v15.5l-6.75-3.7-6.75 3.7V5A1.25 1.25 0 0 1 6.5 3.75z" stroke={T.primary} strokeWidth="1.8" strokeLinejoin="round" /></svg>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 15, fontWeight: 800 }}>Uložené brigády</div>
                <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 12.5 }}>{savedCount > 0 ? savedCount + ' ' + _wPlural(savedCount, 'uložená brigáda', 'uložené brigády', 'uložených brigád') : 'Ťukni na záložku u brigády a uloží se sem'}</div>
              </div>
              <span style={{ flexShrink: 0, color: T.mutedSoft, fontFamily: T.fontHead, fontSize: 18, fontWeight: 800, lineHeight: 1 }}>›</span>
            </button>

            {/* ── Doplň profil — seznam toho, co ještě chybí. Schová se, až je vše hotové. ── */}
            {todoLeft > 0 && (
              <div style={{ ...KARTA, marginBottom: 24, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
                  <span style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 15, fontWeight: 800 }}>Doplň profil</span>
                  <span style={{ flexShrink: 0, fontFamily: T.fontHead, fontSize: 11, fontWeight: 800, padding: '4px 9px', borderRadius: 999, color: '#B96F06', background: '#FFF3E0' }}>Chybí {todoLeft} {_wPlural(todoLeft, 'věc', 'věci', 'věcí')}</span>
                </div>
                <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 12.5, lineHeight: 1.5, marginBottom: 6 }}>Firmy si vybírají i podle toho, co o sobě napíšeš.</div>
                {todoItems.map(t => (
                  <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 0', borderTop: '1px solid ' + T.border }}>
                    <span style={{
                      width: 22, height: 22, flex: 'none', borderRadius: 999, display: 'grid', placeItems: 'center',
                      background: t.done ? T.green : '#fff', border: t.done ? 'none' : '1.5px dashed ' + T.mutedSoft,
                    }}>
                      {t.done && <svg width="11" height="9" viewBox="0 0 11 9" aria-hidden="true"><path d="M1 4.6L4 7.6 10 1.4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', color: T.ink, fontFamily: T.fontHead, fontSize: 13.5, fontWeight: 700 }}>{t.title}</span>
                      <span style={{ display: 'block', color: t.done ? T.green : T.muted, fontFamily: T.fontUI, fontSize: 11.5 }}>{t.done ? 'Hotovo' : t.note}</span>
                    </span>
                  </div>
                ))}
                <button onClick={() => setEditing(true)} style={{
                  marginTop: 12, width: '100%', border: 'none', background: T.primary, color: '#fff',
                  fontFamily: T.fontHead, fontSize: 14, fontWeight: 800, padding: 13, borderRadius: 12, cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}>Doplnit profil</button>
              </div>
            )}

            {/* ── O mně / Dovednosti — ukazujeme jen to, co je vyplněné ── */}
            {(bio || education || cvUrl || skills.length > 0) && (
              <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
                {(bio || education || cvUrl) && (
                  <div>
                    <div style={{ ...labelStyle, padding: '0 4px' }}>O mně</div>
                    {bio && <div style={{ ...KARTA, color: T.ink, fontFamily: T.fontUI, fontSize: 14.5, lineHeight: 1.6 }}>{bio}</div>}
                    {education && (
                      <div style={{ ...KARTA, marginTop: bio ? 12 : 0 }}>
                        <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Vzdělání</div>
                        <div style={{ color: T.ink, fontFamily: T.fontUI, fontSize: 14.5 }}>{education}</div>
                      </div>
                    )}
                    {cvUrl && (
                      <a href={cvUrl} target="_blank" rel="noopener noreferrer" style={{ marginTop: (bio || education) ? 12 : 0, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderRadius: 14, background: '#fff', boxShadow: cardShadow, color: T.ink, fontFamily: T.fontHead, fontSize: 14, fontWeight: 800, textDecoration: 'none' }}>
                        <Icon name="document-text-bold" size={16} color={T.primary} />Můj životopis
                      </a>
                    )}
                  </div>
                )}
                {skills.length > 0 && (
                  <div>
                    <div style={{ ...labelStyle, padding: '0 4px' }}>Dovednosti</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                      {skills.map((sk, i) => <span key={i} style={pillStyle}>{sk}</span>)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Nastavení ── */}
            <div style={{ ...KARTA, padding: 0, overflow: 'hidden' }}>
              <div style={{ ...labelStyle, margin: 0, padding: '16px 20px', borderBottom: '1px solid ' + T.border }}>Nastavení</div>

              {/* Notifikace */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: T.tint, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Icon name="bell-bold" size={18} color={T.primary} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 14, fontWeight: 800 }}>Upozornění</div>
                  <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 12.5 }}>Zprávy a nabídky směn</div>
                </div>
                <button onClick={toggleNotifs} title="Zapnout/vypnout upozornění" style={{
                  width: 48, height: 28, borderRadius: 999, flexShrink: 0, cursor: 'pointer', position: 'relative',
                  background: notifsOn ? T.primary : 'rgba(18,18,26,0.18)', border: 'none', transition: 'background .2s',
                }}>
                  <span style={{ position: 'absolute', top: 3, left: notifsOn ? 23 : 3, width: 22, height: 22, borderRadius: 999, background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', transition: 'left .2s' }} />
                </button>
              </div>

              {/* Zvuk upozornění — jen když jsou upozornění vůbec zapnutá */}
              {notifsOn && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderTop: '1px solid ' + T.border }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: T.tint, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Icon name="volume-loud-bold" size={18} color={T.primary} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 14, fontWeight: 800 }}>Zvuk</div>
                    <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 12.5 }}>Cinknutí při novém upozornění</div>
                  </div>
                  <button onClick={toggleSound} title="Zapnout/vypnout zvuk" style={{
                    width: 48, height: 28, borderRadius: 999, flexShrink: 0, cursor: 'pointer', position: 'relative',
                    background: soundOn ? T.primary : 'rgba(18,18,26,0.18)', border: 'none', transition: 'background .2s',
                  }}>
                    <span style={{ position: 'absolute', top: 3, left: soundOn ? 23 : 3, width: 22, height: 22, borderRadius: 999, background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', transition: 'left .2s' }} />
                  </button>
                </div>
              )}

              {/* Potvrzení „Zájem odeslán" po přijetí brigády — dá se vypnout i přímo na té obrazovce */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderTop: '1px solid ' + T.border }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: T.tint, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Icon name="check-circle-bold" size={18} color={T.primary} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 14, fontWeight: 800 }}>Potvrzení po přijetí</div>
                  <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 12.5 }}>Obrazovka „Zájem odeslán" po přijetí brigády</div>
                </div>
                <button onClick={toggleZajem} title="Zapnout/vypnout potvrzení" style={{
                  width: 48, height: 28, borderRadius: 999, flexShrink: 0, cursor: 'pointer', position: 'relative',
                  background: zajemOn ? T.primary : 'rgba(18,18,26,0.18)', border: 'none', transition: 'background .2s',
                }}>
                  <span style={{ position: 'absolute', top: 3, left: zajemOn ? 23 : 3, width: 22, height: 22, borderRadius: 999, background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', transition: 'left .2s' }} />
                </button>
              </div>


              <div style={{ height: 1, background: T.border }} />

              {/* Odhlásit se */}
              <button onClick={onSignOut} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(18,18,26,0.05)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Icon name="logout-2-bold" size={18} color={T.ink} />
                </div>
                <span style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 14, fontWeight: 800 }}>Odhlásit se</span>
              </button>

              <div style={{ height: 1, background: T.border }} />

              {/* Smazat účet */}
              <button onClick={() => setConfirmDel(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(244,63,94,0.1)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Icon name="trash-bin-trash-bold" size={18} color="#f43f5e" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#f43f5e', fontFamily: T.fontHead, fontSize: 14, fontWeight: 800 }}>Smazat účet</div>
                  <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 12.5 }}>Trvale odstraní tvůj profil a data</div>
                </div>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Stránka se všemi recenzemi + odpovídání */}
      {reviewsPageOpen && <WReviewsPage reviews={reviews} onClose={() => setReviewsPageOpen(false)} />}
      {earningsOpen && <WEarningsPage vyd={vyd} onClose={() => setEarningsOpen(false)} />}
      {trustOpen && <WTrustPage trust={trust} onClose={() => setTrustOpen(false)} />}
      {savedOpen && <WSavedPage onClose={() => setSavedOpen(false)} />}

      {/* Potvrzení smazání účtu (dotaz + heslo) */}
      {confirmDel && (() => {
        const zavri = () => { if (!deleting) { setConfirmDel(false); setDelPassword(''); setDelErr(''); } };
        const muzeSmazat = !deleting && (delPassword || '').trim().length > 0;
        return (
        <div onClick={zavri} style={{
          position: 'fixed', inset: 0, zIndex: 150,
          background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)',
          display: 'grid', placeItems: 'center', padding: 20,
          animation: 'wPop .28s cubic-bezier(.2,.8,.2,1)',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 380, background: T.card,
            borderRadius: 20, border: '1px solid ' + T.border, padding: 26, textAlign: 'center',
            boxShadow: '0 24px 60px rgba(20,22,40,0.28)',
          }}>
            <div style={{ width: 60, height: 60, borderRadius: 17, background: 'rgba(244,63,94,0.12)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
              <Icon name="trash-bin-trash-bold" size={28} color="#f43f5e" />
            </div>
            <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 21, fontWeight: 800, letterSpacing: -0.4 }}>Opravdu smazat všechna data?</div>
            <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>
              Trvale se odstraní tvůj profil, brigády, zprávy i recenze. Tuhle akci nelze vrátit.
            </div>

            {/* Potvrzení heslem */}
            <div style={{ marginTop: 18, textAlign: 'left' }}>
              <div style={{ color: T.ink, fontFamily: T.fontUI, fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>Pro potvrzení zadej svoje heslo</div>
              <input
                type="password"
                value={delPassword}
                onChange={e => { setDelPassword(e.target.value); if (delErr) setDelErr(''); }}
                onKeyDown={e => { if (e.key === 'Enter' && muzeSmazat) handleDeleteAccount(); }}
                placeholder="Tvoje heslo"
                autoComplete="current-password"
                disabled={deleting}
                style={{
                  width: '100%', height: 46, padding: '0 14px', borderRadius: 12, boxSizing: 'border-box',
                  background: T.surfaceAlt, border: '1px solid ' + (delErr ? '#f43f5e' : T.border),
                  color: T.ink, fontFamily: T.fontUI, fontSize: 15, outline: 'none',
                }}
              />
              {delErr && <div style={{ color: '#f43f5e', fontFamily: T.fontUI, fontSize: 12.5, marginTop: 6 }}>{delErr}</div>}
            </div>

            <button onClick={handleDeleteAccount} disabled={!muzeSmazat} style={{
              width: '100%', marginTop: 18, padding: '14px', borderRadius: 14,
              background: '#f43f5e', border: 'none', color: '#fff',
              fontFamily: T.fontHead, fontSize: 15, fontWeight: 800,
              cursor: muzeSmazat ? 'pointer' : 'default', opacity: muzeSmazat ? 1 : 0.5,
            }}>{deleting ? 'Mažu…' : 'Ano, smazat účet'}</button>
            <button onClick={zavri} style={{
              width: '100%', marginTop: 10, padding: '13px', borderRadius: 14,
              background: T.surfaceAlt, border: '1px solid ' + T.border, color: T.muted,
              fontFamily: T.fontHead, fontSize: 14.5, fontWeight: 800, cursor: 'pointer',
            }}>Zpět</button>
          </div>
        </div>
        );
      })()}
    </div>
  );
}

// ── Stránka se všemi recenzemi + obousměrné odpovídání (realtime) ──
// Tisícové oddělovače mezerou: 12500 → „12 500"
function _wKc(n) { return (Number(n) || 0).toLocaleString('cs-CZ').replace(/ |,/g, ' '); }

const _W_MESICE_ZKR = ['led', 'úno', 'bře', 'dub', 'kvě', 'čvn', 'čvc', 'srp', 'zář', 'říj', 'lis', 'pro'];
const _W_MESICE     = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'];
// 6. pád — „v květnu", „v lednu"
const _W_MESICE_2   = ['lednu', 'únoru', 'březnu', 'dubnu', 'květnu', 'červnu', 'červenci', 'srpnu', 'září', 'říjnu', 'listopadu', 'prosinci'];

// 2. pád — „od března 2025"
const _W_MESICE_GEN = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];

// Barvy firem v „Kde jsem makal" — pruh/koláč i tečky v legendě. Výrazná,
// sytá paleta (modrá · růžová · jantar · zelená · …), přiřazuje se podle pořadí.
const _W_ZIVE = ['#3D5AFE', '#FF3D8B', '#FFB300', '#00C853', '#9C4DFF', '#00C2E0', '#FF6D00', '#FF3B47'];

// Šrafa pro nevybrané sloupce grafu
const _W_HATCH = 'repeating-linear-gradient(45deg, #c3cce4 0, #c3cce4 2.5px, #eef1f8 2.5px, #eef1f8 8px)';

// Plynulé „napočítání" čísla při změně hodnoty (přepnutí měsíce/období).
// Vrací průběžnou hodnotu; formátování si řeší volající. easeOutCubic.
function useCountUpW(value, duration) {
  const [disp, setDisp] = useStateW(0);   // od nuly → napočítá se i při otevření
  const dispRef = useRefW(0);
  const rafRef  = useRefW(null);
  useEffectW(() => {
    const to = Number(value) || 0;
    const from = dispRef.current;
    if (from === to) { setDisp(to); return; }
    const dur = duration || 520;
    const ease = t => 1 - Math.pow(1 - t, 3);
    let start = null;
    const step = ts => {
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start) / dur);
      const v = from + (to - from) * ease(p);
      dispRef.current = v; setDisp(v);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else { dispRef.current = to; setDisp(to); }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);
  return disp;
}

// Animované číslo (napočítá se) — formát přes _wKc, volitelná přípona.
function WCountUp({ value, style, suffix, suffixStyle, duration }) {
  const v = useCountUpW(value, duration);
  return (
    <span style={style}>
      {_wKc(Math.round(v))}
      {suffix && <span style={suffixStyle}>{suffix}</span>}
    </span>
  );
}

// Koláč (donut), který se „nakreslí" od 12 hodin celé kolo jako hodinová
// ručička; segmenty se přitom postupně objevují a oddělují tenkou mezerou.
// Sweep pohání requestAnimationFrame. segments: [{ key, value, color }].
function WDonut({ segments, size, stroke, duration }) {
  const total = segments.reduce((a, s) => a + (Number(s.value) || 0), 0) || 1;
  const [p, setP] = useStateW(0);
  const sig = segments.map(s => s.key + ':' + s.value).join(',');
  useEffectW(() => {
    const rm = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (rm) { setP(1); return; }
    let raf, start = null; const dur = duration || 900;
    const ease = t => 1 - Math.pow(1 - t, 3);
    setP(0);
    const step = ts => {
      if (start === null) start = ts;
      const t = Math.min(1, (ts - start) / dur);
      setP(ease(t));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [sig]);

  const sweep = p * 100;       // kam až ručička došla (0–100 kolem kruhu)
  const GAP = 0;               // 0 = segmenty spojené (bez mezer)
  let acc = 0;
  const arcs = segments.map(s => {
    const startU = (acc / total) * 100;
    const valU   = (Number(s.value) || 0) / total * 100;
    acc += Number(s.value) || 0;
    const vis = Math.max(0, Math.min(valU - GAP, sweep - startU));   // viditelná délka
    return { key: s.key, color: s.color, startU, vis };
  });

  return (
    <svg viewBox="0 0 40 40" width={size} height={size}>
      {/* Bez podkladové kružnice — koláč vždy vyplní celé kolo, takže track
          jen zbytečně prosvítal, dokud se ručička nedokreslila. */}
      {arcs.map(a => a.vis > 0.01 ? (
        <circle key={a.key} cx="20" cy="20" r="15.915" fill="none" stroke={a.color} strokeWidth={stroke}
          strokeDasharray={a.vis + ' ' + (100 - a.vis)} strokeDashoffset={25 - a.startU} />
      ) : null)}
    </svg>
  );
}

// ── Statistiky výdělků (proklik z karty na profilu) ──────────────
function WEarningsPage({ vyd, onClose }) {
  const cardShadow = '0 4px 20px rgba(0,32,246,0.06)';
  const [vybranyMesic, setVybranyMesic] = useStateW(null);   // klíč 'RRRR-MM'; null = použij výchozí
  const grafRef = useRefW(null);
  const [grafW, setGrafW] = useStateW(0);   // šířka viditelné plochy grafu (pro 6 sloupců na obrazovku)
  // Navádějící šipka „jezdi doprava" — jen dokud ji uživatel poprvé nepoužije
  const [grafHint, setGrafHint] = useStateW(() => typeof localStorage === 'undefined' || localStorage.getItem('makej-graf-hint') !== 'off');
  function dismissGrafHint() {
    if (!grafHint) return;
    setGrafHint(false);
    try { localStorage.setItem('makej-graf-hint', 'off'); } catch (e) {}
  }

  // ── Období grafu ──────────────────────────────────────────────
  const dnesKlic = (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); })();
  const [obdobi, setObdobi] = useStateW('6');                 // '6' | '12' | 'vlastni'
  const [vlastniOd, setVlastniOd] = useStateW(_wMesicZpet(dnesKlic, 5));
  const [vlastniDo, setVlastniDo] = useStateW(dnesKlic);

  // Nabídka měsíců do výběru: od nejstarší brigády (min. 2 roky zpět) po dnešek
  const nabidkaMesicu = (() => {
    const nej = vyd.hotove.reduce((a, h) => {
      const k = String(h.eventDate || '').slice(0, 7);
      return (k && (!a || k < a)) ? k : a;
    }, null);
    const zacatek = (nej && nej < _wMesicZpet(dnesKlic, 23)) ? nej : _wMesicZpet(dnesKlic, 23);
    return makejMesice([], zacatek, dnesKlic).map(m => m.klic);
  })();

  // Rozsah podle zvoleného období. U „vlastní" se obrácené zadání otočí.
  const rozsah = (() => {
    if (obdobi === 'vlastni') {
      return vlastniOd <= vlastniDo ? { od: vlastniOd, do: vlastniDo } : { od: vlastniDo, do: vlastniOd };
    }
    return { od: _wMesicZpet(dnesKlic, obdobi === '12' ? 11 : 5), do: dnesKlic };
  })();

  const mesiceGrafu = makejMesice(vyd.hotove, rozsah.od, rozsah.do);

  // V grafu je vždy vybraný jeden měsíc — buď na který klepl, nebo (výchozí)
  // poslední měsíc s výdělkem; když ani ten není, poslední v řadě.
  const _sVydelkem  = [...mesiceGrafu].reverse().find(m => m.castka > 0);
  const defaultKlic = (_sVydelkem || mesiceGrafu[mesiceGrafu.length - 1] || {}).klic;
  const aktivniKlic = (vybranyMesic && mesiceGrafu.some(m => m.klic === vybranyMesic)) ? vybranyMesic : defaultKlic;
  const mesicObj    = mesiceGrafu.find(m => m.klic === aktivniKlic) || null;
  const z           = makejVydelky(vyd.hotove.filter(h => String(h.eventDate || '').slice(0, 7) === aktivniKlic));

  // % změna vybraného měsíce vůči předchozímu měsíci v řadě
  const _idx  = mesiceGrafu.findIndex(m => m.klic === aktivniKlic);
  const _prev = _idx > 0 ? mesiceGrafu[_idx - 1] : null;
  const zmena = (_prev && _prev.castka > 0 && mesicObj) ? Math.round(((mesicObj.castka - _prev.castka) / _prev.castka) * 100) : null;

  // Nejvyšší sloupec v období — podle něj se škáluje graf
  const maxMesic = Math.max(1, ...mesiceGrafu.map(m => m.castka));

  const popisObdobi = obdobi === '6' ? 'Posledních 6 měsíců'
    : obdobi === '12' ? 'Poslední rok'
    : _W_MESICE[Number(rozsah.od.slice(5)) - 1] + ' ' + rozsah.od.slice(0, 4)
      + ' – ' + _W_MESICE[Number(rozsah.do.slice(5)) - 1] + ' ' + rozsah.do.slice(0, 4);

  // Celkem na Makej (celá historie): od kdy a kolik brigád
  const prvniKlic = vyd.hotove.reduce((a, h) => {
    const k = String(h.eventDate || '').slice(0, 7);
    return (k && (!a || k < a)) ? k : a;
  }, (W_PROFILE.created_at || '').slice(0, 7) || null);
  const memberOd = prvniKlic
    ? 'od ' + _W_MESICE_GEN[Number(prvniKlic.slice(5)) - 1] + ' ' + prvniKlic.slice(0, 4)
    : '';

  // Změř viditelnou šířku grafu → šířka sloupce tak, aby jich bylo vidět 6
  useEffectW(() => {
    const el = grafRef.current;
    if (!el) return;
    const set = () => setGrafW(el.clientWidth);
    set();
    window.addEventListener('resize', set);
    return () => window.removeEventListener('resize', set);
  }, []);

  const karta = { background: '#fff', borderRadius: 24, boxShadow: cardShadow, padding: '18px 20px' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 140, background: T.bg, display: 'flex', flexDirection: 'column', animation: 'wPop .28s cubic-bezier(.2,.8,.2,1)' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: 'calc(12px + env(safe-area-inset-top)) 16px 12px', background: '#fff', borderBottom: '1px solid ' + T.border }}>
        <WZpet onClick={onClose} />
        <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 21, fontWeight: 800, letterSpacing: -0.3 }}>Výdělek</div>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, color: '#5B6488', fontFamily: T.fontUI, fontSize: 12.5, fontWeight: 600 }}>
          <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true"><rect x="1.5" y="6" width="9" height="7" rx="2" fill="none" stroke="#5B6488" strokeWidth="1.4" /><path d="M3.5 6V4a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="#5B6488" strokeWidth="1.4" /></svg>
          Vidíš jen ty
        </span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px calc(24px + env(safe-area-inset-bottom))' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>

          {vyd.pocet === 0 ? (
            <div style={{ ...karta, textAlign: 'center', padding: '30px 22px' }}>
              <Icon name="wallet-money-bold" size={34} color={T.mutedSoft} />
              <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 16, fontWeight: 800, marginTop: 12 }}>Zatím žádný výdělek</div>
              <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 13, marginTop: 5, lineHeight: 1.5 }}>
                Až odpracuješ první brigádu, uvidíš tady, kolik sis vydělal a u koho.
              </div>
            </div>
          ) : (<>

            {/* ── Karta 1: přepínač období · vybraný měsíc · % změna · graf · průměry ── */}
            <div style={{ ...karta, marginBottom: 14 }}>

              {/* Přepínač období */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 18, background: T.surfaceAlt, borderRadius: 14, padding: 4 }}>
                {[{ k: '6', p: '6 měsíců' }, { k: '12', p: 'Rok' }, { k: 'vlastni', p: 'Vlastní' }].map(o => {
                  const akt = obdobi === o.k;
                  return (
                    <button key={o.k} onClick={() => { setObdobi(o.k); setVybranyMesic(null); }} style={{
                      flex: 1, padding: '9px 4px', borderRadius: 11, border: 'none', cursor: 'pointer',
                      background: akt ? '#fff' : 'transparent',
                      boxShadow: akt ? '0 2px 6px rgba(20,22,40,0.08)' : 'none',
                      color: akt ? T.ink : '#5B6488',
                      fontFamily: T.fontHead, fontSize: 12.5, fontWeight: 800,
                      whiteSpace: 'nowrap', transition: 'background .15s, color .15s',
                    }}>{o.p}</button>
                  );
                })}
              </div>

              {obdobi === 'vlastni' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  {[
                    { hod: vlastniOd, set: setVlastniOd, popis: 'Od' },
                    { hod: vlastniDo, set: setVlastniDo, popis: 'Do' },
                  ].map((v, i) => (
                    <React.Fragment key={v.popis}>
                      {i > 0 && <span style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 12 }}>–</span>}
                      <label style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', color: '#5B6488', fontFamily: T.fontUI, fontSize: 10.5, fontWeight: 700, marginBottom: 3 }}>{v.popis}</span>
                        <select value={v.hod} onChange={e => { v.set(e.target.value); setVybranyMesic(null); }} style={{
                          width: '100%', padding: '9px 10px', borderRadius: 11,
                          background: '#fff', border: '1px solid ' + T.border, color: T.ink,
                          fontFamily: T.fontUI, fontSize: 13, fontWeight: 600, outline: 'none', cursor: 'pointer',
                        }}>
                          {nabidkaMesicu.map(k => (
                            <option key={k} value={k}>{_W_MESICE[Number(k.slice(5)) - 1]} {k.slice(0, 4)}</option>
                          ))}
                        </select>
                      </label>
                    </React.Fragment>
                  ))}
                </div>
              )}

              {/* Popis období */}
              <div style={{ color: '#5B6488', fontFamily: T.fontUI, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 12 }}>{popisObdobi}</div>

              {/* Vybraný měsíc + částka + % změna */}
              <div style={{ color: '#5B6488', fontFamily: T.fontUI, fontSize: 11.5, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                {mesicObj ? _W_MESICE[mesicObj.mesic] + ' ' + mesicObj.rok : ''}
              </div>
              {/* Částka vlevo (napočítá se), % pilulka vždy vpravo — pevné místo,
                  ať neposkakuje podle šířky čísla. Ovál po intervalu jemně poskočí. */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, margin: '5px 0 20px', minHeight: 40 }}>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 5, minWidth: 0 }}>
                  <WCountUp value={z.celkem} style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 38, fontWeight: 800, letterSpacing: -1.2, lineHeight: 1 }} />
                  <span style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 18, fontWeight: 700 }}>Kč</span>
                </span>
                {zmena !== null && zmena !== 0 && (() => {
                  const up = zmena > 0;
                  const barva = up ? '#12967f' : '#C77A0F';
                  return (
                    <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 3, background: up ? '#E6F6EE' : '#FEF0E0', color: barva, fontFamily: T.fontHead, fontSize: 13, fontWeight: 800, padding: '5px 10px', borderRadius: 999, animation: 'wBadgeHop 7s ease-in-out infinite' }}>
                      <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
                        {up
                          ? <path d="M5 9V1M5 1L1.5 4.5M5 1l3.5 3.5" stroke={barva} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          : <path d="M5 1v8M5 9L1.5 5.5M5 9l3.5-3.5" stroke={barva} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
                      </svg>
                      {Math.abs(zmena)} %
                    </span>
                  );
                })()}
              </div>

              {/* Graf: šrafované sloupce, vybraný modrý. Přes 6 měsíců (Rok/Vlastní)
                  je vidět 6 na obrazovku a zbytek se dojede vodorovným posunem. */}
              {(() => {
                const scroll = mesiceGrafu.length > 6;
                const gap = 9;
                const barW = scroll ? Math.max(40, (grafW - gap * 5) / 6) : 0;
                const hint = scroll && grafHint;
                return (
                  <div style={{ position: 'relative' }}>
                    <div ref={grafRef} onScroll={dismissGrafHint} onTouchMove={dismissGrafHint} style={{
                      overflowX: scroll ? 'auto' : 'hidden', overflowY: 'hidden',
                      overscrollBehaviorX: 'contain', WebkitOverflowScrolling: 'touch',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap, height: 128, width: scroll ? 'max-content' : '100%' }}>
                        {mesiceGrafu.map(m => {
                          const vyska   = m.castka === 0 ? 6 : Math.max(12, Math.round((m.castka / maxMesic) * 100));
                          const vybrany = m.klic === aktivniKlic;
                          return (
                            <button key={m.klic} onClick={() => setVybranyMesic(m.klic)}
                              title={_W_MESICE[m.mesic] + ' ' + m.rok + ' · ' + _wKc(m.castka) + ' Kč'}
                              style={{
                                flex: scroll ? '0 0 ' + barW + 'px' : 1, width: scroll ? barW : 'auto',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9,
                                height: '100%', justifyContent: 'flex-end', padding: 0,
                                background: 'none', border: 'none', cursor: 'pointer',
                              }}>
                              <div style={{
                                width: '100%', height: vyska + '%', borderRadius: 12,
                                background: vybrany ? T.primary : (m.castka === 0 ? T.surfaceAlt : _W_HATCH),
                                boxShadow: vybrany ? '0 8px 18px -6px rgba(0,32,246,0.5)' : 'none',
                                transition: 'height .4s cubic-bezier(.2,.8,.2,1), background .2s',
                              }} />
                              <span style={{ color: vybrany ? T.primary : '#5B6488', fontFamily: T.fontUI, fontSize: 12, fontWeight: vybrany ? 800 : 700 }}>{_W_MESICE_ZKR[m.mesic]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Navádějící šipka vpravo — zmizí po prvním posunu a už se neukáže */}
                    {hint && (
                      <>
                        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 24, width: 56, background: 'linear-gradient(to right, rgba(255,255,255,0), #fff 74%)', pointerEvents: 'none', borderRadius: '0 12px 12px 0' }} />
                        <div aria-hidden="true" style={{ position: 'absolute', right: 2, top: '42%', transform: 'translateY(-50%)', width: 30, height: 30, borderRadius: 999, background: '#fff', boxShadow: '0 4px 12px rgba(20,22,40,0.16)', display: 'grid', placeItems: 'center', pointerEvents: 'none', animation: 'wNudgeX 1.6s ease-in-out infinite' }}>
                          <svg width="9" height="14" viewBox="0 0 9 14"><path d="M1.5 1.5L6.5 7l-5 5.5" fill="none" stroke={T.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Průměry vybraného měsíce */}
              <div style={{ height: 1, background: T.border, margin: '20px -20px 0' }} />
              <div style={{ display: 'flex', paddingTop: 16 }}>
                {[
                  { val: z.naHodinu, j: 'Kč', l: 'Na hodinu' },
                  { val: z.naBrigadu, j: 'Kč', l: 'Na brigádu' },
                  { val: z.hodin, j: 'h', l: 'Odpracováno' },
                ].map((s, i) => (
                  <React.Fragment key={s.l}>
                    {i > 0 && <div style={{ width: 1, background: T.border, margin: '2px 0' }} />}
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 19, fontWeight: 800, letterSpacing: -0.5 }}>
                        <WCountUp value={s.val} suffix={s.j} suffixStyle={{ fontSize: 12, color: T.muted, marginLeft: 2 }} />
                      </div>
                      <div style={{ color: '#5B6488', fontFamily: T.fontUI, fontSize: 11, fontWeight: 600, marginTop: 3 }}>{s.l}</div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* ── Karta 2: Kde jsem makal (vybraný měsíc) —
                   ≤3 firmy složený pruh, 4+ koláč (donut) + legenda ── */}
            {z.pocet === 0 ? (
              <div style={{ ...karta, textAlign: 'center', marginBottom: 14 }}>
                <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 15, fontWeight: 800 }}>
                  V {mesicObj ? _W_MESICE_2[mesicObj.mesic] + ' ' + mesicObj.rok : 'tomto měsíci'} zatím žádný výdělek
                </div>
                <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 13, marginTop: 5 }}>Vyber v grafu jiný měsíc.</div>
              </div>
            ) : (
              <div style={{ ...karta, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
                  <span style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 16, fontWeight: 800, letterSpacing: -0.3 }}>Kde jsem makal</span>
                  <span style={{ color: '#5B6488', fontFamily: T.fontUI, fontSize: 12.5 }}>{mesicObj ? _W_MESICE_2[mesicObj.mesic] + ' ' + mesicObj.rok : ''}</span>
                </div>

                {z.podleFirem.length >= 4 ? (
                  /* Koláč (donut) — nakreslí se od 12 h celé kolo, segmenty se oddělí */
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
                    <div style={{ position: 'relative', width: 150, height: 150 }}>
                      <WDonut key={aktivniKlic} size={150} stroke={6.5}
                        segments={z.podleFirem.map((f, i) => ({ key: f.company, value: f.castka, color: _W_ZIVE[i % _W_ZIVE.length] }))} />
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 24, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1 }}>{z.podleFirem.length}</span>
                        <span style={{ color: '#5B6488', fontFamily: T.fontUI, fontSize: 11, fontWeight: 600, marginTop: 2 }}>{_wPlural(z.podleFirem.length, 'firma', 'firmy', 'firem')}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ≤3 firmy: složený pruh — natáhne se zleva doprava */
                  <div key={aktivniKlic} style={{ display: 'flex', height: 9, borderRadius: 999, overflow: 'hidden', gap: 2, marginBottom: 16, transformOrigin: 'left', animation: 'wWipeX .6s cubic-bezier(.4,0,.2,1) both' }}>
                    {z.podleFirem.map((f, i) => (
                      <div key={f.company} style={{ width: Math.max(2, Math.round((f.castka / z.celkem) * 100)) + '%', background: _W_ZIVE[i % _W_ZIVE.length], borderRadius: 3 }} />
                    ))}
                  </div>
                )}

                {/* Legenda — všechny firmy, ať sedí s grafem */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {z.podleFirem.map((f, i) => (
                    <div key={f.company} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 10, height: 10, flex: 'none', borderRadius: 999, background: _W_ZIVE[i % _W_ZIVE.length] }} />
                      <span style={{ flex: 1, minWidth: 0, color: T.ink, fontFamily: T.fontHead, fontSize: 14.5, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.company}</span>
                      <span style={{ color: '#5B6488', fontFamily: T.fontUI, fontSize: 12.5, flexShrink: 0 }}>{f.pocet} {_wPlural(f.pocet, 'směna', 'směny', 'směn')}</span>
                      <span style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 14.5, fontWeight: 800, flexShrink: 0, minWidth: 76, textAlign: 'right' }}>{_wKc(f.castka)} Kč</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Karta 3: Celkem na Makej (celá historie) ── */}
            <div style={{ ...karta, padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 13, marginBottom: 14 }}>
              <span style={{ width: 44, height: 44, flex: 'none', borderRadius: 14, background: T.tint, display: 'grid', placeItems: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 22 22" aria-hidden="true"><rect x="2.5" y="5" width="17" height="12" rx="3" fill="none" stroke={T.primary} strokeWidth="1.7" /><path d="M2.5 9.2h17" stroke={T.primary} strokeWidth="1.7" /></svg>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 15, fontWeight: 800 }}>Celkem na Makej</div>
                <div style={{ color: '#5B6488', fontFamily: T.fontUI, fontSize: 12.5, marginTop: 2 }}>{[memberOd, vyd.pocet + ' ' + _wPlural(vyd.pocet, 'brigáda', 'brigády', 'brigád')].filter(Boolean).join(' · ')}</div>
              </div>
              <span style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 16, fontWeight: 800, flexShrink: 0 }}>{_wKc(vyd.celkem)} Kč</span>
            </div>

            <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 11.5, lineHeight: 1.5, marginTop: 4, textAlign: 'center' }}>
              Počítáno z odpracovaných směn podle sazby v inzerátu. Jde o hrubý výdělek před zdaněním.
            </div>
          </>)}
        </div>
      </div>
    </div>
  );
}

function WReviewsPage({ reviews, onClose }) {
  const [replies, setReplies]     = useStateW({});
  const [drafts,  setDrafts]      = useStateW({});
  const [sendingId, setSendingId] = useStateW(null);
  const [uid, setUid]             = useStateW(null);
  const reviewIds = reviews.map(r => r.id);

  useEffectW(() => {
    sb.auth.getSession().then(({ data: { session } }) => setUid(session?.user?.id || null));
    if (reviewIds.length) fetchReviewRepliesW(reviewIds).then(setReplies);
  }, []);

  useEffectW(() => {
    if (!reviewIds.length) return;
    const idset = new Set(reviewIds);
    const chan = sb.channel('w-rev-replies-' + Date.now())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'review_replies' }, (payload) => {
        const rep = payload.new;
        if (!idset.has(rep.review_id)) return;
        setReplies(prev => {
          const list = prev[rep.review_id] || [];
          if (list.some(x => x.id === rep.id)) return prev;
          return { ...prev, [rep.review_id]: [...list, rep] };
        });
      })
      .subscribe();
    return () => { try { sb.removeChannel(chan); } catch (e) {} };
  }, []);

  async function send(reviewId) {
    const text = (drafts[reviewId] || '').trim();
    if (!text || sendingId) return;
    setSendingId(reviewId);
    const tempId = 'tmp-' + Date.now();
    const optimistic = { id: tempId, review_id: reviewId, author_id: uid, text, created_at: new Date().toISOString() };
    setReplies(prev => ({ ...prev, [reviewId]: [...(prev[reviewId] || []), optimistic] }));
    setDrafts(prev => ({ ...prev, [reviewId]: '' }));
    const data = await postReviewReplyW(reviewId, text);
    setSendingId(null);
    setReplies(prev => {
      const list = prev[reviewId] || [];
      return { ...prev, [reviewId]: data ? list.map(x => x.id === tempId ? data : x) : list.filter(x => x.id !== tempId) };
    });
  }

  const relTime = ts => { try { return new Date(ts).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' }) + ' ' + new Date(ts).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 140, background: T.bg, display: 'flex', flexDirection: 'column', animation: 'wPop .28s cubic-bezier(.2,.8,.2,1)' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: 'calc(12px + env(safe-area-inset-top)) 16px 12px', background: '#fff', borderBottom: '1px solid ' + T.border }}>
        <WZpet onClick={onClose} />
        <div>
          <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 18, fontWeight: 800 }}>Recenze na mě</div>
          <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 12.5 }}>{reviews.length} {_wPlural(reviews.length, 'recenze', 'recenze', 'recenzí')}</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px calc(20px + env(safe-area-inset-bottom))' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {reviews.length === 0 && (
            <div style={{ padding: '40px 24px', borderRadius: 20, background: '#fff', textAlign: 'center', color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 14, lineHeight: 1.6 }}>
              <div style={{ fontSize: 42, marginBottom: 10 }}>⭐</div>
              Zatím nemáš žádné recenze. Po dokončené brigádě tě zaměstnavatel ohodnotí a recenze se objeví tady.
            </div>
          )}
          {reviews.map(r => {
            const thread = replies[r.id] || [];
            return (
              <div key={r.id} style={{ background: '#fff', borderRadius: 20, padding: 18, boxShadow: '0 4px 20px rgba(0,32,246,0.06)' }}>
                {/* Hlavička recenze */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: r.text ? 12 : 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 13, background: T.avatarGrad, display: 'grid', placeItems: 'center', color: '#fff', fontFamily: T.fontHead, fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{r.avatar}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.author}</span>
                        {r.verified && <Icon name="verified-check-bold" size={13} color={T.green} />}
                      </div>
                      <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 12, marginTop: 1 }}>{[r.jobTitle, r.when].filter(Boolean).join(' · ')}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                    {[1, 2, 3, 4, 5].map(n => <WStar key={n} size={15} color={n <= r.rating ? T.super : 'rgba(18,18,26,0.14)'} />)}
                  </div>
                </div>
                {r.text && <div style={{ color: T.inkSoft, fontFamily: T.fontUI, fontSize: 14.5, lineHeight: 1.55, fontStyle: 'italic' }}>„{r.text}"</div>}

                {/* Vlákno odpovědí */}
                {thread.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
                    {thread.map(rep => {
                      const mine = rep.author_id === uid;
                      return (
                        <div key={rep.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                          <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 11, fontWeight: 700, marginBottom: 3, textAlign: mine ? 'right' : 'left', padding: '0 4px' }}>
                            {mine ? 'Ty' : r.author}
                          </div>
                          <div style={{
                            padding: '10px 14px', borderRadius: 16,
                            background: mine ? T.primary : T.surfaceAlt,
                            color: mine ? '#fff' : T.ink, fontFamily: T.fontUI, fontSize: 13.5, lineHeight: 1.45,
                            borderBottomRightRadius: mine ? 5 : 16, borderBottomLeftRadius: mine ? 16 : 5,
                          }}>{rep.text}</div>
                          <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 10.5, marginTop: 3, textAlign: mine ? 'right' : 'left', padding: '0 4px' }}>{relTime(rep.created_at)}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Odpovědět */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 14 }}>
                  <input
                    value={drafts[r.id] || ''}
                    onChange={e => setDrafts(prev => ({ ...prev, [r.id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send(r.id); } }}
                    placeholder="Odpovědět na recenzi…"
                    style={{ flex: 1, minWidth: 0, padding: '11px 15px', borderRadius: 999, background: T.bg, border: '1px solid ' + T.border, color: T.ink, fontFamily: T.fontUI, fontSize: 13.5, outline: 'none' }}
                  />
                  <button onClick={() => send(r.id)} disabled={sendingId === r.id || !(drafts[r.id] || '').trim()} style={{
                    width: 42, height: 42, borderRadius: 999, flexShrink: 0, border: 'none', cursor: 'pointer',
                    background: T.primary, display: 'grid', placeItems: 'center',
                    opacity: (sendingId === r.id || !(drafts[r.id] || '').trim()) ? 0.5 : 1,
                    boxShadow: '0 6px 14px rgba(0,32,246,0.28)',
                  }}><Icon name="plain-bold" size={16} color="#fff" /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const labelStyle = { color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 };
const fieldStyle = { width: '100%', padding: '12px 14px', borderRadius: 12, background: '#fff', border: '1px solid ' + T.border, color: T.ink, fontFamily: T.fontUI, fontSize: 14, outline: 'none' };
const pillStyle = { padding: '9px 16px', borderRadius: 999, background: '#fff', border: '1px solid ' + T.border, boxShadow: '0 2px 6px rgba(20,22,40,0.05)', color: T.ink, fontFamily: T.fontHead, fontSize: 14, fontWeight: 700 };

// ── Řádky v kartě (iOS-settings styl): štítek vlevo, hodnota/vstup vpravo ──
const radek = { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px' };
const radekLabel = { color: T.muted, fontFamily: T.fontHead, fontSize: 15, fontWeight: 700, flexShrink: 0 };
const radekInput = { border: 'none', outline: 'none', background: 'transparent', textAlign: 'right', fontFamily: T.fontHead, fontWeight: 800, fontSize: 16, color: T.ink, minWidth: 0, flex: 1 };
const poznamka = { color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 12.5, lineHeight: 1.45, margin: '8px 4px 0' };
const fotoBtn = { width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '15px 12px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.fontHead, fontSize: 16, fontWeight: 700, color: T.ink, WebkitTapHighlightColor: 'transparent' };

// Kamera a galerie nejsou v nabundlované Solar sadě → kreslíme je inline.
const _wIcoKamera = (c, s = 20) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 8.5h2.6l1.4-1.9h6.9l1.4 1.9h2.7a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13.2" r="3.1" /></svg>);
const _wIcoGalerie = (c, s = 20) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="4.5" width="17" height="15" rx="2.6" /><circle cx="9" cy="10" r="1.7" /><path d="M4.5 17.5l4.5-4.3 3.2 3 3-2.4 4.3 3.7" /></svg>);

function WOverenoPill() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0, padding: '5px 10px', borderRadius: 999, background: 'rgba(31,157,92,0.12)', color: T.green, fontFamily: T.fontHead, fontSize: 12, fontWeight: 800 }}>
      <Icon name="verified-check-bold" size={13} color={T.green} />Ověřeno
    </span>
  );
}

function WOveritBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{ flexShrink: 0, padding: '6px 13px', borderRadius: 999, background: T.tint, border: '1px solid rgba(0,32,246,0.2)', color: T.primary, fontFamily: T.fontHead, fontSize: 12.5, fontWeight: 800, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>Ověřit</button>
  );
}

// Nevyplněná část profilu — pobídka, proč to vyplnit. Upravovat jde jen přes
// tlačítko Upravit nahoře, takže karta sama editaci nespouští (není klikací).
const prazdnaKarta = {
  width: '100%', textAlign: 'left',
  borderRadius: 20, padding: '18px 20px',
  background: 'rgba(255,255,255,0.6)',
  border: '1px dashed #d9def0',
  fontFamily: 'inherit',
};

// Jednou větou, co konkrétně chybí do dalšího stupně.
// Místo tří řádků s odškrtáváním — na profil stačí vědět, co dodělat.
function _wChybi(trust) {
  const chybi = (trust.pozadavky || []).filter(p => !p.splneno);
  if (!chybi.length) return 'už jen chvilka';
  const kus = p => {
    if (p.klic === 'brigady') {
      const n = Math.max(0, p.cil - p.ted);
      return _wPlural(n, '1 brigáda', n + ' brigády', n + ' brigád');
    }
    if (p.klic === 'spolehlivost') return 'spolehlivost ' + p.cil + ' %';
    return 'hodnocení ' + String(p.cil).replace('.', ',');
  };
  const casti = chybi.map(kus);
  if (casti.length === 1) return casti[0];
  return casti.slice(0, -1).join(', ') + ' a ' + casti[casti.length - 1];
}

// ── Stupeň důvěry — vysvětlení a všechna kritéria (proklik z profilu) ──
function WTrustPage({ trust, onClose }) {
  const cardShadow = '0 4px 20px rgba(0,32,246,0.06)';
  const karta = { background: '#fff', borderRadius: 20, boxShadow: cardShadow, padding: '18px 20px' };
  const sekce = { color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 10 };

  // Podmínky stupně vypsané slovy, ať se nemusí luštit z čísel
  const kriteria = t => [
    t.brigady > 0 && _wPlural(t.brigady, '1 dokončená brigáda', t.brigady + ' dokončené brigády', t.brigady + ' dokončených brigád'),
    t.spolehlivost > 0 && 'spolehlivost ' + t.spolehlivost + ' %',
    t.hodnoceni > 0 && 'hodnocení ' + String(t.hodnoceni).replace('.', ',') + ' a výš',
  ].filter(Boolean).join(' · ') || 'bez podmínek — sem patří každý nový účet';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 140, background: T.bg, display: 'flex', flexDirection: 'column', animation: 'wPop .28s cubic-bezier(.2,.8,.2,1)' }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: 'calc(12px + env(safe-area-inset-top)) 16px 12px', background: '#fff', borderBottom: '1px solid ' + T.border }}>
        <WZpet onClick={onClose} />
        <div>
          <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 18, fontWeight: 800 }}>Stupeň důvěry</div>
          <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 12.5 }}>{trust.tier.nazev} · {trust.index + 1}. ze {trust.stupnu}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px calc(24px + env(safe-area-inset-bottom))' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>

          {/* Co to je */}
          <div style={{ ...karta, marginBottom: 18 }}>
            <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Co to je</div>
            <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 13.5, lineHeight: 1.6 }}>
              Stupeň ukazuje, jak spolehlivě chodíš na brigády. Neroste za používání
              aplikace ani za body — počítá se jen z toho, co jde ověřit: kolik brigád
              máš odpracovaných, jestli jsi nezrušil potvrzenou směnu a jak tě hodnotí firmy.
            </div>
          </div>

          {/* Kde jsi teď */}
          <div style={sekce}>Kde jsi teď</div>
          <div style={{ ...karta, marginBottom: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { v: trust.stats.spolehlivost === null ? '—' : trust.stats.spolehlivost + ' %', l: 'Spolehlivost' },
                { v: trust.stats.hodnoceni > 0 ? trust.stats.hodnoceni.toFixed(1).replace('.', ',') : '—', l: 'Hodnocení' },
                { v: trust.stats.dokoncene, l: 'Dokončeno' },
              ].map(s => (
                <div key={s.l} style={{ background: T.surfaceAlt, borderRadius: 14, padding: '12px 6px', textAlign: 'center' }}>
                  <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 18, fontWeight: 800 }}>{s.v}</div>
                  <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 10.5, fontWeight: 600, marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>
            {trust.stats.zrusene > 0 && (
              <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 12.5, marginTop: 12, lineHeight: 1.5 }}>
                Spolehlivost počítáme jako podíl odpracovaných směn ze všech, které jsi potvrdil.
                Zrušené směny: <b style={{ color: T.ink }}>{trust.stats.zrusene}</b>.
              </div>
            )}
          </div>

          {/* Co ještě chybí do dalšího stupně */}
          {!trust.jeMax && (<>
            <div style={sekce}>Do stupně {trust.dalsi.nazev}</div>
            <div style={{ ...karta, marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 11 }}>
              {trust.pozadavky.map(p => (
                <div key={p.klic} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 19, height: 19, borderRadius: 999, flexShrink: 0,
                    background: p.splneno ? T.green : T.surfaceAlt,
                    display: 'grid', placeItems: 'center',
                  }}>
                    {p.splneno && <Icon name="check-circle-bold" size={12} color="#fff" />}
                  </span>
                  <span style={{ flex: 1, color: p.splneno ? T.muted : T.ink, fontFamily: T.fontUI, fontSize: 13.5, fontWeight: 600 }}>{p.popis}</span>
                  <span style={{ color: p.splneno ? T.green : T.ink, fontFamily: T.fontHead, fontSize: 13.5, fontWeight: 800, flexShrink: 0 }}>{p.text}</span>
                </div>
              ))}
            </div>
          </>)}

          {/* Všechny stupně a jejich podmínky */}
          <div style={sekce}>Všechny stupně</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {W_TIERS.map((t, i) => {
              const dosazeno = i <= trust.index;
              const tenhle   = i === trust.index;
              return (
                <div key={t.key} style={{
                  ...karta, padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: 13,
                  outline: tenhle ? '2px solid ' + t.barva : 'none', outlineOffset: -1,
                }}>
                  {/* Skutečný odznáček stupně — dosažené svítí, další jsou ztlumené */}
                  <span style={{ flexShrink: 0 }}>
                    <WLevelBadge level={t.blevel} label={t.nazev} locked={!dosazeno} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                      {tenhle
                        ? <span style={{ padding: '2px 8px', borderRadius: 999, background: t.barva + '1f', color: t.barva, fontFamily: T.fontUI, fontSize: 10.5, fontWeight: 800 }}>máš teď</span>
                        : dosazeno
                          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: T.green, fontFamily: T.fontUI, fontSize: 11, fontWeight: 800 }}><Icon name="check-circle-bold" size={12} color={T.green} />splněno</span>
                          : <span style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 11, fontWeight: 800 }}>{i + 1}. stupeň</span>}
                    </div>
                    <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 12.5, lineHeight: 1.45 }}>{kriteria(t)}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 11.5, lineHeight: 1.5, marginTop: 16, textAlign: 'center' }}>
            Stupeň se přepočítá sám po každé dokončené brigádě.
          </div>
        </div>
      </div>
    </div>
  );
}
