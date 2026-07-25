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

function WDatumPicker({ value, onChange }) {
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
      <button onClick={() => setOpen(o => !o)} style={{
        ...fieldStyle, width: '100%', textAlign: 'left', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 9, color: value ? T.ink : T.mutedSoft,
      }}>
        <Icon name="calendar-bold" size={17} color={value ? T.primary : T.mutedSoft} />
        <span style={{ flex: 1 }}>{value ? _wFmtDatum(value) : 'Vyber datum narození'}</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 61, marginTop: 10, padding: '10px 0 12px',
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

function WProfile({ tick, onSignOut, onGoTab }) {
  const [editing, setEditing] = useStateW(false);
  const [saving,  setSaving]  = useStateW(false);
  const [form,    setForm]    = useStateW({ titul: '', titulZa: '', jmeno: '', druhe: '', prijmeni: '', rodne: '', datum: '', kraj: '', mesto: '', telPredvolba: '+420', telCislo: '', email: '', ridicak: false, auto: false, bio: '', skills: [], stupen: '', obor: '', cv_url: '' });
  const [uctuEmail, setUctuEmail] = useStateW('');   // přihlašovací e-mail (fallback do kontaktu)
  const [skillInput, setSkillInput] = useStateW('');
  const [titulShake, setTitulShake] = useStateW(0);   // šťouchnutí do polí titulu při zablokovaném uložení
  const [userId,  setUserId]  = useStateW(null);
  const [showAllReviews, setShowAllReviews] = useStateW(false);
  const [reviewsPageOpen, setReviewsPageOpen] = useStateW(false);
  const [earningsOpen, setEarningsOpen]       = useStateW(false);
  const [trustOpen, setTrustOpen]             = useStateW(false);
  const [notifsOn, setNotifsOn] = useStateW(() => (typeof localStorage === 'undefined' || localStorage.getItem('makej-notifs') !== 'off'));
  const [soundOn, setSoundOn] = useStateW(() => (typeof localStorage === 'undefined' || localStorage.getItem('makej-notif-sound') !== 'off'));
  const [confirmDel, setConfirmDel] = useStateW(false);
  const [deleting, setDeleting] = useStateW(false);

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
  async function handleDeleteAccount() {
    if (deleting) return;
    setDeleting(true);
    const { error } = await sb.rpc('delete_my_account');
    if (error) { setDeleting(false); alert('Účet se nepodařilo smazat. Zkus to prosím znovu.'); return; }
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
  const initials = name.split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '?';

  const skills    = Array.isArray(W_PROFILE.skills) ? W_PROFILE.skills : [];
  const education = W_PROFILE.education || '';
  const cvUrl     = W_PROFILE.cv_url || '';
  const rating  = Number(W_PROFILE.rating)  || 0;
  const trust   = makejTrust({ ...W_TRUST, hodnoceni: rating });
  // Počty i výdělek se počítají z odpracovaných brigád, ne z předpočítaných
  // sloupců v profilu — jinak by hlavní číslo nesedělo s rozpisem ve statistikách.
  const vyd     = makejVydelky(W_HISTORY);
  const maxMesic = Math.max(1, ...vyd.mesice.map(m => m.castka));
  const reviews = Array.isArray(W_REVIEWS) ? W_REVIEWS : [];
  const shownReviews = showAllReviews ? reviews : reviews.slice(0, 3);

  const cardShadow = '0 4px 20px rgba(0,32,246,0.06)';
  // Jeden tvar pro všechny velké karty. Dřív jich tu bylo osm různých zaoblení
  // (12 až 24 px) a každá karta jiné odsazení — profil kvůli tomu nedržel pohromadě.
  // Systém: velká karta 20, malá dlaždice 16, pilulka 999.
  const KARTA = { background: '#fff', borderRadius: 20, boxShadow: cardShadow, padding: '18px 20px' };
  // Každé číslo má barvu podle významu, ne tři stejně modrá vedle sebe —
  // `#0020F6` je tak syté, že ve třech velkých číslech vibrovalo.
  // Zlatá = hodnocení, modrá = práce, zelená = čas a peníze.
  const STATS3 = [
    {
      value: rating > 0 ? rating.toFixed(1).replace('.', ',') : '—',
      // Místo obecného „Hodnocení" rovnou počet recenzí — je to informace navíc
      // a zároveň říká, co se po klepnutí otevře.
      label: reviews.length > 0
        ? reviews.length + ' ' + _wPlural(reviews.length, 'recenze', 'recenze', 'recenzí')
        : 'Hodnocení',
      barva: '#b8791a',
      onClick: () => setReviewsPageOpen(true),
      title: 'Zobrazit recenze a odpovědět',
    },
    {
      value: vyd.pocet, label: 'Brigády', barva: T.primaryDeep,
      onClick: () => onGoTab && onGoTab('history'),
      title: 'Zobrazit brigády v kalendáři',
    },
    {
      value: `${vyd.hodin} h`, label: 'Odpracováno', barva: T.green,
      onClick: () => setEarningsOpen(true),
      title: 'Zobrazit statistiky výdělků',
    },
  ];

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 460, margin: '0 auto', width: '100%', padding: '24px 20px calc(28px + env(safe-area-inset-bottom))' }}>

        {/* ── Header: nadpis „Profil" + ikona úpravy (odsazená od zvonečku) ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingRight: 50 }}>
          <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 26, fontWeight: 800, letterSpacing: -0.6 }}>Můj profil</div>
          {/* Úpravy jen přes tlačítko vedle nadpisu. V klidu „Upravit",
              v úpravách zelené „Hotovo" (uloží) + šedé „Zrušit" (zahodí). */}
          {editing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
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
          ) : (
            <button onClick={() => setEditing(true)} title="Upravit profil" style={{
              flexShrink: 0, padding: '8px 16px', borderRadius: 999, cursor: 'pointer',
              background: T.tint, border: '1px solid rgba(0,32,246,0.16)', color: T.primary,
              fontFamily: T.fontHead, fontSize: 14, fontWeight: 800,
              WebkitTapHighlightColor: 'transparent',
            }}>Upravit</button>
          )}
        </div>

        {/* ── Avatar + jméno + stupeň (úpravy jen přes tlačítko nahoře) ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 62, height: 62, borderRadius: 999, flexShrink: 0,
            background: T.avatarGrad,
            display: 'grid', placeItems: 'center',
            color: '#fff', fontFamily: T.fontHead, fontWeight: 700, fontSize: 20,
            boxShadow: '0 14px 26px -14px rgba(0,32,246,0.5)',
          }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editing ? (
              /* Živý náhled — mění se, jak vyplňuješ kolonky jména níž */
              <div>
                <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 20, fontWeight: 800, letterSpacing: -0.4, lineHeight: 1.2, wordBreak: 'break-word' }}>
                  {_wSlozJmeno(form) || 'Tvoje jméno'}
                </div>
                <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 12, marginTop: 3 }}>Uprav jméno v kolonkách níž</div>
              </div>
            ) : (<>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 22, fontWeight: 800, letterSpacing: -0.4 }}>{name}</span>
                {W_PROFILE.verified && <Icon name="verified-check-bold" size={16} color={T.primary} />}
              </div>
            </>)}
          </div>
        </div>

        {editing ? (
          /* ── EDIT MODE ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <div style={labelStyle}>Osobní údaje</div>
              {/* Pořadí kolonek odshora dolů = jak se jméno čte:
                  titul před · jméno · příjmení · titul za.
                  Tituly našeptávají a berou jen hodnoty ze seznamu. */}
              <div style={{ display: 'flex', gap: 8 }}>
                <WTitulPicker value={form.titul} onChange={v => setForm(f => ({ ...f, titul: v }))}
                  placeholder="Titul před" obal={{ width: 132, flexShrink: 0 }} shakeSignal={titulShake} />
                <input value={form.jmeno} onChange={e => setForm(f => ({ ...f, jmeno: e.target.value }))} placeholder="Jméno" style={{ ...fieldStyle, flex: 1, minWidth: 0 }} />
              </div>
              <input value={form.prijmeni} onChange={e => setForm(f => ({ ...f, prijmeni: e.target.value }))} placeholder="Příjmení" style={{ ...fieldStyle, marginTop: 8 }} />
              <WTitulPicker value={form.titulZa} onChange={v => setForm(f => ({ ...f, titulZa: v }))}
                placeholder="Titul za" obal={{ marginTop: 8 }} shakeSignal={titulShake} />
              {/* Datum narození — vlastní „revolver" (stejný jako v kalendáři),
                  tři kolečka den · měsíc · rok, roluješ do středu. */}
              <div style={{ marginTop: 14 }}>
                <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 12.5, fontWeight: 600, marginBottom: 5, marginLeft: 2 }}>Datum narození</div>
                <WDatumPicker value={form.datum} onChange={v => setForm(f => ({ ...f, datum: v }))} />
              </div>
              <div style={{ marginTop: 14 }}>
                <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 12.5, fontWeight: 600, marginBottom: 5, marginLeft: 2 }}>Kde působíš</div>
                <select value={form.kraj} onChange={e => setForm(f => ({ ...f, kraj: e.target.value }))}
                  style={{ ...fieldStyle, width: '100%', cursor: 'pointer', color: form.kraj ? T.ink : T.mutedSoft }}>
                  <option value="" style={{ color: '#111' }}>Vyber kraj</option>
                  {KRAJE_W.map(k => <option key={k.id} value={k.id} style={{ color: '#111' }}>{k.name}</option>)}
                </select>
                <input value={form.mesto} onChange={e => setForm(f => ({ ...f, mesto: e.target.value }))} placeholder="Město (nepovinné)" style={{ ...fieldStyle, marginTop: 8 }} />
              </div>
            </div>
            <div>
              <div style={labelStyle}>Kontaktní údaje</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={form.telPredvolba} onChange={e => setForm(f => ({ ...f, telPredvolba: e.target.value }))}
                  style={{ ...fieldStyle, width: 104, flexShrink: 0, cursor: 'pointer' }}>
                  {_W_PREDVOLBY.map(p => <option key={p.kod} value={p.kod}>{p.vlajka + ' ' + p.kod}</option>)}
                </select>
                <input type="tel" inputMode="tel" value={form.telCislo} onChange={e => setForm(f => ({ ...f, telCislo: e.target.value }))} placeholder="Telefonní číslo" style={{ ...fieldStyle, flex: 1, minWidth: 0 }} />
              </div>
              <input type="email" inputMode="email" autoCapitalize="none" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder={uctuEmail || 'E-mail'} style={{ ...fieldStyle, marginTop: 8 }} />
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
            {/* Ukládá se zeleným „Hotovo" nahoře — spodní tlačítko by bylo dvakrát */}
          </div>
        ) : (
          <>
            {/* ── Výdělek — statistiky otevře klepnutí kamkoli na kartu ── */}
            <button onClick={() => setEarningsOpen(true)} title="Zobrazit statistiky výdělků" style={{
              ...KARTA, width: '100%', textAlign: 'left',
              marginBottom: 16, border: 'none', cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}>
              <div style={{ marginBottom: 11 }}>
                <span style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 11, fontWeight: 800, letterSpacing: 0.9, textTransform: 'uppercase' }}>Za tento měsíc vyděláno</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
                  <span style={{ color: T.green, fontFamily: T.fontHead, fontWeight: 800, fontSize: 34, letterSpacing: -0.8, lineHeight: 1 }}>{_wKc(vyd.tentoMesic.castka)}</span>
                  <span style={{ color: T.muted, fontFamily: T.fontUI, fontWeight: 700, fontSize: 15 }}>Kč</span>
                </div>

                {vyd.pocet > 0 && (
                  /* Náhled posledních 6 měsíců — poslední sloupec je běžící měsíc */
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 34, flexShrink: 0 }}>
                    {vyd.mesice.map((m, i) => (
                      <span key={m.klic} style={{
                        width: 7, borderRadius: 3,
                        height: (m.castka === 0 ? 4 : Math.max(7, Math.round((m.castka / maxMesic) * 34))) + 'px',
                        background: i === vyd.mesice.length - 1 ? T.green : 'rgba(31,157,92,0.22)',
                      }} />
                    ))}
                  </div>
                )}
              </div>

              {vyd.pocet === 0 && (
                <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 12.5, marginTop: 6 }}>
                  Až odpracuješ první brigádu, uvidíš tady svůj výdělek.
                </div>
              )}
            </button>

            {/* ── Stupeň důvěry — zjednodušeno na odznak, pruh a jednu větu.
                   Tři dlaždice uvnitř opakovaly čísla z řádku pod kartou
                   a tři řádky s podmínkami byly na profil moc podrobné. ── */}
            <button onClick={() => setTrustOpen(true)} title="Co je stupeň důvěry" style={{
              ...KARTA, width: '100%', textAlign: 'left', marginBottom: 16,
              border: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 11px 5px 8px', borderRadius: 999,
                  background: trust.tier.barva + '1f',
                }}>
                  <Icon name={trust.index === 0 ? 'user-bold' : 'verified-check-bold'} size={14} color={trust.tier.barva} />
                  <span style={{ color: trust.tier.barva, fontFamily: T.fontHead, fontSize: 14, fontWeight: 800 }}>{trust.tier.nazev}</span>
                </span>
                <span style={{ flex: 1 }} />
                <span style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 12, fontWeight: 600 }}>
                  {trust.index + 1}. ze {trust.stupnu}
                </span>
              </div>

              {trust.jeMax ? (
                <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 12.5, marginTop: 10 }}>
                  Nejvyšší stupeň. Drž si ho a firmy tě uvidí mezi prvními.
                </div>
              ) : (<>
                <div style={{ height: 6, borderRadius: 999, background: T.surfaceAlt, overflow: 'hidden', margin: '14px 0 9px' }}>
                  <div style={{
                    height: '100%', width: Math.max(3, Math.round(trust.progress * 100)) + '%',
                    borderRadius: 999, background: trust.tier.barva, transition: 'width .4s',
                  }} />
                </div>
                <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 12.5, lineHeight: 1.45 }}>
                  Do stupně <b style={{ color: T.ink, fontFamily: T.fontHead }}>{trust.dalsi.nazev}</b>
                  {' '}ti chybí {_wChybi(trust)}.
                </div>
              </>)}
            </button>

            {/* ── Čísla v jedné kartě, oddělená tenkou čárkou. Bez ikon —
                   hvězda u „5,0" ani hodiny u „43 h" nic nepřidávaly, popisek
                   pod číslem říká to samé. Hodnocení je proklik na recenze. ── */}
            <div style={{ ...KARTA, padding: '18px 8px', display: 'flex', alignItems: 'stretch', marginBottom: 24 }}>
              {STATS3.map((s, i) => {
                const Prvek = s.onClick ? 'button' : 'div';
                return (
                  <React.Fragment key={s.label}>
                    {i > 0 && <div style={{ width: 1, background: T.border, flexShrink: 0, margin: '2px 0' }} />}
                    <Prvek onClick={s.onClick} title={s.title}
                      style={{
                        flex: 1, minWidth: 0, padding: '0 6px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        background: 'none', border: 'none', fontFamily: 'inherit',
                        cursor: s.onClick ? 'pointer' : 'default',
                        WebkitTapHighlightColor: 'transparent',
                      }}>
                      {/* Barvu nesou čísla, ne dekorace okolo */}
                      <span style={{ color: s.barva || T.ink, fontFamily: T.fontHead, fontSize: 24, fontWeight: 800, letterSpacing: -0.6, lineHeight: 1.1 }}>{s.value}</span>
                      <span style={{
                        marginTop: 4, color: T.muted, fontFamily: T.fontUI, fontSize: 11.5, fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}>{s.label}</span>
                    </Prvek>
                  </React.Fragment>
                );
              })}
            </div>

            {/* ── O mně ── */}
            <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <div style={{ ...labelStyle, padding: '0 4px' }}>O mně</div>
                {bio ? (
                  <div style={{ ...KARTA, color: T.ink, fontFamily: T.fontUI, fontSize: 14.5, lineHeight: 1.6 }}>{bio}</div>
                ) : (
                  <div style={prazdnaKarta}>
                    <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 14.5, fontWeight: 800, marginBottom: 3 }}>Napiš o sobě pár vět</div>
                    <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 13, lineHeight: 1.5 }}>
                      Firmy si vybírají i podle toho, co o sobě napíšeš. Klepni nahoře na <b style={{ color: T.primary, fontFamily: T.fontHead }}>Upravit</b> a přidej dvě věty — co umíš a kdy můžeš.
                    </div>
                  </div>
                )}
                {education && (
                  <div style={{ ...KARTA, marginTop: 12 }}>
                    <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Vzdělání</div>
                    <div style={{ color: T.ink, fontFamily: T.fontUI, fontSize: 14.5 }}>{education}</div>
                  </div>
                )}
                {cvUrl && (
                  <a href={cvUrl} target="_blank" rel="noopener noreferrer" style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderRadius: 14, background: '#fff', boxShadow: cardShadow, color: T.ink, fontFamily: T.fontHead, fontSize: 14, fontWeight: 800, textDecoration: 'none' }}>
                    <Icon name="document-text-bold" size={16} color={T.primary} />Můj životopis
                  </a>
                )}
              </div>
              <div>
                <div style={{ ...labelStyle, padding: '0 4px' }}>Dovednosti</div>
                {skills.length === 0 ? (
                  <div style={prazdnaKarta}>
                    <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 14.5, fontWeight: 800, marginBottom: 3 }}>Přidej svoje dovednosti</div>
                    <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 13, lineHeight: 1.5 }}>
                      Třeba práce na kase, řidičák B nebo angličtina. Přes <b style={{ color: T.primary, fontFamily: T.fontHead }}>Upravit</b> je doplníš a firma hned vidí, na co se hodíš.
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {skills.map((sk, i) => <span key={i} style={pillStyle}>{sk}</span>)}
                  </div>
                )}
              </div>
            </div>

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

      {/* Potvrzení smazání účtu */}
      {confirmDel && (
        <div onClick={() => !deleting && setConfirmDel(false)} style={{
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
            <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 21, fontWeight: 800, letterSpacing: -0.4 }}>Smazat účet?</div>
            <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>
              Trvale se odstraní tvůj profil, brigády, zprávy i recenze. Tuhle akci nelze vrátit.
            </div>
            <button onClick={handleDeleteAccount} disabled={deleting} style={{
              width: '100%', marginTop: 20, padding: '14px', borderRadius: 14,
              background: '#f43f5e', border: 'none', color: '#fff',
              fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, cursor: deleting ? 'default' : 'pointer', opacity: deleting ? 0.6 : 1,
            }}>{deleting ? 'Mažu…' : 'Ano, smazat účet'}</button>
            <button onClick={() => !deleting && setConfirmDel(false)} style={{
              width: '100%', marginTop: 10, padding: '13px', borderRadius: 14,
              background: T.surfaceAlt, border: '1px solid ' + T.border, color: T.muted,
              fontFamily: T.fontHead, fontSize: 14.5, fontWeight: 800, cursor: 'pointer',
            }}>Zpět</button>
          </div>
        </div>
      )}
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

// ── Statistiky výdělků (proklik z karty na profilu) ──────────────
function WEarningsPage({ vyd, onClose }) {
  const cardShadow = '0 4px 20px rgba(0,32,246,0.06)';
  const [vseFirmy, setVseFirmy] = useStateW(false);
  const [vseBrigady, setVseBrigady] = useStateW(false);
  const [vybranyMesic, setVybranyMesic] = useStateW(null);   // klíč 'RRRR-MM', null = vše

  // ── Období grafu ──────────────────────────────────────────────
  const dnesKlic = (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); })();
  const [obdobi, setObdobi] = useStateW('6');                 // '3' | '6' | '12' | 'vlastni'
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

  // Rozsah podle zvoleného období. U „vlastní" se obrácené zadání otočí,
  // ať uživatel nekouká na prázdný graf jen kvůli pořadí.
  const rozsah = (() => {
    if (obdobi === 'vlastni') {
      return vlastniOd <= vlastniDo ? { od: vlastniOd, do: vlastniDo } : { od: vlastniDo, do: vlastniOd };
    }
    return { od: _wMesicZpet(dnesKlic, Number(obdobi) - 1), do: dnesKlic };
  })();

  const mesiceGrafu = makejMesice(vyd.hotove, rozsah.od, rozsah.do);
  const vObdobi = vyd.hotove.filter(h => {
    const k = String(h.eventDate || '').slice(0, 7);
    return k >= rozsah.od && k <= rozsah.do;
  });

  // Klik na sloupec grafu zúží stránku na jediný měsíc; jinak platí celé období.
  const mesicObj = vybranyMesic ? mesiceGrafu.find(m => m.klic === vybranyMesic) : null;
  const z = vybranyMesic
    ? makejVydelky(vyd.hotove.filter(h => String(h.eventDate || '').slice(0, 7) === vybranyMesic))
    : makejVydelky(vObdobi);

  // Vybraný měsíc musí zůstat uvnitř období — po přepnutí ho jinak nejde odznačit
  useEffectW(() => {
    if (vybranyMesic && !mesiceGrafu.some(m => m.klic === vybranyMesic)) setVybranyMesic(null);
  }, [rozsah.od, rozsah.do]);

  // Nejvyšší sloupec v zobrazeném období — podle něj se škáluje graf
  const maxMesic = Math.max(1, ...mesiceGrafu.map(m => m.castka));

  const popisObdobi = obdobi === '3' ? 'Poslední 3 měsíce'
    : obdobi === '6' ? 'Posledních 6 měsíců'
    : obdobi === '12' ? 'Poslední rok'
    : _W_MESICE[Number(rozsah.od.slice(5)) - 1] + ' ' + rozsah.od.slice(0, 4)
      + ' – ' + _W_MESICE[Number(rozsah.do.slice(5)) - 1] + ' ' + rozsah.do.slice(0, 4);

  const firmy   = vseFirmy   ? z.podleFirem : z.podleFirem.slice(0, 4);
  const brigady = vseBrigady ? z.hotove     : z.hotove.slice(0, 6);

  const sekce = { color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 10 };
  const karta = { background: '#fff', borderRadius: 20, boxShadow: cardShadow, padding: '16px 18px' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 140, background: T.bg, display: 'flex', flexDirection: 'column', animation: 'wPop .28s cubic-bezier(.2,.8,.2,1)' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: 'calc(12px + env(safe-area-inset-top)) 16px 12px', background: '#fff', borderBottom: '1px solid ' + T.border }}>
        <WZpet onClick={onClose} />
        <div>
          <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 18, fontWeight: 800 }}>Výdělky</div>
          <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 12.5 }}>
            {mesicObj ? _W_MESICE[mesicObj.mesic] + ' ' + mesicObj.rok
                      : 'Z ' + vyd.pocet + ' ' + _wPlural(vyd.pocet, 'odpracované brigády', 'odpracovaných brigád', 'odpracovaných brigád')}
          </div>
        </div>
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

            {/* Celkem — plná barva bez přechodu a bez textury.
                Zrušené „Zobrazit vše": měsíc se odznačí druhým klepnutím na
                jeho sloupec a období se přepíná pod grafem. */}
            <div style={{ background: '#157643', borderRadius: 20, padding: '18px 20px', marginBottom: 18 }}>
              <div style={{ color: '#c9f2dd', fontFamily: T.fontUI, fontSize: 10.5, fontWeight: 800, letterSpacing: 1.4, marginBottom: 8 }}>
                {mesicObj ? _W_MESICE[mesicObj.mesic].toUpperCase() + ' ' + mesicObj.rok : 'CELKEM VYDĚLÁNO'}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ color: '#fff', fontFamily: T.fontHead, fontWeight: 800, fontSize: 38, letterSpacing: -0.5, lineHeight: 1 }}>{_wKc(z.celkem)}</span>
                <span style={{ color: '#c9f2dd', fontFamily: T.fontUI, fontWeight: 700, fontSize: 16 }}>Kč</span>
              </div>
              <div style={{ color: '#c9f2dd', fontFamily: T.fontUI, fontSize: 12, marginTop: 7 }}>
                {z.pocet} {_wPlural(z.pocet, 'brigáda', 'brigády', 'brigád')} · {z.hodin} h
              </div>
            </div>

            {/* Průměry */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 18 }}>
              {[
                { v: _wKc(z.naHodinu), j: 'Kč', l: 'Průměr na hodinu' },
                { v: _wKc(z.naBrigadu), j: 'Kč', l: 'Průměr na brigádu' },
                { v: z.hodin, j: 'h', l: 'Odpracováno' },
              ].map(s => (
                <div key={s.l} style={{ background: '#fff', borderRadius: 16, boxShadow: cardShadow, padding: '14px 8px', textAlign: 'center' }}>
                  <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 18, fontWeight: 800 }}>
                    {s.v}<span style={{ fontSize: 11, color: T.muted, marginLeft: 2 }}>{s.j}</span>
                  </div>
                  <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 10.5, fontWeight: 600, marginTop: 3, lineHeight: 1.25 }}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Přepínač období + graf. Klik na sloupec zúží stránku na ten měsíc. */}
            <div style={sekce}>{popisObdobi}</div>
            <div style={{ ...karta, marginBottom: 18 }}>

              <div style={{ display: 'flex', gap: 5, marginBottom: 16, background: T.surfaceAlt, borderRadius: 12, padding: 4 }}>
                {[
                  { k: '3', p: '3 měsíce' },
                  { k: '6', p: '6 měsíců' },
                  { k: '12', p: 'Rok' },
                  { k: 'vlastni', p: 'Vlastní' },
                ].map(o => {
                  const akt = obdobi === o.k;
                  return (
                    <button key={o.k} onClick={() => setObdobi(o.k)} style={{
                      flex: 1, padding: '7px 4px', borderRadius: 9, border: 'none', cursor: 'pointer',
                      background: akt ? '#fff' : 'transparent',
                      boxShadow: akt ? '0 2px 6px rgba(20,22,40,0.1)' : 'none',
                      color: akt ? T.ink : T.muted,
                      fontFamily: T.fontHead, fontSize: 12, fontWeight: 800,
                      whiteSpace: 'nowrap', transition: 'background .15s, color .15s',
                    }}>{o.p}</button>
                  );
                })}
              </div>

              {obdobi === 'vlastni' && (
                /* Na mobilu otevře select systémový výběr — přesně „vybereš měsíce" */
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  {[
                    { hod: vlastniOd, set: setVlastniOd, popis: 'Od' },
                    { hod: vlastniDo, set: setVlastniDo, popis: 'Do' },
                  ].map((v, i) => (
                    <React.Fragment key={v.popis}>
                      {i > 0 && <span style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 12 }}>–</span>}
                      <label style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 10.5, fontWeight: 700, marginBottom: 3 }}>{v.popis}</span>
                        <select value={v.hod} onChange={e => v.set(e.target.value)} style={{
                          width: '100%', padding: '9px 10px', borderRadius: 11,
                          background: '#fff', border: '1px solid ' + T.border, color: T.ink,
                          fontFamily: T.fontUI, fontSize: 13, fontWeight: 600, outline: 'none', cursor: 'pointer',
                        }}>
                          {nabidkaMesicu.map(k => (
                            <option key={k} value={k}>
                              {_W_MESICE[Number(k.slice(5)) - 1]} {k.slice(0, 4)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </React.Fragment>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: mesiceGrafu.length > 8 ? 4 : 8, height: 130 }}>
                {mesiceGrafu.map(m => {
                  const vyska  = m.castka === 0 ? 3 : Math.max(8, Math.round((m.castka / maxMesic) * 100));
                  const vybrany = m.klic === vybranyMesic;
                  // Bez výběru je zvýrazněný nejlepší měsíc, s výběrem ten vybraný
                  const zvyrazni = vybrany || (!vybranyMesic && m.castka > 0 && m.castka === maxMesic);
                  return (
                    <button key={m.klic}
                      onClick={() => setVybranyMesic(vybrany ? null : m.klic)}
                      title={_W_MESICE[m.mesic] + ' ' + m.rok + ' · ' + _wKc(m.castka) + ' Kč'}
                      style={{
                        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        height: '100%', justifyContent: 'flex-end', padding: 0,
                        background: 'none', border: 'none', cursor: 'pointer',
                      }}>
                      <span style={{ color: zvyrazni ? '#18854d' : T.muted, fontFamily: T.fontHead, fontSize: mesiceGrafu.length > 8 ? 8.5 : 10.5, fontWeight: 800, whiteSpace: 'nowrap' }}>
                        {m.castka > 0 ? _wKc(m.castka) : '—'}
                      </span>
                      <div style={{
                        width: '100%', height: vyska + '%', borderRadius: 8,
                        background: zvyrazni ? T.green : (m.castka > 0 ? 'rgba(31,157,92,0.24)' : T.border),
                        outline: vybrany ? '2px solid ' + T.green : 'none', outlineOffset: 2,
                        transition: 'height .4s cubic-bezier(.2,.8,.2,1), background .2s',
                      }} />
                      <span style={{ color: vybrany ? '#18854d' : T.mutedSoft, fontFamily: T.fontUI, fontSize: mesiceGrafu.length > 8 ? 9 : 10.5, fontWeight: vybrany ? 800 : 700 }}>{_W_MESICE_ZKR[m.mesic]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ve vybraném měsíci nemusí být nic — pak nemá cenu ukazovat prázdné sekce */}
            {z.pocet === 0 ? (
              <div style={{ ...karta, textAlign: 'center', padding: '26px 22px' }}>
                {/* Mluv o datech, ne o člověku — mohl pracovat, jen ne přes appku.
                    Zároveň to obchází mužský rod („jsi nepracoval"). */}
                <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 15, fontWeight: 800 }}>
                  V {_W_MESICE_2[mesicObj.mesic]} {mesicObj.rok} není žádný záznam o brigádě
                </div>
                <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 13, marginTop: 5 }}>
                  Vyber jiný měsíc, nebo klepni na sloupec znovu a uvidíš celé období.
                </div>
              </div>
            ) : (<>

            {/* Podle firem */}
            <div style={sekce}>Kde sis vydělal</div>
            <div style={{ ...karta, marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 13 }}>
              {firmy.map(f => (
                <div key={f.company}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
                    <span style={{ flex: 1, minWidth: 0, color: T.ink, fontFamily: T.fontHead, fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.company}</span>
                    <span style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 11.5, flexShrink: 0 }}>{f.pocet}×</span>
                    <span style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{_wKc(f.castka)} Kč</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 999, background: T.surfaceAlt, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: Math.max(3, Math.round((f.castka / z.celkem) * 100)) + '%', borderRadius: 999, background: T.green, transition: 'width .4s' }} />
                  </div>
                </div>
              ))}
              {z.podleFirem.length > 4 && (
                <button onClick={() => setVseFirmy(v => !v)} style={{ background: 'none', border: 'none', color: T.primary, fontFamily: T.fontHead, fontSize: 12.5, fontWeight: 800, cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                  {vseFirmy ? 'Zobrazit méně' : `Zobrazit všech ${z.podleFirem.length}`}
                </button>
              )}
            </div>

            {/* Jednotlivé brigády */}
            <div style={sekce}>Jednotlivé brigády</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {brigady.map(h => (
                <div key={h.id} style={{ ...karta, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.jobTitle}</div>
                    <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 12, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {[h.company, h.dateText, h.hodin + ' h'].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <span style={{ color: T.green, fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, flexShrink: 0 }}>+{_wKc(h.castka)} Kč</span>
                </div>
              ))}
              {z.hotove.length > 6 && (
                <button onClick={() => setVseBrigady(v => !v)} style={{ background: 'none', border: 'none', color: T.primary, fontFamily: T.fontHead, fontSize: 13, fontWeight: 800, cursor: 'pointer', padding: '4px 0' }}>
                  {vseBrigady ? 'Zobrazit méně' : `Zobrazit všech ${z.hotove.length}`}
                </button>
              )}
            </div>
            </>)}

            <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 11.5, lineHeight: 1.5, marginTop: 16, textAlign: 'center' }}>
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
                    {[1, 2, 3, 4, 5].map(n => <Icon key={n} name="star-bold" size={15} color={n <= r.rating ? T.super : 'rgba(18,18,26,0.14)'} />)}
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
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  outline: tenhle ? '2px solid ' + t.barva : 'none', outlineOffset: -1,
                }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: 999, flexShrink: 0, marginTop: 1,
                    background: dosazeno ? t.barva : T.surfaceAlt,
                    display: 'grid', placeItems: 'center',
                    color: '#fff', fontFamily: T.fontHead, fontSize: 11, fontWeight: 800,
                  }}>
                    {dosazeno ? <Icon name="check-circle-bold" size={13} color="#fff" /> : <span style={{ color: T.mutedSoft }}>{i + 1}</span>}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ color: dosazeno ? t.barva : T.ink, fontFamily: T.fontHead, fontSize: 15, fontWeight: 800 }}>{t.nazev}</span>
                      {tenhle && (
                        <span style={{ padding: '2px 8px', borderRadius: 999, background: t.barva + '1f', color: t.barva, fontFamily: T.fontUI, fontSize: 10.5, fontWeight: 800 }}>máš teď</span>
                      )}
                    </div>
                    <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 12.5, marginTop: 3, lineHeight: 1.45 }}>{kriteria(t)}</div>
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
