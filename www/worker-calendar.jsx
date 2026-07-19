// Makej Worker — Kalendář brigád (měsíční přehled z W_HISTORY)

function _wCalPad(n) { return String(n).padStart(2, '0'); }
function _wCalISO(y, m, d) { return y + '-' + _wCalPad(m + 1) + '-' + _wCalPad(d); }

function WCalendar({ tick, onReviewed }) {
  const today = new Date();
  const [ym, setYm]   = useStateW(() => ({ y: today.getFullYear(), m: today.getMonth() }));
  const [sel, setSel] = useStateW(null);   // vybraný den (null = celý měsíc)
  const [pickerOpen, setPickerOpen] = useStateW(false);

  const PHASE = {
    upcoming:  { label: 'Potvrzeno',   color: '#0020F6', bg: 'rgba(0,32,246,0.1)' },
    discuss:   { label: 'Domlouváme',  color: '#F5A623', bg: 'rgba(245,166,35,0.16)' },
    completed: { label: 'Hotovo',      color: '#16a34a', bg: 'rgba(22,163,74,0.12)' },
  };

  // Brigády seskupené podle data
  const byDate = {};
  (Array.isArray(W_HISTORY) ? W_HISTORY : []).forEach(h => {
    if (!h.eventDate) return;
    (byDate[h.eventDate] = byDate[h.eventDate] || []).push(h);
  });

  const MONTHS = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'];
  const WD = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

  const firstDow = (new Date(ym.y, ym.m, 1).getDay() + 6) % 7;  // Po = 0
  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const todayISO = _wCalISO(today.getFullYear(), today.getMonth(), today.getDate());

  function prevMonth() { setYm(s => s.m === 0 ? { y: s.y - 1, m: 11 } : { y: s.y, m: s.m - 1 }); }
  function nextMonth() { setYm(s => s.m === 11 ? { y: s.y + 1, m: 0 } : { y: s.y, m: s.m + 1 }); }

  // Přetažení mřížky do stran = předchozí / další měsíc (místo šipek).
  const tah = useRefW(null);
  function tahStart(e) {
    const t = e.touches && e.touches[0];
    tah.current = t ? { x: t.clientX, y: t.clientY } : null;
  }
  function tahEnd(e) {
    const z = tah.current;
    const t = e.changedTouches && e.changedTouches[0];
    tah.current = null;
    if (!z || !t) return;
    const dx = t.clientX - z.x;
    const dy = t.clientY - z.y;
    // Vodorovné a dost dlouhé — jinak to byl svislý scroll nebo klepnutí na den
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
    setSel(null);
    if (dx < 0) nextMonth(); else prevMonth();
  }

  // Roky k výběru: pokryj všechny brigády v datech + okolí dneška.
  // Záměrně NEzávisí na zobrazeném roce — jinak by se seznam při posouvání
  // revolveru rozšiřoval a položky by pod prstem uskakovaly.
  const roky = (() => {
    const r = [today.getFullYear()];
    (Array.isArray(W_HISTORY) ? W_HISTORY : []).forEach(h => {
      if (h.eventDate) r.push(Number(h.eventDate.slice(0, 4)));
    });
    const min = Math.min(...r) - 3;
    const max = Math.max(...r) + 3;
    const out = [];
    for (let y = min; y <= max; y++) out.push(y);
    return out;
  })();

  // Seznam brigád: vybraný den, nebo celý zobrazený měsíc
  const monthEvents = (Array.isArray(W_HISTORY) ? W_HISTORY : [])
    .filter(h => {
      if (!h.eventDate) return false;
      const d = new Date(h.eventDate + 'T00:00:00');
      return d.getFullYear() === ym.y && d.getMonth() === ym.m;
    })
    .sort((a, b) => (a.eventDate < b.eventDate ? -1 : 1));
  const listEvents = sel ? (byDate[sel] || []) : monthEvents;
  const selDate = sel ? new Date(sel + 'T00:00:00') : null;
  const listLabel = selDate ? `${WD[(selDate.getDay() + 6) % 7]} ${selDate.getDate()}. ${selDate.getMonth() + 1}.` : MONTHS[ym.m];

  const cardShadow = '0 6px 16px rgba(20,22,40,0.06)';

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', width: '100%', padding: '28px 24px 40px' }}>

        <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 32, fontWeight: 800, letterSpacing: -0.8, marginBottom: 20 }}>Kalendář</div>

        {/* Kalendářní karta */}
        <div style={{ background: '#fff', border: '1px solid ' + T.border, borderRadius: 22, boxShadow: cardShadow, padding: '20px 22px' }}>
          {/* Hlavička měsíce */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, position: 'relative' }}>
            <button
              onClick={() => setPickerOpen(o => !o)}
              style={{
                position: 'relative', zIndex: 62,
                display: 'inline-flex', alignItems: 'center', padding: '4px 8px 4px 0',
                background: 'none', border: 'none', cursor: 'pointer',
                color: pickerOpen ? T.primary : T.ink, transition: 'color .18s',
                fontFamily: T.fontHead, fontSize: 19, fontWeight: 800,
              }}>
              {MONTHS[ym.m]} {ym.y}
            </button>
            {pickerOpen && (<>
              {/* Klik mimo panel ho zavře */}
              <div onClick={() => setPickerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 61, marginTop: 10,
                padding: '10px 0 12px',
                background: '#fff', border: '1px solid ' + T.border, borderRadius: 18,
                boxShadow: '0 18px 40px -14px rgba(20,22,40,0.28)',
                animation: 'wPop .18s cubic-bezier(.2,.8,.2,1)',
                overflow: 'hidden',
              }}>
                <WWheel
                  items={MONTHS}
                  index={ym.m}
                  itemW={112}
                  onIndex={i => { setYm(s => ({ ...s, m: i })); setSel(null); }}
                />
                <div style={{ height: 1, background: T.border, margin: '8px 14px' }} />
                <WWheel
                  items={roky}
                  index={Math.max(0, roky.indexOf(ym.y))}
                  itemW={86}
                  onIndex={i => { setYm(s => ({ ...s, y: roky[i] })); setSel(null); }}
                />
              </div>
            </>)}
          </div>

          {/* Potažením do stran se přepíná měsíc */}
          <div onTouchStart={tahStart} onTouchEnd={tahEnd}>
          {/* Dny v týdnu */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
            {WD.map(w => (
              <div key={w} style={{ textAlign: 'center', color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, padding: '4px 0' }}>{w}</div>
            ))}
          </div>

          {/* Mřížka dnů */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />;
              const iso = _wCalISO(ym.y, ym.m, d);
              const evs = byDate[iso] || [];
              const isToday = iso === todayISO;
              const isSel = iso === sel;
              return (
                <button key={i} onClick={() => setSel(iso)} style={{
                  aspectRatio: '1 / 1', border: 'none', cursor: 'pointer', borderRadius: 12,
                  background: isSel ? T.primary : (isToday ? 'rgba(0,32,246,0.08)' : 'transparent'),
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                  position: 'relative', transition: 'background .15s',
                }}>
                  <span style={{
                    fontFamily: T.fontHead, fontSize: 14.5, fontWeight: isToday || isSel ? 800 : 600,
                    color: isSel ? '#fff' : (isToday ? T.primary : T.ink),
                  }}>{d}</span>
                  {evs.length > 0 && (
                    <div style={{ display: 'flex', gap: 3, position: 'absolute', bottom: 7 }}>
                      {evs.slice(0, 3).map((e, k) => (
                        <span key={k} style={{ width: 5, height: 5, borderRadius: 999, background: isSel ? '#fff' : (PHASE[e.phase] || PHASE.upcoming).color }} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          </div>
        </div>

        {/* Vybraný den → jen ten den. Bez výběru → plný seznam brigád pod kalendářem. */}
        {sel ? (
          <div style={{ marginTop: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
              <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
                {listLabel}{listEvents.length > 0 ? ` · ${listEvents.length} ${_wPlural(listEvents.length, 'brigáda', 'brigády', 'brigád')}` : ''}
              </div>
              <button onClick={() => setSel(null)} style={{ background: 'none', border: 'none', color: T.primary, fontFamily: T.fontHead, fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>Zpět na vše</button>
            </div>

            {listEvents.length === 0 ? (
              <div style={{ padding: '20px', borderRadius: 16, background: '#fff', border: '1px solid ' + T.border, boxShadow: cardShadow, color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 13.5, textAlign: 'center' }}>
                V tento den nemáš žádnou brigádu.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {listEvents.map(e => {
                  const ph = PHASE[e.phase] || PHASE.upcoming;
                  const d = new Date(e.eventDate + 'T00:00:00');
                  return (
                    <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 18, background: '#fff', border: '1px solid ' + T.border, boxShadow: cardShadow }}>
                      <div style={{ width: 46, height: 46, borderRadius: 13, background: T.surfaceAlt, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        <div style={{ textAlign: 'center', lineHeight: 1 }}>
                          <div style={{ color: T.ink, fontFamily: T.fontHead, fontWeight: 800, fontSize: 16 }}>{d.getDate()}.</div>
                          <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 9.5, fontWeight: 700 }}>{WD[(d.getDay() + 6) % 7]}</div>
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 15.5, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.jobTitle}</div>
                        <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 13, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {[e.company, e.timeText, e.location].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      <span style={{ flexShrink: 0, padding: '5px 11px', borderRadius: 999, background: ph.bg, color: ph.color, fontFamily: T.fontUI, fontSize: 12, fontWeight: 800 }}>{ph.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div style={{ marginTop: 22 }}>
            <WHistory tick={tick} onReviewed={onReviewed} embedded />
          </div>
        )}

      </div>
    </div>
  );
}

// Vodorovný „revolver“ — položky se posouvají do středu, prostřední je vybraná.
function WWheel({ items, index, itemW, onIndex }) {
  const boxRef = useRefW(null);
  const timRef = useRefW(null);

  // Po otevření naskoč rovnou na aktuální položku (bez animace)
  useEffectW(() => {
    const el = boxRef.current;
    if (el) el.scrollLeft = index * itemW;
    return () => clearTimeout(timRef.current);
  }, []);

  // Po dojetí scrollu vezmi položku, která zůstala uprostřed
  function onScroll() {
    clearTimeout(timRef.current);
    timRef.current = setTimeout(() => {
      const el = boxRef.current;
      if (!el) return;
      const i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollLeft / itemW)));
      if (i !== index) onIndex(i);
    }, 90);
  }

  function klepni(i) {
    const el = boxRef.current;
    if (el) el.scrollTo({ left: i * itemW, behavior: 'smooth' });
    if (i !== index) onIndex(i);
  }

  const okraj = 'calc(50% - ' + (itemW / 2) + 'px)';

  return (
    <div style={{ position: 'relative' }}>
      {/* Zvýrazněný střed — sem se položka „zaklapne“ */}
      <div style={{
        position: 'absolute', left: '50%', top: 4, bottom: 4, width: itemW - 10,
        transform: 'translateX(-50%)', borderRadius: 12,
        background: 'rgba(0,32,246,0.08)', pointerEvents: 'none',
      }} />
      {/* Změkčení okrajů, ať je vidět, že se dá posouvat dál */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 34, pointerEvents: 'none', zIndex: 2, background: 'linear-gradient(to right, #fff, rgba(255,255,255,0))' }} />
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 34, pointerEvents: 'none', zIndex: 2, background: 'linear-gradient(to left, #fff, rgba(255,255,255,0))' }} />

      <div ref={boxRef} onScroll={onScroll} className="w-wheel" style={{
        display: 'flex', overflowX: 'auto', overflowY: 'hidden',
        scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch',
      }}>
        <div style={{ flex: '0 0 ' + okraj }} />
        {items.map((it, i) => {
          const aktivni = i === index;
          return (
            <button key={i} onClick={() => klepni(i)} style={{
              flex: '0 0 ' + itemW + 'px', scrollSnapAlign: 'center',
              background: 'none', border: 'none', cursor: 'pointer', padding: '11px 0',
              fontFamily: T.fontHead, fontSize: aktivni ? 16 : 14.5,
              fontWeight: aktivni ? 800 : 600,
              color: aktivni ? T.primary : T.mutedSoft,
              transition: 'color .15s, font-size .15s',
            }}>{it}</button>
          );
        })}
        <div style={{ flex: '0 0 ' + okraj }} />
      </div>
    </div>
  );
}
