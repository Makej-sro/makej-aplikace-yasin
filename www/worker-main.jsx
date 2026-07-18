// Makej Worker — Root app component

// Relativní čas pro upozornění
function _wRelTime(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'teď';
  if (s < 3600) return `před ${Math.floor(s / 60)} min`;
  if (s < 86400) return `před ${Math.floor(s / 3600)} h`;
  return new Date(ts).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });
}

// Vizuální styl podle typu upozornění (barvy sladěné se světlým tématem)
const W_NOTIF_STYLE = {
  review:  { accent: '#f5b23c', iconName: 'star-bold',        iconBg: 'rgba(245,178,60,0.16)', soft: 'rgba(245,178,60,0.08)' },
  success: { accent: '#1f9d5c', iconName: 'heart-bold',       iconBg: 'rgba(31,157,92,0.14)',  soft: 'rgba(31,157,92,0.07)' },
  match:   { accent: '#1f9d5c', iconName: 'heart-bold',       iconBg: 'rgba(31,157,92,0.14)',  soft: 'rgba(31,157,92,0.07)' },
  shift:   { accent: '#1a34e8', iconName: 'calendar-bold',    iconBg: 'rgba(26,52,232,0.12)',  soft: 'rgba(26,52,232,0.06)' },
  message: { accent: '#1a34e8', iconName: 'chat-round-bold',  iconBg: 'rgba(26,52,232,0.12)',  soft: 'rgba(26,52,232,0.06)' },
  info:    { accent: '#1a34e8', iconName: 'bell-bold',        iconBg: 'rgba(26,52,232,0.12)',  soft: 'rgba(26,52,232,0.06)' },
};

function WToast({ toasts, onRemove }) {
  if (!toasts.length) return null;
  return (
    <div style={{
      position: 'fixed', top: 62, right: 14,
      zIndex: 9000, display: 'flex', flexDirection: 'column', gap: 9,
      width: 'min(320px, calc(100vw - 28px))',
    }}>
      {toasts.map(t => {
        const st = W_NOTIF_STYLE[t.type] || W_NOTIF_STYLE.info;
        const accent = t.accent || st.accent;
        const dur = ((t.ttl || 6000) / 1000).toFixed(2);
        return (
          <div key={t.id} style={{
            position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(180deg, ' + st.soft + ' 0%, #fff 44%)',
            border: '1px solid ' + T.border, borderRadius: 14,
            padding: '11px 12px 12px',
            boxShadow: '0 1px 0 rgba(255,255,255,0.7) inset, 0 12px 28px -12px rgba(20,22,40,0.28), 0 4px 10px rgba(20,22,40,0.05)',
            animation: 'wToastIn .42s cubic-bezier(.16,1,.3,1)',
          }}>
            <button onClick={() => onRemove(t.id)} aria-label="Zavřít" style={{
              position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 999,
              display: 'grid', placeItems: 'center',
              background: 'rgba(20,22,43,0.05)', border: 'none', color: T.muted, cursor: 'pointer',
              fontSize: 11, lineHeight: 1, transition: 'background .15s, color .15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(20,22,43,0.1)'; e.currentTarget.style.color = T.ink; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(20,22,43,0.05)'; e.currentTarget.style.color = T.muted; }}
            >✕</button>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              {t.avatar
                ? <div style={{ width: 38, height: 38, borderRadius: 11, background: t.avatar.color, display: 'grid', placeItems: 'center', color: '#fff', fontFamily: T.fontHead, fontWeight: 800, fontSize: 13, flexShrink: 0, boxShadow: '0 4px 10px -3px ' + accent + '55' }}>{t.avatar.initials}</div>
                : <div style={{ width: 38, height: 38, borderRadius: 11, background: st.iconBg, display: 'grid', placeItems: 'center', flexShrink: 0, boxShadow: 'inset 0 0 0 1px ' + accent + '22' }}><Icon name={st.iconName} size={18} color={accent} /></div>}
              <div style={{ flex: 1, minWidth: 0, paddingRight: 14 }}>
                <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 13.5, fontWeight: 800, letterSpacing: '-0.01em' }}>{t.title}</div>
                {t.text && <div style={{ color: T.light, fontFamily: T.fontUI, fontSize: 12, marginTop: 2, lineHeight: 1.45 }}>{t.text}</div>}
                {t.action && (
                  <button onClick={() => { t.action.onClick(); onRemove(t.id); }} style={{
                    marginTop: 9, padding: '8px 15px', borderRadius: 10,
                    background: t.action.dark ? T.black : accent, border: 'none', color: '#fff',
                    fontFamily: T.fontHead, fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
                    boxShadow: '0 5px 12px -4px ' + accent + '66',
                  }}>{t.action.label}</button>
                )}
              </div>
            </div>
            {/* odpočet do automatického zmizení */}
            <div style={{
              position: 'absolute', left: 0, bottom: 0, height: 2.5, width: '100%',
              background: accent, opacity: 0.85, transformOrigin: 'left',
              animation: 'wToastBar ' + dur + 's linear forwards',
            }} />
          </div>
        );
      })}
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
                {verified && <Icon name="verified-check-bold" size={15} color="#cdd4ff" />}
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
  const [chatTarget, setChatTarget] = useStateW(null);
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
  }

  // Uživatel může upozornění vypnout v profilu (Nastavení)
  function notifsEnabled() {
    try { return localStorage.getItem('makej-notifs') !== 'off'; } catch (e) { return true; }
  }

  // Toast (objekt: { title, text, type, accent, avatar, action, ttl })
  function addToast(opts) {
    if (!notifsEnabled()) return;
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, ...opts }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), opts.ttl || 6000);
  }

  // Upozornění do zvonečku (přežije, dokud je appka otevřená)
  function addNotif(n) {
    if (!notifsEnabled()) return;
    const id = Date.now() + Math.random();
    setNotifs(prev => [{ id, ts: Date.now(), read: false, ...n }, ...prev].slice(0, 40));
  }
  const unreadNotifs = notifs.filter(n => !n.read).length;

  useEffectW(() => {
    let done = false;
    function loadFor(session) {
      if (!session?.user || done) return;   // ještě nepřihlášen → počkej na SIGNED_IN
      done = true;
      userId.current = session.user.id;
      fetchWorkerData(session.user.id).then(() => {
        setLoaded(true);
        setTick(1);
        // Výzva k hodnocení dokončených brigád
        const toReview = W_HISTORY.filter(h => h.needsReview).length;
        if (toReview > 0) {
          const text = `Máš ${toReview} ${toReview === 1 ? 'dokončenou brigádu' : 'dokončené brigády'} k ohodnocení.`;
          addNotif({ type: 'review', title: 'Ohodnoť své brigády', text, kind: 'review' });
          setTimeout(() => addToast({
            type: 'review', title: 'Ohodnoť své brigády', text,
            action: { label: 'Otevřít Moje brigády', onClick: () => setTab('history') },
          }), 900);
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
          const avatar  = thread ? { initials: thread.avatar, color: thread.color } : null;
          addNotif({ type: 'match', title: 'Máte shodu! 🎉', text: `${company} má zájem o tvůj profil. Napiš jim!`, avatar, kind: 'chat', matchId: mid });
          addToast({ type: 'match', title: 'Máte shodu! 🎉', text: `${company} má zájem o tvůj profil. Napiš jim!`, avatar,
            action: { label: 'Napsat zprávu', dark: true, onClick: () => openChat(mid) } });
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'jobs' }, async () => {
        await fetchWorkerData(id);
        setTick(t => t + 1);
      })
      .subscribe();

    return () => { try { sb.removeChannel(channel); } catch (e) {} };
  }, [loaded]);

  // Realtime: příchozí zprávy → upozornění (zvoneček + toast)
  useEffectW(() => {
    if (!loaded || !userId.current) return;
    const id = userId.current;

    const chan = sb.channel('w-notif-' + id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const msg = payload.new;
        if (!msg || msg.sender_id === id) return;                 // vlastní zprávy ignoruj
        const thread = W_THREADS.find(t => t.id === msg.match_id);
        if (!thread) return;                                       // není to můj chat
        const company = thread.name || 'Zaměstnavatel';
        const avatar  = { initials: thread.avatar, color: thread.color };
        const isShift = msg.type === 'shift_offer';
        const title   = isShift ? 'Nová nabídka směny' : company;
        const text    = isShift ? `${company} ti nabídl/a směnu. Otevři chat.` : msg.text;
        addNotif({ type: isShift ? 'shift' : 'message', title, text, avatar: isShift ? null : avatar, kind: 'chat', matchId: msg.match_id });
        // aktualizuj náhledy v seznamu konverzací
        fetchWorkerData(id).then(() => setTick(t => t + 1));
        // toast jen když nejsem zrovna ve Zprávách
        if (tabRef.current !== 'messages') {
          addToast({ type: isShift ? 'shift' : 'message', title, text, avatar: isShift ? null : avatar,
            action: { label: isShift ? 'Zobrazit směnu' : 'Napsat zprávu', onClick: () => openChat(msg.match_id) } });
        }
      })
      .subscribe();

    return () => { try { sb.removeChannel(chan); } catch (e) {} };
  }, [loaded]);

  async function handleSignOut() {
    await sb.auth.signOut();
    window.location.href = '/';
  }

  const unreadMessages = W_THREADS.reduce((s, t) => s + (t.unread || 0), 0);
  const reviewsToDo    = W_HISTORY.filter(h => h.needsReview).length;

  const NAV = [
    { id: 'swipe',    label: 'Práce',    icon: 'case-round-bold' },
    { id: 'history',  label: 'Brigády',  icon: 'checklist-minimalistic-bold', badge: reviewsToDo },
    { id: 'messages', label: 'Zprávy',   icon: 'chat-round-bold', badge: unreadMessages },
    { id: 'profile',  label: 'Profil',   icon: 'user-bold' },
  ];

  let body;
  if (!loaded) {
    body = (
      <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 999,
            border: '3px solid rgba(0,32,246,0.18)', borderTopColor: '#5B6BFF',
            animation: 'empSpin .75s linear infinite', margin: '0 auto',
          }} />
          <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 13, marginTop: 14 }}>Načítám brigády…</div>
        </div>
      </div>
    );
  } else if (tab === 'swipe') {
    body = <WSwipe tick={tick} />;
  } else if (tab === 'history') {
    body = <WHistory tick={tick} onReviewed={refreshWorker} />;
  } else if (tab === 'messages') {
    body = <WMessages tick={tick} chatTarget={chatTarget} onChatOpened={() => setChatTarget(null)} />;
  } else if (tab === 'profile') {
    body = <WProfile tick={tick} onSignOut={handleSignOut} />;
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      width: '100%', height: '100%',
      background: 'linear-gradient(180deg, #eef1fb 0%, #f5f7fd 42%, #eaecfd 100%)',
      position: 'relative',
    }}>
      {/* Barevné skvrny — aby průhledné sklo (navbar) chytlo barvu */}
      <div style={{ position: 'absolute', top: -140, left: -120, width: 440, height: 440, borderRadius: 999, background: 'radial-gradient(circle, rgba(26,52,232,0.18), transparent 62%)', filter: 'blur(50px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '32%', right: -140, width: 420, height: 420, borderRadius: 999, background: 'radial-gradient(circle, rgba(139,155,255,0.22), transparent 62%)', filter: 'blur(55px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -80, left: '10%', right: '10%', height: 320, borderRadius: 999, background: 'radial-gradient(closest-side, rgba(91,107,255,0.28), transparent 70%)', filter: 'blur(50px)', pointerEvents: 'none' }} />
      {/* jemná tečkovaná textura */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.45,
        backgroundImage: 'radial-gradient(rgba(26,52,232,0.05) 1px, transparent 1px)',
        backgroundSize: '30px 30px',
      }} />

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
        {body}
      </div>

      {/* Zvoneček upozornění */}
      {loaded && (
        <div style={{ position: 'fixed', top: 14, right: 16, zIndex: 8500 }}>
          <button
            onClick={() => { setBellOpen(o => !o); if (!bellOpen) setNotifs(prev => prev.map(n => ({ ...n, read: true }))); }}
            style={{
              width: 40, height: 40, borderRadius: 14, position: 'relative',
              background: '#fff', border: 'none', cursor: 'pointer',
              display: 'grid', placeItems: 'center', boxShadow: '0 6px 16px -8px rgba(16,24,64,0.28)',
            }}>
            <Icon name="bell-bold" size={18} color="#4a4f6b" />
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
                {notifs.length > 0 && <button onClick={() => setNotifs([])} style={{ background: 'none', border: 'none', color: T.muted, fontFamily: T.fontUI, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Vymazat</button>}
              </div>
              {notifs.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🔔</div>
                  <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 13 }}>Zatím žádná upozornění.</div>
                </div>
              ) : (
                <div style={{ padding: '8px' }}>
                  {notifs.map(n => {
                    const st = W_NOTIF_STYLE[n.type] || W_NOTIF_STYLE.info;
                    return (
                      <button key={n.id}
                        onClick={() => { setBellOpen(false); if (n.kind === 'chat' && n.matchId) openChat(n.matchId); else if (n.kind === 'review') setTab('history'); }}
                        style={{ width: '100%', textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', display: 'flex', gap: 11, alignItems: 'flex-start', padding: '11px 12px', borderRadius: 12, background: 'transparent', border: 'none' }}>
                        {n.avatar
                          ? <div style={{ width: 40, height: 40, borderRadius: 11, background: n.avatar.color, display: 'grid', placeItems: 'center', color: '#fff', fontFamily: T.fontHead, fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{n.avatar.initials}</div>
                          : <div style={{ width: 40, height: 40, borderRadius: 11, background: st.iconBg, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name={st.iconName} size={18} color={st.accent} /></div>}
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

      {/* Bottom navigation — tmavě-modrý pill, aktivní tab modrý s popiskem */}
      {loaded && (
        <nav style={{
          display: 'flex', alignItems: 'center', gap: 4,
          margin: '4px 16px',
          marginBottom: 'calc(10px + env(safe-area-inset-bottom))',
          padding: 7,
          background: 'rgba(255,255,255,0.5)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '0.5px solid rgba(255,255,255,0.6)',
          borderRadius: 26,
          boxShadow: 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4), 0 18px 40px -18px rgba(20,22,43,0.3)',
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
                  boxShadow: active ? '0 12px 22px -8px rgba(26,52,232,0.75)' : 'none',
                  transition: 'flex-grow .4s cubic-bezier(.34,1.3,.5,1), background .28s ease, box-shadow .28s ease',
                  position: 'relative',
                }}>
                <div style={{ position: 'relative', flexShrink: 0, display: 'grid', placeItems: 'center' }}>
                  <Icon name={n.icon} size={19} color={active ? '#fff' : T.light} />
                  {n.badge > 0 && (
                    <span style={{
                      position: 'absolute', top: -6, right: -8,
                      minWidth: 15, height: 15, padding: '0 3px',
                      borderRadius: 8,
                      background: active ? '#fff' : T.primary,
                      color: active ? T.primary : '#fff',
                      fontSize: 9, fontWeight: 800, fontFamily: T.fontHead,
                      display: 'grid', placeItems: 'center',
                      border: active ? 'none' : '2px solid rgba(255,255,255,0.85)',
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
