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

// ── Konec zásobníku — nikdy prázdná obrazovka, vždy nabídni další krok ──
function WDeckEnd({ kraje, otherCount, onClearKraje, onRestored }) {
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

  // Nejsilnější dostupná cesta ven: rozšířit kraje → jinak vrátit odmítnuté
  const loading    = rej === null;
  const canWiden   = kraje.length > 0 && otherCount > 0;
  const canRestore = !canWiden && rejected > 0;

  // Texty bez rodu — vyhýbáme se příčestí minulému (prošel/la, odmítl/a)
  const title = canWiden ? 'Ve vybraných krajích je hotovo' : 'Konec nabídek';

  const subtitle = canWiden
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
          <Icon name={canWiden ? 'map-point-bold' : 'check-circle-bold'} size={30} color={T.primary} />
        </div>

        <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 19, fontWeight: 800, marginBottom: 8 }}>{title}</div>
        <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 13.5, lineHeight: 1.6, marginBottom: 20 }}>{subtitle}</div>

        {canWiden && (
          <button onClick={onClearKraje} style={{ ...btn, background: T.primary, color: '#fff', boxShadow: '0 12px 24px -10px rgba(0,32,246,0.7)' }}>
            <Icon name="magnifer-linear" size={17} color="#fff" />
            Zobrazit {otherCount} {_wPlural(otherCount, 'brigádu', 'brigády', 'brigád')} odjinud
          </button>
        )}

        {canRestore && (
          <button onClick={() => onRestored(rejectedJobs)} style={{ ...btn, background: T.primary, color: '#fff', boxShadow: '0 12px 24px -10px rgba(0,32,246,0.7)' }}>
            Prohlédnout již odmítnuté
          </button>
        )}

        {/* I když nic rozšířit nejde, obrazovka nikdy nezůstane bez akce */}
        {!canWiden && !canRestore && !loading && (
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

function WSwipe({ tick }) {
  const [jobs,       setJobs]       = useStateW(() => W_JOBS.map(jobToCard));
  const [topIdx,     setTopIdx]     = useStateW(0);
  const [drag,       setDrag]       = useStateW({ x: 0, y: 0, dragging: false, moved: false, startX: 0, startY: 0 });
  const [matchAnim,  setMatchAnim]  = useStateW(null);
  const [isSuperAnim,setIsSuperAnim]= useStateW(false);
  const [actionAnim, setActionAnim] = useStateW(null); // 'like' | 'pass' | 'super'
  const [detailJob,  setDetailJob]  = useStateW(null);
  const [kraje,      setKraje]      = useStateW(() => { try { return JSON.parse(localStorage.getItem('makej-worker-kraje') || '[]'); } catch (e) { return []; } });
  const userId  = useRefW(null);
  const dragRef = useRefW(drag);

  const _filterKraj = list => kraje.length ? list.filter(j => kraje.includes(j.kraj)) : list;

  useEffectW(() => { dragRef.current = drag; }, [drag]);

  useEffectW(() => {
    sb.auth.getSession().then(({ data: { session } }) => { userId.current = session?.user?.id || null; });
    setJobs(_filterKraj(W_JOBS.map(jobToCard)));
    setTopIdx(0);
  }, [tick]);

  // Filtr krajů — ulož + přefiltruj feed
  useEffectW(() => {
    try { localStorage.setItem('makej-worker-kraje', JSON.stringify(kraje)); } catch (e) {}
    setJobs(_filterKraj(W_JOBS.map(jobToCard)));
    setTopIdx(0);
  }, [kraje]);

  // Zatím bez ovládání v UI — čeká na společné tlačítko filtrů
  const toggleKraj = id => setKraje(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const currentJob   = jobs[topIdx] || null;
  const visibleCards = jobs.slice(topIdx, topIdx + 3);

  // Zaznamenat zhlédnutí, když se inzerát dostane navrch
  useEffectW(() => {
    if (currentJob && currentJob.id && typeof logJobViewW === 'function') logJobViewW(currentJob.id);
  }, [currentJob && currentJob.id]);
  const trust        = makejTrust({ ...W_TRUST, hodnoceni: Number(W_PROFILE.rating) || 0 });
  const remaining    = Math.max(0, jobs.length - topIdx);

  const snapBack = () => setDrag({ x: 0, y: 0, dragging: false, moved: false, startX: 0, startY: 0 });

  const animateFly = (dir, cb) => {
    if (dir === 'super') setDrag(d => ({ ...d, x: 0, y: -1400, dragging: false }));
    else setDrag(d => ({ ...d, x: dir === 'like' ? 1400 : -1400, y: 0, dragging: false }));
    setTimeout(() => { snapBack(); cb(); }, 380);
  };

  async function doLike(sup) {
    if (!currentJob) return;
    const job = currentJob;
    setActionAnim(sup ? 'super' : 'like');
    setTimeout(() => setActionAnim(null), 600);
    animateFly(sup ? 'super' : 'like', async () => {
      setTopIdx(i => i + 1);
      const uid = userId.current;
      if (uid) {
        await createMatchW(uid, job.id, sup);
        setIsSuperAnim(!!sup);
        setMatchAnim(job);
        setTimeout(() => setMatchAnim(null), 3000);
      }
    });
  }
  const doSuper = () => doLike(true);

  async function doPass() {
    if (!currentJob) return;
    const job = currentJob;
    setActionAnim('pass');
    setTimeout(() => setActionAnim(null), 600);
    animateFly('pass', async () => {
      setTopIdx(i => i + 1);
      const uid = userId.current;
      if (uid) await createRejectionW(uid, job.id);
    });
  }

  const onPointerDown = e => {
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
    if      (d.y < -110 && Math.abs(d.y) > Math.abs(d.x)) doSuper();
    else if (d.x >  90) doLike(false);
    else if (d.x < -90) doPass();
    else if (!d.moved && currentJob) { snapBack(); setDetailJob(currentJob); }
    else                snapBack();
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, paddingTop: 4, position: 'relative' }}>

      {/* Header */}
      <div style={{ padding: '12px 20px 12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
        {/* Počet nabídek zatím neukazujeme: `remaining` je odpočet do konce zásobníku,
            ne velikost nabídky — a "v okolí" nesedí, dokud appka nezná polohu. */}
        <div />
        <div title={'Stupeň důvěry: ' + trust.tier.nazev} style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '6px 12px 6px 6px', borderRadius: 22, marginRight: 50,
          background: T.navBg, flexShrink: 0,
        }}>
          <span style={{
            width: 24, height: 24, borderRadius: 999, flexShrink: 0,
            background: trust.tier.barva,
            display: 'grid', placeItems: 'center',
          }}>
            <Icon name={trust.index === 0 ? 'user-bold' : 'verified-check-bold'} size={13} color="#fff" />
          </span>
          <span style={{ color: '#fff', fontFamily: T.fontUI, fontSize: 12, fontWeight: 700 }}>{trust.tier.nazev}</span>
        </div>
      </div>

      {/* Filtr krajů má přijít do samostatného tlačítka filtrů, ne na hlavní plochu.
          Stav `kraje` (i uložení do localStorage) zůstává funkční — chybí jen ovládání. */}

      {/* Card stack */}
      {visibleCards.length === 0 ? (
        <WDeckEnd
          kraje={kraje}
          otherCount={Math.max(0, W_JOBS.length - jobs.length)}
          onClearKraje={() => setKraje([])}
          onRestored={list => {
            // Odmítnuté zobrazujeme bez filtru krajů — brigádník si o ně řekl výslovně
            if (list && list.length) { setJobs(list.map(jobToCard)); setTopIdx(0); }
            else { setJobs(_filterKraj(W_JOBS.map(jobToCard))); setTopIdx(0); }
          }}
        />
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', minHeight: 0 }}>
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 420,
            height: '100%',
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
            return (
              <WJobCard
                key={job.id}
                job={job}
                drag={isTop ? drag : { x: 0, y: 0, dragging: false, moved: false }}
                isTop={isTop}
                depth={depth}
                onTap={() => setDetailJob(job)}
              />
            );
          })}
        </div>
        </div>
      )}

      {/* Action buttons — plovoucí přes spodek karty (přeskočit / super / mám zájem) */}
      {visibleCards.length > 0 && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 16, zIndex: 20, pointerEvents: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20 }}>
          <button
            onClick={doPass}
            style={{
              width: 58, height: 58, borderRadius: 999, pointerEvents: 'auto',
              background: '#fff', border: '1px solid #f3dcd9',
              boxShadow: actionAnim === 'pass' ? '0 0 0 6px rgba(226,86,74,0.16)' : '0 14px 26px -16px rgba(226,86,74,0.55)',
              display: 'grid', placeItems: 'center', cursor: 'pointer',
              transition: 'all .2s', outline: 'none',
            }}
            title="Přeskočit"
          >
            <Icon name="close-circle-bold" size={26} color={T.destructive} />
          </button>

          <button
            onClick={doSuper}
            style={{
              width: 58, height: 58, borderRadius: 999, pointerEvents: 'auto',
              background: '#fff', border: '1px solid #f4e6c8',
              boxShadow: actionAnim === 'super' ? '0 0 0 6px rgba(245,178,60,0.2)' : '0 14px 26px -16px rgba(245,178,60,0.5)',
              display: 'grid', placeItems: 'center', cursor: 'pointer',
              transition: 'all .2s', outline: 'none',
            }}
            title="Super zájem — zaměstnavatel tě uvidí přednostně"
          >
            <Icon name="star-bold" size={23} color={T.super} />
          </button>

          <button
            onClick={() => doLike(false)}
            style={{
              width: 72, height: 72, borderRadius: 999, pointerEvents: 'auto',
              background: T.primary, border: 'none',
              boxShadow: actionAnim === 'like' ? '0 0 0 8px rgba(0,32,246,0.22)' : '0 18px 32px -12px rgba(0,32,246,0.65)',
              display: 'grid', placeItems: 'center', cursor: 'pointer',
              transition: 'all .2s', outline: 'none',
            }}
            title="Mám zájem"
          >
            <Icon name="heart-bold" size={30} color="#fff" />
          </button>
        </div>
      )}

      {/* Match animation */}
      {matchAnim && (
        <div
          onClick={() => setMatchAnim(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(12px)',
            animation: 'wPop .35s cubic-bezier(.2,.8,.2,1)',
          }}
        >
          <div style={{ textAlign: 'center', padding: '32px 40px', maxWidth: 360 }}>
            <div style={{ fontSize: 80, marginBottom: 4, lineHeight: 1 }}>{isSuperAnim ? '⭐' : '💙'}</div>
            <div style={{ color: '#fff', fontFamily: T.fontHead, fontSize: 34, fontWeight: 900, letterSpacing: -1, marginTop: 8 }}>
              {isSuperAnim ? 'Super zájem odeslán!' : 'Zájem odeslán!'}
            </div>
            <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 14, marginTop: 10, lineHeight: 1.6 }}>
              {isSuperAnim
                ? <>Zaměstnavatel uvidí tvůj profil <span style={{ color: T.super, fontWeight: 700 }}>přednostně</span>.<br />Jakmile tě přijme, otevře se chat.</>
                : <>Tvůj profil byl odeslán zaměstnavateli.<br />Jakmile tě přijme, otevře se chat.</>}
            </div>
            <div style={{
              margin: '20px auto 0',
              padding: '12px 20px',
              borderRadius: 14,
              background: 'rgba(111,128,255,0.15)',
              border: '1px solid rgba(111,128,255,0.3)',
              color: '#fff',
              fontFamily: T.fontUI,
              fontSize: 14,
            }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{matchAnim.title}</div>
              <div style={{ color: T.muted, fontSize: 12, marginTop: 3 }}>{matchAnim.company} · {matchAnim.when}</div>
            </div>
            <button
              onClick={e => { e.stopPropagation(); setMatchAnim(null); }}
              style={{
                marginTop: 24, padding: '13px 36px', borderRadius: 999,
                background: T.ink,
                border: 'none', color: '#fff',
                fontFamily: T.fontHead, fontSize: 15, fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Pokračovat →
            </button>
          </div>
        </div>
      )}

      {/* Detail inzerátu */}
      {detailJob && (
        <WJobDetailModal
          job={detailJob}
          onClose={() => setDetailJob(null)}
          onLike={() => { setDetailJob(null); doLike(false); }}
          onSuper={() => { setDetailJob(null); doSuper(); }}
          onPass={() => { setDetailJob(null); doPass(); }}
        />
      )}
    </div>
  );
}

// ── Swipovací karta (light styl podle mockupu) ─────────────────
function WJobCard({ job, drag, isTop, depth = 0, onTap }) {
  const x = isTop ? drag.x : 0;
  const y = isTop ? drag.y : 0;
  const rot = isTop ? (x / 18) : 0;
  const opacity = isTop ? 1 : (1 - depth * 0.08);
  const scale = isTop ? 1 : (1 - depth * 0.04);
  const translateY = isTop ? 0 : (depth * 12);

  const likeShown = isTop && x > 40;
  const passShown = isTop && x < -40;
  const superShown = isTop && y < -60;

  const distanceTxt = job.distance != null ? String(job.distance).replace('.', ',') + ' km' : (job.location || '');
  const tags = Array.isArray(job.tags) ? job.tags : [];
  const heroImg = job.image_url || job.image || job.cover_url || job.photo_url || null;

  return (
    <div
      style={{
        position: 'absolute', inset: 0,
        transform: `translate(${x}px, ${y + translateY}px) rotate(${rot}deg) scale(${scale})`,
        opacity,
        transition: drag.dragging ? 'none' : 'transform .35s cubic-bezier(.2,.8,.2,1), opacity .35s',
        willChange: 'transform', zIndex: 10 - depth,
        pointerEvents: isTop ? 'auto' : 'none',
      }}
      onClick={() => isTop && !drag.moved && onTap?.()}
    >
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 34, overflow: 'hidden',
        background: heroImg ? `#0014A3 url("${heroImg}") center / cover no-repeat` : T.heroGrad,
        boxShadow: '0 24px 50px rgba(20,22,40,0.18), 0 2px 8px rgba(20,22,40,0.06)',
      }}>
        {/* tečkovaná textura + velký prosvítající monogram, když není fotka */}
        {!heroImg && (<>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.16) 1.3px, transparent 1.3px)', backgroundSize: '19px 19px', opacity: 0.55, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', overflow: 'hidden' }}>
            <span style={{ fontFamily: T.fontHead, fontWeight: 800, fontSize: 200, color: 'rgba(255,255,255,0.09)', letterSpacing: -4, lineHeight: 1 }}>{job.logo}</span>
          </div>
        </>)}

        {/* tmavý přechod dole — pro čitelnost textu na fotce/gradientu */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '68%', background: 'linear-gradient(to top, rgba(8,11,34,0.92) 6%, rgba(8,11,34,0.6) 40%, transparent 100%)', pointerEvents: 'none' }} />

        {/* logo firmy — klik otevře profil zaměstnavatele */}
        <div
          onClick={(e) => { e.stopPropagation(); if (!drag.moved && window.wOpenEmployer) window.wOpenEmployer(job.employer_id, { name: job.company, color: job.accent, rating: job.rating, verified: job.verified }); }}
          title="Zobrazit profil firmy"
          style={{
            position: 'absolute', top: 18, left: 18,
            width: 50, height: 50, borderRadius: 16,
            background: 'rgba(255,255,255,0.18)',
            backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.34)',
            display: 'grid', placeItems: 'center', cursor: 'pointer',
            color: '#fff', fontFamily: T.fontHead, fontWeight: 800, fontSize: 19,
          }}>{job.logo}</div>

        {/* rating pill vpravo nahoře */}
        {job.rating > 0 && (
          <div style={{ position: 'absolute', top: 20, right: 18, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 20, background: 'rgba(255,255,255,0.94)', boxShadow: '0 8px 18px -10px rgba(0,0,0,0.4)' }}>
            <Icon name="star-bold" size={15} color={T.super} />
            <span style={{ color: T.ink, fontFamily: T.fontHead, fontWeight: 800, fontSize: 13.5 }}>{job.rating.toFixed(1).replace('.', ',')}</span>
          </div>
        )}

        {job.boosted && (
          <div style={{ position: 'absolute', top: 82, left: 18, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 999, background: '#fff', color: T.super, fontFamily: T.fontHead, fontSize: 11.5, fontWeight: 800, boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
            <Icon name="bolt-bold" size={12} color={T.super} /> TOP
          </div>
        )}

        {/* Info napsané přímo na fotce (dole) */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0 22px 100px', zIndex: 2 }}>
          {/* firma · místo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, minWidth: 0 }}>
            <span style={{ color: 'rgba(255,255,255,0.9)', fontFamily: T.fontUI, fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {job.company}{job.location ? ' · ' + job.location : ''}
            </span>
            {job.verified && <Icon name="verified-check-bold" size={14} color="#8effc0" />}
          </div>

          {/* název — velký */}
          <div style={{
            color: '#fff', fontFamily: T.fontHead, fontSize: 25, fontWeight: 800, letterSpacing: -0.4, lineHeight: 1.12, marginBottom: 14,
            textShadow: '0 2px 12px rgba(0,0,0,0.3)',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{job.title}</div>

          {/* datum + čas — skleněné chipy */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginBottom: 16 }}>
            {job.when && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.16)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 11, padding: '8px 12px', color: '#fff', fontFamily: T.fontUI, fontSize: 12.5, fontWeight: 600 }}><Icon name="calendar-minimalistic-bold" size={14} color="#fff" />{job.when}</span>}
            {job.time && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.16)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 11, padding: '8px 12px', color: '#fff', fontFamily: T.fontUI, fontSize: 12.5, fontWeight: 600 }}><Icon name="clock-circle-bold" size={14} color="#fff" />{job.time}</span>}
          </div>

          {/* cena — velká */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ color: '#fff', fontFamily: T.fontHead, fontWeight: 800, fontSize: 34, letterSpacing: -0.5 }}>{job.pay}</span>
              <span style={{ color: 'rgba(255,255,255,0.75)', fontFamily: T.fontUI, fontSize: 13.5, fontWeight: 600 }}>{job.payUnit}</span>
            </div>
            {job.shiftTotal > 0 && (
              <span style={{ color: 'rgba(255,255,255,0.7)', fontFamily: T.fontUI, fontSize: 13 }}>≈ {job.shiftTotal.toLocaleString('cs-CZ').replace(/,/g, ' ')} Kč / směna</span>
            )}
          </div>
        </div>

        {/* swipe razítka */}
        <Stamp show={likeShown} angle={-12} pos={{ top: 30, left: 22 }} color="#7bffb0" label="MÁM ZÁJEM" intensity={Math.min(1, x / 120)} />
        <Stamp show={passShown} angle={14} pos={{ top: 30, right: 22 }} color="#ffffff" label="PŘESKOČIT" intensity={Math.min(1, -x / 120)} />
        <Stamp show={superShown} angle={-4} pos={{ top: '36%', left: '50%', transform: 'translate(-50%,-50%)' }} color={T.super} label="SUPER" big intensity={Math.min(1, -y / 140)} />
      </div>
    </div>
  );
}

// ── Detail inzerátu (reálná data od zaměstnavatele) ────────────
function WJobDetailModal({ job, onClose, onLike, onSuper, onPass, readOnly, statusLabel, onChat, onCancel }) {
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
          <span style={{ flexShrink: 0, marginTop: 1 }}><Icon name={iconName} size={16} color={iconColor} /></span>
          <span>{r}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 120,
      background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      animation: 'wPop .28s cubic-bezier(.2,.8,.2,1)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 440, maxHeight: '88vh',
        background: '#fff', borderRadius: 24,
        border: '1px solid ' + T.border,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(20,22,40,0.28)',
      }}>
        {/* Hero — světlý (bez gradientu) */}
        <div style={{
          position: 'relative', flexShrink: 0, padding: '20px 22px 20px',
          background: T.surfaceAlt, borderBottom: '1px solid ' + T.border,
        }}>
          <button onClick={onClose} title="Zavřít" style={{
            position: 'absolute', top: 14, right: 14, width: 34, height: 34, borderRadius: 999,
            background: 'rgba(18,18,26,0.06)', border: 'none', color: T.ink, cursor: 'pointer',
            display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 700,
          }}>✕</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingRight: 40 }}>
            <div
              onClick={() => window.wOpenEmployer && window.wOpenEmployer(job.employer_id, { name: job.company, color: job.accent, rating: job.rating, verified: job.verified })}
              title="Zobrazit profil firmy"
              style={{
                width: 52, height: 52, borderRadius: 15, background: 'linear-gradient(135deg, '+T.primary+', #6F80FF)',
                color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer',
                fontFamily: T.fontHead, fontWeight: 800, fontSize: 18, flexShrink: 0,
                boxShadow: '0 8px 18px rgba(0,32,246,0.28)',
              }}>{job.logo}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <button
                onClick={() => window.wOpenEmployer && window.wOpenEmployer(job.employer_id, { name: job.company, color: job.accent, rating: job.rating, verified: job.verified })}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer', maxWidth: '100%' }}>
                <span style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.company}</span>
                {job.rating > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                    <Icon name="star-bold" size={12} color={T.super} />
                    <span style={{ color: T.ink, fontFamily: T.fontHead, fontWeight: 800, fontSize: 12.5 }}>{job.rating.toFixed(1).replace('.', ',')}</span>
                  </span>
                )}
                {job.verified && <Icon name="verified-check-bold" size={13} color={T.green} />}
                <Icon name="alt-arrow-right-bold" size={12} color={T.mutedSoft} />
              </button>
              <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 22, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.15, marginTop: 3 }}>{job.title}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ color: T.ink, fontFamily: T.fontHead, fontWeight: 800, fontSize: 32, letterSpacing: -1 }}>{job.pay}</span>
            <span style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 14 }}>{job.payUnit}</span>
            {job.shiftTotal > 0 && <span style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 13.5, marginLeft: 4 }}>≈ {job.shiftTotal.toLocaleString('cs-CZ').replace(/,/g, ' ')} Kč / směna</span>}
            {job.tips && <span style={{ marginLeft: 2, fontSize: 11.5, fontWeight: 700, color: T.primary, background: 'T.tint', padding: '4px 10px', borderRadius: 999 }}>+ spropitné</span>}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 22px 22px' }}>
          {row('case-round-bold', 'Typ úvazku', JOB_TYPE_LABEL[job.jobType] || 'Brigáda')}
          {row('calendar-bold', 'Datum', job.when || job.date)}
          {row('clock-circle-bold', 'Čas', job.time)}
          {job.shiftHours ? row('clock-circle-bold', 'Délka směny', job.shiftHours + ' h') : null}
          {row('map-point-bold', 'Místo', job.location)}
          {job.distance != null && row('map-point-bold', 'Vzdálenost', String(job.distance).replace('.', ',') + ' km')}
          {job.positions > 1 && row('users-group-rounded-bold', 'Volných míst', job.positions)}
          {row('hanger-2-bold', 'Dress code', job.dressCode)}

          {job.desc && (<>
            {sectionTitle('Popis práce')}
            <div style={{ color: T.inkSoft, fontFamily: T.fontUI, fontSize: 14.5, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{job.desc}</div>
          </>)}

          {job.requirements && job.requirements.length > 0 && (<>
            {sectionTitle('Co budeš potřebovat')}
            {bullets(job.requirements, 'check-circle-bold', T.primary)}
          </>)}

          {job.benefits && job.benefits.length > 0 && (<>
            {sectionTitle('Co nabízíme')}
            {bullets(job.benefits, 'star-bold', T.super)}
          </>)}

          {job.contactNote && (<>
            {sectionTitle('Kam dorazit / kontakt')}
            <div style={{ color: T.inkSoft, fontFamily: T.fontUI, fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{job.contactNote}</div>
          </>)}

          {job.tags && job.tags.length > 0 && (<>
            {sectionTitle('Štítky')}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {job.tags.map((t, i) => (
                <span key={t} style={{ padding: '7px 14px', borderRadius: 999, background: i === 0 ? 'T.tint' : T.surfaceAlt, color: i === 0 ? T.primary : T.inkSoft, fontSize: 13, fontWeight: 700, fontFamily: T.fontUI }}>{t}</span>
              ))}
            </div>
          </>)}
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
              <button onClick={onClose} style={{
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
        <div style={{ flexShrink: 0, padding: '12px 22px calc(14px + env(safe-area-inset-bottom))', borderTop: '1px solid ' + T.border, display: 'flex', gap: 10, background: '#fff' }}>
          <button onClick={onPass} style={{
            width: 54, flexShrink: 0, borderRadius: 14, padding: '13px 0',
            background: '#fff', border: '1px solid ' + T.border, boxShadow: '0 4px 12px rgba(20,22,40,0.06)',
            display: 'grid', placeItems: 'center', cursor: 'pointer',
          }} title="Přeskočit"><Icon name="close-circle-bold" size={22} color={T.primary} /></button>
          <button onClick={onSuper} style={{
            width: 54, flexShrink: 0, borderRadius: 14, padding: '13px 0',
            background: '#fff', border: '1px solid ' + T.border, boxShadow: '0 4px 12px rgba(20,22,40,0.06)',
            display: 'grid', placeItems: 'center', cursor: 'pointer',
          }} title="Super zájem"><Icon name="star-bold" size={20} color={T.primary} /></button>
          <button onClick={onLike} style={{
            flex: 1, borderRadius: 14, padding: '13px 0',
            background: T.ink, border: 'none',
            color: '#fff', fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}><Icon name="heart-bold" size={17} color="#fff" /> Mám zájem</button>
        </div>
        )}
      </div>
    </div>
  );
}
