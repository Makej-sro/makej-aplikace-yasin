// Makej Worker — Profile (mobilní design, App Store build)

function WProfile({ tick, onSignOut }) {
  const [editing, setEditing] = useStateW(false);
  const [saving,  setSaving]  = useStateW(false);
  const [form,    setForm]    = useStateW({ name: '', bio: '', skills: [], education: '', cv_url: '' });
  const [skillInput, setSkillInput] = useStateW('');
  const [userId,  setUserId]  = useStateW(null);
  const [showAllReviews, setShowAllReviews] = useStateW(false);
  const [reviewsPageOpen, setReviewsPageOpen] = useStateW(false);
  const [notifsOn, setNotifsOn] = useStateW(() => (typeof localStorage === 'undefined' || localStorage.getItem('makej-notifs') !== 'off'));
  const [confirmDel, setConfirmDel] = useStateW(false);
  const [deleting, setDeleting] = useStateW(false);

  function toggleNotifs() {
    setNotifsOn(v => {
      const nv = !v;
      try { localStorage.setItem('makej-notifs', nv ? 'on' : 'off'); } catch (e) {}
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
    });
  }, []);

  useEffectW(() => {
    setForm({
      name: W_PROFILE.name || W_PROFILE.full_name || '',
      bio:  W_PROFILE.bio  || '',
      skills: Array.isArray(W_PROFILE.skills) ? [...W_PROFILE.skills] : [],
      education: W_PROFILE.education || '',
      cv_url: W_PROFILE.cv_url || '',
    });
  }, [tick]);

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
    setSaving(true);
    await updateProfileW(userId, {
      name: form.name, bio: form.bio,
      skills: form.skills, education: form.education.trim(),
      cv_url: form.cv_url.trim(),
    });
    setSaving(false);
    setEditing(false);
  }

  const name    = W_PROFILE.name || W_PROFILE.full_name || 'Brigádník';
  const email   = W_PROFILE.email || '';
  const bio     = W_PROFILE.bio   || '';
  const initials = name.split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '?';

  const skills    = Array.isArray(W_PROFILE.skills) ? W_PROFILE.skills : [];
  const education = W_PROFILE.education || '';
  const cvUrl     = W_PROFILE.cv_url || '';
  const rating  = Number(W_PROFILE.rating)  || 0;
  const jobs    = W_PROFILE.jobs_done || 0;
  const hours   = W_PROFILE.hours_logged || 0;
  const earned  = W_PROFILE.total_earned || 0;
  const lvl     = makejLevel(W_PROFILE.xp);
  const reviews = Array.isArray(W_REVIEWS) ? W_REVIEWS : [];
  const shownReviews = showAllReviews ? reviews : reviews.slice(0, 3);

  const cardShadow = '0 4px 20px rgba(0,82,255,0.06)';
  const STATS3 = [
    { value: rating > 0 ? rating.toFixed(1).replace('.', ',') : '—', label: 'Hodnocení', icon: 'star-bold', color: T.super, bg: '#fff4de' },
    { value: jobs, label: 'Brigády', icon: 'case-round-bold', color: T.primary, bg: T.tint },
    { value: `${hours} h`, label: 'Odpracováno', icon: 'clock-circle-bold', color: T.green, bg: T.greenSoft },
  ];

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 460, margin: '0 auto', width: '100%', padding: '24px 20px calc(28px + env(safe-area-inset-bottom))' }}>

        {/* ── Header: nadpis „Profil" + ikona úpravy (odsazená od zvonečku) ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingRight: 50 }}>
          <div style={{ flex: 1, color: T.ink, fontFamily: T.fontHead, fontSize: 26, fontWeight: 800, letterSpacing: -0.6 }}>Profil</div>
          <button onClick={() => setEditing(e => !e)} title={editing ? 'Zrušit úpravy' : 'Upravit profil'} style={{
            width: 40, height: 40, borderRadius: 14, background: '#fff', border: 'none',
            boxShadow: '0 6px 16px -8px rgba(16,24,64,0.28)', display: 'grid', placeItems: 'center', cursor: 'pointer',
          }}>
            <Icon name={editing ? 'close-circle-bold' : 'pen-2-bold'} size={17} color="#4a4f6b" />
          </button>
        </div>

        {/* ── Avatar + jméno + level + e-mail ── */}
        <div onClick={() => !editing && setEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, cursor: editing ? 'default' : 'pointer' }}>
          <div style={{
            width: 62, height: 62, borderRadius: 19, flexShrink: 0,
            background: T.avatarGrad,
            display: 'grid', placeItems: 'center',
            color: '#fff', fontFamily: T.fontHead, fontWeight: 700, fontSize: 20,
            boxShadow: '0 14px 26px -14px rgba(26,52,232,0.5)',
          }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editing ? (
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} onClick={e => e.stopPropagation()}
                placeholder="Jméno a příjmení"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 11, background: '#fff', border: '1px solid ' + T.border, color: T.ink, fontFamily: T.fontHead, fontWeight: 800, fontSize: 20, outline: 'none' }} />
            ) : (<>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 22, fontWeight: 800, letterSpacing: -0.4 }}>{name}</span>
                <span style={{ padding: '3px 9px', borderRadius: 999, background: T.tint, color: T.primary, fontFamily: T.fontUI, fontSize: 11.5, fontWeight: 800 }}>Lv {lvl.level}</span>
                {W_PROFILE.verified && <Icon name="verified-check-bold" size={16} color={T.primary} />}
              </div>
              {email && <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 13.5, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</div>}
            </>)}
          </div>
          {!editing && <Icon name="alt-arrow-right-bold" size={20} color={T.mutedSoft} />}
        </div>

        {editing ? (
          /* ── EDIT MODE ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
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
              <input value={form.education} onChange={e => setForm(f => ({ ...f, education: e.target.value }))} placeholder="Např. SŠ / VŠ — obor, ročník…" style={fieldStyle} />
            </div>
            <div>
              <div style={labelStyle}>Životopis <span style={{ color: T.mutedSoft, fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>· nepovinné</span></div>
              <input value={form.cv_url} onChange={e => setForm(f => ({ ...f, cv_url: e.target.value }))} placeholder="Odkaz na životopis (PDF / Disk / LinkedIn)…" style={fieldStyle} />
              <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 12, marginTop: 6, lineHeight: 1.4 }}>Vlož veřejný odkaz na svůj životopis. Je to dobrovolné — zaměstnavatel ho uvidí u tvého profilu.</div>
            </div>
            <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '15px', borderRadius: 14, background: T.primary, border: 'none', color: '#fff', fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, cursor: 'pointer', opacity: saving ? 0.6 : 1, boxShadow: '0 8px 18px rgba(0,32,246,0.28)' }}>
              {saving ? 'Ukládám…' : 'Uložit profil'}
            </button>
          </div>
        ) : (
          <>
            {/* ── Výdělek — velká gradientová karta (radiální + tečky) ── */}
            <div style={{ position: 'relative', overflow: 'hidden', background: T.heroGrad, borderRadius: 22, padding: '20px 22px', marginBottom: 16, boxShadow: '0 22px 44px -22px rgba(26,52,232,0.55)' }}>
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.14) 1.2px, transparent 1.2px)', backgroundSize: '18px 18px', opacity: 0.5, pointerEvents: 'none' }} />
              <span style={{ position: 'absolute', right: -14, top: 2, fontFamily: T.fontHead, fontWeight: 800, fontSize: 90, lineHeight: 1, color: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }}>Kč</span>
              <div style={{ position: 'relative' }}>
                <div style={{ color: '#bcc6f5', fontFamily: T.fontUI, fontSize: 10.5, fontWeight: 800, letterSpacing: 1.4, marginBottom: 8 }}>CELKEM VYDĚLÁNO</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                  <span style={{ color: '#fff', fontFamily: T.fontHead, fontWeight: 800, fontSize: 40, letterSpacing: -0.5, lineHeight: 1 }}>{earned > 0 ? earned.toLocaleString('cs-CZ').replace(/,/g, ' ') : '0'}</span>
                  <span style={{ color: '#bcc6f5', fontFamily: T.fontUI, fontWeight: 700, fontSize: 16 }}>Kč</span>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.24)', borderRadius: 11, padding: '6px 11px', fontFamily: T.fontUI, fontSize: 11.5, fontWeight: 600, color: '#eaeeff' }}>
                  {jobs} {_wPlural(jobs, 'brigáda', 'brigády', 'brigád')}<span style={{ width: 3, height: 3, borderRadius: 999, background: '#8ea0ff' }} />{hours} h odpracováno
                </div>
              </div>
            </div>

            {/* ── Gamifikace / Level — prstenec pokroku ── */}
            <div style={{ background: '#fff', borderRadius: 22, padding: '16px 18px', boxShadow: cardShadow, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
                  <svg width="56" height="56" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="27" fill="none" stroke={T.tint} strokeWidth="6" />
                    <circle cx="32" cy="32" r="27" fill="none" stroke={T.primary} strokeWidth="6" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 27}
                      strokeDashoffset={(2 * Math.PI * 27) * (1 - (lvl.isMax ? 1 : lvl.progress))}
                      transform="rotate(-90 32 32)" style={{ transition: 'stroke-dashoffset .5s cubic-bezier(.2,.8,.2,1)' }} />
                  </svg>
                  <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: T.fontHead, fontWeight: 800, fontSize: 18, color: T.primary }}>{lvl.level}</span>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 16, fontWeight: 800 }}>{lvl.title}</span>
                    <span style={{ color: T.primary, fontFamily: T.fontUI, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, background: T.tint, padding: '2px 7px', borderRadius: 6 }}>LEVEL {lvl.level}</span>
                  </div>
                  <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 12, marginTop: 3 }}>{jobs} {_wPlural(jobs, 'brigáda', 'brigády', 'brigád')} dokončeno</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
                    <span style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 11.5, fontWeight: 600 }}>
                      {lvl.isMax ? 'Maximální level 👑' : `Ještě ${lvl.toNext} XP do levelu ${lvl.level + 1}`}
                    </span>
                    {!lvl.isMax && lvl.nextTitle && <span style={{ color: T.primary, fontFamily: T.fontHead, fontSize: 11.5, fontWeight: 800, flexShrink: 0 }}>{lvl.nextTitle} →</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Stats (3 sloupce) ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
              {STATS3.map(s => (
                <div key={s.label} style={{ background: '#fff', borderRadius: 16, padding: '16px 8px', boxShadow: cardShadow, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: s.bg, display: 'grid', placeItems: 'center', marginBottom: 8 }}>
                    <Icon name={s.icon} size={20} color={s.color} />
                  </div>
                  <span style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 19, fontWeight: 800 }}>{s.value}</span>
                  <span style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 11, fontWeight: 600, marginTop: 1 }}>{s.label}</span>
                </div>
              ))}
            </div>

            {/* ── Recenze na mě → otevře stránku s odpovídáním ── */}
            <button onClick={() => setReviewsPageOpen(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 20, background: '#fff', boxShadow: cardShadow, border: 'none', cursor: 'pointer', textAlign: 'left', marginBottom: 24 }}>
              <div style={{ width: 44, height: 44, borderRadius: 13, background: '#fff4de', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <Icon name="star-bold" size={20} color={T.super} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 15, fontWeight: 800 }}>Recenze na mě</div>
                <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 12.5 }}>{reviews.length} {_wPlural(reviews.length, 'recenze', 'recenze', 'recenzí')}{rating > 0 ? ` · průměr ${rating.toFixed(1).replace('.', ',')}` : ''} · otevřít a odpovědět</div>
              </div>
              {rating > 0 && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <Icon name="star-bold" size={16} color={T.super} />
                  <span style={{ color: T.ink, fontFamily: T.fontHead, fontWeight: 800, fontSize: 16 }}>{rating.toFixed(1).replace('.', ',')}</span>
                </div>
              )}
              <span style={{ display: 'inline-flex', flexShrink: 0 }}><Icon name="alt-arrow-right-bold" size={18} color={T.mutedSoft} /></span>
            </button>

            {/* ── O mně ── */}
            <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <div style={{ ...labelStyle, padding: '0 4px' }}>O mně</div>
                {bio ? (
                  <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: cardShadow, color: T.ink, fontFamily: T.fontUI, fontSize: 14.5, lineHeight: 1.6 }}>{bio}</div>
                ) : (
                  <div style={{ borderRadius: 16, padding: 20, background: 'rgba(255,255,255,0.5)', border: '1px dashed ' + T.border, color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 14, lineHeight: 1.5 }}>Zatím žádný popis. Klikni „Upravit" a přidej ho.</div>
                )}
                {education && (
                  <div style={{ marginTop: 12, background: '#fff', borderRadius: 16, padding: '14px 20px', boxShadow: cardShadow }}>
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
                  <div style={{ borderRadius: 16, padding: 20, background: 'rgba(255,255,255,0.5)', border: '1px dashed ' + T.border, color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 14, lineHeight: 1.5 }}>Zatím žádné dovednosti. Klikni „Upravit" a přidej je.</div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {skills.map((sk, i) => <span key={i} style={pillStyle}>{sk}</span>)}
                  </div>
                )}
              </div>
            </div>

            {/* ── Nastavení ── */}
            <div style={{ background: '#fff', borderRadius: 24, boxShadow: cardShadow, overflow: 'hidden' }}>
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
            borderRadius: 24, border: '1px solid ' + T.border, padding: 26, textAlign: 'center',
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
        <button onClick={onClose} title="Zpět" style={{ width: 40, height: 40, borderRadius: 999, border: 'none', background: T.surfaceAlt, display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}><Icon name="alt-arrow-right-bold" size={20} color={T.ink} /></span>
        </button>
        <div>
          <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 18, fontWeight: 800 }}>Recenze na mě</div>
          <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 12.5 }}>{reviews.length} {_wPlural(reviews.length, 'recenze', 'recenze', 'recenzí')}</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px calc(20px + env(safe-area-inset-bottom))' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {reviews.length === 0 && (
            <div style={{ padding: '40px 24px', borderRadius: 18, background: '#fff', textAlign: 'center', color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 14, lineHeight: 1.6 }}>
              <div style={{ fontSize: 42, marginBottom: 10 }}>⭐</div>
              Zatím nemáš žádné recenze. Po dokončené brigádě tě zaměstnavatel ohodnotí a recenze se objeví tady.
            </div>
          )}
          {reviews.map(r => {
            const thread = replies[r.id] || [];
            return (
              <div key={r.id} style={{ background: '#fff', borderRadius: 20, padding: 18, boxShadow: '0 4px 20px rgba(0,82,255,0.06)' }}>
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
