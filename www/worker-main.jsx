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

// ── Profil zaměstnavatele (pohled brigádníka) ──────────────────
function WEmployerModal({ employerId, fallback, onClose }) {
  const [p, setP]         = useStateW(fallback || null);
  const [reviews, setRev] = useStateW(null);   // null = načítá se
  const [loading, setL]   = useStateW(true);

  useEffectW(() => {
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
  const hasInfo = industry || krajTxt || address || website || ic || memberSince;

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

          <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, margin: '18px 0 8px' }}>
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
  const [testOpen, setTestOpen] = useStateW(false);   // DOČASNÉ — nabídka testovacích upozornění
  const [chatOpen, setChatOpen] = useStateW(false);   // otevřený chat → schovat spodní nav
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
    window.wOpenEmployer = (employerId, fallback) => { if (employerId) setEmployerTarget({ employerId, fallback }); };
    // DOČASNÉ (test): pošle vybraný druh upozornění stejnou cestou jako ten
    // skutečný — toast, zvuk i zvoneček. Data jsou vzorová, chování opravdové.
    window.wTestNotif = (druh) => {
      // Vezmi skutečnou firmu z konverzací, ať test vypadá jako ostrý provoz
      const t = W_THREADS[0];
      const firma  = t ? (t.name || 'Zaměstnavatel') : 'Albert';
      const avatar = t ? { initials: t.avatar, color: t.color, logo: t.logoUrl } : { initials: 'AL', color: _wColor('test') };
      const mid    = t ? t.id : null;
      const otevri = mid ? () => openChat(mid) : () => setTab('messages');

      const vzory = {
        message: {
          n: { type: 'message', title: firma, text: 'Dobrý den, měl byste zájem o směnu v pátek?', avatar, kind: 'chat', matchId: mid },
          akce: { label: 'Odpovědět', onClick: otevri },
        },
        shift: {
          n: { type: 'shift', title: 'Nabídka směny', text: `${firma} ti nabízí směnu.`, avatar, kind: 'chat', matchId: mid },
          akce: { label: 'Zobrazit směnu', onClick: otevri },
        },
        match: {
          n: { type: 'match', title: 'Máš shodu', text: `${firma} má zájem o tvůj profil.`, avatar, kind: 'chat', matchId: mid },
          akce: { label: 'Napsat zprávu', dark: true, onClick: otevri },
        },
        review: {
          n: { type: 'review', title: 'Ohodnoť své brigády', text: 'Máš 2 dokončené brigády k ohodnocení.', kind: 'review' },
          akce: { label: 'Otevřít kalendář', onClick: () => setTab('history') },
        },
      };

      // Jen zápis do databáze — banner i zvoneček se vrátí přes realtime,
      // takže test ověří přesně tu cestu, co jede v ostrém provozu.
      const v = vzory[druh] || vzory.message;
      addNotif(v.n);
    };
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

  const NAV = [
    { id: 'swipe',    label: 'Práce',    img: 'icons/jobs-icon.png' },
    { id: 'history',  label: 'Kalendář', img: 'icons/calendar-icon.png', badge: reviewsToDo },
    { id: 'messages', label: 'Zprávy',   img: 'icons/messages-icon.png', badge: unreadMessages },
    { id: 'profile',  label: 'Profil',   img: 'icons/user.png' },
  ];

  let body;
  if (!loaded) {
    body = (
      <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 999,
            border: '3px solid rgba(0,32,246,0.18)', borderTopColor: '#6F80FF',
            animation: 'empSpin .75s linear infinite', margin: '0 auto',
          }} />
          <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 13, marginTop: 14 }}>Načítám brigády…</div>
        </div>
      </div>
    );
  } else if (tab === 'swipe') {
    body = <WSwipe tick={tick} />;
  } else if (tab === 'history') {
    body = <WCalendar tick={tick} onReviewed={refreshWorker} />;
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

      {/* Zvoneček upozornění — jen na záložce Práce, jinde překrývá obsah */}
      {loaded && tab === 'swipe' && (
        <div style={{ position: 'fixed', top: 14, right: 16, zIndex: 8500, display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* DOČASNÉ — testovací tlačítko, před buildem do App Store smazat.
              Smazat i window.wTestNotif a stav testOpen výše. */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setTestOpen(o => !o)}
              title="Vyzkoušet upozornění"
              style={{
                height: 40, padding: '0 12px', borderRadius: 14,
                background: testOpen ? T.primary : '#fff',
                border: '1px dashed ' + T.primary, color: testOpen ? '#fff' : T.primary,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                fontFamily: T.fontUI, fontSize: 12.5, fontWeight: 700,
                boxShadow: '0 6px 16px -8px rgba(16,24,64,0.28)',
              }}>
              <Icon name="bell-bold" size={14} color={testOpen ? '#fff' : T.primary} />
              Test
            </button>

            {testOpen && (<>
              <div onClick={() => setTestOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: -1 }} />
              <div style={{
                position: 'absolute', top: 48, left: 0, width: 236,
                background: '#fff', border: '1px solid ' + T.border, borderRadius: 16,
                boxShadow: '0 24px 50px rgba(20,22,40,0.2)', padding: 6,
                animation: 'wPop .2s cubic-bezier(.2,.8,.2,1)',
              }}>
                <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.7, padding: '7px 10px 8px' }}>
                  Které vyzkoušet
                </div>
                {[
                  { k: 'message', popis: 'Zpráva od firmy',   detail: 'Titulek = jméno firmy' },
                  { k: 'shift',   popis: 'Nabídka směny',     detail: 'Firma posílá termín' },
                  { k: 'match',   popis: 'Máš shodu',         detail: 'Firma přijala tvůj zájem' },
                  { k: 'review',  popis: 'Ohodnoť brigády',   detail: 'Bez firmy → značka Makej' },
                ].map(p => (
                  <button key={p.k}
                    onClick={() => { setTestOpen(false); window.wTestNotif && window.wTestNotif(p.k); }}
                    style={{
                      width: '100%', textAlign: 'left', display: 'block',
                      padding: '9px 10px', borderRadius: 11, marginBottom: 1,
                      background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                    <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 13.5, fontWeight: 800 }}>{p.popis}</div>
                    <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 11.5, marginTop: 1 }}>{p.detail}</div>
                  </button>
                ))}
              </div>
            </>)}
          </div>

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
            style={{
              width: 40, height: 40, borderRadius: 14, position: 'relative',
              background: '#fff', border: 'none', cursor: 'pointer',
              display: 'grid', placeItems: 'center', boxShadow: '0 6px 16px -8px rgba(16,24,64,0.28)',
            }}>
            <span style={{ display: 'grid', placeItems: 'center', animation: bellRing ? 'wBellRing .7s cubic-bezier(.36,.07,.19,.97)' : 'none', transformOrigin: 'top center' }}>
              <Icon name="bell-bold" size={18} color="#4a4f6b" />
            </span>
            {unreadNotifs > 0 && (
              <span style={{ position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 999, background: T.destructive, color: '#fff', fontSize: 10, fontWeight: 800, fontFamily: T.fontUI, display: 'grid', placeItems: 'center', border: '2px solid #fff' }}>{unreadNotifs}</span>
            )}
          </button>

          {bellOpen && (<>
            <div onClick={() => setBellOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: -1 }} />
            <div style={{
              position: 'absolute', top: 50, right: 0, width: 'min(360px, calc(100vw - 32px))',
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
      )}

      <WToast toasts={toasts} onRemove={id => setToasts(prev => prev.filter(t => t.id !== id))} />

      {employerTarget && (
        <WEmployerModal
          employerId={employerTarget.employerId}
          fallback={employerTarget.fallback}
          onClose={() => setEmployerTarget(null)}
        />
      )}

      {/* Bottom navigation — tmavě-modrý pill, aktivní tab modrý s popiskem.
          V otevřeném chatu se schová: překrývala by psací pole. */}
      {loaded && !chatOpen && (
        <nav style={{
          display: 'flex', alignItems: 'center', gap: 4,
          margin: '4px 16px',
          marginBottom: 'calc(10px + env(safe-area-inset-bottom))',
          padding: 7,
          // Na klidném pozadí už sklo nemá co chytat, takže si drží vlastní
          // krytí — jinak by se bar s plochou slil.
          background: 'rgba(255,255,255,0.78)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '0.5px solid rgba(255,255,255,0.9)',
          borderRadius: 26,
          boxShadow: 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4), 0 16px 34px -14px rgba(20,22,43,0.22)',
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
                  height: 50, borderRadius: 19,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '0 6px', border: 'none', cursor: 'pointer',
                  background: active ? T.primary : 'transparent',
                  boxShadow: active ? '0 12px 22px -8px rgba(0,32,246,0.75)' : 'none',
                  transition: 'flex-grow .4s cubic-bezier(.34,1.3,.5,1), background .28s ease, box-shadow .28s ease',
                  position: 'relative',
                }}>
                <div style={{ position: 'relative', flexShrink: 0, display: 'grid', placeItems: 'center' }}>
                  {n.img
                    ? <span style={{
                        display: 'block', width: 19, height: 19,
                        background: active ? '#fff' : T.light,
                        WebkitMaskImage: `url(${n.img})`, maskImage: `url(${n.img})`,
                        WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
                        WebkitMaskPosition: 'center', maskPosition: 'center',
                        WebkitMaskSize: 'contain', maskSize: 'contain',
                        transition: 'background .28s ease',
                      }} />
                    : <Icon name={n.icon} size={19} color={active ? '#fff' : T.light} />}
                  {n.badge > 0 && (
                    <span style={{
                      position: 'absolute', top: -6, right: -8,
                      minWidth: 15, height: 15, padding: '0 3px',
                      borderRadius: 8,
                      background: active ? '#fff' : T.primary,
                      color: active ? T.primary : '#fff',
                      fontSize: 9, fontWeight: 800, fontFamily: T.fontHead,
                      display: 'grid', placeItems: 'center',
                    }}>{n.badge}</span>
                  )}
                </div>
                <span style={{
                  color: '#fff', fontFamily: T.fontUI, fontSize: 13, fontWeight: 700,
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
