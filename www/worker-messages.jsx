// Makej Worker — Messages (chat)

function WMessages({ tick, chatTarget, onChatOpened }) {
  const [threads,  setThreads]  = useStateW(() => [...W_THREADS]);
  // Na mobilu začínáme seznamem — vlákno se otevře až po kliknutí (nebo přes chatTarget)
  const [active,   setActive]   = useStateW(null);

  // Otevři konkrétní vlákno na požádání (z detailu brigády)
  useEffectW(() => {
    if (chatTarget) {
      setActive(chatTarget);
      setThreads(prev => prev.map(x => x.id === chatTarget ? { ...x, unread: 0 } : x));
      onChatOpened && onChatOpened();
    }
  }, [chatTarget]);
  const [msgInput, setMsgInput] = useStateW('');
  const [sending,  setSending]  = useStateW(false);
  const [q,        setQ]        = useStateW('');
  const [confirmShift, setConfirmShift] = useStateW(null); // { shift }
  const scrollRef = useRefW(null);
  const userId    = useRefW(null);
  const activeRef = useRefW(active);

  useEffectW(() => { activeRef.current = active; }, [active]);

  // Sync threads when tick changes (new data loaded)
  useEffectW(() => {
    setThreads([...W_THREADS]);
  }, [tick]);

  useEffectW(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      userId.current = session?.user?.id || null;
    });
  }, []);

  // Auto-scroll
  useEffectW(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [active, threads]);

  // Global subscription — sidebar preview updates
  useEffectW(() => {
    const chan = sb.channel('w-msgs-global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new;
        const preview = msg.type === 'shift_offer' ? '📅 Nabídka směny' : msg.type === 'interview_offer' ? '🗓️ Pozvánka na pohovor' : msg.text;
        setThreads(prev => prev.map(t => {
          if (t.id !== msg.match_id) return t;
          const isMine = msg.sender_id === userId.current;
          if (t.id === activeRef.current) return { ...t, last: preview };
          return { ...t, last: preview, unread: isMine ? t.unread : (t.unread || 0) + 1 };
        }));
      })
      .subscribe();
    return () => { try { sb.removeChannel(chan); } catch (e) {} };
  }, []);

  // Per-thread subscription for active thread
  useEffectW(() => {
    if (!active) return;
    const chan = sb.channel('w-thread-' + active)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: 'match_id=eq.' + active,
      }, (payload) => {
        const msg = payload.new;
        setThreads(prev => prev.map(t => {
          if (t.id !== active) return t;
          if (t.msgs.some(m => m.id === msg.id)) return t;
          const from = msg.sender_id === userId.current ? 'me' : 'them';
          const isShift = msg.type === 'shift_offer' && msg.metadata;
          const isInterview = msg.type === 'interview_offer' && msg.metadata;
          const newMsg = isShift
            ? { from, kind: 'shift', shift: msg.metadata, t: _wFmtTime(msg.created_at), id: msg.id }
            : isInterview
            ? { from, kind: 'interview', interview: msg.metadata, t: _wFmtTime(msg.created_at), id: msg.id }
            : { from, text: msg.text, t: _wFmtTime(msg.created_at), id: msg.id };
          return {
            ...t,
            last: isShift ? '📅 Nabídka směny' : isInterview ? '🗓️ Pozvánka na pohovor' : msg.text,
            msgs: [...t.msgs, newMsg],
          };
        }));
      })
      .subscribe();
    return () => { try { sb.removeChannel(chan); } catch (e) {} };
  }, [active]);

  async function handleSend() {
    const text = msgInput.trim();
    if (!text || !active || !userId.current || sending) return;
    setMsgInput('');
    setSending(true);
    const tempId = 'tmp-' + Date.now();
    setThreads(prev => prev.map(t => t.id !== active ? t : {
      ...t, last: text,
      msgs: [...t.msgs, { from: 'me', text, t: _wFmtTime(new Date().toISOString()), id: tempId }],
    }));
    const { data } = await sb.from('messages').insert({
      match_id: active, sender_id: userId.current, text,
    }).select().single();
    if (data) {
      setThreads(prev => prev.map(t => t.id !== active ? t : {
        ...t, msgs: t.msgs.map(m => m.id === tempId ? { ...m, id: data.id, t: _wFmtTime(data.created_at) } : m),
      }));
    }
    setSending(false);
  }

  async function handleRespondToShift(response) {
    if (!active || !userId.current) return;
    const text = response === 'accepted'
      ? '✓ Přijímám nabídku směny!'
      : 'Bohužel tuto směnu nemohu přijmout.';
    const tempId = 'tmp-resp-' + Date.now();
    setThreads(prev => prev.map(t => t.id !== active ? t : {
      ...t, last: text,
      msgs: [...t.msgs, { from: 'me', text, t: _wFmtTime(new Date().toISOString()), id: tempId }],
    }));
    const { data } = await sb.from('messages').insert({
      match_id: active, sender_id: userId.current, text,
    }).select().single();
    if (data) {
      setThreads(prev => prev.map(t => t.id !== active ? t : {
        ...t, msgs: t.msgs.map(m => m.id === tempId ? { ...m, id: data.id } : m),
      }));
    }
  }

  async function handleRespondToInterview(response) {
    if (!active || !userId.current) return;
    const text = response === 'accepted'
      ? '✓ Přijímám pozvánku na pohovor!'
      : 'Bohužel se pohovoru nemohu zúčastnit.';
    const tempId = 'tmp-int-resp-' + Date.now();
    setThreads(prev => prev.map(t => t.id !== active ? t : {
      ...t, last: text,
      msgs: [...t.msgs, { from: 'me', text, t: _wFmtTime(new Date().toISOString()), id: tempId }],
    }));
    const { data } = await sb.from('messages').insert({
      match_id: active, sender_id: userId.current, text,
    }).select().single();
    if (data) {
      setThreads(prev => prev.map(t => t.id !== active ? t : {
        ...t, msgs: t.msgs.map(m => m.id === tempId ? { ...m, id: data.id } : m),
      }));
    }
  }

  const thread   = threads.find(t => t.id === active) || null;
  const totalUnread = threads.reduce((s, t) => s + (t.unread || 0), 0);
  const filtered = q.trim()
    ? threads.filter(t => (t.name + ' ' + (t.last || '')).toLowerCase().includes(q.trim().toLowerCase()))
    : threads;

  if (threads.length === 0) {
    return (
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '20px 32px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 12 }}>💬</div>
          <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Zatím žádné zprávy</div>
          <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 13, lineHeight: 1.6 }}>
            Swajpuj brigády a jakmile tě zaměstnavatel přijme,<br />otevře se chat přímo tady.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

      {/* Seznam konverzací — na mobilu celá šířka (jeden panel) */}
      {!thread && (
      <aside style={{
        flex: 1, width: '100%', minWidth: 0,
        display: 'flex', flexDirection: 'column',
        background: 'transparent',
      }}>
        <div style={{ padding: '20px 18px 12px' }}>
          <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 26, fontWeight: 800, letterSpacing: -0.6, marginBottom: 14 }}>Zprávy</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 999, background: '#fff', border: '1px solid ' + T.border, boxShadow: '0 2px 8px rgba(20,22,40,0.05)' }}>
            <Icon name="magnifer-linear" size={16} color={T.mutedSoft} />
            <input
              value={q} onChange={e => setQ(e.target.value)}
              placeholder="Hledat konverzaci"
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: T.ink, fontFamily: T.fontUI, fontSize: 13.5 }}
            />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px' }}>
          {filtered.map((t, idx) => {
            const unread = t.unread > 0;
            return (
              <div key={t.id}>
                <button onClick={() => { setActive(t.id); setThreads(prev => prev.map(x => x.id === t.id ? { ...x, unread: 0 } : x)); }} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 13,
                  padding: unread ? '14px' : '14px 10px', textAlign: 'left', borderRadius: 20,
                  background: unread ? '#fff' : 'transparent',
                  border: unread ? '1px solid ' + T.border : 'none',
                  boxShadow: unread ? '0 14px 30px -24px rgba(16,24,64,0.5)' : 'none',
                  position: 'relative',
                  cursor: 'pointer', color: 'inherit', fontFamily: 'inherit',
                }}>
                  <div style={{
                    position: 'relative',
                    width: 50, height: 50, borderRadius: 16, background: T.avatarGrad,
                    display: 'grid', placeItems: 'center',
                    color: '#fff', fontFamily: T.fontHead, fontWeight: 700, fontSize: 16, flexShrink: 0,
                  }}>{t.avatar}
                    {t.online && <span style={{ position: 'absolute', bottom: -1, right: -1, width: 14, height: 14, borderRadius: 999, background: T.green, border: '2.5px solid #fff' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginBottom: 3 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                        <span style={{ color: T.ink, fontFamily: T.fontUI, fontSize: 15, fontWeight: unread ? 800 : 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
                        {t.verified && <Icon name="verified-check-bold" size={13} color={T.green} />}
                      </span>
                      <span style={{ color: unread ? T.primary : T.mutedSoft, fontFamily: T.fontUI, fontSize: 11.5, fontWeight: unread ? 700 : 500, flexShrink: 0 }}>{t.time}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, color: unread ? T.inkSoft : T.muted, fontSize: 13, fontFamily: T.fontUI, fontWeight: unread ? 600 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.last}</div>
                      {unread && (
                        <span style={{ minWidth: 22, height: 22, padding: '0 6px', borderRadius: 999, background: T.primary, color: '#fff', fontSize: 10.5, fontWeight: 800, fontFamily: T.fontHead, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{t.unread}</span>
                      )}
                    </div>
                  </div>
                </button>
                {!unread && idx < filtered.length - 1 && !(filtered[idx + 1] && filtered[idx + 1].unread > 0) && (
                  <div style={{ height: 1, background: T.border, margin: '0 10px 0 73px' }} />
                )}
              </div>
            );
          })}
        </div>
      </aside>
      )}

      {/* Otevřené vlákno — na mobilu celá šířka + tlačítko zpět */}
      {thread && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Thread header */}
          <div style={{ padding: '14px 60px 14px 8px', borderBottom: '1px solid ' + T.border, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, background: '#fff' }}>
            <button
              onClick={() => setActive(null)}
              title="Zpět na konverzace"
              style={{ width: 38, height: 38, borderRadius: 999, border: 'none', background: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}><Icon name="alt-arrow-right-bold" size={20} color={T.ink} /></span>
            </button>
            <button
              onClick={() => window.wOpenEmployer && window.wOpenEmployer(thread.employerId, { name: thread.name, color: thread.color, rating: thread.rating, verified: thread.verified })}
              title="Zobrazit profil firmy"
              style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'none', border: 'none', padding: 0, cursor: 'pointer', flex: 1, minWidth: 0, textAlign: 'left' }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: T.avatarGrad, display: 'grid', placeItems: 'center', color: '#fff', fontFamily: T.fontHead, fontWeight: 700, fontSize: 15, flexShrink: 0 }}>{thread.avatar}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 15.5, fontWeight: 800 }}>{thread.name}</span>
                  {thread.verified && <Icon name="verified-check-bold" size={14} color={T.green} />}
                  <Icon name="alt-arrow-right-bold" size={13} color={T.mutedSoft} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: T.muted, fontSize: 12.5, fontFamily: T.fontUI }}>
                  Zaměstnavatel
                  <span style={{ width: 4, height: 4, borderRadius: 999, background: T.mutedSoft }} />
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: T.green }} /> online
                  </span>
                </div>
              </div>
            </button>
            {thread.rating > 0 && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 999, background: '#fff', border: '1px solid ' + T.border, boxShadow: '0 2px 8px rgba(20,22,40,0.06)', flexShrink: 0 }}>
                <Icon name="star-bold" size={14} color={T.super} />
                <span style={{ color: T.ink, fontFamily: T.fontHead, fontWeight: 800, fontSize: 14 }}>{thread.rating.toFixed(1).replace('.', ',')}</span>
              </div>
            )}
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ textAlign: 'center', color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 12, fontWeight: 600, margin: '2px 0 6px' }}>Dnes</div>
            {thread.msgs.map((m, i) => {
              if (m.kind === 'shift') {
                const laterMsgs = thread.msgs.slice(i + 1);
                const responseMsg = laterMsgs.find(lm =>
                  lm.from === 'me' && (
                    lm.text === '✓ Přijímám nabídku směny!' ||
                    lm.text === 'Bohužel tuto směnu nemohu přijmout.'
                  )
                );
                const alreadyResponded = thread.confirmed
                  ? 'accepted'                                   // směna potvrzena (stav matche) — spolehlivé i po refetchi
                  : (responseMsg ? (responseMsg.text.includes('Přijímám') ? 'accepted' : 'rejected') : null);
                return (
                  <WShiftCard
                    key={m.id || i}
                    msg={m}
                    isMe={m.from === 'me'}
                    alreadyResponded={alreadyResponded}
                    onAccept={() => setConfirmShift({ shift: m.shift, company: thread.name })}
                    onReject={() => handleRespondToShift('rejected')}
                  />
                );
              }
              if (m.kind === 'interview') {
                const laterMsgs = thread.msgs.slice(i + 1);
                const responseMsg = laterMsgs.find(lm =>
                  lm.from === 'me' && (
                    lm.text === '✓ Přijímám pozvánku na pohovor!' ||
                    lm.text === 'Bohužel se pohovoru nemohu zúčastnit.'
                  )
                );
                const alreadyResponded = responseMsg ? (responseMsg.text.includes('Přijímám') ? 'accepted' : 'rejected') : null;
                return (
                  <WInterviewCard
                    key={m.id || i}
                    msg={m}
                    isMe={m.from === 'me'}
                    alreadyResponded={alreadyResponded}
                    onAccept={() => handleRespondToInterview('accepted')}
                    onReject={() => handleRespondToInterview('rejected')}
                  />
                );
              }
              const mine = m.from === 'me';
              return (
                <div key={m.id || i} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '68%' }}>
                  <div style={{
                    padding: '12px 16px', borderRadius: 18,
                    background: mine ? T.primary : '#fff',
                    color: mine ? '#fff' : T.ink, fontFamily: T.fontUI, fontSize: 14, lineHeight: 1.45,
                    border: mine ? 'none' : '1px solid ' + T.border,
                    boxShadow: mine ? '0 6px 16px rgba(0,32,246,0.22)' : '0 2px 8px rgba(20,22,40,0.05)',
                    borderBottomRightRadius: mine ? 5 : 18,
                    borderBottomLeftRadius: mine ? 18 : 5,
                  }}>{m.text}</div>
                  <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 11, marginTop: 4, textAlign: mine ? 'right' : 'left' }}>{m.t}</div>
                </div>
              );
            })}
          </div>

          {/* Input */}
          <div style={{ padding: '14px 20px calc(14px + env(safe-area-inset-bottom))', borderTop: '1px solid ' + T.border, display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0, background: '#fff' }}>
            <input
              placeholder="Napište zprávu…"
              value={msgInput}
              onChange={e => setMsgInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              style={{
                flex: 1, padding: '14px 18px', borderRadius: 999,
                background: T.bg, border: '1px solid ' + T.border,
                color: T.ink, fontSize: 14, outline: 'none', fontFamily: T.fontUI,
              }}
            />
            <button
              onClick={handleSend}
              disabled={sending || !msgInput.trim()}
              style={{
                width: 48, height: 48, borderRadius: 999,
                background: T.primary,
                border: 'none', color: '#fff', cursor: 'pointer',
                display: 'grid', placeItems: 'center', flexShrink: 0,
                boxShadow: '0 6px 16px rgba(0,32,246,0.28)',
                opacity: (sending || !msgInput.trim()) ? 0.5 : 1,
              }}>
              <Icon name="plain-bold" size={16} color="#fff" />
            </button>
          </div>
        </div>
      )}

      {confirmShift && (
        <WShiftConfirmDialog
          shift={confirmShift.shift}
          company={confirmShift.company}
          onConfirm={async () => {
            const mid = active;
            setConfirmShift(null);
            await confirmShiftW(mid);            // match -> confirmed (naplní job)
            await handleRespondToShift('accepted');
          }}
          onClose={() => setConfirmShift(null)}
        />
      )}
    </div>
  );
}

// ── Potvrzení přijetí směny ────────────────────────────────────
function WShiftConfirmDialog({ shift, company, onConfirm, onClose }) {
  const s = shift || {};
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 140,
      background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)',
      display: 'grid', placeItems: 'center', padding: 20,
      animation: 'wPop .28s cubic-bezier(.2,.8,.2,1)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 380, background: T.card,
        borderRadius: 24, border: '1px solid ' + T.border, padding: 26, textAlign: 'center',
        boxShadow: '0 24px 60px rgba(20,22,40,0.28)',
      }}>
        <div style={{ width: 60, height: 60, borderRadius: 17, background: 'T.tint', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
          <Icon name="calendar-bold" size={26} color={T.primary} />
        </div>
        <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 21, fontWeight: 800, letterSpacing: -0.4 }}>Přijmout směnu?</div>
        {(s.role || company) && (
          <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 14, marginTop: 6 }}>
            {s.role || 'Směna'}{company ? <> u <b style={{ color: T.ink }}>{company}</b></> : null}
          </div>
        )}

        <div style={{ marginTop: 18, padding: '14px 16px', borderRadius: 14, background: T.surfaceAlt, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 9 }}>
          {(s.date || s.time) && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, color: T.ink, fontFamily: T.fontUI, fontSize: 13.5, fontWeight: 600 }}>
              <Icon name="calendar-minimalistic-bold" size={16} color={T.muted} /> {[s.date, s.time].filter(Boolean).join(' · ')}
            </div>
          )}
          {s.pay > 0 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, color: T.ink, fontFamily: T.fontUI, fontSize: 13.5, fontWeight: 600 }}>
              <Icon name="dollar-bold" size={16} color={T.muted} /> Odměna <b>{s.pay} Kč</b>
            </div>
          )}
          {s.location && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, color: T.ink, fontFamily: T.fontUI, fontSize: 13.5, fontWeight: 600 }}>
              <Icon name="map-point-bold" size={16} color={T.muted} /> {s.location}
            </div>
          )}
        </div>

        <button onClick={onConfirm} style={{ width: '100%', marginTop: 18, padding: '14px', borderRadius: 14, background: T.primary, border: 'none', color: '#fff', fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 18px rgba(0,32,246,0.28)' }}>Přijmout směnu</button>
        <button onClick={onClose} style={{ width: '100%', marginTop: 10, padding: '13px', borderRadius: 14, background: T.surfaceAlt, border: '1px solid ' + T.border, color: T.muted, fontFamily: T.fontHead, fontSize: 14.5, fontWeight: 800, cursor: 'pointer' }}>Zpět</button>
      </div>
    </div>
  );
}

// ── Shift offer card (worker view) ─────────────────────────────
function WShiftCard({ msg, isMe, alreadyResponded, onAccept, onReject }) {
  const [localResponded, setLocalResponded] = useStateW(null);
  const responded = localResponded || alreadyResponded;
  const s = msg.shift || {};

  const handleAccept = () => {
    onAccept?.();   // otevře potvrzovací dialog; skutečné přijetí až po potvrzení
  };
  const handleReject = () => {
    setLocalResponded('rejected');
    onReject?.();
  };

  return (
    <div style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
      <div style={{
        borderRadius: 18, overflow: 'hidden',
        background: '#fff', border: '1px solid ' + T.border,
        boxShadow: '0 8px 20px rgba(20,22,40,0.08)',
      }}>
        <div style={{ padding: '16px 18px 14px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: T.primary, fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', fontFamily: T.fontUI, marginBottom: 12 }}>
            <span style={{ width: 24, height: 24, borderRadius: 7, background: 'T.tint', display: 'grid', placeItems: 'center' }}>
              <Icon name="calendar-bold" size={13} color={T.primary} />
            </span>
            Nabídka směny
          </div>
          {s.role && (
            <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 20, fontWeight: 800, letterSpacing: -0.4, marginBottom: 12 }}>{s.role}</div>
          )}
          <div style={{ color: T.inkSoft, fontFamily: T.fontUI, fontSize: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
            {s.date && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}><Icon name="calendar-minimalistic-bold" size={16} color={T.muted} /> {s.date}{s.time ? (' · ' + s.time) : ''}</div>}
            {s.pay > 0 && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}><Icon name="dollar-bold" size={16} color={T.muted} /> Odměna <span style={{ color: T.ink, fontWeight: 800 }}>{s.pay} Kč</span></div>}
            {s.location && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}><Icon name="map-point-bold" size={16} color={T.muted} /> {s.location}</div>}
          </div>
        </div>

        {!isMe && (
          responded ? (
            <div style={{
              padding: '13px', textAlign: 'center',
              background: responded === 'accepted' ? T.greenSoft : 'rgba(244,63,94,0.1)',
              color: responded === 'accepted' ? T.green : '#f43f5e',
              fontFamily: T.fontHead, fontSize: 14.5, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}>
              <Icon name={responded === 'accepted' ? 'check-circle-bold' : 'close-circle-bold'} size={16} color={responded === 'accepted' ? T.green : '#f43f5e'} />
              {responded === 'accepted' ? 'Přijato' : 'Odmítnuto'}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 1, borderTop: '1px solid ' + T.border }}>
              <button
                onClick={handleReject}
                style={{
                  flex: 1, padding: '13px 0', border: 'none', background: '#fff',
                  color: '#f43f5e', fontFamily: T.fontHead, fontSize: 14, fontWeight: 800, cursor: 'pointer',
                }}>Odmítnout</button>
              <button
                onClick={handleAccept}
                style={{
                  flex: 1, padding: '13px 0', border: 'none', background: T.primary,
                  color: '#fff', fontFamily: T.fontHead, fontSize: 14, fontWeight: 800, cursor: 'pointer',
                }}>Přijmout</button>
            </div>
          )
        )}
      </div>
      <div style={{ color: T.mutedSoft, fontFamily: T.fontMono, fontSize: 10, marginTop: 3, textAlign: isMe ? 'right' : 'left' }}>{msg.t}</div>
    </div>
  );
}

function WInterviewCard({ msg, isMe, alreadyResponded, onAccept, onReject }) {
  const [localResponded, setLocalResponded] = useStateW(null);
  const responded = localResponded || alreadyResponded;
  const iv = msg.interview || {};

  const handleAccept = () => { setLocalResponded('accepted'); onAccept?.(); };
  const handleReject = () => { setLocalResponded('rejected'); onReject?.(); };

  return (
    <div style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
      <div style={{
        borderRadius: 18, overflow: 'hidden',
        background: '#fff', border: '1px solid ' + T.border,
        boxShadow: '0 8px 20px rgba(20,22,40,0.08)',
      }}>
        <div style={{ padding: '16px 18px 14px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: T.primary, fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', fontFamily: T.fontUI, marginBottom: 12 }}>
            <span style={{ width: 24, height: 24, borderRadius: 7, background: 'T.tint', display: 'grid', placeItems: 'center' }}>
              <Icon name="users-group-rounded-bold" size={13} color={T.primary} />
            </span>
            Pozvánka na pohovor
          </div>
          <div style={{ color: T.inkSoft, fontFamily: T.fontUI, fontSize: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
            {iv.date && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}><Icon name="calendar-minimalistic-bold" size={16} color={T.muted} /> {iv.date}{iv.time ? (' · ' + iv.time) : ''}</div>}
            {iv.location && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}><Icon name="map-point-bold" size={16} color={T.muted} /> {iv.location}</div>}
            {iv.note && <div style={{ color: T.muted, fontSize: 13 }}>{iv.note}</div>}
          </div>
        </div>

        {!isMe && (
          responded ? (
            <div style={{
              padding: '13px', textAlign: 'center',
              background: responded === 'accepted' ? T.greenSoft : 'rgba(244,63,94,0.1)',
              color: responded === 'accepted' ? T.green : '#f43f5e',
              fontFamily: T.fontHead, fontSize: 14.5, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}>
              <Icon name={responded === 'accepted' ? 'check-circle-bold' : 'close-circle-bold'} size={16} color={responded === 'accepted' ? T.green : '#f43f5e'} />
              {responded === 'accepted' ? 'Přijato' : 'Odmítnuto'}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 1, borderTop: '1px solid ' + T.border }}>
              <button
                onClick={handleReject}
                style={{
                  flex: 1, padding: '13px 0', border: 'none', background: '#fff',
                  color: '#f43f5e', fontFamily: T.fontHead, fontSize: 14, fontWeight: 800, cursor: 'pointer',
                }}>Nemohu</button>
              <button
                onClick={handleAccept}
                style={{
                  flex: 1, padding: '13px 0', border: 'none', background: T.primary,
                  color: '#fff', fontFamily: T.fontHead, fontSize: 14, fontWeight: 800, cursor: 'pointer',
                }}>Přijmout</button>
            </div>
          )
        )}
      </div>
      <div style={{ color: T.mutedSoft, fontFamily: T.fontMono, fontSize: 10, marginTop: 3, textAlign: isMe ? 'right' : 'left' }}>{msg.t}</div>
    </div>
  );
}
