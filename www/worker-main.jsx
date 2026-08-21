// Makej Worker — Root app component

// ── Zvuk upozornění ──────────────────────────────────────────────
// Tón se syntetizuje přes Web Audio, ne z MP3 — appka musí fungovat offline
// a tohle nepřidá do balíčku ani bajt.
let _wAudioCtx = null;

function _wAudio() {
  if (_wAudioCtx) return _wAudioCtx;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  try { _wAudioCtx = new Ctx(); } catch (e) { return null; }
  return _wAudioCtx;
}

// iOS i Android pustí zvuk až po dotyku uživatele. Navíc iOS kontext znovu uspí
// při přepnutí appky na pozadí — proto neposloucháme jen jednou, ale průběžně.
if (typeof document !== 'undefined') {
  const unlock = () => {
    const ctx = _wAudio();
    if (ctx && ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
  };
  document.addEventListener('touchstart', unlock, { passive: true });
  document.addEventListener('click', unlock);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) unlock(); });
}

function wSoundEnabled() {
  try { return localStorage.getItem('makej-notif-sound') !== 'off'; } catch (e) { return true; }
}

// Jeden úder — základní tón + rychleji doznívající harmonické.
// Právě ten rozdíl v délce doznívání dělá "udeřený kov" místo pípnutí.
function _wStrike(ctx, dest, freq, at, gain) {
  const partials = [
    { mult: 1,    amp: 1.00, decay: 0.90 },   // základ — nese výšku tónu
    { mult: 2.01, amp: 0.42, decay: 0.42 },   // lehce rozladěná oktáva → jiskra
    { mult: 3.01, amp: 0.18, decay: 0.22 },   // horní harmonická → kovový úder
    { mult: 5.4,  amp: 0.07, decay: 0.10 },   // krátký "klik" na začátku
  ];
  partials.forEach(p => {
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * p.mult, at);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain * p.amp, at + 0.004);   // ostrý úder
    g.gain.exponentialRampToValueAtTime(0.0001, at + p.decay);       // doznívání
    osc.connect(g); g.connect(dest);
    osc.start(at);
    osc.stop(at + p.decay + 0.05);
  });
}

function wPlayBell() {
  if (!wSoundEnabled()) return;
  const ctx = _wAudio();
  if (!ctx) return;

  // Tóny se musí naplánovat až když kontext běží. Kdyby se plánovaly během
  // `suspended`, `currentTime` stojí — naplánovaný čas by byl minulost
  // a zvuk by vyjel až při dalším doteku uživatele.
  const fire = () => {
    try {
      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.5, now);
      master.connect(ctx.destination);
      // Dva údery ve stoupavé kvartě — druhý o něco tišeji, ať to nezní jako budík
      _wStrike(ctx, master, 1318.5, now,        0.34);   // E6
      _wStrike(ctx, master, 1760.0, now + 0.10, 0.30);   // A6
    } catch (e) { /* zvuk je doplněk — nikdy nesmí shodit upozornění */ }
  };

  if (ctx.state === 'running') { fire(); return; }
  // iOS uspí kontext i po přepnutí appky na pozadí — proto to zkoušíme pokaždé
  try { ctx.resume().then(fire).catch(() => {}); } catch (e) {}
}

// Čas upozornění — čerstvé relativně, starší s konkrétním datem a hodinou.
// Po uložení do DB přežijí i několik dní, kdy "před 52 h" nikomu nic neřekne.
function _wRelTime(ts) {
  const d = new Date(ts);
  const s = Math.floor((Date.now() - ts) / 1000);
  const cas = d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

  if (s < 60) return 'teď';
  if (s < 3600) return `před ${Math.floor(s / 60)} min`;

  const dnes  = new Date(); dnes.setHours(0, 0, 0, 0);
  const vcera = new Date(dnes); vcera.setDate(vcera.getDate() - 1);
  const den   = new Date(ts);   den.setHours(0, 0, 0, 0);

  if (den.getTime() === dnes.getTime())  return `dnes ${cas}`;
  if (den.getTime() === vcera.getTime()) return `včera ${cas}`;
  return `${d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })} ${cas}`;
}

// Vizuální styl podle typu upozornění (barvy sladěné se světlým tématem)
// Čtvereček vlevo v upozornění — monogram firmy, nebo značka Makej.
function WNotifZnacka({ avatar, size }) {
  const s = size || 38;
  const spolecne = {
    width: s, height: s, borderRadius: Math.round(s * 0.29), flexShrink: 0,
    display: 'grid', placeItems: 'center',
    position: 'relative', overflow: 'hidden',   // kvůli logu přes iniciály
    color: '#fff', fontFamily: T.fontHead, fontWeight: 800,
    // Jemný šedý stín a světlá hrana, ať čtvereček neleží na ploše natvrdo
    border: '1px solid rgba(255,255,255,0.35)',
    boxShadow: '0 3px 8px -2px rgba(20,22,40,0.28), 0 1px 2px rgba(20,22,40,0.12)',
  };
  if (avatar) {
    return (
      <div style={{ ...spolecne, background: avatar.color, fontSize: Math.round(s * 0.34) }}>
        {/* Iniciály leží vespod, logo se přes ně položí. Když se obrázek nenačte
            (smazaný, bez signálu), schová se a iniciály zase prosvítají. */}
        <span>{avatar.initials}</span>
        {avatar.logo && (
          <img src={avatar.logo} alt=""
            onError={e => { e.currentTarget.style.display = 'none'; }}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', borderRadius: 'inherit',
            }} />
        )}
      </div>
    );
  }
  return (
    <div style={{ ...spolecne, background: T.primary }}>
      {/* Obojí v jednom prvku — jako dvě děti gridu by se „M" a „!" rozpadly pod sebe */}
      <span style={{ fontSize: Math.round(s * 0.42), letterSpacing: -0.5, lineHeight: 1, whiteSpace: 'nowrap' }}>
        M<span style={{ color: '#8fa0ff' }}>!</span>
      </span>
    </div>
  );
}

// Jeden banner. Chová se jako systémové upozornění v telefonu:
// klepnutím se otevře, co upozornění nabízí, tahem nahoru se odsune.
function WToastItem({ t, onRemove }) {
  const [dy, setDy]   = useStateW(0);        // posun prstem
  const [pryc, setPryc] = useStateW(false);  // odsunuto → dojede animace a zmizí
  const tah = useRefW(null);

  function otevri() {
    if (t.action && t.action.onClick) t.action.onClick();
    onRemove(t.id);
  }

  function zmiz() {
    setPryc(true);
    setTimeout(() => onRemove(t.id), 220);
  }

  function start(e) {
    const p = e.touches && e.touches[0];
    tah.current = p ? { y: p.clientY, x: p.clientX, cas: Date.now(), tahal: false } : null;
  }
  function pohyb(e) {
    const z = tah.current, p = e.touches && e.touches[0];
    if (!z || !p) return;
    const d = p.clientY - z.y;
    if (Math.abs(d) > 4) z.tahal = true;
    setDy(d < 0 ? d : d * 0.25);   // dolů klade odpor, nahoru jde volně
  }
  function konec() {
    const z = tah.current;
    tah.current = null;
    if (!z) return;
    if (dy < -45) { zmiz(); return; }         // dost daleko nahoru → odsunout
    setDy(0);
    if (!z.tahal && Date.now() - z.cas < 600) otevri();   // klepnutí, ne tah
  }

  return (
    <div
      onClick={e => { if (!('ontouchstart' in window)) otevri(); }}
      onTouchStart={start} onTouchMove={pohyb} onTouchEnd={konec}
      style={{
        display: 'flex', gap: 11, alignItems: 'center',
        padding: '12px 14px',
        borderRadius: 20,
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '0.5px solid rgba(255,255,255,0.9)',
        boxShadow: '0 12px 32px -10px rgba(20,22,40,0.3), 0 2px 6px rgba(20,22,40,0.06)',
        cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        transform: 'translateY(' + (pryc ? -140 : dy) + 'px)',
        opacity: pryc ? 0 : 1,
        transition: tah.current ? 'none' : 'transform .22s cubic-bezier(.2,.8,.2,1), opacity .22s',
        animation: pryc ? 'none' : 'wToastIn .42s cubic-bezier(.16,1,.3,1)',
      }}>
      {/* Odesílatel, ne piktogram: monogram firmy, a když firmu neznáme, značka Makej.
          Barevné ikonky v pastelových čtverečcích působily obecně. */}
      <WNotifZnacka avatar={t.avatar} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ flex: 1, minWidth: 0, color: T.ink, fontFamily: T.fontHead, fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</span>
          <span style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 11.5, flexShrink: 0 }}>teď</span>
        </div>
        {t.text && (
          <div style={{
            color: T.light, fontFamily: T.fontUI, fontSize: 12.5, marginTop: 2, lineHeight: 1.4,
            overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
            WebkitLineClamp: t.pocet > 1 ? 1 : 2, WebkitBoxOrient: 'vertical',
          }}>{t.text}</div>
        )}
        {/* Sloučené zprávy od jedné firmy — text patří té poslední */}
        {t.pocet > 1 && (
          <div style={{ color: T.primary, fontFamily: T.fontHead, fontSize: 11.5, fontWeight: 800, marginTop: 3 }}>
            {_wPlural(t.pocet, '1 nová zpráva', t.pocet + ' nové zprávy', t.pocet + ' nových zpráv')}
          </div>
        )}
      </div>
    </div>
  );
}

function WToast({ toasts, onRemove }) {
  if (!toasts.length) return null;
  return (
    <div style={{
      position: 'fixed', top: 'calc(8px + env(safe-area-inset-top))', left: 10, right: 10,
      zIndex: 9000, display: 'flex', flexDirection: 'column', gap: 8,
      maxWidth: 460, margin: '0 auto',
    }}>
      {/* `verze` v klíči: další zpráva od téže firmy banner vykreslí znovu,
          takže viditelně vyjede a nahradí předchozí text */}
      {toasts.map(t => <WToastItem key={t.id + ':' + (t.verze || 0)} t={t} onRemove={onRemove} />)}
    </div>
  );
}

// Měsíc/rok z ISO data recenze (7/2026).
function _wRevDate(iso) {
  try { const d = new Date(iso); return (d.getMonth() + 1) + '/' + d.getFullYear(); } catch (e) { return ''; }
}
// Hvězdy s částečnou výplní poslední hvězdy podle desetinné části (4,8 → pátá z 80 %).
// U celých čísel (jednotlivé recenze) je vždy celá/prázdná.
function WStars({ value, size }) {
  const path = 'M6 1l1.6 3.2 3.4.5-2.5 2.4.6 3.4L6 8.9 2.9 10.5l.6-3.4L1 4.7l3.4-.5L6 1z';
  const full = Math.floor(value);
  const frac = value - full;
  const pct = Math.round(frac * 100);
  const gid = 'wStarG' + pct;
  return (
    <span style={{ display: 'inline-flex', gap: 2 }} aria-label={value.toFixed(1).replace('.', ',') + ' z 5 hvězd'}>
      {[0, 1, 2, 3, 4].map(i => {
        const partial = i === full && frac > 0.05;
        const fill = i < full ? '#FFC46B' : (partial ? 'url(#' + gid + ')' : '#E6E9F5');
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
            {partial && (
              <defs><linearGradient id={gid} x1="0" x2="1" y1="0" y2="0">
                <stop offset={pct + '%'} stopColor="#FFC46B" />
                <stop offset={pct + '%'} stopColor="#E6E9F5" />
              </linearGradient></defs>
            )}
            <path d={path} fill={fill} />
          </svg>
        );
      })}
    </span>
  );
}

// ── Recenze firmy — spodní panel (proklik z hodnocení v inzerátu) ──────────────
function WReviewsPanel({ employerId, data, onClose }) {
  const company = (data && data.company) || {};
  const [items, setItems] = useStateW(() => (data && Array.isArray(data.items)) ? data.items : (employerId ? null : []));
  const [loading, setLoading] = useStateW(!!employerId);

  useEffectW(() => {
    if (!employerId) return;   // demo → recenze z data
    let alive = true;
    sb.from('reviews').select('*, reviewer:profiles!reviews_reviewer_id_fkey(name)').eq('reviewed_id', employerId).order('created_at', { ascending: false })
      .then(({ data: rows }) => { if (alive) { setItems(rows || []); setLoading(false); } });
    return () => { alive = false; };
  }, [employerId]);

  const norm = (items || []).map(r => {
    const author = r.author || (r.reviewer && r.reviewer.name) || 'Brigádník';
    return {
      author,
      initials: r.initials || author.split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '??',
      rating: Number(r.rating) || 0,
      text: r.text || '',
      date: r.date || (r.created_at ? _wRevDate(r.created_at) : ''),
      role: r.role || '',
      shifts: Number(r.shifts) || 0,
      reply: r.reply || null,
    };
  });

  const rating = Number((data && data.rating) || (norm.length ? norm.reduce((a, r) => a + r.rating, 0) / norm.length : 0));
  const count = (data && data.count) || norm.length;
  const dist = (data && data.distribution) || (() => {
    const d = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    norm.forEach(r => { const k = Math.round(r.rating); if (d[k] != null) d[k]++; });
    return d;
  })();
  const distTotal = [5, 4, 3, 2, 1].reduce((a, k) => a + (dist[k] || 0), 0) || 1;
  const noLow = (dist[2] || 0) === 0 && (dist[1] || 0) === 0;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 210, background: 'rgba(11,18,51,0.4)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', animation: 'wScrimIn .3s ease' }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-label={'Recenze firmy ' + (company.name || '')} style={{
        background: '#fff', borderRadius: '24px 24px 0 0', overflow: 'hidden',
        boxShadow: '0 -14px 40px rgba(11,18,51,0.22)', height: 'min(660px, 88vh)',
        display: 'flex', flexDirection: 'column', animation: 'wSheetUp .34s cubic-bezier(.24,1,.32,1) both',
      }}>
        {/* Úchyt */}
        <div style={{ flex: 'none', padding: '9px 0 0', display: 'flex', justifyContent: 'center' }}>
          <span style={{ width: 38, height: 4, borderRadius: 999, background: T.border }} />
        </div>

        {/* Hlavička firmy */}
        <div style={{ flex: 'none', padding: '14px 20px 15px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid ' + T.border }}>
          <span style={{ width: 44, height: 44, flex: 'none', borderRadius: 14, background: company.color || T.primary, color: '#fff', fontFamily: T.fontHead, fontSize: 16, fontWeight: 800, display: 'grid', placeItems: 'center' }}>{company.logo}</span>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: T.fontHead, fontSize: 17, fontWeight: 800, color: T.ink, minWidth: 0 }}>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{company.name}</span>
              {company.verified && (typeof WVerifiedBadge === 'function' ? <WVerifiedBadge size={15} /> : <Icon name="verified-check-bold" size={14} color={T.primary} />)}
            </span>
            {[company.category, company.district].filter(Boolean).length > 0 && (
              <span style={{ fontFamily: T.fontUI, fontSize: 12, color: T.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{[company.category, company.district].filter(Boolean).join(' · ')}</span>
            )}
          </div>
          <button onClick={onClose} aria-label="Zavřít" style={{ width: 32, height: 32, flex: 'none', border: 0, borderRadius: 10, background: T.surfaceAlt, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M1 1l10 10M11 1L1 11" stroke={T.muted} strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>

        {/* Souhrn: velké číslo + rozložení hvězd */}
        <div style={{ flex: 'none', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 18, borderBottom: '1px solid ' + T.border }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flex: 'none' }}>
            <span style={{ fontFamily: T.fontHead, fontSize: 38, fontWeight: 800, color: T.ink, letterSpacing: -1, lineHeight: 1 }}>{rating.toFixed(1).replace('.', ',')}</span>
            <WStars value={rating} size={12} />
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[5, 4, 3, 2, 1].filter(k => (dist[k] || 0) > 0).map(k => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ fontFamily: T.fontHead, fontSize: 10, fontWeight: 800, color: T.mutedSoft, width: 8 }}>{k}</span>
                <span style={{ flex: 1, height: 6, borderRadius: 999, background: T.bg, overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', borderRadius: 999, background: T.primary, width: Math.round((dist[k] / distTotal) * 100) + '%' }} /></span>
                <span style={{ fontFamily: T.fontUI, fontSize: 10, fontWeight: 700, color: T.muted, width: 20, textAlign: 'right' }}>{dist[k]}</span>
              </div>
            ))}
            <span style={{ fontFamily: T.fontUI, fontSize: 11, color: T.mutedSoft, paddingTop: 1 }}>{count} {_wPlural(count, 'hodnocení', 'hodnocení', 'hodnocení')}{noLow && count > 0 ? ' · nikdo nedal míň než tři' : ''}</span>
          </div>
        </div>

        {/* Seznam recenzí */}
        <div className="wgallery" style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '2px 20px 0' }}>
          {loading ? (
            <div style={{ padding: '20px 0', color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 13 }}>Načítám…</div>
          ) : norm.length === 0 ? (
            <div style={{ padding: '24px 2px', color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 13, lineHeight: 1.5 }}>Tahle firma zatím nemá žádné recenze.</div>
          ) : norm.map((r, i) => (
            <div key={i} style={{ padding: '16px 0', display: 'flex', gap: 12, borderTop: i > 0 ? '1px solid ' + T.border : 'none' }}>
              <span style={{ width: 36, height: 36, flex: 'none', borderRadius: 12, background: T.tint, color: T.primary, fontFamily: T.fontHead, fontSize: 12, fontWeight: 800, display: 'grid', placeItems: 'center' }}>{r.initials}</span>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: T.fontHead, fontSize: 14, fontWeight: 800, color: T.ink }}>{r.author}</span>
                  <WStars value={r.rating} size={11} />
                  {r.date && <span style={{ marginLeft: 'auto', fontFamily: T.fontUI, fontSize: 11, color: T.mutedSoft }}>{r.date}</span>}
                </div>
                {r.text && <span style={{ fontFamily: T.fontUI, fontSize: 13, color: T.inkSoft, lineHeight: 1.55 }}>{r.text}</span>}
                {(r.role || r.shifts > 0) && <span style={{ fontFamily: T.fontUI, fontSize: 11, fontWeight: 700, color: T.muted }}>{[r.role, r.shifts > 0 ? r.shifts + ' ' + _wPlural(r.shifts, 'směna', 'směny', 'směn') : ''].filter(Boolean).join(' · ')}</span>}
                {r.reply && (
                  <div style={{ background: T.surfaceAlt, borderRadius: 12, padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 5, marginTop: 2 }}>
                    <span style={{ fontFamily: T.fontHead, fontSize: 11, fontWeight: 800, color: T.primary }}>Odpověď firmy</span>
                    <span style={{ fontFamily: T.fontUI, fontSize: 12, color: T.inkSoft, lineHeight: 1.5 }}>{r.reply}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Patka */}
        <div style={{ flex: 'none', borderTop: '1px solid ' + T.border, padding: '13px 20px calc(18px + env(safe-area-inset-bottom))', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <span style={{ fontFamily: T.fontUI, fontSize: 11, color: T.mutedSoft }}>Hodnotí jen brigádník po odpracované směně</span>
        </div>
      </div>
    </div>
  );
}

// ── Pracovní doba — spodní panel (proklik z dlaždice „Kdy") ────────────────────
const _W_DNY_ZKR  = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
const _W_DNY_FULL = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];
function _wExpandWhen(s) {
  s = (s || '').trim();
  for (let i = 0; i < _W_DNY_ZKR.length; i++) if (s.indexOf(_W_DNY_ZKR[i] + ' ') === 0) return _W_DNY_FULL[i] + s.slice(_W_DNY_ZKR[i].length);
  return s;
}
function _wParseHoursStr(t) {
  const m = (t || '').match(/(\d{1,2}):(\d{2})\D+(\d{1,2}):(\d{2})/);
  if (!m) return 0;
  const a = +m[1] * 60 + +m[2], b = +m[3] * 60 + +m[4];
  return Math.round(((b - a + 1440) % 1440) / 6) / 10;
}
function _wWeekFromWhen(s) {
  s = (s || '').trim();
  let idx = 4;
  for (let i = 0; i < _W_DNY_ZKR.length; i++) if (s.indexOf(_W_DNY_ZKR[i]) === 0) { idx = i; break; }
  const dm = s.match(/(\d{1,2})\s*\./);
  const day = dm ? +dm[1] : 8;
  const monday = day - idx;
  return _W_DNY_ZKR.map((n, i) => ({ n, d: monday + i, on: i === idx, busy: (i === idx - 1 || i === idx - 3) && (i >= 0) }));
}
function _wHodPlural(h) { return h === 1 ? 'hodinu' : (h >= 2 && h <= 4 ? 'hodiny' : 'hodin'); }

// Iconly Light-Outline — Kalendář. Barvitelný (fill = color), aby vzal barvu jako Solar ikona.
function WIcoCalendar({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <g transform="translate(2,1)" fill={color} fillRule="evenodd">
        <path d="M13.7935,-6.03961325e-14 C14.2075,-6.03961325e-14 14.5435,0.336 14.5435,0.75 L14.54396,1.59781054 C16.0040654,1.69791596 17.2167254,2.19804662 18.075,3.0581 C19.012,3.9991 19.505,5.3521 19.5000377,6.9751 L19.5000377,16.0981 C19.5000377,19.4301 17.384,21.5001 13.979,21.5001 L5.521,21.5001 C2.116,21.5001 0,19.4011 0,16.0221 L0,6.9731 C0,3.83029205 1.88705568,1.8129398 4.96468634,1.59815387 L4.9653,0.75 C4.9653,0.336 5.3013,-6.03961325e-14 5.7153,-6.03961325e-14 C6.1293,-6.03961325e-14 6.4653,0.336 6.4653,0.75 L6.465,1.579 L13.043,1.579 L13.0435,0.75 C13.0435,0.336 13.3795,-6.03961325e-14 13.7935,-6.03961325e-14 Z M18,8.904 L1.5,8.904 L1.5,16.0221 C1.5,18.5881 2.928,20.0001 5.521,20.0001 L13.979,20.0001 C16.572,20.0001 18.0000357,18.6141 18.0000357,16.0981 L18,8.904 Z M14.2012,15.1963 C14.6152,15.1963 14.9512,15.5323 14.9512,15.9463 C14.9512,16.3603 14.6152,16.6963 14.2012,16.6963 C13.7872,16.6963 13.4472,16.3603 13.4472,15.9463 C13.4472,15.5323 13.7782,15.1963 14.1922,15.1963 L14.2012,15.1963 Z M9.7637,15.1963 C10.1777,15.1963 10.5137,15.5323 10.5137,15.9463 C10.5137,16.3603 10.1777,16.6963 9.7637,16.6963 C9.3497,16.6963 9.0097,16.3603 9.0097,15.9463 C9.0097,15.5323 9.3407,15.1963 9.7547,15.1963 L9.7637,15.1963 Z M5.3169,15.1963 C5.7309,15.1963 6.0669,15.5323 6.0669,15.9463 C6.0669,16.3603 5.7309,16.6963 5.3169,16.6963 C4.9029,16.6963 4.5619,16.3603 4.5619,15.9463 C4.5619,15.5323 4.8939,15.1963 5.3079,15.1963 L5.3169,15.1963 Z M14.2012,11.3096 C14.6152,11.3096 14.9512,11.6456 14.9512,12.0596 C14.9512,12.4736 14.6152,12.8096 14.2012,12.8096 C13.7872,12.8096 13.4472,12.4736 13.4472,12.0596 C13.4472,11.6456 13.7782,11.3096 14.1922,11.3096 L14.2012,11.3096 Z M9.7637,11.3096 C10.1777,11.3096 10.5137,11.6456 10.5137,12.0596 C10.5137,12.4736 10.1777,12.8096 9.7637,12.8096 C9.3497,12.8096 9.0097,12.4736 9.0097,12.0596 C9.0097,11.6456 9.3407,11.3096 9.7547,11.3096 L9.7637,11.3096 Z M5.3169,11.3096 C5.7309,11.3096 6.0669,11.6456 6.0669,12.0596 C6.0669,12.4736 5.7309,12.8096 5.3169,12.8096 C4.9029,12.8096 4.5619,12.4736 4.5619,12.0596 C4.5619,11.6456 4.8939,11.3096 5.3079,11.3096 L5.3169,11.3096 Z M13.043,3.079 L6.465,3.079 L6.4653,4.041 C6.4653,4.455 6.1293,4.791 5.7153,4.791 C5.3013,4.791 4.9653,4.455 4.9653,4.041 L4.96476779,3.10170243 C2.72453716,3.2898928 1.5,4.64785567 1.5,6.9731 L1.5,7.404 L18,7.404 L18.0000357,6.9731 C18.004,5.7381 17.672,4.7781 17.013,4.1181 C16.4345144,3.53790796 15.5888563,3.19140086 14.5443509,3.10218199 L14.5435,4.041 C14.5435,4.455 14.2075,4.791 13.7935,4.791 C13.3795,4.791 13.0435,4.455 13.0435,4.041 L13.043,3.079 Z" />
      </g>
    </svg>
  );
}

// Iconly Light-Outline — Zvoneček (Notification). Barvitelný.
function WIcoBell({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <g transform="translate(3,1)" fill={color} fillRule="evenodd">
        <path d="M7.3243,19.106 C7.8423,19.683 8.5073,20 9.1973,20 L9.1983,20 C9.8913,20 10.5593,19.683 11.0783,19.105 C11.3563,18.798 11.8303,18.773 12.1373,19.05 C12.4453,19.327 12.4703,19.802 12.1933,20.109 C11.3853,21.006 10.3223,21.5 9.1983,21.5 L9.1963,21.5 C8.0753,21.499 7.0143,21.005 6.2093,20.108 C5.9323,19.801 5.9573,19.326 6.2653,19.05 C6.5733,18.772 7.0473,18.797 7.3243,19.106 Z M9.2471,0 C13.6921,0 16.6781,3.462 16.6781,6.695 C16.6781,8.358 17.1011,9.063 17.5501,9.811 C17.9941,10.549 18.4971,11.387 18.4971,12.971 C18.1481,17.018 13.9231,17.348 9.2471,17.348 C4.5711,17.348 0.3451,17.018 8.66453236e-05,13.035 C-0.0029,11.387 0.5001,10.549 0.9441,9.811 L1.10084456,9.54715551 C1.48677474,8.88385813 1.8161,8.16235294 1.8161,6.695 C1.8161,3.462 4.8021,0 9.2471,0 Z M9.2471,1.5 C5.7521,1.5 3.3161,4.238 3.3161,6.695 C3.3161,8.774 2.7391,9.735 2.2291,10.583 C1.8201,11.264 1.4971,11.802 1.4971,12.971 C1.6641,14.857 2.9091,15.848 9.2471,15.848 C15.5501,15.848 16.8341,14.813 17.0001,12.906 C16.9971,11.802 16.6741,11.264 16.2651,10.583 C15.7551,9.735 15.1781,8.774 15.1781,6.695 C15.1781,4.238 12.7421,1.5 9.2471,1.5 Z" />
      </g>
    </svg>
  );
}

// Iconly Light-Outline — Profil. Barvitelný.
function WIcoProfile({ size = 22, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 25 25" fill="none" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M12.216 4C10.1884 4 8.54492 5.64275 8.54492 7.66973C8.54492 9.69672 10.1884 11.3395 12.216 11.3395C14.2421 11.3395 15.8857 9.69686 15.8857 7.66973C15.8857 5.6426 14.2421 4 12.216 4ZM7.04492 7.66973C7.04492 4.81374 9.36055 2.5 12.216 2.5C15.0702 2.5 17.3857 4.81389 17.3857 7.66973C17.3857 10.5256 15.0702 12.8395 12.216 12.8395C9.36055 12.8395 7.04492 10.5257 7.04492 7.66973Z" fill={color} />
      <path fillRule="evenodd" clipRule="evenodd" d="M6.12892 19.685C7.91289 20.6222 9.98939 21.0057 12.2481 21.0001H12.2517C14.5104 21.0057 16.5869 20.6222 18.3708 19.685C17.3464 17.2392 15.0595 16.0617 12.2518 16.0689H12.248C9.43683 16.0617 7.15365 17.2364 6.12892 19.685ZM12.2499 14.5689C8.75048 14.5605 5.63352 16.1881 4.49194 19.7981L4.31468 20.3586L4.81665 20.6646C7.02101 22.0084 9.58365 22.5064 12.2499 22.5001C14.9162 22.5064 17.4788 22.0084 19.6832 20.6646L20.1851 20.3586L20.0079 19.7981C18.8675 16.1917 15.7459 14.5605 12.2499 14.5689Z" fill={color} />
    </svg>
  );
}

// Iconly Light-Outline — Lidé (skupina). Barvitelný. Stejný styl jako v navbaru.
function WIcoPeople({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 25 25" fill="none" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M9.73137 4.36572C7.80046 4.36572 6.23535 5.93016 6.23535 7.86049C6.23535 9.79082 7.80046 11.3553 9.73137 11.3553C11.6609 11.3553 13.2261 9.79097 13.2261 7.86049C13.2261 5.93001 11.6609 4.36572 9.73137 4.36572ZM4.73535 7.86049C4.73535 5.10115 6.97261 2.86572 9.73137 2.86572C12.489 2.86572 14.7261 5.1013 14.7261 7.86049C14.7261 10.6197 12.489 12.8553 9.73137 12.8553C6.97261 12.8553 4.73535 10.6198 4.73535 7.86049Z" fill={color} />
      <path fillRule="evenodd" clipRule="evenodd" d="M16.3096 5.91602C15.5772 5.91602 14.9194 6.23084 14.4624 6.7348L13.9585 7.29038L12.8474 6.28275L13.3512 5.72717C14.0806 4.92277 15.1365 4.41602 16.3096 4.41602C18.5132 4.41602 20.3009 6.20243 20.3009 8.40729C20.3009 10.6121 18.5132 12.3986 16.3096 12.3986C14.9021 12.3986 13.6651 11.6698 12.9552 10.5723L12.5479 9.94256L13.8074 9.12791L14.2147 9.75767C14.6598 10.4458 15.432 10.8986 16.3096 10.8986C17.6851 10.8986 18.8009 9.78343 18.8009 8.40729C18.8009 7.03115 17.6851 5.91602 16.3096 5.91602Z" fill={color} />
      <path fillRule="evenodd" clipRule="evenodd" d="M3.92336 19.3866C5.62582 20.2747 7.60642 20.6389 9.76225 20.6336H9.76591C11.9217 20.6389 13.9023 20.2747 15.6047 19.3866C14.6212 17.0681 12.4438 15.9501 9.766 15.957H9.76216C7.08098 15.9501 4.90705 17.0654 3.92336 19.3866ZM9.76408 14.457C6.39368 14.4489 3.38615 16.0175 2.2849 19.4999L2.10765 20.0604L2.60961 20.3664C4.73277 21.6607 7.19982 22.1397 9.76408 22.1336C12.3283 22.1397 14.7954 21.6607 16.9185 20.3664L17.4205 20.0604L17.2433 19.4999C16.1432 16.0209 13.1312 14.449 9.76408 14.457Z" fill={color} />
      <path fillRule="evenodd" clipRule="evenodd" d="M16.3334 14.766C14.9686 14.7625 13.8071 15.1535 12.9904 15.9051L12.4386 16.413L11.4228 15.3093L11.9747 14.8014C13.1337 13.7347 14.6923 13.2622 16.3353 13.266C18.9631 13.2599 21.3464 14.4923 22.2154 17.2406L22.3927 17.8011L21.8907 18.1071C20.2328 19.1178 18.3133 19.4873 16.3335 19.4824L15.5835 19.4806L15.5872 17.9806L16.3372 17.9824C17.9008 17.9863 19.3303 17.7324 20.5644 17.1257C19.8178 15.5367 18.2678 14.761 16.3373 14.766H16.3334Z" fill={color} />
    </svg>
  );
}

// Iconly Light-Outline — Lokace (špendlík). Barvitelný.
function WIcoPin({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 25 24" fill="none" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M8.76025 10.7105C8.76025 8.91521 10.2151 7.45999 12.0097 7.45999C13.8052 7.45999 15.2603 8.91501 15.2603 10.7105C15.2603 12.5052 13.805 13.96 12.0097 13.96C10.2153 13.96 8.76025 12.505 8.76025 10.7105ZM12.0097 8.95999C11.0439 8.95999 10.2603 9.74324 10.2603 10.7105C10.2603 11.6765 11.0437 12.46 12.0097 12.46C12.977 12.46 13.7603 11.6763 13.7603 10.7105C13.7603 9.74344 12.9768 8.95999 12.0097 8.95999Z" fill={color} />
      <path fillRule="evenodd" clipRule="evenodd" d="M11.9995 3.75C8.28063 3.75 5.25 6.8073 5.25 10.5986C5.25 13.0726 6.31773 15.5147 7.75334 17.3467C8.46835 18.2592 9.25791 18.9983 10.0196 19.5035C10.7928 20.0162 11.4786 20.25 11.9995 20.25C12.5207 20.25 13.2068 20.0162 13.98 19.5035C14.7419 18.9983 15.5315 18.2592 16.2466 17.3467C17.6823 15.5147 18.75 13.0726 18.75 10.5986C18.75 6.80743 15.7185 3.75 11.9995 3.75ZM3.75 10.5986C3.75 5.99763 7.43357 2.25 11.9995 2.25C16.5653 2.25 20.25 5.9975 20.25 10.5986C20.25 13.4847 19.017 16.2433 17.4272 18.2719C16.6295 19.2898 15.7252 20.146 14.809 20.7536C13.9041 21.3536 12.9278 21.75 11.9995 21.75C11.0714 21.75 10.0953 21.3536 9.19058 20.7536C8.27446 20.146 7.37027 19.2898 6.57265 18.2719C4.98301 16.2433 3.75 13.4847 3.75 10.5986Z" fill={color} />
    </svg>
  );
}

function WWhenPanel({ job, onClose }) {
  const factK = { fontFamily: T.fontHead, fontSize: 9.5, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: '#5B6488' };
  const factV = { fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, color: T.ink, letterSpacing: -0.2 };
  const lbl   = { display: 'block', fontFamily: T.fontHead, fontSize: 10, fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase', color: '#5B6488' };

  const dateText  = _wExpandWhen(job.when || job.date || '');
  const time      = job.time || '';
  const onSite    = _wParseHoursStr(time) || Number(job.shiftHours) || 0;
  const breakMin  = Number(job.breakMinutes) || 30;
  const breakPaid = job.breakPaid !== false;   // demo: placená
  const paidHours = breakPaid ? onSite : Math.max(0, Math.round((onSite - breakMin / 60) * 10) / 10);
  const rate      = Number(job.pay) || 0;
  const unit      = job.payUnit || 'Kč/h';
  const total     = Number(job.shiftTotal || job.total) || Math.round(rate * paidHours);
  const week      = _wWeekFromWhen(job.when || '');
  const role      = (job.title || '').split(/\s+/)[0] || 'Směna';
  const fmtKc     = n => (Number(n) || 0).toLocaleString('cs-CZ').replace(/\s|,/g, ' ');
  const weekShifts = [
    { logo: job.logo, title: 'Zvažuješ · ' + role, when: [job.when, time].filter(Boolean).join(' · '), prospective: true },
    { logo: 'D4', title: 'Skladník · Depo 4', when: 'Čt · 14:00–22:00', prospective: false },
  ];

  const openPay = () => {
    if (!job.payBand || typeof window === 'undefined' || !window.wOpenPay) return;
    window.wOpenPay({ pay: rate, unit, band: job.payBand, category: ((job.employer && job.employer.industry) || '').split('·')[0].trim(), locality: job.location || '', shiftTotal: total });
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 210, background: 'rgba(11,18,51,0.4)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', animation: 'wScrimIn .3s ease' }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-label="Pracovní doba" style={{ background: '#fff', borderRadius: '24px 24px 0 0', overflow: 'hidden', boxShadow: '0 -14px 40px rgba(11,18,51,0.22)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', animation: 'wSheetUp .34s cubic-bezier(.24,1,.32,1) both' }}>
        <div style={{ padding: '9px 0 0', display: 'flex', justifyContent: 'center', flex: 'none' }}><span style={{ width: 38, height: 4, borderRadius: 999, background: T.border }} /></div>
        <div style={{ overflowY: 'auto' }}>
          {/* Hlavička */}
          <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontFamily: T.fontHead, fontSize: 17, fontWeight: 800, color: T.ink }}>Pracovní doba</span>
              <span style={{ fontFamily: T.fontUI, fontSize: 12, color: '#5B6488' }}>Porovnáno s tvým plánem směn</span>
            </div>
            <button onClick={onClose} aria-label="Zavřít" style={{ width: 32, height: 32, flex: 'none', border: 0, borderRadius: 10, background: T.surfaceAlt, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
              <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M1 1l10 10M11 1L1 11" stroke="#5B6488" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          </div>

          {/* Datum a čas */}
          <div style={{ padding: '18px 20px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontFamily: T.fontHead, fontSize: 31, fontWeight: 800, color: T.ink, letterSpacing: -1, lineHeight: 1 }}>{dateText}</span>
            {time && <span style={{ fontFamily: T.fontHead, fontSize: 20, fontWeight: 800, color: '#2E3555', letterSpacing: -0.4 }}>{time}</span>}
          </div>

          {/* Rozpad směny */}
          <div style={{ padding: '18px 20px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, background: T.surfaceAlt, borderRadius: 12, padding: '11px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={factK}>Na místě</span><span style={factV}>{onSite} h</span>
              </div>
              <div style={{ flex: 1, background: T.surfaceAlt, borderRadius: 12, padding: '11px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={factK}>Pauza</span><span style={factV}>{breakMin} min</span>
              </div>
              <button onClick={openPay} disabled={!job.payBand} style={{ position: 'relative', flex: 1.15, background: T.tint, border: 0, borderRadius: 12, padding: '11px 12px', display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left', fontFamily: 'inherit', cursor: job.payBand ? 'pointer' : 'default', WebkitTapHighlightColor: 'transparent' }}>
                <span style={{ ...factK, color: '#3A4266' }}>Vyděláš</span>
                <span style={{ ...factV, paddingRight: 14 }}>{fmtKc(total)} Kč</span>
                {job.payBand && <svg width="6" height="10" viewBox="0 0 7 12" style={{ position: 'absolute', right: 10, bottom: 12 }} aria-hidden="true"><path d="M1 1l5 5-5 5" fill="none" stroke="#3A4266" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </button>
            </div>
            <span style={{ fontFamily: T.fontUI, fontSize: 11.5, color: '#5B6488', lineHeight: 1.5 }}>
              {breakPaid
                ? <>Pauza je <b style={{ color: T.ink }}>placená</b>, takže firma platí všech {onSite} {_wHodPlural(onSite)} — {rate} {unit} hrubého.</>
                : <>Pauza {breakMin} min je <b style={{ color: T.ink }}>neplacená</b>, platí se {paidHours} {_wHodPlural(paidHours)} — {rate} {unit} hrubého.</>}
            </span>
          </div>

          {/* Tvůj týden */}
          <div style={{ padding: '18px 20px 0' }}>
            <span style={lbl}>Tvůj týden</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5, marginTop: 11 }}>
              {week.map((d, i) => (
                <div key={i} style={{ background: d.on ? T.primary : T.surfaceAlt, borderRadius: 11, padding: '9px 0 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontFamily: T.fontHead, fontSize: 10, fontWeight: 800, color: d.on ? '#DCE2FF' : '#5B6488' }}>{d.n}</span>
                  <span style={{ fontFamily: T.fontHead, fontSize: 14, fontWeight: 800, color: d.on ? '#fff' : T.ink }}>{d.d}</span>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: d.on ? '#fff' : (d.busy ? '#C7CCE3' : 'transparent') }} />
                </div>
              ))}
            </div>
          </div>

          {/* Náhled týdne */}
          <div style={{ padding: '16px 20px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={lbl}>Náhled týdne</span>
            {weekShifts.map((s, i) => (
              <div key={i} style={{ background: s.prospective ? T.tint : T.surfaceAlt, border: s.prospective ? '1.5px solid #C7D0FF' : 'none', borderRadius: 12, padding: s.prospective ? '11px 12px' : '12px 13px', display: 'flex', alignItems: 'center', gap: 11 }}>
                <span style={{ width: 34, height: 34, flex: 'none', borderRadius: 11, background: s.prospective ? T.primary : '#E6E9F5', color: s.prospective ? '#fff' : '#5B6488', fontFamily: T.fontHead, fontSize: 12, fontWeight: 800, display: 'grid', placeItems: 'center' }}>{s.logo}</span>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontFamily: T.fontHead, fontSize: 13, fontWeight: 800, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</span>
                  <span style={{ fontFamily: T.fontUI, fontSize: 11, color: '#5B6488' }}>{s.when}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Patka */}
          <div style={{ padding: '12px 20px calc(22px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <span style={{ fontFamily: T.fontUI, fontSize: 11, color: '#5B6488', lineHeight: 1.45 }}>Porovnáváme jen směny přijaté na Makej.</span>
            <button onClick={onClose} style={{ width: '100%', border: 0, background: T.primary, color: '#fff', fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, padding: 15, borderRadius: 14, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>Zpět na brigádu</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Odměna v okolí — spodní panel (proklik z odměny v inzerátu) ────────────────
function WPayPanel({ data, onClose }) {
  const [infoOpen, setInfoOpen] = useStateW(false);
  const pay  = Number(data.pay) || 0;
  const unit = data.unit || 'Kč/h';
  const band = data.band || { min: Math.round(pay * 0.8), avg: pay, max: Math.round(pay * 1.2) };
  const avg = Number(band.avg) || pay;
  const BINS = 7;
  const binStart = Math.floor((Number(band.min) || pay) / 10) * 10;
  const jobIdx = Math.max(0, Math.min(BINS - 1, Math.floor((pay - binStart) / 10)));
  const avgIdx = Math.max(0, Math.min(BINS - 1, Math.round((avg - binStart) / 10)));
  // Syntetické rozložení (zvon kolem průměru) — jen pro demo; naostro počítá backend.
  const counts = Array.from({ length: BINS }, (_, i) => Math.max(1, Math.round(12 * Math.exp(-((i - avgIdx) * (i - avgIdx)) / (2 * 1.3 * 1.3)))));
  const sample = data.sample || counts.reduce((a, b) => a + b, 0);
  const maxCount = Math.max.apply(null, counts);
  const commonFrom = binStart + Math.max(0, avgIdx - 1) * 10;
  const commonTo   = binStart + Math.min(BINS - 1, avgIdx + 1) * 10;
  const commonRange = commonFrom + '–' + commonTo + ' ' + unit;
  const dIdx = jobIdx - avgIdx;
  const position = dIdx >= 2 ? 'nad obvyklým pásmem'
    : dIdx === 1 ? 'na horní hranici obvyklého pásma'
    : dIdx === 0 ? 'v nejčastějším pásmu'
    : dIdx === -1 ? 'na spodní hranici obvyklého pásma'
    : 'pod obvyklým pásmem';
  const above = pay - avg >= 5;
  const tagText = above ? 'Nad průměrem' : (pay - avg <= -5 ? 'Pod průměrem' : 'Průměr oboru');
  const tick = i => (binStart + i * 10) + (i === BINS - 1 ? '+' : '');
  const subtitle = [data.category, data.locality, sample + ' brigád'].filter(Boolean).join(' · ');

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 210, background: 'rgba(11,18,51,0.4)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', animation: 'wScrimIn .3s ease' }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-label="Odměna v okolí" style={{ position: 'relative', background: '#fff', borderRadius: '24px 24px 0 0', overflow: 'hidden', boxShadow: '0 -14px 40px rgba(11,18,51,0.22)', animation: 'wSheetUp .34s cubic-bezier(.24,1,.32,1) both' }}>
        <div style={{ padding: '9px 0 0', display: 'flex', justifyContent: 'center' }}><span style={{ width: 38, height: 4, borderRadius: 999, background: T.border }} /></div>

        {/* Bublina s metodikou */}
        {infoOpen && (<>
          <div onClick={() => setInfoOpen(false)} style={{ position: 'absolute', inset: 0, zIndex: 5 }} />
          <div role="dialog" aria-label="Odkud čísla bereme" style={{ position: 'absolute', left: 16, right: 16, top: 62, zIndex: 6, animation: 'wBubbleIn .18s cubic-bezier(.34,1.3,.5,1) both' }}>
            <span style={{ position: 'absolute', left: 138, top: -6, width: 12, height: 12, background: '#fff', borderLeft: '1px solid ' + T.border, borderTop: '1px solid ' + T.border, transform: 'rotate(45deg)', borderRadius: 2 }} />
            <div style={{ position: 'relative', background: '#fff', border: '1px solid ' + T.border, borderRadius: 16, boxShadow: '0 16px 40px rgba(11,18,51,0.18)', padding: '16px 17px', display: 'flex', flexDirection: 'column', gap: 11 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ flex: 1, fontFamily: T.fontHead, fontSize: 14, fontWeight: 800, color: T.ink }}>Odkud čísla bereme</span>
                <button onClick={() => setInfoOpen(false)} aria-label="Zavřít" style={{ width: 22, height: 22, flex: 'none', border: 0, borderRadius: 7, background: T.surfaceAlt, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                  <svg width="9" height="9" viewBox="0 0 12 12" aria-hidden="true"><path d="M1 1l10 10M11 1L1 11" stroke={T.muted} strokeWidth="2.2" strokeLinecap="round" /></svg>
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  <>Ze sazeb v inzerátech na Makej — {sample} brigád ve stejném oboru do 5 km, za posledních 90 dní.</>,
                  <>Sazby za den nebo za akci přepočítáváme na hodinu podle délky směny. Neplacenou pauzu do ní nepočítáme.</>,
                  <>Průměr je vážený počtem směn, ne prostý průměr sazeb.</>,
                  <>Všechny částky jsou <b style={{ color: T.ink }}>hrubé</b>. Kolik dostaneš na ruku, závisí na typu smlouvy a podepsaném prohlášení poplatníka.</>,
                  <>Spropitné, bonusy ani cestovné v číslech nejsou.</>,
                ].map((t, i) => (
                  <span key={i} style={{ position: 'relative', paddingLeft: 14, fontFamily: T.fontUI, fontSize: 12.5, color: '#2E3555', lineHeight: 1.5 }}>
                    <span style={{ position: 'absolute', left: 0, top: 7, width: 5, height: 5, borderRadius: '50%', background: T.primary }} />{t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </>)}

        {/* Hlavička s „i" */}
        <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontFamily: T.fontHead, fontSize: 17, fontWeight: 800, color: T.ink }}>Odměna v okolí</span>
              <button onClick={() => setInfoOpen(o => !o)} aria-expanded={infoOpen} aria-label="Jak čísla počítáme" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', width: 32, height: 32, margin: -6, border: 0, padding: 0, background: 'none', cursor: 'pointer' }}>
                <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#4a94f7" /><circle cx="12" cy="7.3" r="1.5" fill="#fff" /><rect x="10.6" y="10" width="2.8" height="8" rx="1.4" fill="#fff" /></svg>
              </button>
            </span>
            <span style={{ fontFamily: T.fontUI, fontSize: 12, color: '#5B6488' }}>{subtitle}</span>
          </div>
          <button onClick={onClose} aria-label="Zavřít" style={{ width: 32, height: 32, flex: 'none', border: 0, borderRadius: 10, background: T.surfaceAlt, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M1 1l10 10M11 1L1 11" stroke={T.muted} strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>

        {/* Sazba */}
        <div style={{ padding: '18px 20px 0', display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: T.fontHead, fontSize: 44, fontWeight: 800, color: T.ink, letterSpacing: -1.5, lineHeight: 1 }}>{pay}</span>
          <span style={{ fontFamily: T.fontUI, fontSize: 17, color: '#5B6488' }}>{unit}</span>
          <span style={{ marginLeft: 'auto', fontFamily: T.fontHead, fontSize: 12, fontWeight: 800, padding: '7px 11px', borderRadius: 999, color: above ? '#0B7B4B' : '#5B6488', background: above ? '#E6F7EF' : T.surfaceAlt }}>{tagText}</span>
        </div>

        {/* Graf — 7 pásem po 10 Kč */}
        <div style={{ padding: '24px 20px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5, alignItems: 'end', height: 132 }}>
            {counts.map((c, i) => {
              const h = Math.max(8, Math.round(c / maxCount * 100));
              const isJob = i === jobIdx;
              return (
                <div key={i} style={{ position: 'relative', height: h + '%', background: isJob ? T.primary : T.tint, borderRadius: '6px 6px 3px 3px' }}>
                  {isJob && <span style={{ position: 'absolute', left: '50%', top: -24, transform: 'translateX(-50%)', fontFamily: T.fontHead, fontSize: 10, fontWeight: 800, color: T.primary, whiteSpace: 'nowrap', animation: 'wPinDrop .4s cubic-bezier(.34,1.3,.5,1) .2s both' }}>Tahle</span>}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5, marginTop: 8 }}>
            {counts.map((c, i) => (
              <span key={i} style={{ fontFamily: T.fontUI, fontSize: 9, fontWeight: i === jobIdx ? 800 : 700, color: i === jobIdx ? T.primary : '#5B6488', textAlign: 'center' }}>{tick(i)}</span>
            ))}
          </div>
        </div>

        {/* Věta */}
        <div style={{ padding: '20px 20px 0' }}>
          <span style={{ display: 'block', fontFamily: T.fontUI, fontSize: 13, color: '#2E3555', lineHeight: 1.55, background: T.surfaceAlt, borderRadius: 12, padding: '13px 14px' }}>
            Nejčastěji se v okolí platí <b style={{ color: T.ink, fontFamily: T.fontHead }}>{commonRange}</b>. Tahle brigáda je {position}.
          </span>
        </div>

        {/* Dvě dlaždice */}
        <div style={{ padding: '14px 20px 0', display: 'flex', gap: 9 }}>
          <div style={{ flex: 1, background: T.surfaceAlt, borderRadius: 12, padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontFamily: T.fontHead, fontSize: 10, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: '#5B6488' }}>Průměr</span>
            <span style={{ fontFamily: T.fontHead, fontSize: 16, fontWeight: 800, color: T.ink }}>{avg} {unit}</span>
          </div>
          {data.shiftTotal > 0 && (
            <div style={{ flex: 1, background: T.tint, borderRadius: 12, padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontFamily: T.fontHead, fontSize: 10, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: '#5B6488' }}>Za směnu hrubého</span>
              <span style={{ fontFamily: T.fontHead, fontSize: 16, fontWeight: 800, color: T.primary }}>{data.shiftTotal.toLocaleString('cs-CZ').replace(/,/g, ' ')} Kč</span>
            </div>
          )}
        </div>

        {/* Patka */}
        <div style={{ padding: '18px 20px calc(22px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontFamily: T.fontUI, fontSize: 11, color: '#5B6488', lineHeight: 1.5 }}>Počítáno z {sample} brigád ve stejném oboru do 5 km, zveřejněných za posledních 90 dní.</span>
          <button onClick={onClose} style={{ width: '100%', border: 0, background: T.primary, color: '#fff', fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, padding: 15, borderRadius: 14, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>Zpět na brigádu</button>
        </div>
      </div>
    </div>
  );
}

// ── Profil zaměstnavatele (pohled brigádníka) ──────────────────
function WEmployerModal({ employerId, fallback, reviewsOnly, onClose }) {
  const [p, setP]         = useStateW(fallback || null);
  const [reviews, setRev] = useStateW(null);   // null = načítá se
  const [loading, setL]   = useStateW(true);

  useEffectW(() => {
    // Demo firma nemá profil v DB — vezmi vše z předaného objektu (fallback).
    if (!employerId) {
      setRev((fallback && fallback.reviews) || []);
      setL(false);
      return;
    }
    let alive = true;
    (async () => {
      const [pRes, rRes] = await Promise.all([
        sb.from('profiles').select('*').eq('id', employerId).single(),
        sb.from('reviews').select('*, reviewer:profiles!reviews_reviewer_id_fkey(name)').eq('reviewed_id', employerId).order('created_at', { ascending: false }),
      ]);
      if (!alive) return;
      if (pRes.data) setP(pRes.data);
      setRev(rRes.data || []);
      setL(false);
    })();
    return () => { alive = false; };
  }, [employerId]);

  const name    = (p && (p.company_name || p.name)) || (fallback && fallback.name) || 'Zaměstnavatel';
  const initials = name.split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '??';
  const accent  = (fallback && fallback.color) || _wColor(employerId || name);
  const rating  = Number((p && p.rating) || (fallback && fallback.rating) || 0);
  const verified = !!(p ? p.verified : (fallback && fallback.verified));
  const bio     = (p && p.bio) || '';
  const industry = (p && p.industry) || '';
  const address = (p && p.address) || '';
  const website = (p && p.website) || '';
  const ic      = (p && p.ic) || '';
  const krajId  = (p && p.kraj) || '';
  const krajTxt = krajId ? (typeof _krajName === 'function' ? _krajName(krajId) : krajId) : '';
  const photos  = Array.isArray(p && p.photos) ? p.photos.filter(Boolean) : [];
  const socials = (p && p.socials && typeof p.socials === 'object') ? p.socials : {};
  const socialLinks = Object.entries(socials).filter(([, v]) => v);
  const memberSince = (p && p.created_at) ? new Date(p.created_at).getFullYear() : null;
  const founded = (p && p.founded) || null;
  const openPositions = Number((p && p.openPositions) || 0);
  const hasInfo = industry || krajTxt || address || website || ic || memberSince || founded;

  const webHref = website ? (/^https?:\/\//i.test(website) ? website : 'https://' + website) : '';
  const webLabel = website.replace(/^https?:\/\//i, '').replace(/\/$/, '');

  const infoRow = (icon, label, value, href) => value ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid ' + T.border }}>
      <div style={{ width: 36, height: 36, borderRadius: 11, background: T.tint, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <Icon name={icon} size={16} color={T.primary} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
        {href
          ? <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: T.primary, fontFamily: T.fontUI, fontSize: 14, fontWeight: 700, wordBreak: 'break-word', textDecoration: 'none' }}>{value}</a>
          : <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 14.5, fontWeight: 800, wordBreak: 'break-word' }}>{value}</div>}
      </div>
    </div>
  ) : null;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      animation: 'wPop .28s cubic-bezier(.2,.8,.2,1)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 440, maxHeight: '88vh',
        background: T.card, borderRadius: 24, border: '1px solid ' + T.border,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(20,22,40,0.28)',
      }}>
        {/* Hero */}
        <div style={{ position: 'relative', flexShrink: 0, padding: '22px', background: T.heroGrad, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.14) 1.2px, transparent 1.2px)', backgroundSize: '18px 18px', opacity: 0.5, pointerEvents: 'none' }} />
          <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: 999, background: 'rgba(0,0,0,0.3)', border: 'none', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 16, zIndex: 1 }}>✕</button>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 60, height: 60, borderRadius: 17, background: '#fff', color: T.primary, display: 'grid', placeItems: 'center', fontFamily: T.fontHead, fontWeight: 800, fontSize: 22, flexShrink: 0, overflow: 'hidden' }}>
              {p && p.logo_url ? <img src={p.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#fff', fontFamily: T.fontHead, fontSize: 20, fontWeight: 800, letterSpacing: -0.4 }}>{name}</span>
                {verified && <Icon name="verified-check-bold" size={15} color="#A3AEFF" />}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span style={{ color: 'rgba(255,255,255,0.85)', fontFamily: T.fontUI, fontSize: 13 }}>{industry || 'Zaměstnavatel'}</span>
                {rating > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <Icon name="star-bold" size={12} color={T.super} />
                    <span style={{ color: '#fff', fontFamily: T.fontHead, fontWeight: 800, fontSize: 13 }}>{rating.toFixed(1).replace('.', ',')}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 22px 20px' }}>
          {/* Proklik z hodnocení = jen recenze; vše ostatní schováme */}
          {!reviewsOnly && (<>
          {/* Otevřené pozice */}
          {openPositions > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, margin: '12px 0 2px', padding: '12px 14px', borderRadius: 14, background: T.tint }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <Icon name="case-round-bold" size={18} color={T.primary} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 15, fontWeight: 800 }}>{openPositions} {_wPlural(openPositions, 'otevřená pozice', 'otevřené pozice', 'otevřených pozic')}</div>
                <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 12 }}>u téhle firmy právě teď</div>
              </div>
            </div>
          )}

          {/* Fotky firmy */}
          {photos.length > 0 && (
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', margin: '10px -22px 4px', padding: '0 22px', scrollbarWidth: 'none' }}>
              {photos.slice(0, 8).map((src, i) => (
                <img key={i} src={src} alt="" style={{ width: 150, height: 104, objectFit: 'cover', borderRadius: 14, flexShrink: 0, border: '1px solid ' + T.border }} />
              ))}
            </div>
          )}

          {/* O firmě */}
          {bio && (<>
            <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, margin: '18px 0 8px' }}>O firmě</div>
            <div style={{ color: T.inkSoft, fontFamily: T.fontUI, fontSize: 13.5, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{bio}</div>
          </>)}

          {/* Informace o firmě */}
          {hasInfo && (<>
            <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, margin: '18px 0 4px' }}>Informace</div>
            <div>
              {infoRow('buildings-2-bold', 'Obor', industry)}
              {founded && infoRow('calendar-bold', 'Založeno', founded)}
              {infoRow('map-point-bold', 'Kraj', krajTxt)}
              {infoRow('map-point-bold', 'Sídlo', address)}
              {infoRow('global-linear', 'Web', webLabel, webHref)}
              {infoRow('document-text-bold', 'IČO', ic)}
              {memberSince && infoRow('calendar-bold', 'Na Makej od', memberSince)}
            </div>
          </>)}

          {/* Sociální sítě */}
          {socialLinks.length > 0 && (<>
            <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, margin: '18px 0 8px' }}>Sociální sítě</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {socialLinks.map(([k, v]) => (
                <a key={k} href={/^https?:\/\//i.test(v) ? v : 'https://' + v} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999, background: T.tint, color: T.primary, fontFamily: T.fontUI, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                  <Icon name="link-bold" size={14} color={T.primary} />{k}
                </a>
              ))}
            </div>
          </>)}

          {/* Když firma nic nevyplnila */}
          {!bio && !hasInfo && photos.length === 0 && !loading && (
            <div style={{ margin: '14px 0 4px', padding: '16px 18px', borderRadius: 14, background: T.surfaceAlt, color: T.muted, fontFamily: T.fontUI, fontSize: 13, lineHeight: 1.5, textAlign: 'center' }}>
              Tahle firma zatím nevyplnila víc informací o sobě.
            </div>
          )}
          </>)}

          <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, margin: reviewsOnly ? '10px 0 8px' : '18px 0 8px' }}>
            Recenze{reviews && reviews.length > 0 ? ` · ${reviews.length}` : ''}
          </div>
          {loading ? (
            <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 13 }}>Načítám…</div>
          ) : (!reviews || reviews.length === 0) ? (
            <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 12.5, lineHeight: 1.5 }}>Tahle firma zatím nemá žádné recenze.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {reviews.map(r => {
                const author = r.reviewer?.name || 'Brigádník';
                const av = author.split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '??';
                return (
                  <div key={r.id} style={{ padding: '12px 14px', borderRadius: 12, background: '#fff', border: '1px solid ' + T.border, boxShadow: '0 2px 8px rgba(20,22,40,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: r.text ? 7 : 0 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: W_AVATAR_BG, display: 'grid', placeItems: 'center', color: '#fff', fontFamily: T.fontHead, fontWeight: 800, fontSize: 11, flexShrink: 0 }}>{av}</div>
                      <div style={{ flex: 1, minWidth: 0, color: T.ink, fontFamily: T.fontUI, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{author}</div>
                      <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                        {[1, 2, 3, 4, 5].map(n => <Icon key={n} name="star-bold" size={12} color={n <= r.rating ? T.super : 'rgba(18,18,26,0.14)'} />)}
                      </div>
                    </div>
                    {r.text && <div style={{ color: T.inkSoft, fontFamily: T.fontUI, fontSize: 13, lineHeight: 1.5 }}>„{r.text}"</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ flexShrink: 0, padding: '12px 22px calc(14px + env(safe-area-inset-bottom))', borderTop: '1px solid ' + T.border, background: T.card }}>
          <button onClick={onClose} style={{ width: '100%', borderRadius: 12, padding: '13px 0', background: 'rgba(18,18,26,0.05)', border: '1px solid ' + T.border, color: T.ink, fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>Zavřít</button>
        </div>
      </div>
    </div>
  );
}

function WorkerApp() {
  const [tab,    setTab]    = useStateW('swipe');
  const [loaded, setLoaded] = useStateW(false);
  const [tick,   setTick]   = useStateW(0);
  const [toasts, setToasts] = useStateW([]);
  const [notifs, setNotifs] = useStateW([]);      // upozornění pro zvoneček
  const [bellOpen, setBellOpen] = useStateW(false);
  const [chatOpen, setChatOpen] = useStateW(false);   // otevřený chat → schovat spodní nav
  const [detailOpen, setDetailOpen] = useStateW(false);   // otevřený detail inzerátu → schovat horní lištu
  const [bellRing, setBellRing] = useStateW(false);   // krátké rozkývání při novém upozornění
  const posledniZvuk = useRefW(0);                    // kdy naposled cinklo — proti salvě
  const videnaNotif  = useRefW(new Set());            // id už zpracovaných oznámení
  const [chatTarget, setChatTarget] = useStateW(null);
  // Odznak u Zpráv se počítá z W_THREADS, které Zprávy mění mimo React.
  // Tohle jen vynutí překreslení, až se něco označí za přečtené — narozdíl
  // od `tick` přitom nepřenačte vlákna, takže z otevřeného chatu nezmizí
  // zpráva, která zatím dorazila jen realtimem.
  const [precteno, setPrecteno] = useStateW(0);
  // Zvoneček je jen na záložce Práce — po odchodu jinam ho zavři, ať se
  // panel neotevře sám při návratu.
  useEffectW(() => { if (tab !== 'swipe') setBellOpen(false); }, [tab]);
  const [employerTarget, setEmployerTarget] = useStateW(null);
  const [reviewsTarget, setReviewsTarget]   = useStateW(null);   // spodní panel recenzí firmy
  const [payTarget, setPayTarget]           = useStateW(null);   // spodní panel „Odměna v okolí"
  const [whenTarget, setWhenTarget]         = useStateW(null);   // spodní panel „Pracovní doba"
  const [settingsOpen, setSettingsOpen] = useStateW(false);   // Nastavení = bývalý Profil, teď fullscreen overlay z ozubeného kola
  const [calendarOpen, setCalendarOpen] = useStateW(false);   // Kalendář přesunutý z bottom nav do horní ikony
  const userId = useRefW(null);
  const tabRef = useRefW(tab);
  useEffectW(() => { tabRef.current = tab; }, [tab]);

  // Bridge: otevři chat s daným matchem (z detailu brigády)
  function openChat(matchId) {
    setChatTarget(matchId);
    setTab('messages');
  }
  if (typeof window !== 'undefined') {
    window.wOpenChat = openChat;
    window.wOpenEmployer = (employerId, fallback, opts) => { if (employerId || fallback) setEmployerTarget({ employerId, fallback, reviewsOnly: !!(opts && opts.reviewsOnly) }); };
    window.wOpenReviews = (employerId, data) => { if (employerId || data) setReviewsTarget({ employerId, data }); };
    window.wOpenPay = (data) => { if (data) setPayTarget(data); };
    window.wOpenWhen = (job) => { if (job) setWhenTarget(job); };
    window.wSetDetailOpen = setDetailOpen;   // detail inzerátu ovládá viditelnost horní lišty
  }

  // Uživatel může upozornění vypnout v profilu (Nastavení)
  function notifsEnabled() {
    try { return localStorage.getItem('makej-notifs') !== 'off'; } catch (e) { return true; }
  }

  // Toast (objekt: { title, text, type, accent, avatar, action, ttl })
  // Zvuk i rozkývání zvonečku patří sem, ne do addNotif — musí zaznít ve chvíli,
  // kdy je upozornění vidět. addNotif se volá dřív (a někdy i bez toastu).
  // Nejvýš tři bannery naráz — víc by přes sebe zakrylo obrazovku
  const W_MAX_TOASTU = 3;

  function addToast(opts) {
    if (!notifsEnabled()) return;
    const ttl  = opts.ttl || 6000;
    const klic = opts.groupKey || null;

    setToasts(prev => {
      const expires = Date.now() + ttl;
      // Další zpráva od stejné firmy nepřidává banner — sloučí se do stávajícího
      // a přičte se počet. Jinak by salva zpráv zaplavila celou obrazovku.
      if (klic) {
        const i = prev.findIndex(t => t.groupKey === klic);
        if (i !== -1) {
          const stary = prev[i];
          // `verze` roste s každou další zprávou a jde do Reactího klíče, takže
          // se banner vykreslí znovu a viditelně vyjede. Bez toho by se jen tiše
          // přepsal text a vypadalo by to, že se nic nestalo.
          const novy = {
            ...stary, ...opts, id: stary.id, groupKey: klic,
            pocet: (stary.pocet || 1) + 1, verze: (stary.verze || 0) + 1, expires,
          };
          // přesuň dospodu, ať je nejčerstvější nejníž, a resetuj odpočet
          return [...prev.slice(0, i), ...prev.slice(i + 1), novy].slice(-W_MAX_TOASTU);
        }
      }
      return [...prev, { id: Date.now() + Math.random(), pocet: 1, groupKey: klic, ...opts, expires }].slice(-W_MAX_TOASTU);
    });

    // Zvuk až ve chvíli, kdy prohlížeč toast opravdu vykreslil. Dvojité rAF:
    // první snímek React teprve zapisuje DOM, až druhý je ten, na kterém je vidět.
    let uzZvonilo = false;
    const ring = () => {
      if (uzZvonilo) return;
      uzZvonilo = true;
      // Při salvě zpráv zvoní jen jednou — pět cinknutí za sebou je otrava
      const ted = Date.now();
      if (ted - posledniZvuk.current < 1500) return;
      posledniZvuk.current = ted;
      wPlayBell();
      setBellRing(true);
      setTimeout(() => setBellRing(false), 700);
    };
    // Dvojité rAF sladí zvuk s okamžikem, kdy je banner opravdu vykreslený.
    // V okně na pozadí ale prohlížeč rAF pozastaví, takže by nezaznělo nic —
    // proto běží souběžně i časovač a platí ten, kdo přijde první.
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => requestAnimationFrame(ring));
    }
    setTimeout(ring, 120);
  }

  // Bannery mizí podle vlastní platnosti, ne přes časovač na každý zvlášť —
  // díky tomu jde sloučenému banneru odpočet prostě prodloužit.
  useEffectW(() => {
    if (!toasts.length) return;
    const iv = setInterval(() => {
      setToasts(prev => prev.filter(t => !t.expires || t.expires > Date.now()));
    }, 350);
    return () => clearInterval(iv);
  }, [toasts.length > 0]);

  // Upozornění do zvonečku. Ukládá se i do DB, aby přežilo zavření appky —
  // zobrazíme ho hned (optimisticky) a teprve pak čekáme na server.
  // Zvoneček plní výhradně databáze — přidané řádky se vrátí přes realtime odběr
  // níž. Od chvíle, kdy zprávy zakládá trigger v databázi, nesmí appka zapisovat
  // vlastní kopii, jinak by u každé zprávy vzniklo oznámení dvakrát.
  function addNotif(n) {
    if (!notifsEnabled()) return;
    const uid = userId.current;
    if (uid) insertNotifW(uid, n);
  }

  // Otevřené vlákno = přečteno. WMessages už oznámení označil na serveru;
  // tady srovnáme zvoneček (ať mu spadne počítadlo hned, ne až po refreshi)
  // a překreslíme odznak Zpráv ve spodní liště (počítá se z W_THREADS).
  function onThreadRead(matchId, ids) {
    const set = new Set(ids || []);
    setNotifs(prev => prev.map(n =>
      (n.matchId === matchId || set.has(n.id)) ? { ...n, read: true } : n));
    setPrecteno(p => p + 1);
  }
  const unreadNotifs = notifs.filter(n => !n.read).length;

  useEffectW(() => {
    let done = false;
    function loadFor(session) {
      if (!session?.user || done) return;   // ještě nepřihlášen → počkej na SIGNED_IN
      done = true;
      userId.current = session.user.id;
      // Nejdřív uložená upozornění, ať zvoneček po otevření není prázdný
      fetchNotifsW(session.user.id).then(saved => { if (saved.length) setNotifs(saved); });

      fetchWorkerData(session.user.id).then(async () => {
        setLoaded(true);
        setTick(1);
        // Výzva k hodnocení dokončených brigád
        const toReview = W_HISTORY.filter(h => h.needsReview).length;
        if (toReview > 0) {
          const text = 'Máš ' + _wPlural(toReview,
            '1 dokončenou brigádu', toReview + ' dokončené brigády', toReview + ' dokončených brigád')
            + ' k ohodnocení.';
          // Přidávalo by se při každém startu — s ukládáním by tak vznikal duplikát.
          // Založ nové jen tehdy, když nepřečtená výzva ještě nevisí.
          const saved = await fetchNotifsW(session.user.id);
          if (saved.some(x => x.type === 'review' && !x.read)) return;
          // Banner přijde přes realtime, až se řádek objeví v databázi
          addNotif({ type: 'review', title: 'Ohodnoť své brigády', text, kind: 'review' });
        }
      });
    }
    // 1) session, která už existuje při načtení
    sb.auth.getSession().then(({ data: { session } }) => loadFor(session));
    // 2) přihlášení, které proběhne až po namountování appky (jinak by kolečko točilo donekonečna)
    const { data: authSub } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') loadFor(session);
    });
    return () => { try { authSub.subscription.unsubscribe(); } catch (e) {} };
  }, []);

  async function refreshWorker() {
    if (!userId.current) return;
    await fetchWorkerData(userId.current);
    setTick(t => t + 1);
  }

  // Realtime: refresh when new jobs or matches appear
  useEffectW(() => {
    if (!loaded || !userId.current) return;
    const id = userId.current;

    const channel = sb.channel('w-rt-' + id)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'matches',
        filter: 'worker_id=eq.' + id,
      }, async (payload) => {
        const wasAccepted = payload.new?.status === 'accepted' && payload.old?.status !== 'accepted';
        await fetchWorkerData(id);
        setTick(t => t + 1);
        if (wasAccepted) {
          const thread = W_THREADS.find(t => t.id === payload.new.id);
          const company = thread?.name || 'Zaměstnavatel';
          const mid     = payload.new.id;
          const avatar  = thread ? { initials: thread.avatar, color: thread.color, logo: thread.logoUrl } : null;
          const zprava = { type: 'match', title: 'Máš shodu', text: `${company} má zájem o tvůj profil.`, avatar };
          addNotif({ ...zprava, kind: 'chat', matchId: mid });
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'jobs' }, async () => {
        await fetchWorkerData(id);
        setTick(t => t + 1);
      })
      .subscribe();

    return () => { try { sb.removeChannel(channel); } catch (e) {} };
  }, [loaded]);

  // Realtime: nová oznámení v databázi → zvoneček.
  // Sem chodí i to, co založil trigger u zpráv, i to, co appka vloží sama
  // (shoda, výzva k hodnocení). Díky tomu je zvoneček vždycky obraz databáze.
  useEffectW(() => {
    if (!loaded || !userId.current) return;
    const id = userId.current;

    const chan = sb.channel('w-notifrow-' + id)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: 'user_id=eq.' + id,
      }, (payload) => {
        if (!payload.new || !notifsEnabled()) return;
        const n = _wNotifZRadku(payload.new);

        // Jestli je oznámení nové, se ptáme reference, ne výsledku setNotifs.
        // React tu funkci nespouští hned — u druhé zprávy v řadě by se
        // vyhodnotila až po překreslení a banner by nikdy nevyjel.
        if (videnaNotif.current.has(n.id)) return;
        videnaNotif.current.add(n.id);
        if (videnaNotif.current.size > 200) videnaNotif.current = new Set([n.id]);

        setNotifs(prev => (prev.some(x => x.id === n.id) ? prev : [n, ...prev].slice(0, 40)));

        // Banner jede ze stejné události jako zvoneček. Dřív visel na odběru
        // tabulky `messages` a mlčel, i když oznámení dorazilo — jedna cesta
        // pro obojí tenhle rozpor odstraňuje.
        const chat = n.kind === 'chat' && n.matchId;
        if (chat && tabRef.current === 'messages') return;   // v chatu banner překáží

        const thread = chat ? W_THREADS.find(t => t.id === n.matchId) : null;
        addToast({
          type: n.type, title: n.title, text: n.text,
          avatar: thread ? { initials: thread.avatar, color: thread.color, logo: thread.logoUrl } : null,
          groupKey: chat ? 'chat-' + n.matchId : null,
          action: chat
            ? { label: n.type === 'shift' ? 'Zobrazit směnu' : 'Odpovědět', onClick: () => openChat(n.matchId) }
            : (n.kind === 'review' ? { label: 'Otevřít kalendář', onClick: () => setTab('history') } : null),
        });
      })
      .subscribe();

    return () => { try { sb.removeChannel(chan); } catch (e) {} };
  }, [loaded]);

  // Realtime: příchozí zprávy → banner (zvoneček plní odběr výše)
  useEffectW(() => {
    if (!loaded || !userId.current) return;
    const id = userId.current;

    const chan = sb.channel('w-notif-' + id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const msg = payload.new;
        if (!msg || msg.sender_id === id) return;                 // vlastní zprávy ignoruj
        // Zvoneček i banner obstarává odběr tabulky `notifications` výš.
        // Tady zbývá jen srovnat náhledy v seznamu konverzací.
        fetchWorkerData(id).then(() => setTick(t => t + 1));
      })
      .subscribe();

    return () => { try { sb.removeChannel(chan); } catch (e) {} };
  }, [loaded]);

  async function handleSignOut() {
    await sb.auth.signOut();
    window.location.href = '/';
  }

  // Počítá se při každém překreslení — proto ten stav `precteno` výš, který
  // překreslení vyvolá, když Zprávy sáhnou na W_THREADS mimo React.
  const unreadMessages = W_THREADS.reduce((s, t) => s + (t.unread || 0), 0);
  const reviewsToDo    = W_HISTORY.filter(h => h.needsReview).length;

  // Přehled aktuálního stavu — když nejsou upozornění, ať zvoneček ukáže,
  // co brigádníka reálně čeká, místo prázdné obrazovky.
  const discussCount = W_HISTORY.filter(h => h.phase === 'discuss').length;
  const nextShift    = W_HISTORY
    .filter(h => h.phase === 'upcoming' && h.eventDate)
    .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate))[0] || null;

  const statusRows = [
    nextShift && {
      key: 'shift', icon: 'calendar-minimalistic-bold',
      title: 'Nejbližší směna',
      text: [nextShift.company, nextShift.dateText].filter(Boolean).join(' · '),
      go: () => setTab('history'),
    },
    discussCount > 0 && {
      key: 'discuss', icon: 'chat-round-bold',
      title: _wPlural(discussCount, 'Domlouváš 1 brigádu', `Domlouváš ${discussCount} brigády`, `Domlouváš ${discussCount} brigád`),
      text: 'Čeká se na potvrzení termínu',
      go: () => setTab('messages'),
    },
    unreadMessages > 0 && {
      key: 'unread', icon: 'chat-round-dots-bold',
      title: _wPlural(unreadMessages, '1 nepřečtená zpráva', `${unreadMessages} nepřečtené zprávy`, `${unreadMessages} nepřečtených zpráv`),
      text: 'Otevři konverzaci',
      go: () => setTab('messages'),
    },
    reviewsToDo > 0 && {
      key: 'review', icon: 'star-bold',
      title: _wPlural(reviewsToDo, '1 brigáda k ohodnocení', `${reviewsToDo} brigády k ohodnocení`, `${reviewsToDo} brigád k ohodnocení`),
      text: 'Tvoje hodnocení pomůže ostatním',
      go: () => setTab('history'),
    },
  ].filter(Boolean);

  // Kalendář žije teď jako ikona nahoře vedle Nastavení (viz níž) — spodní
  // nav zůstává jen na tři hlavní, často používané záložky.
  const NAV = [
    { id: 'swipe',    label: 'Práce',    img: 'icons/jobs-outline.svg' },
    { id: 'people',   label: 'Lidé',     img: 'icons/people-outline.svg' },
    { id: 'messages', label: 'Zprávy',   img: 'icons/messages-outline.svg', badge: unreadMessages },
    { id: 'profile',  label: 'Profil',   img: 'icons/profile-outline.svg' },
  ];

  let body;
  if (!loaded) {
    // Skeleton místo spinneru — „duch" swajpovací karty, ať appka po otevření
    // hned ukáže tvar toho, co se načítá (jako YT), a ne jen točící se kolečko.
    const skBlok = { width: 30, height: 30, borderRadius: 10 };
    body = (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, paddingTop: 4, position: 'relative' }}>
        {/* horní lišta — duch oválku vlevo + profilu vpravo */}
        <div className="wsk" style={{ position: 'fixed', top: 8, left: 16, width: 72, height: 38, borderRadius: 999, zIndex: 20 }} />
        <div className="wsk" style={{ position: 'fixed', top: 8, right: 16, width: 44, height: 44, borderRadius: 999, zIndex: 20 }} />

        {/* odsazení pod lištu (jako ve WSwipe) */}
        <div style={{ padding: '8px 20px 8px', flexShrink: 0 }}><div style={{ height: 36 }} /></div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 5px 5px', minHeight: 0, gap: 10 }}>
          {/* karta */}
          <div style={{ position: 'relative', width: '100%', maxWidth: 500, flex: 1, minHeight: 0 }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: 26, overflow: 'hidden', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '0 18px 40px rgba(11,18,51,0.10), 0 2px 8px rgba(20,22,40,0.05)' }}>
              <div className="wsk" style={{ height: 240, flex: 'none' }} />
              <div style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="wsk" style={{ height: 24, width: '72%', borderRadius: 8 }} />
                <div className="wsk" style={{ height: 13, width: '45%', borderRadius: 7 }} />
                <div className="wsk" style={{ height: 74, width: '100%', borderRadius: 16 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <div className="wsk" style={skBlok} />
                  <div className="wsk" style={{ height: 14, width: '55%', borderRadius: 7 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <div className="wsk" style={skBlok} />
                  <div className="wsk" style={{ height: 14, width: '38%', borderRadius: 7 }} />
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div className="wsk" style={{ height: 28, width: 66, borderRadius: 999 }} />
                  <div className="wsk" style={{ height: 28, width: 92, borderRadius: 999 }} />
                  <div className="wsk" style={{ height: 28, width: 58, borderRadius: 999 }} />
                </div>
              </div>
            </div>
          </div>

          {/* tlačítka: přeskočit (čtvereček) + Mám zájem (široké) */}
          <div style={{ flex: 'none', width: '100%', maxWidth: 500, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0 4px' }}>
            <div className="wsk" style={{ width: 54, height: 54, flex: 'none', borderRadius: 17 }} />
            <div className="wsk" style={{ flex: 1, height: 54, borderRadius: 17 }} />
          </div>
        </div>
      </div>
    );
  } else if (tab === 'swipe') {
    body = <WSwipe tick={tick} />;
  } else if (tab === 'people') {
    body = <WPeople tick={tick} />;
  } else if (tab === 'messages') {
    body = <WMessages tick={tick} chatTarget={chatTarget} onChatOpened={() => setChatTarget(null)} onGoJobs={() => setTab('swipe')} onThreadOpen={setChatOpen} onRead={onThreadRead} />;
  } else if (tab === 'profile') {
    body = <WProfile tick={tick} onSignOut={handleSignOut} onGoTab={setTab} />;
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      width: '100%', height: '100%',
      // Klidná jednolitá plocha. Barevné skvrny ani tečkovaná textura tu
      // dřív byly kvůli průhlednému nav baru — ten si teď kryje sám.
      background: T.bg,
      position: 'relative',
    }}>
      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
        {body}
      </div>

      {/* Horní lišta — vlevo oválek s nástroji (Kalendář + Zvoneček).
          Na všech záložkách kromě Profilu (ten má vlastní hlavičku) a otevřeného chatu. */}
      {loaded && !chatOpen && !detailOpen && tab !== 'profile' && (
        <div style={{
          position: 'fixed', top: 8, left: 16, zIndex: 8500,
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: '#fff', borderRadius: 999, padding: 3,
          border: '1px solid rgba(16,24,64,0.07)',
          boxShadow: 'none',
        }}>
          {/* Kalendář */}
          <button onClick={() => setCalendarOpen(true)} title="Kalendář" style={{
            position: 'relative', width: 30, height: 30, borderRadius: 999,
            background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'grid', placeItems: 'center',
          }}>
            <WIcoCalendar size={20} color="#4a4f6b" />
            {reviewsToDo > 0 && (
              <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 999, background: T.destructive, border: '2px solid #fff' }} />
            )}
          </button>

          {/* Zvoneček */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => {
                setBellOpen(o => !o);
                if (!bellOpen) {
                  setNotifs(prev => prev.map(n => ({ ...n, read: true })));
                  if (userId.current) markNotifsReadW(userId.current);   // ať to platí i po refreshi
                  // Oznámení nesou i nepřečtené zprávy — srovnej i odznak Zpráv
                  W_THREADS.forEach(t => t.unread = 0);
                  Object.keys(W_UNREAD).forEach(k => delete W_UNREAD[k]);
                  setPrecteno(p => p + 1);
                }
              }}
              title="Upozornění"
              style={{
                width: 30, height: 30, borderRadius: 999, position: 'relative',
                background: bellOpen ? T.tint : 'transparent', border: 'none', cursor: 'pointer',
                display: 'grid', placeItems: 'center',
              }}>
              <span style={{ display: 'grid', placeItems: 'center', animation: bellRing ? 'wBellRing .7s cubic-bezier(.36,.07,.19,.97)' : 'none', transformOrigin: 'top center' }}>
                <WIcoBell size={20} color="#4a4f6b" />
              </span>
              {unreadNotifs > 0 && (
                <span style={{ position: 'absolute', top: -1, right: -1, minWidth: 17, height: 17, padding: '0 4px', borderRadius: 999, background: T.destructive, color: '#fff', fontSize: 9.5, fontWeight: 800, fontFamily: T.fontUI, display: 'grid', placeItems: 'center', border: '2px solid #fff' }}>{unreadNotifs}</span>
              )}
            </button>

            {bellOpen && (<>
              <div onClick={() => setBellOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: -1 }} />
              <div style={{
                position: 'fixed', top: 64, left: 16, width: 'min(360px, calc(100vw - 32px))',
                maxHeight: '70vh', overflowY: 'auto',
                background: '#fff', border: '1px solid ' + T.border, borderRadius: 18,
                boxShadow: '0 24px 50px rgba(20,22,40,0.2)', animation: 'wPop .22s cubic-bezier(.2,.8,.2,1)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid ' + T.border }}>
                  <span style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 16, fontWeight: 800 }}>Upozornění</span>
                  {notifs.length > 0 && <button onClick={() => { setNotifs([]); W_THREADS.forEach(t => t.unread = 0); Object.keys(W_UNREAD).forEach(k => delete W_UNREAD[k]); setPrecteno(p => p + 1); if (userId.current) sb.from('notifications').delete().eq('user_id', userId.current).then(({ error }) => { if (error) console.error('smazání upozornění:', error); }); }} style={{ background: 'none', border: 'none', color: T.muted, fontFamily: T.fontUI, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Vymazat</button>}
                </div>
                {notifs.length === 0 ? (
                  statusRows.length > 0 ? (
                    <div style={{ padding: 8 }}>
                      <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, padding: '6px 12px 8px' }}>Aktuálně</div>
                      {statusRows.map(r => (
                        <button key={r.key}
                          onClick={() => { setBellOpen(false); r.go(); }}
                          style={{ width: '100%', textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', display: 'flex', gap: 11, alignItems: 'flex-start', padding: '11px 12px', borderRadius: 12, background: 'transparent', border: 'none' }}>
                          <div style={{ width: 40, height: 40, borderRadius: 11, background: T.tint, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                            <Icon name={r.icon} size={18} color={T.primary} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 13.5, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</div>
                            <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 12.5, marginTop: 1, lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.text}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '28px 20px', textAlign: 'center' }}>
                      <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 13, lineHeight: 1.55 }}>
                        Nic nového. Až se firma ozve nebo potvrdí směnu, najdeš to tady.
                      </div>
                    </div>
                  )
                ) : (
                  <div style={{ padding: '8px' }}>
                    {notifs.map(n => {
                      return (
                        <button key={n.id}
                          onClick={() => { setBellOpen(false); if (n.kind === 'chat' && n.matchId) openChat(n.matchId); else if (n.kind === 'review') setTab('history'); }}
                          style={{ width: '100%', textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', display: 'flex', gap: 11, alignItems: 'flex-start', padding: '11px 12px', borderRadius: 12, background: 'transparent', border: 'none' }}>
                          <WNotifZnacka avatar={n.avatar} size={40} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 13.5, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</div>
                            {n.text && <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 12.5, marginTop: 1, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{n.text}</div>}
                            <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 11, marginTop: 3 }}>{_wRelTime(n.ts)}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>)}
          </div>
        </div>
      )}

      {/* Horní lišta — vpravo odznáček úrovně + ikona Profilu (bývalé Nastavení).
          Odznáček ukazuje aktuální stupeň brigádníka hned vedle profilu. */}
      {loaded && !chatOpen && !detailOpen && tab !== 'profile' && (() => {
        const myTier = makejTrust({ ...W_TRUST, hodnoceni: Number(W_PROFILE.rating) || 0 }).tier;
        return (
          <button onClick={() => setTab('profile')} title={'Tvůj stupeň: ' + myTier.nazev} style={{
            position: 'fixed', top: 8, right: 16, zIndex: 8500,
            background: 'none', border: 'none', padding: 0, cursor: 'pointer', WebkitTapHighlightColor: 'transparent', display: 'flex',
          }}>
            <WLevelBadge level={myTier.blevel} label={myTier.nazev} sm />
          </button>
        );
      })()}

      {/* Profil je teď 4. záložka (viz body výše), ne overlay. */}

      {calendarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9200, background: T.bg, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'flex-end', padding: '14px 18px 0' }}>
            <button onClick={() => setCalendarOpen(false)} title="Zavřít kalendář" style={{
              width: 34, height: 34, borderRadius: 999, background: '#fff', border: 'none',
              color: '#4a4f6b', cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 15,
              boxShadow: '0 6px 16px -8px rgba(16,24,64,0.28)',
            }}>✕</button>
          </div>
          <WCalendar tick={tick} onReviewed={refreshWorker} />
        </div>
      )}

      <WToast toasts={toasts} onRemove={id => setToasts(prev => prev.filter(t => t.id !== id))} />

      {employerTarget && (
        <WEmployerModal
          employerId={employerTarget.employerId}
          fallback={employerTarget.fallback}
          reviewsOnly={employerTarget.reviewsOnly}
          onClose={() => setEmployerTarget(null)}
        />
      )}

      {reviewsTarget && (
        <WReviewsPanel
          employerId={reviewsTarget.employerId}
          data={reviewsTarget.data}
          onClose={() => setReviewsTarget(null)}
        />
      )}

      {whenTarget && (
        <WWhenPanel job={whenTarget} onClose={() => setWhenTarget(null)} />
      )}

      {payTarget && (
        <WPayPanel data={payTarget} onClose={() => setPayTarget(null)} />
      )}

      {/* Bottom navigation — tmavě-modrý pill, aktivní tab modrý s popiskem.
          V otevřeném chatu se schová: překrývala by psací pole. */}
      {loaded && !chatOpen && (
        <nav style={{
          display: 'flex', alignItems: 'center', gap: 4,
          margin: '2px 16px',
          marginBottom: 'max(4px, calc(env(safe-area-inset-bottom) - 2px))',
          padding: 6,
          // Clean navbar — bílá plocha, tenký okraj, žádný stín ani sklo/odlesk.
          background: '#fff',
          border: '1px solid ' + T.border,
          borderRadius: 22,
          boxShadow: 'none',
          flexShrink: 0,
          position: 'relative', zIndex: 10,
        }}>
          {NAV.map(n => {
            const active = tab === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                title={n.label}
                style={{
                  flexGrow: active ? 1.6 : 1, flexShrink: 1, flexBasis: 0, minWidth: 0,
                  height: 46, borderRadius: 17,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '0 6px', border: 'none', cursor: 'pointer',
                  background: 'transparent',
                  boxShadow: 'none',
                  transition: 'flex-grow .4s cubic-bezier(.34,1.3,.5,1)',
                  position: 'relative',
                }}>
                <div style={{ position: 'relative', flexShrink: 0, display: 'grid', placeItems: 'center' }}>
                  {n.img
                    ? <span style={{
                        display: 'block', width: 23, height: 23,
                        background: active ? T.primary : T.light,
                        WebkitMaskImage: `url(${n.img})`, maskImage: `url(${n.img})`,
                        WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
                        WebkitMaskPosition: 'center', maskPosition: 'center',
                        WebkitMaskSize: 'contain', maskSize: 'contain',
                        transition: 'background .28s ease',
                      }} />
                    : <Icon name={n.icon} size={23} color={active ? T.primary : T.light} />}
                  {n.badge > 0 && (
                    <span style={{
                      position: 'absolute', top: -6, right: -8,
                      minWidth: 15, height: 15, padding: '0 3px',
                      borderRadius: 8,
                      // Červená vždy (i na aktivní modré dlaždici) — nepřečtená
                      // zpráva musí "křičet", ne splynout s barvou appky.
                      background: T.destructive,
                      color: '#fff', border: '2px solid #fff',
                      fontSize: 9, fontWeight: 800, fontFamily: T.fontHead,
                      display: 'grid', placeItems: 'center',
                    }}>{n.badge}</span>
                  )}
                </div>
                <span style={{
                  color: T.primary, fontFamily: T.fontUI, fontSize: 13, fontWeight: 800,
                  whiteSpace: 'nowrap', overflow: 'hidden',
                  maxWidth: active ? 84 : 0,
                  opacity: active ? 1 : 0,
                  transition: 'max-width .4s cubic-bezier(.34,1.3,.5,1), opacity .3s ease',
                }}>{n.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<WorkerApp />);
