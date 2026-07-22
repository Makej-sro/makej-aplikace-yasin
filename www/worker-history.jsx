// Makej Worker — Moje brigády (historie + hodnocení po brigádě)

// `embedded` = vykresluje se uvnitř kalendáře → bez vlastního nadpisu,
// scrollování a odsazení, ty už řeší obalující obrazovka.
function WHistory({ tick, onReviewed, embedded }) {
  const [items,  setItems]  = useStateW(() => [...W_HISTORY]);
  const [review, setReview] = useStateW(null); // položka, kterou právě hodnotím
  const [detail, setDetail] = useStateW(null); // brigáda, jejíž detail zobrazuju
  const [cancelTarget, setCancelTarget] = useStateW(null); // směna ke zrušení
  const [cancelling, setCancelling] = useStateW(false);

  useEffectW(() => { setItems([...W_HISTORY]); }, [tick]);

  const needsReview = items.filter(i => i.needsReview);
  const upcoming    = items.filter(i => (i.phase === 'upcoming' || i.phase === 'discuss') && !i.needsReview);
  const completed   = items.filter(i => i.phase === 'completed' && !i.needsReview);

  if (items.length === 0) {
    // Pod kalendářem — bez emoji a bez prázdné plochy, viz stejný stav ve Zprávách
    return (
      <div style={{ background: '#fff', borderRadius: 22, padding: '20px', boxShadow: '0 4px 20px rgba(0,32,246,0.06)' }}>
        <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 16, fontWeight: 800, marginBottom: 4 }}>
          Zatím tu nemáš žádnou brigádu
        </div>
        <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 13.5, lineHeight: 1.55 }}>
          Až tě firma přijme, objeví se brigáda v kalendáři i tady — s termínem, časem a místem.
        </div>
      </div>
    );
  }

  const PHASE = {
    discuss:   { label: 'Domlouvá se', color: T.super, bg: 'rgba(245,178,60,0.14)', icon: 'chat-round-bold' },
    upcoming:  { label: 'Potvrzeno',   color: T.green, bg: T.greenSoft, icon: 'check-circle-bold' },
    completed: { label: 'Hotovo',      color: T.green, bg: T.greenSoft, icon: null },
  };

  const Card = ({ it }) => {
    const ph = PHASE[it.phase] || PHASE.completed;
    return (
      <button onClick={() => setDetail(it)} style={{
        width: '100%', textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer',
        padding: '14px 16px', borderRadius: 18,
        background: '#fff', border: '1px solid ' + T.border,
        boxShadow: '0 6px 16px rgba(20,22,40,0.06)',
        display: 'flex', alignItems: 'center', gap: 13,
      }}>
        <div style={{ width: 48, height: 48, borderRadius: 15, background: T.tint, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon name="case-round-bold" size={22} color={T.primary} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 16, fontWeight: 800, lineHeight: 1.2, marginBottom: 6 }}>{it.jobTitle}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: T.muted, fontFamily: T.fontUI, fontSize: 13, flexWrap: 'wrap' }}>
            {it.dateText && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="calendar-minimalistic-bold" size={13} color={T.muted} />{it.dateText}</span>}
            {it.timeText && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="clock-circle-bold" size={13} color={T.muted} />{it.timeText}</span>}
          </div>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 999, background: ph.bg, flexShrink: 0 }}>
          {ph.icon && <Icon name={ph.icon} size={13} color={ph.color} />}
          <span style={{ color: ph.color, fontFamily: T.fontUI, fontSize: 12.5, fontWeight: 700 }}>{ph.label}</span>
        </div>
      </button>
    );
  };

  const Section = ({ title, children, count }) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
        {title}{count != null ? ` · ${count}` : ''}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
    </div>
  );

  return (
    <div style={embedded ? {} : { flex: 1, overflowY: 'auto', padding: '0 0 24px' }}>
      <div style={embedded ? {} : { maxWidth: 720, margin: '0 auto', width: '100%' }}>
      {!embedded && (
        <div style={{ padding: '20px 20px 18px' }}>
          <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 28, fontWeight: 800, letterSpacing: -0.8 }}>Moje brigády</div>
        </div>
      )}

      <div style={embedded ? {} : { padding: '0 20px' }}>
        {/* Výzvy k hodnocení */}
        {needsReview.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ color: T.super, fontFamily: T.fontUI, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="star-bold" size={14} color={T.super} /> Ohodnoť své brigády
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {needsReview.map(it => (
                <div key={it.id} style={{
                  position: 'relative', padding: 22, borderRadius: 24, overflow: 'hidden',
                  background: T.heroGrad,
                  boxShadow: '0 22px 44px -22px rgba(0,32,246,0.55)',
                }}>
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.14) 1.2px, transparent 1.2px)', backgroundSize: '18px 18px', opacity: 0.5, pointerEvents: 'none' }} />
                  <div style={{ position: 'relative' }}>
                    <button onClick={() => setDetail(it)} style={{
                      width: '100%', textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer',
                      background: 'none', border: 'none', padding: 0,
                      display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12,
                    }}>
                      <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.16)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.3)', display: 'grid', placeItems: 'center', color: '#fff', fontFamily: T.fontHead, fontWeight: 700, fontSize: 15, flexShrink: 0 }}>{it.avatar}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#fff', fontFamily: T.fontHead, fontSize: 16, fontWeight: 800, lineHeight: 1.2 }}>{it.jobTitle}</div>
                        <div style={{ color: '#A3AEFF', fontFamily: T.fontUI, fontSize: 12, marginTop: 2 }}>{it.company} · {it.dateText}</div>
                      </div>
                    </button>
                    <div style={{ color: '#A3AEFF', fontFamily: T.fontUI, fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
                      Jaká byla brigáda? Tvoje hodnocení pomůže ostatním brigádníkům.
                    </div>
                    <button onClick={() => setReview(it)} style={{
                      width: '100%', height: 48, borderRadius: 14,
                      background: '#fff', border: 'none',
                      color: T.primary, fontFamily: T.fontHead, fontSize: 14, fontWeight: 800, cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: '0 14px 26px -14px rgba(0,0,0,0.35)',
                    }}>
                      <Icon name="star-bold" size={16} color={T.primary} /> Napsat hodnocení
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {upcoming.length  > 0 && <Section title="Nadcházející" count={upcoming.length}>{upcoming.map(it => <Card key={it.id} it={it} />)}</Section>}
        {completed.length > 0 && <Section title="Odpracované" count={completed.length}>{completed.map(it => <Card key={it.id} it={it} />)}</Section>}
      </div>
      </div>

      {detail && detail.card && (
        <WJobDetailModal
          job={detail.card}
          readOnly
          statusLabel={detail.phase === 'completed' ? 'Odpracováno' : detail.phase === 'discuss' ? 'Domlouváte se — směnu potvrdíš v chatu' : 'Potvrzená směna'}
          onChat={() => { const m = detail.match_id; setDetail(null); window.wOpenChat && window.wOpenChat(m); }}
          onCancel={detail.phase === 'upcoming' ? () => { const it = detail; setDetail(null); setCancelTarget(it); } : undefined}
          onClose={() => setDetail(null)}
        />
      )}

      {cancelTarget && (
        <div onClick={() => !cancelling && setCancelTarget(null)} style={{
          position: 'fixed', inset: 0, zIndex: 150,
          background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)',
          display: 'grid', placeItems: 'center', padding: 20,
          animation: 'wPop .28s cubic-bezier(.2,.8,.2,1)',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 380, background: T.card,
            borderRadius: 24, border: '1px solid ' + T.border, padding: 26, textAlign: 'center',
            boxShadow: '0 24px 60px rgba(20,22,40,0.28)',
          }}>
            <div style={{ width: 60, height: 60, borderRadius: 17, background: 'rgba(244,63,94,0.12)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
              <Icon name="close-circle-bold" size={28} color="#f43f5e" />
            </div>
            <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 21, fontWeight: 800, letterSpacing: -0.4 }}>Zrušit směnu?</div>
            <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>
              {cancelTarget.jobTitle} u <b style={{ color: T.ink }}>{cancelTarget.company}</b>. Zaměstnavateli se směna zruší a tuhle akci nevrátíš.
            </div>
            <div style={{ marginTop: 12, padding: '11px 13px', borderRadius: 12, background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', color: '#f43f5e', fontFamily: T.fontUI, fontSize: 12.5, fontWeight: 600, lineHeight: 1.45, display: 'flex', alignItems: 'flex-start', gap: 8, textAlign: 'left' }}>
              <Icon name="star-bold" size={15} color="#f43f5e" />
              <span>Za zrušení potvrzené směny dostaneš od zaměstnavatele hodnocení <b>1★</b>, které ti stáhne průměr.</span>
            </div>
            <button onClick={async () => {
              if (cancelling) return;
              setCancelling(true);
              await cancelShiftW(cancelTarget.match_id);
              setCancelling(false);
              setCancelTarget(null);
              onReviewed?.();
            }} disabled={cancelling} style={{
              width: '100%', marginTop: 20, padding: '14px', borderRadius: 14,
              background: '#f43f5e', border: 'none', color: '#fff',
              fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, cursor: cancelling ? 'default' : 'pointer', opacity: cancelling ? 0.6 : 1,
            }}>{cancelling ? 'Ruším…' : 'Ano, zrušit směnu'}</button>
            <button onClick={() => !cancelling && setCancelTarget(null)} style={{
              width: '100%', marginTop: 10, padding: '13px', borderRadius: 14,
              background: T.surfaceAlt, border: '1px solid ' + T.border, color: T.muted,
              fontFamily: T.fontHead, fontSize: 14.5, fontWeight: 800, cursor: 'pointer',
            }}>Zpět</button>
          </div>
        </div>
      )}

      {review && (
        <WReviewModal
          item={review}
          onClose={() => setReview(null)}
          onDone={() => { setReview(null); onReviewed?.(); }}
        />
      )}
    </div>
  );
}

// ── Modal hodnocení (brigádník → zaměstnavatel) ────────────────
function WReviewModal({ item, onClose, onDone }) {
  const [rating, setRating] = useStateW(0);
  const [hover,  setHover]  = useStateW(0);
  const [text,   setText]   = useStateW('');
  const [saving, setSaving] = useStateW(false);
  const [err,    setErr]    = useStateW('');

  const LABELS = ['', 'Špatné', 'Slabší', 'Dobré', 'Skvělé', 'Perfektní'];
  const shown = hover || rating;

  async function submit() {
    if (rating < 1) { setErr('Vyber počet hvězdiček.'); return; }
    if (!item.employerId) { setErr('Chybí zaměstnavatel.'); return; }
    setSaving(true); setErr('');
    const ok = await submitReviewW(item.match_id, item.employerId, rating, text);
    setSaving(false);
    if (!ok) { setErr('Hodnocení se nepodařilo uložit.'); return; }
    onDone?.();
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 130,
      background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)',
      display: 'grid', placeItems: 'center', padding: 20,
      animation: 'wPop .28s cubic-bezier(.2,.8,.2,1)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 380,
        background: T.card, borderRadius: 22, border: '1px solid ' + T.border,
        padding: 24, textAlign: 'center',
      }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: item.color, display: 'grid', placeItems: 'center', color: '#fff', fontFamily: T.fontHead, fontWeight: 800, fontSize: 18, margin: '0 auto 12px' }}>{item.avatar}</div>
        <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 18, fontWeight: 800 }}>Ohodnoť brigádu</div>
        <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 13, marginTop: 4 }}>{item.jobTitle} · {item.company}</div>

        {/* Hvězdy */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, margin: '20px 0 6px' }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n}
              onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
              onClick={() => { setRating(n); setErr(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 0 }}>
              <Icon name="star-bold" size={36} color={n <= shown ? T.super : 'rgba(18,18,26,0.14)'} />
            </button>
          ))}
        </div>
        <div style={{ color: shown ? T.super : T.mutedSoft, fontFamily: T.fontUI, fontSize: 13, fontWeight: 700, height: 18 }}>{LABELS[shown] || 'Vyber hodnocení'}</div>

        <textarea
          value={text} onChange={e => setText(e.target.value)}
          placeholder="Napiš pár slov o zkušenosti… (nepovinné)"
          rows={3}
          style={{
            width: '100%', marginTop: 16, padding: '11px 13px', borderRadius: 12,
            background: 'rgba(18,18,26,0.05)', border: '1px solid ' + T.border,
            color: T.ink, fontFamily: T.fontUI, fontSize: 13, outline: 'none', resize: 'vertical', lineHeight: 1.5,
          }}
        />

        {err && <div style={{ color: '#f43f5e', fontFamily: T.fontUI, fontSize: 12, marginTop: 10 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{
            flex: '0 0 auto', padding: '12px 18px', borderRadius: 12,
            background: 'rgba(18,18,26,0.05)', border: '1px solid ' + T.border,
            color: T.light, fontFamily: T.fontUI, fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>Zavřít</button>
          <button onClick={submit} disabled={saving} style={{
            flex: 1, padding: '12px', borderRadius: 12,
            background: T.ink, border: 'none',
            color: '#fff', fontFamily: T.fontHead, fontSize: 15, fontWeight: 800,
            cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1,
          }}>{saving ? 'Ukládám…' : 'Odeslat hodnocení'}</button>
        </div>
      </div>
    </div>
  );
}
