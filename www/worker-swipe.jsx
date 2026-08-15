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

// Appka teprve startuje — reálných inzerátů bývá málo/žádné. Ukázkové JOBS
// z app.jsx jsou už ve tvaru karty (žádný jobToCard netřeba). `_demo: true`
// zabrání zápisu do DB při swipu (fake id by insert stejně nepřežil).
function _wDemoJobs() {
  return (typeof JOBS !== 'undefined' ? JOBS : []).map(j => ({ ...j, _demo: true }));
}

// Potvrzení „Zájem odeslán" se ukazuje po přijetí brigády, dokud si ho uživatel
// nevypne přes „Příště nezobrazovat" (uloženo v zařízení).
const _zajemHidden = () => { try { return localStorage.getItem('makej-hide-zajem') === '1'; } catch (e) { return false; } };

function WSwipe({ tick }) {
  const [jobs,       setJobs]       = useStateW(() => {
    const real = W_JOBS.map(jobToCard);
    return real.length ? real : _wDemoJobs();
  });
  const [topIdx,     setTopIdx]     = useStateW(0);
  const [drag,       setDrag]       = useStateW({ x: 0, y: 0, dragging: false, moved: false, startX: 0, startY: 0 });
  const [matchAnim,  setMatchAnim]  = useStateW(null);
  const [isSuperAnim,setIsSuperAnim]= useStateW(false);
  const [hideInfo,   setHideInfo]   = useStateW(() => _zajemHidden());   // „Příště nezobrazovat"
  const [actionAnim, setActionAnim] = useStateW(null); // 'like' | 'pass' | 'super'
  const [flying,     setFlying]     = useStateW(0);    // 0=klid; 1/-1 = probíhá odlet → spodní karty se dorovnají o úroveň výš
  const [detailJob,  setDetailJob]  = useStateW(null);
  const [detailRect, setDetailRect] = useStateW(null);   // rect karty → detail se z ní „roztáhne"
  const [kraje,      setKraje]      = useStateW(() => { try { return JSON.parse(localStorage.getItem('makej-worker-kraje') || '[]'); } catch (e) { return []; } });
  const userId  = useRefW(null);
  const dragRef = useRefW(drag);
  const deckRef = useRefW(null);   // kontejner karty → odkud se detail roztáhne

  const _filterKraj = list => kraje.length ? list.filter(j => kraje.includes(j.kraj)) : list;

  useEffectW(() => { dragRef.current = drag; }, [drag]);

  useEffectW(() => {
    sb.auth.getSession().then(({ data: { session } }) => { userId.current = session?.user?.id || null; });
    const real = _filterKraj(W_JOBS.map(jobToCard));
    setJobs(real.length ? real : _wDemoJobs());
    setTopIdx(0);
  }, [tick]);

  // Filtr krajů — ulož + přefiltruj feed
  useEffectW(() => {
    try { localStorage.setItem('makej-worker-kraje', JSON.stringify(kraje)); } catch (e) {}
    const real = _filterKraj(W_JOBS.map(jobToCard));
    setJobs(real.length ? real : _wDemoJobs());
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

  const closeMatch = () => { setMatchAnim(null); if (typeof window !== 'undefined' && window.wSetDetailOpen) window.wSetDetailOpen(false); };

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
        setMatchAnim(job);
        if (typeof window !== 'undefined' && window.wSetDetailOpen) window.wSetDetailOpen(true);   // schovej horní lištu za potvrzením
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
    setDetailJob(job);
  };

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
    if      (d.y < -110 && Math.abs(d.y) > Math.abs(d.x)) { snapBack(); if (currentJob) openDetail(currentJob); }
    else if (d.x >  90) doLike(false);
    else if (d.x < -90) doPass();
    else if (!d.moved && currentJob) { snapBack(); openDetail(currentJob); }
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 8px 6px', minHeight: 0, gap: 12 }}>
        <div
          ref={deckRef}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 460,
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
                onTap={() => setDetailJob(job)}
              />
            );
          })}
        </div>

          {/* Akce pod kartou — obdélníky na šířku karty:
              Nemám zájem (červený obrys) + Mám zájem (plná zelená, bílý text) */}
          <div style={{ flex: 'none', width: '100%', maxWidth: 460, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0 6px' }}>
            {/* ConfirmButton 3c: po stisku/swipu se vyplní a přepne popisek na výsledek
                (Odmítnuto/Odesláno), po 700 ms zpět. Obrys „Nemám zájem" je inset stín,
                aby mělo stejnou šířku jako plné tlačítko vedle. */}
            <button onClick={doPass} title="Nemám zájem" style={{
              flex: 1, height: 56, borderRadius: 16, boxSizing: 'border-box',
              border: 'none', outline: 'none', cursor: 'pointer',
              fontFamily: T.fontHead, fontSize: 15.5, fontWeight: 800,
              WebkitTapHighlightColor: 'transparent',
              background: actionAnim === 'pass' ? '#D63A24' : '#fff',
              color: actionAnim === 'pass' ? '#fff' : '#D63A24',
              boxShadow: actionAnim === 'pass' ? 'inset 0 0 0 2px #D63A24' : 'inset 0 0 0 2px #E2543F',
              transition: `background ${actionAnim === 'pass' ? 160 : 240}ms ease-out, color ${actionAnim === 'pass' ? 160 : 240}ms ease-out, box-shadow ${actionAnim === 'pass' ? 160 : 240}ms ease-out`,
            }}>{actionAnim === 'pass' ? 'Odmítnuto' : 'Nemám zájem'}</button>

            <button onClick={() => doLike(false)} title="Mám zájem" style={{
              flex: 1, height: 56, borderRadius: 16, boxSizing: 'border-box',
              border: 'none', outline: 'none', cursor: 'pointer', color: '#fff',
              fontFamily: T.fontHead, fontSize: 15.5, fontWeight: 800,
              WebkitTapHighlightColor: 'transparent',
              background: actionAnim === 'like' ? '#0F6B32' : '#16803D',
              boxShadow: actionAnim === 'like' ? '0 2px 8px rgba(22,128,61,.3)' : '0 6px 16px rgba(22,128,61,.28)',
              transition: `background ${actionAnim === 'like' ? 160 : 240}ms ease-out, box-shadow ${actionAnim === 'like' ? 160 : 240}ms ease-out`,
            }}>{actionAnim === 'like' ? 'Odesláno' : 'Mám zájem'}</button>
          </div>
        </div>
      )}

      {/* Match animation */}
      {matchAnim && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: T.primary,
          display: 'flex', flexDirection: 'column',
          animation: 'wPop .3s cubic-bezier(.2,.8,.2,1)',
        }}>
          {/* Horní modrá část — potvrzení */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 40px', textAlign: 'center' }}>
            <div style={{ width: 92, height: 92, borderRadius: 26, background: 'rgba(255,255,255,0.16)', display: 'grid', placeItems: 'center', marginBottom: 26 }}>
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div style={{ color: '#fff', fontFamily: T.fontHead, fontSize: 31, fontWeight: 800, letterSpacing: -0.8 }}>Zájem odeslán</div>
            <div style={{ color: 'rgba(255,255,255,0.82)', fontFamily: T.fontUI, fontSize: 15.5, lineHeight: 1.55, marginTop: 12, maxWidth: 320 }}>
              {matchAnim.company} odpovídá obvykle do hodiny. Dáme ti vědět, jakmile se ozve.
            </div>
          </div>

          {/* Spodní bílý list */}
          <div style={{ flex: 'none', background: '#fff', borderRadius: '28px 28px 0 0', padding: '22px 20px calc(18px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Souhrn brigády */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ width: 44, height: 44, flex: 'none', borderRadius: 13, background: T.tint, color: T.primary, fontFamily: T.fontHead, fontSize: 17, fontWeight: 800, display: 'grid', placeItems: 'center' }}>{matchAnim.logo}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 16, fontWeight: 800, lineHeight: 1.25 }}>{matchAnim.title}</div>
                  <span style={{ flex: 'none', fontFamily: T.fontHead, fontSize: 11.5, fontWeight: 800, padding: '5px 10px', borderRadius: 999, color: '#B96F06', background: '#FFF3E0', whiteSpace: 'nowrap' }}>Čeká na firmu</span>
                </div>
                <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 13, marginTop: 3 }}>
                  {[matchAnim.when, matchAnim.time, (matchAnim.shiftTotal > 0 ? matchAnim.shiftTotal.toLocaleString('cs-CZ').replace(/,/g, ' ') + ' Kč' : null)].filter(Boolean).join(' · ')}
                </div>
              </div>
            </div>

            {/* Co bude dál */}
            <div style={{ background: '#F6F7FC', borderRadius: 16, padding: '14px 16px' }}>
              <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>Co bude dál</div>
              {['Firma si projde tvůj profil', 'Při shodě se otevře chat s pravidly směny', 'Směna ti naskočí do kalendáře'].map((txt, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: i < 2 ? 11 : 0 }}>
                  <span style={{ width: 22, height: 22, flex: 'none', borderRadius: 999, background: i === 0 ? T.green : '#E3E7F2', color: i === 0 ? '#fff' : T.mutedSoft, fontFamily: T.fontHead, fontSize: 12, fontWeight: 800, display: 'grid', placeItems: 'center' }}>{i + 1}</span>
                  <span style={{ color: i === 0 ? T.ink : T.muted, fontFamily: T.fontUI, fontSize: 13.5, fontWeight: i === 0 ? 700 : 600 }}>{txt}</span>
                </div>
              ))}
            </div>

            {/* Příště nezobrazovat */}
            <button onClick={() => { const v = !hideInfo; setHideInfo(v); try { localStorage.setItem('makej-hide-zajem', v ? '1' : '0'); } catch (e) {} }} style={{ alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 2, WebkitTapHighlightColor: 'transparent' }}>
              <span style={{ width: 22, height: 22, flex: 'none', borderRadius: 7, border: '2px solid ' + (hideInfo ? T.primary : T.border), background: hideInfo ? T.primary : '#fff', display: 'grid', placeItems: 'center' }}>
                {hideInfo && <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 7.5l3 3 7-7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </span>
              <span style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 13.5, fontWeight: 600 }}>Příště nezobrazovat</span>
            </button>

            {/* Hledat dál */}
            <button onClick={closeMatch} style={{
              width: '100%', height: 54, borderRadius: 16, background: T.primary, border: 'none', color: '#fff',
              fontFamily: T.fontHead, fontSize: 15.5, fontWeight: 800, cursor: 'pointer',
              boxShadow: '0 12px 26px -10px rgba(0,32,246,0.6)', WebkitTapHighlightColor: 'transparent',
            }}>Hledat dál</button>
          </div>
        </div>
      )}

      {/* Detail inzerátu */}
      {detailJob && (
        <WJobDetailModal
          job={detailJob}
          fromRect={detailRect}
          onClose={() => setDetailJob(null)}
          onLike={() => doLike(false)}
          onPass={() => doPass()}
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
  // Spodní karty leží přesně pod vrchní (stejný střed, žádný posun), jsou celé,
  // jen o kousek menší → schované za vrchní a při odletu plynule dorostou na 1.
  const opacity = 1;
  const scale = isTop ? 1 : (1 - depth * 0.08);   // depth1 = 0.92, depth2 = 0.84 (výraznější „doskok" dopředu)
  const translateY = 0;

  const likeShown = isTop && x > 40;
  const passShown = isTop && x < -40;

  const tags = (Array.isArray(job.tags) ? job.tags : []).slice(0, 4);
  const heroImg = job.image_url || job.image || job.cover_url || job.photo_url || null;
  const distanceTxt = job.distance != null ? String(job.distance).replace('.', ',') + ' km' : null;
  const typeLabel = job.jobType === 'jednrazova_vypomoc' ? 'Výpomoc' : job.jobType === 'part_time' ? 'Part-time' : job.jobType === 'full_time' ? 'Full-time' : 'Brigáda';
  const payPer = /(\/\s*h|hod|kč\/h)/i.test(job.payUnit || '') ? '/h' : ((job.payUnit || '').replace(/\s*Kč\s*/i, '') || '');

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
        boxShadow: '0 18px 40px rgba(11,18,51,0.16), 0 2px 8px rgba(20,22,40,0.06)',
      }}>
        {/* ── Fotka provozu (nahoře) ── */}
        <div style={{ position: 'relative', height: 212, flex: 'none', background: '#EEF1FF' }}>
          {heroImg
            ? <img src={heroImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : (<div style={{ position: 'absolute', inset: 0, background: T.heroGrad, display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.16) 1.3px, transparent 1.3px)', backgroundSize: '19px 19px', opacity: 0.5 }} />
                <span style={{ fontFamily: T.fontHead, fontWeight: 800, fontSize: 150, color: 'rgba(255,255,255,0.12)', letterSpacing: -3, lineHeight: 1 }}>{job.logo}</span>
              </div>)}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(11,18,51,.42) 0%, rgba(11,18,51,0) 38%, rgba(11,18,51,.55) 100%)' }} />

          {/* horní odznaky: typ + vzdálenost */}
          <div style={{ position: 'absolute', top: 14, left: 14, right: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontFamily: T.fontHead, fontSize: 12, fontWeight: 800, padding: '6px 11px', borderRadius: 999, color: '#0B1233', background: '#fff' }}>{typeLabel}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {job.boosted && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: T.fontHead, fontSize: 12, fontWeight: 800, padding: '6px 11px', borderRadius: 999, color: T.super, background: '#fff' }}><Icon name="bolt-bold" size={12} color={T.super} />TOP</span>}
              {distanceTxt && <span style={{ fontFamily: T.fontHead, fontSize: 12, fontWeight: 800, padding: '6px 11px', borderRadius: 999, color: '#fff', background: 'rgba(11,18,51,.55)' }}>{distanceTxt}</span>}
            </div>
          </div>

          {/* dole: logo firmy + název + hodnocení (klik = profil firmy) */}
          <div
            onClick={(e) => { e.stopPropagation(); if (!drag.moved && window.wOpenEmployer) window.wOpenEmployer(job.employer_id, { name: job.company, color: job.accent, rating: job.rating, verified: job.verified }); }}
            title="Zobrazit profil firmy"
            style={{ position: 'absolute', left: 14, bottom: 14, right: 14, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <span style={{ width: 42, height: 42, flex: 'none', borderRadius: 14, background: '#fff', color: T.primary, fontFamily: T.fontHead, fontSize: 17, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{job.logo}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: T.fontHead, fontSize: 14, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.company}{job.verified && <Icon name="verified-check-bold" size={13} color="#8effc0" />}</span>
              {job.rating > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: T.fontUI, fontSize: 12, fontWeight: 700, color: '#fff' }}><Icon name="star-bold" size={12} color="#FFC46B" />{job.rating.toFixed(1).replace('.', ',')}{job.ratingCount ? ' · ' + job.ratingCount + ' hodnocení' : ''}</span>}
            </div>
          </div>
        </div>

        {/* ── Tělo karty ── */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 14, padding: '16px 18px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ fontFamily: T.fontHead, fontSize: 23, fontWeight: 800, color: '#0B1233', letterSpacing: -0.4, lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{job.title}</div>
            {job.location && <span style={{ fontFamily: T.fontUI, fontSize: 13, color: '#7A82A6' }}>{job.location}</span>}
          </div>

          {/* Odměna */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: '#F6F7FC', borderRadius: 16, padding: '13px 15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontFamily: T.fontHead, fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#A6ADCB' }}>Odměna</span>
              <span style={{ fontFamily: T.fontHead, fontSize: 24, fontWeight: 800, color: '#0B1233', letterSpacing: -0.4, lineHeight: 1.1 }}>{job.pay} Kč<span style={{ fontFamily: T.fontUI, fontSize: 14, fontWeight: 600, color: '#7A82A6' }}>{payPer}</span></span>
            </div>
            {job.shiftTotal > 0 && <span style={{ fontFamily: T.fontHead, fontSize: 13, fontWeight: 800, color: '#0B7B4B', background: '#E6F7EF', padding: '8px 12px', borderRadius: 10, whiteSpace: 'nowrap' }}>{job.shiftTotal.toLocaleString('cs-CZ').replace(/,/g, ' ')} Kč za směnu</span>}
          </div>

          {/* Fakta */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(job.when || job.time) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <span style={{ width: 30, height: 30, flex: 'none', borderRadius: 10, background: '#EEF1FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="calendar-minimalistic-bold" size={15} color={T.primary} /></span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: T.fontHead, fontSize: 14, fontWeight: 700, color: '#0B1233' }}>{[job.when, job.time].filter(Boolean).join(' · ')}</span>
                  {job.shiftHours ? <span style={{ fontFamily: T.fontUI, fontSize: 12, color: '#7A82A6' }}>{job.shiftHours} {_wPlural(job.shiftHours, 'hodina', 'hodiny', 'hodin')}</span> : null}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <span style={{ width: 30, height: 30, flex: 'none', borderRadius: 10, background: '#EEF1FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="users-group-rounded-bold" size={15} color={T.primary} /></span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                <span style={{ fontFamily: T.fontHead, fontSize: 14, fontWeight: 700, color: '#0B1233' }}>{job.positions > 1 ? 'Hledají ' + job.positions + ' ' + _wPlural(job.positions, 'člověka', 'lidi', 'lidí') : 'Hledají 1 člověka'}</span>
                {distanceTxt && <span style={{ fontFamily: T.fontUI, fontSize: 12, color: '#7A82A6' }}>{distanceTxt} od tebe</span>}
              </div>
            </div>
          </div>

          {/* Tagy (max 4) */}
          {tags.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {tags.map((t, i) => <span key={i} style={{ fontFamily: T.fontUI, fontSize: 12, fontWeight: 700, color: '#3A4266', background: '#F1F3FB', padding: '7px 11px', borderRadius: 999 }}>{t}</span>)}
            </div>
          )}
        </div>

        {/* Nápověda „táhni nahoru" */}
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '12px 0 14px', color: '#A6ADCB', fontFamily: T.fontUI, fontSize: 12, fontWeight: 700 }}>
          <svg width="12" height="8" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 6.5L6 1.5l5 5" fill="none" stroke="#A6ADCB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
function WJobDetailModal({ job, fromRect, onClose, onLike, onSuper, onPass, readOnly, statusLabel, onChat, onCancel }) {
  // „Expand" detailu z karty: po mountu se list roztáhne z rectu karty do celé
  // obrazovky (rohy 26→0, scale, fade), při zavření se smrskne zpět a pak odmountuje.
  const [shown, setShown] = useStateW(false);
  const [detailDone, setDetailDone] = useStateW(null);   // 'like'|'pass' → potvrzení (Odesláno/Odmítnuto) na tlačítku detailu
  const closeTimer = useRefW(null);
  useEffectW(() => {
    if (typeof window !== 'undefined' && window.wSetDetailOpen) window.wSetDetailOpen(true);   // schovej horní lištu
    let r2;
    const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setShown(true)); });
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); clearTimeout(closeTimer.current); if (typeof window !== 'undefined' && window.wSetDetailOpen) window.wSetDetailOpen(false); };
  }, []);
  const animClose = () => {
    setShown(false);
    if (typeof window !== 'undefined' && window.wSetDetailOpen) window.wSetDetailOpen(false);   // vrať horní lištu
    closeTimer.current = setTimeout(onClose, 360);
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

  const heroImg = job.image_url || job.image || job.cover_url || job.photo_url || null;
  const _reqAll = Array.isArray(job.requirements) ? job.requirements : [];
  const contract = (_reqAll.find(r => /^smluvní vztah/i.test(r)) || '').replace(/^smluvní vztah:\s*/i, '') || (JOB_TYPE_LABEL[job.jobType] || 'Brigáda');
  const reqChips = _reqAll.filter(r => !/^smluvní vztah/i.test(r) && !/^hledáme/i.test(r));
  const payoutTag = (Array.isArray(job.tags) ? job.tags : []).find(t => /výplat/i.test(t)) || '';
  const kmTxt = job.distance != null ? String(job.distance).replace('.', ',') + ' km od tebe' : '';
  const ctaTotal = job.shiftTotal > 0 ? job.shiftTotal.toLocaleString('cs-CZ').replace(/,/g, ' ') + ' Kč' : '';

  return (
    <div onClick={animClose} style={{
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
        transform: shown ? 'none' : startTransform,
        transformOrigin: 'center center',
        opacity: shown ? 1 : (fromRect ? 1 : 0),
        transition: `transform .42s ${EXP_CURVE}, border-radius .42s ${EXP_CURVE}, opacity .30s ease`,
        willChange: 'transform',
      }}>
        {/* Scroll: fotka hero + obsah inzerátu */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>

          {/* Fotka provozu */}
          <div style={{ position: 'relative', height: 240, flex: 'none', background: heroImg ? '#EEF1FF' : undefined, overflow: 'hidden' }}>
            {heroImg
              ? <img src={heroImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              : (<div style={{ position: 'absolute', inset: 0, background: T.heroGrad, display: 'grid', placeItems: 'center' }}>
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.16) 1.3px, transparent 1.3px)', backgroundSize: '19px 19px', opacity: 0.5 }} />
                  <span style={{ fontFamily: T.fontHead, fontWeight: 800, fontSize: 150, color: 'rgba(255,255,255,0.12)', letterSpacing: -3 }}>{job.logo}</span>
                </div>)}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(11,18,51,.4) 0%, rgba(11,18,51,0) 45%)' }} />
            <div style={{ position: 'absolute', top: 14, left: 16, right: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <button onClick={animClose} aria-label="Zpět na kartu" title="Zpět na kartu" style={{ width: 40, height: 40, borderRadius: '50%', border: 0, background: 'rgba(255,255,255,.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
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
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: T.fontHead, fontSize: 11, fontWeight: 800, padding: '5px 10px', borderRadius: 999, color: '#0B7B4B', background: '#E6F7EF' }}>Nábor běží</span>
                {job.positions > 1 && <span style={{ fontFamily: T.fontHead, fontSize: 11, fontWeight: 800, padding: '5px 10px', borderRadius: 999, color: '#B96F06', background: '#FFF3E0' }}>{job.positions} volných míst</span>}
              </div>
              <h1 style={{ margin: 0, fontFamily: T.fontHead, fontSize: 26, fontWeight: 800, color: '#0B1233', letterSpacing: -0.6, lineHeight: 1.15 }}>{job.title}</h1>
              <div onClick={() => window.wOpenEmployer && window.wOpenEmployer(job.employer_id, { name: job.company, color: job.accent, rating: job.rating, verified: job.verified })} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', minWidth: 0 }}>
                <span style={{ width: 36, height: 36, flex: 'none', borderRadius: 12, background: T.primary, color: '#fff', fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{job.logo}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: T.fontHead, fontSize: 14, fontWeight: 800, color: '#0B1233' }}>{job.company}{job.verified && <Icon name="verified-check-bold" size={13} color={T.green} />}<Icon name="alt-arrow-right-bold" size={12} color="#A6ADCB" /></span>
                  <span style={{ fontFamily: T.fontUI, fontSize: 12, color: '#7A82A6' }}>{job.rating > 0 ? (job.rating.toFixed(1).replace('.', ',') + (job.ratingCount ? ' · ' + job.ratingCount + ' hodnocení' : ' hodnocení')) : 'Nová firma na Makej'}</span>
                </div>
              </div>
            </div>

            {/* Čtyři klíčové údaje */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                ['Odměna', job.pay + ' ' + job.payUnit, job.shiftTotal > 0 ? (job.shiftTotal.toLocaleString('cs-CZ').replace(/,/g, ' ') + ' Kč za směnu') : ''],
                ['Kdy', job.when || job.date || '—', [job.time, job.shiftHours ? job.shiftHours + ' h' : ''].filter(Boolean).join(' · ')],
                ['Kde', job.location || '—', kmTxt],
                ['Smlouva', contract, payoutTag],
              ].map((f, i) => (
                <div key={i} style={{ background: '#F6F7FC', borderRadius: 14, padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                  <span style={{ fontFamily: T.fontHead, fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: '#A6ADCB' }}>{f[0]}</span>
                  <span style={{ fontFamily: T.fontHead, fontSize: 18, fontWeight: 800, color: '#0B1233', letterSpacing: -0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f[1]}</span>
                  {f[2] ? <span style={{ fontFamily: T.fontUI, fontSize: 11, color: '#7A82A6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f[2]}</span> : null}
                </div>
              ))}
            </div>

            {job.desc && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                <span style={{ fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, color: '#0B1233' }}>Co budeš dělat</span>
                <p style={{ margin: 0, fontFamily: T.fontUI, fontSize: 14, color: '#3A4266', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{job.desc}</p>
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

            {job.location && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                <span style={{ fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, color: '#0B1233' }}>Kde to je</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: '#F6F7FC', borderRadius: 14, padding: '13px 14px' }}>
                  <span style={{ fontFamily: T.fontUI, fontSize: 13, color: '#7A82A6' }}>Přesnou adresu dostaneš v chatu</span>
                  <button onClick={() => window.open('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(job.location), '_blank')} style={{ fontFamily: T.fontHead, fontSize: 13, fontWeight: 800, color: T.primary, background: 'none', border: 0, padding: 0, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3, whiteSpace: 'nowrap' }}>Zobrazit v mapách</button>
                </div>
              </div>
            )}

            {job.rating > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, color: '#0B1233' }}>O firmě</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontFamily: T.fontHead, fontSize: 30, fontWeight: 800, color: '#0B1233', letterSpacing: -0.9, lineHeight: 1 }}>{job.rating.toFixed(1).replace('.', ',')}</span>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <span style={{ width: '100%', height: 6, borderRadius: 999, background: '#EEF1FF', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', borderRadius: 999, background: T.primary, width: Math.round(job.rating / 5 * 100) + '%' }} /></span>
                    <span style={{ fontFamily: T.fontUI, fontSize: 12, color: '#7A82A6' }}>{job.ratingCount ? job.ratingCount + ' hodnocení od brigádníků' : 'Hodnocení od brigádníků'}</span>
                  </div>
                </div>
                <button onClick={() => window.wOpenEmployer && window.wOpenEmployer(job.employer_id, { name: job.company, color: job.accent, rating: job.rating, verified: job.verified })} style={{ alignSelf: 'flex-start', fontFamily: T.fontHead, fontSize: 13, fontWeight: 800, color: T.primary, background: 'none', border: 0, padding: 0, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>Zobrazit profil firmy</button>
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
        <div style={{ flexShrink: 0, borderTop: '1px solid #E6E9F5', background: '#fff', padding: '12px 16px calc(16px + env(safe-area-inset-bottom))', display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Stejná tlačítka i chování jako na kartě (ConfirmButton 3c). Po stisku se
              potvrdí (Odmítnuto/Odesláno), detail se smrskne zpět a karta odletí — popisek
              plynule „přejde" na tlačítko karty (actionAnim drží 700 ms). */}
          <button onClick={() => { if (detailDone) return; setDetailDone('pass'); animClose(); setTimeout(onPass, 380); }} title="Nemám zájem" style={{
            flex: 1, height: 56, borderRadius: 16, boxSizing: 'border-box',
            border: 'none', outline: 'none', cursor: 'pointer',
            fontFamily: T.fontHead, fontSize: 15.5, fontWeight: 800,
            WebkitTapHighlightColor: 'transparent',
            background: detailDone === 'pass' ? '#D63A24' : '#fff',
            color: detailDone === 'pass' ? '#fff' : '#D63A24',
            boxShadow: detailDone === 'pass' ? 'inset 0 0 0 2px #D63A24' : 'inset 0 0 0 2px #E2543F',
            transition: `background ${detailDone === 'pass' ? 160 : 240}ms ease-out, color ${detailDone === 'pass' ? 160 : 240}ms ease-out, box-shadow ${detailDone === 'pass' ? 160 : 240}ms ease-out`,
          }}>{detailDone === 'pass' ? 'Odmítnuto' : 'Nemám zájem'}</button>

          <button onClick={() => { if (detailDone) return; setDetailDone('like'); animClose(); setTimeout(onLike, 380); }} title="Mám zájem" style={{
            flex: 1, height: 56, borderRadius: 16, boxSizing: 'border-box',
            border: 'none', outline: 'none', cursor: 'pointer', color: '#fff',
            fontFamily: T.fontHead, fontSize: 15.5, fontWeight: 800,
            WebkitTapHighlightColor: 'transparent',
            background: detailDone === 'like' ? '#0F6B32' : '#16803D',
            boxShadow: detailDone === 'like' ? '0 2px 8px rgba(22,128,61,.3)' : '0 6px 16px rgba(22,128,61,.28)',
            transition: `background ${detailDone === 'like' ? 160 : 240}ms ease-out, box-shadow ${detailDone === 'like' ? 160 : 240}ms ease-out`,
          }}>{detailDone === 'like' ? 'Odesláno' : 'Mám zájem'}</button>
        </div>
        )}
      </div>
    </div>
  );
}
