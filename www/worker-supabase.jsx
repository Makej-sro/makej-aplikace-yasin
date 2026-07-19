// Makej Worker — Supabase data layer
// Must load before worker-swipe/messages/profile/main

const useStateW = React.useState;
const useEffectW = React.useEffect;
const useRefW    = React.useRef;

// ── Globals (mutated in-place, React reads via tick) ───────────
const W_PROFILE  = {};
const W_JOBS     = [];   // active jobs not yet swiped
const W_THREADS  = [];   // one per accepted match
const W_HISTORY  = [];   // all matches (pending/upcoming/completed) for "Moje brigády"
const W_REVIEWS  = [];   // recenze, které dostal brigádník (o něm)

// ── Level systém ───────────────────────────────────────────────
// Prahy (kumulativní XP pro dosažení levelu) — musí odpovídat SQL makej_level_from_xp
const W_LEVEL_THRESHOLDS = [0, 150, 400, 800, 1400, 2200, 3200, 4500, 6000, 8000];
const W_LEVEL_TITLES = [
  'Nováček', 'Brigádník', 'Zkušený', 'Šikula', 'Profík',
  'Expert', 'Mistr', 'Es', 'Legenda', 'Král brigád',
];

// Vrátí { level, title, xpInLevel, xpForLevel, toNext, progress, isMax }
function makejLevel(xp) {
  const x = Math.max(0, Number(xp) || 0);
  let level = 1;
  for (let i = 0; i < W_LEVEL_THRESHOLDS.length; i++) {
    if (x >= W_LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  const isMax = level >= W_LEVEL_THRESHOLDS.length;
  const base  = W_LEVEL_THRESHOLDS[level - 1];
  const next  = isMax ? base : W_LEVEL_THRESHOLDS[level];
  const xpInLevel  = x - base;
  const xpForLevel = isMax ? 0 : (next - base);
  const toNext     = isMax ? 0 : (next - x);
  const progress   = isMax ? 1 : Math.max(0, Math.min(1, xpInLevel / xpForLevel));
  return {
    level, title: W_LEVEL_TITLES[level - 1] || 'Makáč',
    xp: x, xpInLevel, xpForLevel, toNext, progress, isMax,
    nextTitle: isMax ? null : (W_LEVEL_TITLES[level] || null),
  };
}

// Je datum brigády už minulé? (event_date je ISO 'YYYY-MM-DD')
function _wJobPassed(eventDate) {
  if (!eventDate) return false;
  const d = new Date(eventDate + 'T23:59:59');
  if (isNaN(d)) return false;
  return d < new Date();  // celý den brigády už uplynul
}

// Formátuje ISO datum včetně roku: 'Pá 13. 12. 2025'
function _wFmtDateY(iso) {
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return '';
  const days = ['Ne','Po','Út','St','Čt','Pá','So'];
  return `${days[d.getDay()]} ${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
}

// Zjistí ISO datum brigády. Preferuje event_date; u starých dat bez roku
// (např. '13.12', 'So 5. 7.') odhadne rok podle vzniku matche.
function _wResolveEventDate(job, matchCreatedAt) {
  if (job.event_date) return job.event_date;
  const raw = (job.date || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const m = raw.match(/(\d{1,2})\s*\.\s*(\d{1,2})/);   // den.měsíc (i "So 5. 7.")
  if (!m) return null;
  const day = parseInt(m[1], 10), mon = parseInt(m[2], 10);
  if (!(day >= 1 && day <= 31 && mon >= 1 && mon <= 12)) return null;
  const anchor = matchCreatedAt ? new Date(matchCreatedAt) : new Date();
  const anchorYear = anchor.getFullYear();
  let best = null, bestDiff = Infinity;
  for (const y of [anchorYear - 1, anchorYear, anchorYear + 1]) {
    const d = new Date(y, mon - 1, day);
    const diff = Math.abs(d - anchor);
    if (diff < bestDiff) { bestDiff = diff; best = d; }
  }
  if (!best) return null;
  const mm = String(best.getMonth() + 1).padStart(2, '0');
  const dd = String(best.getDate()).padStart(2, '0');
  return `${best.getFullYear()}-${mm}-${dd}`;
}

// ── Helpers ────────────────────────────────────────────────────
function _wColor(str) {
  const cols = ['#F4A261','#8AB4FF','#5BD68A','#E0B0FF','#FF6B35','#FFD166','#6F80FF','#f43f5e'];
  let h = 0;
  for (let i = 0; i < (str || '').length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
  return cols[Math.abs(h) % cols.length];
}

// Jednotný podklad avatarů bez profilovky — značková modrá (jako navbar).
const W_AVATAR_BG = 'linear-gradient(150deg, #6F80FF, #6F80FF)';

function _wFmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const days = ['Ne','Po','Út','St','Čt','Pá','So'];
  const months = ['1.','2.','3.','4.','5.','6.','7.','8.','9.','10.','11.','12.'];
  return `${days[d.getDay()]} ${d.getDate()}. ${months[d.getMonth()]}`;
}

function _wFmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
}

// České skloňování podle počtu (1 / 2-4 / 5+)
function _wPlural(n, one, few, many) {
  const x = Math.abs(Number(n) || 0);
  if (x === 1) return one;
  if (x >= 2 && x <= 4) return few;
  return many;
}

// Počet hodin směny z časů 'HH:MM' – 'HH:MM' (fallback 8)
function _wShiftHours(start, end) {
  try {
    const p = s => { const [h, m] = String(s).split(':').map(Number); return h * 60 + (m || 0); };
    let diff = (p(end) - p(start)) / 60;
    if (diff < 0) diff += 24;           // přes půlnoc
    if (!(diff > 0 && diff <= 24)) return null;
    return Math.round(diff * 10) / 10;
  } catch (_) { return null; }
}

// Adapts a Supabase job row to the shape expected by JobCard (from app.jsx)
function jobToCard(job) {
  const emp    = job.employer || {};
  const name   = emp.company_name || emp.name || job.company || 'Firma';
  const logo   = name.split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '??';
  const accent = _wColor(job.id);
  const hours  = _wShiftHours(job.time_start, job.time_end);
  const perHour = /(\/\s*hod|kč\/h|\/h)/i.test(job.pay_unit || 'Kč/h');
  return {
    ...job,
    company:   name,
    logo,
    logoColor: accent,
    payUnit:   job.pay_unit || 'Kč/h',
    total:     job.pay * 8,
    shiftHours: hours,
    shiftTotal: (perHour && hours) ? Math.round(job.pay * hours) : null,
    when:      _wFmtDate(job.date),
    time:      [job.time_start, job.time_end].filter(Boolean).join(' – '),
    rating:    Number(emp.rating || 0),   // reálné hodnocení firmy (0 = zatím žádné)
    verified:  !!emp.verified,
    tags:      Array.isArray(job.tags) ? job.tags : [],
    accent,
    boosted:   !!(job.top_until && new Date(job.top_until) > new Date()),
    distance:  job.distance || null,
    desc:      job.description || '',
    requirements: Array.isArray(job.requirements) ? job.requirements : [],
    benefits:  Array.isArray(job.benefits) ? job.benefits : [],
    perks:     Array.isArray(job.requirements) ? job.requirements : [],
    positions: job.positions || 1,
    dressCode: job.dress_code || '',
    contactNote: job.contact_note || '',
    jobType:   job.job_type || 'brigada',
    tips:      !!job.tips,
    eventDate: job.event_date || null,
  };
}

// ── Main fetch ─────────────────────────────────────────────────
async function fetchWorkerData(workerId) {
  try {
    // Profile
    const { data: profile } = await sb.from('profiles').select('*').eq('id', workerId).single();
    Object.keys(W_PROFILE).forEach(k => delete W_PROFILE[k]);
    Object.assign(W_PROFILE, profile || {});

    // IDs to exclude (already swiped)
    const [rejRes, matchRes] = await Promise.all([
      sb.from('rejections').select('job_id').eq('worker_id', workerId),
      sb.from('matches').select('job_id').eq('worker_id', workerId),
    ]);
    const excludeIds = [
      ...(rejRes.data  || []).map(r => r.job_id),
      ...(matchRes.data || []).map(m => m.job_id),
    ];

    // Active jobs (s profilem firmy pro reálné hodnocení)
    let q = sb.from('jobs')
      .select('*, employer:profiles!jobs_employer_id_fkey(rating, name, company_name, verified)')
      .eq('status', 'active').order('created_at', { ascending: false });
    if (excludeIds.length > 0) q = q.not('id', 'in', `(${excludeIds.join(',')})`);
    const { data: jobs } = await q;
    const nowMs = Date.now();
    // skryj naplánované (publish_at v budoucnu); boostnuté (top_until v budoucnu) nahoru
    const visible = (jobs || [])
      .filter(j => !j.publish_at || new Date(j.publish_at).getTime() <= nowMs)
      .sort((a, b) => {
        const ab = a.top_until && new Date(a.top_until).getTime() > nowMs ? 1 : 0;
        const bb = b.top_until && new Date(b.top_until).getTime() > nowMs ? 1 : 0;
        return bb - ab;
      });
    W_JOBS.length = 0;
    visible.forEach(j => W_JOBS.push(j));

    // All matches → threads (accepted + pending that may have messages)
    const { data: matches } = await sb.from('matches')
      .select('*, job:jobs(*, employer:profiles!jobs_employer_id_fkey(*))')
      .eq('worker_id', workerId)
      .order('created_at', { ascending: false });

    const allMatches = matches || [];
    const matchIds   = allMatches.map(m => m.id);

    // Moje recenze (které jsem už napsal/a) — abych je podruhé nevyplňoval
    const { data: myReviews } = await sb.from('reviews')
      .select('match_id').eq('reviewer_id', workerId);
    const reviewedMatchIds = new Set((myReviews || []).map(r => r.match_id));

    // Recenze, které dostal brigádník (o něm) — pro profil
    const { data: aboutMe } = await sb.from('reviews')
      .select('*, reviewer:profiles!reviews_reviewer_id_fkey(name, company_name, verified), match:matches(job:jobs(title))')
      .eq('reviewed_id', workerId)
      .order('created_at', { ascending: false });
    W_REVIEWS.length = 0;
    (aboutMe || []).forEach(r => {
      const author = r.reviewer?.company_name || r.reviewer?.name || 'Zaměstnavatel';
      W_REVIEWS.push({
        id: r.id,
        reviewerId: r.reviewer_id,
        author,
        avatar: author.split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '??',
        color: W_AVATAR_BG,
        rating: Number(r.rating) || 0,
        verified: !!r.reviewer?.verified,
        text: r.text || '',
        jobTitle: r.match?.job?.title || '',
        when: r.created_at ? new Date(r.created_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' }) : '',
      });
    });

    let   messages  = [];

    if (matchIds.length > 0) {
      const { data: msgs } = await sb.from('messages')
        .select('*')
        .in('match_id', matchIds)
        .order('created_at', { ascending: false })
        .limit(400);
      messages = msgs || [];
    }

    // Only show threads that are accepted OR have at least one message
    const messageMatchIds = new Set(messages.map(m => m.match_id));
    const threadMatches = allMatches.filter(m => m.status === 'accepted' || messageMatchIds.has(m.id));

    const newThreads = threadMatches.map(match => {
      const job        = match.job || {};
      const employer   = job.employer || {};
      const company    = employer.company_name || employer.name || job.company || 'Zaměstnavatel';
      const logo       = company.split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '??';

      const threadMsgs = messages
        .filter(msg => msg.match_id === match.id)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .map(msg => {
          const isMe    = msg.sender_id === workerId;
          const from    = isMe ? 'me' : 'them';
          if (msg.type === 'shift_offer' && msg.metadata) return { from, kind: 'shift', shift: msg.metadata, t: _wFmtTime(msg.created_at), id: msg.id };
          if (msg.type === 'interview_offer' && msg.metadata) return { from, kind: 'interview', interview: msg.metadata, t: _wFmtTime(msg.created_at), id: msg.id };
          return { from, text: msg.text, t: _wFmtTime(msg.created_at), id: msg.id };
        });

      const lastMsg = threadMsgs[threadMsgs.length - 1];
      const lastPreview = lastMsg
        ? (lastMsg.kind === 'shift' ? '📅 Nabídka směny' : lastMsg.kind === 'interview' ? '🗓️ Pozvánka na pohovor' : lastMsg.text)
        : 'Nová shoda!';
      const lastTime = lastMsg
        ? _wFmtTime(messages.find(m => m.id === lastMsg.id)?.created_at || '')
        : _wFmtTime(match.created_at);

      return {
        id: match.id, match_id: match.id,
        employerId: job.employer_id || employer.id || null,
        confirmed: match.status === 'confirmed',   // směna už potvrzena
        name: company, avatar: logo,
        color: W_AVATAR_BG,
        role: job.title || '',
        rating: Number(employer.rating || 0),
        verified: !!employer.verified,
        last: lastPreview, time: lastTime,
        unread: 0, online: false,
        msgs: threadMsgs,
      };
    });

    W_THREADS.length = 0;
    newThreads.forEach(t => W_THREADS.push(t));

    // ── W_HISTORY (Moje brigády) ──────────────────────────────────
    // accepted = domlouváme se v chatu, confirmed = potvrzená směna
    const history = allMatches
      .filter(match => match.status === 'accepted' || match.status === 'confirmed')
      .map(match => {
        const job      = match.job || {};
        const employer = job.employer || {};
        const company  = employer.company_name || employer.name || job.company || 'Zaměstnavatel';
        const eventDate = _wResolveEventDate(job, match.created_at);
        const passed   = _wJobPassed(eventDate);
        let phase;
        if (match.status === 'accepted') phase = 'discuss';               // otevřený chat, ještě nepotvrzeno
        else                             phase = passed ? 'completed' : 'upcoming';  // confirmed
        const reviewed = reviewedMatchIds.has(match.id);
        const dateText = eventDate ? _wFmtDateY(eventDate) : (_wFmtDate(job.date) || job.date || '');
        const card = jobToCard(job);
        if (eventDate) card.when = _wFmtDateY(eventDate);   // detail ukáže rok
        return {
          id: match.id, match_id: match.id, job_id: match.job_id,
          employerId: job.employer_id || employer.id || null,
          jobTitle: job.title || 'Brigáda',
          company, avatar: company.split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '??',
          color: W_AVATAR_BG,
          dateText,
          eventDate,
          timeText: [job.time_start, job.time_end].filter(Boolean).join(' – '),
          location: job.location || '',
          pay: job.pay || 0, payUnit: job.pay_unit || 'Kč/h',
          status: match.status, phase,
          passed, reviewed,
          needsReview: phase === 'completed' && !reviewed,
          createdAt: match.created_at,
          card,   // plná data pro detail brigády
        };
      });

    W_HISTORY.length = 0;
    history.forEach(h => W_HISTORY.push(h));

    return true;
  } catch (err) {
    console.error('[worker-supabase] fetchWorkerData error:', err);
    return false;
  }
}

async function createMatchW(workerId, jobId, isSuper) {
  const { data, error } = await sb.from('matches')
    .insert({ worker_id: workerId, job_id: jobId, status: 'pending', super: !!isSuper })
    .select().single();
  if (error && error.code !== '23505') console.error('createMatchW:', error);
  return data;
}

// Zaznamenat zhlédnutí inzerátu (1× na brigádníka/inzerát díky unikátnímu indexu)
const _wLoggedViews = new Set();
async function logJobViewW(jobId) {
  if (!jobId || _wLoggedViews.has(jobId)) return;
  _wLoggedViews.add(jobId);
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) { _wLoggedViews.delete(jobId); return; }
  const { error } = await sb.from('job_views').upsert(
    { job_id: jobId, viewer_id: session.user.id },
    { onConflict: 'job_id,viewer_id', ignoreDuplicates: true }
  );
  if (error) { console.error('logJobViewW:', error); _wLoggedViews.delete(jobId); }
}

// Napsat recenzi (brigádník → zaměstnavatel po dokončené brigádě)
async function submitReviewW(matchId, reviewedId, rating, text) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) return false;
  const { error } = await sb.from('reviews').insert({
    reviewer_id: session.user.id,
    reviewed_id: reviewedId,
    match_id: matchId,
    rating: Math.max(1, Math.min(5, parseInt(rating) || 0)),
    text: (text || '').trim(),
  });
  if (error) { console.error('submitReviewW:', error); return false; }
  // označ lokálně jako ohodnocené
  const h = W_HISTORY.find(x => x.match_id === matchId);
  if (h) { h.reviewed = true; h.needsReview = false; }
  return true;
}

// Načíst odpovědi ke skupině recenzí → { review_id: [reply, …] }
async function fetchReviewRepliesW(reviewIds) {
  if (!reviewIds || reviewIds.length === 0) return {};
  const { data, error } = await sb.from('review_replies')
    .select('*')
    .in('review_id', reviewIds)
    .order('created_at', { ascending: true });
  if (error) { console.error('fetchReviewRepliesW:', error); return {}; }
  const map = {};
  (data || []).forEach(r => { (map[r.review_id] = map[r.review_id] || []).push(r); });
  return map;
}

// Odpovědět na recenzi (brigádník ↔ zaměstnavatel)
async function postReviewReplyW(reviewId, text) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) return null;
  const clean = (text || '').trim();
  if (!clean) return null;
  const { data, error } = await sb.from('review_replies')
    .insert({ review_id: reviewId, author_id: session.user.id, text: clean })
    .select().single();
  if (error) { console.error('postReviewReplyW:', error); return null; }
  return data;
}

// Brigádník potvrdil směnu → match 'confirmed' (trigger naplní job)
async function confirmShiftW(matchId) {
  const { error } = await sb.from('matches').update({ status: 'confirmed' }).eq('id', matchId);
  if (error) { console.error('confirmShiftW:', error); return false; }
  return true;
}

// Brigádník zruší potvrzenou směnu → match 'cancelled' (trigger uvolní inzerát zpět na 'active')
async function cancelShiftW(matchId) {
  const { error } = await sb.from('matches').update({ status: 'cancelled' }).eq('id', matchId);
  if (error) { console.error('cancelShiftW:', error); return false; }
  return true;
}

// ── Upozornění (tabulka notifications) ──────────────────────────
// Sloupce: id, user_id, type, title, body, read, match_id, created_at
// `kind` v appce (chat/review) v tabulce není — odvozuje se z typu.
function _wNotifKind(type) { return type === 'review' ? 'review' : 'chat'; }

const _W_NOTIF_TYPES = ['message', 'match', 'shift', 'review', 'success', 'info'];

// Typ se ukládá do sloupce `type`. Dokud check constraint povoloval jen 'message',
// běžela obezlička, která skutečný typ schovávala na začátek `body` jako "typ::text".
// Constraint je rozšířený, takže se tak už nezapisuje — rozbalování zůstává jen
// kvůli řádkům, které tímhle způsobem vznikly. Časem se dá smazat.
function _wUnpackLegacy(body) {
  const s = body || '';
  const i = s.indexOf('::');
  if (i > 0) {
    const t = s.slice(0, i);
    if (_W_NOTIF_TYPES.includes(t)) return { type: t, text: s.slice(i + 2) };
  }
  return null;
}

async function fetchNotifsW(userId) {
  const { data, error } = await sb.from('notifications')
    .select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(40);
  if (error) { console.error('fetchNotifsW:', error); return []; }
  return (data || []).map(r => {
    // Nové řádky mají typ ve sloupci; u starých se ještě zkusí odloupnout z textu.
    const legacy = r.type === 'message' ? _wUnpackLegacy(r.body) : null;
    const type = legacy ? legacy.type : (_W_NOTIF_TYPES.includes(r.type) ? r.type : 'info');
    const text = legacy ? legacy.text : (r.body || '');
    return {
      id: r.id,
      ts: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
      read: !!r.read,
      type,
      title: r.title || '',
      text,
      matchId: r.match_id || null,
      kind: _wNotifKind(type),
    };
  });
}

async function insertNotifW(userId, n) {
  const { data, error } = await sb.from('notifications').insert({
    user_id: userId,
    type: _W_NOTIF_TYPES.includes(n.type) ? n.type : 'info',
    title: n.title || '',
    body: n.text || '',
    match_id: n.matchId || null,
    read: false,
  }).select().single();
  if (error) { console.error('insertNotifW:', error); return null; }
  return data;
}

async function markNotifsReadW(userId) {
  const { error } = await sb.from('notifications')
    .update({ read: true }).eq('user_id', userId).eq('read', false);
  if (error) { console.error('markNotifsReadW:', error); return false; }
  return true;
}

async function createRejectionW(workerId, jobId) {
  const { error } = await sb.from('rejections').insert({ worker_id: workerId, job_id: jobId });
  if (error && error.code !== '23505') console.error('createRejectionW:', error);
}

// Odmítnuté nabídky pro "projít znovu" — jen čtení, historie odmítnutí zůstává.
// Vrací pouze ty, které jsou pořád aktivní, aby počet na tlačítku odpovídal realitě.
async function fetchRejectedJobsW(workerId) {
  const { data: rej, error: rejErr } = await sb.from('rejections')
    .select('job_id').eq('worker_id', workerId);
  if (rejErr) { console.error('fetchRejectedJobsW (rejections):', rejErr); return []; }
  const ids = (rej || []).map(r => r.job_id).filter(Boolean);
  if (!ids.length) return [];

  const { data: jobs, error } = await sb.from('jobs')
    .select('*, employer:profiles!jobs_employer_id_fkey(rating, name, company_name, verified)')
    .eq('status', 'active').in('id', ids);
  if (error) { console.error('fetchRejectedJobsW (jobs):', error); return []; }

  const nowMs = Date.now();
  return (jobs || []).filter(j => !j.publish_at || new Date(j.publish_at).getTime() <= nowMs);
}

async function sendMessageW(matchId, senderId, text, type, metadata) {
  const payload = { match_id: matchId, sender_id: senderId, text };
  if (type && type !== 'text') payload.type = type;
  if (metadata) payload.metadata = metadata;
  const { data, error } = await sb.from('messages').insert(payload).select().single();
  if (error) console.error('sendMessageW:', error);
  return data;
}

async function updateProfileW(workerId, updates) {
  const { error } = await sb.from('profiles').update(updates).eq('id', workerId);
  if (error) { console.error('updateProfileW:', error); return false; }
  Object.assign(W_PROFILE, updates);
  return true;
}

Object.assign(window, {
  W_PROFILE, W_JOBS, W_THREADS, W_HISTORY, W_REVIEWS,
  fetchWorkerData, createMatchW, createRejectionW, fetchRejectedJobsW, sendMessageW, updateProfileW, submitReviewW, confirmShiftW, cancelShiftW, logJobViewW,
  fetchNotifsW, insertNotifW, markNotifsReadW,
  fetchReviewRepliesW, postReviewReplyW,
  jobToCard, makejLevel, _wColor, _wFmtTime, _wFmtDate, _wFmtDateY, _wJobPassed, _wPlural, _wShiftHours,
});
