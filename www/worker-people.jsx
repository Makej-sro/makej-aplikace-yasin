// Makej Worker — Lidé (karty brigádníků, peer-to-peer, odděleno od inzerátů práce)
// Stejný swipe mechanismus jako u práce (viz worker-swipe.jsx), ale karty
// jsou lidé, ne inzeráty, a zájem musí být oboustranný, než se otevře chat.

const _P_KARTA = { background: '#fff', borderRadius: 20, boxShadow: '0 4px 20px rgba(0,32,246,0.06)', padding: '18px 20px' };

// ── Náhodná demo data — appka teprve startuje, reálné karty/inzeráty
//    zatím většinou nejsou. `_demo: true` zabrání zápisu do DB při swipu
//    (fake id by stejně žádný insert nepřežil), jde jen o vyzkoušení UI.
const _P_JMENA = ['Tomáš Novák', 'Klára Dvořáková', 'Adam Procházka', 'Eliška Horáková', 'Matěj Kučera', 'Barbora Veselá', 'Filip Marek', 'Anna Svobodová'];
const _P_MESTA = ['Brno', 'Praha', 'Olomouc', 'Ostrava', 'Zlín', 'Plzeň'];
const _P_NABIDKY = [
  'Jednou týdně opravuju hodinky a drobnou elektroniku, rád pomůžu i tobě.',
  'Doučuju matematiku a fyziku na střední, večery mám volné.',
  'Umím postavit web nebo jednoduchou appku, hledám lidi na drobné zakázky.',
  'Fotím portréty a eventy, půjčím i vybavení.',
  'Vařím na akce menšího rozsahu, catering pro rodinné oslavy.',
  'Pomůžu se stěhováním, mám dodávku a sílu.',
  'Stříhám a upravuju video, hledám krátkodobé projekty.',
  'Učím kytaru začátečníky, docházím i domů.',
];
const _P_STITKY = [['Řemesla', 'Opravy'], ['Doučování', 'Matematika'], ['IT', 'Weby'], ['Foto', 'Video'], ['Gastro', 'Catering'], ['Stěhování', 'Brigády'], ['Video', 'Střih'], ['Hudba', 'Výuka']];
function _pDemoPeople() {
  return _P_JMENA.map((name, i) => ({
    id: 'demo-p-' + i,
    name,
    bio: 'Bydlím v okolí a rád/a se zapojím, když to bude sedět termínově.',
    city: _P_MESTA[i % _P_MESTA.length],
    kraj: '',
    skills: [],
    card_offer: _P_NABIDKY[i % _P_NABIDKY.length],
    card_tags: _P_STITKY[i % _P_STITKY.length],
    rating: [0, 4.6, 4.9, 0, 4.7, 5.0, 0, 4.8][i],
    verified: i % 3 === 0,
    avatar_url: null,
    created_at: new Date().toISOString(),
    _demo: true,
  }));
}

// ── Swipovací karta člověka ──────────────────────────────────────
function WPersonCard({ person, drag, isTop, depth = 0, onTap }) {
  const x = isTop ? drag.x : 0;
  const y = isTop ? drag.y : 0;
  const rot = isTop ? (x / 18) : 0;
  const opacity = isTop ? 1 : (1 - depth * 0.08);
  const scale = isTop ? 1 : (1 - depth * 0.04);
  const translateY = isTop ? 0 : (depth * 12);

  const likeShown = isTop && x > 40;
  const passShown = isTop && x < -40;
  const accent = _wColor(person.id);
  const initials = (person.name || '?').split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '??';
  const tags = [...(Array.isArray(person.card_tags) ? person.card_tags : []), ...(Array.isArray(person.skills) ? person.skills : [])].slice(0, 5);

  return (
    <div
      style={{
        position: 'absolute', inset: 0,
        transform: `translate(${x}px, ${y + translateY}px) rotate(${rot}deg) scale(${scale})`,
        opacity,
        transition: drag.dragging ? 'none' : 'transform .35s cubic-bezier(.2,.8,.2,1), opacity .35s',
        willChange: 'transform',
        zIndex: 10 - depth,
        pointerEvents: isTop ? 'auto' : 'none',
      }}
      onClick={() => isTop && !drag.moved && onTap?.()}
    >
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 28, overflow: 'hidden',
        background: T.card, boxShadow: '0 30px 60px -20px rgba(20,22,40,0.25), 0 1px 0 rgba(255,255,255,0.6) inset, 0 0 0 1px ' + T.border,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Hero — iniciály místo fotky, appka fotky profilu zatím nemá */}
        <div style={{
          position: 'relative', flex: '0 0 auto', padding: '32px 24px 20px',
          background: `linear-gradient(155deg, ${accent} 0%, ${T.primaryDeep} 120%)`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        }}>
          <div style={{
            width: 84, height: 84, borderRadius: 999, background: 'rgba(255,255,255,0.95)',
            color: accent, display: 'grid', placeItems: 'center',
            fontFamily: T.fontHead, fontWeight: 800, fontSize: 30,
            boxShadow: '0 10px 22px rgba(0,0,0,0.22)', marginBottom: 14,
          }}>{initials}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#fff', fontFamily: T.fontHead, fontSize: 21, fontWeight: 800, letterSpacing: -0.4 }}>{person.name || 'Brigádník'}</span>
            {person.verified && <Icon name="verified-check-bold" size={15} color="#fff" />}
          </div>
          {(person.city || person.rating > 0) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, color: 'rgba(255,255,255,0.85)', fontFamily: T.fontUI, fontSize: 13 }}>
              {person.city && <span>{person.city}</span>}
              {person.rating > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <Icon name="star-bold" size={12} color={T.super} />{Number(person.rating).toFixed(1).replace('.', ',')}
                </span>
              )}
            </div>
          )}
          <Stamp show={likeShown} angle={-12} pos={{ top: -6, left: 14 }} color="#5BD68A" label="MÁM ZÁJEM" intensity={Math.min(1, x / 120)} />
          <Stamp show={passShown} angle={14} pos={{ top: -6, right: 14 }} color={T.destructive} label="PŘESKOČIT" intensity={Math.min(1, -x / 120)} />
        </div>

        {/* Co nabízí — hlavní pitch karty */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {person.card_offer && (
            <div>
              <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 }}>Nabízí</div>
              <div style={{ color: T.ink, fontFamily: T.fontUI, fontSize: 14.5, lineHeight: 1.55 }}>{person.card_offer}</div>
            </div>
          )}
          {tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {tags.map((t, i) => (
                <span key={i} style={{ padding: '6px 11px', borderRadius: 999, background: T.tint, color: T.primary, fontFamily: T.fontUI, fontSize: 12, fontWeight: 700 }}>{t}</span>
              ))}
            </div>
          )}
          {person.bio && (
            <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 13, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
              {person.bio}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Detail karty po klepnutí ─────────────────────────────────────
function WPersonDetailModal({ person, onClose, onLike, onPass }) {
  const accent = _wColor(person.id);
  const initials = (person.name || '?').split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '??';
  const tags = [...(Array.isArray(person.card_tags) ? person.card_tags : []), ...(Array.isArray(person.skills) ? person.skills : [])];

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(10,12,30,0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      animation: 'wPop .25s cubic-bezier(.2,.8,.2,1)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 460, maxHeight: '85vh', background: T.card,
        borderRadius: '24px 24px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 -20px 50px rgba(20,22,40,0.3)',
      }}>
        <div style={{ position: 'relative', flexShrink: 0, padding: '26px 22px 20px', background: `linear-gradient(155deg, ${accent} 0%, ${T.primaryDeep} 130%)`, textAlign: 'center' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: 999, background: 'rgba(0,0,0,0.28)', border: 'none', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 16 }}>✕</button>
          <div style={{ width: 76, height: 76, borderRadius: 999, background: '#fff', color: accent, display: 'grid', placeItems: 'center', fontFamily: T.fontHead, fontWeight: 800, fontSize: 26, margin: '0 auto 12px', boxShadow: '0 10px 22px rgba(0,0,0,0.22)' }}>{initials}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span style={{ color: '#fff', fontFamily: T.fontHead, fontSize: 20, fontWeight: 800 }}>{person.name || 'Brigádník'}</span>
            {person.verified && <Icon name="verified-check-bold" size={15} color="#fff" />}
          </div>
          {person.city && <div style={{ color: 'rgba(255,255,255,0.85)', fontFamily: T.fontUI, fontSize: 13, marginTop: 4 }}>{person.city}</div>}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
          {person.card_offer && (
            <div style={{ ..._P_KARTA, marginBottom: 14 }}>
              <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Nabízí</div>
              <div style={{ color: T.ink, fontFamily: T.fontUI, fontSize: 14.5, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{person.card_offer}</div>
            </div>
          )}
          {tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
              {tags.map((t, i) => (
                <span key={i} style={{ padding: '7px 13px', borderRadius: 999, background: T.tint, color: T.primary, fontFamily: T.fontUI, fontSize: 12.5, fontWeight: 700 }}>{t}</span>
              ))}
            </div>
          )}
          {person.bio && (
            <div style={{ ..._P_KARTA }}>
              <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>O mně</div>
              <div style={{ color: T.ink, fontFamily: T.fontUI, fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{person.bio}</div>
            </div>
          )}
          {!person.card_offer && !person.bio && tags.length === 0 && (
            <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Zatím o sobě nic nenapsal/a.</div>
          )}
        </div>

        <div style={{ flexShrink: 0, padding: '14px 22px calc(16px + env(safe-area-inset-bottom))', borderTop: '1px solid ' + T.border, display: 'flex', gap: 12 }}>
          <button onClick={() => { onClose(); onPass(); }} style={{ flex: 1, padding: '14px 0', borderRadius: 14, background: '#fff', border: '1.5px solid ' + T.border, color: T.muted, fontFamily: T.fontHead, fontSize: 14.5, fontWeight: 800, cursor: 'pointer' }}>Přeskočit</button>
          <button onClick={() => { onClose(); onLike(); }} style={{ flex: 1, padding: '14px 0', borderRadius: 14, background: T.primary, border: 'none', color: '#fff', fontFamily: T.fontHead, fontSize: 14.5, fontWeight: 800, cursor: 'pointer', boxShadow: '0 12px 24px rgba(27,52,240,.3)' }}>Mám zájem</button>
        </div>
      </div>
    </div>
  );
}

// ── Prázdný stav decku ────────────────────────────────────────────
function WPeopleDeckEnd({ onGoCard }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px', textAlign: 'center', gap: 14 }}>
      <div style={{ width: 64, height: 64, borderRadius: 999, background: T.tint, display: 'grid', placeItems: 'center' }}>
        <Icon name="users-group-rounded-bold" size={28} color={T.primary} />
      </div>
      <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 17, fontWeight: 800 }}>Zatím žádné další karty</div>
      <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 13.5, lineHeight: 1.5 }}>
        Mrkni sem později — přibudou další lidi. Zatím si zkontroluj svoji vlastní kartu.
      </div>
      <button onClick={onGoCard} style={{ marginTop: 4, padding: '11px 22px', borderRadius: 999, background: T.tint, border: '1px solid rgba(0,32,246,0.16)', color: T.primary, fontFamily: T.fontHead, fontSize: 13.5, fontWeight: 800, cursor: 'pointer' }}>
        Upravit moji kartu
      </button>
    </div>
  );
}

// ── Moje karta — zapnutí + editace nabídky ───────────────────────
function WMyCard({ userId }) {
  const [form, setForm] = useStateW({ enabled: false, offer: '', tags: [] });
  const [tagInput, setTagInput] = useStateW('');
  const [saving, setSaving] = useStateW(false);
  const [saved, setSaved] = useStateW(false);

  useEffectW(() => {
    setForm({
      enabled: !!W_PROFILE.card_enabled,
      offer: W_PROFILE.card_offer || '',
      tags: Array.isArray(W_PROFILE.card_tags) ? [...W_PROFILE.card_tags] : [],
    });
  }, [userId]);

  function addTag() {
    const s = tagInput.trim();
    if (!s || form.tags.includes(s)) { setTagInput(''); return; }
    setForm(f => ({ ...f, tags: [...f.tags, s] }));
    setTagInput('');
  }
  function removeTag(i) { setForm(f => ({ ...f, tags: f.tags.filter((_, idx) => idx !== i) })); }

  async function save(next) {
    if (!userId || saving) return;
    setSaving(true);
    const payload = { ...form, ...(next || {}) };
    await updateProfileW(userId, { card_enabled: payload.enabled, card_offer: payload.offer, card_tags: payload.tags });
    setForm(payload);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  const name = W_PROFILE.name || W_PROFILE.full_name || 'Brigádník';
  const initials = name.split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 460, margin: '0 auto', width: '100%', padding: '70px 20px calc(28px + env(safe-area-inset-bottom))' }}>

        {/* Zapnout/vypnout */}
        <div style={{ ..._P_KARTA, padding: 0, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px' }}>
            <div style={{ width: 44, height: 44, borderRadius: 999, background: T.avatarGrad, color: '#fff', display: 'grid', placeItems: 'center', fontFamily: T.fontHead, fontWeight: 700, fontSize: 15, flexShrink: 0 }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 14.5, fontWeight: 800 }}>Moje karta je {form.enabled ? 'zapnutá' : 'vypnutá'}</div>
              <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 12, marginTop: 2 }}>{form.enabled ? 'Ostatní tě uvidí v Lidé' : 'Ostatní tě v Lidé neuvidí'}</div>
            </div>
            <button onClick={() => save({ enabled: !form.enabled })} title="Zapnout / vypnout kartu" style={{
              width: 48, height: 28, borderRadius: 999, flexShrink: 0, cursor: 'pointer', position: 'relative', border: 'none',
              background: form.enabled ? T.primary : 'rgba(18,18,26,0.18)', transition: 'background .2s',
            }}>
              <span style={{ position: 'absolute', top: 3, left: form.enabled ? 23 : 3, width: 22, height: 22, borderRadius: 999, background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', transition: 'left .2s' }} />
            </button>
          </div>
        </div>

        <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Co nabízíš</div>
        <textarea
          value={form.offer}
          onChange={e => setForm(f => ({ ...f, offer: e.target.value }))}
          onBlur={() => save()}
          placeholder="Např. Jednou týdně opravuju hodinky, rád pomůžu s… Nemusí to být brigáda ani full-time."
          rows={4}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: '#fff', border: '1px solid ' + T.border, color: T.ink, fontFamily: T.fontUI, fontSize: 14, outline: 'none', resize: 'vertical', lineHeight: 1.5, marginBottom: 18 }}
        />

        <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Štítky</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {form.tags.map((t, i) => (
            <span key={i} style={{ padding: '9px 16px', borderRadius: 999, background: '#fff', border: '1px solid ' + T.border, boxShadow: '0 2px 6px rgba(20,22,40,0.05)', color: T.ink, fontFamily: T.fontHead, fontSize: 14, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              {t}<span onClick={() => { removeTag(i); save({ tags: form.tags.filter((_, idx) => idx !== i) }); }} style={{ cursor: 'pointer', color: '#f43f5e', fontWeight: 800, lineHeight: 1 }}>×</span>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <input value={tagInput} onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); save({ tags: [...form.tags, tagInput.trim()].filter((v, i, a) => v && a.indexOf(v) === i) }); } }}
            placeholder="Např. Hodinářství, Doučování, Řemesla…"
            style={{ flex: 1, padding: '12px 14px', borderRadius: 12, background: '#fff', border: '1px solid ' + T.border, color: T.ink, fontFamily: T.fontUI, fontSize: 14, outline: 'none' }} />
          <button onClick={() => { addTag(); save({ tags: [...form.tags, tagInput.trim()].filter((v, i, a) => v && a.indexOf(v) === i) }); }}
            style={{ padding: '0 20px', borderRadius: 12, background: T.tint, border: '1px solid rgba(0,32,246,0.2)', color: T.primary, fontFamily: T.fontHead, fontSize: 14, fontWeight: 800, cursor: 'pointer', flexShrink: 0 }}>Přidat</button>
        </div>

        <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 12.5, lineHeight: 1.5, marginTop: 8 }}>
          Jméno, bio, dovednosti, město a hodnocení se na kartu přebírají
          z tvého profilu (Nastavení). {saving && 'Ukládám…'} {saved && !saving && 'Uloženo ✓'}
        </div>
      </div>
    </div>
  );
}

// ── Domovská obrazovka Lidé — stav karty + CTA na swipe ─────────
function WPeopleHome({ onEdit, onSwipe }) {
  const enabled = !!W_PROFILE.card_enabled;
  const name = W_PROFILE.name || W_PROFILE.full_name || 'Brigádník';
  const initials = name.split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '?';
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 460, margin: '0 auto', width: '100%', padding: '70px 20px calc(28px + env(safe-area-inset-bottom))' }}>

        {/* Stav mojí karty — musí být na první pohled vidět, jestli je zapnutá */}
        <div style={{ ..._P_KARTA, padding: 0, overflow: 'hidden', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px' }}>
            <div style={{ width: 44, height: 44, borderRadius: 999, background: T.avatarGrad, color: '#fff', display: 'grid', placeItems: 'center', fontFamily: T.fontHead, fontWeight: 700, fontSize: 15, flexShrink: 0 }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: enabled ? T.green : T.destructive, flexShrink: 0 }} />
                <span style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 14.5, fontWeight: 800 }}>Moje karta je {enabled ? 'aktivní' : 'neaktivní'}</span>
              </div>
              <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 12, marginTop: 2 }}>
                {enabled ? 'Ostatní tě v Lidé vidí a mohou napsat' : 'Nikdo tě v Lidé nevidí'}
              </div>
            </div>
            <button onClick={onEdit} style={{ padding: '9px 16px', borderRadius: 999, background: T.tint, border: '1px solid rgba(0,32,246,0.16)', color: T.primary, fontFamily: T.fontHead, fontSize: 13, fontWeight: 800, cursor: 'pointer', flexShrink: 0, WebkitTapHighlightColor: 'transparent' }}>Upravit</button>
          </div>
        </div>

        {/* CTA na swipe */}
        <div style={{ ..._P_KARTA, textAlign: 'center', padding: '30px 24px' }}>
          <div style={{ width: 60, height: 60, borderRadius: 999, background: T.tint, display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
            <Icon name="users-group-rounded-bold" size={26} color={T.primary} />
          </div>
          <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Objevuj lidi ve tvém okolí</div>
          <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 13.5, lineHeight: 1.55, marginBottom: 22 }}>
            Swipuj karty ostatních — nabízí skill, pomoc nebo chtějí poznat lidi
            se stejným zájmem. Když se zalíbíte oba, otevře se chat.
          </div>
          <button onClick={onSwipe} style={{
            width: '100%', height: 52, borderRadius: 16, background: T.primary, border: 'none',
            color: '#fff', fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, cursor: 'pointer',
            boxShadow: '0 14px 28px -14px rgba(0,32,246,0.55)', WebkitTapHighlightColor: 'transparent',
          }}>Swipovat</button>
        </div>
      </div>
    </div>
  );
}

// ── Hlavní záložka Lidé ────────────────────────────────────────────
function WPeople({ tick }) {
  const [view, setView] = useStateW('home');   // 'home' | 'browse' | 'card'
  const [people, setPeople] = useStateW([]);
  const [topIdx, setTopIdx] = useStateW(0);
  const [drag, setDrag] = useStateW({ x: 0, y: 0, dragging: false, moved: false, startX: 0, startY: 0 });
  const [actionAnim, setActionAnim] = useStateW(null);
  const [matchAnim, setMatchAnim] = useStateW(null);   // { person, mutual }
  const [detailPerson, setDetailPerson] = useStateW(null);
  const [userId, setUserId] = useStateW(null);
  const dragRef = useRefW(drag);
  const swipedIds = useRefW([]);   // odbavené v tomhle sezení, ať se hned znovu neukážou

  useEffectW(() => { dragRef.current = drag; }, [drag]);

  // Session zjistit hned při vstupu do záložky — ať funguje "Moje karta"
  // i bez toho, že by uživatel prošel "Procházet" (kde se dřív zjišťovala).
  useEffectW(() => {
    sb.auth.getSession().then(({ data: { session } }) => setUserId(session?.user?.id || null));
  }, []);

  async function load(uid) {
    if (!uid) return;
    let cards = [];
    try { cards = await fetchPeopleCardsW(swipedIds.current); } catch (e) { cards = []; }
    // Appka teprve startuje — reálných karet bývá málo/žádné. Ať jde swipe
    // hned vyzkoušet, doplní se demo lidi (nezapisují se do DB, viz doLike/doPass).
    if (!cards || cards.length === 0) {
      cards = _pDemoPeople().filter(p => !swipedIds.current.includes(p.id));
    }
    setPeople(cards);
    setTopIdx(0);
  }
  useEffectW(() => { if (view === 'browse' && userId) load(userId); }, [tick, view, userId]);

  const currentPerson = people[topIdx] || null;
  const visibleCards = people.slice(topIdx, topIdx + 3);

  const snapBack = () => setDrag({ x: 0, y: 0, dragging: false, moved: false, startX: 0, startY: 0 });
  const animateFly = (dir, cb) => {
    setDrag(d => ({ ...d, x: dir === 'like' ? 1400 : -1400, y: 0, dragging: false }));
    setTimeout(() => { snapBack(); cb(); }, 380);
  };

  async function doLike() {
    if (!currentPerson) return;
    const person = currentPerson;
    setActionAnim('like');
    setTimeout(() => setActionAnim(null), 600);
    animateFly('like', async () => {
      setTopIdx(i => i + 1);
      swipedIds.current = [...swipedIds.current, person.id];
      const uid = userId;
      if (uid && !person._demo) {
        const m = await createPeopleMatchW(person.id, false);
        setMatchAnim({ person, mutual: !!(m && m.status === 'accepted') });
        setTimeout(() => setMatchAnim(null), 3200);
      } else if (person._demo) {
        // Demo karta — nic se nezapisuje, jen ukázka animace (napůl náhodně "mutual")
        setMatchAnim({ person, mutual: Math.random() < 0.5 });
        setTimeout(() => setMatchAnim(null), 3200);
      }
    });
  }
  async function doPass() {
    if (!currentPerson) return;
    const person = currentPerson;
    setActionAnim('pass');
    setTimeout(() => setActionAnim(null), 600);
    animateFly('pass', async () => {
      setTopIdx(i => i + 1);
      swipedIds.current = [...swipedIds.current, person.id];
      const uid = userId;
      if (uid && !person._demo) await createPeopleRejectionW(person.id);
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
  const onPointerUp = () => {
    const d = dragRef.current;
    if (!d.dragging) return;
    if      (d.x >  90) doLike();
    else if (d.x < -90) doPass();
    else if (!d.moved && currentPerson) { snapBack(); setDetailPerson(currentPerson); }
    else                snapBack();
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, paddingTop: 4, position: 'relative' }}>

      {view === 'home' && (
        <WPeopleHome onEdit={() => setView('card')} onSwipe={() => setView('browse')} />
      )}

      {view !== 'home' && (
        <div style={{ padding: '6px 8px 0', flexShrink: 0 }}>
          <WZpet onClick={() => setView('home')} label="Lidé" />
        </div>
      )}

      {view === 'card' ? (
        <WMyCard userId={userId} />
      ) : view !== 'browse' ? null : visibleCards.length === 0 ? (
        <WPeopleDeckEnd onGoCard={() => setView('card')} />
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 8px 6px', minHeight: 0, gap: 12 }}>
          <div
            style={{ position: 'relative', width: '100%', maxWidth: 460, flex: 1, minHeight: 0, userSelect: 'none', touchAction: 'none' }}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          >
            {[...visibleCards].reverse().map((person, ri) => {
              const depth = visibleCards.length - 1 - ri;
              const isTop = depth === 0;
              return (
                <WPersonCard key={person.id} person={person}
                  drag={isTop ? drag : { x: 0, y: 0, dragging: false, moved: false }}
                  isTop={isTop} depth={depth} onTap={() => setDetailPerson(person)} />
              );
            })}
          </div>

          <div style={{ flex: 'none', width: '100%', maxWidth: 460, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '10px 0 6px' }}>
            <button onClick={doPass} title="Přeskočit" style={{
              width: 68, height: 68, borderRadius: '50%', background: '#fff',
              border: '1.5px solid ' + (actionAnim === 'pass' ? '#C7CCE3' : '#E6E9F5'),
              display: 'grid', placeItems: 'center', cursor: 'pointer', outline: 'none',
              transform: actionAnim === 'pass' ? 'scale(1.14)' : 'scale(1)', transition: 'transform .18s, border-color .18s',
            }}>
              <svg width="26" height="26" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 2l14 14M16 2L2 16" stroke="#7A82A6" strokeWidth="2.4" strokeLinecap="round" /></svg>
            </button>
            <button onClick={doLike} title="Mám zájem" style={{
              width: 82, height: 82, borderRadius: '50%', background: T.primary, border: 'none',
              display: 'grid', placeItems: 'center', cursor: 'pointer', outline: 'none',
              boxShadow: actionAnim === 'like' ? '0 16px 30px rgba(27,52,240,.5)' : '0 12px 24px rgba(27,52,240,.35)',
              transform: actionAnim === 'like' ? 'scale(1.12)' : 'scale(1)', transition: 'transform .18s, box-shadow .18s',
            }}>
              <svg width="33" height="26" viewBox="0 0 27 21" aria-hidden="true"><path d="M2.5 11.5L9.8 18.5 24.5 2.5" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* Match animace */}
      {matchAnim && (
        <div onClick={() => setMatchAnim(null)} style={{
          position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.8)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(12px)', animation: 'wPop .35s cubic-bezier(.2,.8,.2,1)',
        }}>
          <div style={{ textAlign: 'center', padding: '32px 40px', maxWidth: 360 }}>
            <div style={{ fontSize: 80, marginBottom: 4, lineHeight: 1 }}>{matchAnim.mutual ? '🤝' : '💙'}</div>
            <div style={{ color: '#fff', fontFamily: T.fontHead, fontSize: 30, fontWeight: 900, letterSpacing: -1, marginTop: 8 }}>
              {matchAnim.mutual ? 'Nový kontakt!' : 'Zájem odeslán!'}
            </div>
            <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 14, marginTop: 10, lineHeight: 1.6 }}>
              {matchAnim.mutual
                ? <>Ty i {matchAnim.person.name || 'on/ona'} máte o sebe zájem.<br />Chat najdeš v záložce Zprávy → Lidé.</>
                : <>Uvidíš, jestli {matchAnim.person.name || 'druhá strana'} projeví zájem taky.<br />Pak se otevře chat.</>}
            </div>
            <button onClick={e => { e.stopPropagation(); setMatchAnim(null); }} style={{
              marginTop: 24, padding: '13px 36px', borderRadius: 999, background: T.ink, border: 'none',
              color: '#fff', fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, cursor: 'pointer',
            }}>Pokračovat →</button>
          </div>
        </div>
      )}

      {detailPerson && (
        <WPersonDetailModal person={detailPerson} onClose={() => setDetailPerson(null)}
          onLike={doLike} onPass={doPass} />
      )}
    </div>
  );
}
